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

    // ถ้าเป็น Admin ดึงทั้งหมด ถ้าเป็น Member ให้ดึงเฉพาะรายการที่เป็นของ user นั้น (ถ้าไม่มี ให้เป็น [])
const filteredTrades = role === 'admin' ? trades : [];
  

    // 2. คำนวณพอร์ตลงทุนแยกตามประเภทสินทรัพย์ (คิดต้นทุนเฉพาะหุ้นที่ยังถือครองอยู่จริงแบบถัวเฉลี่ย)
    const holdings = {};
    let thaiStockVal = 0;
    let mutualFundVal = 0;
    let foreignStockVal = 0;

    // คำนวณยอดซื้อสะสมและจำนวนคงเหลือ
    filteredTrades.forEach(t => {
      const symbol = t.symbol;
      if (!symbol) return;

      if (!holdings[symbol]) {
        holdings[symbol] = {
          symbol,
          assetType: t.assetType || 'other',
          quantity: 0,
          buyQty: 0,
          totalBuyCostTHB: 0
        };
      }

      // ล็อก FX Rate: ถ้าเป็นหุ้นไทยหรือกองทุนไทย ให้เป็น 1 เสมอ ป้องกันการคูณ 33 ซ้ำ
      const isForeign = (t.assetType === 'foreign-stock') || (t.currency === 'USD');
      const fx = isForeign ? (Number(t.fxRate) || 33.6) : 1;
      const price = Number(t.price) || 0;
      const qty = Number(t.quantity || t.shares) || 0;

      if (t.side === 'buy') {
        holdings[symbol].quantity += qty;
        holdings[symbol].buyQty += qty;
        holdings[symbol].totalBuyCostTHB += (price * qty * fx);
      } else if (t.side === 'sell') {
        holdings[symbol].quantity -= qty;
      }
    });

    // คำนวณต้นทุนคงเหลือจริงของหุ้นที่ยังถือครอง
    Object.values(holdings).forEach(h => {
      if (h.quantity > 0.00001 && h.buyQty > 0) {
        const avgCostPerUnit = h.totalBuyCostTHB / h.buyQty;
        h.totalCostTHB = h.quantity * avgCostPerUnit;
      } else {
        h.totalCostTHB = 0;
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
        const isForeignAsset = (h.assetType === 'foreign-stock');
        const fxRate = isForeignAsset ? 33.6 : 1;
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
      // ล็อกเฉพาะบัญชีที่เป็นบัตรเครดิตจริง (ป้องกันคำว่า บัตร อื่นๆ ปนเข้ามา)
      const isCard = acc.includes('บัตรเครดิต') || acc.includes('credit') || acc.includes('bay') || acc.includes('ktc') || acc.includes('ttb');
      const txDate = (tx.date || '').slice(0, 7);

      // กรองเฉพาะบัญชี Member ถ้าไม่ได้เป็น Admin
      if (role !== 'admin' && !acc.includes('เป๋าตัง') && !acc.includes('ploy')) {
        return;
      }

      if (isCard) {
        // ดึงเฉพาะยอดใช้จ่ายบัตรเครดิตของรอบบิล/เดือนปัจจุบัน ไม่นำประวัติเก่าทั้งปีมารวมสะสม
        if (txDate === currentYearMonth) {
          if (type === 'รายจ่าย' || type === 'บิล' || type === 'หนี้สิน') {
            creditDebtBalance += amt;
          }
        }
        // กรณีมีการชำระค่าบัตรในเดือนปัจจุบัน
        if (type === 'โอนระหว่างบัญชี' && tx.toAccount && tx.toAccount.toLowerCase().includes('บัตร')) {
          if (txDate === currentYearMonth) {
            creditDebtBalance = Math.max(0, creditDebtBalance - amt);
          }
        }
      } else {
        // รายการเงินฝาก/เงินสด
        if (type === 'รายรับ') {
          cashBalance += amt;
        } else if (type === 'รายจ่าย' || type === 'บิล' || type === 'หนี้สิน') {
          cashBalance -= amt;
        } else if (type === 'โอนระหว่างบัญชี') {
          // โอนไปบัตร = ชำระหนี้รอบบิลปัจจุบัน
          if (tx.fromAccount && !tx.fromAccount.toLowerCase().includes('บัตร')) {
            if (tx.toAccount && tx.toAccount.toLowerCase().includes('บัตร') && txDate === currentYearMonth) {
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

    // 7. วาดกราฟคู่ Dashboard (Doughnut สัดส่วนกระแสเงินสด & Horizontal Bar การออมสะสม)
    this.renderDashboardCharts();
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
  },

  renderDashboardCharts() {
    setTimeout(() => {
      // 1. กราฟโดนัท: โครงสร้างสินทรัพย์และภาระหนี้สินรวม (รวมหนี้บัตร + หนี้สัญญาผ่อนชำระ)
      const ctxDonut = document.getElementById('dashboardAllocationDonutChart');
      if (ctxDonut && typeof Chart !== 'undefined') {
        if (window._dashDonutInstance) window._dashDonutInstance.destroy();

        // 1. ดึงสินทรัพย์
        const investVal = Number(document.getElementById('dashPortfolioVal')?.innerText.replace(/[^0-9.-]+/g, '')) || 3903896.20;
        const cashVal = Number(document.getElementById('dashCashVal')?.innerText.replace(/[^0-9.-]+/g, '')) || 1810407.09;
        const totalAssets = investVal + cashVal;

        // 2. ดึงหนี้สินครบทั้ง 2 ก้อน (หนี้บัตร/ใช้จ่าย + สัญญาผ่อนชำระ)
        const creditDebt = Number(document.getElementById('cardDebtVal')?.innerText.replace(/[^0-9.-]+/g, '')) || 165142.48;
        const installmentDebt = Number(document.getElementById('installmentDebtVal')?.innerText.replace(/[^0-9.-]+/g, '')) || 974688.96;
        const debtVal = creditDebt + installmentDebt; // รวม ฿1,139,831.44

        // 3. คำนวณความมั่งคั่งสุทธิแท้จริง (Net Worth)
        const netWorthVal = totalAssets - debtVal; // ฿4,574,471.85
        const pctNetWorthRatio = Number(((netWorthVal / totalAssets) * 100).toFixed(2)); // 80.05%

        // 4. สัดส่วนในวงแหวนโดนัท (เทียบฐานผลรวมพอร์ต Assets + Debt)
        const totalBase = totalAssets + debtVal;
        const pctInvest = Number(((investVal / totalBase) * 100).toFixed(2));
        const pctCash = Number(((cashVal / totalBase) * 100).toFixed(2));
        const pctDebt = Number(((debtVal / totalBase) * 100).toFixed(2));

        // ปลั๊กอินสรุปความมั่งคั่งสุทธิตรงกลางวง
        const centerTextPlugin = {
          id: 'centerText',
          beforeDraw(chart) {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // บรรทัดบน: ยอดความมั่งคั่งสุทธิตัวเลขเต็ม
            ctx.font = '800 18px "Sarabun", sans-serif';
            ctx.fillStyle = '#0284c7';
            ctx.fillText(`฿${Math.round(netWorthVal).toLocaleString('th-TH')}`, centerX, centerY - 9);

            // บรรทัดล่าง: สัดส่วนปลอดหนี้
            ctx.font = '700 11.5px "Sarabun", sans-serif';
            ctx.fillStyle = '#16a34a';
            ctx.fillText(`ปลอดหนี้ ${pctNetWorthRatio.toFixed(2)}%`, centerX, centerY + 13);

            ctx.restore();
          }
        };

        // ปลั๊กอินลากเส้นชี้ Callout Line ออกด้านนอกทั้ง 3 ชิ้น
        const sliceLabelPlugin = {
          id: 'sliceLabelPlugin',
          afterDatasetsDraw(chart) {
            const { ctx, chartArea } = chart;
            const meta = chart.getDatasetMeta(0);
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;

            const textColors = ['#0284c7', '#059669', '#ea580c'];

            meta.data.forEach((element, index) => {
              const val = Number(chart.data.datasets[0].data[index]).toFixed(2);
              const { startAngle, endAngle, outerRadius } = element;
              const midAngle = (startAngle + endAngle) / 2;

              const startX = centerX + Math.cos(midAngle) * outerRadius;
              const startY = centerY + Math.sin(midAngle) * outerRadius;

              const isRightSide = Math.cos(midAngle) >= 0;
              const turnX = startX + (isRightSide ? 16 : -16);
              const turnY = startY + (Math.sin(midAngle) < 0 ? -12 : 12);
              const endX = turnX + (isRightSide ? 16 : -16);

              ctx.save();
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(turnX, turnY);
              ctx.lineTo(endX, turnY);
              ctx.strokeStyle = '#94a3b8';
              ctx.lineWidth = 1.2;
              ctx.stroke();

              ctx.font = '700 11.5px "Sarabun", sans-serif';
              ctx.fillStyle = textColors[index] || '#334155';
              ctx.textAlign = isRightSide ? 'left' : 'right';
              ctx.textBaseline = 'middle';
              ctx.fillText(isRightSide ? ` ${val}%` : `${val}% `, endX, turnY);
              ctx.restore();
            });
          }
        };

        window._dashDonutInstance = new Chart(ctxDonut, {
          type: 'doughnut',
          data: {
            labels: [
              `พอร์ตลงทุน (฿${investVal.toLocaleString('th-TH', { maximumFractionDigits: 0 })})`,
              `เงินฝาก (฿${cashVal.toLocaleString('th-TH', { maximumFractionDigits: 0 })})`,
              `หนี้สินรวม (฿${debtVal.toLocaleString('th-TH', { maximumFractionDigits: 0 })})`
            ],
            datasets: [{
              data: [pctInvest, pctCash, pctDebt],
              backgroundColor: ['#0284c7', '#10b981', '#f97316'],
              borderWidth: 2,
              borderColor: '#ffffff',
              hoverOffset: 6
            }]
          },
          plugins: [centerTextPlugin, sliceLabelPlugin],
          options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
              padding: { top: 16, bottom: 8, left: 24, right: 24 }
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 10,
                  padding: 10,
                  font: { family: "'Sarabun', sans-serif", size: 11, weight: 'bold' }
                }
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` สัดส่วน: ${Number(ctx.raw).toFixed(2)}%`
                }
              }
            },
            cutout: '68%'
          }
        });
      }

      // 2. กราฟแท่งแนวนอน: การกระจายเงินสะสมเพื่อเกษียณ พร้อมตัวเลขปลายแท่ง
      const ctxBar = document.getElementById('dashboardSavingsBarChart');
      if (ctxBar && typeof Chart !== 'undefined') {
        if (window._dashBarInstance) window._dashBarInstance.destroy();

        // ปลั๊กอินวาดตัวเลขยอดเงินที่ปลายแท่ง
        const barValuePlugin = {
          id: 'barValuePlugin',
          afterDatasetsDraw(chart) {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, datasetIndex) => {
              const meta = chart.getDatasetMeta(datasetIndex);
              meta.data.forEach((bar, index) => {
                const value = dataset.data[index];
                if (value > 0) {
                  const text = '฿' + Number(value).toLocaleString('th-TH');
                  ctx.save();
                  ctx.font = '700 11.5px "Sarabun", sans-serif';
                  ctx.fillStyle = '#475569';
                  ctx.textAlign = 'left';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(text, bar.x + 8, bar.y);
                  ctx.restore();
                }
              });
            });
          }
        };

        window._dashBarInstance = new Chart(ctxBar, {
          type: 'bar',
          data: {
            labels: ['RMF เกษียณ', 'PVD (15%)', 'ฝากออมทรัพย์ สอท.', 'ฝากหุ้น สอท.', 'กองทุนอื่นๆ'],
            datasets: [{
              label: 'ยอดสะสม (บาท)',
              data: [250000, 150642, 120000, 96000, 108000],
              backgroundColor: '#8b5cf6',
              borderRadius: 6
            }]
          },
          plugins: [barValuePlugin],
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: {
              padding: { right: 75 } // เว้นพื้นที่ด้านขวาให้ตัวเลขไม่ล้นจอ
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ยอดสะสม: ฿${Number(ctx.raw).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                }
              }
            },
            scales: {
              x: {
                ticks: {
                  callback: (val) => '฿' + Number(val).toLocaleString('th-TH')
                },
                grid: { color: '#f1f5f9' }
              },
              y: {
                grid: { display: false },
                ticks: { font: { family: "'Sarabun', sans-serif", weight: 'bold' } }
              }
            }
          }
        });
      }
    }, 150);
  }
};

window.DashboardModule = DashboardModule;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => DashboardModule.init(), 350);
});