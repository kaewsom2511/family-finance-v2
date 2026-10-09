// ==========================================
// 1. ฟังก์ชันตัวช่วย (Helpers)
// ==========================================
function normalizeSymbol(sym) {
  if (!sym) return '';
  return sym.toString().trim().toUpperCase().replace(/\.BK$/, '').trim();
}

function parseNum(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = val.toString().replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

window.currentHolding = window.currentHolding || {
  shares: 11000,
  avgCost: 4.90,
  totalCost: 53882.60,
  txCount: 3,
  marketPrice: 4.90,
  symbol: 'ALLY'
};

// ==========================================
// 2. ฟังก์ชันดึงประวัติจากพอร์ต (loadFromPortfolio)
// ==========================================
function loadFromPortfolio() {
  const selectAsset = document.getElementById('select-asset') || document.getElementById('avgImportSymbol');
  const selectPort = document.getElementById('select-port') || document.getElementById('avgImportPortfolio');
  if (!selectAsset || !selectAsset.value) return;

  // ตัดวงเล็บและข้อความจำนวนรายการออก ให้เหลือเฉพาะชื่อย่อหุ้น เช่น "ALLY"
  let rawAssetValue = selectAsset.value.trim();
  if (rawAssetValue.includes('(')) {
    rawAssetValue = rawAssetValue.split('(')[0].trim();
  }
  const targetSymbol = normalizeSymbol(rawAssetValue);
  const rawLog = localStorage.getItem('stock-trading-log:v3') || 
                 localStorage.getItem('wealthport:avg-cost-ledger:v1');
  if (!rawLog) return;

  try {
    const parsed = JSON.parse(rawLog);
    const trades = parsed.trades || parsed.logs || parsed.items || (Array.isArray(parsed) ? parsed : []);
    const portfolios = parsed.portfolios || [];
    const selectedPortVal = selectPort ? selectPort.value.trim() : 'ALL';

    const validPortKeys = new Set();
    if (selectedPortVal && selectedPortVal !== 'ALL') {
      validPortKeys.add(selectedPortVal);
      const matchedPort = portfolios.find(p => p.id === selectedPortVal || p.name === selectedPortVal);
      if (matchedPort) {
        if (matchedPort.id) validPortKeys.add(matchedPort.id.toString());
        if (matchedPort.name) validPortKeys.add(matchedPort.name.toString());
      }
    }

    const matchedTrades = trades.filter(t => {
      const cleanSym = normalizeSymbol(t.symbol || t.ticker || t.stock || t.asset);
      if (cleanSym !== targetSymbol) return false;

      if (validPortKeys.size > 0) {
        const tPort = (t.portfolioId || t.portfolio || t.port || t.broker || '').toString();
        if (!validPortKeys.has(tPort)) return false;
      }
      return true;
    });

    if (matchedTrades.length === 0) {
      alert(`ไม่พบรายการซื้อขายของ ${targetSymbol}`);
      return;
    }

    matchedTrades.sort((a, b) => new Date(a.date || a.timestamp || 0) - new Date(b.date || b.timestamp || 0));

    let totalShares = 0;
    let totalCost = 0;

    matchedTrades.forEach(t => {
      const qty = parseNum(t.shares || t.quantity || t.qty || t.amount);
      const price = parseNum(t.price || t.cost || t.unitPrice);
      const fee = parseNum(t.fee || t.commission || t.vat);
      const type = (t.type || t.action || t.side || 'BUY').toUpperCase();

      if (type.includes('BUY')) {
        totalCost += (qty * price) + fee;
        totalShares += qty;
      } else if (type.includes('SELL')) {
        if (totalShares > 0) {
          const avg = totalCost / totalShares;
          totalShares = Math.max(0, totalShares - qty);
          totalCost = totalShares > 0 ? (totalShares * avg) : 0;
        }
      }
    });

    const avgPrice = totalShares > 0 ? (totalCost / totalShares) : 0;

    let marketPrice = avgPrice;
    const rawQuote = localStorage.getItem('stock-trading-log:quote-cache:v1');
    if (rawQuote) {
      try {
        const quotes = JSON.parse(rawQuote);
        const q = quotes[targetSymbol] || quotes[`${targetSymbol}.BK`];
        if (q && (q.price || q.close)) {
          marketPrice = parseNum(q.price || q.close);
        }
      } catch (e) {}
    }

    // บันทึกลงตัวแปร Global
    window.currentHolding = {
      shares: totalShares,
      avgCost: avgPrice,
      totalCost: totalCost,
      txCount: matchedTrades.length,
      marketPrice: marketPrice,
      symbol: targetSymbol
    };

    // อัปเดตการ์ดสรุป 4 ใบด้านบนตาม ID จริงใน DevTools
    const cardValues = document.querySelectorAll('.card-value, .stat-val, .summary-card-val');
    const elShares = document.getElementById('disp-shares') || document.getElementById('avgCostShares') || cardValues[0];
    const elAvg = document.getElementById('disp-avg') || document.getElementById('avgCostPrice') || cardValues[1];
    const elTotal = document.getElementById('disp-total') || document.getElementById('avgCostTotal') || cardValues[2];
    const elCount = document.getElementById('disp-count') || document.getElementById('avgCostCount') || cardValues[3];

    if (elShares) elShares.textContent = totalShares.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
    if (elAvg) elAvg.textContent = avgPrice.toFixed(2);
    if (elTotal) elTotal.textContent = totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (elCount) elCount.textContent = matchedTrades.length;

    // อัปเดตป้ายราคาตลาด (Badge) ด้านขวาบน
    const elCurrAvg = document.getElementById('lbl-curr-avg');
    const elMktPrice = document.getElementById('lbl-mkt-price');
    const elMktDiff = document.getElementById('lbl-mkt-diff');
    if (elCurrAvg) elCurrAvg.textContent = `${avgPrice.toFixed(2)} ฿`;
    if (elMktPrice) elMktPrice.textContent = `${marketPrice.toFixed(2)} ฿`;
    if (elMktDiff) {
      const diffPct = avgPrice > 0 ? ((marketPrice - avgPrice) / avgPrice) * 100 : 0;
      elMktDiff.textContent = `(${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(2)}%)`;
      elMktDiff.style.color = diffPct >= 0 ? '#10b981' : '#ef4444';
    }

    // วาดแถวตารางบันทึกซื้อ/ขายด้านล่าง
    renderTradesTable(matchedTrades);

    // แสดงข้อความในแบนเนอร์แจ้งเตือนสีเขียว
    const banner = document.getElementById('banner-port-status') || 
                   document.getElementById('avgImportNote') || 
                   document.querySelector('.alert-success');
    if (banner) {
      banner.style.display = 'block';
      banner.textContent = `✓ ดึงรายการสำเร็จ ${matchedTrades.length} รายการ (${totalShares.toLocaleString()} หุ้น)`;
    }

    // เรียกคำนวณเปรียบเทียบเป้าหมาย
    updateTargetComparison();

  } catch (err) {
    console.error('Error in loadFromPortfolio:', err);
  }
}

// ==========================================
// 3. ฟังก์ชันวาดตารางบันทึกซื้อ/ขาย
// ==========================================
function renderTradesTable(tradesList) {
  const tbody = document.getElementById('avgCostRows') || 
                document.querySelector('#trades-table tbody') || 
                document.querySelector('.avg-cost-table tbody') || 
                document.querySelector('table tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  let runningShares = 0;
  let runningCost = 0;

  tradesList.forEach((t, idx) => {
    const qty = parseNum(t.shares || t.quantity || t.qty || t.amount);
    const price = parseNum(t.price || t.cost || t.unitPrice);
    const subtotal = qty * price;
    const type = (t.type || t.action || t.side || 'BUY').toUpperCase().includes('SELL') ? 'SELL' : 'BUY';

    let dateStr = '-';
    if (t.date) {
      const d = new Date(t.date);
      dateStr = !isNaN(d) ? d.toLocaleDateString('th-TH') : t.date;
    }

    if (type === 'BUY') {
      runningCost += subtotal;
      runningShares += qty;
    } else {
      const curAvg = runningShares > 0 ? (runningCost / runningShares) : 0;
      runningShares = Math.max(0, runningShares - qty);
      runningCost = runningShares * curAvg;
    }
    const curAvg = runningShares > 0 ? (runningCost / runningShares) : 0;

    const tr = document.createElement('tr');
    const isBuy = type === 'BUY';
    const bg = isBuy ? '#e6f4ea' : '#fee2e2';
    const col = isBuy ? '#137333' : '#b91c1c';
    const txt = isBuy ? 'ซื้อ' : 'ขาย';

    tr.innerHTML = `
      <td style="padding: 10px; text-align: center; color: #64748b;">${idx + 1}</td>
      <td style="padding: 8px 10px; text-align: center; vertical-align: middle;">
        <span style="display: inline-block; min-width: 44px; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 700; line-height: 1.4; background-color: ${bg}; color: ${col}; text-align: center; box-shadow: none;">
          ${txt}
        </span>
      </td>
      <td style="padding: 10px; text-align: center; color: #334155;">${dateStr}</td>
      <td style="padding: 10px; text-align: right; font-weight: 600;">${qty.toLocaleString()}</td>
      <td style="padding: 10px; text-align: right;">${price.toFixed(2)}</td>
      <td style="padding: 10px; text-align: right; color: #137333; font-weight: 600;">${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      <td style="padding: 10px; text-align: right; font-weight: 600;">${runningShares.toLocaleString()}</td>
      <td style="padding: 10px; text-align: right; font-weight: 700;">${curAvg.toFixed(2)}</td>
      <td style="padding: 10px; text-align: center;">
        <button type="button" style="color: #ef4444; background: none; border: none; cursor: pointer; font-weight: 700; font-size: 13px;" onclick="removeTradeItem(${idx})">ลบ</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function removeTradeItem(index) {
  const tbody = document.getElementById('avgCostRows') || document.querySelector('table tbody');
  if (tbody && tbody.children[index]) {
    tbody.removeChild(tbody.children[index]);
  }
}

// ==========================================
// 4. ฟังก์ชันคำนวณเปรียบเทียบก่อน-หลัง
// ==========================================
function updateTargetComparison() {
  const buyPriceInput = document.getElementById('input-buy-price');
  const targetAvgInput = document.getElementById('input-target-avg');
  const extraMoneyInput = document.getElementById('input-buy-budget');

  const buyPrice = parseNum(buyPriceInput ? buyPriceInput.value : 0);
  const targetAvg = parseNum(targetAvgInput ? targetAvgInput.value : 0);
  const extraBudget = parseNum(extraMoneyInput ? extraMoneyInput.value : 0);

  const currentShares = (window.currentHolding && window.currentHolding.shares > 0)
    ? window.currentHolding.shares
    : parseNum(document.getElementById('disp-shares')?.textContent || 11000);

  const currentAvg = (window.currentHolding && window.currentHolding.avgCost > 0)
    ? window.currentHolding.avgCost
    : parseNum(document.getElementById('disp-avg')?.textContent || 4.90);

  const currentTotalCost = (window.currentHolding && window.currentHolding.totalCost > 0)
    ? window.currentHolding.totalCost
    : (currentShares * currentAvg);

  let extraShares = 0;
  let newAvgFromMoney = currentAvg;
  let newTotalCostFromMoney = currentTotalCost;
  let newTotalSharesFromMoney = currentShares;

  if (buyPrice > 0 && extraBudget > 0) {
    extraShares = extraBudget / buyPrice;
    newTotalSharesFromMoney = currentShares + extraShares;
    newTotalCostFromMoney = currentTotalCost + extraBudget;
    newAvgFromMoney = newTotalCostFromMoney / newTotalSharesFromMoney;
  }

  let needShares = 0;
  let needMoney = 0;
  if (buyPrice > 0 && targetAvg > 0 && targetAvg !== buyPrice) {
    const required = (currentShares * (currentAvg - targetAvg)) / (targetAvg - buyPrice);
    if (required > 0) {
      needShares = Math.round(required);
      needMoney = needShares * buyPrice;
    }
  }

  // 1. อัปเดตการ์ดย่อย 3 ใบตาม ID จริงใน average.html
  const elNeedShares = document.getElementById('res-target-shares');
  const elNeedMoney = document.getElementById('res-target-money');
  const elNewAvg = document.getElementById('res-new-avg');
  const elNewShares = document.getElementById('res-new-shares');

  if (elNeedShares) elNeedShares.textContent = needShares.toLocaleString();
  if (elNeedMoney) elNeedMoney.textContent = needMoney.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (elNewAvg) elNewAvg.textContent = newAvgFromMoney.toFixed(2);
  if (elNewShares) elNewShares.textContent = `ซื้อได้ ${extraShares.toLocaleString(undefined, { maximumFractionDigits: 6 })} หุ้น`;

  // 2. อัปเดตกล่องสรุปเปรียบเทียบ ก่อน - หลัง
  const comparePanel = document.getElementById('avgComparePanel');
  if (comparePanel) {
    comparePanel.style.display = 'block';

    const diffPct = currentAvg > 0 ? ((newAvgFromMoney - currentAvg) / currentAvg) * 100 : 0;
    const isCostDown = diffPct <= 0;

    const elBeforeShares = document.getElementById('cmpBeforeShares');
    const elBeforeAvg = document.getElementById('cmpBeforeAvg');
    const elBeforeTotal = document.getElementById('cmpBeforeTotal');
    if (elBeforeShares) elBeforeShares.textContent = `${currentShares.toLocaleString()} หุ้น`;
    if (elBeforeAvg) elBeforeAvg.textContent = `${currentAvg.toFixed(2)} ฿`;
    if (elBeforeTotal) elBeforeTotal.textContent = `${currentTotalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ฿`;

    const elAfterShares = document.getElementById('cmpAfterShares');
    const elAfterAvg = document.getElementById('cmpAfterAvg');
    const elAfterTotal = document.getElementById('cmpAfterTotal');
    const elBadge = document.getElementById('avgStrategyBadge');

    // ปรับทศนิยมหุ้นให้เหลือ 2 ตำแหน่ง
    const extraSharesFormatted = extraShares.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
    const totalSharesFormatted = newTotalSharesFromMoney.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });

    if (elAfterShares) elAfterShares.textContent = `${totalSharesFormatted} หุ้น (+${extraSharesFormatted})`;
    if (elAfterAvg) elAfterAvg.textContent = `${newAvgFromMoney.toFixed(2)} ฿ (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(2)}%)`;
    if (elAfterTotal) elAfterTotal.textContent = `${newTotalCostFromMoney.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ฿`;

    if (elBadge) {
      elBadge.textContent = isCostDown ? `ถัวลดต้นทุน ลง ${Math.abs(diffPct).toFixed(2)}%` : `ซื้อเฉลี่ยขาขึ้น +${diffPct.toFixed(2)}%`;
      elBadge.style.color = isCostDown ? '#16a34a' : '#d97706';
    }
    const elDynamicText = document.getElementById('avgSummaryDynamicText');
    if (elDynamicText) {
      elDynamicText.innerHTML = `💡 หากซื้อเพิ่ม <b>${extraSharesFormatted} หุ้น</b> ที่ราคา <b>${buyPrice.toFixed(2)} ฿</b> (ใช้เงิน <b>${extraBudget.toLocaleString(undefined, {minimumFractionDigits: 2})} ฿</b>) จะทำให้ต้นทุนเฉลี่ยเปลี่ยนจาก <b>${currentAvg.toFixed(2)} ฿</b> เป็น <b>${newAvgFromMoney.toFixed(2)} ฿</b>`;
    }
    if (elDynamicText) {
      elDynamicText.innerHTML = `💡 หากซื้อเพิ่ม <b>${extraSharesFormatted} หุ้น</b> ที่ราคา <b>${buyPrice.toFixed(2)} ฿</b> (ใช้เงิน <b>${extraBudget.toLocaleString(undefined, {minimumFractionDigits: 2})} ฿</b>) จะทำให้ต้นทุนเฉลี่ยเปลี่ยนจาก <b>${currentAvg.toFixed(2)} ฿</b> เป็น <b>${newAvgFromMoney.toFixed(2)} ฿</b>`;
    }

    // อัปเดตข้อความในการ์ดย่อยใบที่ 3 ให้เป็น 2 ตำแหน่งด้วย
    const elNewShares = document.getElementById('res-new-shares');
    if (elNewShares) {
      elNewShares.textContent = `ซื้อได้ ${extraSharesFormatted} หุ้น`;
    }
  }

  // 3. อัปเดตแถบสรุปกรณีถัวลง
  const elNote = document.getElementById('avgTargetNote');
  if (elNote && needShares > 0 && buyPrice < currentAvg) {
    elNote.innerHTML = `กรณีถัวลง: ถ้าซื้อที่ราคา <b>${buyPrice.toFixed(2)} ฿</b> ต้องซื้อเพิ่มประมาณ <b>${needShares.toLocaleString()} หุ้น</b> เพื่อให้เฉลี่ยใหม่เป็น <b>${targetAvg.toFixed(2)} ฿</b>`;
  }
}

// ==========================================
// 5. เชื่อมต่อ Global และผูก Event
// ==========================================
window.loadFromPortfolio = loadFromPortfolio;
window.updateTargetComparison = updateTargetComparison;
window.removeTradeItem = removeTradeItem;

document.addEventListener('DOMContentLoaded', () => {
  const btnImport = document.getElementById('avgImportButton') || 
                    document.getElementById('btn-import-port') || 
                    document.querySelector('.btn-primary') ||
                    document.querySelector('button[onclick*="loadFromPortfolio"]');
  if (btnImport) {
    btnImport.addEventListener('click', loadFromPortfolio);
  }

  const inputSelectors = [
    '#avgTargetBuyPrice', '#avgTargetPrice', '#avgTargetExtra',
    '#input-buy-price', '#input-target-avg', '#input-extra-money',
    'input[placeholder*="6.50"]', 'input[placeholder*="7.00"]', 'input[placeholder*="20,000"]'
  ];

  inputSelectors.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.addEventListener('input', updateTargetComparison);
  });
  // รันดึงข้อมูลและคำนวณอัตโนมัติตอนเปิดหน้าเว็บ
  setTimeout(() => {
    const selectPort = document.getElementById('select-port') || document.getElementById('avgImportPortfolio');
    const selectAsset = document.getElementById('select-asset') || document.getElementById('avgImportSymbol');

    if (selectPort && !selectPort.value) selectPort.value = 'BLS';
    if (selectAsset) {
      for (let opt of selectAsset.options) {
        if (opt.value.includes('ALLY') || opt.text.includes('ALLY')) {
          selectAsset.value = opt.value;
          break;
        }
      }
    }

    if (typeof loadFromPortfolio === 'function') {
      loadFromPortfolio();
    }

    const inBuy = document.getElementById('avgTargetBuyPrice') || document.querySelector('input[placeholder*="6.50"]');
    const inTarget = document.getElementById('avgTargetPrice') || document.querySelector('input[placeholder*="7.00"]');
    const inExtra = document.getElementById('avgTargetExtra') || document.querySelector('input[placeholder*="20,000"]');

    if (inBuy) inBuy.value = '';
if (inTarget) inTarget.value = '';
if (inExtra) inExtra.value = '';

    if (typeof updateTargetComparison === 'function') {
      updateTargetComparison();
    }
  }, 250);
});