/**
 * js/modules/dashboard.js
 * คำนวณและประมวลผลตัวเลขสรุปภาพรวมสำหรับ Dashboard 
 * รองรับ:
 * - RBAC (Admin รวมทุกพอร์ต / Member เฉพาะพอร์ตตนเอง)
 * - คำนวณพอร์ตลงทุน (Investments & P&L)
 * - คำนวณสภาพคล่องเงินสด (Cash Reserves) & หนี้บัตร (Liabilities)
 * - คำนวณเงินออมเดือนปัจจุบัน (Monthly Savings)
 * - แถบสัดส่วนสินทรัพย์รวมแบบ Dynamic (Total Assets Structure Bar)
 */

var DashboardModule = {
  tradesStorageKey: 'stock-trading-log:v3',
  quoteCacheKey: 'stock-trading-log:quote-cache:v1',
  cashflowStorageKey: 'family-finance:cashflow:v2',
  txBackupKey: 'family-finance:backup-data:v1',

  formatTHB(amount) {
    const val = Number(amount) || 0;
    return '฿' + val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatUSD(amount) {
    const val = Number(amount) || 0;
    return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD';
  },

  getTradingData() {
    try {
      const raw = localStorage.getItem(this.tradesStorageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { portfolios: [], trades: [] };
  },

  getQuoteCache() {
    try {
      const raw = localStorage.getItem(this.quoteCacheKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  },

  getCashflowTransactions() {
    try {
      // ตรวจสอบจาก LocalStorage หลายตำแหน่งเพื่อความยืดหยุ่น
      const keys = [
        this.cashflowStorageKey,
        'family-finance:transactions',
        'cashflow_transactions',
        'family_finance_cashflow'
      ];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
          if (parsed?.transactions && Array.isArray(parsed.transactions)) return parsed.transactions;
          if (parsed?.data?.cashflow_v2?.transactions) return parsed.data.cashflow_v2.transactions;
        }
      }
    } catch (e) {}
    return [];
  },

  async init() {
    let currentRole = 'admin';
    let currentUserId = null;

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
          currentUserId = session.user.id;
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role, full_name')
            .eq('id', currentUserId)
            .single();
          if (profile?.role) currentRole = profile.role;
        }
      } catch (e) {
        console.warn('Dashboard Auth Check error:', e);
      }
    }

    this.calculateAndRender(currentRole);
  },

  calculateAndRender(role = 'admin') {
    const tradeData = this.getTradingData();
    const quotes = this.getQuoteCache();
    const trades = tradeData.trades || [];
    const portfolios = tradeData.portfolios || [];
    const transactions = this.getCashflowTransactions();

    // 1. ระบุพอร์ต Member (น้องพลอย)
    const ployPortIds = portfolios
      .filter(p => p.name && p.name.toUpperCase().includes('PLOY'))
      .map(p => p.id);

    const filteredTrades = role === 'admin'
      ? trades
      : trades.filter(t => ployPortIds.includes(t.portfolioId));

    // 2. คำนวณพอร์ตลงทุนแยกตามประเภทสินทรัพย์
    const holdings = {};
    let thaiStockVal = 0;
    let mutualFundVal = 0;
    let foreignStockVal = 0;

    filteredTrades.forEach(t => {
      const symbol = t.symbol;
      if (!symbol) return;

      if (!holdings[symbol]) {
        holdings[symbol] = {
          symbol,
          assetType: t.assetType || 'other',
          quantity: 0,
          totalCostTHB: 0
        };
      }

      const fx = Number(t.fxRate) || 1;
      const price = Number(t.price) || 0;
      const qty = Number(t.quantity || t.shares) || 0;

      if (t.side === 'buy') {
        holdings[symbol].quantity += qty;
        holdings[symbol].totalCostTHB += (price * qty * fx);
      } else if (t.side === 'sell') {
        holdings[symbol].quantity -= qty;
        holdings[symbol].totalCostTHB -= (price * qty * fx);
      }
    });

    let totalPortCostTHB = 0;
    let totalPortMarketValTHB = 0;

    Object.values(holdings).forEach(h => {
      if (h.quantity > 0.00001) {
        totalPortCostTHB += Math.max(0, h.totalCostTHB);

        // ดึงราคาตลาด
        let quote = quotes[h.symbol] || quotes[`${h.assetType}|${h.symbol}`];
        if (!quote && h.symbol.endsWith('.BK')) {
          const stripped = h.symbol.replace('.BK', '');
          quote = quotes[stripped] || quotes[`${h.assetType}|${stripped}`];
        }

        const marketPrice = quote?.price ? Number(quote.price) : 0;
        const fxRate = h.assetType === 'foreign-stock' ? 33.6 : 1;
        const currentVal = marketPrice > 0 ? (h.quantity * marketPrice * fxRate) : Math.max(0, h.totalCostTHB);

        totalPortMarketValTHB += currentVal;

        // แยกหมวดสินทรัพย์
        if (h.assetType === 'thai-stock') {
          thaiStockVal += currentVal;
        } else if (h.assetType === 'mutual-fund') {
          mutualFundVal += currentVal;
        } else if (h.assetType === 'foreign-stock') {
          foreignStockVal += currentVal;
        } else {
          mutualFundVal += currentVal;
        }
      }
    });

    const portProfitTHB = totalPortMarketValTHB - totalPortCostTHB;
    const portProfitPct = totalPortCostTHB > 0 ? (portProfitTHB / totalPortCostTHB) * 100 : 0;

    // 3. คำนวณเงินสด สภาพคล่อง และหนี้บัตร จาก Transactions
    let cashBalance = 0;
    let creditDebtBalance = 0;
    let monthlySavings = 0;

    const currentYearMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    transactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      const type = tx.type;
      const acc = (tx.account || tx.accountName || '').toLowerCase();
      const isCard = acc.includes('บัตร') || acc.includes('card');
      const txDate = (tx.date || '').slice(0, 7);

      // กรองเฉพาะบัญชี Member ถ้าไม่ได้เป็น Admin
      if (role !== 'admin' && !acc.includes('เป๋าตัง') && !acc.includes('ploy')) {
        return;
      }

      if (isCard) {
        // รายการบัตรเครดิต
        if (type === 'รายจ่าย' || type === 'บิล' || type === 'หนี้สิน') {
          creditDebtBalance += amt;
        } else if (type === 'โอนระหว่างบัญชี' && tx.toAccount && tx.toAccount.toLowerCase().includes('บัตร')) {
          creditDebtBalance -= amt;
        }
      } else {
        // รายการเงินฝาก/เงินสด
        if (type === 'รายรับ') {
          cashBalance += amt;
        } else if (type === 'รายจ่าย' || type === 'บิล' || type === 'หนี้สิน') {
          cashBalance -= amt;
        } else if (type === 'โอนระหว่างบัญชี') {
          // โอนออก
          if (tx.fromAccount && !tx.fromAccount.toLowerCase().includes('บัตร')) {
            // โอนไปบัตร = จ่ายหนี้
            if (tx.toAccount && tx.toAccount.toLowerCase().includes('บัตร')) {
              creditDebtBalance = Math.max(0, creditDebtBalance - amt);
            }
          }
        }
      }

      // คำนวณเงินออมเดือนปัจจุบัน
      if (type === 'เงินออมและลงทุน' && txDate === currentYearMonth) {
        monthlySavings += amt;
      }
    });

    cashBalance = Math.max(0, cashBalance);
    creditDebtBalance = Math.max(0, creditDebtBalance);

    // 4. สรุปภาพรวมความมั่งคั่งสุทธิ
    const netWorth = totalPortMarketValTHB + cashBalance - creditDebtBalance;
    const approxUSD = netWorth / 33.6;
    const totalAssets = totalPortMarketValTHB + cashBalance;

    // 5. เรนเดอร์ลง UI
    const grandNetEl = document.getElementById('grandNetWorthVal');
    const usdNetEl = document.getElementById('usdNetWorthVal');
    const summaryPortEl = document.getElementById('summaryPort');
    const summaryCashEl = document.getElementById('summaryCash');
    const summaryDebtEl = document.getElementById('summaryDebt');
    const totalAssetsLabelEl = document.getElementById('totalAssetsLabel');

    const cardPortValEl = document.getElementById('cardPortVal');
    const cardPortProfitEl = document.getElementById('cardPortProfit');
    const cardCashValEl = document.getElementById('cardCashVal');
    const cardDebtValEl = document.getElementById('cardDebtVal');
    const cardSavingsValEl = document.getElementById('cardSavingsVal');

    if (grandNetEl) grandNetEl.innerText = this.formatTHB(netWorth);
    if (usdNetEl) usdNetEl.innerText = `≈ ${this.formatUSD(approxUSD)}`;
    if (summaryPortEl) summaryPortEl.innerText = `+${this.formatTHB(totalPortMarketValTHB)}`;
    if (summaryCashEl) summaryCashEl.innerText = `+${this.formatTHB(cashBalance)}`;
    if (summaryDebtEl) summaryDebtEl.innerText = `-${this.formatTHB(creditDebtBalance)}`;
    if (totalAssetsLabelEl) totalAssetsLabelEl.innerText = `สินทรัพย์รวม: ${this.formatTHB(totalAssets)}`;

    if (cardPortValEl) cardPortValEl.innerText = this.formatTHB(totalPortMarketValTHB);
    if (cardPortProfitEl) {
      const sign = portProfitTHB >= 0 ? '+' : '';
      const color = portProfitTHB >= 0 ? '#16a34a' : '#dc2626';
      cardPortProfitEl.style.color = color;
      cardPortProfitEl.innerText = `กำไรสะสม: ${sign}${this.formatTHB(portProfitTHB)} (${sign}${portProfitPct.toFixed(2)}%)`;
    }

    if (cardCashValEl) cardCashValEl.innerText = this.formatTHB(cashBalance);
    if (cardDebtValEl) cardDebtValEl.innerText = this.formatTHB(creditDebtBalance);
    if (cardSavingsValEl) cardSavingsValEl.innerText = `+${this.formatTHB(monthlySavings)}`;

    // 6. อัปเดตแถบสัดส่วนโครงสร้างสินทรัพย์รวม (Total Assets Structure)
    this.renderAssetBar(totalAssets, thaiStockVal, mutualFundVal, foreignStockVal, cashBalance);
  },

  renderAssetBar(total, thaiStock, mutualFund, foreignStock, cash) {
    if (!total || total <= 0) return;

    const pThai = ((thaiStock / total) * 100).toFixed(1);
    const pFund = ((mutualFund / total) * 100).toFixed(1);
    const pForeign = ((foreignStock / total) * 100).toFixed(1);
    const pCash = ((cash / total) * 100).toFixed(1);

    const barContainer = document.querySelector('#grand-total-net-worth div[style*="height: 10px"]');
    if (barContainer) {
      barContainer.innerHTML = `
        <div style="width: ${pThai}%; background: #6366f1;" title="หุ้นไทย & REITs (${pThai}%)"></div>
        <div style="width: ${pFund}%; background: #10b981;" title="กองทุนรวม (${pFund}%)"></div>
        <div style="width: ${pForeign}%; background: #0284c7;" title="หุ้นสหรัฐฯ (${pForeign}%)"></div>
        <div style="width: ${pCash}%; background: #f59e0b;" title="เงินสดในบัญชี (${pCash}%)"></div>
      `;
    }
  }
};

window.DashboardModule = DashboardModule;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => DashboardModule.init(), 350);
});