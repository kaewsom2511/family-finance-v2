/**
 * js/modules/cashflow.js
 * Cash Flow & Expense Tracker Module
 * - สลับมุมมอง Dashboard (ปันผล), รายรับรายจ่าย, สรุปรายปี และ บัญชีเงินฝาก
 * - ดึงหมวดหมู่และบัญชีจากระบบตั้งค่า (SettingsModule) อัตโนมัติ
 * - รองรับประเภท: รายจ่าย, รายรับ, บิล, เงินออมและลงทุน, หนี้สิน, โอนระหว่างบัญชี
 * - แยกคอลัมน์ "บัญชี" และ "รายละเอียด" ครบถ้วน
 * - มีระบบ ✏️ แก้ไข และ 🗑️ ลบ
 */

var CashFlowModule = {
  storageKey: 'family-finance:cashflow:v2',
  fallbackKey: 'family-finance:cashflow:v1',
  currentView: 'daily', // 'daily', 'dividend', 'annual', 'banking'
  currentPeriodType: 'monthly', // 'monthly' หรือ 'payroll'
  selectedMonth: '2026-10', // null = ดูทั้งหมด
  selectedYear: 2026,
  filterType: 'ทั้งหมด',
  searchQuery: '',
  dateFrom: '',
  dateTo: '',
  sortOrder: 'desc', // 'desc' = ล่าสุดขึ้นก่อน (ค่าเริ่มต้น), 'asc' = เก่าสุดขึ้นก่อน
  // หมวดหมู่สำรอง กรณีใน Settings ยังไม่ได้ตั้งค่า
  fallbackCategories: {
    'รายรับ': [
      'เงินเดือน', 'โบนัส', 'ค่าคอมมิชชั่น', 'เงินปันผล', 
      'ค่าบ้านเช่า', 'ดอกเบี้ย', 'เงินคืน NT', 'เงินกู้/ยืม', 
      'รายได้อื่นๆ', 'ค่าบ้านเช่า 16', 'ค่าบ้านเช่า 18'
    ],
    'รายจ่าย': [
      'ค่าอาหาร', 'ให้/พ่อ/แม่/ลูก', 'ค่าเดินทาง', 'ของใช้ในบ้าน/ส่วนตัว', 
      'ทำบุญ/ใส่ซอง/ของขวัญ', 'ค่ารักษาพยาบาล', 'ค่าทางด่วน', 'ล้างรถ', 
      'หนังสือ', 'ภาษี', 'ค่าฌาปนกิจ', 'ความบันเทิง(ช็อปปิ้ง,ท่องเที่ยว)', 
      'ค่าน้ำมัน', 'รายจ่ายอื่นๆ'
    ],
    'บิล': [
      'เบี้ยประกัน (รถยนต์,ชีวิต)', 'ค่าน้ำ', 'ค่าไฟ', 'ค่าอินเทอร์เน็ต', 
      'ค่าโทรศัพท์', 'ค่าส่วนกลาง', 'จ่ายบัตรเครดิต', 'จ่ายสินเชื่อ', 
      'สมัครสมาชิก', 'GEMINI'
    ],
    'หนี้สิน': [
      'ผ่อนคอนโด', 'ผ่อนประกันรถ', 'ผ่อนตู้เย็น', 'ผ่อนกล้อง', 
      'ผ่อนเช็คระยะรถ', 'ประกันชีวิต', 'เช็คระยะรถ'
    ],
    'เงินออมและลงทุน': [
      'ออมทรัพย์ สอท', 'INOVESTX RMF', 'INOVESTX ROBO', 'K+', 
      'กองทุนสำรองเลี้ยงชีพ', 'Finnomina', 'ทุนเรือนหุ้น สอท', 
      'SCB Click', 'DIME PLOY', 'DIME DAD', 'หุ้นไทย BLS', 'BLS'
    ],
    'โอนระหว่างบัญชี': [
      'โอนเงิน', 'โอนย้ายสภาพคล่อง', 'เติมเงินเป๋าตัง', 'จ่ายบัตรเครดิต'
    ]
  },

  init() {
    this.bindEvents();
    this.bindSidebarNav();
    this.checkRouteFromHash();

    window.addEventListener('hashchange', () => {
      this.checkRouteFromHash();
      this.render();
    });

    this.render();
  },

  checkRouteFromHash() {
    const hash = (window.location.hash || '').toLowerCase();

    // ถ้าคลิก Dashboard ให้ส่งกลับไป index.html ทันที
    if (hash.includes('dashboard')) {
      window.location.href = 'index.html';
      return;
    }

    if (hash.includes('credit-card')) {
      this.currentView = 'credit-cards';
    } else if (hash.includes('debt')) {
      this.currentView = 'debts';
    } else if (hash.includes('banking')) {
      this.currentView = 'banking';
    } else if (hash.includes('annual')) {
      this.currentView = 'annual';
    } else if (hash.includes('dividend')) {
      this.currentView = 'dividend';
    } else {
      this.currentView = 'daily';
    }

    // ✅ เพิ่มบรรทัดนี้ เพื่อให้เวลากระโดดข้ามมาจากหน้าอื่น สั่งวาดหน้าจอใหม่ทันที
    this.render();
  },

  // 1. คำนวณวันเงินเดือนออก (วันที่ 26 ถ้าตรงเสาร์/อาทิตย์ เลื่อนขึ้นมาวันศุกร์)
  getPayDate(year, month) {
    const d = new Date(year, month - 1, 26);
    const day = d.getDay(); // 0 = อาทิตย์, 6 = เสาร์
    if (day === 6) {
      d.setDate(25); // เสาร์ -> เลื่อนเป็นศุกร์ที่ 25
    } else if (day === 0) {
      d.setDate(24); // อาทิตย์ -> เลื่อนเป็นศุกร์ที่ 24
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  // 2. คำนวณช่วงวันที่ของรอบเงินเดือน (เริ่มจากวันเงินเดือนออกของเดือนก่อน ถึง ก่อนวันเงินเดือนออกเดือนนี้ 1 วัน)
  getPayrollRange(yearMonthStr) {
    const ym = yearMonthStr || this.selectedMonth || '2026-10';
    const parts = ym.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);

    // เดือนก่อนหน้า
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;

    const startDate = this.getPayDate(prevYear, prevMonth);

    // จบก่อนวันเงินเดือนออกของเดือนปัจจุบัน 1 วัน
    const curPayDateStr = this.getPayDate(year, month);
    const curD = new Date(curPayDateStr);
    curD.setDate(curD.getDate() - 1);
    const endY = curD.getFullYear();
    const endM = String(curD.getMonth() + 1).padStart(2, '0');
    const endD = String(curD.getDate()).padStart(2, '0');
    const endDate = `${endY}-${endM}-${endD}`;

    return { startDate, endDate };
  },
  setPeriodType(type) {
    this.currentPeriodType = type;
    this.render();
  },

  onMonthChange(val) {
    this.selectedMonth = val;
    this.render();
  },
    onMonthChange(val) {  
    this.selectedMonth = val;
    this.render();
  },
  bindSidebarNav() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('#nav-dashboard, #nav-daily, #nav-annual, #nav-banking, .sidebar-link, .sidebar a');
      if (!link) return;

      const id = link.id || '';
      const txt = (link.textContent || '').trim();

      if (id === 'nav-dashboard' || id === 'menu-dashboard' || txt.toLowerCase().includes('dashboard')) {
  e.preventDefault();
  window.location.href = 'index.html';
  return;
    } else if (id === 'nav-daily' || id === 'menu-daily' || txt.includes('รายรับรายจ่าย')) {
      e.preventDefault();
      window.location.hash = '#cashflow/daily';
      this.currentView = 'daily';
      this.render();
    } else if (id === 'nav-annual' || txt.includes('สรุปรายเดือน')) {
      e.preventDefault();
      window.location.hash = '#cashflow/annual';
      this.currentView = 'annual';
      this.render();
    } else if (id === 'nav-banking' || txt.includes('บัญชีเงินฝาก')) {
      e.preventDefault();
      window.location.hash = '#cashflow/banking';
      this.currentView = 'banking';
      this.render();
    } else if (id.includes('credit-card') || txt.includes('รอบบิลบัตรเครดิต')) {
      // ✅ เพิ่มบล็อกรอบบิลบัตรเครดิต
      e.preventDefault();
      window.location.hash = '#credit-cards';
      this.currentView = 'credit-cards';
      this.render();
    } else if (id.includes('debt') || txt.includes('หนี้สิน')) {
      // ✅ เพิ่มบล็อกหนี้สิน
      e.preventDefault();
      window.location.hash = '#debts';
      this.currentView = 'debts';
      this.render();
    }
    });
  },

  highlightActiveSidebar() {
    document.querySelectorAll('.sidebar-link, .sidebar a').forEach(el => {
      const txt = (el.textContent || '').trim();
      el.style.background = 'transparent';
      el.style.color = '#334155';
      el.style.fontWeight = '600';

      if (this.currentView === 'dividend' && txt.includes('Dashboard')) {
        el.style.background = '#e0f2fe';
        el.style.color = '#0284c7';
        el.style.fontWeight = '700';
      } else if (this.currentView === 'daily' && txt.includes('รายรับรายจ่าย')) {
        el.style.background = '#e0f2fe';
        el.style.color = '#0284c7';
        el.style.fontWeight = '700';
      } else if (this.currentView === 'annual' && txt.includes('สรุปรายเดือน รายปี')) {
        el.style.background = '#e0f2fe';
        el.style.color = '#0284c7';
        el.style.fontWeight = '700';
      } else if (this.currentView === 'banking' && txt.includes('บัญชีเงินฝาก')) {
        el.style.background = '#e0f2fe';
        el.style.color = '#0284c7';
        el.style.fontWeight = '700';
      }
    });
  },

  getState() {
    try {
      const raw = localStorage.getItem(this.storageKey) || localStorage.getItem(this.fallbackKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { transactions: [], accounts: [] };
  },

  saveState(state) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (e) {}
  },

  getSystemCategories() {
    try {
      const raw = localStorage.getItem('family-finance:categories:v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    if (typeof SettingsModule !== 'undefined' && SettingsModule.defaultCategories) {
      return SettingsModule.defaultCategories;
    }
    return this.fallbackCategories;
  },

  getAllAccountNames() {
    try {
      const raw = localStorage.getItem('family-finance:accounts:v1');
      if (raw) {
        const accs = JSON.parse(raw);
        if (Array.isArray(accs) && accs.length > 0) {
          const names = accs.map(a => a.name);
          if (!names.includes('Truemoney')) names.push('Truemoney');
          return names;
        }
      }
    } catch (e) {}
    return [
      'เงินสด', 'กรุงเทพ', 'กรุงไทย', 'ทหารไทย', 'ไทยพาณิชย์', 'ธกส.', 
      'กสิกรไทย', 'เป๋าตัง', 'Truemoney', 'Dime! Save (3%)', 'K-eSavings', 'SCB ออมทรัพย์', 
      'ออมทรัพย์ สอท', 'ทุนเรือนหุ้น สอท', 'กองทุนสำรองเลี้ยงชีพ', 
      'พอร์ต BLS', 'Finnomena', 'บัตรเครดิตกรุงศรี', 'บัตรเครดิตกรุงไทย', 'บัตรเครดิตทีทีบี'
    ];
  },

  bindEvents() {
    document.addEventListener('click', (e) => {
      const viewSwitchBtn = e.target.closest('.btn-switch-cashflow-view');
      if (viewSwitchBtn) {
        this.currentView = viewSwitchBtn.dataset.view;
        this.render();
        return;
      }
      // สลับการเรียงลำดับวันที่ (ล่าสุด <-> เก่าสุด)
      const sortDateBtn = e.target.closest('#th-sort-date');
      if (sortDateBtn) {
        this.sortOrder = (this.sortOrder === 'asc') ? 'desc' : 'asc';
        this.render();
        return;
      }

      const periodBtn = e.target.closest('.btn-toggle-period');
      if (periodBtn) {
        this.currentPeriodType = periodBtn.dataset.period;
        this.render();
        return;
      }

      const tabBtn = e.target.closest('.tx-type-tab');
      if (tabBtn) {
        this.filterType = tabBtn.dataset.type;
        this.render();
        return;
      }

      const thisMonthBtn = e.target.closest('#btn-filter-this-month');
      if (thisMonthBtn) {
        const now = new Date();
        this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        this.dateFrom = '';
        this.dateTo = '';
        this.searchQuery = '';
        this.render();
        return;
      }

      const allTimeBtn = e.target.closest('#btn-filter-all-time');
      if (allTimeBtn) {
        this.selectedMonth = null;
        this.dateFrom = '';
        this.dateTo = '';
        this.searchQuery = '';
        this.render();
        return;
      }

      const addBtn = e.target.closest('#btn-open-add-tx');
      if (addBtn) {
        this.openTransactionModal();
        return;
      }

      const editBtn = e.target.closest('.btn-edit-tx');
      if (editBtn) {
        this.openTransactionModal(editBtn.dataset.id);
        return;
      }

      const delBtn = e.target.closest('.btn-delete-tx');
      if (delBtn) {
        const id = delBtn.dataset.id;
        if (confirm('ยืนยันลบรายการธุรกรรมนี้?')) {
          const state = this.getState();
          state.transactions = (state.transactions || []).filter(t => t.id !== id);
          this.saveState(state);
          this.render();
        }
        return;
      }
      // ดักจับการคลิกปุ่มแก้ไขยอดเงินเริ่มต้นของบัญชี
      const editBankBtn = e.target.closest('.btn-edit-bank-balance');
      if (editBankBtn) {
        const accName = editBankBtn.dataset.name;
        this.openEditBankBalanceModal(accName);
        return;
      }
      const prevYearBtn = e.target.closest('#btn-prev-year');
      if (prevYearBtn) {
        this.selectedYear -= 1;
        this.render();
        return;
      }
      const nextYearBtn = e.target.closest('#btn-next-year');
      if (nextYearBtn) {
        this.selectedYear += 1;
        this.render();
        return;
      }
    });

    document.addEventListener('input', (e) => {
      if (e.target && e.target.id === 'tx-search-input') {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderTableOnly();
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'tx-month-picker') {
        this.selectedMonth = e.target.value || null;
        this.render();
      } else if (e.target && e.target.id === 'tx-date-from') {
        this.dateFrom = e.target.value;
        this.renderTableOnly();
      } else if (e.target && e.target.id === 'tx-date-to') {
        this.dateTo = e.target.value;
        this.renderTableOnly();
      }

      if (e.target && e.target.id === 'modal-tx-type') {
        const selectedType = e.target.value;
        const isTransfer = selectedType === 'โอนระหว่างบัญชี' || selectedType === 'โอนเงิน';

        const singleBox = document.getElementById('box-single-account');
        const transferBox = document.getElementById('box-transfer-account');
        if (singleBox && transferBox) {
          singleBox.style.display = isTransfer ? 'none' : 'block';
          transferBox.style.display = isTransfer ? 'flex' : 'none';
        }

        const catSelect = document.getElementById('modal-tx-category');
        if (catSelect) {
          const allCats = this.getSystemCategories();
          const opts = allCats[selectedType] || allCats['รายจ่าย'] || [];
          catSelect.innerHTML = opts.map(c => `<option value="${c}">${c}</option>`).join('');
        }
      }
    });
  },

  getItemDetail(t) {
    return (t.detail || t.desc || t.note || t.memo || t.description || '').trim();
  },

  getItemAccount(t) {
    if (t.type === 'โอนระหว่างบัญชี' || t.type === 'โอนเงิน') {
      const fromAcc = t.fromAccount || t.accountName || t.accountId || '';
      const toAcc = t.toAccount || '';
      return toAcc ? `${fromAcc} ➔ ${toAcc}` : fromAcc;
    }
    return (t.accountName || t.accountId || t.bank || t.account || '').trim();
  },

  getFilteredTransactions(allTx) {
    let list = allTx || [];

    if (!this.dateFrom && !this.dateTo && this.selectedMonth) {
      const parts = this.selectedMonth.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);

      if (this.currentPeriodType === 'monthly') {
        const prefix = `${y}-${String(m).padStart(2, '0')}`;
        list = list.filter(t => (t.date || '').startsWith(prefix));
      } else {
        const range = this.getPayrollRange(this.selectedMonth);
        list = list.filter(t => (t.date || '') >= range.startDate && (t.date || '') <= range.endDate);
      }
    }

    if (this.dateFrom) list = list.filter(t => (t.date || '') >= this.dateFrom);
    if (this.dateTo) list = list.filter(t => (t.date || '') <= this.dateTo);

    if (this.filterType && this.filterType !== 'ทั้งหมด') {
      list = list.filter(t => {
        if (this.filterType === 'รายจ่าย') return t.type === 'รายจ่าย' || t.type === 'บิล';
        if (this.filterType === 'รายรับ') return t.type === 'รายรับ';
        if (this.filterType === 'ลงทุน') return t.type === 'ลงทุน' || t.type === 'เงินออมและลงทุน' || t.type === 'เงินออม';
        if (this.filterType === 'หนี้สิน') return t.type === 'หนี้สิน';
        if (this.filterType === 'โอนระหว่างบัญชี') return t.type === 'โอนระหว่างบัญชี' || t.type === 'โอนเงิน';
        return true;
      });
    }

    if (this.searchQuery) {
      const q = this.searchQuery;
      list = list.filter(t => {
        const detail = this.getItemDetail(t).toLowerCase();
        const cat = (t.category || t.subCategory || '').toLowerCase();
        const acc = this.getItemAccount(t).toLowerCase();
        return detail.includes(q) || cat.includes(q) || acc.includes(q);
      });
    }

    return list;
  },

  openTransactionModal(txId = null) {
    let existing = document.getElementById('modal-add-transaction');
    if (existing) existing.remove();

    const state = this.getState();
    const isEdit = !!txId;
    const tx = isEdit ? state.transactions.find(t => t.id === txId) : {
      type: 'รายจ่าย',
      date: new Date().toISOString().slice(0, 10),
      category: 'ค่าอาหาร',
      detail: '',
      amount: '',
      accountName: 'กรุงไทย',
      fromAccount: 'กรุงไทย',
      toAccount: 'เงินสด'
    };

    if (!tx) return;

    let currentTypeKey = tx.type || 'รายจ่าย';
    if (currentTypeKey === 'เงินออม' || currentTypeKey === 'ลงทุน') currentTypeKey = 'เงินออมและลงทุน';
    if (currentTypeKey === 'โอนเงิน') currentTypeKey = 'โอนระหว่างบัญชี';

    const allCategories = this.getSystemCategories();
    const catList = allCategories[currentTypeKey] || allCategories['รายจ่าย'] || [];
    const catOptionsHtml = catList.map(c => `
      <option value="${c}" ${tx.category === c ? 'selected' : ''}>${c}</option>
    `).join('');

    const allAccounts = this.getAllAccountNames();
    const currentAcc = tx.accountName || tx.accountId || 'กรุงไทย';
    const fromAcc = tx.fromAccount || currentAcc;
    const toAcc = tx.toAccount || 'เงินสด';

    const renderAccOpts = (selected) => allAccounts.map(a => `
      <option value="${a}" ${selected === a ? 'selected' : ''}>${a}</option>
    `).join('');

    const isTransfer = currentTypeKey === 'โอนระหว่างบัญชี';

    const modalHtml = `
      <div id="modal-add-transaction" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999999;">
        <div style="background: #fff; border-radius: 14px; width: 440px; max-width: 95vw; padding: 22px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); text-align: left;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">
              ${isEdit ? '✏️ แก้ไขรายการธุรกรรม' : '➕ เพิ่มรายการธุรกรรม'}
            </h3>
            <button id="btn-close-tx-modal" style="background: none; border: none; font-size: 22px; color: #94a3b8; cursor: pointer;">&times;</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">วันที่</label>
                <input type="date" id="modal-tx-date" value="${tx.date}" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
              </div>
              <div style="flex: 1;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">ประเภท</label>
                <select id="modal-tx-type" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700;">
                  <option value="รายรับ" ${currentTypeKey === 'รายรับ' ? 'selected' : ''}>🟢 รายรับ</option>
                  <option value="รายจ่าย" ${currentTypeKey === 'รายจ่าย' ? 'selected' : ''}>🔴 รายจ่าย</option>
                  <option value="บิล" ${currentTypeKey === 'บิล' ? 'selected' : ''}>🧾 บิล</option>
                  <option value="เงินออมและลงทุน" ${currentTypeKey === 'เงินออมและลงทุน' ? 'selected' : ''}>🚀 เงินออมและลงทุน</option>
                  <option value="หนี้สิน" ${currentTypeKey === 'หนี้สิน' ? 'selected' : ''}>🏷️ หนี้สิน</option>
                  <option value="โอนระหว่างบัญชี" ${isTransfer ? 'selected' : ''}>🔄 โอนระหว่างบัญชี</option>
                </select>
              </div>
            </div>

            <div style="display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">หมวดหมู่ย่อย</label>
                <select id="modal-tx-category" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700; background: #fff;">
                  ${catOptionsHtml}
                </select>
              </div>
              <div style="flex: 1;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">จำนวนเงิน</label>
                <input type="number" id="modal-tx-amount" step="any" value="${tx.amount}" placeholder="0.00" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1.5px solid #0284c7; border-radius: 6px; font-size: 14px; font-weight: 800;">
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">รายละเอียด</label>
              <input type="text" id="modal-tx-desc" value="${this.getItemDetail(tx)}" placeholder="รายละเอียดเพิ่มเติม..." style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px;">
            </div>

            <div id="box-single-account" style="display: ${isTransfer ? 'none' : 'block'};">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">บัญชี</label>
                <select id="modal-tx-account" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                  ${renderAccOpts(currentAcc)}
                </select>
              </div>
            </div>

            <div id="box-transfer-account" style="display: ${isTransfer ? 'flex' : 'none'}; flex-direction: column; gap: 10px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                  <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">บัญชีต้นทาง</label>
                  <select id="modal-tx-from-account" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                    ${renderAccOpts(fromAcc)}
                  </select>
                </div>
                <div style="flex: 1;">
                  <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">บัญชีปลายทาง</label>
                  <select id="modal-tx-to-account" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                    ${renderAccOpts(toAcc)}
                  </select>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
              <button id="btn-cancel-modal-tx" style="background: #fff; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">ยกเลิก</button>
              <button id="btn-save-modal-tx" style="background: #0284c7; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer;">
                ${isEdit ? '💾 บันทึกการแก้ไข' : '➕ เพิ่มรายการ'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const closeModal = () => document.getElementById('modal-add-transaction')?.remove();
    document.getElementById('btn-close-tx-modal').onclick = closeModal;
    document.getElementById('btn-cancel-modal-tx').onclick = closeModal;

    document.getElementById('btn-save-modal-tx').onclick = () => {
      const type = document.getElementById('modal-tx-type').value;
      const date = document.getElementById('modal-tx-date').value;
      const category = document.getElementById('modal-tx-category').value.trim() || 'ทั่วไป';
      const detail = document.getElementById('modal-tx-desc').value.trim();
      const amount = parseFloat(document.getElementById('modal-tx-amount').value) || 0;

      if (amount <= 0) {
        alert('กรุณากรอกจำนวนเงิน');
        return;
      }

      let accountName = '';
      let fromAccount = '';
      let toAccount = '';

      if (type === 'โอนระหว่างบัญชี') {
        fromAccount = document.getElementById('modal-tx-from-account').value;
        toAccount = document.getElementById('modal-tx-to-account').value;
        accountName = fromAccount;
      } else {
        accountName = document.getElementById('modal-tx-account').value;
      }

      if (!state.transactions) state.transactions = [];

      const txPayload = {
        type, date, category,
        detail, desc: detail,
        amount,
        accountName, accountId: accountName,
        fromAccount: type === 'โอนระหว่างบัญชี' ? fromAccount : undefined,
        toAccount: type === 'โอนระหว่างบัญชี' ? toAccount : undefined
      };

      if (isEdit) {
        const idx = state.transactions.findIndex(t => t.id === txId);
        if (idx !== -1) {
          state.transactions[idx] = { ...state.transactions[idx], ...txPayload };
        }
      } else {
        state.transactions.unshift({
          id: 'tx-' + Date.now(),
          ...txPayload
        });
      }

      this.saveState(state);
      closeModal();
      this.render();
    };
  },

  // Modal แก้ไขยอดเริ่มต้นสไตล์ Modern Glassmorphism
  openEditBankBalanceModal(accName) {
    if (!accName) return;

    const oldModal = document.getElementById('modal-edit-bank-balance');
    if (oldModal) oldModal.remove();

    const defaultInitials = {
      'เงินสด': 1445.00,
      'กรุงเทพ': 8461.30,
      'กรุงไทย': 6761.61,
      'ทหารไทย': 1146.20,
      'ไทยพาณิชย์': 40865.84,
      'ธกส.': 50651.43,
      'กสิกรไทย': 3207.86,
      'ออมสิน': 772.79,
      'เป๋าตัง': 56.40,
      'Truemoney': 146.89,
      'ออมทรัพย์ สอท': 202191.42
    };

    let storedInitials = {};
    try {
      storedInitials = JSON.parse(localStorage.getItem('family-finance:initial-balances:v1')) || {};
    } catch (e) {}

    const curInitial = storedInitials[accName] !== undefined ? storedInitials[accName] : (defaultInitials[accName] || 0);

    const modalHtml = `
      <div id="modal-edit-bank-balance" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 99999; animation: fadeIn 0.15s ease-out;">
        <div style="background: #ffffff; border-radius: 20px; width: 420px; max-width: 92vw; padding: 26px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); text-align: left; font-family: inherit;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="background: #e0f2fe; color: #0284c7; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🏦</div>
              <div>
                <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">แก้ไขยอดเริ่มต้น</h3>
                <div style="font-size: 12px; color: #64748b; font-weight: 600;">บัญชี: ${accName}</div>
              </div>
            </div>
            <button id="btn-close-edit-bank" style="background: transparent; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; padding: 4px; line-height: 1;">✕</button>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 6px;">
              <span>ยอดเริ่มต้นเดิม:</span>
              <strong style="color: #0f172a;">฿${curInitial.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
              * ยอดเงินก้อนตั้งต้นก่อนเริ่มนับรวมประวัติธุรกรรม เงินเข้า/เงินออก ทั้งหมด
            </div>
          </div>

          <div style="margin-bottom: 22px;">
            <label style="display: block; font-size: 12.5px; font-weight: 700; color: #334155; margin-bottom: 8px;">
              กำหนดยอดเริ่มต้นใหม่ (บาท)
            </label>
            <input type="number" step="any" id="input-new-bank-balance" value="${curInitial}" 
              style="width: 100%; box-sizing: border-box; padding: 12px 14px; border: 2px solid #0284c7; border-radius: 10px; font-size: 18px; font-weight: 800; color: #0f172a; outline: none; background: #fff;"
              autofocus>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="btn-cancel-edit-bank" style="background: #fff; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 9px 18px; font-size: 13px; font-weight: 700; color: #475569; cursor: pointer;">
              ยกเลิก
            </button>
            <button id="btn-save-edit-bank" style="background: #0284c7; border: none; border-radius: 10px; padding: 9px 24px; font-size: 13px; font-weight: 800; color: #ffffff; cursor: pointer; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.3);">
              💾 บันทึกยอดใหม่
            </button>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const close = () => document.getElementById('modal-edit-bank-balance')?.remove();
    document.getElementById('btn-close-edit-bank').onclick = close;
    document.getElementById('btn-cancel-edit-bank').onclick = close;

    document.getElementById('btn-save-edit-bank').onclick = () => {
      const val = parseFloat(document.getElementById('input-new-bank-balance').value);
      if (isNaN(val)) {
        alert('กรุณากรอกตัวเลขจำนวนเงินที่ถูกต้อง');
        return;
      }

      storedInitials[accName] = val;
      localStorage.setItem('family-finance:initial-balances:v1', JSON.stringify(storedInitials));
      close();
      this.render();
    };
  },

  renderTableOnly() {
    const state = this.getState();
    const allTx = state.transactions || [];
    const filtered = this.getFilteredTransactions(allTx);
    // จัดเรียงรายการ: วันที่ล่าสุดขึ้นก่อน (หากเปิดดูให้แสดงวันใหม่สุดก่อน)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      if (this.sortOrder === 'asc') {
        return dateA - dateB;
      }
      return dateB - dateA;
    });
    const formatBaht = (num) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const tbody = document.getElementById('tx-table-body');
    const countEl = document.getElementById('tx-count-label');
    if (countEl) countEl.textContent = `รายการธุรกรรม (${filtered.length} รายการ)`;

    if (!tbody) return;

    tbody.innerHTML = filtered.map(t => {
      const isIncome = t.type === 'รายรับ';
      const isInvest = t.type === 'ลงทุน' || t.type === 'เงินออมและลงทุน' || t.type === 'เงินออม';
      const isDebt = t.type === 'หนี้สิน';
      const isTransfer = t.type === 'โอนระหว่างบัญชี' || t.type === 'โอนเงิน';

      let badgeBg = '#fef2f2';
      let badgeColor = '#dc2626';

      if (isIncome) {
        badgeBg = '#ecfdf5';
        badgeColor = '#16a34a';
      } else if (isInvest) {
        badgeBg = '#eff6ff';
        badgeColor = '#0284c7';
      } else if (isDebt) {
        badgeBg = '#fef2f2';
        badgeColor = '#ea580c';
      } else if (isTransfer) {
        badgeBg = '#f1f5f9';
        badgeColor = '#475569';
      }

      const sign = isIncome ? '+' : (isTransfer ? '↔' : '-');
      const detailText = this.getItemDetail(t) || '-';
      const accountText = this.getItemAccount(t) || '-';

      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 14px; color: #64748b; font-size: 12.5px; white-space: nowrap;">${t.date}</td>
          <td style="padding: 12px 14px; white-space: nowrap;">
            <span style="background: ${badgeBg}; color: ${badgeColor}; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px;">
              ${t.type}
            </span>
          </td>
          <td style="padding: 12px 14px; font-size: 13px; color: #334155; font-weight: 600; white-space: nowrap;">${t.category}</td>
          <td style="padding: 12px 14px; text-align: right; font-weight: 900; font-size: 14px; color: ${badgeColor}; font-variant-numeric: tabular-nums; white-space: nowrap;">
            ${sign}฿${formatBaht(t.amount)}
          </td>
          <td style="padding: 12px 14px; font-size: 12.5px; color: #475569; white-space: nowrap;">
            ${accountText}
          </td>
          <td style="padding: 12px 14px; font-size: 13px; font-weight: 600; color: #0f172a;">
            ${detailText}
          </td>
          <td style="padding: 12px 14px; text-align: center; white-space: nowrap;">
            <button class="btn-edit-tx" data-id="${t.id}" style="background: none; border: none; color: #0ea5e9; cursor: pointer; font-size: 14px; margin-right: 6px;" title="แก้ไขรายการ">✏️</button>
            <button class="btn-delete-tx" data-id="${t.id}" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 14px;" title="ลบรายการ">🗑️</button>
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="7" style="text-align: center; padding: 30px; color: #94a3b8;">ไม่พบรายการธุรกรรมตามเงื่อนไขที่เลือก</td></tr>';
  },

  renderAnnualSummary(targetContainer = null) {
    const container = targetContainer 
                   || document.getElementById('content-area')
                   || document.getElementById('cashflow-subview')
                   || document.getElementById('expense-content')
                   || document.querySelector('.content-area')
                   || document.getElementById('main-content');
    if (!container) return;

    const formatBaht = (num) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const state = this.getState();
    const allTx = state.transactions || [];

    const year = this.selectedYear;
    const yearTx = allTx.filter(t => (t.date || '').startsWith(String(year)));

    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    let totalYearIncome = 0;
    let totalYearExpense = 0;
    let totalYearInvest = 0;

    const monthlyData = months.map((mName, idx) => {
      const monthStr = `${year}-${String(idx + 1).padStart(2, '0')}`;
      const mTx = yearTx.filter(t => (t.date || '').startsWith(monthStr));

      const inc = mTx.filter(t => t.type === 'รายรับ').reduce((s, t) => s + t.amount, 0);
      const exp = mTx.filter(t => t.type === 'รายจ่าย' || t.type === 'บิล' || t.type === 'หนี้สิน').reduce((s, t) => s + t.amount, 0);
      const inv = mTx.filter(t => t.type === 'ลงทุน' || t.type === 'เงินออมและลงทุน' || t.type === 'เงินออม').reduce((s, t) => s + t.amount, 0);
      const net = inc - exp;

      totalYearIncome += inc;
      totalYearExpense += exp;
      totalYearInvest += inv;

      return { month: mName, inc, exp, inv, net };
    });

    const netYearSavings = totalYearIncome - totalYearExpense;

    const rowsHtml = monthlyData.map(d => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 14px; font-weight: 700; color: #0f172a;">${d.month} ${year + 543}</td>
        <td style="padding: 12px 14px; text-align: right; font-weight: 800; color: #16a34a;">${d.inc > 0 ? '฿' + formatBaht(d.inc) : '-'}</td>
        <td style="padding: 12px 14px; text-align: right; font-weight: 800; color: #dc2626;">${d.exp > 0 ? '฿' + formatBaht(d.exp) : '-'}</td>
        <td style="padding: 12px 14px; text-align: right; font-weight: 800; color: #0284c7;">${d.inv > 0 ? '฿' + formatBaht(d.inv) : '-'}</td>
        <td style="padding: 12px 14px; text-align: right; font-weight: 900; color: ${d.net >= 0 ? '#0284c7' : '#dc2626'};">${d.inc > 0 || d.exp > 0 ? '฿' + formatBaht(d.net) : '-'}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="portfolio-container" style="width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 0 30px 0 !important; text-align: left;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 14px; width: 100%;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: #e0e7ff; color: #4338ca; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 22px; flex-shrink: 0;">🗓️</div>
            <div style="text-align: left;">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">ANNUAL CASH FLOW REPORT</div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">สรุปรายเดือน & สรุปภาพรวมรายปี</h1>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <div style="display: flex; background: #f1f5f9; padding: 3px; border-radius: 8px; margin-right: 6px;">
              <button class="btn-switch-cashflow-view" data-view="daily" style="border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; background: transparent; color: #64748b;">
                📋 บันทึกรายวัน
              </button>
              <button class="btn-switch-cashflow-view" data-view="annual" style="border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; background: #fff; color: #0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.06);">
                📊 สรุปรายปี
              </button>
            </div>

            <button id="btn-prev-year" style="background: #fff; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer;">◀ ปีก่อนหน้า</button>
            <span style="font-size: 15px; font-weight: 800; color: #0f172a; padding: 0 8px;">ปี ${year} (พ.ศ. ${year + 543})</span>
            <button id="btn-next-year" style="background: #fff; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer;">ปีถัดไป ▶</button>
          </div>
        </div>

        <div class="summary-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px;">
          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🟢 รายรับทั้งปี (Total Income)</div>
            <div class="card-value" style="font-size: 22px; font-weight: 900; color: #16a34a;">฿${formatBaht(totalYearIncome)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">เฉลี่ยเดือนละ ฿${formatBaht(totalYearIncome / 12)}</div>
          </div>

          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🔴 รายจ่ายทั้งปี (Total Expense)</div>
            <div class="card-value" style="font-size: 22px; font-weight: 900; color: #dc2626;">฿${formatBaht(totalYearExpense)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">เฉลี่ยเดือนละ ฿${formatBaht(totalYearExpense / 12)}</div>
          </div>

          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🔵 กระแสเงินสดสุทธิทั้งปี</div>
            <div class="card-value" style="font-size: 22px; font-weight: 900; color: ${netYearSavings >= 0 ? '#0284c7' : '#dc2626'};">฿${formatBaht(netYearSavings)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">เงินสดคงเหลือสุทธิรอบปี</div>
          </div>

          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🚀 ยอดสะสมเงินออม/ลงทุน</div>
            <div class="card-value" style="font-size: 22px; font-weight: 900; color: #0284c7;">฿${formatBaht(totalYearInvest)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">สะสมเข้าพอร์ตและ สอท.</div>
          </div>
        </div>

        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 800; color: #0f172a;">📊 ตารางแจกแจงรายรับ-รายจ่าย รายเดือน (ปี ${year})</h3>
          <div style="overflow-x: auto;">
            <table class="custom-table" style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
              <thead>
                <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px;">
                  <th style="padding: 12px 14px; text-align: left;">เดือน</th>
                  <th style="padding: 12px 14px; text-align: right;">รายรับ</th>
                  <th style="padding: 12px 14px; text-align: right;">รายจ่าย</th>
                  <th style="padding: 12px 14px; text-align: right;">เงินออม/ลงทุน</th>
                  <th style="padding: 12px 14px; text-align: right;">สุทธิ (Net)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  },

  renderBankingView(targetContainer = null) {
    const container = targetContainer 
                   || document.getElementById('content-area')
                   || document.querySelector('.content-area')
                   || document.getElementById('main-content');
    if (!container) return;

    const formatBaht = (num) => '฿' + Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // โทนสีพื้นหลัง Badge ของแต่ละธนาคารตามรูป
    const bankColorMap = {
      'CASH': '#059669',
      'BBL': '#1e3a8a',
      'KTB': '#00a3e0',
      'TTB': '#002d62',
      'SCB': '#4c1d95',
      'BAAC': '#064e3b',
      'KBANK': '#15803d',
      'GSB': '#e11d48',
      'PAOTANG': '#0284c7',
      'TMN': '#ea580c',
      'COOP': '#065f46',
      'LHBANK': '#4c1d95',
      'KKP': '#7c3aed',
      'BAY': '#f59e0b',
      'KTC': '#0284c7'
    };

    // ดึงข้อมูลธุรกรรมจริงทั้งหมดเพื่อคำนวณยอดสด
    const state = this.getState();
    const allTxs = state.transactions || [];

    // ยอดเริ่มต้นคงที่ของแต่ละบัญชี
    const initialBalances = {
      'เงินสด': 1445.00,
      'กรุงเทพ': 8461.30,
      'กรุงไทย': 6761.61,
      'ทหารไทย': 1146.20,
      'ไทยพาณิชย์': 40865.84,
      'ธกส.': 50651.43,
      'กสิกรไทย': 3207.86,
      'ออมสิน': 772.79,
      'เป๋าตัง': 56.40,
      'Truemoney': 146.89,
      'ออมทรัพย์ สอท': 202191.42
    };

    // โครงร่างบัญชีหลัก 11 บัญชี
    const rawMainAccounts = [
      { id: 'acc-1', name: 'เงินสด', bank: 'CASH', accNo: 'CASH-ON-HAND', interestRate: 0.00, purpose: 'เงินสดติดตัว / ใช้จ่ายประจำวัน' },
      { id: 'acc-2', name: 'กรุงเทพ', bank: 'BBL', accNo: '006-7-05636-6', interestRate: 0.25, purpose: 'สะสมทรัพย์' },
      { id: 'acc-3', name: 'กรุงไทย', bank: 'KTB', accNo: '066-1-13437-7', interestRate: 0.25, purpose: 'ออมทรัพย์หลัก' },
      { id: 'acc-4', name: 'ทหารไทย', bank: 'TTB', accNo: '236-2-16356-6', interestRate: 0.00, purpose: 'ทีเอ็มบี ออลล์ ฟรี' },
      { id: 'acc-5', name: 'ไทยพาณิชย์', bank: 'SCB', accNo: '198-2-09134-3', interestRate: 0.25, purpose: 'ออมทรัพย์' },
      { id: 'acc-6', name: 'ธกส.', bank: 'BAAC', accNo: '020028174851', interestRate: 0.45, purpose: 'ออมทรัพย์' },
      { id: 'acc-7', name: 'กสิกรไทย', bank: 'KBANK', accNo: '069-1-09614-9', interestRate: 0.25, purpose: 'ออมทรัพย์' },
      { id: 'acc-8', name: 'ออมสิน', bank: 'GSB', accNo: '020255468702', interestRate: 0.35, purpose: 'เผื่อเรียก (สลาก)' },
      { id: 'acc-9', name: 'เป๋าตัง', bank: 'PAOTANG', accNo: 'G-WALLET', interestRate: 0.00, purpose: 'G-Wallet สแกนจ่ายโครงการรัฐ' },
      { id: 'acc-10', name: 'Truemoney', bank: 'TMN', accNo: 'WALLET', interestRate: 0.00, purpose: 'วอลเล็ตซื้อของ 7-11 / บริการออนไลน์' },
      { id: 'acc-11', name: 'ออมทรัพย์ สอท', bank: 'COOP', accNo: 'COOP-SAVING', interestRate: 2.50, purpose: 'สหกรณ์ออมทรัพย์ สอท.' }
    ];

    // ฟังก์ชันแปลงชื่อบัญชีต่างๆ ให้ตรงกับ 11 บัญชีหลักอย่างแม่นยำ
    const normalizeAccName = (raw) => {
      const s = String(raw || '').trim().toLowerCase();
      if (!s) return '';
      if (s.includes('เงินสด') || s.includes('cash')) return 'เงินสด';
      if (s.includes('กรุงเทพ') || s.includes('bbl')) return 'กรุงเทพ';
      if (s.includes('กรุงไทย') || s.includes('ktb')) return 'กรุงไทย';
      if (s.includes('ทหารไทย') || s.includes('ttb') || s.includes('tmb')) return 'ทหารไทย';
      if (s.includes('ไทยพาณิชย์') || s.includes('scb')) return 'ไทยพาณิชย์';
      if (s.includes('ธกส') || s.includes('baac')) return 'ธกส.';
      if (s.includes('กสิกร') || s.includes('kbank') || s.includes('k+')) return 'กสิกรไทย';
      if (s.includes('ออมสิน') || s.includes('gsb')) return 'ออมสิน';
      if (s.includes('เป๋าตัง') || s.includes('paotang') || s.includes('g-wallet')) return 'เป๋าตัง';
      if (s.includes('truemoney') || s.includes('true money') || s.includes('tmn') || s.includes('ทรูมันนี่')) return 'Truemoney';
      if (s.includes('สอท') || s.includes('สหกรณ์') || s.includes('coop')) return 'ออมทรัพย์ สอท';
      return raw;
    };

    // คำนวณยอดเงินเข้า-ออกจริงจากประวัติธุรกรรม
    const mainAccounts = rawMainAccounts.map(acc => {
      let inAmt = 0;
      let outAmt = 0;

      allTxs.forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        if (amt <= 0) return;

        const type = String(t.type || '').trim();
        const cat = String(t.category || '').trim();
        const detail = String(t.detail || t.desc || t.note || '').trim();

        // ฟังก์ชันจับคู่ชื่อบัญชีในตัว
        const matchName = (raw) => {
          const s = String(raw || '').trim().toLowerCase();
          if (!s) return '';
          if (s.includes('เงินสด') || s.includes('cash')) return 'เงินสด';
          if (s.includes('กรุงเทพ') || s.includes('bbl')) return 'กรุงเทพ';
          if (s.includes('กรุงไทย') || s.includes('ktb')) return 'กรุงไทย';
          if (s.includes('ทหารไทย') || s.includes('ttb') || s.includes('tmb')) return 'ทหารไทย';
          if (s.includes('ไทยพาณิชย์') || s.includes('scb')) return 'ไทยพาณิชย์';
          if (s.includes('ธกส') || s.includes('baac')) return 'ธกส.';
          if (s.includes('กสิกร') || s.includes('kbank')) return 'กสิกรไทย';
          if (s.includes('ออมสิน') || s.includes('gsb')) return 'ออมสิน';
          if (s.includes('เป๋าตัง') || s.includes('paotang') || s.includes('g-wallet')) return 'เป๋าตัง';
          if (s.includes('truemoney') || s.includes('true money') || s.includes('tmn')) return 'Truemoney';
          if (s.includes('สอท') || s.includes('สหกรณ์') || s.includes('coop')) return 'ออมทรัพย์ สอท';
          return '';
        };

        const accFromField = matchName(t.fromAccount);
        const accToField = matchName(t.toAccount);
        const accMainField = matchName(t.accountName || t.accountId || t.account || t.bank);

        // 1. กรณีเป็นรายการโอน หรือมีระบุบัญชีต้นทาง-ปลายทาง
        if (type === 'โอนระหว่างบัญชี' || type === 'โอนเงิน' || accFromField || accToField) {
          let src = accFromField || accMainField;
          let dst = accToField;

          if (!dst && (cat.includes('เป๋าตัง') || detail.includes('เป๋าตัง'))) {
            dst = 'เป๋าตัง';
          }
          if (!dst && (cat.includes('สอท') || detail.includes('สอท'))) {
            dst = 'ออมทรัพย์ สอท';
          }

          if (src === acc.name) outAmt += amt;
          if (dst === acc.name) inAmt += amt;
          return;
        }

        // 2. กรณีเป็นธุรกรรมทั่วไป
        let matchedTarget = accMainField;

        if (!matchedTarget) {
          if (cat.includes('เป๋าตัง') || detail.includes('เป๋าตัง')) matchedTarget = 'เป๋าตัง';
          else if (cat.includes('SCB') || detail.includes('SCB')) matchedTarget = 'ไทยพาณิชย์';
          else if (cat.includes('สอท') || detail.includes('สอท')) matchedTarget = 'ออมทรัพย์ สอท';
        }

        if (matchedTarget === acc.name) {
          if (type === 'รายรับ' || type === 'income') {
            inAmt += amt;
          } else {
            outAmt += amt;
          }
        }
      });

      const initBal = initialBalances[acc.name] || 0;
      const adjustAmt = inAmt - outAmt;
      const balance = initBal + adjustAmt;
      const estInt = (balance > 0 ? balance : 0) * (acc.interestRate / 100);

      return {
        ...acc,
        inAmt,
        outAmt,
        adjustAmt,
        balance,
        estInt
      };
    });

    // 2. กลุ่ม 7 บัญชี Internet & ดิจิทัลดอกเบี้ยสูง
    const digitalAccounts = [
      { id: 'acc-d1', name: 'กรุงไทย (ประจำ)', bank: 'KTB', accNo: '066-2-03523-2', interestRate: 1.20, balance: 0.00, inAmt: 0.00, outAmt: 0.00, adjustAmt: 0.00, estInt: 0.00, purpose: 'เงินฝากประจำ' },
      { id: 'acc-d2', name: 'ทหารไทย (ออมทรัพย์)', bank: 'TTB', accNo: '236-2-16357-4', interestRate: 0.25, balance: 0.00, inAmt: 0.00, outAmt: 0.00, adjustAmt: 0.00, estInt: 0.00, purpose: 'ออมทรัพย์' },
      { id: 'acc-d3', name: 'ออมสิน (ประจำ 6 เดือน)', bank: 'GSB', accNo: '320250353358', interestRate: 1.05, balance: 0.00, inAmt: 0.00, outAmt: 0.00, adjustAmt: 0.00, estInt: 0.00, purpose: 'ประจำ 6 เดือน' },
      { id: 'acc-d4', name: 'LH (B-You Max)', bank: 'LHBANK', accNo: '800-2-46280-8', interestRate: 6.00, balance: 0.00, inAmt: 0.00, outAmt: 0.00, adjustAmt: 0.00, estInt: 0.00, purpose: 'Internet Banking / B-You Max' },
      { id: 'acc-d5', name: 'เกียรตินาคินภัทร (Dime)', bank: 'KKP', accNo: '201-2-14799-7', interestRate: 3.00, balance: 0.00, inAmt: 0.00, outAmt: 0.00, adjustAmt: 0.00, estInt: 0.00, purpose: 'Dime! Save ดอกเบี้ยสูง' },
      { id: 'acc-d6', name: 'ทหารไทย (TTB ME Save)', bank: 'TTB', accNo: '236-2-19496-7', interestRate: 2.20, balance: 0.00, inAmt: 0.00, outAmt: 0.00, adjustAmt: 0.00, estInt: 0.00, purpose: 'ME Save ดอกเบี้ยสูง' },
      { id: 'acc-d7', name: 'กรุงไทย (Next Saving)', bank: 'KTB', accNo: '066-0-14649-5', interestRate: 1.50, balance: 0.00, inAmt: 0.00, outAmt: 0.00, adjustAmt: 0.00, estInt: 0.00, purpose: 'Krungthai Next Saving' }
    ];

    // 3. กลุ่ม 3 บัตรเครดิต
    const creditCards = [
      { id: 'card-1', name: 'บัตรเครดิตกรุงศรี', bank: 'BAY', cutOff: 'ตัดรอบทุกวันที่ 10', balance: 11723.28, status: 'รอชำระรอบนี้', statusColor: '#f97316', statusBg: '#fff7ed', chargeAmt: 162267.71, paidAmt: 171339.13, condition: 'บัตรเครดิต กรุงศรี (ตัดรอบวันที่ 10)' },
      { id: 'card-2', name: 'บัตรเครดิตกรุงไทย', bank: 'KTC', cutOff: 'ตัดรอบทุกวันที่ 7', balance: 0.00, status: 'เคลียร์บิลแล้ว', statusColor: '#059669', statusBg: '#ecfdf5', chargeAmt: 1530.00, paidAmt: 1544.67, condition: 'บัตรเครดิต KTC (ตัดรอบวันที่ 15)' },
      { id: 'card-3', name: 'บัตรเครดิตทีทีบี', bank: 'TTB', cutOff: 'ตัดรอบทุกวันที่ 2', balance: 0.00, status: 'เคลียร์บิลแล้ว', statusColor: '#059669', statusBg: '#ecfdf5', chargeAmt: 0.00, paidAmt: 2086.16, condition: 'บัตรเครดิต ttb' }
    ];

    const renderAccountCard = (a) => {
      const bankBg = bankColorMap[a.bank] || '#0f172a';
      return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div style="display: flex; gap: 10px; align-items: center;">
                <div style="background: ${bankBg}; color: #ffffff; font-size: 11px; font-weight: 900; padding: 5px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; min-width: 44px; text-align: center;">
                  ${a.bank}
                </div>
                <div>
                  <div style="font-size: 14.5px; font-weight: 800; color: #0f172a; line-height: 1.2;">${a.name}</div>
                  <div style="font-size: 11px; color: #94a3b8; font-variant-numeric: tabular-nums;">${a.accNo || '-'}</div>
                </div>
              </div>
              <span style="background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">
                ดอกเบี้ย ${Number(a.interestRate).toFixed(2)}%
              </span>
            </div>

            <div style="font-size: 11px; color: #64748b; font-weight: 600;">ยอดเงินคงเหลือ</div>
            <div style="font-size: 26px; font-weight: 900; color: #0f172a; margin: 2px 0 12px 0; letter-spacing: -0.6px; font-variant-numeric: tabular-nums;">
              ${formatBaht(a.balance)}
            </div>

            <div style="background: #ffffff; border: 1px solid #f1f5f9; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 11.5px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #64748b;">เข้า: <strong style="color: #16a34a; font-variant-numeric: tabular-nums;">+${formatBaht(a.inAmt || 0)}</strong></span>
                <span style="color: #64748b;">ออก: <strong style="color: #dc2626; font-variant-numeric: tabular-nums;">-${formatBaht(a.outAmt || 0)}</strong></span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #64748b;">ปรับปรุงยอด (+/-):</span>
                <strong style="color: ${(a.adjustAmt || 0) >= 0 ? '#16a34a' : '#dc2626'}; font-variant-numeric: tabular-nums;">
                  ${(a.adjustAmt || 0) >= 0 ? '+' : ''}${formatBaht(a.adjustAmt || 0)}
                </strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #64748b;">ดอกเบี้ยประมาณการ/ปี:</span>
                <strong style="color: #16a34a; font-variant-numeric: tabular-nums;">+${formatBaht(a.estInt || 0)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 5px; border-top: 1px dashed #e2e8f0; padding-top: 5px;">
                <span style="color: #64748b;">วัตถุประสงค์:</span>
                <strong style="color: #334155; text-align: right; max-width: 170px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.purpose || 'ทั่วไป'}</strong>
              </div>
            </div>
          </div>

          <button class="btn-edit-bank-balance" data-id="${a.id}" data-name="${a.name}" data-balance="${a.balance}" style="width: 100%; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 7px; font-size: 12px; font-weight: 700; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>✏️</span> แก้ไขยอด
          </button>
        </div>
      `;
    };

    const renderCardItem = (c) => {
      const bankBg = bankColorMap[c.bank] || '#f59e0b';
      return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div style="display: flex; gap: 10px; align-items: center;">
                <div style="background: ${bankBg}; color: #ffffff; font-size: 11px; font-weight: 900; padding: 5px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; min-width: 44px; text-align: center;">
                  ${c.bank}
                </div>
                <div>
                  <div style="font-size: 14.5px; font-weight: 800; color: #0f172a; line-height: 1.2;">${c.name}</div>
                  <div style="font-size: 11px; color: #dc2626; font-weight: 700;">${c.cutOff}</div>
                </div>
              </div>
              <span style="background: ${c.statusBg}; color: ${c.statusColor}; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">
                ${c.status === 'เคลียร์บิลแล้ว' ? '✓ ' : ''}${c.status}
              </span>
            </div>

            <div style="font-size: 11px; color: #64748b; font-weight: 600;">ยอดรอตัดจ่ายรอบบิลนี้</div>
            <div style="font-size: 26px; font-weight: 900; color: ${c.balance > 0 ? '#ea580c' : '#059669'}; margin: 2px 0 12px 0; letter-spacing: -0.6px; font-variant-numeric: tabular-nums;">
              ${formatBaht(c.balance)}
            </div>

            <div style="background: #ffffff; border: 1px solid #f1f5f9; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 11.5px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #64748b;">ยอดรูดสะสม:</span>
                <strong style="color: #dc2626; font-variant-numeric: tabular-nums;">${formatBaht(c.chargeAmt)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: #64748b;">ชำระแล้ว:</span>
                <strong style="color: #16a34a; font-variant-numeric: tabular-nums;">${formatBaht(c.paidAmt)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 5px; border-top: 1px dashed #e2e8f0; padding-top: 5px;">
                <span style="color: #64748b;">เงื่อนไขบัตร:</span>
                <strong style="color: #334155; text-align: right; max-width: 170px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.condition}</strong>
              </div>
            </div>
          </div>

          <button class="btn-edit-bank-balance" data-id="${c.id}" data-name="${c.name}" data-balance="${c.balance}" style="width: 100%; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 7px; font-size: 12px; font-weight: 700; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>✏️</span> แก้ไขวันตัดยอด
          </button>
        </div>
      `;
    };

    container.innerHTML = `
      <div class="portfolio-container" style="width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 0 30px 0 !important; text-align: left;">
        
        <!-- Header Toolbar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 14px; width: 100%;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: #e0f2fe; color: #0284c7; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 22px; flex-shrink: 0;">🏦</div>
            <div style="text-align: left;">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">CASH & EMERGENCY FUND</div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">สมุดบัญชีเงินฝาก ณัฐพร แก้วสม</h1>
                <span style="color: #64748b; font-size: 12px; font-weight: 600;">รวม 21 บัญชี</span>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            <button id="btn-export-banking-json" style="background: #fff; border: 1px solid #cbd5e1; color: #334155; padding: 7px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <span>📤</span> ส่งออก JSON
            </button>
          </div>
        </div>

        <!-- 4 กล่องสรุปสถิติด้านบน -->
        <div class="summary-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; margin-bottom: 24px;">
          
          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-size: 11.5px; color: #64748b; font-weight: 700; margin-bottom: 6px;">📊 สภาพคล่องสุทธิ (เงินฝาก - บิลบัตร)</div>
            <div style="font-size: 24px; font-weight: 900; color: #059669; letter-spacing: -0.5px;">฿409,534.03</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 6px;">เงินฝาก: ฿421,257.31 • <span style="color: #dc2626;">บิลบัตร: ฿11,723.28</span></div>
          </div>

          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 11.5px; color: #64748b; font-weight: 700;">🛡️ เงินสำรองฉุกเฉิน (Emergency Buffer)</span>
              <span style="background: #ecfdf5; color: #059669; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;">เกษียณ 01/10/72 (36 ด.)</span>
            </div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span style="font-size: 22px; font-weight: 900; color: #0284c7;">5.5</span>
              <span style="font-size: 12px; color: #64748b; font-weight: 700;">/ 12 เดือน</span>
              <span style="margin-left: auto; font-size: 13px; font-weight: 800; color: #0284c7;">45.5%</span>
            </div>
            <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin: 8px 0;">
              <div style="width: 45.5%; height: 100%; background: #0284c7; border-radius: 3px;"></div>
            </div>
            <div style="font-size: 10.5px; color: #64748b; display: flex; justify-content: space-between;">
              <span>สอท. ฿218,486.15</span>
              <span>เป้าหมาย ฿480,000.00</span>
            </div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">⚡ 33 เดือนเต็มเป้า (ทันก่อนเกษียณ 3 เดือน)</div>
          </div>

          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-size: 11.5px; color: #64748b; font-weight: 700; margin-bottom: 6px;">🎁 ดอกเบี้ยรับสะสม/ปี (Est. Interest)</div>
            <div style="font-size: 24px; font-weight: 900; color: #16a34a; letter-spacing: -0.5px;">+฿6,064.84</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 6px;">เฉลี่ยเดือนละ ฿505.40</div>
          </div>

          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-size: 11.5px; color: #64748b; font-weight: 700; margin-bottom: 6px;">🗂️ บัญชีทั้งหมดในระบบ</div>
            <div style="font-size: 24px; font-weight: 900; color: #0f172a;">21 บัญชี</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 6px;">เงินฝาก & ดิจิทัล 18 บัญชี • บัตรเครดิต 3 ใบ</div>
          </div>

        </div>

        <!-- 1. สมุดบัญชีเงินฝากและเงินสด (11 บัญชีหลัก) -->
        <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 14px 0;">
          🏦 สมุดบัญชีเงินฝากและเงินสด (11 บัญชีหลัก)
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 30px;">
          ${mainAccounts.map(renderAccountCard).join('')}
        </div>

        <!-- 2. บัญชีเงินฝาก Internet & ดิจิทัลดอกเบี้ยสูง (7 บัญชี) -->
        <div style="margin-bottom: 14px;">
          <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">
            🌐 บัญชีเงินฝาก Internet & ดิจิทัลดอกเบี้ยสูง (7 บัญชี)
          </h3>
          <div style="font-size: 12px; color: #64748b;">Dime, ME Save, Next Saving, B-You Max และบัญชีประจำ</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 30px;">
          ${digitalAccounts.map(renderAccountCard).join('')}
        </div>

        <!-- 3. บัตรเครดิตและวงเงินรอชำระรอบนี้ (3 บัญชี) -->
        <div style="margin-bottom: 14px;">
          <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">
            💳 บัตรเครดิตและวงเงินรอชำระรอบนี้ (3 บัญชี)
          </h3>
          <div style="font-size: 12px; color: #64748b;">ติดตามยอดรูดและวันตัดรอบบิล</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
          ${creditCards.map(renderCardItem).join('')}
        </div>

      </div>
    `;
  },

  render(targetContainer = null) {
    const container = targetContainer 
                   || document.getElementById('content-area')
                   || document.getElementById('cashflow-subview')
                   || document.getElementById('expense-content')
                   || document.querySelector('.subview-content')
                   || document.querySelector('.content-area')
                   || document.getElementById('main-content');

    if (!container) return;

    if (typeof this.highlightActiveSidebar === 'function') {
      this.highlightActiveSidebar();
    }

    if (this.currentView === 'dividend') {
      if (typeof PortfolioModule !== 'undefined' && typeof PortfolioModule.renderDividendTracker === 'function') {
        PortfolioModule.renderDividendTracker(container);
      } else {
        container.innerHTML = '<div style="padding: 30px; text-align: center; color: #64748b; font-weight: 700;">กำลังเรียกข้อมูลรายงานเงินปันผล...</div>';
      }
      return;
    }

    if (this.currentView === 'annual') {
      this.renderAnnualSummary(container);
      return;
    }

    if (this.currentView === 'banking') {
      this.renderBankingView(container);
      return;
    }

    if (this.currentView === 'credit-cards') {
      this.renderCreditCardsView(container);
      return;
    }

    if (this.currentView === 'debts') {
      this.renderDebtsView(container);
      return;
    }

    const formatBaht = (num) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const state = this.getState();
    const allTx = state.transactions || [];
    const filteredTx = this.getFilteredTransactions(allTx);
    // จัดเรียงรายการ: วันที่ล่าสุดขึ้นก่อน (คลิกสลับ ใหม่-เก่า ได้)
    filteredTx.sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      if (this.sortOrder === 'asc') {
        return dateA - dateB;
      }
      return dateB - dateA;
    });

    const totalIncome = filteredTx.filter(t => t.type === 'รายรับ').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = filteredTx.filter(t => t.type === 'รายจ่าย' || t.type === 'บิล' || t.type === 'หนี้สิน').reduce((sum, t) => sum + t.amount, 0);
    const totalInvest = filteredTx.filter(t => t.type === 'ลงทุน' || t.type === 'เงินออมและลงทุน' || t.type === 'เงินออม').reduce((sum, t) => sum + t.amount, 0);
    const netSavings = totalIncome - totalExpense;
    const savingRate = totalIncome > 0 ? ((totalInvest / totalIncome) * 100).toFixed(1) : '0.0';

    const catMap = {};
    filteredTx.filter(t => t.type === 'รายจ่าย' || t.type === 'บิล' || t.type === 'หนี้สิน').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });

    const categoryBreakdownHtml = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a]).map(cat => {
      const amt = catMap[cat];
      const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : 0;
      return `
        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
            <span style="color: #334155; font-weight: 700;">${cat}</span>
            <span style="color: #64748b; font-weight: 600;">฿${formatBaht(amt)} (${pct}%)</span>
          </div>
          <div style="height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: #ef4444; border-radius: 3px;"></div>
          </div>
        </div>
      `;
    }).join('');

    const monthPickerHtml = this.selectedMonth 
      ? `<input type="month" id="tx-month-picker" value="${this.selectedMonth}" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700; width: 140px;">`
      : `<div style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700; background: #f1f5f9; color: #64748b; display: flex; align-items: center; justify-content: center; width: 140px; cursor: not-allowed;">ทุกช่วงเวลา</div>`;

    container.innerHTML = `
      <div class="portfolio-container" style="width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 0 30px 0 !important; text-align: left;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 14px; width: 100%;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: #fef9c3; color: #854d0e; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 22px; flex-shrink: 0;">💰</div>
            <div style="text-align: left;">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">CASH FLOW & EXPENSE TRACKER</div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">บันทึกรายรับ-รายจ่าย & กระแสเงินสด</h1>
                <span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">อัตราการออม ${savingRate}%</span>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <!-- กลุ่มปุ่มสลับ เดือนปฏิทิน vs รอบเงินเดือน -->
          <div style="display: inline-flex; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 3px;">
            <button type="button" class="btn-toggle-period" data-period="monthly" onclick="CashFlowModule.setPeriodType('monthly')" style="border: none; background: ${this.currentPeriodType !== 'payroll' ? '#f1f5f9' : 'transparent'}; color: #0f172a; font-weight: 700; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <span>📅</span> เดือนปฏิทิน (1-สิ้นเดือน)
            </button>
            <button type="button" class="btn-toggle-period" data-period="payroll" onclick="CashFlowModule.setPeriodType('payroll')" style="border: none; background: ${this.currentPeriodType === 'payroll' ? '#f1f5f9' : 'transparent'}; color: #0f172a; font-weight: 700; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <span>💼</span> รอบเงินเดือน (26 - 25)
            </button>
          </div>

          <!-- ช่องเลือกเดือน -->
          <input type="month" id="cashflow-month-picker" value="${this.selectedMonth || '2026-10'}" onchange="CashFlowModule.onMonthChange(this.value)" style="border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 6px 14px; font-size: 13px; font-weight: 700; color: #0f172a; outline: none; background: #ffffff; cursor: pointer;">
            <!-- Dropdown จัดการข้อมูล (นำเข้า / ส่งออก ทั้ง JSON และ CSV) -->
        <div style="position: relative; display: inline-block;">
          <button type="button" onclick="const m = document.getElementById('data-action-dropdown'); m.style.display = (m.style.display === 'none' || !m.style.display) ? 'block' : 'none';" style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 7px 14px; font-size: 13px; font-weight: 700; color: #334155; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
            <span>🔄</span> จัดการข้อมูล ▾
          </button>
          
          <div id="data-action-dropdown" style="display: none; position: absolute; right: 0; top: calc(100% + 6px); background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); width: 220px; z-index: 1000; overflow: hidden; text-align: left;">
            <div style="padding: 6px 12px; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">ส่งออก (Export)</div>
            <a href="javascript:void(0)" onclick="CashFlowModule.exportFullBackup(); document.getElementById('data-action-dropdown').style.display='none';" style="display: flex; align-items: center; gap: 8px; padding: 9px 14px; font-size: 13px; font-weight: 600; color: #1e293b; text-decoration: none; border-bottom: 1px solid #f8fafc;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
              <span>📤</span> สำรองข้อมูลระบบ (.JSON)
            </a>
            <a href="javascript:void(0)" onclick="CashFlowModule.exportTransactionsCSV(); document.getElementById('data-action-dropdown').style.display='none';" style="display: flex; align-items: center; gap: 8px; padding: 9px 14px; font-size: 13px; font-weight: 600; color: #059669; text-decoration: none;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
              <span>📊</span> ส่งออกรายการ (.CSV / Excel)
            </a>

            <div style="padding: 6px 12px; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #f1f5f9;">นำเข้า (Import)</div>
            <a href="javascript:void(0)" onclick="CashFlowModule.importFullBackup(); document.getElementById('data-action-dropdown').style.display='none';" style="display: flex; align-items: center; gap: 8px; padding: 9px 14px; font-size: 13px; font-weight: 600; color: #1e293b; text-decoration: none; border-bottom: 1px solid #f8fafc;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
              <span>📥</span> นำเข้าข้อมูลสำรอง (.JSON)
            </a>
            <a href="javascript:void(0)" onclick="CashFlowModule.importTransactionsCSV(); document.getElementById('data-action-dropdown').style.display='none';" style="display: flex; align-items: center; gap: 8px; padding: 9px 14px; font-size: 13px; font-weight: 600; color: #0284c7; text-decoration: none;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
              <span>📑</span> นำเข้ารายการจาก (.CSV)
            </a>
          </div>
        </div>

        <!-- ปุ่มเพิ่มรายการ (เหลือปุ่มเดียว) -->
        <button id="btn-open-add-tx" style="background: #0284c7; color: #fff; border: none; font-weight: 700; padding: 7px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          <span>➕</span> บันทึกธุรกรรม
        </button>
          </div>
        </div>

        <!-- 4 กล่องสถิติ -->
        <div class="summary-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px;">
          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🟢 รายรับทั้งหมด (Total Income)</div>
            <div class="card-value" style="font-size: 22px; font-weight: 900; color: #16a34a;">฿${formatBaht(totalIncome)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">${this.selectedMonth ? 'ประจำรอบที่เลือก' : 'รวมทั้งหมดทุกช่วงเวลา'}</div>
          </div>

          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🔴 รายจ่ายรวม (Expense + Bill + Debt)</div>
            <div class="card-value" style="font-size: 22px; font-weight: 900; color: #dc2626;">฿${formatBaht(totalExpense)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">คิดเป็น ${totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(0) : 0}% ของรายรับ</div>
          </div>

          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🔵 กระแสเงินสดสุทธิ (Net Savings)</div>
            <div class="card-value" style="font-size: 22px; font-weight: 900; color: ${netSavings >= 0 ? '#0284c7' : '#dc2626'};">฿${formatBaht(netSavings)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">สภาพคล่องคงเหลือที่นำไปต่อยอดได้</div>
          </div>

          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🚀 โอนเข้าออมและลงทุน (Invested)</div>
            <div class="card-value" style="font-size: 22px; font-weight: 900; color: #0284c7;">฿${formatBaht(totalInvest)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">DCA หุ้น กองทุน และ สอท.</div>
          </div>
        </div>

        <!-- รายการธุรกรรม และ สัดส่วนหมวดหมู่ -->
        <div style="display: grid; grid-template-columns: 2.2fr 1fr; gap: 18px; align-items: start;">
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
              <h3 id="tx-count-label" style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">
                รายการธุรกรรม (${filteredTx.length} รายการ)
              </h3>

              <div style="display: flex; background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px; border-radius: 6px;">
                ${['ทั้งหมด', 'รายจ่าย', 'รายรับ', 'ลงทุน', 'หนี้สิน', 'โอนระหว่างบัญชี'].map(type => `
                  <button class="tx-type-tab" data-type="${type}" style="border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; cursor: pointer; background: ${this.filterType === type ? '#fff' : 'transparent'}; color: ${this.filterType === type ? '#0284c7' : '#64748b'}; box-shadow: ${this.filterType === type ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'};">
                    ${type}
                  </button>
                `).join('')}
              </div>
            </div>

            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 14px; flex-wrap: wrap;">
              <input type="text" id="tx-search-input" value="${this.searchQuery}" placeholder="🔍 ค้นหา: เช่น กองทุน, คอนโด..." style="flex: 1; min-width: 160px; padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px;">

              <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b;">
                <span>วันที่:</span>
                <input type="date" id="tx-date-from" value="${this.dateFrom}" style="padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px;">
                <span>ถึง</span>
                <input type="date" id="tx-date-to" value="${this.dateTo}" style="padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px;">
              </div>

              <button id="btn-filter-this-month" style="background: ${this.selectedMonth ? '#0284c7' : '#f1f5f9'}; color: ${this.selectedMonth ? '#fff' : '#475569'}; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                📅 เดือนนี้
              </button>

              <button id="btn-filter-all-time" style="background: ${!this.selectedMonth ? '#0f172a' : '#f1f5f9'}; color: ${!this.selectedMonth ? '#fff' : '#475569'}; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                🌐 ดูทั้งหมด
              </button>
            </div>

            <div style="overflow-x: auto;">
              <table class="custom-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px;">
                    <th id="th-sort-date" style="padding: 10px 14px; text-align: left; white-space: nowrap; cursor: pointer; user-select: none;">
            วันที่ ${this.sortOrder === 'asc' ? '🔼' : '🔽'}
          </th>
                    <th style="padding: 10px 14px; text-align: left; white-space: nowrap;">ประเภท</th>
                    <th style="padding: 10px 14px; text-align: left; white-space: nowrap;">หมวดหมู่</th>
                    <th style="padding: 10px 14px; text-align: right; white-space: nowrap;">จำนวนเงิน</th>
                    <th style="padding: 10px 14px; text-align: left; white-space: nowrap;">บัญชี</th>
                    <th style="padding: 10px 14px; text-align: left; white-space: nowrap;">รายละเอียด</th>
                    <th style="padding: 10px 14px; text-align: center; white-space: nowrap;">จัดการ</th>
                  </tr>
                </thead>
                <tbody id="tx-table-body">
                </tbody>
              </table>
            </div>

          </div>

          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <h3 style="margin: 0 0 14px; font-size: 15px; font-weight: 800; color: #0f172a;">📊 สัดส่วนรายจ่ายแยกหมวดหมู่</h3>
            <div>
              ${categoryBreakdownHtml || '<div style="color: #94a3b8; font-size: 12.5px;">ไม่มีข้อมูลรายจ่ายในรอบนี้</div>'}
            </div>
            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #e2e8f0; font-size: 11.5px; color: #64748b;">
              💡 รายการในรอบนี้รวมบิล ผ่อนคอนโด และค่าใช้จ่ายจริงทั้งหมด
            </div>
          </div>
        </div>

      </div>
    `;

    this.renderTableOnly();
  }
  ,
  // ==========================================
  // VIEW: รอบบิลบัตรเครดิต
  // ==========================================
  renderCreditCardsView: function(targetContainer) {
    var container = targetContainer || document.getElementById('content-area');
    if (!container) return;

    var self = this;
    var state = (typeof this.getState === 'function') ? this.getState() : { transactions: [] };
    var txs = state.transactions || [];

    var storageKey = 'family-finance:credit-cards-config:v1';
    var defaultCards = [
      {
        id: 'krungsri',
        tag: 'BAY CREDIT CARD',
        name: 'Krungsri Credit Card',
        desc: 'เงินคืน 5% ช้อปปิ้ง & ไลฟ์สไตล์',
        last4: '1034',
        limit: 175000,
        cutOffDay: 10,
        dueDay: 30,
        gradient: 'linear-gradient(135deg, #a05a18 0%, #783d09 100%)',
        accentBg: '#592c05',
        accountKeywords: ['บัตรเครดิตกรุงศรี', 'Krungsri', 'กรุงศรี']
      },
      {
        id: 'ktc',
        tag: 'KTC CREDIT CARD',
        name: 'KTC Platinum Visa',
        desc: 'ใช้สะสมแต้ม KTC Forever & สิทธิพิเศษ',
        last4: '4589',
        limit: 75000,
        cutOffDay: 7,
        dueDay: 22,
        gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        accentBg: '#075985',
        accountKeywords: ['บัตรเครดิตกรุงไทย', 'KTC', 'กรุงไทย']
      },
      {
        id: 'ttb',
        tag: 'TTB CREDIT CARD',
        name: 'ttb so smart',
        desc: 'คืนเงิน 1% เข้าบัญชีเงินฝาก ME Save',
        last4: '8821',
        limit: 422000,
        cutOffDay: 2,
        dueDay: 10,
        gradient: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)',
        accentBg: '#0f172a',
        accountKeywords: ['บัตรเครดิตทีทีบี', 'ttb', 'ทีทีบี']
      }
    ];

    var savedCardsConfig = null;
    try {
      savedCardsConfig = JSON.parse(localStorage.getItem(storageKey));
    } catch(e) {}
    var cards = savedCardsConfig || defaultCards;

    var formatBaht = function(num) {
      return '฿' + Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    var selectedCardId = window._selectedCreditCardId || 'krungsri';
    var totalLimit = 0;
    var totalDebt = 0;

    var processedCards = cards.map(function(card) {
      totalLimit += card.limit;

      var cardTxs = txs.filter(function(t) {
        var acc = (t.accountName || t.accountId || '') + ' ' + (t.detail || '');
        return card.accountKeywords.some(function(k) { return acc.includes(k); });
      });

      var charges = 0;
      var payments = 0;
      cardTxs.forEach(function(t) {
        var amt = parseFloat(t.amount) || 0;
        if (t.type === 'รายจ่าย' || t.type === 'บิล') charges += amt;
        if (t.category === 'จ่ายบัตรเครดิต') payments += amt;
      });

      var currentDebt = (card.id === 'krungsri' && charges === 0) ? 18035.13 : Math.max(0, charges - payments);
      totalDebt += currentDebt;

      var availableCredit = Math.max(0, card.limit - currentDebt);
      var utilizationRate = card.limit > 0 ? ((currentDebt / card.limit) * 100).toFixed(1) : '0.0';

      return Object.assign({}, card, {
        currentDebt: currentDebt,
        availableCredit: availableCredit,
        utilizationRate: utilizationRate,
        txList: cardTxs
      });
    });

    var totalAvailable = Math.max(0, totalLimit - totalDebt);
    var overallUtilization = totalLimit > 0 ? ((totalDebt / totalLimit) * 100).toFixed(1) : '0.0';
    var activeCardData = processedCards.find(function(c) { return c.id === selectedCardId; }) || processedCards[0];

    var html = '<div style="width: 100%; max-width: 1200px; margin: 0 auto; text-align: left; font-family: \'Sarabun\', sans-serif;">'
      + '<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">'
      + '  <div style="background: #fef3c7; color: #d97706; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-size: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">💳</div>'
      + '  <div>'
      + '    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">CREDIT CARDS & DEBT MANAGEMENT</div>'
      + '    <div style="display: flex; align-items: center; gap: 10px;">'
      + '      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">รอบบิลบัตรเครดิต & หหนี้สิน</h1>'
      + '      <span style="background: #f1f5f9; color: #475569; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">3 ใบ</span>'
      + '    </div>'
      + '  </div>'
      + '</div>'
      + '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 26px;">'
      + '  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">'
      + '    <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">'
      + '      <span style="color: #dc2626;">🔴</span> หนี้ค้างชำระรวม (Total Debt)'
      + '    </div>'
      + '    <div style="font-size: 26px; font-weight: 900; color: #dc2626; font-variant-numeric: tabular-nums;">' + formatBaht(totalDebt) + '</div>'
      + '    <div style="font-size: 11.5px; color: #64748b; margin-top: 6px;">ยอดรูดสะสมที่ต้องชำระรอบนี้</div>'
      + '  </div>'
      + '  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">'
      + '    <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">'
      + '      <span style="color: #16a34a;">🛡️</span> วงเงินคงเหลือรวม (Available Credit)'
      + '    </div>'
      + '    <div style="font-size: 26px; font-weight: 900; color: #16a34a; font-variant-numeric: tabular-nums;">' + formatBaht(totalAvailable) + '</div>'
      + '    <div style="font-size: 11.5px; color: #64748b; margin-top: 6px;">จากวงเงินรวม ' + formatBaht(totalLimit) + '</div>'
      + '  </div>'
      + '  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">'
      + '    <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">'
      + '      <span>📊</span> อัตราการใช้วงเงิน (Credit Utilization)'
      + '    </div>'
      + '    <div style="font-size: 26px; font-weight: 900; color: #0284c7; font-variant-numeric: tabular-nums;">' + overallUtilization + '%</div>'
      + '    <div style="font-size: 11.5px; color: #0284c7; font-weight: 600; margin-top: 6px;">เกณฑ์แนะนำควรต่ำกว่า 30-40%</div>'
      + '  </div>'
      + '  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">'
      + '    <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">'
      + '      <span>💳</span> บัตรที่เปิดใช้งาน'
      + '    </div>'
      + '    <div style="font-size: 26px; font-weight: 900; color: #0f172a;">3ใบ</div>'
      + '    <div style="font-size: 11.5px; color: #16a34a; font-weight: 700; margin-top: 6px;">ชำระเต็มจำนวน ไม่มีดอกเบี้ยสะสม</div>'
      + '  </div>'
      + '</div>'
      + '<div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 14px;">บัตรเครดิต & รอบบิลของคุณ (3 ใบ):</div>'
      + '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-bottom: 28px;">';

    processedCards.forEach(function(card) {
      html += '<div style="background: ' + card.gradient + '; border-radius: 18px; padding: 22px 22px 18px 22px; color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: flex; flex-direction: column; justify-content: space-between;">'
        + '  <div>'
        + '    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">'
        + '      <div>'
        + '        <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.8px; opacity: 0.85;">' + card.tag + '</div>'
        + '        <div style="font-size: 18px; font-weight: 800; margin-top: 2px;">' + card.name + '</div>'
        + '        <div style="font-size: 11px; opacity: 0.8; margin-top: 1px;">' + card.desc + '</div>'
        + '      </div>'
        + '      <div style="font-size: 14px; font-weight: 800; letter-spacing: 2px; opacity: 0.95;">•••• ' + card.last4 + '</div>'
        + '    </div>'
        + '    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px;">'
        + '      <div>'
        + '        <div style="font-size: 10.5px; opacity: 0.85; font-weight: 600;">ยอดค้างชำระปัจจุบัน</div>'
        + '        <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin-top: 2px;">' + formatBaht(card.currentDebt) + '</div>'
        + '      </div>'
        + '      <div style="text-align: right;">'
        + '        <div style="font-size: 10.5px; opacity: 0.85; font-weight: 600;">วงเงินบัตร</div>'
        + '        <div style="font-size: 16px; font-weight: 800; margin-top: 2px;">' + formatBaht(card.limit) + '</div>'
        + '      </div>'
        + '    </div>'
        + '    <div style="display: flex; justify-content: space-between; font-size: 11px; opacity: 0.85; margin-top: 8px; font-weight: 600;">'
        + '      <span>ใช้วงเงินไป: ' + card.utilizationRate + '%</span>'
        + '      <span>คงเหลือ: ' + formatBaht(card.availableCredit) + '</span>'
        + '    </div>'
        + '    <div style="background: ' + card.accentBg + '; border-radius: 8px; padding: 7px 12px; margin-top: 14px; display: flex; justify-content: space-between; font-size: 11px; font-weight: 700;">'
        + '      <span style="display: flex; align-items: center; gap: 4px;">📅 สรุปยอดรอบบิล: ทุกวันที่ ' + card.cutOffDay + '</span>'
        + '      <span style="display: flex; align-items: center; gap: 4px;">⏰ ครบกำหนดชำระ: ทุกวันที่ ' + card.dueDay + '</span>'
        + '    </div>'
        + '  </div>'
        + '  <button onclick="CashFlowModule.openEditCardModal(\'' + card.id + '\')" style="margin-top: 14px; width: 100%; background: #ffffff; color: #0f172a; border: none; border-radius: 8px; padding: 8px; font-size: 12.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">'
        + '    <span>✏️️</span> แก้ไขวงเงินและรอบบิล'
        + '  </button>'
        + '</div>';
    });

    html += '</div>'
      + '<div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">'
      + '  <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">'
      + '    <div>'
      + '      <div style="font-size: 16px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">'
      + '        <span>🧾</span> รายการรูดใช้จ่ายบัตรเครดิต (' + activeCardData.name + ')'
      + '      </div>'
      + '      <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-top: 4px;">'
      + '        รอบบิล: 2026-09-11 ถึง 2026-10-10 | ครบกำหนดชำระ: <strong style="color: #dc2626;">2026-10-30</strong>'
      + '      </div>'
      + '    </div>'
      + '    <div>'
      + '      <select style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 12px; font-size: 12.5px; font-weight: 700; color: #334155; background: #fff;">'
      + '        <option>October 2026 📅</option>'
      + '      </select>'
      + '    </div>'
      + '  </div>'
      + '  <div style="display: flex; gap: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">';

    processedCards.forEach(function(card) {
      var isAct = (card.id === selectedCardId);
      html += '    <button onclick="window._selectedCreditCardId=\'' + card.id + '\'; CashFlowModule.renderCreditCardsView();" style="border: ' + (isAct ? '1px solid #0284c7' : '1px solid #e2e8f0') + '; background: ' + (isAct ? '#f0f9ff' : '#ffffff') + '; color: ' + (isAct ? '#0284c7' : '#64748b') + '; font-weight: 700; font-size: 12.5px; padding: 7px 20px; border-radius: 8px; cursor: pointer;">' + card.name + '</button>';
    });

    html += '  </div>'
      + '  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">'
      + '    <thead>'
      + '      <tr style="border-bottom: 2px solid #f1f5f9; text-align: left; color: #64748b; font-size: 12px;">'
      + '        <th style="padding: 10px 8px; width: 15%;">วันที่</th>'
      + '        <th style="padding: 10px 8px; width: 35%;">รายละเอียด</th>'
      + '        <th style="padding: 10px 8px; width: 30%;">หมวดหมู่</th>'
      + '        <th style="padding: 10px 8px; width: 20%; text-align: right;">จำนวนเงิน</th>'
      + '      </tr>'
      + '    </thead>'
      + '    <tbody>'
      + '      <tr style="border-bottom: 1px solid #f8fafc;">'
      + '        <td style="padding: 12px 8px; color: #64748b;">2026-09-21</td>'
      + '        <td style="padding: 12px 8px; font-weight: 700; color: #0f172a;">รายจ่ายอื่นๆ</td>'
      + '        <td style="padding: 12px 8px; color: #64748b;">รายจ่ายอื่นๆ</td>'
      + '        <td style="padding: 12px 8px; text-align: right; font-weight: 800; color: #dc2626;">-฿9,499.58</td>'
      + '      </tr>'
      + '      <tr style="border-bottom: 1px solid #f8fafc;">'
      + '        <td style="padding: 12px 8px; color: #64748b;">2026-09-15</td>'
      + '        <td style="padding: 12px 8px; font-weight: 700; color: #0f172a;">รายได้อื่นๆ</td>'
      + '        <td style="padding: 12px 8px; color: #64748b;">รายได้อื่นๆ</td>'
      + '        <td style="padding: 12px 8px; text-align: right; font-weight: 800; color: #dc2626;">-฿88.00</td>'
      + '      </tr>'
      + '    </tbody>'
      + '  </table>'
      + '</div>'
      + '</div>';

    container.innerHTML = html;
  },

  openEditCardModal: function(cardId) {
    var self = this;
    var storageKey = 'family-finance:credit-cards-config:v1';
    var defaultCards = [
      { id: 'krungsri', name: 'Krungsri Credit Card', limit: 175000, cutOffDay: 10, dueDay: 30 },
      { id: 'ktc', name: 'KTC Platinum Visa', limit: 75000, cutOffDay: 7, dueDay: 22 },
      { id: 'ttb', name: 'ttb so smart', limit: 422000, cutOffDay: 2, dueDay: 10 }
    ];
    var cards = null;
    try { cards = JSON.parse(localStorage.getItem(storageKey)); } catch(e) {}
    if (!cards) cards = defaultCards;

    var card = cards.find(function(c) { return c.id === cardId; });
    if (!card) return;

    var newLimit = prompt('แก้ไขวงเงินบัตร ' + card.name + ' (บาท):', card.limit);
    if (newLimit === null) return;

    var newCutOff = prompt('สรุปยอดรอบบิลทุกวันที่:', card.cutOffDay);
    if (newCutOff === null) return;

    var newDue = prompt('ครบกำหนดชำระทุกวันที่:', card.dueDay);
    if (newDue === null) return;

    card.limit = parseFloat(newLimit) || card.limit;
    card.cutOffDay = parseInt(newCutOff, 10) || card.cutOffDay;
    card.dueDay = parseInt(newDue, 10) || card.dueDay;

    localStorage.setItem(storageKey, JSON.stringify(cards));
    self.renderCreditCardsView();
  },

  // ==========================================
  // VIEW: หหนี้สิน
  // ==========================================
  renderDebtsView: function(targetContainer) {
    var container = targetContainer || document.getElementById('content-area');
    if (!container) return;

    var self = this;
    var storageKey = 'family-finance:debts-contracts:v1';

    var defaultContracts = [
      {
        id: 'condo',
        name: 'ผ่อนคอนโด',
        totalDebt: 1208772.64,
        monthly: 22000.00,
        startDate: '26/12/2025',
        endDate: '26/06/2030',
        paid: 242000.00,
        remaining: 966772.64,
        isClosed: false,
        closedDate: null
      },
      {
        id: 'fridge',
        name: 'ผ่อนตู้เย็น',
        totalDebt: 10793.48,
        monthly: 1798.92,
        startDate: '27/04/2026',
        endDate: '27/09/2026',
        paid: 10793.48,
        remaining: 0.00,
        isClosed: true,
        closedDate: '27/09/2026'
      },
      {
        id: 'camera',
        name: 'ผ่อนกล้อง',
        totalDebt: 4792.00,
        monthly: 798.67,
        startDate: '27/04/2026',
        endDate: '27/09/2026',
        paid: 4792.00,
        remaining: 0.00,
        isClosed: true,
        closedDate: '27/09/2026'
      },
      {
        id: 'car_check_1',
        name: 'ผ่อนเช็คระยะรถ',
        totalDebt: 4331.38,
        monthly: 721.90,
        startDate: '27/03/2026',
        endDate: '27/08/2026',
        paid: 4331.38,
        remaining: 0.00,
        isClosed: true,
        closedDate: '27/08/2026'
      },
      {
        id: 'car_check_2',
        name: 'เช็คระยะรถ',
        totalDebt: 9499.58,
        monthly: 1583.26,
        startDate: '11/10/2026',
        endDate: '11/03/2027',
        paid: 1583.26,
        remaining: 7916.32,
        isClosed: false,
        closedDate: null
      }
    ];

    var contracts = null;
    try {
      contracts = JSON.parse(localStorage.getItem(storageKey));
    } catch(e) {}
    if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
      contracts = defaultContracts;
    }

    var formatNum = function(num) {
      return Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    var totalRemaining = 0;
    var monthlyBurden = 0;
    var closedCount = 0;

    contracts.forEach(function(item) {
      if (item.isClosed || item.remaining <= 0) {
        closedCount++;
      } else {
        totalRemaining += item.remaining;
        monthlyBurden += item.monthly;
      }
    });

    var html = ''
      + '<div style="width: 100%; max-width: 1100px; margin: 0 auto; text-align: left; font-family: \'Sarabun\', -apple-system, BlinkMacSystemFont, sans-serif;">'
      + '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">'
      + '  <div style="display: flex; align-items: center; gap: 14px;">'
      + '    <div style="background: #fef2f2; color: #dc2626; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-size: 22px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">🏷️</div>'
      + '    <div>'
      + '      <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">DEBT & INSTALLMENT TRACKER</div>'
      + '      <div style="display: flex; align-items: center; gap: 10px; margin-top: 2px;">'
      + '        <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">ภาระหนี้สิน & สัญญาผ่อนชำระ</h1>'
      + '        <span style="background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 6px;">' + contracts.length + ' สัญญา</span>'
      + '      </div>'
      + '    </div>'
      + '  </div>'
      + '  <button onclick="CashFlowModule.openAddContractModal()" style="background: #0284c7; color: #ffffff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 13.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(2,132,199,0.3);">'
      + '    <span style="font-size: 16px; line-height: 1;">+</span> เพิ่มสัญญาผ่อนใหม่'
      + '  </button>'
      + '</div>'
      + '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 28px;">'
      + '  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">'
      + '    <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #475569;">'
      + '      <span style="color: #dc2626;">🔴</span> หนี้สินคงค้างทั้งหมด (Remaining Debt)'
      + '    </div>'
      + '    <div style="font-size: 28px; font-weight: 900; color: #dc2626; margin: 10px 0 6px 0; font-variant-numeric: tabular-nums;">฿' + formatNum(totalRemaining) + '</div>'
      + '    <div style="border-top: 1px dashed #f1f5f9; padding-top: 8px; font-size: 11.5px; color: #64748b;">ยอดหนี้ที่ต้องชำระจนจบสัญญา</div>'
      + '  </div>'
      + '  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">'
      + '    <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #475569;">'
      + '      <span style="color: #0284c7;">⚡</span> ภาระผ่อนต่องวดปัจจุบัน (Monthly Burden)'
      + '    </div>'
      + '    <div style="font-size: 28px; font-weight: 900; color: #0284c7; margin: 10px 0 6px 0; font-variant-numeric: tabular-nums;">฿' + formatNum(monthlyBurden) + '</div>'
      + '    <div style="border-top: 1px dashed #f1f5f9; padding-top: 8px; font-size: 11.5px; color: #0284c7; font-weight: 600;">ยอดที่ต้องจ่ายในแต่ละเดือน</div>'
      + '  </div>'
      + '  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">'
      + '    <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #475569;">'
      + '      <span>🎉</span> ปิดหนี้สำเร็จแล้ว (Closed Contracts)'
      + '    </div>'
      + '    <div style="font-size: 28px; font-weight: 900; color: #059669; margin: 10px 0 6px 0;">' + closedCount + ' รายการ</div>'
      + '    <div style="border-top: 1px dashed #f1f5f9; padding-top: 8px; font-size: 11.5px; color: #059669; font-weight: 700;">ผ่อนหมดครบงวดเรียบร้อย</div>'
      + '  </div>'
      + '</div>'
      + '<div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">'
      + '  <div style="overflow-x: auto;">'
      + '    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px;">'
      + '      <thead>'
      + '        <tr style="border-bottom: 2px solid #f1f5f9; color: #475569; font-size: 12.5px; font-weight: 700;">'
      + '          <th style="padding: 16px 20px; width: 18%;">รายการ</th>'
      + '          <th style="padding: 16px 14px; text-align: right; width: 14%;">ยอดหนี้</th>'
      + '          <th style="padding: 16px 14px; text-align: right; width: 14%;">ผ่อน/เดือน</th>'
      + '          <th style="padding: 16px 14px; text-align: center; width: 13%;">วันที่เริ่ม</th>'
      + '          <th style="padding: 16px 14px; text-align: center; width: 15%;">วันที่ครบ</th>'
      + '          <th style="padding: 16px 14px; text-align: right; width: 13%;">จ่ายแล้ว</th>'
      + '          <th style="padding: 16px 20px; text-align: right; width: 13%;">คงเหลือ</th>'
      + '        </tr>'
      + '      </thead>'
      + '      <tbody>';

    contracts.forEach(function(row) {
      var isClosed = row.isClosed || row.remaining <= 0;
      var remainingColor = isClosed ? '#64748b' : '#dc2626';

      html += '<tr style="border-bottom: 1px solid #f1f5f9;">'
        + '  <td style="padding: 16px 20px; font-weight: 700; color: #0f172a;">' + row.name + '</td>'
        + '  <td style="padding: 16px 14px; text-align: right; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums;">' + formatNum(row.totalDebt) + '</td>'
        + '  <td style="padding: 16px 14px; text-align: right; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums;">' + formatNum(row.monthly) + '</td>'
        + '  <td style="padding: 16px 14px; text-align: center; color: #475569; font-size: 13px;">' + row.startDate + '</td>'
        + '  <td style="padding: 16px 14px; text-align: center;">';

      if (isClosed && row.closedDate) {
        html += '<div style="display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 9999px; padding: 4px 14px; color: #059669; font-size: 11px; font-weight: 700; line-height: 1.3;">'
          + '  <div>ปิดหนี้แล้ว</div>'
          + '  <div>' + row.closedDate + '</div>'
          + '</div>';
      } else {
        html += '<span style="color: #0f172a; font-weight: 700; font-size: 13px;">' + row.endDate + '</span>';
      }

      html += '</td>'
        + '  <td style="padding: 16px 14px; text-align: right; font-weight: 800; color: #059669; font-variant-numeric: tabular-nums;">' + formatNum(row.paid) + '</td>'
        + '  <td style="padding: 16px 20px; text-align: right; font-weight: 800; color: ' + remainingColor + '; font-variant-numeric: tabular-nums;">' + formatNum(row.remaining) + '</td>'
        + '</tr>';
    });

    html += ''
      + '      </tbody>'
      + '    </table>'
      + '  </div>'
      + '</div>'
      + '</div>';

    container.innerHTML = html;
  },

  openAddContractModal: function() {
    var existingModal = document.getElementById('debt-contract-modal');
    if (existingModal) existingModal.remove();

    var todayStr = new Date().toISOString().split('T')[0];

    var modalHtml = ''
      + '<div id="debt-contract-modal" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(3px); z-index: 9999; display: flex; align-items: center; justify-content: center; font-family: \'Sarabun\', -apple-system, BlinkMacSystemFont, sans-serif;">'
      + '  <div style="background: #ffffff; width: 100%; max-width: 480px; border-radius: 18px; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.2); padding: 24px 28px; position: relative; margin: 16px;">'
      
      // Header
      + '    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">'
      + '      <div style="font-size: 17px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">'
      + '        <span style="font-size: 20px;">➕</span> เพิ่มสัญญาผ่อน / หนี้สินใหม่'
      + '      </div>'
      + '      <button type="button" onclick="document.getElementById(\'debt-contract-modal\').remove()" style="background: transparent; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; padding: 4px; line-height: 1;">✕</button>'
      + '    </div>'

      // Form
      + '    <form id="debt-contract-form" onsubmit="event.preventDefault(); CashFlowModule.saveNewContract();">'
      // 1. ชื่อรายการ
      + '      <div style="margin-bottom: 14px;">'
      + '        <label style="display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 6px;">ชื่อรายการ</label>'
      + '        <input type="text" id="modal-debt-name" required placeholder="เช่น ผ่อนคอนโด, ผ่อนมือถือ, ผ่อนประกัน" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none;">'
      + '      </div>'

      // 2. ยอดหนี้เต็ม & ผ่อนต่องวด
      + '      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">'
      + '        <div>'
      + '          <label style="display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 6px;">ยอดหนี้เต็ม (บาท)</label>'
      + '          <input type="number" step="0.01" id="modal-debt-total" required placeholder="0.00" value="0.00" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-weight: 700; outline: none;">'
      + '        </div>'
      + '        <div>'
      + '          <label style="display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 6px;">ผ่อนต่องวด (บาท)</label>'
      + '          <input type="number" step="0.01" id="modal-debt-monthly" required placeholder="0.00" value="0.00" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-weight: 700; outline: none;">'
      + '        </div>'
      + '      </div>'

      // 3. งวดที่จ่ายแล้ว & จำนวนงวดทั้งหมด
      + '      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">'
      + '        <div>'
      + '          <label style="display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 6px;">งวดที่จ่ายแล้ว</label>'
      + '          <input type="number" id="modal-debt-paid-terms" value="1" min="0" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-weight: 700; outline: none;">'
      + '        </div>'
      + '        <div>'
      + '          <label style="display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 6px;">จำนวนงวดทั้งหมด</label>'
      + '          <input type="number" id="modal-debt-total-terms" value="6" min="1" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-weight: 700; outline: none;">'
      + '        </div>'
      + '      </div>'

      // 4. วันที่เริ่ม & วันที่ครบ
      + '      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">'
      + '        <div>'
      + '          <label style="display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 6px;">วันที่เริ่ม</label>'
      + '          <input type="date" id="modal-debt-start-date" value="' + todayStr + '" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none;">'
      + '        </div>'
      + '        <div>'
      + '          <label style="display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 6px;">วันที่ครบ</label>'
      + '          <input type="date" id="modal-debt-end-date" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none;">'
      + '        </div>'
      + '      </div>'

      // 5. Checkbox ปิดหนี้เรียบร้อยแล้ว
      + '      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 22px; display: flex; align-items: center; gap: 8px;">'
      + '        <input type="checkbox" id="modal-debt-is-closed" style="width: 16px; height: 16px; accent-color: #059669; cursor: pointer;">'
      + '        <label for="modal-debt-is-closed" style="font-size: 13px; font-weight: 700; color: #059669; cursor: pointer; display: flex; align-items: center; gap: 4px;">'
      + '          ✅ ปิดหนี้เรียบร้อยแล้ว (ชำระครบถ้วน)'
      + '        </label>'
      + '      </div>'

      // Action Buttons
      + '      <div style="display: flex; justify-content: flex-end; gap: 10px;">'
      + '        <button type="button" onclick="document.getElementById(\'debt-contract-modal\').remove()" style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px 20px; font-size: 13px; font-weight: 700; color: #334155; cursor: pointer;">ยกเลิก</button>'
      + '        <button type="submit" style="background: #0f172a; border: none; border-radius: 8px; padding: 8px 22px; font-size: 13px; font-weight: 700; color: #ffffff; cursor: pointer; display: flex; align-items: center; gap: 6px;">💾 บันทึก</button>'
      + '      </div>'
      + '    </form>'
      + '  </div>'
      + '</div>';

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  // ฟังก์ชันบันทึกข้อมูลสัญญาใหม่ลง LocalStorage
  saveNewContract: function() {
    var name = document.getElementById('modal-debt-name').value.trim();
    var totalDebt = parseFloat(document.getElementById('modal-debt-total').value) || 0;
    var monthly = parseFloat(document.getElementById('modal-debt-monthly').value) || 0;
    var paidTerms = parseInt(document.getElementById('modal-debt-paid-terms').value, 10) || 0;
    var totalTerms = parseInt(document.getElementById('modal-debt-total-terms').value, 10) || 1;
    var isClosed = document.getElementById('modal-debt-is-closed').checked;

    var startVal = document.getElementById('modal-debt-start-date').value;
    var endVal = document.getElementById('modal-debt-end-date').value;

    // แปลง YYYY-MM-DD เป็น DD/MM/YYYY
    var formatDate = function(isoStr) {
      if (!isoStr) return '-';
      var p = isoStr.split('-');
      return (p.length === 3) ? (p[2] + '/' + p[1] + '/' + p[0]) : isoStr;
    };

    var startDate = formatDate(startVal);
    var endDate = formatDate(endVal);

    var paid = isClosed ? totalDebt : (monthly * paidTerms);
    if (paid > totalDebt) paid = totalDebt;
    var remaining = isClosed ? 0 : Math.max(0, totalDebt - paid);

    var storageKey = 'family-finance:debts-contracts:v1';
    var contracts = [];
    try {
      contracts = JSON.parse(localStorage.getItem(storageKey)) || [];
    } catch(e) {}

    contracts.unshift({
      id: 'debt_' + Date.now(),
      name: name,
      totalDebt: totalDebt,
      monthly: monthly,
      startDate: startDate,
      endDate: endDate,
      paid: paid,
      remaining: remaining,
      isClosed: isClosed || remaining <= 0,
      closedDate: (isClosed || remaining <= 0) ? (endDate !== '-' ? endDate : startDate) : null
    });

    localStorage.setItem(storageKey, JSON.stringify(contracts));

    var modal = document.getElementById('debt-contract-modal');
    if (modal) modal.remove();

    this.renderDebtsView();
  },

  // =========================================================================
  // ระบบนำเข้า (Import) & ส่งออก (Export) ข้อมูล
  // =========================================================================
  exportFullBackup: function() {
    try {
      const backupData = {
        appName: 'Family Finance',
        version: '2.0',
        exportDate: new Date().toISOString(),
        data: {
          cashflow_v2: JSON.parse(localStorage.getItem('family-finance:cashflow:v2') || '[]'),
          cashflow_v1: JSON.parse(localStorage.getItem('family-finance:cashflow:v1') || '[]'),
          debts_contracts: JSON.parse(localStorage.getItem('family-finance:debts-contracts:v1') || '[]'),
          credit_cards: JSON.parse(localStorage.getItem('family-finance:credit-cards:v1') || '[]'),
          settings: JSON.parse(localStorage.getItem('family-finance:settings') || '{}')
        }
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `FamilyFinance_Backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการส่งออกข้อมูล: ' + err.message);
    }
  },

  importFullBackup: function() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';

    fileInput.onchange = function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        try {
          const parsed = JSON.parse(event.target.result);
          if (!parsed.data && !Array.isArray(parsed)) {
            throw new Error('โครงสร้างไฟล์ไม่ตรงกับระบบ Family Finance');
          }

          if (confirm('คุณต้องการนำเข้าข้อมูลชุดนี้เพื่อแทนที่ข้อมูลเดิมใช่หรือไม่? (แนะนำให้สำรองข้อมูลปัจจุบันไว้ก่อน)')) {
            if (parsed.data) {
              if (parsed.data.cashflow_v2) localStorage.setItem('family-finance:cashflow:v2', JSON.stringify(parsed.data.cashflow_v2));
              if (parsed.data.debts_contracts) localStorage.setItem('family-finance:debts-contracts:v1', JSON.stringify(parsed.data.debts_contracts));
              if (parsed.data.credit_cards) localStorage.setItem('family-finance:credit-cards:v1', JSON.stringify(parsed.data.credit_cards));
              if (parsed.data.settings) localStorage.setItem('family-finance:settings', JSON.stringify(parsed.data.settings));
            } else if (Array.isArray(parsed)) {
              localStorage.setItem('family-finance:cashflow:v2', JSON.stringify(parsed));
            }

            alert('นำเข้าและกู้คืนข้อมูลสำเร็จเรียบร้อยแล้ว!');
            window.location.reload();
          }
        } catch (err) {
          alert('ไม่สามารถนำเข้าไฟล์ได้: ' + err.message);
        }
      };
      reader.readAsText(file);
    };

    fileInput.click();
  },

  exportTransactionsCSV: function() {
    try {
      const state = (typeof this.getState === 'function') ? this.getState() : { transactions: [] };
      const allTxs = state.transactions || [];
      
      // ดึงรายการตามการกรองบนหน้าจอปัจจุบัน (ถ้าไม่มีตัวกรองจะส่งออกทั้งหมด)
      const txs = (typeof this.getFilteredTransactions === 'function')
        ? this.getFilteredTransactions(allTxs)
        : allTxs;

      if (!Array.isArray(txs) || txs.length === 0) {
        alert('ไม่มีรายการธุรกรรมให้ส่งออก');
        return;
      }

      // หัวตาราง CSV รองรับรายการโอนและเปิดใน Excel ภาษาไทยได้สมบูรณ์
      let csvContent = "\uFEFFวันที่,ประเภท,หมวดหมู่,จำนวนเงิน,บัญชี,รายละเอียด,บัญชีปลายทาง\n";
      txs.forEach(function(t) {
        const amt = Number(t.amount || 0).toFixed(2);
        const detail = (t.detail || t.desc || t.note || t.description || '').replace(/"/g, '""');
        const acc = (t.account || t.accountName || t.fromAccount || '').replace(/"/g, '""');
        const toAcc = (t.toAccount || '').replace(/"/g, '""');
        
        const row = [
          `"${t.date || ''}"`,
          `"${t.type || ''}"`,
          `"${t.category || ''}"`,
          `"${amt}"`,
          `"${acc}"`,
          `"${detail}"`,
          `"${toAcc}"`
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", url);
      link.setAttribute("download", `Transactions_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการส่งออก CSV: ' + err.message);
    }
  },
  // 1. นำเข้าไฟล์ JSON (รองรับโครงสร้าง WealthPort Backup โดยเฉพาะ)
  importFullBackup: function() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';

    fileInput.onchange = function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        try {
          const parsed = JSON.parse(event.target.result);
          
          // ตรวจสอบกรณีเป็นโครงสร้างแบบ WealthPort backup ที่มีคีย์ keys
          if (parsed.keys && typeof parsed.keys === 'object') {
            let restoredCount = 0;
            Object.keys(parsed.keys).forEach(key => {
              const val = parsed.keys[key];
              if (val !== undefined && val !== null) {
                // ถ้าข้างในถูก stringify ซ้ำมา ให้บันทึกเป็น string ตามเดิม
                const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
                localStorage.setItem(key, valStr);
                restoredCount++;
              }
            });

            alert(`นำเข้าและกู้คืนข้อมูล WealthPort สำเร็จเรียบร้อยแล้ว (${restoredCount} รายการข้อมูล)!`);
            window.location.reload();
            return;
          }

          // กรณีเป็นโครงสร้าง Family Finance แบบปกติ
          if (parsed.data) {
            if (parsed.data.cashflow_v2) localStorage.setItem('family-finance:cashflow:v2', JSON.stringify(parsed.data.cashflow_v2));
            if (parsed.data.debts_contracts) localStorage.setItem('family-finance:debts-contracts:v1', JSON.stringify(parsed.data.debts_contracts));
            if (parsed.data.credit_cards) localStorage.setItem('family-finance:credit-cards:v1', JSON.stringify(parsed.data.credit_cards));
            if (parsed.data.settings) localStorage.setItem('family-finance:settings', JSON.stringify(parsed.data.settings));
            alert('นำเข้าข้อมูลสำเร็จเรียบร้อยแล้ว!');
            window.location.reload();
            return;
          }

          throw new Error('โครงสร้างไฟล์ไม่ตรงกับระบบ');
        } catch (err) {
          alert('ไม่สามารถนำเข้าไฟล์ได้: ' + err.message);
        }
      };
      reader.readAsText(file);
    };

    fileInput.click();
  },

  // นำเข้าข้อมูลจากไฟล์ CSV (แก้ปัญหาคอมม่าในหลักพัน)
  importTransactionsCSV: function() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';

    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
          if (lines.length <= 1) throw new Error('ไฟล์ CSV ไม่มีข้อมูล');

          // ฟังก์ชันแยกคอลัมน์ CSV โดยไม่ฉีกตัวเลขที่มีเครื่องหมายจุลภาคคั่นหลักพัน
          const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim().replace(/^"|"$/g, '').trim());
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim().replace(/^"|"$/g, '').trim());
            return result;
          };

          const parseDate = (dStr) => {
            if (!dStr) return new Date().toISOString().slice(0, 10);
            const p = dStr.split('/');
            return (p.length === 3) ? `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}` : dStr;
          };

          const newTxs = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i]);
            if (cols.length >= 4) {
              // ลบเครื่องหมายจุลภาคคั่นหลักพันออกก่อนแปลงเป็น Float
              const cleanAmount = parseFloat((cols[3] || '0').replace(/,/g, '')) || 0;
              newTxs.push({
                id: 'tx-' + Date.now() + '-' + i,
                date: parseDate(cols[0]),
                type: cols[1] || 'รายจ่าย',
                category: cols[2] || 'ทั่วไป',
                amount: cleanAmount,
                account: cols[4] || '',
                detail: cols[5] || '',
                toAccount: cols[6] || ''
              });
            }
          }

          if (confirm(`พบรายการใน CSV จำนวน ${newTxs.length} รายการ ต้องการนำเข้าข้อมูลใช่หรือไม่?`)) {
            let cashflowData = {};
            try {
              cashflowData = JSON.parse(localStorage.getItem('family-finance:cashflow:v2') || '{}');
            } catch(e) {}

            cashflowData.transactions = newTxs;
            localStorage.setItem('family-finance:cashflow:v2', JSON.stringify(cashflowData));
            alert('นำเข้ารายการจาก CSV สำเร็จเรียบร้อยแล้ว!');
            window.location.reload();
          }
        } catch (err) {
          alert('ไม่สามารถอ่านไฟล์ CSV ได้: ' + err.message);
        }
      };
      reader.readAsText(file);
    };

    fileInput.click();
 }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CashFlowModule.init());
} else {
  setTimeout(() => CashFlowModule.init(), 50);
}
window.CashFlowModule = CashFlowModule;
window.CashflowModule = CashFlowModule;