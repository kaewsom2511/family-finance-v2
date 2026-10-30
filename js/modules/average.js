// js/modules/average.js
// ==========================================
// 1. ฟังก์ชันตัวช่วย (Helpers) & ตรวจจับสิทธิ์ (RBAC)
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

function tradeDateOf(t) {
  return t.tradeDate || t.date || t.timestamp || '';
}

const CURRENCY_SIGNS = { THB: '฿', USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', HKD: 'HK$', SGD: 'S$' };

function currencySign(cur) {
  const c = String(cur || 'THB').toUpperCase();
  return CURRENCY_SIGNS[c] || c;
}

function money(v, cur) {
  return `${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencySign(cur)}`;
}

function pickAssetType(list) {
  const tally = {};
  list.forEach(t => { if (t.assetType) tally[t.assetType] = (tally[t.assetType] || 0) + 1; });
  return Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || '';
}

function getLiveUsdThb() {
  try {
    return parseNum(JSON.parse(localStorage.getItem('wealthport:latest-usd-thb') || '{}').rate);
  } catch (e) {
    return 0;
  }
}

// ป้ายบอกสกุลเงินในช่องกรอกคำนวณ ให้ตรงกับสกุลเงินจริงของสินทรัพย์ที่เลือก
function applyCurrencyLabels(cur) {
  const sign = currencySign(cur);
  const pairs = [
    ['lbl-input-price', `ราคาซื้อเพิ่ม (${sign})`],
    ['lbl-goal-input-price', `ราคาซื้อเพิ่ม (${sign})`],
    ['lbl-goal-target-avg', `ต้นทุนเฉลี่ยที่ต้องการ (${sign})`],
    ['res-target-money-unit', `${sign} (ตามราคาซื้อเพิ่ม)`],
  ];
  pairs.forEach(([id, text]) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  });
  if (document.getElementById('select-calc-mode')?.value !== 'shares') {
    const lbl = document.getElementById('lbl-sim-value');
    if (lbl) lbl.innerText = `จำนวนเงินที่จะซื้อเพิ่ม (${sign})`;
  }
}

function getAverageUserContext() {
  try {
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    const sbData = sbKey ? JSON.parse(localStorage.getItem(sbKey)) : null;
    const userEmail = (sbData?.user?.email || '').toLowerCase();

    const pageText = document.body ? document.body.innerText : '';
    const isExplicitMember = pageText.includes('(MEMBER)') || pageText.includes('สมาชิก');
    const isExplicitAdmin = pageText.includes('(ADMIN)') || pageText.includes('ผู้ดูแล');

    const nameEl = document.querySelector('#current-user-name, .user-name, [class*="name"]');
    let rawName = (nameEl ? nameEl.textContent : '').trim();
    if (!rawName && userEmail) rawName = userEmail.split('@')[0];

    const isMemberUser = !isExplicitAdmin && (
      isExplicitMember ||
      rawName.includes('พลอย') ||
      rawName.toLowerCase().includes('ploy') ||
      userEmail.includes('ploy') ||
      userEmail.includes('member')
    );

    if (isMemberUser) {
      return {
        isMember: true,
        // คีย์มาตรฐานชื่อเดียวทุกบทบาท DataScope เป็นผู้แยกเจ้าของด้วย #u<uid>
        storageKey: 'stock-trading-log:v3'
      };
    }
  } catch (e) {}

  return {
    isMember: false,
    storageKey: 'stock-trading-log:v3'
  };
}

// ตัวแปร Global จัดการสถานะ
window.currentHolding = {
  shares: 0,
  avgCost: 0,
  totalCost: 0,
  txCount: 0,
  marketPrice: 0,
  symbol: '',
  currency: 'THB',
  costFx: 1,
  marketFx: 1
};

window.activeCalcTab = 'sim'; // 'sim' | 'goal'

