/**
 * js/modules/bill.js
 * รอบบิลประจำ (ค่าไฟ/ค่าน้ำ/ค่าโทรศัพท์/ค่าอินเทอร์เน็ต/ประกัน) และวันครบชำระของบัตรเครดิต
 * ตรวจจับรอบจากประวัติรายการในบัญชีรายรับรายจ่าย แล้วนับวันครบกำหนดเองทั้งหมด (ไม่มี backend)
 */

const BillModule = {
  STORAGE_KEY: 'family-finance:bill-schedules',
  HORIZON_DAYS: 30,
  BANNER_DAYS: 7,
  MIN_SAMPLES: 3,
  LOOKBACK_MONTHS: 12,
  DEFAULT_ALERT_DAYS: 3,

  _storeCache: null,

  // ----------------------------------------------------
  // ตัวช่วยวันที่ (ใช้ UTC ทั้งหมด กันวันเลื่อนตาม timezone)
  // ----------------------------------------------------
  pad(n) { return String(n).padStart(2, '0'); },

  fmt(dt) { return `${dt.getUTCFullYear()}-${this.pad(dt.getUTCMonth() + 1)}-${this.pad(dt.getUTCDate())}`; },

  parseIso(iso) {
    const p = String(iso || '').slice(0, 10).split('-').map(Number);
    if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return null;
    return { y: p[0], m: p[1], d: p[2] };
  },

  asDate(iso) {
    const p = this.parseIso(iso);
    return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)) : null;
  },

  todayIso() {
    const n = new Date();
    return `${n.getFullYear()}-${this.pad(n.getMonth() + 1)}-${this.pad(n.getDate())}`;
  },

  daysInMonth(y, m1) { return new Date(Date.UTC(y, m1, 0)).getUTCDate(); },

  addDaysIso(iso, n) {
    const d = this.asDate(iso);
    return d ? this.fmt(new Date(d.getTime() + n * 86400000)) : '';
  },

  // วันสุดท้ายของเดือนต้องปัดลง (เช่น รอบที่ 31 → ก.พ. เป็น 28) ไม่ใช่เลยไปเดือนถัดไป
  addMonthsIso(iso, n) {
    const d = this.asDate(iso);
    if (!d) return '';
    const months = d.getUTCMonth() + n;
    const y = d.getUTCFullYear() + Math.floor(months / 12);
    const m = ((months % 12) + 12) % 12;
    const day = Math.min(d.getUTCDate(), this.daysInMonth(y, m + 1));
    return this.fmt(new Date(Date.UTC(y, m, day)));
  },

  daysBetween(fromIso, toIso) {
    const a = this.asDate(fromIso);
    const b = this.asDate(toIso);
    if (!a || !b) return null;
    return Math.round((b - a) / 86400000);
  },

  // ----------------------------------------------------
  // ที่เก็บ schedule
  // ----------------------------------------------------
  getStore() {
    if (this._storeCache) return this._storeCache;
    let parsed = { schedules: [], dismissed: [] };
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) parsed = { schedules: data, dismissed: [] };
        else if (data && Array.isArray(data.schedules)) parsed = { schedules: data.schedules, dismissed: data.dismissed || [] };
      }
    } catch (e) {}
    this._storeCache = parsed;
    return parsed;
  },

  saveStore(patch) {
    const next = { schedules: patch.schedules || [], dismissed: patch.dismissed || [] };
    this._storeCache = next;
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  },

  getSchedules() { return this.getStore().schedules.slice(); },

  saveSchedule(patchSchedule) {
    const store = this.getStore();
    const list = store.schedules.slice();
    const idx = list.findIndex((s) => s.id === patchSchedule.id);
    const clean = {
      id: patchSchedule.id,
      name: String(patchSchedule.name || '').trim(),
      category: patchSchedule.category || 'ค่าไฟ',
      cadence: patchSchedule.cadence || 'monthly',
      anchorDay: Math.min(31, Math.max(1, parseInt(patchSchedule.anchorDay, 10) || 1)),
      anchorMonth: patchSchedule.anchorMonth || null,
      anchorFrom: patchSchedule.anchorFrom || null,
      amount: Number(patchSchedule.amount) || 0,
      alertDays: Math.min(30, Math.max(1, parseInt(patchSchedule.alertDays, 10) || this.DEFAULT_ALERT_DAYS)),
      enabled: patchSchedule.enabled !== false,
      source: patchSchedule.source || 'manual',
      key: patchSchedule.key || null
    };
    if (idx === -1) list.unshift(clean);
    else list[idx] = { ...list[idx], ...clean };
    this.saveStore({ schedules: list, dismissed: store.dismissed });
    return clean;
  },

  removeSchedule(id) {
    const store = this.getStore();
    this.saveStore({ schedules: store.schedules.filter((s) => s.id !== id), dismissed: store.dismissed });
  },

  setScheduleEnabled(id, enabled) {
    const store = this.getStore();
    this.saveStore({
      schedules: store.schedules.map((s) => (s.id === id ? { ...s, enabled } : s)),
      dismissed: store.dismissed
    });
  },

  dismissCandidate(key) {
    const store = this.getStore();
    const dismissed = store.dismissed.slice();
    if (key && !dismissed.includes(key)) dismissed.push(key);
    this.saveStore({ schedules: store.schedules, dismissed });
  },

  // ----------------------------------------------------
  // แหล่งข้อมูล: รายการเงินเข้าออก (อ่านตรงกับที่หน้าหนี้สินใช้)
  // ----------------------------------------------------
  getTransactions() {
    try {
      let key = 'family-finance:cashflow:v2';
      let allowLegacy = false;
      if (typeof CreditCardModule !== 'undefined' && CreditCardModule.getUserContext) {
        const ctx = CreditCardModule.getUserContext();
        key = ctx.cashflowKey || key;
        allowLegacy = !ctx.isMember;
      }
      const raw = localStorage.getItem(key) || (allowLegacy ? localStorage.getItem('family-finance:cashflow:v1') : null);
      if (!raw) return [];
      const state = JSON.parse(raw);
      const list = Array.isArray(state) ? state : (state && state.transactions) || [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  },

  normText(v) {
    return String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();
  },

  txDetail(t) {
    return String(t.detail || t.desc || t.description || '').trim();
  },

  // ----------------------------------------------------
  // ตรวจจับรอบจากประวัติ: กลุ่มละ >= 3 ตัวอย่างใน 12 เดือนล่าสุด
  // ----------------------------------------------------
  detectCandidates() {
    const today = this.todayIso();
    const since = this.addMonthsIso(today, -this.LOOKBACK_MONTHS);
    const groups = {};

    this.getTransactions().forEach((t) => {
      if (!t || t.type !== 'บิล') return;
      const date = String(t.date || '').slice(0, 10);
      const amount = parseFloat(t.amount) || 0;
      const category = String(t.category || '').trim();
      const detail = this.txDetail(t);
      if (!date || date < since || amount <= 0 || !category) return;
      const key = `${category}|${this.normText(detail)}`;
      if (!groups[key]) groups[key] = { key, category, detail, samples: [] };
      groups[key].samples.push({ date, amount, day: this.parseIso(date).d });
    });

    const store = this.getStore();
    const trackedKeys = new Set(store.schedules.map((s) => s.key).filter(Boolean));

    return Object.values(groups)
      .filter((g) => g.samples.length >= this.MIN_SAMPLES)
      .filter((g) => !trackedKeys.has(g.key) && !store.dismissed.includes(g.key))
      .map((g) => {
        const sorted = g.samples.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
        const gaps = [];
        for (let i = 1; i < sorted.length; i++) gaps.push(this.daysBetween(sorted[i - 1].date, sorted[i].date));
        const medianGap = this.median(gaps);
        const cadence = this.cadenceFromGap(medianGap);
        return {
          key: g.key,
          name: g.detail || g.category,
          category: g.category,
          cadence,
          anchorDay: Math.round(this.median(g.samples.map((s) => s.day))),
          anchorMonth: this.parseIso(sorted[0].date).m,
          anchorFrom: sorted[0].date,
          amount: Math.round(this.median(g.samples.map((s) => s.amount)) * 100) / 100,
          samples: g.samples.length,
          lastPaidDate: sorted[sorted.length - 1].date,
          medianGap
        };
      })
      .sort((a, b) => (a.lastPaidDate < b.lastPaidDate ? 1 : -1));
  },

  median(values) {
    const nums = (values || []).map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
    if (!nums.length) return 0;
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  },

  // ระยะห่างมาตรฐานของบิลไทย: รายสัปดาห์ 7 / เดือน ~30 / ไตรมาส ~91 / ปี ~365
  cadenceFromGap(medianGap) {
    const g = Number(medianGap) || 0;
    if (!g) return 'monthly';
    if (g <= 10) return 'weekly';
    if (g <= 50) return 'monthly';
    if (g <= 140) return 'quarterly';
    return 'annual';
  },

  // ----------------------------------------------------
  // บัตรเครดิต: projecting จาก config เดิม ไม่เก็บซ้ำ
  // ----------------------------------------------------
  getCardSchedules() {
    if (typeof CreditCardModule === 'undefined' || !CreditCardModule.getCardConfigs) return [];
    return (CreditCardModule.getCardConfigs() || []).map((c) => ({
      id: `card:${c.id}`,
      name: c.name || 'บัตรเครดิต',
      category: 'จ่ายบัตรเครดิต',
      cadence: 'monthly',
      anchorDay: parseInt(c.dueDay, 10) || 1,
      statementDay: parseInt(c.statementDay, 10) || null,
      amount: 0,
      alertDays: this.DEFAULT_ALERT_DAYS,
      enabled: true,
      source: 'card',
      cardId: c.id,
      matchNames: (c.accountMatchNames || []).concat(c.name || []).map((n) => this.normText(n)).filter(Boolean)
    }));
  },

  // "จ่ายแล้ว" อ่านจากประวัติรายการเสมอ (เก็บเฉพาะรอบ/วันที่ไว้ ไม่เก็บยอดจ่าย)
  // ยอมรับทั้งประเภท "บิล" และ "รายจ่าย" เพราะบางบ้านบันทึกบิลเป็นรายจ่ายธรรมดา
  lastPaymentDate(schedule) {
    const PAYABLE_TYPES = ['บิล', 'รายจ่าย', 'bill', 'expense'];
    const target = this.normText(schedule.name);
    const matches = this.getTransactions().filter((t) => {
      if (!t || !PAYABLE_TYPES.includes(String(t.type || '').trim())) return false;
      if (String(t.category || '').trim() !== String(schedule.category || '').trim()) return false;
      const date = String(t.date || '').slice(0, 10);
      if (!date || (parseFloat(t.amount) || 0) <= 0) return false;
      if (schedule.source === 'card') {
        const haystack = this.normText(this.txDetail(t)) + ' ' + this.normText(t.account || t.accountName || '');
        return (schedule.matchNames || []).some((n) => haystack.includes(n));
      }
      if (!target) return true;
      const detail = this.normText(this.txDetail(t));
      return !detail || detail === target || detail.includes(target) || target.includes(detail);
    });
    if (!matches.length) return null;
    return matches.map((t) => String(t.date).slice(0, 10)).sort().pop();
  },

  // ----------------------------------------------------
  // เอนจินวันครบกำหนด (pure — ทดสอบใน Node ได้)
  // ----------------------------------------------------
  occurrencesInRange(schedule, startIso, endIso) {
    const out = [];
    if (schedule.cadence === 'weekly') {
      const step = schedule.intervalDays || 7;
      const start = this.asDate(startIso);
      const end = this.asDate(endIso);
      let d = this.asDate(schedule.anchorFrom || schedule.lastPaidDate || startIso);
      if (!d || !start || !end) return out;
      while (d.getTime() > start.getTime()) d = new Date(d.getTime() - step * 86400000);
      let guard = 0;
      while (d.getTime() <= end.getTime() && guard++ < 200) {
        if (d.getTime() >= start.getTime()) out.push(this.fmt(d));
        d = new Date(d.getTime() + step * 86400000);
      }
      return out;
    }

    const stepM = { monthly: 1, quarterly: 3, annual: 12 }[schedule.cadence] || 1;
    const sp = this.parseIso(startIso);
    const ep = this.parseIso(endIso);
    if (!sp || !ep) return out;
    let y = sp.y;
    let m = sp.m;
    const anchorMonth = schedule.anchorMonth || (schedule.anchorFrom ? this.parseIso(schedule.anchorFrom).m : null);
    if (anchorMonth) {
      let guard = 0;
      while (((m - anchorMonth) % stepM + stepM * 2) % stepM !== 0 && guard++ < 12) {
        m++;
        if (m > 12) { m = 1; y++; }
      }
    }
    let guard = 0;
    while (guard++ < 160) {
      const occ = this.occurrenceInMonth(schedule, y, m);
      if (occ > endIso) break;
      if (occ >= startIso) out.push(occ);
      m += stepM;
      while (m > 12) { m -= 12; y++; }
    }
    return out;
  },

  occurrenceInMonth(schedule, y, m1) {
    const day = Math.min(parseInt(schedule.anchorDay, 10) || 1, this.daysInMonth(y, m1));
    return `${y}-${this.pad(m1)}-${this.pad(day)}`;
  },

  // คืนสถานะรอบถัดไปของบิลหนึ่งรายการเทียบกับวันนี้
  dueState(schedule, todayIso) {
    const today = todayIso || this.todayIso();
    const lastPaid = schedule.lastPaidDate !== undefined
      ? schedule.lastPaidDate
      : this.lastPaymentDate(schedule);
    // กรอบมองข้างหน้าต้องยาวพอสำหรับรอบปี/รอบไตรมาส ไม่งั้นบิลประเภทนี้จะหาวันครบถัดไปไม่เจอ
    const forwardDays = { annual: 400, quarterly: 130 }[schedule.cadence] || (this.HORIZON_DAYS + 15);
    const start = this.addMonthsIso(today, -13);
    const end = this.addDaysIso(today, forwardDays);
    const occ = this.occurrencesInRange(
      { ...schedule, lastPaidDate: lastPaid },
      start,
      end
    );
    // บิลที่ยังไม่เคยมีประวัติจ่าย: เริ่มนับจากวันนี้เป็นต้นไป ห้ามบอกว่าเป็นหนี้ค้างย้อนหลัง
    const unpaid = occ.filter((o) => (lastPaid ? o > lastPaid : o >= today));
    const nextDue = unpaid.length ? unpaid[0] : null;
    const days = nextDue ? this.daysBetween(today, nextDue) : null;
    const missed = unpaid.filter((o) => o <= today).length;

    let status = 'no-data';
    if (nextDue && days < 0) status = 'overdue';
    else if (nextDue && days === 0) status = 'due-today';
    else if (nextDue && days <= (schedule.alertDays || this.DEFAULT_ALERT_DAYS)) status = 'due-soon';
    else if (nextDue) status = 'upcoming';

    return { nextDue, days, missed, status, lastPaidDate: lastPaid, occurrences: unpaid.slice(0, 3) };
  },

  // ทุกบิลที่ "ติดตามอยู่" (ยืนยันแล้ว + ที่ตั้งเอง + บัตรเครดิต) พร้อมสถานะ
  getTrackedItems(todayIso) {
    const today = todayIso || this.todayIso();
    const items = this.getSchedules()
      .concat(this.getCardSchedules())
      .filter((s) => s.enabled !== false)
      .map((s) => ({ ...s, ...this.dueState(s, today) }))
      .filter((s) => Number.isFinite(s.days))
      .sort((a, b) => a.days - b.days);
    return items;
  },

  // ----------------------------------------------------
  // ฝั่งแสดงผล
  // ----------------------------------------------------
  fmtBaht(n) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },

  fmtDate(iso) {
    const p = this.parseIso(iso);
    if (!p) return '-';
    return `${this.pad(p.d)}/${this.pad(p.m)}/${p.y + 543}`;
  },

  countdownLabel(item) {
    if (item.status === 'overdue') return `เกินกำหนด ${Math.abs(item.days)} วัน`;
    if (item.days === 0) return 'ครบกำหนดวันนี้';
    return `ครบใน ${item.days} วัน`;
  },

  statusStyle(item) {
    if (item.status === 'overdue' || item.status === 'due-today') return { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' };
    if (item.status === 'due-soon') return { bg: '#fffbeb', border: '#fde68a', color: '#b45309' };
    return { bg: '#f0f9ff', border: '#bae6fd', color: '#0369a1' };
  },

  sourceLabel(s) {
    if (s.source === 'card') return 'บัตรเครดิต';
    if (s.source === 'auto') return 'ตรวจจับอัตโนมัติ';
    return 'ตั้งเอง';
  },

  bannerHtml(items) {
    const inWindow = items.filter((i) => i.days <= this.BANNER_DAYS);
    if (!inWindow.length) return '';
    const overdue = inWindow.filter((i) => i.status === 'overdue');
    const total = inWindow.reduce((s, i) => s + (i.amount || 0), 0);
    const nearest = inWindow[0];
    const tone = overdue.length ? { bg: '#fef2f2', border: '#fecaca', accent: '#dc2626' }
      : { bg: '#f8fafc', border: '#e2e8f0', accent: '#0284c7' };

    return `
      <div id="bill-banner-inner" style="background: ${tone.bg}; border: 1px solid ${tone.border}; border-radius: 14px; padding: 16px 18px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; cursor: pointer;" data-bill-action="open-bills">
        <div style="min-width: 0;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${tone.accent}; font-weight: 800;">
            ${overdue.length ? `มีบิลเกินกำหนด ${overdue.length} รายการ` : `รอบบิลอีก ${this.BANNER_DAYS} วัน: ${inWindow.length} รายการ`}
          </div>
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 4px;">
            ${nearest.name} · ${this.countdownLabel(nearest)}
            ${nearest.amount ? `· ฿${this.fmtBaht(nearest.amount)}` : ''}
          </div>
          ${total ? `<div style="font-size: 12px; color: #64748b; font-weight: 600; margin-top: 3px;">รวมที่ต้องชำระช่วงนี้ ฿${this.fmtBaht(total)}</div>` : ''}
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          ${inWindow.slice(0, 4).map((i) => {
            const st = this.statusStyle(i);
            return `<span style="background: ${st.bg}; color: ${st.color}; border: 1px solid ${st.border}; border-radius: 20px; padding: 4px 11px; font-size: 11.5px; font-weight: 700; white-space: nowrap;">${this.countdownLabel(i)}</span>`;
          }).join('')}
          <span style="font-size: 12.5px; font-weight: 700; color: ${tone.accent}; white-space: nowrap;">ดูทั้งหมด →</span>
        </div>
      </div>
    `;
  },

  renderDashboardBanner() {
    const host = document.getElementById('bill-dashboard-banner');
    if (!host) return;
    let items = [];
    try { items = this.getTrackedItems(); } catch (e) {}
    host.innerHTML = this.bannerHtml(items);
    host.style.display = host.innerHTML ? '' : 'none';
    this.updateTitleBadge(items);
  },

  updateTitleBadge(items) {
    const overdue = (items || []).filter((i) => i.status === 'overdue').length;
    const base = (this._baseTitle = this._baseTitle || document.title);
    document.title = overdue ? `(!${overdue}) ${base}` : base;
  },

  rowHtml(item, mode) {
    const st = this.statusStyle(item);
    const actions = mode === 'candidate'
      ? `<button data-bill-action="confirm" data-id="${item.key}" style="background: #0284c7; color: #fff; border: none; border-radius: 7px; padding: 6px 13px; font-size: 12px; font-weight: 700; cursor: pointer;">ติดตามบิลนี้</button>
         <button data-bill-action="dismiss" data-id="${item.key}" style="background: #fff; color: #64748b; border: 1px solid #cbd5e1; border-radius: 7px; padding: 6px 11px; font-size: 12px; font-weight: 600; cursor: pointer;">ไม่ต้องเตือน</button>`
      : `${item.source !== 'card' ? `<button data-bill-action="edit" data-id="${item.id}" style="background: #fff; color: #475569; border: 1px solid #cbd5e1; border-radius: 7px; padding: 6px 11px; font-size: 12px; font-weight: 600; cursor: pointer;">แก้ไข</button>` : ''}
         <button data-bill-action="pay" data-id="${item.id}" style="background: #0284c7; color: #fff; border: none; border-radius: 7px; padding: 6px 13px; font-size: 12px; font-weight: 700; cursor: pointer;">บันทึกชำระ</button>`;

    return `
      <div style="display: flex; align-items: center; gap: 14px; padding: 13px 16px; border: 1px solid #e2e8f0; border-radius: 11px; background: #fff; flex-wrap: wrap;">
        <div style="width: 46px; text-align: center;">
          <div style="font-size: 17px; font-weight: 900; color: ${st.color}; line-height: 1.1;">${mode === 'candidate' ? '?' : Math.max(item.days, 0)}</div>
          <div style="font-size: 9.5px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">${mode === 'candidate' ? 'คาดการ' : item.days < 0 ? 'เกินวัน' : 'วัน'}</div>
        </div>
        <div style="flex: 1; min-width: 180px;">
          <div style="font-size: 13.5px; font-weight: 800; color: #0f172a;">${item.name}</div>
          <div style="font-size: 11.5px; color: #64748b; font-weight: 600; margin-top: 2px;">
            ${item.category} · ${this.sourceLabel(item)} · ${this.cadenceLabel(item)}
            ${item.nextDue ? ` · ครบ ${this.fmtDate(item.nextDue)}` : ''}
            ${item.amount ? ` · ฿${this.fmtBaht(item.amount)}` : ''}
          </div>
          ${item.lastPaidDate ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">จ่ายล่าสุด ${this.fmtDate(item.lastPaidDate)}${item.missed > 1 ? ` · ตกหล่น ${item.missed} รอบ` : ''}</div>` : '<div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">ยังไม่เคยบันทึกรอบนี้</div>'}
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span style="background: ${st.bg}; color: ${st.color}; border: 1px solid ${st.border}; border-radius: 8px; padding: 5px 11px; font-size: 11.5px; font-weight: 800; white-space: nowrap;">${this.countdownLabel(item)}</span>
          ${actions}
        </div>
      </div>
    `;
  },

  cadenceLabel(s) {
    return { weekly: 'รายสัปดาห์', monthly: 'รายเดือน', quarterly: 'ทุก 3 เดือน', annual: 'รายปี' }[s.cadence] || 'รายเดือน';
  },

  renderBillsView(container) {
    const host = container || document.getElementById('bills-view-container');
    if (!host) return;
    const today = this.todayIso();
    const items = this.getTrackedItems(today);
    const dueSoon = items.filter((i) => i.days <= this.HORIZON_DAYS);
    const later = items.filter((i) => i.days > this.HORIZON_DAYS);
    const candidates = this.detectCandidates().map((c) => ({ ...c, source: 'auto', ...this.dueState({ ...c, source: 'auto' }, today) }))
      .filter((c) => Number.isFinite(c.days));

    host.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div>
            <div style="font-size: 15px; font-weight: 800; color: #0f172a;">กำหนดชำระใน 30 วัน</div>
            <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">นับรอบจากประวัติรายการจ่ายจริง · ${items.length} รายการที่ติดตาม</div>
          </div>
          <button data-bill-action="add" style="background: #fff; border: 1px solid #0284c7; color: #0284c7; border-radius: 8px; padding: 7px 15px; font-size: 12.5px; font-weight: 700; cursor: pointer;">+ เพิ่มบิลเอง</button>
        </div>

        ${dueSoon.length ? dueSoon.map((i) => this.rowHtml(i, 'tracked')).join('')
          : '<div style="padding: 22px; text-align: center; color: #94a3b8; font-size: 13px; font-weight: 600; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 11px;">อีก 30 วันข้างหน้าไม่มีบิลครบกำหนด</div>'}

        ${later.length ? `
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 800; margin-top: 4px;">รอบถัดไป</div>
          ${later.slice(0, 6).map((i) => this.rowHtml(i, 'tracked')).join('')}
        ` : ''}

        ${candidates.length ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px;">
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">พบบิลที่จ่ายซ้ำในประวัติ แต่ยังไม่ได้ติดตาม</div>
            <div style="font-size: 11.5px; color: #64748b; font-weight: 600; margin-bottom: 12px;">ตรวจจับจากรายการประเภท "บิล" ที่จ่ายซ้ำอย่างน้อย ${this.MIN_SAMPLES} ครั้งใน ${this.LOOKBACK_MONTHS} เดือนล่าสุด · กดติดตามเพื่อรับเตือน</div>
            <div style="display: flex; flex-direction: column; gap: 9px;">
              ${candidates.slice(0, 8).map((c) => this.rowHtml(c, 'candidate')).join('')}
            </div>
          </div>
        ` : `
          <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 16px;">
            <div style="font-size: 12.5px; font-weight: 700; color: #64748b;">ยังไม่มีบิลอัตโนมัติที่ตรวจจับเพิ่ม</div>
            <div style="font-size: 11.5px; color: #94a3b8; margin-top: 3px;">เมื่อคุณบันทึกรายการประเภท "บิล" ซ้ำอย่างน้อย ${this.MIN_SAMPLES} ครั้ง ระบบจะเสนอรอบชำระให้อัตโนมัติ</div>
          </div>
        `}
      </div>
    `;
  },

  // ----------------------------------------------------
  // ฟอร์มเพิ่ม/แก้ schedule
  // ----------------------------------------------------
  categoryOptions(selected) {
    let cats = ['ค่าไฟ', 'ค่าน้ำ', 'ค่าโทรศัพท์', 'ค่าอินเทอร์เน็ต', 'ค่าส่วนกลาง', 'เบี้ยประกัน (รถยนต์,ชีวิต)', 'จ่ายบัตรเครดิต'];
    try {
      if (typeof CashFlowModule !== 'undefined' && CashFlowModule.getSystemCategories) {
        const all = CashFlowModule.getSystemCategories();
        if (all && Array.isArray(all['บิล']) && all['บิล'].length) cats = all['บิล'];
      }
    } catch (e) {}
    const uniq = Array.from(new Set(cats.concat(selected ? [selected] : [])));
    return uniq.map((c) => `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`).join('');
  },

  monthNames: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],

  monthOptions(selected) {
    const val = parseInt(selected, 10) || (new Date().getMonth() + 1);
    return this.monthNames.map((n, i) => `<option value="${i + 1}" ${i + 1 === val ? 'selected' : ''}>${n}</option>`).join('');
  },

  openEditModal(id) {
    const existing = this.getSchedules().find((s) => s.id === id);
    const model = id && existing ? existing : {
      id: 'bill-' + Date.now(),
      name: '',
      category: 'ค่าไฟ',
      cadence: 'monthly',
      anchorDay: 10,
      amount: '',
      alertDays: this.DEFAULT_ALERT_DAYS,
      enabled: true,
      source: 'manual'
    };
    const cadences = [['weekly', 'รายสัปดาห์'], ['monthly', 'รายเดือน'], ['quarterly', 'ทุก 3 เดือน'], ['annual', 'รายปี']];
    let modal = document.getElementById('modal-edit-bill');
    if (modal) modal.remove();

    const html = `
      <div id="modal-edit-bill" style="position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999999; padding: 16px;">
        <div style="background: #fff; border-radius: 12px; width: 430px; max-width: 100%; max-height: 92vh; overflow: auto; padding: 22px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.25); text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">${id ? 'แก้ไขบิลประจำ' : 'เพิ่มบิลประจำ'}</h3>
            <button id="btn-close-bill-modal" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;">&times;</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 13px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">ชื่อบิล</label>
              <input id="input-bill-name" value="${model.name || ''}" placeholder="เช่น ค่าไฟ การไฟฟ้านครหลวง" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; font-weight: 700;">
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">หมวดบิล</label>
              <select id="select-bill-category" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; font-weight: 700; background: #fff;">
                ${this.categoryOptions(model.category)}
              </select>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 120px;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">ความถี่</label>
                <select id="select-bill-cadence" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700; background: #fff;">
                  ${cadences.map(([v, l]) => `<option value="${v}" ${model.cadence === v ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
              </div>
              <div style="width: 84px;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">วันที่ครบ</label>
                <input id="input-bill-day" type="number" min="1" max="31" value="${model.anchorDay}" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700;">
              </div>
              <div style="width: 118px;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">เดือนที่ครบ</label>
                <select id="select-bill-month" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700; background: #fff;">
                  ${this.monthOptions(model.anchorMonth)}
                </select>
              </div>
            </div>
            <div style="display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">ยอดโดยประมาณ (บาท)</label>
                <input id="input-bill-amount" type="number" step="any" value="${model.amount || ''}" placeholder="0.00" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700;">
              </div>
              <div style="width: 104px;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">เตือนล่วงหน้า (วัน)</label>
                <input id="input-bill-alert" type="number" min="1" max="30" value="${model.alertDays || this.DEFAULT_ALERT_DAYS}" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700;">
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
              <label style="display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 700; color: #475569; cursor: pointer;">
                <input id="input-bill-enabled" type="checkbox" ${model.enabled !== false ? 'checked' : ''}> ติดตามบิลนี้
              </label>
              ${id ? '<button id="btn-delete-bill" style="background: #fff; border: 1px solid #fecaca; color: #dc2626; border-radius: 7px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer;">ลบ</button>' : ''}
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
              <button id="btn-cancel-bill-modal" style="background: #fff; border: 1px solid #cbd5e1; padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">ยกเลิก</button>
              <button id="btn-save-bill-modal" style="background: #0284c7; color: #fff; border: none; padding: 7px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer;">บันทึก</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    const close = () => document.getElementById('modal-edit-bill')?.remove();
    document.getElementById('btn-close-bill-modal').onclick = close;
    document.getElementById('btn-cancel-bill-modal').onclick = close;

    // "เดือนที่ครบ" มีความหมายเฉพาะรอบไตรมาส/รอบปี (รายเดือน/รายสัปดาห์ใช้วันที่เป็นหลัก)
    const monthSel = document.getElementById('select-bill-month');
    const cadenceSel = document.getElementById('select-bill-cadence');
    const syncMonthField = () => {
      const needsMonth = cadenceSel.value === 'quarterly' || cadenceSel.value === 'annual';
      monthSel.disabled = !needsMonth;
      monthSel.style.opacity = needsMonth ? '1' : '0.45';
    };
    cadenceSel.addEventListener('change', syncMonthField);
    syncMonthField();

    if (id) {
      document.getElementById('btn-delete-bill').onclick = () => {
        if (!confirm('เลิกติดตามบิลนี้?')) return;
        this.removeSchedule(id);
        close();
        this.refresh();
      };
    }

    document.getElementById('btn-save-bill-modal').onclick = () => {
      const name = document.getElementById('input-bill-name').value.trim();
      if (!name) { alert('กรุณาระบุชื่อบิล'); return; }
      const cadence = document.getElementById('select-bill-cadence').value;
      this.saveSchedule({
        ...model,
        name,
        category: document.getElementById('select-bill-category').value,
        cadence,
        anchorDay: parseInt(document.getElementById('input-bill-day').value, 10),
        anchorMonth: (cadence === 'quarterly' || cadence === 'annual')
          ? parseInt(monthSel.value, 10)
          : null,
        amount: parseFloat(document.getElementById('input-bill-amount').value) || 0,
        alertDays: parseInt(document.getElementById('input-bill-alert').value, 10),
        enabled: document.getElementById('input-bill-enabled').checked,
        source: model.source === 'auto' ? 'confirmed' : (model.source || 'manual')
      });
      close();
      this.refresh();
    };
  },

  confirmCandidate(key) {
    const hit = this.detectCandidates().find((c) => c.key === key);
    if (!hit) return;
    this.saveSchedule({
      id: 'bill-' + Date.now(),
      name: hit.name,
      category: hit.category,
      cadence: hit.cadence,
      anchorDay: hit.anchorDay,
      anchorMonth: hit.anchorMonth,
      anchorFrom: hit.anchorFrom,
      amount: hit.amount,
      alertDays: this.DEFAULT_ALERT_DAYS,
      enabled: true,
      source: 'confirmed',
      key: hit.key
    });
    this.refresh();
  },

  openMarkPaidModal(id) {
    const item = this.getTrackedItems().find((s) => s.id === id);
    if (!item) return;
    if (typeof CashFlowModule === 'undefined' || !CashFlowModule.openTransactionModal) {
      alert('เปิดแบบบันทึกรายการไม่ได้ กรุณาไปหน้าบัญชีรายรับรายจ่าย');
      return;
    }
    CashFlowModule.draftPrefill = {
      type: 'บิล',
      date: this.todayIso(),
      category: item.source === 'card' ? 'จ่ายบัตรเครดิต' : item.category,
      detail: item.name,
      amount: item.amount || ''
    };
    CashFlowModule.openTransactionModal();
  },

  refresh() {
    this._storeCache = null;
    this.renderDashboardBanner();
    if (typeof DebtModule !== 'undefined' && DebtModule.activeViewTab === 'bills') DebtModule.render();
  },

  bindEvents() {
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest('[data-bill-action]');
      if (!btn) return;
      const action = btn.dataset.billAction;
      const id = btn.dataset.id;
      if (action === 'confirm') { this.confirmCandidate(id); return; }
      if (action === 'dismiss') { this.dismissCandidate(id); this.refresh(); return; }
      if (action === 'edit') { this.openEditModal(id); return; }
      if (action === 'add') { this.openEditModal(null); return; }
      if (action === 'pay') { this.openMarkPaidModal(id); return; }
      if (action === 'open-bills') {
        if (typeof DebtModule !== 'undefined') { DebtModule.activeViewTab = 'bills'; DebtModule.render(); }
        const host = document.getElementById('bills-view-container');
        if (!host) window.location.href = 'cashflow.html#bills';
        else host.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
};

window.BillModule = BillModule;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    BillModule.bindEvents();
    BillModule.renderDashboardBanner();
  });
} else {
  BillModule.bindEvents();
  BillModule.renderDashboardBanner();
}
