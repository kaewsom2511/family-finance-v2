/**
 * js/modules/debt.js
 * Family Finance - Unified Credit Cards & Debt Tracker Module
 */

window.DebtModule = {
  storageKey: 'family-finance:debt-plans',
  activeViewTab: 'cards',
  sortField: 'date',
  sortOrder: 'desc',

  defaultDebts: [
    {
      id: 'debt-condo',
      name: 'ผ่อนคอนโด',
      accountName: 'กรุงไทย',
      totalDebt: 1208772.64,
      monthlyPayment: 22000.00,
      startDate: '2025-12-26',
      endDate: '2030-06-26',
      paidAmount: 242000.00,
      paidMonths: 11,
      totalMonths: 55,
      isClosed: false,
      closedDate: null
    },
    {
      id: 'debt-fridge',
      name: 'ผ่อนตู้เย็น',
      accountName: 'บัตรเครดิตกรุงศรี',
      totalDebt: 10793.48,
      monthlyPayment: 1798.92,
      startDate: '2026-04-27',
      endDate: '2026-09-27',
      paidAmount: 10793.48,
      paidMonths: 6,
      totalMonths: 6,
      isClosed: true,
      closedDate: '2026-09-27'
    },
    {
      id: 'debt-camera',
      name: 'ผ่อนกล้อง',
      accountName: 'บัตรเครดิตกรุงศรี',
      totalDebt: 4792.00,
      monthlyPayment: 798.67,
      startDate: '2026-04-27',
      endDate: '2026-09-27',
      paidAmount: 4792.00,
      paidMonths: 6,
      totalMonths: 6,
      isClosed: true,
      closedDate: '2026-09-27'
    },
    {
      id: 'debt-car-service-old',
      name: 'ผ่อนเช็คระยะรถ',
      accountName: 'บัตรเครดิตกรุงศรี',
      totalDebt: 4331.38,
      monthlyPayment: 721.90,
      startDate: '2026-03-27',
      endDate: '2026-08-27',
      paidAmount: 4331.38,
      paidMonths: 6,
      totalMonths: 6,
      isClosed: true,
      closedDate: '2026-08-27'
    },
    {
      id: 'debt-car-service-new',
      name: 'เช็คระยะรถ',
      accountName: 'บัตรเครดิตกรุงศรี',
      totalDebt: 9499.58,
      monthlyPayment: 1583.26,
      startDate: '2026-10-11',
      endDate: '2027-03-11',
      paidAmount: 1583.26,
      paidMonths: 1,
      totalMonths: 6,
      isClosed: false,
      closedDate: null
    }
  ],

  init() {
    this.checkHash();
    this.bindEvents();
    if (typeof CreditCardModule !== 'undefined' && CreditCardModule.init) {
      CreditCardModule.init();
    }
  },

  checkHash() {
    const hash = window.location.hash || '';
    if (hash === '#debts-list' || hash === '#installments') {
      this.activeViewTab = 'debts';
    } else {
      this.activeViewTab = 'cards';
    }
  },

  getDebts() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    localStorage.setItem(this.storageKey, JSON.stringify(this.defaultDebts));
    return this.defaultDebts;
  },

  saveDebts(debts) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(debts));
    } catch (e) {}
  },

  formatDateTh(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  },

  bindEvents() {
    document.addEventListener('click', (e) => {
      const viewTabBtn = e.target.closest('.debt-main-tab');
      if (viewTabBtn) {
        this.activeViewTab = viewTabBtn.dataset.view;
        this.render();
        return;
      }

      const cardBox = e.target.closest('.cc-card-item');
      if (cardBox && !e.target.closest('.btn-edit-cc-card')) {
        const idx = parseInt(cardBox.dataset.index, 10);
        if (typeof CreditCardModule !== 'undefined') {
          CreditCardModule.activeCardIndex = idx;
        }
        this.render();
        return;
      }

      const thSort = e.target.closest('.th-sortable');
      if (thSort) {
        const field = thSort.dataset.field;
        if (this.sortField === field) {
          this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
        } else {
          this.sortField = field;
          this.sortOrder = 'desc';
        }
        this.render();
        return;
      }

      const addBtn = e.target.closest('#btn-open-add-debt');
      if (addBtn) {
        this.openDebtModal();
        return;
      }

      const manageBtn = e.target.closest('.btn-manage-debt');
      if (manageBtn) {
        const id = manageBtn.dataset.id;
        this.openDebtModal(id);
        return;
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'cc-select-card-dropdown') {
        const idx = parseInt(e.target.value, 10) || 0;
        if (typeof CreditCardModule !== 'undefined') {
          CreditCardModule.activeCardIndex = idx;
        }
        this.render();
      }
      if (e.target && e.target.id === 'cc-select-month-dropdown') {
        if (typeof CreditCardModule !== 'undefined') {
          CreditCardModule.selectedCycleMonth = e.target.value;
        }
        this.render();
      }
    });

    window.addEventListener('hashchange', () => {
      const isDebtPage = this.checkHash();
      if (isDebtPage) {
        this.render();
      }
    });
  },

  openDebtModal(debtId = null) {
    const debts = this.getDebts();
    const isEdit = !!debtId;
    const item = isEdit ? debts.find(d => d.id === debtId) : null;

    let existing = document.getElementById('modal-debt-plan');
    if (existing) existing.remove();

    const name = item ? item.name : '';
    const total = item ? item.totalDebt : '';
    const monthly = item ? item.monthlyPayment : '';
    const start = item ? item.startDate : new Date().toISOString().slice(0, 10);
    const end = item ? item.endDate : '';
    const paidM = item ? item.paidMonths : 1;
    const totalM = item ? item.totalMonths : 6;
    const isClosed = item ? item.isClosed : false;

    const modalHtml = `
      <div id="modal-debt-plan" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999999;">
        <div style="background: #fff; border-radius: 14px; width: 480px; max-width: 95vw; padding: 22px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">
              ${isEdit ? '⚙️ จัดการข้อมูลหนี้ / สัญญาผ่อน' : '➕ เพิ่มสัญญาผ่อน / หนี้สินใหม่'}
            </h3>
            <button id="btn-close-debt-modal" style="background: none; border: none; font-size: 22px; color: #94a3b8; cursor: pointer;">&times;</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">ชื่อรายการ</label>
              <input type="text" id="debt-input-name" value="${name}" placeholder="เช่น ผ่อนคอนโด, ผ่อนมือถือ" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; font-weight: 700;">
            </div>
            <div style="display: flex; gap: 10px;">
              <div style="flex: 1.2;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">ยอดหนี้เต็ม (บาท)</label>
                <input type="number" id="debt-input-total" value="${total}" step="any" placeholder="0.00" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; font-weight: 800; color: #0f172a;">
              </div>
              <div style="flex: 1;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">ผ่อนต่องวด (บาท)</label>
                <input type="number" id="debt-input-monthly" value="${monthly}" step="any" placeholder="0.00" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; font-weight: 800; color: #dc2626;">
              </div>
            </div>
            <div style="display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">งวดที่จ่ายแล้ว</label>
                <input type="number" id="debt-input-paid-months" value="${paidM}" min="0" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700;">
              </div>
              <div style="flex: 1;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">จำนวนงวดทั้งหมด</label>
                <input type="number" id="debt-input-total-months" value="${totalM}" min="1" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700;">
              </div>
            </div>
            <div style="display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">วันที่เริ่ม</label>
                <input type="date" id="debt-input-start" value="${start}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px;">
              </div>
              <div style="flex: 1;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">วันที่ครบ</label>
                <input type="date" id="debt-input-end" value="${end}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px;">
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 10px 12px; border-radius: 6px; border: 1px solid #e2e8f0; margin-top: 4px;">
              <input type="checkbox" id="debt-check-closed" ${isClosed ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
              <label for="debt-check-closed" style="font-size: 13px; font-weight: 700; color: #16a34a; cursor: pointer;">
                ✅ ปิดหนี้เรียบร้อยแล้ว (ชำระครบถ้วน)
              </label>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
              ${isEdit ? `
                <button id="btn-delete-debt" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 8px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 700; cursor: pointer;">ลบรายการ</button>
              ` : '<div></div>'}
              <div style="display: flex; gap: 8px;">
                <button id="btn-cancel-debt-modal" style="background: #fff; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">ยกเลิก</button>
                <button id="btn-save-debt-modal" style="background: #0f172a; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer;">💾 บันทึก</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const closeModal = () => document.getElementById('modal-debt-plan')?.remove();
    document.getElementById('btn-close-debt-modal').onclick = closeModal;
    document.getElementById('btn-cancel-debt-modal').onclick = closeModal;

    const totalEl = document.getElementById('debt-input-total');
    const totalMEl = document.getElementById('debt-input-total-months');
    const monthlyEl = document.getElementById('debt-input-monthly');

    const autoCalcMonthly = () => {
      const tot = parseFloat(totalEl.value) || 0;
      const m = parseInt(totalMEl.value, 10) || 0;
      if (tot > 0 && m > 0 && (!monthlyEl.value || !isEdit)) {
        monthlyEl.value = (tot / m).toFixed(2);
      }
    };
    totalEl.oninput = autoCalcMonthly;
    totalMEl.oninput = autoCalcMonthly;

    const delBtn = document.getElementById('btn-delete-debt');
    if (delBtn) {
      delBtn.onclick = () => {
        if (confirm(`ยืนยันลบรายการ "${item.name}"?`)) {
          const updated = debts.filter(d => d.id !== debtId);
          this.saveDebts(updated);
          closeModal();
          this.render();
        }
      };
    }

    document.getElementById('btn-save-debt-modal').onclick = () => {
      const nameVal = document.getElementById('debt-input-name').value.trim();
      const totalVal = parseFloat(totalEl.value) || 0;
      const monthlyVal = parseFloat(monthlyEl.value) || 0;
      const paidMVal = parseInt(document.getElementById('debt-input-paid-months').value, 10) || 0;
      const totalMVal = parseInt(totalMEl.value, 10) || 1;
      const startVal = document.getElementById('debt-input-start').value;
      const endVal = document.getElementById('debt-input-end').value;
      const closedVal = document.getElementById('debt-check-closed').checked;

      if (!nameVal) {
        alert('กรุณากรอกชื่อรายการ');
        return;
      }

      const calculatedPaidAmt = closedVal ? totalVal : (monthlyVal * paidMVal);

      if (isEdit) {
        item.name = nameVal;
        item.totalDebt = totalVal;
        item.monthlyPayment = monthlyVal;
        item.paidMonths = paidMVal;
        item.totalMonths = totalMVal;
        item.startDate = startVal;
        item.endDate = endVal;
        item.isClosed = closedVal;
        item.paidAmount = calculatedPaidAmt;
        if (closedVal && !item.closedDate) {
          item.closedDate = endVal || new Date().toISOString().slice(0, 10);
        }
      } else {
        debts.push({
          id: 'debt-' + Date.now(),
          name: nameVal,
          accountName: 'บัตรเครดิตกรุงศรี',
          totalDebt: totalVal,
          monthlyPayment: monthlyVal,
          startDate: startVal,
          endDate: endVal,
          paidAmount: calculatedPaidAmt,
          paidMonths: paidMVal,
          totalMonths: totalMVal,
          isClosed: closedVal,
          closedDate: closedVal ? (endVal || new Date().toISOString().slice(0, 10)) : null
        });
      }

      this.saveDebts(debts);
      closeModal();
      this.render();
    };
  },

  render(targetContainer = null) {
    const container = targetContainer 
                   || document.getElementById('content-area')
                   || document.getElementById('cashflow-subview')
                   || document.querySelector('.content-area')
                   || document.getElementById('main-content');

    if (!container) return;

    // ฟังก์ชันจัดรูปแบบตัวเลข (ประกาศครั้งเดียวใช้ได้ทั้งฟังก์ชัน)
    const fmt = (num) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const renderTopTabs = () => `
      <div style="display: flex; gap: 8px; margin-bottom: 20px;">
        <button class="debt-main-tab" data-view="cards" style="border: none; padding: 9px 20px; border-radius: 8px; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; background: ${this.activeViewTab === 'cards' ? '#0284c7' : '#f1f5f9'}; color: ${this.activeViewTab === 'cards' ? '#fff' : '#475569'}; box-shadow: ${this.activeViewTab === 'cards' ? '0 2px 4px rgba(2,132,199,0.25)' : 'none'};">
          <span>💳</span> รอบบิลบัตรเครดิต & รูดใช้จ่าย
        </button>
        <button class="debt-main-tab" data-view="debts" style="border: none; padding: 9px 20px; border-radius: 8px; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; background: ${this.activeViewTab === 'debts' ? '#0284c7' : '#f1f5f9'}; color: ${this.activeViewTab === 'debts' ? '#fff' : '#475569'}; box-shadow: ${this.activeViewTab === 'debts' ? '0 2px 4px rgba(2,132,199,0.25)' : 'none'};">
          <span>🏷️</span> สัญญาผ่อนชำระ & หนี้สิน
        </button>
      </div>
    `;

    // ----------------------------------------------------
    // โหมด 1: รอบบิลบัตรเครดิต & รูดใช้จ่าย
    // ----------------------------------------------------
    if (this.activeViewTab === 'cards') {
      const cards = (typeof CreditCardModule !== 'undefined') ? CreditCardModule.getCardConfigs() : [];
      let rawState = null;
      try {
        rawState = JSON.parse(localStorage.getItem('family-finance:cashflow:v2') || localStorage.getItem('family-finance:cashflow:v1') || '{}');
      } catch (e) {}
      const allTx = Array.isArray(rawState) ? rawState : (rawState?.transactions || []);
      const activeIdx = (typeof CreditCardModule !== 'undefined') ? CreditCardModule.activeCardIndex : 0;
      const curCard = cards[activeIdx] || cards[0];

      const isTxMatchCard = (t, card) => {
        if (!card || !t) return false;
        if (t.accountId && t.accountId === card.id) return true;
        const targetAcc = (t.account || t.accountName || '').toLowerCase().trim();
        const matchKeywords = (card.accountMatchNames || [card.name, 'กรุงศรี', 'bay', 'ktc', 'ttb']).map(n => n.toLowerCase());
        return matchKeywords.some(kw => targetAcc.includes(kw) || (card.name && targetAcc.includes(card.name.toLowerCase())));
      };

      const currentYear = 2026;
      const currentMonth = 10;
      let selYear = currentYear;
      let selMonth = currentMonth;

      const selCycleMonth = (typeof CreditCardModule !== 'undefined') ? CreditCardModule.selectedCycleMonth : null;
      if (selCycleMonth) {
        const parts = selCycleMonth.split('-');
        selYear = parseInt(parts[0], 10);
        selMonth = parseInt(parts[1], 10);
      }

      const stmtDay = curCard ? curCard.statementDay : 10;
      const dueDay = curCard ? curCard.dueDay : 30;

      let prevMonth = selMonth - 1;
      let prevYear = selYear;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }

      const startCycleDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(stmtDay + 1).padStart(2, '0')}`;
      const endCycleDate = `${selYear}-${String(selMonth).padStart(2, '0')}-${String(stmtDay).padStart(2, '0')}`;
      const dueDate = `${selYear}-${String(selMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

      let totalDebtAllCards = 0;
      let totalLimitAllCards = 0;

      const cardStats = cards.map((c, idx) => {
        const txs = allTx.filter(t => isTxMatchCard(t, c) && t.date >= startCycleDate && t.date <= endCycleDate);
        const usedAmt = txs.reduce((sum, t) => sum + (t.type === 'รายจ่าย' || t.type === 'บิล' || t.type === 'หนี้สิน' ? Number(t.amount || 0) : -Number(t.amount || 0)), 0);
        const netUsed = Math.max(0, usedAmt);
        totalDebtAllCards += netUsed;
        totalLimitAllCards += c.limit;

        return {
          ...c,
          used: netUsed,
          available: Math.max(0, c.limit - netUsed),
          utilPct: c.limit > 0 ? ((netUsed / c.limit) * 100).toFixed(1) : '0.0',
          txs: txs,
          isActive: idx === activeIdx
        };
      });

      const activeStat = cardStats[activeIdx] || cardStats[0];
      const totalAvailAll = Math.max(0, totalLimitAllCards - totalDebtAllCards);
      const totalUtilPct = totalLimitAllCards > 0 ? ((totalDebtAllCards / totalLimitAllCards) * 100).toFixed(1) : '0.0';

      let activeTxs = allTx.filter(t => isTxMatchCard(t, curCard) && t.date >= startCycleDate && t.date <= endCycleDate);

      const cardUsageTotal = activeTxs
        .filter(t => t.type === 'รายจ่าย' || t.type === 'บิล' || t.type === 'หนี้สิน')
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      const creditRefundTotal = activeTxs
        .filter(t => t.type === 'รายรับ' || t.type === 'เงินคืน')
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      const netUsageTotal = Math.max(0, cardUsageTotal - creditRefundTotal);

      activeTxs.sort((a, b) => {
        if (this.sortField === 'amount') {
          const amtA = Number(a.amount || 0);
          const amtB = Number(b.amount || 0);
          return this.sortOrder === 'desc' ? amtB - amtA : amtA - amtB;
        }
        return new Date(b.date) - new Date(a.date);
      });

      const monthOptionsHtml = [-2, -1, 0, 1].map(offset => {
        const d = new Date(currentYear, currentMonth - 1 + offset, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const val = `${y}-${String(m).padStart(2, '0')}`;
        const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const isSel = (val === `${selYear}-${String(selMonth).padStart(2, '0')}`) ? 'selected' : '';
        return `<option value="${val}" ${isSel}>${thMonths[m-1]} ${y}</option>`;
      }).join('');

      const cardBoxesHtml = cardStats.map((c, idx) => `
        <div class="cc-card-item" data-index="${idx}" style="background: ${c.theme}; border-radius: 14px; padding: 20px; color: #fff; box-shadow: ${c.isActive ? '0 8px 18px -2px rgba(0,0,0,0.25), 0 0 0 3px #0284c7' : '0 4px 6px -1px rgba(0,0,0,0.1)'}; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; min-height: 215px; cursor: pointer; transform: ${c.isActive ? 'scale(1.015)' : 'none'}; transition: all 0.2s;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 11px; font-weight: 700; opacity: 0.85; letter-spacing: 0.5px;">${c.bank}</div>
              <div style="font-size: 18px; font-weight: 800; margin-top: 4px;">${c.name}</div>
              <div style="font-size: 11.5px; opacity: 0.85; margin-top: 2px;">${c.benefit}</div>
            </div>
            <div style="font-size: 14px; font-weight: 700; opacity: 0.85; letter-spacing: 2px;">•••• ${c.cardNo}</div>
          </div>

          <div style="margin: 16px 0 10px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <div>
                <div style="font-size: 11px; opacity: 0.85;">ยอดค้างชำระปัจจุบัน</div>
                <div style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">฿${fmt(c.used)}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 11px; opacity: 0.85;">วงเงินบัตร</div>
                <div style="font-size: 14px; font-weight: 700;">฿${fmt(c.limit)}</div>
              </div>
            </div>
            
            <div style="margin-top: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; opacity: 0.85; margin-bottom: 4px;">
                <span>ใช้วงเงินไป: ${c.utilPct}%</span>
                <span>คงเหลือ: ฿${fmt(c.available)}</span>
              </div>
              <div style="height: 5px; background: rgba(255,255,255,0.25); border-radius: 3px; overflow: hidden;">
                <div style="width: ${c.utilPct}%; height: 100%; background: #fff; border-radius: 3px;"></div>
              </div>
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.25); border-radius: 8px; padding: 8px 12px; font-size: 11.5px; display: flex; justify-content: space-between; align-items: center;">
            <div>📅 สรุปยอดรอบบิล: <strong>ทุกวันที่ ${c.statementDay}</strong></div>
            <div>⏰ ครบกำหนดชำระ: <strong>ทุกวันที่ ${c.dueDay}</strong></div>
          </div>

          <button class="btn-edit-cc-card" data-id="${c.id}" style="margin-top: 10px; width: 100%; background: rgba(255,255,255,0.95); color: #0f172a; border: none; padding: 7px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
            ✏️ แก้ไขวงเงินและรอบบิล
          </button>
        </div>
      `).join('');

      const rowsHtml = activeTxs.map(t => {
        const isExpense = t.type === 'รายจ่าย' || t.type === 'หนี้สิน';
        const isBill = t.type === 'บิล';
        const isIncome = t.type === 'รายรับ' || t.type === 'เงินคืน';

        let badgeBg = '#fef2f2';
        let badgeColor = '#dc2626';
        let typeLabel = t.type || 'รายจ่าย';

        if (isIncome) {
          badgeBg = '#ecfdf5';
          badgeColor = '#059669';
        } else if (isBill) {
          badgeBg = '#fef3c7';
          badgeColor = '#d97706';
        }

        const amtSign = isIncome ? `+${fmt(t.amount)}` : `-${fmt(t.amount)}`;
        const amtColor = isIncome ? '#059669' : '#dc2626';

        return `
          <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <td style="padding: 12px 14px; font-size: 13px; color: #334155; white-space: nowrap;">${this.formatDateTh(t.date)}</td>
            <td style="padding: 12px 14px; white-space: nowrap;">
              <span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor}33; font-size: 11.5px; font-weight: 700; padding: 3px 8px; border-radius: 12px; display: inline-block;">
                ${typeLabel}
              </span>
            </td>
            <td style="padding: 12px 14px; font-size: 13px; font-weight: 600; color: #334155; white-space: nowrap;">${t.category || t.categoryDetail || '-'}</td>
            <td style="padding: 12px 14px; font-size: 13.5px; font-weight: 800; color: ${amtColor}; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums;">
              ${amtSign}
            </td>
            <td style="padding: 12px 14px; font-size: 13px; color: #475569; white-space: nowrap;">${t.account || t.accountName || curCard.name}</td>
            <td style="padding: 12px 14px; font-size: 13px; color: #64748b;">${t.desc || t.note || '-'}</td>
            <td style="padding: 12px 14px; font-size: 13px; color: #94a3b8; text-align: center;">-</td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <div class="portfolio-container" style="width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 0 30px 0 !important; text-align: left;">
          
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <div style="background: #fef3c7; color: #d97706; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 22px; flex-shrink: 0;">💳</div>
            <div style="text-align: left;">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">CREDIT CARDS & DEBT MANAGEMENT</div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">รอบบิลบัตรเครดิต & หนี้สิน</h1>
                <span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">${cards.length} ใบ</span>
              </div>
            </div>
          </div>

          ${renderTopTabs()}

          <div class="summary-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; margin-bottom: 24px;">
            <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
              <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🔴 หนี้ค้างชำระรวม (Total Debt)</div>
              <div class="card-value" style="font-size: 22px; font-weight: 900; color: #dc2626;">฿${fmt(totalDebtAllCards)}</div>
              <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">ยอดรูดสะสมที่ต้องชำระรอบนี้</div>
            </div>

            <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
              <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🛡️ วงเงินคงเหลือรวม (Available Credit)</div>
              <div class="card-value" style="font-size: 22px; font-weight: 900; color: #059669;">฿${fmt(totalAvailAll)}</div>
              <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">จากวงเงินรวม ฿${fmt(totalLimitAllCards)}</div>
            </div>

            <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
              <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">📊 อัตราการใช้วงเงิน (Credit Utilization)</div>
              <div class="card-value" style="font-size: 22px; font-weight: 900; color: #0284c7;">${totalUtilPct}%</div>
              <div class="card-subtext" style="font-size: 11px; color: #0284c7; margin-top: 6px;">เกณฑ์แนะนำควรต่ำกว่า 30-40%</div>
            </div>

            <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
              <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">💳 บัตรที่เปิดใช้งาน</div>
              <div class="card-value" style="font-size: 22px; font-weight: 900; color: #0f172a;">${cards.length} ใบ</div>
              <div class="card-subtext" style="font-size: 11px; color: #16a34a; margin-top: 6px;">ชำระเต็มจำนวน ไม่มีดอกเบี้ยสะสม</div>
            </div>
          </div>

          <h3 style="margin: 0 0 14px; font-size: 15px; font-weight: 800; color: #0f172a;">บัตรเครดิต & รอบบิลของคุณ (${cards.length} ใบ):</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 26px;">
            ${cardBoxesHtml}
          </div>

          <div style="background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 22px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 14px;">
              <div>
                <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                  <span>🧾</span> รายการรูดใช้จ่ายบัตรเครดิต (${curCard.name})
                </h3>
                <div style="font-size: 12.5px; color: #64748b; margin-top: 4px;">
                  รอบบิล: <strong>${startCycleDate}</strong> ถึง <strong>${endCycleDate}</strong> | ครบกำหนดชำระ: <strong style="color: #dc2626;">${dueDate}</strong>
                </div>
              </div>

              <div style="display: flex; gap: 10px; align-items: center;">
                <div>
                  <label style="display: block; font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 3px;">บัตรเครดิต</label>
                  <select id="cc-select-card-dropdown" style="padding: 7px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 700; color: #0f172a; background: #fff; cursor: pointer;">
                    ${cards.map((c, i) => `<option value="${i}" ${i === activeIdx ? 'selected' : ''}>${c.name}</option>`).join('')}
                  </select>
                </div>

                <div>
                  <label style="display: block; font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 3px;">รอบบิล</label>
                  <select id="cc-select-month-dropdown" style="padding: 7px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 700; color: #0f172a; background: #fff; cursor: pointer;">
                    ${monthOptionsHtml}
                  </select>
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">
              <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; background: #fafafa;">
                <div style="font-size: 11.5px; font-weight: 600; color: #64748b; margin-bottom: 6px;">ช่วงรอบบิล</div>
                <div style="font-size: 15px; font-weight: 800; color: #0f172a;">${this.formatDateTh(startCycleDate)} - ${this.formatDateTh(endCycleDate)}</div>
              </div>

              <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; background: #fafafa;">
                <div style="font-size: 11.5px; font-weight: 600; color: #64748b; margin-bottom: 6px;">ยอดใช้บัตร</div>
                <div style="font-size: 18px; font-weight: 900; color: #dc2626;">฿${fmt(cardUsageTotal)}</div>
              </div>

              <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; background: #fafafa;">
                <div style="font-size: 11.5px; font-weight: 600; color: #64748b; margin-bottom: 6px;">เครดิตคืนเข้าบัตร</div>
                <div style="font-size: 18px; font-weight: 900; color: #059669;">฿${fmt(creditRefundTotal)}</div>
              </div>

              <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; background: #fafafa;">
                <div style="font-size: 11.5px; font-weight: 600; color: #64748b; margin-bottom: 6px;">ยอดใช้สุทธิ</div>
                <div style="font-size: 18px; font-weight: 900; color: #dc2626;">฿${fmt(netUsageTotal)}</div>
              </div>
            </div>

            <div style="overflow-x: auto; border: 1px solid #f1f5f9; border-radius: 10px;">
              <table class="custom-table" style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px; font-weight: 700; background: #f8fafc;">
                    <th class="th-sortable" data-field="date" style="padding: 12px 14px; white-space: nowrap; cursor: pointer; user-select: none;">
                      วันที่ ${this.sortField === 'date' ? (this.sortOrder === 'desc' ? '🔽' : '🔼') : '↕️'}
                    </th>
                    <th style="padding: 12px 14px; white-space: nowrap;">ประเภท</th>
                    <th style="padding: 12px 14px; white-space: nowrap;">หมวดหมู่ย่อย</th>
                    <th class="th-sortable" data-field="amount" style="padding: 12px 14px; text-align: right; white-space: nowrap; cursor: pointer; user-select: none;">
                      จำนวนเงิน ${this.sortField === 'amount' ? (this.sortOrder === 'desc' ? '🔽' : '🔼') : '↕️'}
                    </th>
                    <th style="padding: 12px 14px; white-space: nowrap;">บัญชี</th>
                    <th style="padding: 12px 14px;">รายละเอียด</th>
                    <th style="padding: 12px 14px; text-align: center; white-space: nowrap;">บัญชีปลายทาง</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 36px; color: #94a3b8; font-size: 13.5px;">ไม่มีรายการใช้จ่ายในรอบบิลนี้</td></tr>'}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      `;
      return;
    }

    // ----------------------------------------------------
    // โหมด 2: สัญญาผ่อนชำระ & หนี้สิน
    // ----------------------------------------------------
    const debts = this.getDebts();
    const activeDebts = debts.filter(d => !d.isClosed);
    const totalRemainingDebt = activeDebts.reduce((sum, d) => sum + Math.max(0, d.totalDebt - d.paidAmount), 0);
    const totalMonthlyBurden = activeDebts.reduce((sum, d) => sum + d.monthlyPayment, 0);
    const closedCount = debts.filter(d => d.isClosed).length;

    const rowsHtml = debts.map(d => {
      const remaining = Math.max(0, d.totalDebt - d.paidAmount);
      const pct = d.totalMonths > 0 ? Math.min(100, Math.round((d.paidMonths / d.totalMonths) * 100)) : 0;
      const isComplete = d.isClosed || d.paidMonths >= d.totalMonths || remaining <= 0;

      let endCellHtml = '';
      if (isComplete) {
        endCellHtml = `
          <div style="display: inline-flex; flex-direction: column; align-items: center; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 3px 8px; border-radius: 16px;">
            <span style="color: #059669; font-size: 11px; font-weight: 800; line-height: 1.2;">ปิดหนี้แล้ว</span>
            <span style="color: #047857; font-size: 10.5px; font-weight: 600; line-height: 1.2;">${this.formatDateTh(d.closedDate || d.endDate)}</span>
          </div>
        `;
      } else {
        endCellHtml = `<span style="font-weight: 700; color: #0f172a; font-size: 12.5px;">${this.formatDateTh(d.endDate)}</span>`;
      }

      const barColor = isComplete ? '#10b981' : '#f97316';
      const dotColor = isComplete ? '#10b981' : '#ea580c';

      return `
        <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
          <td style="padding: 12px 14px; font-weight: 800; color: #0f172a; font-size: 13.5px; white-space: nowrap;">
            ${d.name}
          </td>
          <td style="padding: 12px 14px; text-align: right; font-weight: 800; color: #0f172a; font-size: 13.5px; white-space: nowrap; font-variant-numeric: tabular-nums;">
            ${fmt(d.totalDebt)}
          </td>
          <td style="padding: 12px 14px; text-align: right; font-weight: 800; color: #0f172a; font-size: 13px; white-space: nowrap; font-variant-numeric: tabular-nums;">
            ${fmt(d.monthlyPayment)}
          </td>
          <td style="padding: 12px 14px; text-align: center; color: #475569; font-size: 12px; font-weight: 600; white-space: nowrap;">
            ${this.formatDateTh(d.startDate)}
          </td>
          <td style="padding: 12px 14px; text-align: center; white-space: nowrap;">
            ${endCellHtml}
          </td>
          <td style="padding: 12px 14px; text-align: right; font-weight: 800; color: #059669; font-size: 13px; white-space: nowrap; font-variant-numeric: tabular-nums;">
            ${fmt(d.paidAmount)}
          </td>
          <td style="padding: 12px 14px; text-align: right; font-weight: 800; color: ${remaining > 0 ? '#dc2626' : '#64748b'}; font-size: 13.5px; white-space: nowrap; font-variant-numeric: tabular-nums;">
            ${fmt(remaining)}
          </td>
          <td style="padding: 12px 14px; text-align: center; font-weight: 800; color: #0f172a; font-size: 12.5px; white-space: nowrap;">
            ${String(d.paidMonths).padStart(2, '0')}/${String(d.totalMonths).padStart(2, '0')}
          </td>
          <td style="padding: 12px 14px; width: 100px; vertical-align: middle;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: ${dotColor}; flex-shrink: 0;"></span>
              <div style="flex: 1; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; width: 60px;">
                <div style="width: ${pct}%; height: 100%; background: ${barColor}; border-radius: 3px;"></div>
              </div>
            </div>
          </td>
          <td style="padding: 12px 14px; text-align: center; white-space: nowrap;">
            <button class="btn-manage-debt" data-id="${d.id}" style="background: #1e293b; color: #fff; border: none; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
              <span>⚙️️</span> จัดการ
            </button>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="portfolio-container" style="width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 0 30px 0 !important; text-align: left;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 14px; width: 100%;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: #fdf2f8; color: #be185d; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 22px; flex-shrink: 0;">🏷️</div>
            <div style="text-align: left;">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">DEBT & INSTALLMENT TRACKER</div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">ภาระหนี้สิน & สัญญาผ่อนชำระ</h1>
                <span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">${debts.length} สัญญา</span>
              </div>
            </div>
          </div>

          <div>
            <button id="btn-open-add-debt" style="background: #0284c7; color: #fff; border: none; font-weight: 700; padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
              <span>➕</span> เพิ่มสัญญาผ่อนใหม่
            </button>
          </div>
        </div>

        ${renderTopTabs()}

        <div class="summary-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; margin-bottom: 22px;">
          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🔴 หนี้สินคงค้างทั้งหมด (Remaining Debt)</div>
            <div class="card-value" style="font-size: 22px; font-weight: 900; color: #dc2626;">฿${fmt(totalRemainingDebt)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">ยอดหนี้ที่ต้องชำระจนจบสัญญา</div>
          </div>

          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">⚡ ภาระผ่อนต่องวดปัจจุบัน (Monthly Burden)</div>
            <div class="card-value" style="font-size: 22px; font-weight: 900; color: #0284c7;">฿${fmt(totalMonthlyBurden)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #0284c7; margin-top: 6px;">ยอดที่ต้องจ่ายในแต่ละเดือน</div>
          </div>

          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🎉 ปิดหนี้สำเร็จแล้ว (Closed Contracts)</div>
            <div class="card-value" style="font-size: 22px; font-weight: 900; color: #059669;">${closedCount} รายการ</div>
            <div class="card-subtext" style="font-size: 11px; color: #16a34a; margin-top: 6px;">ผ่อนหมดครบงวดเรียบร้อย</div>
          </div>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); overflow: hidden;">
          <div style="overflow-x: auto; width: 100%;">
            <table class="custom-table" style="width: 100%; min-width: 900px; border-collapse: collapse; font-size: 13px; text-align: left;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px; font-weight: 800;">
                  <th style="padding: 12px 14px; white-space: nowrap;">รายการ</th>
                  <th style="padding: 12px 14px; text-align: right; white-space: nowrap;">ยอดหนี้</th>
                  <th style="padding: 12px 14px; text-align: right; white-space: nowrap;">ผ่อน/เดือน</th>
                  <th style="padding: 12px 14px; text-align: center; white-space: nowrap;">วันที่เริ่ม</th>
                  <th style="padding: 12px 14px; text-align: center; white-space: nowrap;">วันที่ครบ</th>
                  <th style="padding: 12px 14px; text-align: right; white-space: nowrap;">จ่ายแล้ว</th>
                  <th style="padding: 12px 14px; text-align: right; white-space: nowrap;">คงเหลือ</th>
                  <th style="padding: 12px 14px; text-align: center; white-space: nowrap;">เดือน</th>
                  <th style="padding: 12px 14px; text-align: center; white-space: nowrap;">ความคืบหน้า</th>
                  <th style="padding: 12px 14px; text-align: center; white-space: nowrap;">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 30px; color: #94a3b8;">ยังไม่มีรายการหนี้สินหรือสัญญาผ่อนชำระ</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DebtModule.init());
} else {
  DebtModule.init();
}