/**
 * js/modules/dividend-center.js
 * ศูนย์ปันผล — ประวัติปันผล/DPU, Yield 12 เดือน และปฏิทินวัน XD/วันจ่าย
 * อ่าน dividends / v_security_latest แบบ anon (RLS read-only)
 *
 * dividends มีสองที่มา:
 *   yahoo      = ปันผลต่อหน่วยจริง + วันขึ้นเครื่องหมาย XD (collector เขียนให้ทุกวัน)
 *   manual_log = ที่แอปบันทึกเอง มีแค่วันรับเงิน และบางรายการเป็น "ยอดเงินที่ได้รับ" ไม่ใช่ต่อหน่วย
 * ถ้าหลักทรัพย์ไหนมีข้อมูล yahoo จะใช้ชุดนั้นเพียงชุดเดียว ไม่เอามาบวกปนกัน
 */
var DividendCenterModule = {
  // ตัวเลขของ manual_log ที่คำนวณ Yield แล้วเกินนี้ถือว่าเป็นยอดเงินรวม ไม่ใช่ต่อหน่วย
  MAX_SANE_YIELD: 50,

  // แหล่งที่ให้ตัวเลข "ต่อหน่วย" จริง (source_code อื่นทั้งหมดถือเป็นยอดที่แอปบันทึก)
  MARKET_SOURCES: ['yahoo'],
  PAGE_ROWS: 1000,
  MAX_PAGES: 10,

  TYPE_LABELS: {
    'thai-stock': 'หุ้นไทย',
    'foreign-stock': 'หุ้นต่างประเทศ',
    'etf': 'ETF',
    'mutual-fund': 'กองทุน',
    'reit': 'REIT'
  },

  FILTERS: [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'thai-stock', label: 'หุ้นไทย' },
    { key: 'foreign-stock', label: 'หุ้นต่างประเทศ' },
    { key: 'mutual-fund', label: 'กองทุน' },
    { key: 'etf', label: 'ETF' },
    { key: 'reit', label: 'REIT' }
  ],

  MONTHS: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],

  state: {
    rows: [],
    events: [],
    filter: 'all',
    search: '',
    selectedId: null,
    chart: null
  },

  // ---------------------------------------------------------------- helpers
  num(value, digits) {
    const v = Number(value);
    if (!Number.isFinite(v)) return '—';
    return v.toLocaleString('th-TH', {
      minimumFractionDigits: digits == null ? 2 : digits,
      maximumFractionDigits: digits == null ? 4 : digits
    });
  },

  money(value, currency) {
    if (value == null || value === '') return '—';
    const v = Number(value);
    if (!Number.isFinite(v)) return '—';
    const symbol = currency === 'USD' ? '$' : (currency === 'THB' ? '฿' : '');
    const digits = Math.abs(v) >= 100 ? 2 : 4;
    const sign = v < 0 ? '-' : '';
    return sign + symbol + Math.abs(v).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: digits });
  },

  pct(value) {
    const v = Number(value);
    if (value == null || !Number.isFinite(v)) return '—';
    return (v > 0 ? '+' : '') + v.toFixed(2) + '%';
  },

  thDate(day) {
    if (!day) return '—';
    const [y, m, d] = String(day).slice(0, 10).split('-');
    if (!y || !m || !d) return '—';
    return `${d}/${m}/${y}`;
  },

  daysSince(day) {
    if (!day) return null;
    const then = Date.parse(String(day).slice(0, 10) + 'T00:00:00Z');
    if (!Number.isFinite(then)) return null;
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Math.round((today - then) / 86400000);
  },

  escape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  // ---------------------------------------------------------------- loading
  async init() {
    this.container = document.getElementById('content-area');
    if (!this.container) return;
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
      this.renderError(new Error('โหลด Supabase client ไม่สำเร็จ'));
      return;
    }
    try {
      await this.load();
    } catch (error) {
      console.error('[DividendCenter] load error', error);
      this.renderError(error);
      return;
    }
    this.renderAll();
  },

  async load() {
    // Supabase ตอบ statement timeout เป็นครั้งคราวตอนยิงหลาย query พร้อมกัน — ลองซ้ำหนึ่งครั้ง
    try {
      await this.loadOnce();
    } catch (error) {
      console.warn('[DividendCenter] retry after', error && error.message);
      await new Promise(resolve => setTimeout(resolve, 900));
      await this.loadOnce();
    }
  },

  async fetchDividendRows() {
    // ยิงทีละหน้า: Supabase จำกัด 1000 แถวต่อคำขอ แต่ตาราง dividends มีเกินนั้นแล้ว
    const rows = [];
    for (let page = 0; page < this.MAX_PAGES; page += 1) {
      const from = page * this.PAGE_ROWS;
      const { data, error } = await supabaseClient.from('dividends')
        .select('security_id,kind,amount_per_share,currency,ex_date,record_date,pay_date,period_label,fiscal_year,is_declared,source_code')
        .order('id', { ascending: true })
        .range(from, from + this.PAGE_ROWS - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < this.PAGE_ROWS) break;
    }
    return rows;
  },

  async loadOnce() {
    const divs = await this.fetchDividendRows();
    // ดึงเฉพาะหลักทรัพย์ที่มีปันผล — ทะเบียนทั้งตลาดมีหลักหมื่นตัว ถ้าดึงแบบ limit จะได้ชุดที่ไม่ครบ
    const ids = [...new Set(divs.map(item => item.security_id).filter(Boolean))];
    const latest = ids.length
      ? await supabaseClient.from('v_security_latest')
          .select('security_id,symbol,name_th,name_en,asset_type,currency,price,fund_nav')
          .in('security_id', ids)
      : { data: [], error: null };
    if (latest.error) throw latest.error;

    const latestById = new Map((latest.data || []).map(row => [row.security_id, row]));
    const bySecurity = new Map();

    divs.forEach(item => {
      const info = latestById.get(item.security_id) || {};
      if (!bySecurity.has(item.security_id)) {
        bySecurity.set(item.security_id, {
          securityId: item.security_id,
          symbol: info.symbol || '—',
          name: info.name_th || info.name_en || '',
          assetType: info.asset_type || '',
          currency: item.currency || info.currency || '',
          history: []
        });
      }
      bySecurity.get(item.security_id).history.push({
        amount: Number(item.amount_per_share),
        currency: item.currency,
        kind: item.kind,
        exDate: item.ex_date,
        recordDate: item.record_date,
        payDate: item.pay_date,
        fiscalYear: item.fiscal_year,
        periodLabel: item.period_label,
        source: item.source_code
      });
    });

    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 365);
    const cutoffKey = cutoff.toISOString().slice(0, 10);

    this.state.rows = [...bySecurity.values()].map(row => {
      const info = latestById.get(row.securityId) || {};
      const market = row.history.filter(item => this.MARKET_SOURCES.includes(item.source));
      const usesMarket = market.length > 0;
      const dated = (usesMarket ? market : row.history)
        .map(item => ({ ...item, date: item.exDate || item.payDate, dateKind: item.exDate ? 'XD' : 'จ่าย' }))
        .filter(item => item.date)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
      const last12 = dated.filter(item => String(item.date).slice(0, 10) >= cutoffKey);
      const perShare12m = last12.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const latestValue = Number(row.assetType === 'mutual-fund' ? info.fund_nav : info.price);
      const rawYield = last12.length && perShare12m > 0 && Number.isFinite(latestValue) && latestValue > 0
        ? Number((perShare12m / latestValue * 100).toFixed(2))
        : null;
      const suspicious = rawYield != null && rawYield > this.MAX_SANE_YIELD;
      return {
        ...row,
        history: dated,
        usesMarket,
        sourceLabel: usesMarket ? 'yahoo' : (row.history[0].source || 'manual_log'),
        perShare12m: last12.length ? perShare12m : null,
        payouts12m: last12.length,
        lastDate: dated.length ? dated[0].date : null,
        lastDateKind: dated.length ? dated[0].dateKind : null,
        yieldPct: Number.isFinite(rawYield) && !suspicious ? rawYield : null,
        suspicious,
        latestValue: Number.isFinite(latestValue) && latestValue > 0 ? latestValue : null
      };
    }).sort((a, b) => {
      if (a.yieldPct == null && b.yieldPct == null) return a.symbol.localeCompare(b.symbol);
      if (a.yieldPct == null) return 1;
      if (b.yieldPct == null) return -1;
      return b.yieldPct - a.yieldPct;
    });

    this.state.events = this.state.rows.flatMap(row => row.history.map(item => ({
      symbol: row.symbol,
      assetType: row.assetType,
      amount: item.amount,
      currency: item.currency,
      source: item.source,
      date: item.date,
      dateKind: item.dateKind,
      fiscalYear: item.fiscalYear
    })));
  },

  // ---------------------------------------------------------------- render
  renderError(error) {
    this.container.innerHTML = `
      <div class="pf-glass" style="padding: 28px;">
        <div class="pf-card" style="padding: 22px 24px; color: var(--txt-soft);">
          <div style="font-weight: 800; font-size: 15px; margin-bottom: 6px;">โหลดข้อมูลปันผลไม่สำเร็จ</div>
          <div style="font-size: 13px;">${this.escape(error && error.message ? error.message : error)}</div>
        </div>
      </div>`;
  },

  renderAll() {
    this.container.innerHTML = `
      <div class="pf-glass" style="padding: 22px 24px 30px;">
        <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 18px;">
          <div>
            <div style="font-size: 20px; font-weight: 800; color: var(--txt-strong);">ศูนย์ปันผล</div>
            <div style="font-size: 12.5px; color: var(--txt-muted); margin-top: 4px;">
              ประวัติปันผล/DPU, Yield 12 เดือน และปฏิทินวัน XD/วันจ่าย จาก <span style="color: var(--txt-soft);">dividends · v_security_latest</span>
            </div>
          </div>
          <button type="button" id="div-refresh" style="background: rgba(96, 165, 250, 0.10); border: 1px solid rgba(129, 140, 248, 0.32); color: #c7d2fe; padding: 8px 16px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer;">↻ โหลดใหม่</button>
        </div>

        <div id="div-kpis" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 18px;"></div>

        <div style="display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(320px, 1fr); gap: 16px; align-items: start;" class="div-grid">
          <div class="pf-card" style="padding: 18px 18px 12px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
              <input id="div-search" type="text" placeholder="ค้นหาสัญลักษณ์หรือชื่อ…"
                style="flex: 1 1 220px; min-width: 180px; background: rgba(9, 13, 38, 0.5); border: 1px solid rgba(129, 140, 248, 0.22); border-radius: 9px; padding: 8px 12px; color: var(--txt); font-size: 13px; outline: none;">
              <div id="div-filters" style="display: flex; gap: 6px; flex-wrap: wrap;"></div>
            </div>
            <div style="max-height: 560px; overflow: auto;">
              <table class="div-table">
                <thead>
                  <tr>
                    <th>สัญลักษณ์</th>
                    <th>ประเภท</th>
                    <th style="text-align: right;">ปันผล 12 เดือน</th>
                    <th style="text-align: right;">ครั้ง</th>
                    <th>ล่าสุด</th>
                    <th style="text-align: right;">Yield</th>
                  </tr>
                </thead>
                <tbody id="div-table-body"></tbody>
              </table>
            </div>
            <div style="font-size: 11px; color: var(--txt-faint); padding: 8px 10px 4px;">
              ตัวเลขต่อหน่วยและวัน XD มาจาก Yahoo (collector เก็บให้ทุกวัน) · หลักทรัพย์ที่ยังไม่มีข้อมูลจาก Yahoo
              จะใช้ยอดที่แอปบันทึก (manual_log) ซึ่งบางรายการเป็นยอดเงินรวมที่ได้รับ จึงไม่แสดง Yield
              เมื่อคำนวณแล้วเกิน ${this.MAX_SANE_YIELD}%/ปี และติด ⚠ ไว้ที่สัญลักษณ์
            </div>
          </div>

          <div id="div-detail"></div>
        </div>

        <div class="pf-card" style="padding: 18px 18px 20px; margin-top: 16px;">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <div style="font-size: 15px; font-weight: 800; color: var(--txt-strong);">ปฏิทินวัน XD / วันจ่าย 12 เดือนล่าสุด</div>
            <div style="font-size: 11.5px; color: var(--txt-faint);">วัน XD มาจาก Yahoo · หลักทรัพย์ที่ยังไม่มีข้อมูล Yahoo จะใช้วันจ่ายที่แอปบันทึก</div>
          </div>
          <div id="div-calendar" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 14px;"></div>
        </div>
      </div>`;

    document.getElementById('div-refresh').addEventListener('click', () => window.location.reload());
    document.getElementById('div-search').addEventListener('input', event => {
      this.state.search = event.target.value.trim().toLowerCase();
      this.renderTable();
      this.syncSelection();
    });

    const filters = document.getElementById('div-filters');
    filters.innerHTML = this.FILTERS.map(item => `
      <button type="button" data-filter="${item.key}"
        style="background: ${item.key === this.state.filter ? 'rgba(96, 165, 250, 0.22)' : 'transparent'};
               border: 1px solid ${item.key === this.state.filter ? 'rgba(96, 165, 250, 0.55)' : 'rgba(129, 140, 248, 0.22)'};
               color: ${item.key === this.state.filter ? '#dbeafe' : 'var(--txt-soft)'};
               padding: 6px 11px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer;">${item.label}</button>
    `).join('');
    filters.addEventListener('click', event => {
      const button = event.target.closest('button[data-filter]');
      if (!button) return;
      this.state.filter = button.dataset.filter;
      filters.querySelectorAll('button[data-filter]').forEach(item => {
        const active = item.dataset.filter === this.state.filter;
        item.style.background = active ? 'rgba(96, 165, 250, 0.22)' : 'transparent';
        item.style.borderColor = active ? 'rgba(96, 165, 250, 0.55)' : 'rgba(129, 140, 248, 0.22)';
        item.style.color = active ? '#dbeafe' : 'var(--txt-soft)';
      });
      this.renderTable();
      this.syncSelection();
    });

    document.getElementById('div-table-body').addEventListener('click', event => {
      const tr = event.target.closest('tr[data-id]');
      if (tr) this.selectSecurity(tr.dataset.id);
    });

    this.renderKpis();
    this.renderTable();
    this.renderCalendar();
    const first = this.visibleRows()[0];
    if (first) this.selectSecurity(first.securityId);
    else this.renderDetail(null);
  },

  renderKpis() {
    const rows = this.state.rows;
    const events = this.state.events;
    const funds = rows.filter(row => row.assetType === 'mutual-fund').length;
    const lastEvent = events.reduce((best, item) => (!best || item.date > best ? item.date : best), null);
    const topYield = rows.find(row => row.yieldPct != null);
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 365);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    const yearlyEvents = events.filter(item => item.date >= cutoffKey).length;
    const fromMarket = events.filter(item => this.MARKET_SOURCES.includes(item.source)).length;
    const fromRecord = events.length - fromMarket;

    const card = (icon, label, value, hint) => `
      <div class="pf-card" style="padding: 14px 16px; display: flex; gap: 12px; align-items: flex-start;">
        <div class="pf-icon-chip">${icon}</div>
        <div style="min-width: 0;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; color: var(--txt-faint);">${label}</div>
          <div class="pf-num-grad" style="font-size: 22px; font-weight: 800; line-height: 1.25;">${value}</div>
          <div style="font-size: 11.5px; color: var(--txt-muted);">${hint}</div>
        </div>
      </div>`;

    document.getElementById('div-kpis').innerHTML = [
      card('🏢', 'หลักทรัพย์ที่มีประวัติปันผล', this.num(rows.length, 0), `หุ้น/ETF ${rows.length - funds} · กองทุน ${funds}`),
      card('🧾', 'รายการที่บันทึกไว้', this.num(events.length, 0), `Yahoo ${this.num(fromMarket, 0)} · ที่แอปบันทึก ${this.num(fromRecord, 0)}`),
      card('🗓️', 'ล่าสุด', lastEvent ? this.thDate(lastEvent) : '—', lastEvent && this.daysSince(lastEvent) != null ? `${this.daysSince(lastEvent)} วันก่อน` : 'ยังไม่มีข้อมูล'),
      card('📈', 'Yield สูงสุด (12 เดือน)', topYield ? topYield.yieldPct.toFixed(2) + '%' : '—', topYield ? `${topYield.symbol} · ${this.num(yearlyEvents, 0)} รายการใน 12 เดือน` : 'ยังคำนวณไม่ได้')
    ].join('');
  },

  visibleRows() {
    const { rows, filter, search } = this.state;
    return rows.filter(row => {
      if (filter !== 'all' && row.assetType !== filter) return false;
      if (!search) return true;
      return row.symbol.toLowerCase().includes(search) || row.name.toLowerCase().includes(search);
    });
  },

  renderTable() {
    const body = document.getElementById('div-table-body');
    if (!body) return;
    const rows = this.visibleRows();
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--txt-faint); padding: 24px;">ไม่พบหลักทรัพย์ที่ตรงกับตัวกรอง</td></tr>';
      return;
    }
    body.innerHTML = rows.map(row => `
      <tr data-id="${row.securityId}" class="${row.securityId === this.state.selectedId ? 'is-active' : ''}">
        <td><span class="div-symbol">${this.escape(row.symbol)}</span>${row.suspicious ? ' <span title="ยอดปันผลที่บันทึกไว้สูงผิดปกติ (อาจเป็นยอดรวม)" style="color: #fbbf24;">⚠</span>' : ''}</td>
        <td style="font-size: 12px; color: var(--txt-soft);">${this.TYPE_LABELS[row.assetType] || this.escape(row.assetType)}</td>
        <td style="text-align: right; font-weight: 700; color: var(--txt-strong);">${this.money(row.perShare12m, row.currency)}</td>
        <td style="text-align: right; font-size: 12px;">${row.payouts12m == null ? '—' : this.num(row.payouts12m, 0)}</td>
        <td style="font-size: 12px;">${this.thDate(row.lastDate)}</td>
        <td style="text-align: right; font-weight: 700; color: var(--accent-3);">${row.yieldPct == null ? '—' : row.yieldPct.toFixed(2) + '%'}</td>
      </tr>`).join('');
  },

  selectSecurity(securityId) {
    const row = this.state.rows.find(item => item.securityId === securityId);
    if (!row) return;
    this.state.selectedId = securityId;
    document.querySelectorAll('#div-table-body tr[data-id]').forEach(tr => {
      tr.classList.toggle('is-active', tr.dataset.id === securityId);
    });
    this.renderDetail(row);
  },

  syncSelection() {
    const rows = this.visibleRows();
    if (rows.some(row => row.securityId === this.state.selectedId)) return;
    if (rows.length) {
      this.selectSecurity(rows[0].securityId);
    } else {
      this.state.selectedId = null;
      this.renderDetail(null);
    }
  },

  renderDetail(row) {
    const host = document.getElementById('div-detail');
    if (!host) return;
    if (this.state.chart) { this.state.chart.destroy(); this.state.chart = null; }

    if (!row) {
      host.innerHTML = `<div class="pf-card" style="padding: 22px; color: var(--txt-muted); font-size: 13px;">เลือกหลักทรัพย์จากตารางเพื่อดูประวัติปันผล</div>`;
      return;
    }

    const rows = row.history.slice(0, 24);
    const historyRows = rows.length ? rows.map(item => `
      <tr>
        <td>${this.thDate(item.date)} <span style="font-size: 10px; color: var(--txt-faint);">${item.dateKind}</span></td>
        <td style="text-align: right; font-weight: 700;">${this.money(item.amount, item.currency)}</td>
        <td style="text-align: right; font-size: 11.5px; color: var(--txt-muted);">${item.fiscalYear == null ? '—' : item.fiscalYear}</td>
        <td style="text-align: right; font-size: 11px; color: var(--txt-muted);">${this.escape(item.source || '—')}</td>
      </tr>`).join('') : '<tr><td colspan="4" style="text-align:center; color: var(--txt-faint); padding: 14px;">ไม่มีข้อมูล</td></tr>';

    host.innerHTML = `
      <div class="pf-card" style="padding: 18px 18px 20px;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
          <div style="min-width: 0;">
            <div style="font-size: 18px; font-weight: 800; color: var(--txt-strong);">${this.escape(row.symbol)}</div>
            <div style="font-size: 12px; color: var(--txt-muted); margin-top: 2px;">${this.escape(row.name)}</div>
          </div>
          <span style="font-size: 11.5px; font-weight: 700; color: var(--txt-soft); white-space: nowrap;">${this.TYPE_LABELS[row.assetType] || this.escape(row.assetType)}</span>
        </div>

        <div style="display: flex; align-items: baseline; gap: 10px; margin: 14px 0 4px;">
          <span class="pf-num-grad" style="font-size: 26px; font-weight: 800;">${this.money(row.perShare12m, row.currency)}</span>
          <span style="font-size: 12.5px; font-weight: 700; color: var(--accent-3);">${row.yieldPct == null ? '' : 'Yield ' + row.yieldPct.toFixed(2) + '%'}</span>
        </div>
        <div style="font-size: 12px; color: var(--txt-muted); margin-bottom: 12px;">
          ปันผล 12 เดือน · ${row.payouts12m == null ? '—' : this.num(row.payouts12m, 0)} ครั้ง
          ${row.lastDate ? `· ล่าสุด ${this.thDate(row.lastDate)} (${row.lastDateKind})` : ''}
          · ที่มา <span style="color: var(--txt-soft); font-weight: 700;">${this.escape(row.sourceLabel)}</span>
        </div>

        ${row.suspicious ? `
        <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.35); border-radius: 9px; padding: 9px 11px; font-size: 11.5px; color: #fcd34d; margin-bottom: 12px;">
          ยอดนี้สูงผิดปกติเมื่อเทียบกับราคา/NAV (คำนวณได้เกิน ${this.MAX_SANE_YIELD}%/ปี) — ยอดที่แอปบันทึกอาจเป็นยอดเงินรวมที่ได้รับ ไม่ใช่ต่อหน่วย จึงไม่แสดง Yield
        </div>` : ''}

        <div class="div-chart-box"><canvas id="div-chart"></canvas></div>
        <div style="font-size: 11.5px; color: var(--txt-faint); margin-bottom: 12px;">รวมปันผลที่บันทึกตามปีบัญชี · Yield = ปันผล 12 เดือน ÷ ราคา/NAV ล่าสุด (แสดงเมื่ออยู่ในเกณฑ์ปกติ)</div>

        <div style="font-size: 12px; font-weight: 800; color: var(--txt-soft); margin-bottom: 6px;">ประวัติการจ่ายล่าสุด</div>
        <div style="max-height: 240px; overflow: auto;">
          <table class="div-table" style="font-size: 12px;">
            <thead>
              <tr>
                <th>วัน XD / จ่าย</th>
                <th style="text-align: right;">ต่อหน่วย</th>
                <th style="text-align: right;">ปีบัญชี</th>
                <th style="text-align: right;">แหล่ง</th>
              </tr>
            </thead>
            <tbody>${historyRows}</tbody>
          </table>
        </div>
      </div>`;

    this.drawYearChart(row);
  },

  drawYearChart(row) {
    const canvas = document.getElementById('div-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const totals = new Map();
    row.history.forEach(item => {
      const year = item.fiscalYear == null ? 'ไม่ระบุ' : String(item.fiscalYear);
      totals.set(year, (totals.get(year) || 0) + (Number(item.amount) || 0));
    });
    const labels = [...totals.keys()].filter(year => year !== 'ไม่ระบุ').sort();
    if (totals.has('ไม่ระบุ')) labels.push('ไม่ระบุ');

    this.state.chart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: labels.map(year => totals.get(year)),
          backgroundColor: 'rgba(56, 189, 248, 0.45)',
          borderColor: '#38bdf8',
          borderWidth: 1.5,
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => `${this.money(context.parsed.y, row.currency)} / ปีบัญชี ${context.label}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#93a2cf', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(129, 140, 248, 0.10)' },
            ticks: { color: '#93a2cf', font: { size: 10 } }
          }
        }
      }
    });
  },

  buildCalendar() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const months = [];
    for (let index = 0; index < 12; index += 1) {
      const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1));
      months.push({
        key: date.toISOString().slice(0, 7),
        label: `${this.MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear() + 543}`,
        events: []
      });
    }
    const byKey = new Map(months.map(month => [month.key, month]));
    this.state.events.forEach(item => {
      const month = byKey.get(String(item.date).slice(0, 7));
      if (month) month.events.push(item);
    });
    months.forEach(month => month.events.sort((a, b) => String(b.date).localeCompare(String(a.date))));
    return months.reverse();
  },

  renderCalendar() {
    const host = document.getElementById('div-calendar');
    if (!host) return;
    const months = this.buildCalendar();
    if (!months.some(month => month.events.length)) {
      host.innerHTML = '<div style="grid-column: 1 / -1; color: var(--txt-faint); font-size: 13px;">ยังไม่มีรายการจ่ายปันผลใน 12 เดือนล่าสุด</div>';
      return;
    }
    host.innerHTML = months.map(month => {
      const shown = month.events.slice(0, 4);
      const extra = month.events.length - shown.length;
      const items = shown.map(item => `
        <div style="display: flex; justify-content: space-between; gap: 6px; font-size: 11.5px; padding: 3px 0; border-bottom: 1px dashed rgba(129, 140, 248, 0.12);">
          <span style="color: var(--txt-soft); font-weight: 700; white-space: nowrap;">${String(item.date).slice(8, 10)} · ${this.escape(item.symbol)}</span>
          <span style="color: var(--txt-muted); white-space: nowrap;">${this.money(item.amount, item.currency)} <span style="font-size: 9.5px; color: var(--txt-faint);">${item.dateKind}</span></span>
        </div>`).join('');
      return `
        <div style="background: rgba(9, 13, 38, 0.45); border: 1px solid var(--line-soft); border-radius: 10px; padding: 10px 12px; min-height: 86px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
            <span style="font-size: 12px; font-weight: 800; color: var(--txt-strong);">${month.label}</span>
            <span style="font-size: 10.5px; color: var(--txt-faint);">${month.events.length} รายการ</span>
          </div>
          ${items || '<div style="font-size: 11.5px; color: var(--txt-faint);">—</div>'}
          ${extra > 0 ? `<div style="font-size: 10.5px; color: var(--txt-faint); margin-top: 3px;">อีก ${extra} รายการ</div>` : ''}
        </div>`;
    }).join('');
  }
};

window.DividendCenterModule = DividendCenterModule;
