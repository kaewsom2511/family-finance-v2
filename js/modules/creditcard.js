/**
 * js/modules/creditcard.js
 * Credit Card Module for Family Finance
 */

const CreditCardModule = {
  activeCardIndex: 0,
  selectedCycleMonth: null,
  sortField: 'date',
  sortOrder: 'desc',

  defaultCardConfigs: [
    {
      id: 'account-2042e4f8-0d8f-47f5-bf37-18c31d2d4d0f',
      name: 'Krungsri Credit Card',
      accountMatchNames: ['บัตรเครดิตกรุงศรี', 'Krungsri Credit Card', 'กรุงศรี', 'BAY'],
      bank: 'BAY CREDIT CARD',
      cardNo: '1034',
      theme: 'linear-gradient(135deg, #c25e00 0%, #8a3b00 100%)',
      limit: 175000,
      statementDay: 10,
      dueDay: 30,
      benefit: 'เงินคืน 5% ช้อปปิ้ง & ไลฟ์สไตล์',
      isDefault: true
    },
    {
      id: 'account-65346f87-2bf4-460d-8d52-a41300340b97',
      name: 'KTC Platinum Visa',
      accountMatchNames: ['บัตรเครดิต KTC', 'KTC Platinum Visa', 'KTC'],
      bank: 'KTC CREDIT CARD',
      cardNo: '4589',
      theme: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      limit: 75000,
      statementDay: 7,
      dueDay: 22,
      benefit: 'ใช้สะสมแต้ม KTC Forever & สิทธิพิเศษ',
      isDefault: false
    },
    {
      id: 'account-03d9294c-a001-47f8-bdda-c7a485e90431',
      name: 'ttb so smart',
      accountMatchNames: ['บัตรเครดิต ttb', 'ttb so smart', 'ttb'],
      bank: 'TTB CREDIT CARD',
      cardNo: '8821',
      theme: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)',
      limit: 422000,
      statementDay: 2,
      dueDay: 10,
      benefit: 'คืนเงิน 1% เข้าบัญชีเงินฝาก ME Save',
      isDefault: false
    }
  ],

  init() {
    this.bindEvents();
  },

  getState() {
    try {
      const raw = localStorage.getItem('family-finance:cashflow:v2') || localStorage.getItem('family-finance:cashflow:v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { transactions: [], accounts: [] };
  },

  getCardConfigs() {
    try {
      const raw = localStorage.getItem('family-finance:card-limits');
      if (raw) {
        const saved = JSON.parse(raw);
        return this.defaultCardConfigs.map(c => ({
          ...c,
          limit: saved[c.id]?.limit !== undefined ? saved[c.id].limit : c.limit,
          statementDay: saved[c.id]?.statementDay !== undefined ? saved[c.id].statementDay : c.statementDay,
          dueDay: saved[c.id]?.dueDay !== undefined ? saved[c.id].dueDay : c.dueDay
        }));
      }
    } catch (e) {}
    return this.defaultCardConfigs;
  },

  saveCardConfig(cardId, limit, statementDay, dueDay) {
    try {
      const raw = localStorage.getItem('family-finance:card-limits');
      let saved = raw ? JSON.parse(raw) : {};
      saved[cardId] = { limit, statementDay, dueDay };
      localStorage.setItem('family-finance:card-limits', JSON.stringify(saved));
    } catch (e) {}
  },

  formatBaht(num) {
    return Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatDateTh(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  },

  bindEvents() {
    document.addEventListener('click', (e) => {
      // สลับไปหน้าสัญญาผ่อน
      const mainTabBtn = e.target.closest('.debt-main-tab');
      if (mainTabBtn) {
        const view = mainTabBtn.dataset.view;
        if (typeof DebtModule !== 'undefined') {
          DebtModule.activeViewTab = view;
          DebtModule.render();
        }
        return;
      }

      // ปุ่มแก้ไขข้อมูลบัตร
      const editBtn = e.target.closest('.btn-edit-cc-card');
      if (editBtn) {
        const cardId = editBtn.dataset.id;
        this.openEditModal(cardId);
        return;
      }

      // คลิกเลือกบัตรเครดิต
      const cardBox = e.target.closest('.cc-card-item');
      if (cardBox && !e.target.closest('.btn-edit-cc-card')) {
        const idx = parseInt(cardBox.dataset.index, 10);
        this.activeCardIndex = idx;
        if (typeof DebtModule !== 'undefined') {
          DebtModule.render();
        } else {
          this.render();
        }
        return;
      }

      // คลิกหัวตารางเพื่อเรียงลำดับ
      const thSort = e.target.closest('.th-sortable');
      if (thSort) {
        const field = thSort.dataset.field;
        if (this.sortField === field) {
          this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
        } else {
          this.sortField = field;
          this.sortOrder = 'desc';
        }
        if (typeof DebtModule !== 'undefined') {
          DebtModule.sortField = this.sortField;
          DebtModule.sortOrder = this.sortOrder;
          DebtModule.render();
        } else {
          this.render();
        }
        return;
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'cc-select-card-dropdown') {
        this.activeCardIndex = parseInt(e.target.value, 10) || 0;
        if (typeof DebtModule !== 'undefined') DebtModule.render(); else this.render();
      }
      if (e.target && e.target.id === 'cc-select-month-dropdown') {
        this.selectedCycleMonth = e.target.value;
        if (typeof DebtModule !== 'undefined') DebtModule.render(); else this.render();
      }
    });
  },

  openEditModal(cardId) {
    const cards = this.getCardConfigs();
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    let modal = document.getElementById('modal-edit-card-config');
    if (modal) modal.remove();

    const html = `
      <div id="modal-edit-card-config" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999999;">
        <div style="background: #fff; border-radius: 12px; width: 420px; max-width: 90vw; padding: 22px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.25); text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">⚙️ แก้ไขข้อมูลบัตร: ${card.name}</h3>
            <button id="btn-close-cc-modal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">วงเงินบัตร (บาท)</label>
              <input type="number" id="input-edit-limit" value="${card.limit}" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; font-weight: 800;">
            </div>
            <div style="display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">วันตัดรอบบิล (Statement)</label>
                <input type="number" id="input-edit-statement" value="${card.statementDay}" min="1" max="31" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700;">
              </div>
              <div style="flex: 1;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">วันครบชำระ (Due Date)</label>
                <input type="number" id="input-edit-due" value="${card.dueDay}" min="1" max="31" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700;">
              </div>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
              <button id="btn-cancel-cc-modal" style="background: #fff; border: 1px solid #cbd5e1; padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">ยกเลิก</button>
              <button id="btn-save-cc-modal" style="background: #0284c7; color: #fff; border: none; padding: 7px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer;">บันทึก</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    const closeModal = () => document.getElementById('modal-edit-card-config')?.remove();
    document.getElementById('btn-close-cc-modal').onclick = closeModal;
    document.getElementById('btn-cancel-cc-modal').onclick = closeModal;

    document.getElementById('btn-save-cc-modal').onclick = () => {
      const newLimit = parseFloat(document.getElementById('input-edit-limit').value) || 0;
      const newStmt = parseInt(document.getElementById('input-edit-statement').value, 10) || 1;
      const newDue = parseInt(document.getElementById('input-edit-due').value, 10) || 1;

      this.saveCardConfig(cardId, newLimit, newStmt, newDue);
      closeModal();
      if (typeof DebtModule !== 'undefined') DebtModule.render(); else this.render();
    };
  },

  render(targetContainer = null) {
    if (typeof DebtModule !== 'undefined') {
      DebtModule.activeViewTab = 'cards';
      DebtModule.render(targetContainer);
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CreditCardModule.init());
} else {
  CreditCardModule.init();
}