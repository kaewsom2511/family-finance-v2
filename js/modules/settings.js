/**
 * js/modules/settings.js
 * System Settings & Financial Category / Account Management Module
 * - รองรับ 21 บัญชีมาตรฐาน พร้อมสี Badge ธนาคารตรงกัน
 * - รองรับ Inline Edit ในการ์ดหมวดหมู่ย่อย
 */

var SettingsModule = {
  categoriesStorageKey: 'family-finance:categories:v1',
  accountsStorageKey: 'family-finance:master-accounts:v1',
  activeTab: 'categories', // 'categories' หรือ 'accounts'
  activeCategoryGroup: 'เงินออมและลงทุน',
  editingCategoryName: null,

  defaultCategories: {
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
    ]
  },

  // 21 บัญชีมาตรฐานตามภาพเดิม
  defaultAccounts: [
    { id: 'acc-1', name: 'เงินสด', type: 'เงินสด' },
    { id: 'acc-2', name: 'กรุงเทพ', type: 'ธนาคาร' },
    { id: 'acc-3', name: 'กรุงไทย', type: 'ธนาคาร' },
    { id: 'acc-4', name: 'ทหารไทย', type: 'ธนาคาร' },
    { id: 'acc-5', name: 'ไทยพาณิชย์', type: 'ธนาคาร' },
    { id: 'acc-6', name: 'ธกส.', type: 'ธนาคาร' },
    { id: 'acc-7', name: 'กสิกรไทย', type: 'ธนาคาร' },
    { id: 'acc-8', name: 'ออมสิน', type: 'ธนาคาร' },
    { id: 'acc-9', name: 'เป๋าตัง', type: 'กระเป๋าเงิน' },
    { id: 'acc-10', name: 'Truemoney', type: 'กระเป๋าเงิน' },
    { id: 'acc-11', name: 'ออมทรัพย์ สอท', type: 'สหกรณ์' },
    { id: 'acc-12', name: 'Dime! Save (3%)', type: 'ดิจิทัล' },
    { id: 'acc-13', name: 'K-eSavings', type: 'ดิจิทัล' },
    { id: 'acc-14', name: 'SCB ออมทรัพย์', type: 'ธนาคาร' },
    { id: 'acc-15', name: 'ทุนเรือนหุ้น สอท', type: 'สหกรณ์' },
    { id: 'acc-16', name: 'กองทุนสำรองเลี้ยงชีพ', type: 'กองทุน' },
    { id: 'acc-17', name: 'พอร์ต BLS', type: 'พอร์ตหุ้น' },
    { id: 'acc-18', name: 'Finnomena', type: 'พอร์ตกองทุน' },
    { id: 'acc-19', name: 'บัตรเครดิตกรุงศรี', type: 'บัตรเครดิต' },
    { id: 'acc-20', name: 'บัตรเครดิตกรุงไทย', type: 'บัตรเครดิต' },
    { id: 'acc-21', name: 'บัตรเครดิตทีทีบี', type: 'บัตรเครดิต' }
  ],

  init() {
    this.bindEvents();
    this.render();
  },

  getCategories() {
    try {
      const data = localStorage.getItem(this.categoriesStorageKey);
      if (data) return JSON.parse(data);
    } catch(e) {}
    return this.defaultCategories;
  },

  saveCategories(cats) {
    try {
      localStorage.setItem(this.categoriesStorageKey, JSON.stringify(cats));
    } catch(e) {}
  },

  getAccounts() {
    try {
      const data = localStorage.getItem(this.accountsStorageKey);
      if (data) return JSON.parse(data);
    } catch(e) {}
    return this.defaultAccounts;
  },

  saveAccounts(accs) {
    try {
      localStorage.setItem(this.accountsStorageKey, JSON.stringify(accs));
    } catch(e) {}
  },

  getBankBadge(name = '', type = '') {
    const n = name.toLowerCase();
    if (n.includes('เงินสด')) return { code: 'CASH', bg: '#059669' };
    if (n.includes('กรุงเทพ') || n.includes('bbl')) return { code: 'BBL', bg: '#1e3a8a' };
    if (n.includes('กรุงไทย') && n.includes('บัตร')) return { code: 'KTC', bg: '#0284c7' };
    if (n.includes('กรุงไทย') || n.includes('ktb') || n.includes('next')) return { code: 'KTB', bg: '#00a3e0' };
    if (n.includes('ทหารไทย') || n.includes('ttb') || n.includes('ทีทีบี')) return { code: 'TTB', bg: '#002d62' };
    if (n.includes('ไทยพาณิชย์') || n.includes('scb')) return { code: 'SCB', bg: '#4c1d95' };
    if (n.includes('ธกส') || n.includes('baac')) return { code: 'BAAC', bg: '#064e3b' };
    if (n.includes('กสิกร') || n.includes('kbank') || n.includes('k-e')) return { code: 'KBANK', bg: '#15803d' };
    if (n.includes('ออมสิน') || n.includes('gsb')) return { code: 'GSB', bg: '#e11d48' };
    if (n.includes('เป๋าตัง') || n.includes('paotang')) return { code: 'PAOTANG', bg: '#0284c7' };
    if (n.includes('true') || n.includes('tmn')) return { code: 'TMN', bg: '#ea580c' };
    if (n.includes('dime') || n.includes('เกียรตินาคิน') || n.includes('kkp')) return { code: 'KKP', bg: '#7c3aed' };
    if (n.includes('สอท') || n.includes('สหกรณ์')) return { code: 'COOP', bg: '#065f46' };
    if (n.includes('สำรองเลี้ยงชีพ') || n.includes('pvd')) return { code: 'PVD', bg: '#334155' };
    if (n.includes('bls')) return { code: 'BLS', bg: '#0369a1' };
    if (n.includes('finnomena')) return { code: 'FINN', bg: '#0284c7' };
    if (n.includes('กรุงศรี') || n.includes('bay')) return { code: 'BAY', bg: '#f59e0b' };
    if (type === 'บัตรเครดิต') return { code: 'CARD', bg: '#b91c1c' };
    return { code: 'BANK', bg: '#0f172a' };
  },

  bindEvents() {
    document.addEventListener('click', (e) => {
      // 1. สลับแท็บบนสุด
      const tabBtn = e.target.closest('.settings-main-tab');
      if (tabBtn) {
        this.activeTab = tabBtn.dataset.tab;
        this.editingCategoryName = null;
        this.render();
        return;
      }

      // 2. สลับกลุ่มหมวดหมู่ย่อย
      const groupBtn = e.target.closest('.btn-cat-group');
      if (groupBtn) {
        this.activeCategoryGroup = groupBtn.dataset.group;
        this.editingCategoryName = null;
        this.render();
        return;
      }

      // 3. บันทึกหมวดหมู่ใหม่
      const addCatBtn = e.target.closest('#btn-add-category');
      if (addCatBtn) {
        this.handleAddCategory();
        return;
      }

      // 4. กดปุ่มแก้ไข ✏️ หมวดหมู่ (Inline Edit)
      const editCatBtn = e.target.closest('.btn-edit-cat');
      if (editCatBtn) {
        this.editingCategoryName = editCatBtn.dataset.name;
        this.render();
        setTimeout(() => {
          const inp = document.getElementById('input-inline-edit');
          if (inp) {
            inp.focus();
            inp.select();
          }
        }, 50);
        return;
      }

      // 5. บันทึก Inline Edit
      const saveInlineBtn = e.target.closest('.btn-save-inline-cat');
      if (saveInlineBtn) {
        this.handleSaveInlineCategory();
        return;
      }

      // 6. ยกเลิก Inline Edit
      const cancelInlineBtn = e.target.closest('.btn-cancel-inline-cat');
      if (cancelInlineBtn) {
        this.editingCategoryName = null;
        this.render();
        return;
      }

      // 7. ลบหมวดหมู่ย่อย
      const delCatBtn = e.target.closest('.btn-delete-cat');
      if (delCatBtn) {
        const name = delCatBtn.dataset.name;
        if (confirm(`ยืนยันลบหมวดหมู่ "${name}" ออกจาก [${this.activeCategoryGroup}]?`)) {
          const cats = this.getCategories();
          cats[this.activeCategoryGroup] = (cats[this.activeCategoryGroup] || []).filter(item => item !== name);
          this.saveCategories(cats);
          if (this.editingCategoryName === name) this.editingCategoryName = null;
          this.render();
        }
        return;
      }

      // 8. เพิ่มบัญชีใหม่
      const addAccBtn = e.target.closest('#btn-add-account');
      if (addAccBtn) {
        this.handleAddAccount();
        return;
      }

      // 9. ลบบัญชี
      const delAccBtn = e.target.closest('.btn-delete-account');
      if (delAccBtn) {
        const id = delAccBtn.dataset.id;
        const name = delAccBtn.dataset.name;
        if (confirm(`ยืนยันลบบัญชี "${name}" ออกจากระบบ?`)) {
          const accs = this.getAccounts().filter(a => a.id !== id);
          this.saveAccounts(accs);
          this.render();
        }
        return;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.target && e.target.id === 'input-new-category' && e.key === 'Enter') {
        e.preventDefault();
        this.handleAddCategory();
      }
      if (e.target && e.target.id === 'input-inline-edit') {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleSaveInlineCategory();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.editingCategoryName = null;
          this.render();
        }
      }
      if (e.target && e.target.id === 'input-new-account' && e.key === 'Enter') {
        e.preventDefault();
        this.handleAddAccount();
      }
    });
  },

  handleSaveInlineCategory() {
    const input = document.getElementById('input-inline-edit');
    if (!input || !this.editingCategoryName) return;

    const oldName = this.editingCategoryName;
    const newName = input.value.trim();

    if (!newName) {
      alert('กรุณากรอกชื่อหมวดหมู่');
      return;
    }

    if (newName !== oldName) {
      const cats = this.getCategories();
      const list = cats[this.activeCategoryGroup] || [];

      if (list.includes(newName)) {
        alert('มีหมวดหมู่นี้อยู่ในกลุ่มนี้แล้ว');
        return;
      }

      const idx = list.indexOf(oldName);
      if (idx !== -1) {
        list[idx] = newName;
        cats[this.activeCategoryGroup] = list;
        this.saveCategories(cats);
      }
    }

    this.editingCategoryName = null;
    this.render();
  },

  handleAddCategory() {
    const input = document.getElementById('input-new-category');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;

    const cats = this.getCategories();
    if (!cats[this.activeCategoryGroup]) cats[this.activeCategoryGroup] = [];
    if (cats[this.activeCategoryGroup].includes(val)) {
      alert('มีหมวดหมู่นี้อยู่ในกลุ่มนี้แล้ว');
      return;
    }
    cats[this.activeCategoryGroup].push(val);
    this.saveCategories(cats);
    input.value = '';
    this.render();
  },

  handleAddAccount() {
    const inputName = document.getElementById('input-new-account');
    const selectType = document.getElementById('select-account-type');
    if (!inputName || !selectType) return;

    const name = inputName.value.trim();
    const type = selectType.value;
    if (!name) {
      alert('กรุณากรอกชื่อบัญชี / บัตร');
      return;
    }

    const accs = this.getAccounts();
    if (accs.some(a => a.name.toLowerCase() === name.toLowerCase())) {
      alert('มีชื่อบัญชีนี้อยู่ในระบบแล้ว');
      return;
    }

    accs.push({
      id: 'acc-' + Date.now(),
      name,
      type
    });

    this.saveAccounts(accs);
    inputName.value = '';
    this.render();
  },

  render(targetContainer = null) {
    const container = targetContainer 
                   || document.getElementById('settings-content-area')
                   || document.getElementById('content-area')
                   || document.querySelector('.content-area')
                   || document.getElementById('main-content');
    if (!container) return;

    const categories = this.getCategories();
    const accounts = this.getAccounts();

    const tabHeadersHtml = `
      <div style="display: flex; gap: 18px; border-bottom: 2px solid #e2e8f0; margin-bottom: 22px;">
        <button class="settings-main-tab" data-tab="categories" style="background: none; border: none; padding: 8px 4px 12px 4px; font-size: 14.5px; font-weight: 800; color: ${this.activeTab === 'categories' ? '#0284c7' : '#64748b'}; border-bottom: 3px solid ${this.activeTab === 'categories' ? '#0284c7' : 'transparent'}; display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <span>🏷️</span> จัดการหมวดหมู่ย่อย
        </button>
        <button class="settings-main-tab" data-tab="accounts" style="background: none; border: none; padding: 8px 4px 12px 4px; font-size: 14.5px; font-weight: 800; color: ${this.activeTab === 'accounts' ? '#0284c7' : '#64748b'}; border-bottom: 3px solid ${this.activeTab === 'accounts' ? '#0284c7' : 'transparent'}; display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <span>🗂️</span> จัดการบัญชีการเงิน (${accounts.length})
        </button>
      </div>
    `;

    let contentBodyHtml = '';

    if (this.activeTab === 'categories') {
      const currentList = categories[this.activeCategoryGroup] || [];
      const groupMeta = [
        { key: 'รายรับ', icon: '🟢', label: 'รายรับ', count: (categories['รายรับ'] || []).length },
        { key: 'รายจ่าย', icon: '🔴', label: 'รายจ่าย', count: (categories['รายจ่าย'] || []).length },
        { key: 'บิล', icon: '📜', label: 'บิล', count: (categories['บิล'] || []).length },
        { key: 'หนี้สิน', icon: '🏷️', label: 'หนี้สิน', count: (categories['หนี้สิน'] || []).length },
        { key: 'เงินออมและลงทุน', icon: '🚀', label: 'เงินออมและลงทุน', count: (categories['เงินออมและลงทุน'] || []).length }
      ];

      const groupPillsHtml = groupMeta.map(g => {
        const isActive = this.activeCategoryGroup === g.key;
        return `
          <button class="btn-cat-group" data-group="${g.key}" style="display: flex; align-items: center; gap: 8px; background: ${isActive ? '#0284c7' : '#ffffff'}; color: ${isActive ? '#ffffff' : '#334155'}; border: 1px solid ${isActive ? '#0284c7' : '#e2e8f0'}; padding: 7px 14px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <span>${g.icon}</span>
            <span>${g.label}</span>
            <span style="background: ${isActive ? 'rgba(255,255,255,0.2)' : '#f1f5f9'}; color: ${isActive ? '#ffffff' : '#64748b'}; font-size: 11px; padding: 2px 7px; border-radius: 6px; font-weight: 800;">${g.count}</span>
          </button>
        `;
      }).join('');

      const cardsHtml = currentList.map(cat => {
        const isEditing = this.editingCategoryName === cat;

        if (isEditing) {
          return `
            <div style="background: #ffffff; border: 1.5px solid #0284c7; border-radius: 10px; padding: 8px 10px; display: flex; align-items: center; gap: 6px; box-shadow: 0 0 0 3px rgba(2,132,199,0.1);">
              <input type="text" id="input-inline-edit" value="${cat}" style="flex: 1; min-width: 0; padding: 6px 10px; border: 1.5px solid #93c5fd; border-radius: 6px; font-size: 13.5px; font-weight: 700; color: #0f172a; outline: none; background: #ffffff;">
              <button class="btn-save-inline-cat" style="background: #0284c7; color: #ffffff; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                บันทึก
              </button>
              <button class="btn-cancel-inline-cat" style="background: #f1f5f9; color: #64748b; border: none; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 13px;" title="ยกเลิก">
                ✕
              </button>
            </div>
          `;
        }

        return `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <span style="font-size: 13.5px; font-weight: 700; color: #0f172a;">${cat}</span>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button class="btn-edit-cat" data-name="${cat}" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; font-size: 12px;" title="แก้ไข">✏️</button>
              <button class="btn-delete-cat" data-name="${cat}" style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #ef4444; font-size: 12px;" title="ลบ">🗑️</button>
            </div>
          </div>
        `;
      }).join('');

      contentBodyHtml = `
        <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
          ${groupPillsHtml}
        </div>

        <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 10px; padding: 12px 18px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <span style="font-size: 13px; font-weight: 700; color: #334155; white-space: nowrap;">
            ➕ เพิ่มหมวดหมู่ใหม่ใน [${this.activeCategoryGroup}]:
          </span>
          <input type="text" id="input-new-category" placeholder="พิมพ์ชื่อหมวดหมู่แล้วกด Enter..." style="flex: 1; min-width: 220px; padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; background: #ffffff;">
          <button id="btn-add-category" style="background: #0284c7; color: #ffffff; border: none; padding: 8px 18px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap;">
            บันทึกหมวดหมู่
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;">
          ${cardsHtml}
        </div>
      `;
    } else {
      // แท็บบัญชีการเงิน 21 บัญชี พร้อม Badge ธนาคาร
      const accountCardsHtml = accounts.map(a => {
        const badge = this.getBankBadge(a.name, a.type);
        return `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="background: ${badge.bg}; color: #ffffff; font-size: 11px; font-weight: 900; padding: 5px 8px; border-radius: 7px; text-transform: uppercase; letter-spacing: 0.5px; min-width: 44px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                ${badge.code}
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${a.name}</div>
                <div style="font-size: 11px; color: #64748b;">ประเภท: ${a.type}</div>
              </div>
            </div>
            <button class="btn-delete-account" data-id="${a.id}" data-name="${a.name}" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; font-size: 13px;" title="ลบบัญชี">
              🗑️
            </button>
          </div>
        `;
      }).join('');

      contentBodyHtml = `
        <div style="background: #ffffff; border: 1.5px dashed #cbd5e1; border-radius: 10px; padding: 12px 18px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <span style="font-size: 13px; font-weight: 700; color: #334155; white-space: nowrap;">
            ➕ เพิ่มบัญชี / บัตรใหม่:
          </span>
          <input type="text" id="input-new-account" placeholder="ชื่อบัญชี (เช่น SCB Easy, Dime!, บัตรเคทีซี)..." style="flex: 2; min-width: 200px; padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; background: #ffffff;">
          <select id="select-account-type" style="flex: 1; min-width: 140px; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700; background: #fff;">
            <option value="ธนาคาร">🏦 ธนาคาร</option>
            <option value="เงินสด">💵 เงินสด</option>
            <option value="กระเป๋าเงิน">📱 กระเป๋าเงิน</option>
            <option value="ดิจิทัล">🌐 ดิจิทัล</option>
            <option value="สหกรณ์">🤝 สหกรณ์</option>
            <option value="กองทุน">🛡️ กองทุน</option>
            <option value="พอร์ตหุ้น">📈 พอร์ตหุ้น</option>
            <option value="พอร์ตกองทุน">🌱 พอร์ตกองทุน</option>
            <option value="บัตรเครดิต">💳 บัตรเครดิต</option>
          </select>
          <button id="btn-add-account" style="background: #0284c7; color: #ffffff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap;">
            บันทึกบัญชี
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
          ${accountCardsHtml}
        </div>
      `;
    }

    container.innerHTML = `
      <div style="width: 100%; max-width: 100%; margin: 0; text-align: left;">
        
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 22px;">
          <div style="background: #f1f5f9; color: #334155; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 22px;">⚙️</div>
          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">SYSTEM CONFIGURATION</div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">ตั้งค่าระบบ & หมวดหมู่การเงิน</h1>
          </div>
        </div>

        ${tabHeadersHtml}
        ${contentBodyHtml}

      </div>
    `;
  }
};

if (typeof window !== 'undefined') {
  window.SettingsModule = SettingsModule;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SettingsModule.init());
} else {
  setTimeout(() => SettingsModule.init(), 50);
}