// ==========================================
// 2. การควบคุมแท็บและ UI (Tab Controller)
// ==========================================
function switchCalcTab(mode) {
  window.activeCalcTab = mode;
  const btnSim = document.getElementById('btn-tab-sim');
  const btnGoal = document.getElementById('btn-tab-goal');
  const formSim = document.getElementById('form-tab-sim');
  const formGoal = document.getElementById('form-tab-goal');
  const panelSim = document.getElementById('avgComparePanel');
  const panelGoal = document.getElementById('panel-goal-result');

  if (mode === 'sim') {
    if (btnSim) btnSim.classList.add('active');
    if (btnGoal) btnGoal.classList.remove('active');
    if (formSim) formSim.style.display = 'flex';
    if (formGoal) formGoal.style.display = 'none';
    if (panelSim) panelSim.style.display = 'block';
    if (panelGoal) panelGoal.style.display = 'none';
  } else {
    if (btnSim) btnSim.classList.remove('active');
    if (btnGoal) btnGoal.classList.add('active');
    if (formSim) formSim.style.display = 'none';
    if (formGoal) formGoal.style.display = 'flex';
    if (panelSim) panelSim.style.display = 'none';
    if (panelGoal) panelGoal.style.display = 'block';

    // ดึงราคาซื้อเพิ่มจากแท็บแรกมาใส่ช่องเป้าหมายให้อัตโนมัติถ้ายังว่าง
    const simPrice = document.getElementById('input-buy-price')?.value;
    const goalBuyPrice = document.getElementById('input-goal-buy-price');
    if (goalBuyPrice && !goalBuyPrice.value && simPrice) {
      goalBuyPrice.value = simPrice;
    }
  }

  updateTargetComparison();
}

function handleCalcModeChange() {
  const mode = document.getElementById('select-calc-mode')?.value;
  const lbl = document.getElementById('lbl-sim-value');
  const input = document.getElementById('input-buy-budget');

  const cur = window.currentHolding.currency || 'THB';
  if (mode === 'shares') {
    if (lbl) lbl.innerText = 'จำนวนหุ้นที่จะซื้อเพิ่ม (หุ้น)';
    if (input) input.placeholder = 'เช่น 7,500';
  } else {
    if (lbl) lbl.innerText = `จำนวนเงินที่จะซื้อเพิ่ม (${currencySign(cur)})`;
    if (input) input.placeholder = 'เช่น 7,500';
  }

  updateTargetComparison();
}

function toggleNavGroup(id) {
  const g = document.getElementById(id);
  if (g) g.classList.toggle('open');
}

// ==========================================
// 3. ฟังก์ชันดึงประวัติจากพอร์ต (loadFromPortfolio)
// ==========================================
function refreshPortfolios() {
  const selectAsset = document.getElementById('select-asset');
  const selectPort = document.getElementById('select-port');
  const statusBanner = document.getElementById('banner-port-status');
  if (!selectAsset || !selectPort) return;

  const ctx = getAverageUserContext();
  const raw = localStorage.getItem(ctx.storageKey);
  if (!raw) {
    if (statusBanner) statusBanner.textContent = 'ไม่พบประวัติการซื้อขายในระบบ';
    return;
  }

  try {
    const db = JSON.parse(raw);
    const portfolios = db.portfolios || [];
    const trades = db.trades || [];

    const currentPortVal = selectPort.value;
    selectPort.innerHTML = '<option value="ALL">-- ทุกพอร์ตรวมกัน --</option>';

    portfolios.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name || p.id;
      opt.textContent = p.name || p.id;
      selectPort.appendChild(opt);
    });

    if (currentPortVal && Array.from(selectPort.options).some(o => o.value === currentPortVal)) {
      selectPort.value = currentPortVal;
    } else if (Array.from(selectPort.options).some(o => o.value === 'BLS')) {
      selectPort.value = 'BLS';
    } else {
      selectPort.value = 'ALL';
    }

    const selectedPortVal = selectPort.value;
    let targetPortId = selectedPortVal;
    const foundPort = portfolios.find(p => p.id === selectedPortVal || p.name === selectedPortVal);
    if (foundPort && foundPort.id) targetPortId = foundPort.id;

    const assetMap = {};
    trades.forEach(t => {
      const rawSym = (t.symbol || t.ticker || t.stock || t.asset || '').trim().toUpperCase();
      if (!rawSym) return;
      const cleanSym = rawSym.replace(/\.BK$/, '').trim();

      if (selectedPortVal !== 'ALL') {
        const tPort = (t.portfolioId || t.portfolio || t.port || t.broker || '').toString();
        if (tPort !== targetPortId && tPort !== selectedPortVal) return;
      }
      assetMap[cleanSym] = (assetMap[cleanSym] || 0) + 1;
    });

    selectAsset.innerHTML = '';
    const sortedSymbols = Object.keys(assetMap).sort();

    sortedSymbols.forEach(sym => {
      const opt = document.createElement('option');
      opt.value = sym;
      opt.textContent = `${sym} (${assetMap[sym]} รายการ)`;
      selectAsset.appendChild(opt);
    });

    if (statusBanner) {
      statusBanner.textContent = `พบ ${sortedSymbols.length} สินทรัพย์ในพอร์ตนี้ เลือกแล้วกด “ดึงจากพอร์ต”`;
    }

    if (sortedSymbols.length > 0) {
      loadFromPortfolio();
    }
  } catch (err) {
    console.error('refreshPortfolios error:', err);
  }
}

