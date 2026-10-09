/**
 * js/modules/tax.js
 * Multi-Year Tax Planner & Dividend Tax Credit Engine for Family Finance
 * Fixed: Minimal Sidebar with "กลับหน้าหลัก" right below "คำนวณภาษี",
 * Sticky positioning, Multi-year support, Dynamic Insights, and Net Income Tax Rate.
 */

var TaxModule = {
  activeYear: '2026',
  availableYears: ['2026', '2025'],
  currentUser: 'DAD',
  currentTab: 'all',
  storagePrefix: 'family-finance:tax-planner',

  groupOrder: [
    'ลดหย่อนทั่วไป',
    'ประกันภัย',
    'กระตุ้นเศรษฐกิจ',
    'การออม และการลงทุน',
    'เงินบริจาค',
    'รายการลดหย่อนพิเศษ'
  ],

  defaultIncomes: [
    { id: 'inc-40-1', code: '40(1)', name: 'รายได้ประจำ เช่น เงินเดือน', defaultName: 'รายได้ประจำ เช่น เงินเดือน', rule: '50% รวมกับ 40(2) ไม่เกิน 100,000 บาท', rateType: 'salary', defaultRate: 50, rate: 50, amount: 0 },
    { id: 'inc-40-2', code: '40(2)', name: 'เงินได้จากการจ้างทำของ / รับจ้าง', defaultName: 'เงินได้จากการจ้างทำของ / รับจ้าง', rule: '50% รวมกับ 40(1) ไม่เกิน 100,000 บาท', rateType: 'salary', defaultRate: 50, rate: 50, amount: 0 },
    { id: 'inc-40-3', code: '40(3)', name: 'ค่าลิขสิทธิ์ / สิทธิต่างๆ', defaultName: 'ค่าลิขสิทธิ์ / สิทธิต่างๆ', rule: '50% ไม่เกิน 100,000 บาท หรือหักจริง', rateType: 'salary_single', defaultRate: 50, rate: 50, amount: 0 },
    { id: 'inc-40-4', code: '40(4)', name: 'ดอกเบี้ย เงินปันผล และการลงทุน', defaultName: 'ดอกเบี้ย เงินปันผล และการลงทุน', rule: 'หักค่าใช้จ่ายไม่ได้', rateType: 'none', defaultRate: 0, rate: 0, amount: 0 },
    { id: 'inc-40-5', code: '40(5)', name: 'ค่าเช่าทรัพย์สิน', defaultName: 'ค่าเช่าทรัพย์สิน', rule: '30%', rateType: 'pct30', defaultRate: 30, rate: 30, amount: 0 },
    { id: 'inc-40-5-house', code: '', name: 'บ้าน โรงเรือน สิ่งปลูกสร้าง แพ', defaultName: 'บ้าน โรงเรือน สิ่งปลูกสร้าง แพ', rule: '30%', rateType: 'pct30', defaultRate: 30, rate: 30, amount: 0 },
    { id: 'inc-40-5-agri', code: '', name: 'ที่ดินที่ใช้ในการเกษตร', defaultName: 'ที่ดินที่ใช้ในการเกษตร', rule: '20%', rateType: 'pct20', defaultRate: 20, rate: 20, amount: 0 },
    { id: 'inc-40-5-nonagri', code: '', name: 'ที่ดินที่ไม่ได้ใช้ในการเกษตร', defaultName: 'ที่ดินที่ไม่ได้ใช้ในการเกษตร', rule: '15%', rateType: 'pct15', defaultRate: 15, rate: 15, amount: 0 },
    { id: 'inc-40-5-vehicle', code: '', name: 'ยานพาหนะ', defaultName: 'ยานพาหนะ', rule: '30%', rateType: 'pct30', defaultRate: 30, rate: 30, amount: 0 },
    { id: 'inc-40-5-other', code: '', name: 'ทรัพย์สินอื่นๆ', defaultName: 'ทรัพย์สินอื่นๆ', rule: '10%', rateType: 'pct10', defaultRate: 10, rate: 10, amount: 0 },
    { id: 'inc-40-6', code: '40(6)', name: 'วิชาชีพอิสระ', defaultName: 'วิชาชีพอิสระ', rule: 'ตามจริงหรืออัตราเหมา', rateType: 'none', defaultRate: 0, rate: 0, amount: 0 },
    { id: 'inc-40-6-med', code: '', name: 'ประกอบโรคศิลปะ', defaultName: 'ประกอบโรคศิลปะ', rule: '60%', rateType: 'pct60', defaultRate: 60, rate: 60, amount: 0 },
    { id: 'inc-40-6-law', code: '', name: 'กฎหมาย วิศวกรรม สถาปัตย์ บัญชี และวิชาชีพอื่น', defaultName: 'กฎหมาย วิศวกรรม สถาปัตย์ บัญชี และวิชาชีพอื่น', rule: '30%', rateType: 'pct30', defaultRate: 30, rate: 30, amount: 0 },
    { id: 'inc-40-7', code: '40(7)', name: 'รับเหมา', defaultName: 'รับเหมา', rule: '60%', rateType: 'pct60', defaultRate: 60, rate: 60, amount: 0 },
    { id: 'inc-40-8', code: '40(8)', name: 'ธุรกิจอื่น', defaultName: 'ธุรกิจอื่น', rule: '60%', rateType: 'pct60', defaultRate: 60, rate: 60, amount: 0 }
  ],

  defaultDeductions: [
    { id: 'd-personal', group: 'ลดหย่อนทั่วไป', name: 'ส่วนตัว', defaultName: 'ส่วนตัว', rule: 'ผู้มีเงินได้ทุกคนลดหย่อนได้ทันที 60,000 บาท', defaultRule: 'ผู้มีเงินได้ทุกคนลดหย่อนได้ทันที 60,000 บาท', defaultLimit: 60000, limit: 60000, current: 60000, plan: 0 },
    { id: 'd-spouse', group: 'ลดหย่อนทั่วไป', name: 'คู่สมรส', defaultName: 'คู่สมรส', rule: 'หากคู่สมรสไม่มีเงินได้ ลดหย่อนได้ 60,000 บาท', defaultRule: 'หากคู่สมรสไม่มีเงินได้ ลดหย่อนได้ 60,000 บาท', defaultLimit: 60000, limit: 60000, current: 0, plan: 0 },
    { id: 'd-child', group: 'ลดหย่อนทั่วไป', name: 'บุตร', defaultName: 'บุตร', rule: 'ลดหย่อนบุตรคนละ 30,000 บาท', defaultRule: 'ลดหย่อนบุตรคนละ 30,000 บาท', defaultLimit: 0, limit: 0, current: 30000, plan: 0 },
    { id: 'd-parents', group: 'ลดหย่อนทั่วไป', name: 'ค่าอุปการะเลี้ยงดูพ่อ-แม่', defaultName: 'ค่าอุปการะเลี้ยงดูพ่อ-แม่', rule: 'อายุ 60 ปีขึ้นไป ลดหย่อนได้คนละ 30,000 บาท', defaultRule: 'อายุ 60 ปีขึ้นไป ลดหย่อนได้คนละ 30,000 บาท', defaultLimit: 0, limit: 0, current: 0, plan: 0 },
    { id: 'd-disabled', group: 'ลดหย่อนทั่วไป', name: 'ค่าเลี้ยงดูผู้พิการ', defaultName: 'ค่าเลี้ยงดูผู้พิการ', rule: 'ลดหย่อนได้คนละ 60,000 บาท', defaultRule: 'ลดหย่อนได้คนละ 60,000 บาท', defaultLimit: 0, limit: 0, current: 0, plan: 0 },
    { id: 'd-pregnancy', group: 'ลดหย่อนทั่วไป', name: 'ค่าฝากครรภ์และค่าคลอดบุตร', defaultName: 'ค่าฝากครรภ์และค่าคลอดบุตร', rule: 'จ่ายจริงไม่เกิน 60,000 บาทต่อครั้ง', defaultRule: 'จ่ายจริงไม่เกิน 60,000 บาทต่อครั้ง', defaultLimit: 60000, limit: 60000, current: 0, plan: 0 },
    
    { id: 'd-health-self', group: 'ประกันภัย', name: 'ประกันสุขภาพของตนเอง', defaultName: 'ประกันสุขภาพของตนเอง', rule: 'ลดหย่อนได้สูงสุด 25,000 บาท', defaultRule: 'ลดหย่อนได้สูงสุด 25,000 บาท', defaultLimit: 25000, limit: 25000, current: 0, plan: 0 },
    { id: 'd-health-parents', group: 'ประกันภัย', name: 'ประกันสุขภาพของพ่อ แม่ หรือคู่สมรส', defaultName: 'ประกันสุขภาพของพ่อ แม่ หรือคู่สมรส', rule: 'ตามจริงไม่เกิน 15,000 บาท', defaultRule: 'ตามจริงไม่เกิน 15,000 บาท', defaultLimit: 15000, limit: 15000, current: 0, plan: 0 },
    { id: 'd-sso', group: 'ประกันภัย', name: 'ประกันสังคม (มาตรา 33)', defaultName: 'ประกันสังคม (มาตรา 33)', rule: 'ตามจริงไม่เกิน 9,000 บาท', defaultRule: 'ตามจริงไม่เกิน 9,000 บาท', defaultLimit: 9000, limit: 9000, current: 0, plan: 0 },
    { id: 'd-life-ins', group: 'ประกันภัย', name: 'ประกันชีวิต หรือประกันสะสมทรัพย์', defaultName: 'ประกันชีวิต หรือประกันสะสมทรัพย์', rule: 'ตามจริงไม่เกิน 100,000 บาท', defaultRule: 'ตามจริงไม่เกิน 100,000 บาท', defaultLimit: 100000, limit: 100000, current: 0, plan: 0 },
    { id: 'd-annuity', group: 'ประกันภัย', name: 'เบี้ยประกันชีวิตแบบบำนาญ', defaultName: 'เบี้ยประกันชีวิตแบบบำนาญ', rule: '15% ของเงินได้ แต่ไม่เกิน 200,000 บาท', defaultRule: '15% ของเงินได้ แต่ไม่เกิน 200,000 บาท', defaultLimit: 200000, limit: 200000, current: 0, plan: 0 },
    
    { id: 'd-home-loan', group: 'กระตุ้นเศรษฐกิจ', name: 'ดอกเบี้ยบ้าน', defaultName: 'ดอกเบี้ยบ้าน', rule: 'ตามจริงไม่เกิน 100,000 บาท', defaultRule: 'ตามจริงไม่เกิน 100,000 บาท', defaultLimit: 100000, limit: 100000, current: 0, plan: 0 },
    { id: 'd-art', group: 'กระตุ้นเศรษฐกิจ', name: 'ค่าซื้อซื้องานศิลป์', defaultName: 'ค่าซื้อซื้องานศิลป์', rule: 'ตามที่จ่ายจริง หรือตามสิทธิ', defaultRule: 'ตามที่จ่ายจริง หรือตามสิทธิ', defaultLimit: 0, limit: 0, current: 0, plan: 0 },
    { id: 'd-solar', group: 'กระตุ้นเศรษฐกิจ', name: 'ค่าติดตั้งโซล่าเซล', defaultName: 'ค่าติดตั้งโซล่าเซล', rule: 'ตามที่จ่ายจริง หรือตามสิทธิ', defaultRule: 'ตามที่จ่ายจริง หรือตามสิทธิ', defaultLimit: 0, limit: 0, current: 0, plan: 0 },
    { id: 'd-business-inv', group: 'กระตุ้นเศรษฐกิจ', name: 'เงินลงทุนธุรกิจ', defaultName: 'เงินลงทุนธุรกิจ', rule: 'ตามที่จ่ายจริง หรือตามสิทธิ', defaultRule: 'ตามที่จ่ายจริง หรือตามสิทธิ', defaultLimit: 0, limit: 0, current: 0, plan: 0 },

    { id: 'd-rmf', group: 'การออม และการลงทุน', name: 'กองทุนเพื่อเลี้ยงชีพ (RMF)', defaultName: 'กองทุนเพื่อเลี้ยงชีพ (RMF)', rule: 'ลดหย่อนได้สูงสุด 30% ของเงินได้ที่ต้องเสียภาษี แต่ไม่เกิน 500,000 บาท', defaultRule: 'ลดหย่อนได้สูงสุด 30% ของเงินได้ที่ต้องเสียภาษี แต่ไม่เกิน 500,000 บาท', defaultLimit: 500000, limit: 500000, current: 0, plan: 0 },
    { id: 'd-thaiesg', group: 'การออม และการลงทุน', name: 'กองทุนรวมไทยเพื่อความยั่งยืน (Thai ESG)', defaultName: 'กองทุนรวมไทยเพื่อความยั่งยืน (Thai ESG)', rule: 'ลดหย่อนได้ 30% ของเงินได้ ไม่เกิน 300,000 บาท', defaultRule: 'ลดหย่อนได้ 30% ของเงินได้ ไม่เกิน 300,000 บาท', defaultLimit: 300000, limit: 300000, current: 0, plan: 0 },
    { id: 'd-pvd', group: 'การออม และการลงทุน', name: 'กองทุนสำรองเลี้ยงชีพ (PVD)', defaultName: 'กองทุนสำรองเลี้ยงชีพ (PVD)', rule: 'ใช้สิทธิลดหย่อนได้ตามจริง แต่ไม่เกิน 15% ของเงินได้ และต้องไม่เกิน 500,000 บาท', defaultRule: 'ใช้สิทธิลดหย่อนได้ตามจริง แต่ไม่เกิน 15% ของเงินได้ และต้องไม่เกิน 500,000 บาท', defaultLimit: 500000, limit: 500000, current: 0, plan: 0 },
    { id: 'd-nsf', group: 'การออม และการลงทุน', name: 'กองทุนการออมแห่งชาติ (กอช.)', defaultName: 'กองทุนการออมแห่งชาติ (กอช.)', rule: 'ลดหย่อนได้ตามที่จ่ายจริง แต่ไม่เกิน 30,000 บาทต่อปี', defaultRule: 'ลดหย่อนได้ตามที่จ่ายจริง แต่ไม่เกิน 30,000 บาทต่อปี', defaultLimit: 30000, limit: 30000, current: 0, plan: 0 },
    { id: 'd-ssf', group: 'การออม และการลงทุน', name: 'เงินค่าซื้อหน่วยลงทุนใน SSF', defaultName: 'เงินค่าซื้อหน่วยลงทุนใน SSF', rule: 'ลดหย่อนได้สูงสุด 30% ของเงินได้ที่ต้องเสียภาษี แต่ไม่เกิน 200,000 บาท', defaultRule: 'ลดหย่อนได้สูงสุด 30% ของเงินได้ที่ต้องเสียภาษี แต่ไม่เกิน 200,000 บาท', defaultLimit: 200000, limit: 200000, current: 0, plan: 0 },

    { id: 'd-donate-pol', group: 'เงินบริจาค', name: 'เงินบริจาคพรรคการเมือง', defaultName: 'เงินบริจาคพรรคการเมือง', rule: 'ตามจริงไม่เกิน 10,000 บาท', defaultRule: 'ตามจริงไม่เกิน 10,000 บาท', defaultLimit: 10000, limit: 10000, current: 0, plan: 0 },
    { id: 'd-donate-edu', group: 'เงินบริจาค', name: 'เงินบริจาคเพื่อการศึกษา กีฬา และสาธารณประโยชน์', defaultName: 'เงินบริจาคเพื่อการศึกษา กีฬา และสาธารณประโยชน์', rule: 'หักได้ 2 เท่า ไม่เกิน 10% ของเงินได้หลังหักลดหย่อน', defaultRule: 'หักได้ 2 เท่า ไม่เกิน 10% ของเงินได้หลังหักลดหย่อน', defaultLimit: 0, limit: 0, current: 0, plan: 0 },
    { id: 'd-donate-gen', group: 'เงินบริจาค', name: 'เงินบริจาคทั่วไป', defaultName: 'เงินบริจาคทั่วไป', rule: 'ตามจริงไม่เกิน 10% ของเงินได้หลังหักลดหย่อน', defaultRule: 'ตามจริงไม่เกิน 10% ของเงินได้หลังหักลดหย่อน', defaultLimit: 0, limit: 0, current: 0, plan: 0 }
  ],

  incomes: [],
  deductions: [],
  dividends: [],
  hiddenIncomes: [],
  hiddenDeductions: [],
  taxPaidWithheld: 0,

  init() {
    this.loadYearList();
    this.loadState(this.activeYear);
    this.bindTopNav();
    if (window.location.hash === '#tax') {
      setTimeout(() => this.render(), 100);
    }
  },

  getStorageKey(year) {
    return `${this.storagePrefix}:${this.currentUser}:${year}`;
  },

  loadYearList() {
    try {
      const savedYears = localStorage.getItem(`${this.storagePrefix}:${this.currentUser}:years`);
      if (savedYears) {
        this.availableYears = JSON.parse(savedYears);
      }
      const savedActive = localStorage.getItem(`${this.storagePrefix}:${this.currentUser}:activeYear`);
      if (savedActive && this.availableYears.includes(savedActive)) {
        this.activeYear = savedActive;
      }
    } catch (e) {
      console.warn("Cannot load year list", e);
    }
  },

  saveYearList() {
    try {
      localStorage.setItem(`${this.storagePrefix}:${this.currentUser}:years`, JSON.stringify(this.availableYears));
      localStorage.setItem(`${this.storagePrefix}:${this.currentUser}:activeYear`, this.activeYear);
    } catch (e) {}
  },

  getItemRate(item) {
    if (item.rate !== undefined && item.rate !== null && !isNaN(item.rate)) {
      return Number(item.rate);
    }
    if (item.defaultRate !== undefined && item.defaultRate !== null) {
      return Number(item.defaultRate);
    }
    const map = { pct60: 60, pct30: 30, pct20: 20, pct15: 15, pct10: 10, salary: 50, salary_single: 50, none: 0 };
    return map[item.rateType] !== undefined ? map[item.rateType] : 0;
  },

  loadState(year) {
    this.activeYear = year || '2026';
    const key = this.getStorageKey(this.activeYear);

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.incomes = parsed.incomes || JSON.parse(JSON.stringify(this.defaultIncomes));
        this.deductions = parsed.deductions || JSON.parse(JSON.stringify(this.defaultDeductions));
        this.dividends = parsed.dividends || [];
        this.hiddenIncomes = parsed.hiddenIncomes || [];
        this.hiddenDeductions = parsed.hiddenDeductions || [];
        this.taxPaidWithheld = parsed.taxPaidWithheld !== undefined ? parsed.taxPaidWithheld : 0;

        this.incomes.forEach(i => {
          if (i.rate === undefined || i.rate === null) {
            i.rate = this.getItemRate(i);
          }
        });
        return;
      }
    } catch (e) {
      console.warn("Fallback to defaults for year " + this.activeYear, e);
    }

    if (this.activeYear === '2026') {
      this.incomes = JSON.parse(JSON.stringify(this.defaultIncomes));
      const inc1 = this.incomes.find(i => i.id === 'inc-40-1');
      if (inc1) inc1.amount = 1017308.50;
      const inc5 = this.incomes.find(i => i.id === 'inc-40-5-house');
      if (inc5) inc5.amount = 84000.00;

      this.deductions = JSON.parse(JSON.stringify(this.defaultDeductions));
      const ins = this.deductions.find(d => d.id === 'd-life-ins');
      if (ins) ins.current = 28470.00;
      const rmf = this.deductions.find(d => d.id === 'd-rmf');
      if (rmf) rmf.current = 10000.00;
      const pvd = this.deductions.find(d => d.id === 'd-pvd');
      if (pvd) pvd.current = 180576.00;

      this.taxPaidWithheld = 120579.83;
    } else {
      this.incomes = JSON.parse(JSON.stringify(this.defaultIncomes));
      this.deductions = JSON.parse(JSON.stringify(this.defaultDeductions));
      this.taxPaidWithheld = 0;
    }

    this.dividends = [];
    this.hiddenIncomes = [];
    this.hiddenDeductions = [];
  },

  saveState() {
    try {
      const data = {
        incomes: this.incomes,
        deductions: this.deductions,
        dividends: this.dividends,
        hiddenIncomes: this.hiddenIncomes,
        hiddenDeductions: this.hiddenDeductions,
        taxPaidWithheld: this.taxPaidWithheld
      };
      localStorage.setItem(this.getStorageKey(this.activeYear), JSON.stringify(data));
      this.saveYearList();
    } catch (e) {
      console.warn("Cannot save tax state", e);
    }
  },

  switchYear(newYear) {
    this.saveState();
    this.loadState(newYear);
    this.render();
  },

  addNewYearPrompt() {
    const yr = prompt("กรุณากรอกปีภาษีที่ต้องการเพิ่ม (เช่น 2025, 2024, 2027):", "");
    if (!yr) return;
    const cleanYear = yr.trim();
    if (!/^\d{4}$/.test(cleanYear)) {
      alert("กรุณากรอกปีเป็นตัวเลข ค.ศ. 4 หลัก เช่น 2025");
      return;
    }
    if (!this.availableYears.includes(cleanYear)) {
      this.availableYears.unshift(cleanYear);
      this.availableYears.sort((a, b) => b - a);
      this.saveYearList();
    }
    this.switchYear(cleanYear);
  },

  bindTopNav() {
    const handleNav = (target) => {
      document.querySelectorAll('header nav a, .top-nav a, .navbar a, nav a, .nav-item').forEach(el => el.classList.remove('active'));
      if (target) target.classList.add('active');
      document.querySelectorAll('.sidebar a, .sidebar li, [class*="sidebar"] a').forEach(el => el.classList.remove('active'));

      if (window.location.hash !== '#tax') {
        window.location.hash = '#tax';
      }

      setTimeout(() => this.render(), 50);
      setTimeout(() => {
        const taxContainer = document.querySelector('#cardTotalIncome');
        if (!taxContainer) this.render();
      }, 150);
    };

    document.addEventListener('click', (e) => {
      const target = e.target.closest('a, button, .nav-item, li');
      if (!target) return;
      const txt = (target.textContent || '').trim();

      if (txt.includes('คำนวณภาษี') || (target.tagName === 'A' && target.getAttribute('href') === '#tax')) {
        e.preventDefault();
        e.stopPropagation();
        handleNav(target);
      }
    }, true);

    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#tax') {
        const topLink = Array.from(document.querySelectorAll('header nav a, .top-nav a, .navbar a, nav a, .nav-item'))
                             .find(el => (el.textContent || '').trim().includes('คำนวณภาษี'));
        if (topLink) {
          document.querySelectorAll('header nav a, .top-nav a, .navbar a, nav a, .nav-item').forEach(el => el.classList.remove('active'));
          topLink.classList.add('active');
        }
        setTimeout(() => this.render(), 60);
      }
    });
  },

  visibleIncomes() {
    return this.incomes.filter(i => !this.hiddenIncomes.includes(i.id));
  },

  visibleDeductions() {
    const list = this.deductions.filter(d => !this.hiddenDeductions.includes(d.id));
    return list.sort((a, b) => {
      let idxA = this.groupOrder.indexOf((a.group || '').trim());
      let idxB = this.groupOrder.indexOf((b.group || '').trim());
      if (idxA === -1) idxA = 99;
      if (idxB === -1) idxB = 99;
      return idxA - idxB;
    });
  },

  calculateAll() {
    let totalIncome = 0;
    let totalExpense = 0;

    const visibleList = this.visibleIncomes();
    const inc1 = (visibleList.find(i => i.id === 'inc-40-1')?.amount || 0);
    const inc2 = (visibleList.find(i => i.id === 'inc-40-2')?.amount || 0);
    const salaryTotal = inc1 + inc2;
    const salaryExpenseTotal = Math.min(salaryTotal * 0.50, 100000);

    const expenseMap = {};
    if (salaryTotal > 0) {
      expenseMap['inc-40-1'] = salaryExpenseTotal * (inc1 / salaryTotal);
      expenseMap['inc-40-2'] = salaryExpenseTotal * (inc2 / salaryTotal);
    } else {
      expenseMap['inc-40-1'] = 0;
      expenseMap['inc-40-2'] = 0;
    }

    visibleList.forEach(i => {
      const amt = (i.amount || 0);
      totalIncome += amt;
      const rate = this.getItemRate(i);

      if (i.id === 'inc-40-1' || i.id === 'inc-40-2') {
        totalExpense += (expenseMap[i.id] || 0);
      } else if (i.rateType === 'salary_single') {
        const exp = Math.min(amt * (rate / 100), 100000);
        expenseMap[i.id] = exp;
        totalExpense += exp;
      } else if (i.rateType === 'none' || rate === 0) {
        expenseMap[i.id] = 0;
      } else {
        const exp = amt * (rate / 100);
        expenseMap[i.id] = exp;
        totalExpense += exp;
      }
    });

    const incomeAfterExpense = Math.max(0, totalIncome - totalExpense);

    let divNetSum = 0;
    let divCreditSum = 0;
    let divWhtSum = 0;
    this.dividends.forEach(d => {
      divNetSum += (d.amount || 0);
      divWhtSum += (d.wht || 0);
      if ((d.rate || 0) > 0) {
        divCreditSum += (d.amount || 0) * (d.rate / (100 - d.rate));
      }
    });

    const limit30Pct = Math.min(incomeAfterExpense * 0.30, 500000);
    const limit15Pct = Math.min(incomeAfterExpense * 0.15, 500000);
    const limitDonate10Pct = incomeAfterExpense * 0.10;

    let totalDeductCurrent = 0;
    let totalDeductPlan = 0;
    let totalPlanAdded = 0;

    this.visibleDeductions().forEach(d => {
      if (d.id === 'd-rmf') d.limit = limit30Pct;
      if (d.id === 'd-pvd') d.limit = limit15Pct;
      if (d.id === 'd-donate-edu' || d.id === 'd-donate-gen') d.limit = limitDonate10Pct;

      totalDeductCurrent += (d.current || 0);
      totalDeductPlan += ((d.current || 0) + (d.plan || 0));
      totalPlanAdded += (d.plan || 0);
    });

    const taxableNetCurrent = Math.max(0, incomeAfterExpense - totalDeductCurrent);
    const taxableNetPlan = Math.max(0, incomeAfterExpense - totalDeductPlan);

    const brackets = [
      { min: 0, max: 150000, rate: 0, label: '0 - 150,000', span: 150000, maxTax: 0 },
      { min: 150000, max: 300000, rate: 0.05, label: '150,001 - 300,000', span: 150000, maxTax: 7500 },
      { min: 300000, max: 500000, rate: 0.10, label: '300,001 - 500,000', span: 200000, maxTax: 20000 },
      { min: 500000, max: 750000, rate: 0.15, label: '500,001 - 750,000', span: 250000, maxTax: 37500 },
      { min: 750000, max: 1000000, rate: 0.20, label: '750,001 - 1,000,000', span: 250000, maxTax: 50000 },
      { min: 1000000, max: 2000000, rate: 0.25, label: '1,000,001 - 2,000,000', span: 1000000, maxTax: 250000 },
      { min: 2000000, max: 5000000, rate: 0.30, label: '2,000,001 - 5,000,000', span: 3000000, maxTax: 900000 },
      { min: 5000000, max: Infinity, rate: 0.35, label: 'มากกว่า 5,000,000', span: 0, maxTax: 0 }
    ];

    let taxEstimatedCurrent = 0;
    let taxEstimatedPlan = 0;

    const bracketRows = brackets.map(b => {
      let chunkCurrent = 0;
      if (taxableNetCurrent > b.min) {
        chunkCurrent = Math.min(taxableNetCurrent, b.max) - b.min;
      }
      const taxRowCurrent = chunkCurrent * b.rate;
      taxEstimatedCurrent += taxRowCurrent;

      let chunkPlan = 0;
      if (taxableNetPlan > b.min) {
        chunkPlan = Math.min(taxableNetPlan, b.max) - b.min;
      }
      const taxRowPlan = chunkPlan * b.rate;
      taxEstimatedPlan += taxRowPlan;

      return {
        label: b.label,
        netIncomeSpan: b.span,
        rateStr: (b.rate * 100) + '%',
        maxTax: b.maxTax,
        currentBase: chunkCurrent,
        currentTax: taxRowCurrent,
        planBase: chunkPlan,
        planTax: taxRowPlan
      };
    });

    const effectiveRateCurrent = taxableNetCurrent > 0 ? ((taxEstimatedCurrent / taxableNetCurrent) * 100).toFixed(2) : '0.00';
    const effectiveRatePlan = taxableNetPlan > 0 ? ((taxEstimatedPlan / taxableNetPlan) * 100).toFixed(2) : '0.00';

    const totalCreditAndWht = this.taxPaidWithheld + divCreditSum;
    const refundOrPayCurrent = totalCreditAndWht - taxEstimatedCurrent;
    const refundOrPayPlan = totalCreditAndWht - taxEstimatedPlan;
    
    const savingsDiff = Math.max(0, taxEstimatedCurrent - taxEstimatedPlan);
    const taxBurdenReductionPct = (taxEstimatedCurrent > 0 && totalPlanAdded > 0) 
      ? ((savingsDiff / taxEstimatedCurrent) * 100).toFixed(2) 
      : '0.00';
    const taxSavingsYieldPct = totalPlanAdded > 0 
      ? ((savingsDiff / totalPlanAdded) * 100).toFixed(2) 
      : '0.00';

    return {
      expenseMap,
      totalIncome,
      totalExpense,
      incomeAfterExpense,
      totalDeductCurrent,
      totalDeductPlan,
      totalPlanAdded,
      taxableNetCurrent,
      taxableNetPlan,
      taxEstimatedCurrent,
      taxEstimatedPlan,
      effectiveRateCurrent,
      effectiveRatePlan,
      divNetSum,
      divCreditSum,
      divWhtSum,
      bracketRows,
      refundOrPayCurrent,
      refundOrPayPlan,
      savingsDiff,
      taxBurdenReductionPct,
      taxSavingsYieldPct
    };
  },

  updateDOMValues() {
    const s = this.calculateAll();
    const fmt = (num) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    this.visibleIncomes().forEach(i => {
      const expEl = document.querySelector(`[data-income-expense="${i.id}"]`);
      const netEl = document.querySelector(`[data-income-net="${i.id}"]`);
      const exp = s.expenseMap[i.id] || 0;
      const after = Math.max(0, (i.amount || 0) - exp);
      if (expEl) expEl.textContent = fmt(exp);
      if (netEl) netEl.textContent = fmt(after);
    });

    const totIncEl = document.querySelector("#incomeTotalAmount");
    const totExpEl = document.querySelector("#incomeTotalExpense");
    const totNetEl = document.querySelector("#incomeTotalNet");
    if (totIncEl) totIncEl.textContent = fmt(s.totalIncome);
    if (totExpEl) totExpEl.textContent = fmt(s.totalExpense);
    if (totNetEl) totNetEl.textContent = fmt(s.incomeAfterExpense);

    let runningNet = s.incomeAfterExpense;
    this.visibleDeductions().forEach(d => {
      runningNet = Math.max(0, runningNet - (d.current || 0));
      const remEl = document.querySelector(`[data-deduct-remain="${d.id}"]`);
      const limEl = document.querySelector(`[data-deduct-limit="${d.id}"]`);
      if (remEl) remEl.textContent = fmt(runningNet);
      if (limEl && d.limit > 0) limEl.textContent = fmt(d.limit);
    });

    const deductTotCurrent = document.querySelector("#deductTotalCurrent");
    const deductTotRemain = document.querySelector("#deductTotalRemain");
    const deductTotPlan = document.querySelector("#deductTotalPlan");
    if (deductTotCurrent) deductTotCurrent.textContent = fmt(s.totalDeductCurrent);
    if (deductTotRemain) deductTotRemain.textContent = fmt(s.taxableNetCurrent);
    if (deductTotPlan) deductTotPlan.textContent = fmt(s.totalDeductPlan - s.totalDeductCurrent);

    const c1 = document.querySelector("#cardTotalIncome");
    const c2 = document.querySelector("#cardTotalExpenseAndDeduct");
    const c3 = document.querySelector("#cardNetTaxable");
    const c4 = document.querySelector("#cardEstimatedTax");
    const c5 = document.querySelector("#cardTaxRefund");
    if (c1) c1.textContent = fmt(s.totalIncome);
    if (c2) c2.textContent = fmt(s.totalExpense + s.totalDeductCurrent);
    if (c3) c3.textContent = fmt(s.taxableNetCurrent);
    if (c4) c4.textContent = fmt(s.taxEstimatedCurrent);
    if (c5) {
      c5.textContent = s.refundOrPayCurrent >= 0 ? `ขอคืน ${fmt(s.refundOrPayCurrent)}` : `จ่ายเพิ่ม ${fmt(Math.abs(s.refundOrPayCurrent))}`;
      c5.style.color = s.refundOrPayCurrent >= 0 ? '#059669' : '#dc2626';
    }

    const bSummaryNet = document.querySelector("#bSummaryNet");
    const bSummaryPlan = document.querySelector("#bSummaryPlan");
    const bSummaryRate = document.querySelector("#bSummaryRate");
    const bSummaryRatePlan = document.querySelector("#bSummaryRatePlan");
    if (bSummaryNet) bSummaryNet.textContent = fmt(s.taxableNetCurrent);
    if (bSummaryPlan) bSummaryPlan.textContent = fmt(s.taxableNetPlan);
    if (bSummaryRate) bSummaryRate.textContent = s.effectiveRateCurrent + '%';
    if (bSummaryRatePlan) bSummaryRatePlan.textContent = s.effectiveRatePlan + '%';

    s.bracketRows.forEach((b, idx) => {
      const bBase = document.querySelector(`[data-bracket-base="${idx}"]`);
      const bTax = document.querySelector(`[data-bracket-tax="${idx}"]`);
      const bPlan = document.querySelector(`[data-bracket-plan="${idx}"]`);
      if (bBase) bBase.textContent = fmt(b.currentBase);
      if (bTax) bTax.textContent = fmt(b.currentTax);
      if (bPlan) bPlan.textContent = b.planTax > 0 ? fmt(b.planTax) : '-';
    });

    const bTotalTax = document.querySelector("#bTotalTax");
    const bTotalTaxPlan = document.querySelector("#bTotalTaxPlan");
    const bTotalCredit = document.querySelector("#bTotalCredit");
    const bTotalCreditPlan = document.querySelector("#bTotalCreditPlan");
    const bRefund = document.querySelector("#bRefund");
    const bRefundPlan = document.querySelector("#bRefundPlan");
    const bDiff = document.querySelector("#bDiff");
    const bBurdenReduction = document.querySelector("#bBurdenReduction");
    const bSavingsYield = document.querySelector("#bSavingsYield");
    const bBurdenDesc = document.querySelector("#bBurdenDesc");
    const bYieldDesc = document.querySelector("#bYieldDesc");

    if (bTotalTax) bTotalTax.textContent = fmt(s.taxEstimatedCurrent);
    if (bTotalTaxPlan) bTotalTaxPlan.textContent = fmt(s.taxEstimatedPlan);
    if (bTotalCredit) bTotalCredit.textContent = fmt(this.taxPaidWithheld + s.divCreditSum);
    if (bTotalCreditPlan) bTotalCreditPlan.textContent = fmt(this.taxPaidWithheld + s.divCreditSum);
    if (bRefund) {
      bRefund.textContent = s.refundOrPayCurrent >= 0 ? `รับคืน ${fmt(s.refundOrPayCurrent)}` : `จ่ายเพิ่ม ${fmt(Math.abs(s.refundOrPayCurrent))}`;
      bRefund.style.color = s.refundOrPayCurrent >= 0 ? '#059669' : '#dc2626';
    }
    if (bRefundPlan) {
      bRefundPlan.textContent = s.refundOrPayPlan >= 0 ? `รับคืน ${fmt(s.refundOrPayPlan)}` : `จ่ายเพิ่ม ${fmt(Math.abs(s.refundOrPayPlan))}`;
      bRefundPlan.style.color = s.refundOrPayPlan >= 0 ? '#059669' : '#dc2626';
    }
    if (bDiff) bDiff.textContent = s.savingsDiff > 0 ? `${fmt(s.savingsDiff)} บาท` : '-';
    if (bBurdenReduction) bBurdenReduction.textContent = s.totalPlanAdded > 0 ? `${s.taxBurdenReductionPct}%` : '-';
    if (bSavingsYield) bSavingsYield.textContent = s.totalPlanAdded > 0 ? `${s.taxSavingsYieldPct}%` : '-';

    if (bBurdenDesc) {
      if (s.totalPlanAdded > 0 && Number(s.taxBurdenReductionPct) > 0) {
        bBurdenDesc.style.display = 'block';
        bBurdenDesc.textContent = `💬 บอกให้รู้ว่า: ภาระภาษีที่ต้องจ่ายจริงลดฮวบลงไปถึง ~${Math.round(Number(s.taxBurdenReductionPct))}%`;
      } else {
        bBurdenDesc.style.display = 'none';
      }
    }

    if (bYieldDesc) {
      if (s.totalPlanAdded > 0 && Number(s.taxSavingsYieldPct) > 0) {
        bYieldDesc.style.display = 'block';
        bYieldDesc.textContent = `💬 บอกให้รู้ว่า: เงินทุก 100 บาทที่เราเอาไปซื้อ RMF/กองทุนเพิ่ม เราได้เงินคืนภาษีกลับเข้ากระเป๋าทันที ${s.taxSavingsYieldPct} บาท (กำไรทันทีเกือบ ${Math.round(Number(s.taxSavingsYieldPct))}% ตั้งแต่วันที่ซื้อ)`;
      } else {
        bYieldDesc.style.display = 'none';
      }
    }
  },

  render(targetContainer = null) {
    let container = targetContainer 
                 || document.querySelector('main.content-area')
                 || document.querySelector('.content-area')
                 || document.querySelector('main')
                 || document.getElementById('cashflow-subview');

    if (!container) return;
    container.style.display = 'block';

    const s = this.calculateAll();
    const fmt = (num) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtInput = (num) => (num !== undefined && num !== null && num !== 0) ? Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

    const visibleList = this.visibleIncomes();
    const incomeRowsHtml = visibleList.map(i => {
      const expense = s.expenseMap[i.id] || 0;
      const after = Math.max(0, (i.amount || 0) - expense);

      return `
        <tr style="border-bottom: 1px solid #dbeafe; font-size: 13px;">
          <td style="padding: 8px 12px; font-weight: ${i.code ? '700' : '400'}; color: #1e293b; background: #fff;">
            ${i.code ? `<strong>${i.code}</strong>${i.name}` : `<span style="padding-left: 14px;">${i.name}</span>`}
            ${i.custom ? `<span style="font-size:10px; background:#e0f2fe; color:#0369a1; padding:2px 5px; border-radius:4px; margin-left:6px; font-weight:700;">เพิ่มเอง</span>` : ''}
          </td>
          <td style="padding: 8px 12px; color: #475569; font-size: 12.5px; background: #f0f7ff;">${i.rule}</td>
          <td style="padding: 4px 8px; background: #fff; width: 140px; text-align: right;">
            <input type="text" inputmode="decimal" data-income-id="${i.id}" value="${fmtInput(i.amount)}" placeholder="" 
              style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: right; font-size: 13px; font-weight: 700; background: #fff;">
          </td>
          <td class="number" data-income-expense="${i.id}" style="padding: 8px 12px; text-align: right; color: #334155; background: #f0f7ff;">${fmt(expense)}</td>
          <td class="number" data-income-net="${i.id}" style="padding: 8px 12px; text-align: right; font-weight: 700; color: #0f172a; background: #f0f7ff;">${fmt(after)}</td>
          <td style="padding: 6px 8px; text-align: center; background: #fff;">
            <button type="button" class="btn-manage-income" data-id="${i.id}" style="background: #1e293b; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">⚙ จัดการ</button>
          </td>
        </tr>
      `;
    }).join('');

    const divRowsHtml = this.dividends.map((d, index) => {
      const credit = d.rate > 0 ? (d.amount * (d.rate / (100 - d.rate))) : 0;
      return `
        <tr style="border-bottom: 1px solid #dbeafe; font-size: 13px;">
          <td style="padding: 8px 12px; font-weight: 700;">${d.ticker}</td>
          <td style="padding: 8px 12px; text-align: right;">${fmt(d.amount)}</td>
          <td style="padding: 8px 12px; text-align: center;">${d.rate}%</td>
          <td style="padding: 8px 12px; text-align: right; color: #059669; font-weight: 700;">${fmt(credit)}</td>
          <td style="padding: 8px 12px; text-align: right; color: #dc2626;">${fmt(d.wht)}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 700;">${fmt(d.amount + credit)}</td>
          <td style="padding: 8px 12px; text-align: center;"><button type="button" class="btn-del-div" data-index="${index}" style="background: #ef4444; color: #fff; border: none; padding: 3px 6px; border-radius: 4px; font-size: 10px; cursor: pointer;">ลบ</button></td>
        </tr>
      `;
    }).join('');

    let runningNet = s.incomeAfterExpense;
    const groupColors = {
      'ลดหย่อนทั่วไป': '#334155',
      'ประกันภัย': '#1d4ed8',
      'กระตุ้นเศรษฐกิจ': '#047857',
      'การออม และการลงทุน': '#6d28d9',
      'เงินบริจาค': '#b45309',
      'รายการลดหย่อนพิเศษ': '#0f766e'
    };

    const visibleDeducts = this.visibleDeductions();
    let deductRowsHtml = '';
    for (let index = 0; index < visibleDeducts.length; index++) {
      const d = visibleDeducts[index];
      runningNet = Math.max(0, runningNet - (d.current || 0));
      const gColor = groupColors[d.group] || '#475569';

      const isGroupStart = (index === 0 || visibleDeducts[index - 1].group !== d.group);
      let groupSpan = 1;
      if (isGroupStart) {
        while (index + groupSpan < visibleDeducts.length && visibleDeducts[index + groupSpan].group === d.group) {
          groupSpan++;
        }
      }

      const borderTopStyle = isGroupStart && index !== 0 ? 'border-top: 2.5px solid #94a3b8;' : 'border-top: 1px solid #dbeafe;';

      const groupCell = isGroupStart ? `
        <td rowspan="${groupSpan}" style="padding: 8px 4px; background: ${gColor}; color: #ffffff; font-size: 13px; font-weight: 800; text-align: center; vertical-align: middle; width: 44px; min-width: 44px; border-right: 1.5px solid #cbd5e1; user-select: none;">
          <div style="writing-mode: vertical-rl; transform: rotate(180deg); letter-spacing: 2px; margin: 0 auto; white-space: nowrap;">
            ${d.group}
          </div>
        </td>
      ` : '';

      deductRowsHtml += `
        <tr style="${borderTopStyle} border-bottom: 1px solid #dbeafe; font-size: 13px;">
          ${groupCell}
          <td style="padding: 8px 12px; font-weight: 700; color: #1e293b; background: #fff;">
            ${d.name}
            ${d.custom ? `<span style="font-size:10px; background:#e0f2fe; color:#0369a1; padding:2px 5px; border-radius:4px; margin-left:6px; font-weight:700;">เพิ่มเอง</span>` : ''}
          </td>
          <td style="padding: 8px 12px; color: #475569; font-size: 12px; background: #f0f7ff;">${d.rule}</td>
          <td data-deduct-limit="${d.id}" style="padding: 8px 12px; text-align: right; color: #334155; background: #f0f7ff;">${d.limit > 0 ? fmt(d.limit) : 'ไม่จำกัด'}</td>
          <td style="padding: 4px 8px; background: #fff; width: 130px;">
            <input type="text" inputmode="decimal" data-deduct-id="${d.id}" value="${fmtInput(d.current)}" placeholder="" 
              style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: right; font-size: 13px; font-weight: 700; background: #fff;">
          </td>
          <td class="number" data-deduct-remain="${d.id}" style="padding: 8px 12px; text-align: right; font-weight: 700; color: #0f172a; background: #f0f7ff;">${fmt(runningNet)}</td>
          <td style="padding: 4px 8px; background: #fff; width: 130px;">
            <input type="text" inputmode="decimal" data-plan-deduct-id="${d.id}" value="${fmtInput(d.plan)}" placeholder="" 
              style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #eab308; border-radius: 4px; text-align: right; font-size: 13px; font-weight: 700; background: #ffff00; color: #000;">
          </td>
          <td style="padding: 6px 8px; text-align: center; background: #fff;">
            <button type="button" class="btn-manage-deduct" data-id="${d.id}" style="background: #1e293b; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">⚙ จัดการ</button>
          </td>
        </tr>
      `;
    }

    const bracketRowsHtml = s.bracketRows.map((b, idx) => `
      <tr style="border-bottom: 1px solid #dbeafe; font-size: 13px; text-align: right;">
        <td style="padding: 8px 12px; text-align: center; color: #1e293b; background: #f0f7ff; font-weight: 600;">${b.label}</td>
        <td style="padding: 8px 12px; background: #fff;">${b.netIncomeSpan > 0 ? fmt(b.netIncomeSpan) : '0.00'}</td>
        <td style="padding: 8px 12px; text-align: center; background: #f0f7ff;">${b.rateStr}</td>
        <td style="padding: 8px 12px; background: #fff;">${fmt(b.maxTax)}</td>
        <td class="number" data-bracket-base="${idx}" style="padding: 8px 12px; font-weight: 700; background: #f0f7ff;">${fmt(b.currentBase)}</td>
        <td class="number" data-bracket-tax="${idx}" style="padding: 8px 12px; font-weight: 700; color: #0f172a; background: #fff;">${fmt(b.currentTax)}</td>
        <td class="number" data-bracket-plan="${idx}" style="padding: 8px 12px; color: #0f172a; background: #fefce8; font-weight: 700;">
          ${b.planTax > 0 ? fmt(b.planTax) : '-'}
        </td>
      </tr>
    `).join('');

    const yearOptionsHtml = this.availableYears.map(yr => 
      `<option value="${yr}" ${yr === this.activeYear ? 'selected' : ''}>ปี ${yr}</option>`
    ).join('');

    // โครงสร้างหน้า 2 คอลัมน์: Sidebar ซ้ายตรงตามรูปตัวอย่างเป๊ะๆ
    container.innerHTML = `
      <div style="display: flex; width: 100%; min-height: 100vh; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        
        <!-- SIDEBAR ซ้ายมือ (กลับหน้าหลักอยู่ต่อท้ายคำนวณภาษีทันทีตามรูป) -->
        <aside style="width: 190px; min-width: 190px; height: 100vh; position: sticky; top: 0; background: #ffffff; border-right: 1px solid #e2e8f0; padding: 20px 12px; box-sizing: border-box; display: flex; flex-direction: column; gap: 14px; z-index: 50;">
          <div>
            <!-- หัวข้อกลุ่ม -->
            <div style="font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 10px; padding-left: 8px;">
              คำนวณภาษี
            </div>
            
            <!-- เมนูแอคทีฟแถบสีฟ้าตามรูป -->
            <div style="background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 13.5px; padding: 9px 12px; border-radius: 8px; border-left: 3px solid #0284c7; cursor: default; user-select: none;">
              คำนวณภาษี
            </div>

            <!-- เมนูกลับหน้าหลัก (อยู่ต่อท้ายด้านบนทันที) -->
            <button type="button" id="taxBackToHomeBtn" style="width: 100%; display: flex; align-items: center; gap: 8px; padding: 10px 12px; margin-top: 6px; border-radius: 8px; border: none; background: transparent; color: #334155; font-size: 13.5px; font-weight: 600; cursor: pointer; text-align: left; transition: background 0.15s ease;">
              กลับหน้าหลัก
            </button>
          </div>
        </aside>

        <!-- MAIN CONTENT พื้นที่ขวามือ แสดงทุกตารางครบถ้วน เลื่อนดูได้อย่างลื่นไหล -->
        <div style="flex: 1; padding: 24px 32px 80px 32px; box-sizing: border-box; min-width: 0;">
          
          <div style="font-size: 12px; font-weight: 700; color: #0284c7; margin-bottom: 2px;">Tax Planner</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
            <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #0f172a;">วางแผนภาษีบุคคลธรรมดา</h1>
            
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 8px; background: #fff; padding: 6px 14px; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                <span style="font-size: 13px; font-weight: 700; color: #475569;">ปีภาษี:</span>
                <select id="taxYearSelect" style="padding: 4px 10px; border: 1.5px solid #0284c7; border-radius: 6px; font-weight: 900; font-size: 13.5px; color: #0369a1; background: #f0f9ff; cursor: pointer; outline: none;">
                  ${yearOptionsHtml}
                </select>
                <button type="button" id="btnAddYearBtn" title="เพิ่มปีภาษีใหม่ เช่น 2025" style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 800; cursor: pointer;">
                  + เพิ่มปี
                </button>
                <span style="font-size: 12px; color: #64748b; font-weight: 600; margin-left: 6px;">บันทึกอัตโนมัติ - DAD</span>
              </div>
            </div>
          </div>

          <!-- การ์ดสรุป 5 ช่อง -->
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 12px;">
              <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px;">
                <div style="font-size: 11.5px; font-weight: 600; color: #64748b; margin-bottom: 4px;">รายได้รวม</div>
                <div id="cardTotalIncome" style="font-size: 22px; font-weight: 900; color: #0f172a;">${fmt(s.totalIncome)}</div>
              </div>
              <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px;">
                <div style="font-size: 11.5px; font-weight: 600; color: #64748b; margin-bottom: 4px;">หักค่าใช้จ่าย + ลดหย่อน</div>
                <div id="cardTotalExpenseAndDeduct" style="font-size: 22px; font-weight: 900; color: #0f172a;">${fmt(s.totalExpense + s.totalDeductCurrent)}</div>
              </div>
              <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px;">
                <div style="font-size: 11.5px; font-weight: 600; color: #64748b; margin-bottom: 4px;">เงินได้สุทธิ</div>
                <div id="cardNetTaxable" style="font-size: 22px; font-weight: 900; color: #0f172a;">${fmt(s.taxableNetCurrent)}</div>
              </div>
              <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px;">
                <div style="font-size: 11.5px; font-weight: 600; color: #64748b; margin-bottom: 4px;">ภาษีประมาณการ</div>
                <div id="cardEstimatedTax" style="font-size: 22px; font-weight: 900; color: #0f172a;">${fmt(s.taxEstimatedCurrent)}</div>
              </div>
              <div style="background: #fff; border: 1.5px solid ${s.refundOrPayCurrent >= 0 ? '#bbf7d0' : '#fecaca'}; border-radius: 8px; padding: 14px 18px;">
                <div style="font-size: 11.5px; font-weight: 700; color: ${s.refundOrPayCurrent >= 0 ? '#166534' : '#991b1b'}; margin-bottom: 4px;">ผลหลังหักภาษีที่จ่ายแล้ว</div>
                <div id="cardTaxRefund" style="font-size: 22px; font-weight: 900; color: ${s.refundOrPayCurrent >= 0 ? '#059669' : '#dc2626'};">
                  ${s.refundOrPayCurrent >= 0 ? `ขอคืน ${fmt(s.refundOrPayCurrent)}` : `จ่ายเพิ่ม ${fmt(Math.abs(s.refundOrPayCurrent))}`}
                </div>
              </div>
            </div>
            <div style="font-size: 11.5px; color: #64748b;">ใช้เพื่อประเมินเบื้องต้น ควรตรวจสอบเงื่อนไขจริงก่อนยื่นภาษี</div>
          </div>

          <!-- ตารางรายได้ตาม ม.40 -->
          <div style="background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">รายได้ตามมาตรา 40 และค่าใช้จ่าย</h3>
              <div style="display:flex; gap:8px;">
                ${this.hiddenIncomes.length > 0 ? `
                  <button type="button" id="btnRestoreHiddenIncome" style="background:#f8fafc; color:#0369a1; border:1px solid #cbd5e1; font-weight:700; padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer;">
                    👁️ คืนค่าที่ซ่อน (${this.hiddenIncomes.length})
                  </button>
                ` : ''}
                <button type="button" id="btnAddIncomeType" style="background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; font-weight: 700; padding: 6px 14px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                  เพิ่มรายการรายได้
                </button>
              </div>
            </div>
            <div style="overflow-x: auto; border: 1px solid #cbd5e1; border-radius: 4px;">
              <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="background: #2b3a4a; color: #fff; font-size: 12.5px;">
                    <th style="padding: 10px 12px;">ประเภทเงินได้</th>
                    <th style="padding: 10px 12px;">วิธีหักค่าใช้จ่าย</th>
                    <th style="padding: 10px 12px; text-align: right;">รายได้</th>
                    <th style="padding: 10px 12px; text-align: right;">ค่าใช้จ่าย</th>
                    <th style="padding: 10px 12px; text-align: right;">รายได้หลังหักค่าใช้จ่าย</th>
                    <th style="padding: 10px 12px; text-align: center;">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  ${incomeRowsHtml}
                  <tr style="background: #fefce8; font-weight: 900; font-size: 13.5px; border-top: 2px solid #cbd5e1;">
                    <td colspan="2" style="padding: 10px 12px;">รวม</td>
                    <td id="incomeTotalAmount" style="padding: 10px 12px; text-align: right; color: #0f172a;">${fmt(s.totalIncome)}</td>
                    <td id="incomeTotalExpense" style="padding: 10px 12px; text-align: right; color: #0f172a;">${fmt(s.totalExpense)}</td>
                    <td id="incomeTotalNet" style="padding: 10px 12px; text-align: right; color: #0f172a;">${fmt(s.incomeAfterExpense)}</td>
                    <td style="background: #f0f7ff;"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ตารางเงินปันผลหุ้น -->
          <div style="background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="margin-bottom: 12px;">
              <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">เงินปันผลหุ้น / เครดิตภาษี</h3>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
              <input type="text" id="input-div-ticker" placeholder="หุ้น / บริษัท" style="flex: 1.2; min-width: 120px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12.5px;">
              <input type="number" id="input-div-amount" placeholder="เงินปันผล" style="flex: 1; min-width: 100px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12.5px;">
              <input type="number" id="input-div-rate" placeholder="อัตราภาษีนิติบุคคล %" style="flex: 1; min-width: 110px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12.5px;">
              <input type="number" id="input-div-wht" placeholder="หัก ณ ที่จ่าย" style="flex: 1; min-width: 100px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12.5px;">
              <button type="button" id="btn-save-dividend" style="background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; font-weight: 700; padding: 6px 16px; border-radius: 4px; font-size: 12.5px; cursor: pointer;">
                บันทึกปันผล
              </button>
            </div>
            <div style="overflow-x: auto; border: 1px solid #cbd5e1; border-radius: 4px;">
              <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="background: #2b3a4a; color: #fff; font-size: 12.5px;">
                    <th style="padding: 10px 12px;">หุ้น / บริษัท</th>
                    <th style="padding: 10px 12px; text-align: right;">เงินปันผล</th>
                    <th style="padding: 10px 12px; text-align: center;">อัตราภาษี</th>
                    <th style="padding: 10px 12px; text-align: right;">เครดิตภาษี</th>
                    <th style="padding: 10px 12px; text-align: right;">หัก ณ ที่จ่าย</th>
                    <th style="padding: 10px 12px; text-align: right;">เงินได้รวมเครดิต</th>
                    <th style="padding: 10px 12px; text-align: center;">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  ${divRowsHtml || ''}
                  <tr style="background: #fefce8; font-weight: 900; font-size: 13.5px; border-top: 2px solid #cbd5e1;">
                    <td style="padding: 10px 12px;">รวม</td>
                    <td style="padding: 10px 12px; text-align: right;">${fmt(s.divNetSum)}</td>
                    <td></td>
                    <td style="padding: 10px 12px; text-align: right;">${fmt(s.divCreditSum)}</td>
                    <td style="padding: 10px 12px; text-align: right;">${fmt(s.divWhtSum)}</td>
                    <td style="padding: 10px 12px; text-align: right;">${fmt(s.divNetSum + s.divCreditSum)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ตารางค่าลดหย่อน -->
          <div style="background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">ค่าลดหย่อน</h3>
              <div style="display:flex; gap:8px;">
                ${this.hiddenDeductions.length > 0 ? `
                  <button type="button" id="btnRestoreHiddenDeduct" style="background:#f8fafc; color:#0369a1; border:1px solid #cbd5e1; font-weight:700; padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer;">
                    👁️ คืนค่าที่ซ่อน (${this.hiddenDeductions.length})
                  </button>
                ` : ''}
                <button type="button" id="btnAddDeductionType" style="background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; font-weight: 700; padding: 6px 14px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                  เพิ่มรายการลดหย่อน
                </button>
              </div>
            </div>
            <div style="overflow-x: auto; border: 1px solid #cbd5e1; border-radius: 4px;">
              <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="background: #2b3a4a; color: #fff; font-size: 12.5px;">
                    <th style="padding: 10px 6px; text-align: center; width: 44px;">กลุ่ม</th>
                    <th style="padding: 10px 12px;">รายการลดหย่อน</th>
                    <th style="padding: 10px 12px;">เงื่อนไข / เพดาน</th>
                    <th style="padding: 10px 12px; text-align: right;">สูงสุด</th>
                    <th style="padding: 10px 12px; text-align: right;">ค่าลดหย่อน</th>
                    <th style="padding: 10px 12px; text-align: right;">รายได้สุทธิคงเหลือ</th>
                    <th style="padding: 10px 12px; text-align: right; background: #334155;">วางแผนเพิ่ม</th>
                    <th style="padding: 10px 12px; text-align: center;">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  ${deductRowsHtml}
                  <tr style="background: #fefce8; font-weight: 900; font-size: 13.5px; border-top: 2.5px solid #cbd5e1;">
                    <td colspan="4" style="padding: 10px 12px;">รวมค่าลดหย่อน</td>
                    <td id="deductTotalCurrent" style="padding: 10px 12px; text-align: right; color: #0f172a;">${fmt(s.totalDeductCurrent)}</td>
                    <td id="deductTotalRemain" style="padding: 10px 12px; text-align: right; color: #0f172a;">${fmt(s.taxableNetCurrent)}</td>
                    <td id="deductTotalPlan" style="padding: 10px 12px; text-align: right; color: #0f172a;">${fmt(s.totalDeductPlan - s.totalDeductCurrent)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ตารางคำนวณขั้นบันไดและแผนเพิ่ม -->
          <div style="background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); background: #dbeafe; border-bottom: 1px solid #bfdbfe;">
              <div style="padding: 12px; text-align: center; border-right: 1px solid #bfdbfe;">
                <div style="font-size: 11px; font-weight: 700; color: #475569;">เงินได้สุทธิสำหรับคำนวณภาษี</div>
                <div id="bSummaryNet" style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px;">${fmt(s.taxableNetCurrent)}</div>
              </div>
              <div style="padding: 12px; text-align: center; border-right: 1px solid #bfdbfe;">
                <div style="font-size: 11px; font-weight: 700; color: #475569;">วางแผนเพิ่มแล้วเหลือ</div>
                <div id="bSummaryPlan" style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px;">${fmt(s.taxableNetPlan)}</div>
              </div>
              <div style="padding: 12px; text-align: center; border-right: 1px solid #bfdbfe;">
                <div style="font-size: 11px; font-weight: 700; color: #475569;">Tax Rate</div>
                <div id="bSummaryRate" style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px;">${s.effectiveRateCurrent}%</div>
              </div>
              <div style="padding: 12px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #475569;">Tax Rate หลังแผน</div>
                <div id="bSummaryRatePlan" style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px;">${s.effectiveRatePlan}%</div>
              </div>
            </div>

            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #e2e8f0; color: #0f172a; font-size: 12px; font-weight: 800; border-bottom: 1px solid #cbd5e1;">
                    <th style="padding: 8px 12px; text-align: center;">เงินได้สุทธิต่อปี</th>
                    <th style="padding: 8px 12px; text-align: right;">Net Income</th>
                    <th style="padding: 8px 12px; text-align: center;">อัตราภาษีเงินได้</th>
                    <th style="padding: 8px 12px; text-align: right;">Tax Amount (Max)</th>
                    <th style="padding: 8px 12px; text-align: right;">เงินได้สุทธิ</th>
                    <th style="padding: 8px 12px; text-align: right;">Tax Amount</th>
                    <th style="padding: 8px 12px; text-align: right; background: #fef08a;">วางแผนเพิ่ม</th>
                  </tr>
                </thead>
                <tbody>
                  ${bracketRowsHtml}
                  <tr style="border-top: 2px solid #cbd5e1; font-weight: 800; font-size: 13px;">
                    <td colspan="5" style="padding: 10px 12px;">Total Tax Amount</td>
                    <td id="bTotalTax" style="padding: 10px 12px; text-align: right; color: #0f172a;">${fmt(s.taxEstimatedCurrent)}</td>
                    <td id="bTotalTaxPlan" style="padding: 10px 12px; text-align: right; color: #0f172a; background: #fefce8;">${fmt(s.taxEstimatedPlan)}</td>
                  </tr>
                  <tr style="border-top: 1px solid #e2e8f0; font-weight: 700; font-size: 13px;">
                    <td colspan="5" style="padding: 8px 12px;">ภาษีหัก ณ ที่จ่ายแล้ว</td>
                    <td colspan="2" style="padding: 6px 12px; text-align: left;">
                      <input type="text" inputmode="decimal" id="tax-withheld-input" value="${fmtInput(this.taxPaidWithheld)}" style="width: 120px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 800; text-align: right; font-size: 13px;">
                    </td>
                  </tr>
                  <tr style="border-top: 1px solid #e2e8f0; font-weight: 800; font-size: 13px;">
                    <td colspan="5" style="padding: 8px 12px;">ภาษีหัก ณ ที่จ่าย / เครดิตภาษี</td>
                    <td id="bTotalCredit" style="padding: 8px 12px; text-align: right; color: #0f172a;">${fmt(this.taxPaidWithheld + s.divCreditSum)}</td>
                    <td id="bTotalCreditPlan" style="padding: 8px 12px; text-align: right; color: #0f172a; background: #fefce8;">${fmt(this.taxPaidWithheld + s.divCreditSum)}</td>
                  </tr>
                  <tr style="border-top: 1px solid #e2e8f0; font-weight: 900; font-size: 13.5px;">
                    <td colspan="5" style="padding: 8px 12px;">ภาษีที่ต้อง (รับคืน/จ่ายเพิ่ม)</td>
                    <td id="bRefund" style="padding: 8px 12px; text-align: right; color: ${s.refundOrPayCurrent >= 0 ? '#059669' : '#dc2626'};">
                      ${s.refundOrPayCurrent >= 0 ? `รับคืน ${fmt(s.refundOrPayCurrent)}` : `จ่ายเพิ่ม ${fmt(Math.abs(s.refundOrPayCurrent))}`}
                    </td>
                    <td id="bRefundPlan" style="padding: 8px 12px; text-align: right; color: ${s.refundOrPayPlan >= 0 ? '#059669' : '#dc2626'}; background: #fefce8;">
                      ${s.refundOrPayPlan >= 0 ? `รับคืน ${fmt(s.refundOrPayPlan)}` : `จ่ายเพิ่ม ${fmt(Math.abs(s.refundOrPayPlan))}`}
                    </td>
                  </tr>
                  
                  <tr style="border-top: 1.5px solid #fed7aa; background: #fff7ed; font-weight: 800; font-size: 13px; color: #c2410c;">
                    <td colspan="5" style="padding: 10px 12px;">
                      <div>💡 ลดภาระภาษีลงไปได้ (Tax Burden Reduction)</div>
                      <div id="bBurdenDesc" style="font-size: 11.5px; font-weight: 600; color: #ea580c; margin-top: 3px; display: ${s.totalPlanAdded > 0 && Number(s.taxBurdenReductionPct) > 0 ? 'block' : 'none'};">
                        💬 บอกให้รู้ว่า: ภาระภาษีที่ต้องจ่ายจริงลดฮวบลงไปถึง ~${Math.round(Number(s.taxBurdenReductionPct))}%
                      </div>
                    </td>
                    <td colspan="2" id="bBurdenReduction" style="padding: 10px 12px; text-align: right; font-size: 14px; font-weight: 900; vertical-align: top;">
                      ${s.totalPlanAdded > 0 ? s.taxBurdenReductionPct + '%' : '-'}
                    </td>
                  </tr>

                  <tr style="border-top: 1px solid #fed7aa; background: #fff7ed; font-weight: 800; font-size: 13px; color: #c2410c;">
                    <td colspan="5" style="padding: 10px 12px;">
                      <div>📈 ผลตอบแทนประหยัดภาษี (Tax Savings Yield on Plan)</div>
                      <div id="bYieldDesc" style="font-size: 11.5px; font-weight: 600; color: #ea580c; margin-top: 3px; display: ${s.totalPlanAdded > 0 && Number(s.taxSavingsYieldPct) > 0 ? 'block' : 'none'};">
                        💬 บอกให้รู้ว่า: เงินทุก 100 บาทที่เราเอาไปซื้อ RMF/กองทุนเพิ่ม เราได้เงินคืนภาษีกลับเข้ากระเป๋าทันที ${s.taxSavingsYieldPct} บาท (กำไรทันทีเกือบ ${Math.round(Number(s.taxSavingsYieldPct))}% ตั้งแต่วันที่ซื้อ)
                      </div>
                    </td>
                    <td colspan="2" id="bSavingsYield" style="padding: 10px 12px; text-align: right; font-size: 14px; font-weight: 900; vertical-align: top;">
                      ${s.totalPlanAdded > 0 ? s.taxSavingsYieldPct + '%' : '-'}
                    </td>
                  </tr>

                  <tr style="border-top: 1px solid #fed7aa; background: #ffedd5; font-weight: 900; font-size: 13.5px; color: #9a3412;">
                    <td colspan="5" style="padding: 10px 12px;">💰 ส่วนต่างภาษีที่ประหยัดได้จริง (ขอคืนเพิ่มขึ้น)</td>
                    <td colspan="2" id="bDiff" style="padding: 10px 12px; text-align: right;">${s.savingsDiff > 0 ? fmt(s.savingsDiff) + ' บาท' : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    `;

    // Event ปุ่มกลับหน้าหลัก
    container.querySelector("#taxBackToHomeBtn")?.addEventListener('click', () => {
      window.location.hash = '';
      location.reload();
    });

    // Event สลับปี และเพิ่มปี
    container.querySelector("#taxYearSelect")?.addEventListener("change", (e) => {
      this.switchYear(e.target.value);
    });

    container.querySelector("#btnAddYearBtn")?.addEventListener("click", () => {
      this.addNewYearPrompt();
    });

    container.querySelector("#btnAddIncomeType")?.addEventListener("click", () => this.openIncomeFormModal());
    container.querySelector("#btnAddDeductionType")?.addEventListener("click", () => this.openDeductionFormModal());
    
    container.querySelector("#btnRestoreHiddenIncome")?.addEventListener("click", () => {
      this.hiddenIncomes = [];
      this.saveState();
      this.render();
    });

    container.querySelector("#btnRestoreHiddenDeduct")?.addEventListener("click", () => {
      this.hiddenDeductions = [];
      this.saveState();
      this.render();
    });

    container.querySelectorAll(".btn-manage-income").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        this.openManageModal('income', id);
      });
    });

    container.querySelectorAll(".btn-manage-deduct").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        this.openManageModal('deduction', id);
      });
    });

    container.querySelectorAll(".btn-del-div").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        this.dividends.splice(idx, 1);
        this.saveState();
        this.render();
      });
    });

    container.querySelector("#btn-save-dividend")?.addEventListener("click", () => {
      const ticker = (container.querySelector("#input-div-ticker").value || '').trim();
      const amount = parseFloat(container.querySelector("#input-div-amount").value) || 0;
      const rate = parseFloat(container.querySelector("#input-div-rate").value) || 0;
      const wht = parseFloat(container.querySelector("#input-div-wht").value) || 0;
      if (!ticker || amount <= 0) {
        alert('กรุณากรอกชื่อหุ้นและจำนวนเงินปันผล');
        return;
      }
      this.dividends.push({ ticker, amount, rate, wht });
      this.saveState();
      this.render();
    });

    const setupRealtimeInput = (selector, updateObj) => {
      container.querySelectorAll(selector).forEach(input => {
        input.addEventListener("input", (e) => {
          const raw = e.target.value.replace(/,/g, '');
          const val = parseFloat(raw) || 0;
          updateObj(e.target.dataset, val);
          this.updateDOMValues();
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            input.blur();
          }
        });

        input.addEventListener("blur", (e) => {
          const raw = e.target.value.replace(/,/g, '').trim();
          const val = parseFloat(raw) || 0;
          updateObj(e.target.dataset, val);
          this.saveState();
          e.target.value = val !== 0 ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
          this.updateDOMValues();
        });

        input.addEventListener("focus", (e) => {
          const raw = e.target.value.replace(/,/g, '').trim();
          const val = parseFloat(raw) || 0;
          if (val !== 0) {
            e.target.value = val;
            e.target.select();
          }
        });
      });
    };

    setupRealtimeInput("[data-income-id]", (ds, val) => {
      const item = this.incomes.find(i => i.id === ds.incomeId);
      if (item) item.amount = val;
    });

    setupRealtimeInput("[data-deduct-id]", (ds, val) => {
      const item = this.deductions.find(d => d.id === ds.deductId);
      if (item) item.current = val;
    });

    setupRealtimeInput("[data-plan-deduct-id]", (ds, val) => {
      const item = this.deductions.find(d => d.id === ds.planDeductId);
      if (item) item.plan = val;
    });

    const whtInput = container.querySelector("#tax-withheld-input");
    if (whtInput) {
      whtInput.addEventListener("input", (e) => {
        const raw = e.target.value.replace(/,/g, '');
        this.taxPaidWithheld = parseFloat(raw) || 0;
        this.updateDOMValues();
      });
      whtInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          whtInput.blur();
        }
      });
      whtInput.addEventListener("blur", (e) => {
        const raw = e.target.value.replace(/,/g, '').trim();
        const val = parseFloat(raw) || 0;
        this.taxPaidWithheld = val;
        this.saveState();
        e.target.value = val !== 0 ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
        this.updateDOMValues();
      });
      whtInput.addEventListener("focus", (e) => {
        const raw = e.target.value.replace(/,/g, '').trim();
        const val = parseFloat(raw) || 0;
        if (val !== 0) {
          e.target.value = val;
          e.target.select();
        }
      });
    }
  },

  openIncomeFormModal() {
    const modalId = "incomeFormModal";
    let modal = document.querySelector(`#${modalId}`);
    if (modal) modal.remove();

    modal = document.createElement("div");
    modal.id = modalId;
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px);
      z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 20px;
    `;
    modal.innerHTML = `
      <div style="background:#ffffff; border-radius:16px; width:100%; max-width:440px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); overflow:hidden; border:1px solid #e2e8f0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="padding:18px 22px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:16.5px; font-weight:900; color:#0f172a; margin:0 0 2px 0;">➕ เพิ่มรายการรายได้พิเศษ</h3>
            <span style="font-size:11.5px; color:#64748b;">กรอกรายละเอียดของประเภทเงินได้</span>
          </div>
          <button type="button" id="closeModalX" style="border:none; background:none; font-size:22px; color:#94a3b8; cursor:pointer; line-height:1;">✕</button>
        </div>
        <div style="padding:20px 22px; display:flex; flex-direction:column; gap:14px;">
          <label style="display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:#334155;">ชื่อรายการรายได้
            <input type="text" id="newIncName" placeholder="เช่น รายได้จากการทำคอนเทนต์" style="height:38px; padding:0 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none; box-sizing:border-box;">
          </label>
          <label style="display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:#334155;">อัตราหักค่าใช้จ่ายเหมา (%)
            <input type="number" id="newIncRate" value="30" min="0" max="100" style="height:38px; padding:0 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; font-weight:700; outline:none; box-sizing:border-box;">
          </label>
        </div>
        <div style="padding:14px 22px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" id="cancelModalBtn" style="padding:8px 16px; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; font-weight:700; font-size:13px; color:#64748b; cursor:pointer;">ยกเลิก</button>
          <button type="button" id="saveModalBtn" style="padding:8px 20px; border-radius:8px; border:none; background:#0284c7; color:#ffffff; font-weight:800; font-size:13px; cursor:pointer;">บันทึก</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector("#closeModalX").onclick = close;
    modal.querySelector("#cancelModalBtn").onclick = close;
    modal.querySelector("#saveModalBtn").onclick = () => {
      const name = modal.querySelector("#newIncName").value.trim();
      const rateVal = parseFloat(modal.querySelector("#newIncRate").value) || 0;
      if (!name) return alert("กรุณากรอกชื่อประเภทรายได้");
      this.incomes.push({
        id: 'custom-' + Date.now(),
        code: '',
        name: name,
        defaultName: name,
        rule: `${rateVal}%`,
        rateType: 'custom',
        defaultRate: rateVal,
        rate: rateVal,
        amount: 0,
        custom: true
      });
      this.saveState();
      close();
      this.render();
    };
  },

  openDeductionFormModal() {
    const modalId = "deductionFormModal";
    let modal = document.querySelector(`#${modalId}`);
    if (modal) modal.remove();

    const groupOptions = this.groupOrder.map(g => `<option value="${g}">${g}</option>`).join('');

    modal = document.createElement("div");
    modal.id = modalId;
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px);
      z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 20px;
    `;
    modal.innerHTML = `
      <div style="background:#ffffff; border-radius:16px; width:100%; max-width:440px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); overflow:hidden; border:1px solid #e2e8f0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="padding:18px 22px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:16.5px; font-weight:900; color:#0f172a; margin:0 0 2px 0;">➕ เพิ่มรายการลดหย่อนพิเศษ</h3>
            <span style="font-size:11.5px; color:#64748b;">กรอกสิทธิประโยชน์และเพดานลดหย่อน</span>
          </div>
          <button type="button" id="closeDeductModalX" style="border:none; background:none; font-size:22px; color:#94a3b8; cursor:pointer; line-height:1;">✕</button>
        </div>
        <div style="padding:20px 22px; display:flex; flex-direction:column; gap:14px;">
          <label style="display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:#334155;">ชื่อรายการลดหย่อน
            <input type="text" id="newDeductName" placeholder="เช่น ช้อปดีมีคืน / Easy e-Receipt" style="height:38px; padding:0 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none; box-sizing:border-box;">
          </label>
          <label style="display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:#334155;">กลุ่มรายการ
            <select id="newDeductGroup" style="height:38px; padding:0 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none; box-sizing:border-box; background:#fff; cursor:pointer;">
              ${groupOptions}
            </select>
          </label>
          <label style="display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:#334155;">เพดานลดหย่อนสูงสุด (บาท)
            <input type="number" id="newDeductLimit" value="50000" min="0" style="height:38px; padding:0 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; font-weight:700; outline:none; box-sizing:border-box;">
          </label>
        </div>
        <div style="padding:14px 22px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" id="cancelDeductModalBtn" style="padding:8px 16px; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; font-weight:700; font-size:13px; color:#64748b; cursor:pointer;">ยกเลิก</button>
          <button type="button" id="saveDeductModalBtn" style="padding:8px 20px; border-radius:8px; border:none; background:#0284c7; color:#ffffff; font-weight:800; font-size:13px; cursor:pointer;">บันทึก</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector("#closeDeductModalX").onclick = close;
    modal.querySelector("#cancelDeductModalBtn").onclick = close;
    modal.querySelector("#saveDeductModalBtn").onclick = () => {
      const name = modal.querySelector("#newDeductName").value.trim();
      const group = (modal.querySelector("#newDeductGroup").value || "รายการลดหย่อนพิเศษ").trim();
      const limitVal = parseFloat(modal.querySelector("#newDeductLimit").value) || 0;
      if (!name) return alert("กรุณากรอกชื่อรายการลดหย่อน");

      this.deductions.push({
        id: 'custom-deduct-' + Date.now(),
        group: group,
        name: name,
        defaultName: name,
        rule: limitVal > 0 ? `ลดหย่อนได้สูงสุดไม่เกิน ${limitVal.toLocaleString('en-US')} บาท` : 'บันทึกตามที่จ่ายจริง หรือตามสิทธิที่กำหนด',
        defaultRule: limitVal > 0 ? `ลดหย่อนได้สูงสุดไม่เกิน ${limitVal.toLocaleString('en-US')} บาท` : 'บันทึกตามที่จ่ายจริง หรือตามสิทธิที่กำหนด',
        limit: limitVal,
        defaultLimit: limitVal,
        current: 0,
        plan: 0,
        custom: true
      });
      this.saveState();
      close();
      this.render();
    };
  },

  openManageModal(type, id) {
    if (type === 'income') {
      const item = this.incomes.find(i => i.id === id);
      if (!item) return;

      const isCustom = Boolean(item.custom);
      const defaultRate = item.defaultRate !== undefined ? item.defaultRate : this.getItemRate(item);
      const currentRate = item.rate !== undefined ? item.rate : defaultRate;

      const modalId = "taxManageModal";
      let modal = document.querySelector(`#${modalId}`);
      if (modal) modal.remove();

      modal = document.createElement("div");
      modal.id = modalId;
      modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px);
        z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 20px;
      `;
      modal.innerHTML = `
        <div style="background:#ffffff; border-radius:16px; width:100%; max-width:440px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); overflow:hidden; border:1px solid #e2e8f0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="padding:18px 22px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h3 style="font-size:16.5px; font-weight:900; color:#0f172a; margin:0 0 2px 0;">✏️ แก้ไขรายการรายได้</h3>
              <span style="font-size:11.5px; color:#64748b;">ปรับปรุงค่าคำนวณและเกณฑ์ทางภาษี</span>
            </div>
            <button type="button" id="closeManageModalX" style="border:none; background:none; font-size:22px; color:#94a3b8; cursor:pointer; line-height:1;">✕</button>
          </div>
          <div style="padding:20px 22px; display:flex; flex-direction:column; gap:14px;">
            <label style="display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:#334155;">ชื่อรายการรายได้
              <input type="text" id="editIncomeName" value="${item.name}" style="height:38px; padding:0 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none; box-sizing:border-box;">
            </label>
            <label style="display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:#334155;">อัตราหักค่าใช้จ่ายเหมา (%)
              <div style="display:flex; gap:8px; align-items:center;">
                <input type="number" id="editIncomeRate" min="0" max="100" value="${currentRate}" style="flex:1; height:38px; padding:0 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; font-weight:700; outline:none; box-sizing:border-box;">
                ${!isCustom ? `
                  <button type="button" id="btnResetRate" style="height:38px; padding:0 12px; border:1px solid #cbd5e1; background:#f8fafc; border-radius:8px; font-size:12px; font-weight:700; color:#0369a1; cursor:pointer; white-space:nowrap;">
                    ↺ คืนค่าตามเกณฑ์ (${defaultRate}%)
                  </button>
                ` : ''}
              </div>
            </label>

            <div style="margin-top:6px; padding-top:12px; border-top:1px dashed #e2e8f0;">
              ${isCustom ? `
                <button type="button" id="btnDeleteIncome" style="width:100%; height:38px; border:1px solid #fecaca; background:#fef2f2; color:#dc2626; border-radius:8px; font-size:12.5px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                  🗑️ ลบรายการนี้ออกจากระบบ
                </button>
              ` : `
                <button type="button" id="btnHideIncome" style="width:100%; height:38px; border:1px solid #e2e8f0; background:#f8fafc; color:#64748b; border-radius:8px; font-size:12.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                  👁️ ซ่อนรายการนี้ (ไม่นำมาแสดง)
                </button>
              `}
            </div>
          </div>
          <div style="padding:14px 22px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:8px;">
            <button type="button" id="cancelManageModalBtn" style="padding:8px 16px; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; font-weight:700; font-size:13px; color:#64748b; cursor:pointer;">ยกเลิก</button>
            <button type="button" id="saveManageModalBtn" style="padding:8px 20px; border-radius:8px; border:none; background:#0284c7; color:#ffffff; font-weight:800; font-size:13px; cursor:pointer;">บันทึกการแก้ไข</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const close = () => modal.remove();
      modal.querySelector("#closeManageModalX").onclick = close;
      modal.querySelector("#cancelManageModalBtn").onclick = close;

      const resetBtn = modal.querySelector("#btnResetRate");
      if (resetBtn) {
        resetBtn.onclick = () => {
          modal.querySelector("#editIncomeRate").value = defaultRate;
        };
      }

      modal.querySelector("#saveManageModalBtn").onclick = () => {
        const newName = modal.querySelector("#editIncomeName").value.trim();
        const newRate = parseFloat(modal.querySelector("#editIncomeRate").value) || 0;
        if (!newName) return alert("กรุณากรอกชื่อรายการ");
        item.name = newName;
        item.rate = newRate;
        item.rule = `${newRate}%`;
        this.saveState();
        close();
        this.render();
      };

      const delBtn = modal.querySelector("#btnDeleteIncome");
      if (delBtn) {
        delBtn.onclick = () => {
          if (confirm(`ต้องการลบรายการ "${item.name}" ออกจากระบบใช่หรือไม่?`)) {
            this.incomes = this.incomes.filter(i => i.id !== id);
            this.saveState();
            close();
            this.render();
          }
        };
      }

      const hideBtn = modal.querySelector("#btnHideIncome");
      if (hideBtn) {
        hideBtn.onclick = () => {
          if (confirm(`ต้องการซ่อนรายการ "${item.name}" ใช่หรือไม่?`)) {
            this.hiddenIncomes.push(id);
            this.saveState();
            close();
            this.render();
          }
        };
      }
    } else if (type === 'deduction') {
      const item = this.deductions.find(d => d.id === id);
      if (!item) return;

      const isCustom = Boolean(item.custom);
      const defaultLimit = item.defaultLimit !== undefined ? item.defaultLimit : (item.limit || 0);
      const currentLimit = item.limit !== undefined ? item.limit : defaultLimit;

      const groupOptions = this.groupOrder.map(g => 
        `<option value="${g}" ${g === item.group ? 'selected' : ''}>${g}</option>`
      ).join('');

      const modalId = "taxManageModal";
      let modal = document.querySelector(`#${modalId}`);
      if (modal) modal.remove();

      modal = document.createElement("div");
      modal.id = modalId;
      modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px);
        z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 20px;
      `;
      modal.innerHTML = `
        <div style="background:#ffffff; border-radius:16px; width:100%; max-width:440px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); overflow:hidden; border:1px solid #e2e8f0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="padding:18px 22px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h3 style="font-size:16.5px; font-weight:900; color:#0f172a; margin:0 0 2px 0;">✏️ แก้ไขรายการลดหย่อน</h3>
              <span style="font-size:11.5px; color:#64748b;">ปรับปรุงค่าคำนวณและเกณฑ์ทางภาษี</span>
            </div>
            <button type="button" id="closeManageModalX" style="border:none; background:none; font-size:22px; color:#94a3b8; cursor:pointer; line-height:1;">✕</button>
          </div>
          <div style="padding:20px 22px; display:flex; flex-direction:column; gap:14px;">
            <label style="display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:#334155;">ชื่อรายการลดหย่อน
              <input type="text" id="editDeductName" value="${item.name}" style="height:38px; padding:0 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none; box-sizing:border-box;">
            </label>
            <label style="display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:#334155;">กลุ่มรายการ
              <select id="editDeductGroup" style="height:38px; padding:0 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none; box-sizing:border-box; background:#fff; cursor:pointer;">
                ${groupOptions}
              </select>
            </label>
            <label style="display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:#334155;">เงื่อนไข / คำอธิบายที่แสดง
              <input type="text" id="editDeductRule" value="${item.rule || ''}" style="height:38px; padding:0 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none; box-sizing:border-box;">
            </label>
            <label style="display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:#334155;">เพดานลดหย่อนสูงสุด (บาท)
              <div style="display:flex; gap:8px; align-items:center;">
                <input type="number" id="editDeductLimit" min="0" value="${currentLimit}" style="flex:1; height:38px; padding:0 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; font-weight:700; outline:none; box-sizing:border-box;">
                ${!isCustom && defaultLimit > 0 ? `
                  <button type="button" id="btnResetLimit" style="height:38px; padding:0 12px; border:1px solid #cbd5e1; background:#f8fafc; border-radius:8px; font-size:12px; font-weight:700; color:#0369a1; cursor:pointer; white-space:nowrap;">
                    ↺ คืนค่าตามเกณฑ์ (${defaultLimit.toLocaleString('en-US')})
                  </button>
                ` : ''}
              </div>
            </label>

            <div style="margin-top:6px; padding-top:12px; border-top:1px dashed #e2e8f0;">
              ${isCustom ? `
                <button type="button" id="btnDeleteDeduct" style="width:100%; height:38px; border:1px solid #fecaca; background:#fef2f2; color:#dc2626; border-radius:8px; font-size:12.5px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                  🗑️ ลบรายการนี้ออกจากระบบ
                </button>
              ` : `
                <button type="button" id="btnHideDeduct" style="width:100%; height:38px; border:1px solid #e2e8f0; background:#f8fafc; color:#64748b; border-radius:8px; font-size:12.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                  👁️ ซ่อนรายการนี้ (ไม่นำมาแสดง)
                </button>
              `}
            </div>
          </div>
          <div style="padding:14px 22px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:8px;">
            <button type="button" id="cancelManageModalBtn" style="padding:8px 16px; border-radius:8px; border:1px solid #cbd5e1; background:#ffffff; font-weight:700; font-size:13px; color:#64748b; cursor:pointer;">ยกเลิก</button>
            <button type="button" id="saveManageModalBtn" style="padding:8px 20px; border-radius:8px; border:none; background:#0284c7; color:#ffffff; font-weight:800; font-size:13px; cursor:pointer;">บันทึกการแก้ไข</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const close = () => modal.remove();
      modal.querySelector("#closeManageModalX").onclick = close;
      modal.querySelector("#cancelManageModalBtn").onclick = close;

      const resetBtn = modal.querySelector("#btnResetLimit");
      if (resetBtn) {
        resetBtn.onclick = () => {
          modal.querySelector("#editDeductLimit").value = defaultLimit;
        };
      }

      modal.querySelector("#saveManageModalBtn").onclick = () => {
        const newName = modal.querySelector("#editDeductName").value.trim();
        const newGroup = modal.querySelector("#editDeductGroup").value.trim() || item.group;
        const newRule = modal.querySelector("#editDeductRule").value.trim();
        const newLimit = parseFloat(modal.querySelector("#editDeductLimit").value) || 0;
        if (!newName) return alert("กรุณากรอกชื่อรายการ");
        item.name = newName;
        item.group = newGroup;
        item.rule = newRule || (newLimit > 0 ? `ลดหย่อนได้สูงสุดไม่เกิน ${newLimit.toLocaleString('en-US')} บาท` : 'บันทึกตามที่จ่ายจริง หรือตามสิทธิที่กำหนด');
        item.limit = newLimit;
        this.saveState();
        close();
        this.render();
      };

      const delBtn = modal.querySelector("#btnDeleteDeduct");
      if (delBtn) {
        delBtn.onclick = () => {
          if (confirm(`ต้องการลบรายการ "${item.name}" ออกจากระบบใช่หรือไม่?`)) {
            this.deductions = this.deductions.filter(d => d.id !== id);
            this.saveState();
            close();
            this.render();
          }
        };
      }

      const hideBtn = modal.querySelector("#btnHideDeduct");
      if (hideBtn) {
        hideBtn.onclick = () => {
          if (confirm(`ต้องการซ่อนรายการ "${item.name}" ใช่หรือไม่?`)) {
            this.hiddenDeductions.push(id);
            this.saveState();
            close();
            this.render();
          }
        };
      }
    }
  }
};

TaxModule.init = function(targetEl = null) {
  this.loadYearList();
  this.loadState(this.activeYear);
  this.bindTopNav();
  if (targetEl || window.location.pathname.includes('tax.html') || window.location.hash === '#tax') {
    setTimeout(() => this.render(targetEl), 50);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TaxModule.init());
} else {
  setTimeout(() => TaxModule.init(), 100);
}