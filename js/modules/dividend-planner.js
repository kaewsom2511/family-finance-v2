/**
 * js/modules/dividend-planner.js
 * Family Finance - 3-Pillar Monthly Dividend Planner (Action Plan & Live Portfolio Integration)
 */

window.DividendPlannerModule = {
  STORAGE_KEY: "wealthport:dividend-plan-models:v3",
  TARGET_KEY: "wealthport:dividend-plan-target:v3",
  PILLAR_KEY: "wealthport:dividend-plan-pillars:v3",
  
  targetMonthlyIncome: 40000,
  taxCreditBaseRate: 0.20,

  // สัดส่วนน้ำหนักเริ่มต้นของ 3 เสาหลัก (รวมกัน 100%)
  pillarWeights: {
    thai: 45,
    us: 30,
    fund: 25
  },

  defaultModels: {
    thai: [
      { id: "th-1", symbol: "CPNREIT", name: "ทรัสต์เพื่อการลงทุนในสิทธิการเช่า CPN", yield: 8.8, months: [3, 6, 9, 12], taxRate: 0.10, hasTaxCredit: false, weight: 15, minPrice: 11.20, maxPrice: 12.00 },
      { id: "th-2", symbol: "WHART", name: "ดับบลิวเอชเอ พรีเมี่ยม โกรท", yield: 7.2, months: [3, 6, 9, 12], taxRate: 0.10, hasTaxCredit: false, weight: 12, minPrice: 9.50, maxPrice: 10.20 },
      { id: "th-3", symbol: "DIF", name: "กองทุนรวมโครงสร้างพื้นฐานโทรคมนาคม", yield: 9.5, months: [3, 6, 9, 12], taxRate: 0.10, hasTaxCredit: false, weight: 12, minPrice: 7.80, maxPrice: 8.50 },
      { id: "th-4", symbol: "FTREIT", name: "เฟรเซอร์ส พร็อพเพอร์ตี้", yield: 7.0, months: [3, 6, 9, 12], taxRate: 0.10, hasTaxCredit: false, weight: 11, minPrice: 10.20, maxPrice: 10.90 },
      { id: "th-5", symbol: "TISCO", name: "ทิสโก้ไฟแนนเชียลกรุ๊ป", yield: 7.8, months: [4], taxRate: 0.10, hasTaxCredit: true, weight: 15, minPrice: 96.00, maxPrice: 100.00 },
      { id: "th-6", symbol: "SCB", name: "เอสซีบี เอกซ์", yield: 7.5, months: [4, 9], taxRate: 0.10, hasTaxCredit: true, weight: 13, minPrice: 105.00, maxPrice: 112.00 },
      { id: "th-7", symbol: "KTB", name: "ธนาคารกรุงไทย", yield: 6.5, months: [4], taxRate: 0.10, hasTaxCredit: true, weight: 12, minPrice: 17.50, maxPrice: 19.50 },
      { id: "th-8", symbol: "AP", name: "เอพี (ไทยแลนด์)", yield: 6.8, months: [5], taxRate: 0.10, hasTaxCredit: true, weight: 10, minPrice: 8.80, maxPrice: 9.80 }
    ],
    us: [
      { id: "us-1", symbol: "JEPI", name: "JPMorgan Equity Premium Income ETF", yield: 8.8, months: [1,2,3,4,5,6,7,8,9,10,11,12], taxRate: 0.15, hasTaxCredit: false, weight: 40, minPrice: 54.00, maxPrice: 58.00 },
      { id: "us-2", symbol: "JEPQ", name: "JPMorgan Nasdaq Equity Premium ETF", yield: 10.0, months: [1,2,3,4,5,6,7,8,9,10,11,12], taxRate: 0.15, hasTaxCredit: false, weight: 35, minPrice: 52.00, maxPrice: 56.00 },
      { id: "us-3", symbol: "O", name: "Realty Income (The Monthly Dividend Co.)", yield: 5.4, months: [1,2,3,4,5,6,7,8,9,10,11,12], taxRate: 0.15, hasTaxCredit: false, weight: 25, minPrice: 50.00, maxPrice: 55.00 }
    ],
    fund: [
      { id: "fd-1", symbol: "KF-INCOME", name: "กรุงศรีโกลบอลสมาร์ทอินคัม (Auto-Redeem)", yield: 4.2, months: [1,2,3,4,5,6,7,8,9,10,11,12], taxRate: 0.00, hasTaxCredit: false, weight: 50, minPrice: 9.80, maxPrice: 10.50 },
      { id: "fd-2", symbol: "K-WPSPEEDUP", name: "เค โกลบอล ไฮ อิมแพ็คท์ ผสมปันผล", yield: 4.8, months: [3, 6, 9, 12], taxRate: 0.10, hasTaxCredit: false, weight: 50, minPrice: 10.00, maxPrice: 11.20 }
    ]
  },

  models: null,

  init() {
    try {
      const savedTarget = localStorage.getItem(this.TARGET_KEY);
      if (savedTarget) {
        const val = parseFloat(savedTarget);
        if (!isNaN(val) && val > 0) this.targetMonthlyIncome = val;
      }

      const savedPillars = localStorage.getItem(this.PILLAR_KEY);
      if (savedPillars) {
        this.pillarWeights = JSON.parse(savedPillars);
      }

      const savedModels = localStorage.getItem(this.STORAGE_KEY);
      if (savedModels) {
        this.models = JSON.parse(savedModels);
        if (!this.models.fund) this.models.fund = JSON.parse(JSON.stringify(this.defaultModels.fund));
      } else {
        this.models = JSON.parse(JSON.stringify(this.defaultModels));
        this.saveModels();
      }
    } catch (e) {
      this.models = JSON.parse(JSON.stringify(this.defaultModels));
    }
  },

  saveModels() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.models));
      localStorage.setItem(this.TARGET_KEY, String(this.targetMonthlyIncome));
      localStorage.setItem(this.PILLAR_KEY, JSON.stringify(this.pillarWeights));
    } catch (e) {
      console.error("Save Dividend Plan failed:", e);
    }
  },

  resetToDefault(container) {
    if (confirm("คุณต้องการคืนค่ารายชื่อหุ้นและสัดส่วนกลับเป็นค่าเริ่มต้น (ไทย 45% · US 30% · กองทุน 25%) ใช่หรือไม่?")) {
      this.models = JSON.parse(JSON.stringify(this.defaultModels));
      this.pillarWeights = { thai: 45, us: 30, fund: 25 };
      this.targetMonthlyIncome = 40000;
      this.saveModels();
      this.render(container);
    }
  },

  formatBaht(num) {
    return '฿' + Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatNum(num) {
    return Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  },

  // ดึงข้อมูลหุ้นที่ถือจริงจาก PortfolioModule
  getActualHolding(symbol) {
    try {
      if (typeof PortfolioModule !== 'undefined' && typeof PortfolioModule.calculatePortfolioDetail === 'function') {
        const data = (typeof getPortfolioDataHelper === 'function') ? getPortfolioDataHelper() : {};
        const summary = PortfolioModule.calculatePortfolioDetail(data, 'ALL');
        const cleanTarget = symbol.replace('.BK', '').toUpperCase();
        const found = (summary.activeHoldings || []).find(h => h.symbol.replace('.BK', '').toUpperCase() === cleanTarget);
        if (found) {
          return {
            shares: parseFloat(found.shares) || 0,
            marketValue: parseFloat(found.marketValue) || 0
          };
        }
      }
    } catch (e) {}
    return { shares: 0, marketValue: 0 };
  },

  calculatePlan() {
    if (!this.models) this.init();

    const targetAnnualNet = this.targetMonthlyIncome * 12;
    const totalPillarPct = (Number(this.pillarWeights.thai) || 0) + (Number(this.pillarWeights.us) || 0) + (Number(this.pillarWeights.fund) || 0) || 100;
    
    const ratioThai = (Number(this.pillarWeights.thai) || 0) / totalPillarPct;
    const ratioUs = (Number(this.pillarWeights.us) || 0) / totalPillarPct;
    const ratioFund = (Number(this.pillarWeights.fund) || 0) / totalPillarPct;

    const targetThaiAnnualNet = targetAnnualNet * ratioThai;
    const targetUsAnnualNet = targetAnnualNet * ratioUs;
    const targetFundAnnualNet = targetAnnualNet * ratioFund;

    const thaiWeightTotal = (this.models.thai || []).reduce((s, i) => s + (Number(i.weight) || 0), 0) || 1;
    const usWeightTotal = (this.models.us || []).reduce((s, i) => s + (Number(i.weight) || 0), 0) || 1;
    const fundWeightTotal = (this.models.fund || []).reduce((s, i) => s + (Number(i.weight) || 0), 0) || 1;

    let weightedThaiYield = this.models.thai.reduce((sum, item) => sum + (Number(item.yield || 0) * ((Number(item.weight) || 0) / thaiWeightTotal)), 0);
    let avgThaiNetYield = weightedThaiYield * 0.90;
    let requiredThaiCapital = avgThaiNetYield > 0 ? (targetThaiAnnualNet / (avgThaiNetYield / 100)) : 0;

    let weightedUsYield = this.models.us.reduce((sum, item) => sum + (Number(item.yield || 0) * ((Number(item.weight) || 0) / usWeightTotal)), 0);
    let avgUsNetYield = weightedUsYield * 0.85;
    let requiredUsCapital = avgUsNetYield > 0 ? (targetUsAnnualNet / (avgUsNetYield / 100)) : 0;

    let weightedFundYield = this.models.fund.reduce((sum, item) => {
      const netYld = Number(item.yield || 0) * (1 - (Number(item.taxRate) || 0));
      return sum + (netYld * ((Number(item.weight) || 0) / fundWeightTotal));
    }, 0);
    let requiredFundCapital = weightedFundYield > 0 ? (targetFundAnnualNet / (weightedFundYield / 100)) : 0;

    let totalCapitalRequired = requiredThaiCapital + requiredUsCapital + requiredFundCapital;

    const monthlyNetCashflow = Array(12).fill(0);
    let totalTaxCreditEstimate = 0;

    this.models.thai.forEach(item => {
      const allocatedCap = requiredThaiCapital * ((Number(item.weight) || 0) / thaiWeightTotal);
      const grossDivAnnual = allocatedCap * (Number(item.yield || 0) / 100);
      const netDivAnnual = grossDivAnnual * (1 - (Number(item.taxRate) || 0.10));
      const payMonths = Array.isArray(item.months) && item.months.length > 0 ? item.months : [12];
      const divPerEvent = netDivAnnual / payMonths.length;

      if (item.hasTaxCredit) {
        totalTaxCreditEstimate += grossDivAnnual * (20 / 80);
      }

      payMonths.forEach(m => {
        if (m >= 1 && m <= 12) monthlyNetCashflow[m - 1] += divPerEvent;
      });

      item.allocatedCap = allocatedCap;
      item.annualNet = netDivAnnual;
    });

    this.models.us.forEach(item => {
      const allocatedCap = requiredUsCapital * ((Number(item.weight) || 0) / usWeightTotal);
      const grossDivAnnual = allocatedCap * (Number(item.yield || 0) / 100);
      const netDivAnnual = grossDivAnnual * (1 - (Number(item.taxRate) || 0.15));
      const payMonths = Array.isArray(item.months) && item.months.length > 0 ? item.months : [12];
      const divPerEvent = netDivAnnual / payMonths.length;

      payMonths.forEach(m => {
        if (m >= 1 && m <= 12) monthlyNetCashflow[m - 1] += divPerEvent;
      });

      item.allocatedCap = allocatedCap;
      item.annualNet = netDivAnnual;
    });

    this.models.fund.forEach(item => {
      const allocatedCap = requiredFundCapital * ((Number(item.weight) || 0) / fundWeightTotal);
      const grossDivAnnual = allocatedCap * (Number(item.yield || 0) / 100);
      const netDivAnnual = grossDivAnnual * (1 - (Number(item.taxRate) || 0));
      const payMonths = Array.isArray(item.months) && item.months.length > 0 ? item.months : [12];
      const divPerEvent = netDivAnnual / payMonths.length;

      payMonths.forEach(m => {
        if (m >= 1 && m <= 12) monthlyNetCashflow[m - 1] += divPerEvent;
      });

      item.allocatedCap = allocatedCap;
      item.annualNet = netDivAnnual;
    });

    return {
      targetMonthly: this.targetMonthlyIncome,
      targetAnnual: targetAnnualNet,
      totalCapitalRequired,
      requiredThaiCapital,
      requiredUsCapital,
      requiredFundCapital,
      monthlyNetCashflow,
      totalTaxCreditEstimate,
      thaiWeightTotal,
      usWeightTotal,
      fundWeightTotal,
      totalPillarPct,
      avgMonthlyNet: monthlyNetCashflow.reduce((a, b) => a + b, 0) / 12,
      weightedYieldTotal: totalCapitalRequired > 0 ? (targetAnnualNet / totalCapitalRequired) * 100 : 0
    };
  },

  openEditModal(category, item = null, container = null) {
    const isEdit = !!item;
    const modalId = "div-plan-edit-modal";
    document.getElementById(modalId)?.remove();

    const categoryNames = {
      thai: "🇹🇭 หุ้นไทย/REITs",
      us: "🌐 หุ้นต่างประเทศ (DR / US / Global ETFs)",
      fund: "🌱 กองทุนรวม (Mutual Fund)"
    };

    const currentItem = item || {
      id: `${category}-${Date.now()}`,
      symbol: "",
      name: "",
      yield: category === "fund" ? 4.5 : 7.0,
      weight: 10,
      minPrice: category === "thai" ? 10 : (category === "us" ? 50 : 10),
      maxPrice: category === "thai" ? 12 : (category === "us" ? 55 : 12),
      months: category === "us" || category === "fund" ? [1,2,3,4,5,6,7,8,9,10,11,12] : [3, 6, 9, 12],
      taxRate: category === "thai" ? 0.10 : (category === "us" ? 0.15 : 0.00),
      hasTaxCredit: category === "thai"
    };

    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthCheckboxesHtml = monthNames.map((name, i) => {
      const mNum = i + 1;
      const checked = (currentItem.months || []).includes(mNum) ? "checked" : "";
      return `
        <label style="display:flex; align-items:center; gap:4px; font-size:12px; cursor:pointer; background:#f8fafc; padding:6px 8px; border-radius:6px; border:1px solid #e2e8f0;">
          <input type="checkbox" name="plan-month" value="${mNum}" ${checked} style="cursor:pointer;">
          <span>${name}</span>
        </label>
      `;
    }).join('');

    const modalHtml = `
      <div id="${modalId}" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:999999;">
        <div style="background:#fff; border-radius:16px; width:520px; max-width:95vw; max-height:92vh; overflow-y:auto; padding:24px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.25);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; border-bottom:1px solid #f1f5f9; padding-bottom:12px;">
            <h3 style="margin:0; font-size:17px; font-weight:800; color:#0f172a;">
              ${isEdit ? '✏️ แก้ไขข้อมูลสินทรัพย์' : '➕ เพิ่มสินทรัพย์ในแผนปันผล'} (${categoryNames[category]})
            </h3>
            <button id="btn-close-plan-modal" style="background:none; border:none; font-size:22px; color:#94a3b8; cursor:pointer;">&times;</button>
          </div>

          <div style="display:flex; flex-direction:column; gap:14px;">
            <div style="display:flex; gap:10px;">
              <div style="flex:1;">
                <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:4px;">สัญลักษณ์ (Symbol)</label>
                <input type="text" id="modal-plan-sym" value="${currentItem.symbol || ''}" placeholder="เช่น CPNREIT, SCHD" style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13.5px; text-transform:uppercase; font-weight:800;">
              </div>
              <div style="flex:1.5;">
                <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:4px;">ชื่อสินทรัพย์ / นโยบาย</label>
                <input type="text" id="modal-plan-name" value="${currentItem.name || ''}" placeholder="ชื่อเต็มหรือประเภทกองทุน" style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px;">
              </div>
            </div>

            <div style="display:flex; gap:10px;">
              <div style="flex:1;">
                <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:4px;">Yield คาดการณ์ (% ต่อปี)</label>
                <input type="number" id="modal-plan-yield" value="${currentItem.yield}" step="0.1" style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13.5px; font-weight:700;">
              </div>
              <div style="flex:1;">
                <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:4px;">สัดส่วนในกลุ่ม (Weight %)</label>
                <input type="number" id="modal-plan-weight" value="${currentItem.weight}" step="1" style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13.5px; font-weight:700;">
              </div>
            </div>

            <!-- ช่วงราคาซื้อสะสม -->
            <div style="display:flex; gap:10px;">
              <div style="flex:1;">
                <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:4px;">ราคาซื้อต่ำสุด (Min Price)</label>
                <input type="number" id="modal-plan-minprice" value="${currentItem.minPrice || 0}" step="any" style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13.5px;">
              </div>
              <div style="flex:1;">
                <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:4px;">ราคาซื้อสูงสุด (Max Price)</label>
                <input type="number" id="modal-plan-maxprice" value="${currentItem.maxPrice || 0}" step="any" style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13.5px;">
              </div>
            </div>

            ${category === 'fund' ? `
              <div>
                <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:4px;">รูปแบบการรับเงินของกองทุนรวม</label>
                <select id="modal-plan-fund-tax" style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; background:#fff; font-weight:600;">
                  <option value="0" ${currentItem.taxRate === 0 ? 'selected' : ''}>🟢 Auto-Redeem / รับเงินสดคืนอัตโนมัติ (ยกเว้นภาษี 0%)</option>
                  <option value="0.10" ${currentItem.taxRate > 0 ? 'selected' : ''}>🟡 กองทุนจ่ายเงินปันผล (หัก ณ ที่จ่าย 10%)</option>
                </select>
              </div>
            ` : ''}

            <div>
              <label style="display:block; font-size:12px; font-weight:700; color:#475569; margin-bottom:6px;">เดือนที่คาดว่าจะจ่ายเงินสด/ปันผล:</label>
              <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px;">
                ${monthCheckboxesHtml}
              </div>
              <div style="display:flex; gap:8px; margin-top:6px;">
                <button type="button" id="btn-select-all-months" style="background:#f1f5f9; border:none; padding:4px 8px; border-radius:4px; font-size:11px; color:#475569; cursor:pointer;">เลือกทุกเดือน (Monthly)</button>
                <button type="button" id="btn-select-quarter-months" style="background:#f1f5f9; border:none; padding:4px 8px; border-radius:4px; font-size:11px; color:#475569; cursor:pointer;">รายไตรมาส (3,6,9,12)</button>
              </div>
            </div>

            ${category === 'thai' ? `
              <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 14px;">
                <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:#1e40af; cursor:pointer;">
                  <input type="checkbox" id="modal-plan-taxcredit" ${currentItem.hasTaxCredit ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px;">
                  <span>ได้รับสิทธิเครดิตภาษีเงินปันผล (หุ้นนิติบุคคล ฐาน 20%)</span>
                </label>
              </div>
            ` : ''}

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px; border-top:1px solid #f1f5f9; padding-top:14px;">
              <button id="btn-cancel-plan-modal" style="background:#fff; border:1px solid #cbd5e1; padding:9px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;">ยกเลิก</button>
              <button id="btn-save-plan-modal" style="background:#059669; color:#fff; border:none; padding:9px 22px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer;">บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const close = () => document.getElementById(modalId)?.remove();
    document.getElementById("btn-close-plan-modal").onclick = close;
    document.getElementById("btn-cancel-plan-modal").onclick = close;

    document.getElementById("btn-select-all-months").onclick = () => {
      document.querySelectorAll("input[name='plan-month']").forEach(cb => cb.checked = true);
    };

    document.getElementById("btn-select-quarter-months").onclick = () => {
      document.querySelectorAll("input[name='plan-month']").forEach(cb => {
        cb.checked = [3, 6, 9, 12].includes(parseInt(cb.value));
      });
    };

    document.getElementById("btn-save-plan-modal").onclick = () => {
      const sym = document.getElementById("modal-plan-sym").value.trim().toUpperCase();
      const name = document.getElementById("modal-plan-name").value.trim();
      const yld = parseFloat(document.getElementById("modal-plan-yield").value) || 0;
      const wt = parseFloat(document.getElementById("modal-plan-weight").value) || 0;
      const minP = parseFloat(document.getElementById("modal-plan-minprice").value) || 0;
      const maxP = parseFloat(document.getElementById("modal-plan-maxprice").value) || minP;
      const tc = !!document.getElementById("modal-plan-taxcredit")?.checked;
      
      let taxRate = currentItem.taxRate;
      if (category === "fund") {
        taxRate = parseFloat(document.getElementById("modal-plan-fund-tax")?.value || 0);
      }

      const checkedMonths = [];
      document.querySelectorAll("input[name='plan-month']:checked").forEach(cb => {
        checkedMonths.push(parseInt(cb.value));
      });

      if (!sym) {
        alert("กรุณาระบุสัญลักษณ์ย่อของสินทรัพย์");
        return;
      }
      if (checkedMonths.length === 0) {
        alert("กรุณาเลือกเดือนที่รับเงินอย่างน้อย 1 เดือน");
        return;
      }

      currentItem.symbol = sym;
      currentItem.name = name || sym;
      currentItem.yield = yld;
      currentItem.weight = wt;
      currentItem.minPrice = minP;
      currentItem.maxPrice = maxP;
      currentItem.months = checkedMonths.sort((a,b)=>a-b);
      currentItem.taxRate = taxRate;
      currentItem.hasTaxCredit = tc;

      if (!isEdit) {
        if (!this.models[category]) this.models[category] = [];
        this.models[category].push(currentItem);
      }

      this.saveModels();
      close();
      this.render(container);
    };
  },

  deleteItem(category, id, symbol, container) {
    if (confirm(`คุณต้องการลบ "${symbol}" ออกจากแผนปันผลใช่หรือไม่?`)) {
      this.models[category] = (this.models[category] || []).filter(i => i.id !== id);
      this.saveModels();
      this.render(container);
    }
  },

  render(container) {
    if (!container) return;
    this.init();
    const plan = this.calculatePlan();
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const maxVal = Math.max(...plan.monthlyNetCashflow, 1);

    const is100Pct = Math.abs(plan.totalPillarPct - 100) < 0.1;

    const chartBarsHtml = monthNames.map((m, idx) => {
      const val = plan.monthlyNetCashflow[idx];
      const hPct = Math.round((val / maxVal) * 100);
      const isAboveTarget = val >= plan.targetMonthly;
      return `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:160px; min-width:32px;">
          <div style="font-size:10px; font-weight:700; color:${isAboveTarget ? '#16a34a' : '#d97706'}; margin-bottom:4px;">
            ${this.formatNum(val)}
          </div>
          <div style="width:100%; max-width:24px; background:#f1f5f9; height:110px; border-radius:4px; display:flex; align-items:flex-end; overflow:hidden;">
            <div style="width:100%; height:${Math.max(6, hPct)}%; background:${isAboveTarget ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' : 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)'}; border-radius:4px;"></div>
          </div>
          <div style="font-size:11.5px; font-weight:600; margin-top:8px; color:#475569;">${m}</div>
        </div>
      `;
    }).join('');

    // ฟังก์ชันสร้างแถวข้อมูลตาราง Action Plan ดึงข้อมูลพอร์ตจริง
    const generateRows = (list, cat) => (list || []).map((item, idx) => {
      const avgPrice = ((Number(item.minPrice || 0) + Number(item.maxPrice || 0)) / 2) || (cat === 'thai' ? 10 : 50);
      const targetShares = avgPrice > 0 ? Math.round((item.allocatedCap || 0) / avgPrice) : 0;
      const unitLabel = cat === 'fund' ? 'หน่วย' : 'หุ้น';

      const holdingInfo = this.getActualHolding(item.symbol);
      const actualShares = holdingInfo.shares;
      const actualVal = actualShares > 0 ? (holdingInfo.marketValue > 0 ? holdingInfo.marketValue : (actualShares * avgPrice)) : 0;

      const neededShares = Math.max(0, targetShares - actualShares);
      const neededVal = neededShares * avgPrice;
      const progressPct = targetShares > 0 ? Math.min(100, (actualShares / targetShares) * 100) : 0;

      const priceRangeStr = (item.minPrice && item.maxPrice) 
        ? `${Number(item.minPrice).toFixed(2)} – ${Number(item.maxPrice).toFixed(2)}`
        : '-';

      const taxBadge = cat === 'thai'
        ? (item.hasTaxCredit ? '<span style="background:#eff6ff; color:#2563eb; font-size:10px; padding:1px 5px; border-radius:3px; font-weight:600; margin-left:6px;">✓ ฐาน 20%</span>' : '<span style="background:#f1f5f9; color:#64748b; font-size:10px; padding:1px 5px; border-radius:3px; font-weight:600; margin-left:6px;">หัก 10%</span>')
        : (cat === 'us'
            ? '<span style="background:#f0f9ff; color:#0369a1; font-size:10px; padding:1px 5px; border-radius:3px; font-weight:600; margin-left:6px;">W-8BEN 15%</span>'
            : (item.taxRate === 0 ? '<span style="background:#ecfdf5; color:#16a34a; font-size:10px; padding:1px 5px; border-radius:3px; font-weight:600; margin-left:6px;">Auto-Redeem 0%</span>' : '<span style="background:#f1f5f9; color:#64748b; font-size:10px; padding:1px 5px; border-radius:3px; font-weight:600; margin-left:6px;">หัก 10%</span>'));

      const actualDisplay = actualShares > 0
        ? `<div><strong>${this.formatNum(actualShares)}</strong></div><div style="font-size:10.5px; color:#64748b; font-weight:normal;">(${this.formatBaht(actualVal)})</div>`
        : `<div style="color:#94a3b8;">0</div>`;

      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 8px; text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
          <td style="padding: 10px 8px; text-align: left;">
            <div style="display:inline-flex; align-items:center;">
              <strong style="color: #0f172a; font-size: 13.5px;">${item.symbol}</strong>
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px; display:flex; align-items:center; flex-wrap:wrap;">
              <span>รอบจ่าย: ${(item.months||[]).length === 12 ? 'ทุกเดือน' : (item.months||[]).map(m => monthNames[m-1]).join(', ')}</span>
              ${taxBadge}
            </div>
          </td>
          <td style="text-align: right; padding: 10px 8px; font-weight: 700; color: #334155;">${Number(item.weight)}%</td>
          <td style="text-align: right; padding: 10px 8px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums;">
            ${this.formatBaht(item.allocatedCap)}
          </td>
          <td style="text-align: right; padding: 10px 8px; color: #64748b; font-size: 12px; font-variant-numeric: tabular-nums;">
            ${priceRangeStr}
          </td>
          <td style="text-align: right; padding: 10px 8px; font-weight: 800; color: #0284c7; font-variant-numeric: tabular-nums;">
            <div>${this.formatNum(targetShares)}</div>
            <div style="font-size: 10.5px; color: #64748b; font-weight: normal;">${unitLabel}</div>
          </td>
          <td style="text-align: right; padding: 10px 8px; font-weight: 700; color: #d97706; font-variant-numeric: tabular-nums;">
            ${actualDisplay}
          </td>
          <td style="text-align: right; padding: 10px 8px; font-weight: 700; color: ${neededShares > 0 ? '#dc2626' : '#16a34a'}; font-variant-numeric: tabular-nums;">
            <div>${neededShares > 0 ? `+${this.formatNum(neededShares)}` : 'ครบ ✓'}</div>
            ${neededShares > 0 ? `<div style="font-size: 10px; color: #ef4444; font-weight: normal;">(~${this.formatBaht(neededVal)})</div>` : ''}
          </td>
          <td style="text-align: right; padding: 10px 8px;">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
              <span style="font-size: 11px; font-weight: 700; color: ${progressPct >= 100 ? '#16a34a' : '#0284c7'};">${progressPct.toFixed(0)}%</span>
              <div style="width: 45px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; display:inline-block;">
                <div style="width: ${progressPct}%; height: 100%; background: ${progressPct >= 100 ? '#10b981' : '#0284c7'};"></div>
              </div>
            </div>
          </td>
          <td style="text-align: right; padding: 10px 8px; color: #0284c7; font-weight: 700; font-variant-numeric: tabular-nums;">${Number(item.yield).toFixed(1)}%</td>
          <td style="text-align: right; padding: 10px 8px; font-weight: 800; color: #16a34a; font-variant-numeric: tabular-nums;">${this.formatBaht(item.annualNet)}</td>
          <td style="text-align: center; padding: 10px 8px; white-space: nowrap;">
            <button class="btn-edit-plan-item" data-cat="${cat}" data-id="${item.id}" style="background: none; border: 1px solid #cbd5e1; padding: 3px 6px; border-radius: 4px; font-size: 11px; cursor: pointer; margin-right: 2px;">✏️</button>
            <button class="btn-delete-plan-item" data-cat="${cat}" data-id="${item.id}" data-sym="${item.symbol}" style="background: none; border: 1px solid #fecaca; color: #dc2626; padding: 3px 6px; border-radius: 4px; font-size: 11px; cursor: pointer;">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');

    const theadActionPlan = `
      <thead>
        <tr style="border-bottom:2px solid #e2e8f0; color:#64748b; font-size:12px; background:#f8fafc;">
          <th style="padding:8px 8px; text-align:center; width:35px;">#</th>
          <th style="padding:8px 8px; text-align:left;">สัญลักษณ์ / รอบจ่าย</th>
          <th style="padding:8px 8px; text-align:right;">สัดส่วน</th>
          <th style="padding:8px 8px; text-align:right;">เงินลงทุนแผน</th>
          <th style="padding:8px 8px; text-align:right;">ช่วงราคา</th>
          <th style="padding:8px 8px; text-align:right; color:#0284c7;">เป้าหมาย</th>
          <th style="padding:8px 8px; text-align:right; color:#d97706;">ถือจริง</th>
          <th style="padding:8px 8px; text-align:right;">ต้องซื้อเพิ่ม</th>
          <th style="padding:8px 8px; text-align:right;">ความคืบหน้า</th>
          <th style="padding:8px 8px; text-align:right; color:#0284c7;">Yield</th>
          <th style="padding:8px 8px; text-align:right; color:#16a34a;">ปันผลสุทธิ/ปี</th>
          <th style="padding:8px 8px; text-align:center; width:65px;">จัดการ</th>
        </tr>
      </thead>
    `;

    container.innerHTML = `
      <div class="portfolio-container" style="width:100% !important; max-width:100% !important; padding:0 0 30px 0 !important; text-align:left;">
        
        <!-- Header & Target Income -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:14px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="background:#ecfdf5; color:#059669; width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:10px; font-size:22px; flex-shrink:0;">🎯</div>
            <div>
              <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700; letter-spacing:0.5px;">3-PILLAR PASSIVE INCOME SIMULATOR</div>
              <h1 style="margin:0; font-size:22px; font-weight:800; color:#0f172a;">วางแผนเงินปันผลรายเดือน (3 เสาหลักสร้างกระแสเงินสด)</h1>
            </div>
          </div>
          
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:8px; background:#fff; padding:6px 14px; border:1px solid #cbd5e1; border-radius:8px;">
              <label style="font-size:12.5px; font-weight:700; color:#334155;">เป้าหมายปันผลสุทธิ:</label>
              <input type="number" id="input-plan-target-monthly" value="${this.targetMonthlyIncome}" step="5000" style="width:100px; padding:5px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13.5px; font-weight:800; color:#0f172a; text-align:right;">
              <span style="font-size:12.5px; color:#64748b; font-weight:600;">บาท/เดือน</span>
              <button id="btn-recalculate-plan" style="background:#059669; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">คำนวณใหม่</button>
            </div>
            <button id="btn-reset-plan-defaults" style="background:#fff; border:1px solid #cbd5e1; color:#475569; padding:7px 12px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;">🔄 คืนค่าเริ่มต้น</button>
          </div>
        </div>

        <!-- กล่องปรับสัดส่วน 3 เสาหลัก (Interactive Proportions Bar) -->
        <div style="background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:12px; padding:14px 18px; margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
            <div style="font-size:13px; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:6px;">
              <span>⚖️ ปรับสัดส่วน 3 เสาหลักในพอร์ต (%):</span>
              ${!is100Pct ? `<span style="color:#ef4444; font-size:11.5px; font-weight:700;">(ผลรวมปัจจุบัน ${plan.totalPillarPct}% - ควรปรับให้ครบ 100%)</span>` : '<span style="color:#10b981; font-size:11.5px; font-weight:700;">(รวมครบ 100% สมบูรณ์)</span>'}
            </div>
            <button id="btn-save-pillar-weights" style="background:#0284c7; color:#fff; border:none; padding:5px 14px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">💾 บันทึกสัดส่วนใหม่</button>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
            <div style="background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:8px 12px; display:flex; align-items:center; justify-content:space-between;">
              <span style="font-size:12px; font-weight:700; color:#0f172a;">🇹🇭 หุ้นไทย & REITs</span>
              <div style="display:flex; align-items:center; gap:4px;">
                <input type="number" id="input-weight-thai" value="${this.pillarWeights.thai}" min="0" max="100" style="width:55px; text-align:right; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-weight:800; font-size:13px;">
                <span style="font-size:12px; font-weight:700;">%</span>
              </div>
            </div>

            <div style="background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:8px 12px; display:flex; align-items:center; justify-content:space-between;">
              <span style="font-size:12px; font-weight:700; color:#0284c7;">🇺🇸 หุ้นต่างประเทศ</span>
              <div style="display:flex; align-items:center; gap:4px;">
                <input type="number" id="input-weight-us" value="${this.pillarWeights.us}" min="0" max="100" style="width:55px; text-align:right; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-weight:800; font-size:13px;">
                <span style="font-size:12px; font-weight:700;">%</span>
              </div>
            </div>

            <div style="background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:8px 12px; display:flex; align-items:center; justify-content:space-between;">
              <span style="font-size:12px; font-weight:700; color:#10b981;">🌱 กองทุนรวม (Fund)</span>
              <div style="display:flex; align-items:center; gap:4px;">
                <input type="number" id="input-weight-fund" value="${this.pillarWeights.fund}" min="0" max="100" style="width:55px; text-align:right; padding:4px 6px; border:1px solid #cbd5e1; border-radius:4px; font-weight:800; font-size:13px;">
                <span style="font-size:12px; font-weight:700;">%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4 กล่องสรุปภาพรวม -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(230px, 1fr)); gap:14px; margin-bottom:20px;">
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:18px;">
            <div style="font-size:11.5px; color:#64748b; margin-bottom:6px; font-weight:600;">💼 เงินต้นรวมที่ต้องใช้ (Total Capital)</div>
            <div style="font-size:22px; font-weight:900; color:#0f172a;">${this.formatBaht(plan.totalCapitalRequired)}</div>
            <div style="font-size:11.5px; color:#64748b; margin-top:6px;">Yield เฉลี่ยสุทธิ: <strong>${plan.weightedYieldTotal.toFixed(2)}%</strong></div>
          </div>
          <div style="background:#fff; border:1px solid #bbf7d0; border-radius:12px; padding:18px;">
            <div style="font-size:11.5px; color:#065f46; margin-bottom:6px; font-weight:600;">💵 ปันผลรับสุทธิเฉลี่ย (Net / Month)</div>
            <div style="font-size:22px; font-weight:900; color:#16a34a;">${this.formatBaht(plan.avgMonthlyNet)}</div>
            <div style="font-size:11.5px; color:#16a34a; margin-top:6px;">เป้าหมายรวม: <strong>${this.formatBaht(plan.targetAnnual)} / ปี</strong></div>
          </div>
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:18px;">
            <div style="font-size:11.5px; color:#64748b; margin-bottom:6px; font-weight:600;">🧾 สิทธิเครดิตภาษีเงินปันผล (ประมาณการ)</div>
            <div style="font-size:22px; font-weight:900; color:#0284c7;">+${this.formatBaht(plan.totalTaxCreditEstimate)}</div>
            <div style="font-size:11.5px; color:#0284c7; margin-top:6px;">ขอคืนได้รอบ ภ.ง.ด.90 (ฐาน 20%)</div>
          </div>
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:18px;">
            <div style="font-size:11.5px; color:#64748b; margin-bottom:6px; font-weight:600;">📊 สัดส่วน 3 เสาหลักในพอร์ต</div>
            <div style="font-size:12px; font-weight:700; color:#0f172a; margin-top:4px;">🇹🇭 ไทย ${this.pillarWeights.thai}%: ${this.formatBaht(plan.requiredThaiCapital)}</div>
            <div style="font-size:12px; font-weight:700; color:#0284c7; margin-top:2px;">🌐 หุ้นต่างประเทศ ${this.pillarWeights.us}%: ${this.formatBaht(plan.requiredUsCapital)}</div>
            <div style="font-size:12px; font-weight:700; color:#16a34a; margin-top:2px;">🌱 กองทุน ${this.pillarWeights.fund}%: ${this.formatBaht(plan.requiredFundCapital)}</div>
          </div>
        </div>

        <!-- แผนภูมิกระแสเงินสดปันผล 12 เดือน -->
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px 24px; margin-bottom:22px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h3 style="margin:0; font-size:15px; font-weight:700; color:#0f172a;">📅 แผนภูมิกระแสเงินสดปันผลจำลอง 12 เดือน (Estimated Cash Flow)</h3>
              <div style="font-size:12px; color:#64748b; margin-top:2px;">แสดงเม็ดเงินปันผลสุทธิหลังหักภาษีที่จะเข้าบัญชีในแต่ละเดือนเมื่อมีกองทุนรวมช่วยเติมเต็ม</div>
            </div>
            <span style="background:#ecfdf5; color:#059669; font-weight:700; font-size:12px; padding:4px 10px; border-radius:6px;">
              เส้นเป้าหมาย: ${this.formatBaht(plan.targetMonthly)} / เดือน
            </span>
          </div>
          <div style="display:flex; gap:8px; justify-content:space-between; align-items:flex-end; padding-top:10px; border-bottom:1px solid #f1f5f9; padding-bottom:12px;">
            ${chartBarsHtml}
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:20px;">
          
          <!-- เสาหลักที่ 1: หุ้นไทย & REITs -->
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <div>
                <h3 style="margin:0; font-size:15px; font-weight:800; color:#0f172a;">🇹🇭 เสาหลักที่ 1: หุ้นปันผลไทย & กองทรัสต์ REITs (สัดส่วน ${this.pillarWeights.thai}%)</h3>
                <span style="font-size:12px; color:#64748b;">เงินลงทุนกลุ่ม: <strong>${this.formatBaht(plan.requiredThaiCapital)}</strong> | น้ำหนักรวม: <strong>${plan.thaiWeightTotal}%</strong></span>
              </div>
              <button class="btn-add-plan-asset" data-cat="thai" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">➕ เพิ่มสินทรัพย์ไทย</button>
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; font-size:13px;">
                ${theadActionPlan}
                <tbody>${generateRows(this.models.thai, 'thai')}</tbody>
              </table>
            </div>
          </div>

          <!-- เสาหลักที่ 2: US Monthly ETFs -->
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <div>
                <h3 style="margin:0; font-size:15px; font-weight:800; color:#0f172a;">🇺🇸 เสาหลักที่ 2: US Monthly ETFs & REITs (สัดส่วน ${this.pillarWeights.us}%)</h3>
                <span style="font-size:12px; color:#64748b;">เงินลงทุนกลุ่ม: <strong>${this.formatBaht(plan.requiredUsCapital)}</strong> | น้ำหนักรวม: <strong>${plan.usWeightTotal}%</strong></span>
              </div>
              <button class="btn-add-plan-asset" data-cat="us" style="background:#f0f9ff; color:#0284c7; border:1px solid #bae6fd; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">➕ เพิ่มสินทรัพย์ต่างประเทศ</button>
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; font-size:13px;">
                ${theadActionPlan}
                <tbody>${generateRows(this.models.us, 'us')}</tbody>
              </table>
            </div>
          </div>

          <!-- เสาหลักที่ 3: กองทุนรวมเพื่อเสถียรภาพ & Auto-Redeem -->
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <div>
                <h3 style="margin:0; font-size:15px; font-weight:800; color:#0f172a;">🌱 เสาหลักที่ 3: กองทุนรวมเพื่อเสถียรภาพ & Auto-Redeem (สัดส่วน ${this.pillarWeights.fund}%)</h3>
                <span style="font-size:12px; color:#64748b;">เงินลงทุนกลุ่ม: <strong>${this.formatBaht(plan.requiredFundCapital)}</strong> | น้ำหนักรวม: <strong>${plan.fundWeightTotal}%</strong></span>
              </div>
              <button class="btn-add-plan-asset" data-cat="fund" style="background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">➕ เพิ่มกองทุนรวม</button>
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; font-size:13px;">
                ${theadActionPlan}
                <tbody>${generateRows(this.models.fund, 'fund')}</tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    `;

    // บันทึกและคำนวณสัดส่วน 3 เสาหลักใหม่
    document.getElementById("btn-save-pillar-weights").onclick = () => {
      const wThai = parseFloat(document.getElementById("input-weight-thai").value) || 0;
      const wUs = parseFloat(document.getElementById("input-weight-us").value) || 0;
      const wFund = parseFloat(document.getElementById("input-weight-fund").value) || 0;

      this.pillarWeights = { thai: wThai, us: wUs, fund: wFund };
      this.saveModels();
      this.render(container);
    };

    // ผูก Event ปุ่มคำนวณเป้าหมายรายเดือน
    const recalcBtn = document.getElementById('btn-recalculate-plan');
    const targetInput = document.getElementById('input-plan-target-monthly');
    if (recalcBtn && targetInput) {
      recalcBtn.onclick = () => {
        const val = parseFloat(targetInput.value);
        if (val && val > 0) {
          this.targetMonthlyIncome = val;
          this.saveModels();
          this.render(container);
        } else {
          alert('กรุณาระบุจำนวนเงินปันผลที่ต้องการต่อเดือนให้ถูกต้อง');
        }
      };
      targetInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          recalcBtn.click();
        }
      };
    }

    // ผูก Event ปุ่มคืนค่าเริ่มต้น
    document.getElementById("btn-reset-plan-defaults").onclick = () => {
      this.resetToDefault(container);
    };

    // ผูก Event ปุ่มเพิ่มสินทรัพย์
    container.querySelectorAll(".btn-add-plan-asset").forEach(btn => {
      btn.onclick = () => {
        this.openEditModal(btn.dataset.cat, null, container);
      };
    });

    // ผูก Event ปุ่มแก้ไข
    container.querySelectorAll(".btn-edit-plan-item").forEach(btn => {
      btn.onclick = () => {
        const cat = btn.dataset.cat;
        const id = btn.dataset.id;
        const target = (this.models[cat] || []).find(i => i.id === id);
        if (target) this.openEditModal(cat, target, container);
      };
    });

    // ผูก Event ปุ่มลบ
    container.querySelectorAll(".btn-delete-plan-item").forEach(btn => {
      btn.onclick = () => {
        const cat = btn.dataset.cat;
        const id = btn.dataset.id;
        const sym = btn.dataset.sym;
        this.deleteItem(cat, id, sym, container);
      };
    });
  }
};