function loadFromPortfolio() {
  const selectAsset = document.getElementById('select-asset');
  const selectPort = document.getElementById('select-port');
  if (!selectAsset || !selectAsset.value) return;

  let rawAssetValue = selectAsset.value.trim();
  if (rawAssetValue.includes('(')) rawAssetValue = rawAssetValue.split('(')[0].trim();
  const targetSymbol = normalizeSymbol(rawAssetValue);

  const ctx = getAverageUserContext();
  const rawLog = localStorage.getItem(ctx.storageKey);
  if (!rawLog) return;

  try {
    const parsed = JSON.parse(rawLog);
    const trades = parsed.trades || parsed.logs || (Array.isArray(parsed) ? parsed : []);
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

    if (matchedTrades.length === 0) return;

    matchedTrades.sort((a, b) => new Date(tradeDateOf(a) || 0) - new Date(tradeDateOf(b) || 0));

    const assetType = pickAssetType(matchedTrades);

    let totalShares = 0;
    let totalCost = 0;
    let fxBase = 0;
    let fxThbCost = 0;

    matchedTrades.forEach(t => {
      const qty = parseNum(t.shares || t.quantity || t.qty || t.amount);
      const price = parseNum(t.price || t.cost || t.unitPrice);
      const fee = parseNum(t.fee || t.commission || t.vat);
      const type = (t.type || t.action || t.side || 'BUY').toUpperCase();

      if (type.includes('BUY')) {
        totalCost += (qty * price) + fee;
        totalShares += qty;
        const fx = parseNum(t.fxRate);
        if (fx > 0 && qty * price > 0) {
          fxBase += qty * price;
          fxThbCost += qty * price * fx;
        }
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
    let quoteCurrency = '';
    const rawQuote = localStorage.getItem('stock-trading-log:quote-cache:v1');
    if (rawQuote) {
      try {
        const quotes = JSON.parse(rawQuote);
        const base = String(targetSymbol || '').toUpperCase();
        const typedKey = {
          'foreign-stock': `foreign-stock|${base}`,
          'thai-stock': `thai-stock|${base}.BK`,
          'mutual-fund': `mutual-fund|${base}`
        }[assetType] || null;
        const fallbacks = [
          `foreign-stock|${base}`, `thai-stock|${base}.BK`, `thai-stock|${base}`,
          `mutual-fund|${base}`, `mutual-fund|${base}-A`, base, `${base}.BK`
        ];
        const candidates = [typedKey].concat(fallbacks).filter((k, i, arr) => k && arr.indexOf(k) === i);
        for (const key of candidates) {
          const q = quotes[key];
          if (q && (q.price || q.close) && parseNum(q.price || q.close) > 0) {
            marketPrice = parseNum(q.price || q.close);
            quoteCurrency = String(q.currency || '').toUpperCase();
            break;
          }
        }
      } catch (e) {}
    }

    // ราคาที่บันทึกไว้เป็นสกุลเงินของสินทรัพย์นั้น (หุ้น/ETF ต่างประเทศ = USD) ไม่ใช่บาท
    const currency = quoteCurrency || (assetType === 'foreign-stock' ? 'USD' : 'THB');
    const liveFx = currency === 'USD' ? getLiveUsdThb() : 0;
    const costFx = currency === 'THB' ? 1 : (fxBase > 0 ? fxThbCost / fxBase : liveFx);
    const marketFx = currency === 'THB' ? 1 : (liveFx > 0 ? liveFx : costFx);

    window.currentHolding = {
      shares: totalShares,
      avgCost: avgPrice,
      totalCost: totalCost,
      txCount: matchedTrades.length,
      marketPrice: marketPrice,
      symbol: targetSymbol,
      currency: currency,
      costFx: costFx,
      marketFx: marketFx
    };

    // อัปเดตการ์ดสรุป 4 กล่องบนสุด
    const elShares = document.getElementById('disp-shares');
    const elAvg = document.getElementById('disp-avg');
    const elTotal = document.getElementById('disp-total');
    const elCount = document.getElementById('disp-count');

    if (elShares) elShares.textContent = totalShares.toLocaleString();
    if (elAvg) elAvg.textContent = money(avgPrice, currency);
    if (elTotal) elTotal.textContent = money(totalCost, currency);
    if (elCount) elCount.textContent = matchedTrades.length;

    // อัปเดตตารางสรุปด้านล่างตารางซื้อขาย
    const tblShares = document.getElementById('tbl-total-shares');
    const tblCost = document.getElementById('tbl-total-cost');
    const tblRunShares = document.getElementById('tbl-running-shares');
    const tblFinalAvg = document.getElementById('tbl-final-avg');
    if (tblShares) tblShares.textContent = totalShares.toLocaleString();
    if (tblCost) tblCost.textContent = money(totalCost, currency);
    if (tblRunShares) tblRunShares.textContent = totalShares.toLocaleString();
    if (tblFinalAvg) tblFinalAvg.textContent = money(avgPrice, currency);

    // อัปเดต Badge ราคาตลาด
    const elCurrAvg = document.getElementById('lbl-curr-avg');
    const elMktPrice = document.getElementById('lbl-mkt-price');
    const elMktDiff = document.getElementById('lbl-mkt-diff');

    const mktThbHint = currency !== 'THB' && marketFx > 0 ? ` ≈ ${money(marketPrice * marketFx, 'THB')}` : '';
    if (elCurrAvg) elCurrAvg.textContent = money(avgPrice, currency);
    if (elMktPrice) elMktPrice.textContent = `${money(marketPrice, currency)}${mktThbHint}`;
    if (elMktDiff) {
      const diffPct = avgPrice > 0 ? ((marketPrice - avgPrice) / avgPrice) * 100 : 0;
      elMktDiff.textContent = `(${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(2)}%)`;
      elMktDiff.style.color = diffPct >= 0 ? '#10b981' : '#ef4444';
    }

    renderTradesTable(matchedTrades, currency);

    const banner = document.getElementById('banner-port-status');
    if (banner) {
      const fxNote = currency === 'THB' ? ''
        : (costFx > 0 ? ` · ราคาเป็น ${currency} (เรทถัวเฉลี่ย ฿${costFx.toFixed(2)}/${currency})` : ` · ราคาเป็น ${currency}`);
      banner.textContent = `✓ ดึงรายการสำเร็จ ${matchedTrades.length} รายการ (${totalShares.toLocaleString()} หุ้น)${fxNote}`;
    }

    applyCurrencyLabels(currency);
    updateTargetComparison();
  } catch (err) {
    console.error('loadFromPortfolio error:', err);
  }
}

// ==========================================
// 4. วาดตารางบันทึกการซื้อ/ขาย
// ==========================================
function renderTradesTable(tradesList, cur) {
  const currency = cur || window.currentHolding.currency || 'THB';
  const tbody = document.getElementById('avgCostRows');
  if (!tbody) return;

  tbody.innerHTML = '';
  let runningShares = 0;
  let runningCost = 0;

  tradesList.forEach((t, idx) => {
    const qty = parseNum(t.shares || t.quantity || t.qty || t.amount);
    const price = parseNum(t.price || t.cost || t.unitPrice);
    const subtotal = qty * price;
    const rawType = (t.type || t.action || t.side || 'BUY').toUpperCase();
    const type = rawType.includes('SELL') ? 'SELL' : rawType.includes('BUY') ? 'BUY' : 'OTHER';

    const rawDate = tradeDateOf(t);
    let dateStr = '-';
    if (rawDate) {
      const d = new Date(rawDate);
      dateStr = !isNaN(d) ? d.toLocaleDateString('th-TH') : rawDate;
    }

    if (type === 'BUY') {
      runningCost += subtotal;
      runningShares += qty;
    } else if (type === 'SELL') {
      const curAvg = runningShares > 0 ? (runningCost / runningShares) : 0;
      runningShares = Math.max(0, runningShares - qty);
      runningCost = runningShares * curAvg;
    }
    const curAvg = runningShares > 0 ? (runningCost / runningShares) : 0;

    const tr = document.createElement('tr');
    const OTHER_LABELS = { DIVIDEND: 'ปันผล', SPLIT: 'ปรับหุ้น (Split)' };
    const badgeText = type === 'BUY' ? 'ซื้อ' : type === 'SELL' ? 'ขาย' : (OTHER_LABELS[rawType] || rawType);
    const bg = type === 'BUY' ? '#e6f4ea' : type === 'SELL' ? '#fee2e2' : '#e2e8f0';
    const col = type === 'BUY' ? '#137333' : type === 'SELL' ? '#b91c1c' : '#475569';

    tr.innerHTML = `
      <td style="padding: 10px; text-align: center; color: #64748b;">${idx + 1}</td>
      <td style="padding: 8px 10px; text-align: center;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 700; background-color: ${bg}; color: ${col};">
          ${badgeText}
        </span>
      </td>
      <td style="padding: 10px; text-align: center; color: #334155;">${dateStr}</td>
      <td style="padding: 10px; text-align: right; font-weight: 600;">${qty.toLocaleString()}</td>
      <td style="padding: 10px; text-align: right;">${money(price, currency)}</td>
      <td style="padding: 10px; text-align: right; color: #137333; font-weight: 600;">${type === 'OTHER' ? '-' : money(subtotal, currency)}</td>
      <td style="padding: 10px; text-align: right; font-weight: 600;">${runningShares.toLocaleString()}</td>
      <td style="padding: 10px; text-align: right; font-weight: 700; color: #0284c7;">${money(curAvg, currency)}</td>
      <td style="padding: 10px; text-align: center;">
        <button type="button" style="color: #ef4444; background: none; border: none; cursor: pointer; font-weight: 700;" onclick="removeTradeItem(${idx})">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function removeTradeItem(index) {
  const tbody = document.getElementById('avgCostRows');
  if (tbody && tbody.children[index]) {
    tbody.removeChild(tbody.children[index]);
  }
}

// ==========================================
// 5. ระบบคำนวณถัวเฉลี่ย (แยกโหมดชัดเจน + ปัดเศษ)
// ==========================================
function updateTargetComparison() {
  const currentShares = window.currentHolding.shares || 0;
  const currentAvg = window.currentHolding.avgCost || 0;
  const currentTotalCost = window.currentHolding.totalCost || (currentShares * currentAvg);
  const currency = window.currentHolding.currency || 'THB';

  // ----------------------------------------
  // ทำงานตามโหมดที่กำลังเลือก
  // ----------------------------------------
  if (window.activeCalcTab === 'goal') {
    // โหมด 2: หาต้นทุนเป้าหมาย
    const buyPrice = parseNum(document.getElementById('input-goal-buy-price')?.value);
    const targetAvg = parseNum(document.getElementById('input-target-avg')?.value);

    const elHeading = document.getElementById('goal-result-heading');
    const elNeedShares = document.getElementById('res-target-shares');
    const elNeedMoney = document.getElementById('res-target-money');
    const elNote = document.getElementById('avgTargetNote');

    if (buyPrice > 0 && targetAvg > 0 && currentShares > 0) {
      if (buyPrice === targetAvg) {
        if (elNeedShares) elNeedShares.textContent = '-';
        if (elNeedMoney) elNeedMoney.textContent = '-';
        if (elNote) elNote.innerHTML = '⚠️ ราคาซื้อเพิ่มต้องไม่เท่ากับต้นทุนเฉลี่ยเป้าหมาย';
        return;
      }

      // ตรวจสอบเงื่อนไขถัวลง: ราคาซื้อต้องต่ำกว่าเป้าหมาย
      const isDown = targetAvg < currentAvg;
      if (isDown && buyPrice >= targetAvg) {
        if (elNeedShares) elNeedShares.textContent = '-';
        if (elNeedMoney) elNeedMoney.textContent = '-';
        if (elNote) elNote.innerHTML = '⚠️ หากต้องการถัวลดต้นทุนลง ราคาซื้อใหม่ต้องต่ำกว่าต้นทุนเป้าหมาย';
        return;
      }

      const required = (currentShares * (currentAvg - targetAvg)) / (targetAvg - buyPrice);
      if (required > 0) {
        const needShares = Math.round(required); // ปัดเศษเป็นหุ้นจำนวนเต็ม
        const needMoney = needShares * buyPrice;

        if (elHeading) elHeading.innerText = `🎯 สรุปสิ่งที่ต้องทำเพื่อให้ได้ต้นทุนเฉลี่ย ${money(targetAvg, currency)}:`;
        if (elNeedShares) elNeedShares.textContent = needShares.toLocaleString();
        if (elNeedMoney) elNeedMoney.textContent = money(needMoney, currency);
        if (elNote) {
          elNote.innerHTML = `💡 ซื้อเพิ่ม <b>${needShares.toLocaleString()} หุ้น</b> ที่ราคา <b>${money(buyPrice, currency)}</b> จะทำให้มีหุ้นรวม <b>${(currentShares + needShares).toLocaleString()} หุ้น</b> และได้ต้นทุนเฉลี่ย <b>${money(targetAvg, currency)}</b>`;
        }
      } else {
        if (elNeedShares) elNeedShares.textContent = '-';
        if (elNeedMoney) elNeedMoney.textContent = '-';
        if (elNote) elNote.innerHTML = '⚠️ เงื่อนไขเป้าหมายไม่สอดคล้องกับราคาซื้อ';
      }
    } else {
      if (elNeedShares) elNeedShares.textContent = '-';
      if (elNeedMoney) elNeedMoney.textContent = '-';
      if (elNote) elNote.innerHTML = 'กรุณาระบุราคาซื้อเพิ่ม และต้นทุนเฉลี่ยเป้าหมายที่ต้องการ';
    }

  } else {
    // โหมด 1: จำลองการซื้อ (มีงบ / มีจำนวนหุ้น)
    const buyPrice = parseNum(document.getElementById('input-buy-price')?.value);
    const mode = document.getElementById('select-calc-mode')?.value || 'money';
    const inputVal = parseNum(document.getElementById('input-buy-budget')?.value);

    let addShares = 0;
    let addMoney = 0;

    if (buyPrice > 0 && inputVal > 0) {
      if (mode === 'shares') {
        addShares = Math.floor(inputVal); // ซื้อตามหุ้น
        addMoney = addShares * buyPrice;
      } else {
        addShares = Math.floor(inputVal / buyPrice); // ซื้อตามงบ ปัดเศษลงเป็นหุ้นเต็ม
        addMoney = addShares * buyPrice;
      }
    }

    const newTotalShares = currentShares + addShares;
    const newTotalCost = currentTotalCost + addMoney;
    const newAvg = newTotalShares > 0 ? (newTotalCost / newTotalShares) : currentAvg;

    const diffPct = currentAvg > 0 ? ((newAvg - currentAvg) / currentAvg) * 100 : 0;
    const isCostDown = diffPct <= 0;

    // อัปเดตกล่องสถานะเดิม
    const elBeforeShares = document.getElementById('cmpBeforeShares');
    const elBeforeAvg = document.getElementById('cmpBeforeAvg');
    const elBeforeTotal = document.getElementById('cmpBeforeTotal');
    if (elBeforeShares) elBeforeShares.textContent = `${currentShares.toLocaleString()} หุ้น`;
    if (elBeforeAvg) elBeforeAvg.textContent = money(currentAvg, currency);
    if (elBeforeTotal) elBeforeTotal.textContent = money(currentTotalCost, currency);

    // อัปเดตกล่องสถานะใหม่
    const elAfterShares = document.getElementById('cmpAfterShares');
    const elAfterAvg = document.getElementById('cmpAfterAvg');
    const elAfterTotal = document.getElementById('cmpAfterTotal');
    const elBadge = document.getElementById('avgStrategyBadge');
    const elDynamicText = document.getElementById('avgSummaryDynamicText');

    if (addShares > 0) {
      if (elAfterShares) elAfterShares.textContent = `${newTotalShares.toLocaleString()} หุ้น (+${addShares.toLocaleString()})`;
      if (elAfterAvg) elAfterAvg.textContent = `${money(newAvg, currency)} (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(2)}%)`;
      if (elAfterTotal) elAfterTotal.textContent = money(newTotalCost, currency);

      if (elBadge) {
        elBadge.textContent = isCostDown ? `📉 ถัวลดต้นทุน ลง ${Math.abs(diffPct).toFixed(2)}%` : `📈 ซื้อเฉลี่ยขาขึ้น +${diffPct.toFixed(2)}%`;
        elBadge.style.color = isCostDown ? '#16a34a' : '#d97706';
      }

      const remainder = (mode === 'money' && inputVal > addMoney) ? ` (เหลืองบ ${money(inputVal - addMoney, currency)})` : '';
      if (elDynamicText) {
        elDynamicText.innerHTML = `💡 หากซื้อเพิ่ม <b>${addShares.toLocaleString()} หุ้น</b> ที่ราคา <b>${money(buyPrice, currency)}</b> (ใช้เงิน <b>${money(addMoney, currency)}</b>${remainder}) จะทำให้ต้นทุนเฉลี่ยเปลี่ยนจาก <b>${money(currentAvg, currency)}</b> เป็น <b>${money(newAvg, currency)}</b>`;
      }
    } else {
      if (elAfterShares) elAfterShares.textContent = `${currentShares.toLocaleString()} หุ้น`;
      if (elAfterAvg) elAfterAvg.textContent = money(currentAvg, currency);
      if (elAfterTotal) elAfterTotal.textContent = money(currentTotalCost, currency);
      if (elDynamicText) elDynamicText.innerHTML = '💡 กรอกราคาและจำนวนเงิน/หุ้น เพื่อเริ่มจำลองการถัวเฉลี่ย';
    }
  }
}

function clearSim() {
  if (confirm('คุณต้องการล้างข้อมูลจำลองการคำนวณทั้งหมดหรือไม่?')) {
    window.currentHolding = { shares: 0, avgCost: 0, totalCost: 0, txCount: 0, marketPrice: 0, symbol: '', currency: 'THB', costFx: 1, marketFx: 1 };
    applyCurrencyLabels('THB');
    loadFromPortfolio();
  }
}

function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.currentHolding, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = "average_cost_backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      window.currentHolding = JSON.parse(evt.target.result);
      updateTargetComparison();
      alert('นำเข้าข้อมูลสำเร็จ');
    } catch(err) {
      alert('รูปแบบไฟล์ไม่ถูกต้อง');
    }
  };
  reader.readAsText(file);
}

// ผูกฟังก์ชันเข้า Window
window.loadFromPortfolio = loadFromPortfolio;
window.refreshPortfolios = refreshPortfolios;
window.updateTargetComparison = updateTargetComparison;
window.switchCalcTab = switchCalcTab;
window.handleCalcModeChange = handleCalcModeChange;
window.clearSim = clearSim;
window.exportData = exportData;
window.importData = importData;
window.removeTradeItem = removeTradeItem;

document.addEventListener('DOMContentLoaded', () => {
  const selectPort = document.getElementById('select-port');
  if (selectPort) selectPort.addEventListener('change', refreshPortfolios);

  const selectAsset = document.getElementById('select-asset');
  if (selectAsset) selectAsset.addEventListener('change', loadFromPortfolio);

  // ผูกการตรวจจับพิมพ์ค่าคำนวณทันที
  const inputs = ['input-buy-price', 'input-buy-budget', 'input-goal-buy-price', 'input-target-avg'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateTargetComparison);
  });

  setTimeout(() => {
    refreshPortfolios();
  }, 200);
});