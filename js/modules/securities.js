/**
 * js/modules/securities.js
 * ศูนย์ข้อมูลราคา & NAV — อ่านตารางที่ collector เขียนไว้ตรงจาก Supabase
 *   v_security_latest (ราคา/NAV ล่าสุด) + v_coverage (คุณภาพข้อมูล)
 *   prices_daily / fund_nav_history (กราฟย้อนหลัง) + fund_details (ข้อมูลกองทุน)
 * ตารางเหล่านี้ให้ anon อ่านได้ผ่าน RLS; การเขียนเป็นสิทธิ์ของ service_role เท่านั้น
 */
var SecuritiesModule = {
  STALE_DAYS: 4,
  THIN_POINTS: 100,
  HISTORY_LIMIT: 500,

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
    { key: 'etf', label: 'ETF' },
    { key: 'mutual-fund', label: 'กองทุน' },
    { key: 'reit', label: 'REIT' }
  ],

  state: {
    rows: [],
    filter: 'all',
    search: '',
    selectedId: null,
    chart: null,
    historyCache: new Map()
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
    const v = Number(value);
    if (!Number.isFinite(v)) return '—';
    const symbol = currency === 'USD' ? '$' : (currency === 'THB' ? '฿' : '');
    const digits = Math.abs(v) >= 100 ? 2 : 4;
    return symbol + v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: digits });
  },

  pct(value) {
    const v = Number(value);
    if (!Number.isFinite(v)) return '—';
    return (v > 0 ? '+' : '') + v.toFixed(2) + '%';
  },

  thDate(day) {
    if (!day) return '—';
    const [y, m, d] = String(day).slice(0, 10).split('-');
    if (!y || !m || !d) return '—';
    return `${d}/${m}/${y}`;
  },

  escape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  daysSince(day) {
    if (!day) return null;
    const then = Date.parse(String(day).slice(0, 10) + 'T00:00:00Z');
    if (!Number.isFinite(then)) return null;
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Math.round((today - then) / 86400000);
  },

  statusOf(row) {
    if (!row.dataPoints) return { key: 'missing', label: 'ไม่มีข้อมูล', color: 'var(--down)' };
    if (row.daysOld != null && row.daysOld > this.STALE_DAYS) return { key: 'stale', label: 'ค้าง', color: 'var(--down-2)' };
    if (row.dataPoints < this.THIN_POINTS) return { key: 'thin', label: 'ข้อมูลบาง', color: '#fbbf24' };
    return { key: 'ok', label: 'ครบ', color: 'var(--up)' };
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
      console.error('[Securities] load error', error);
      this.renderError(error);
      return;
    }
    this.renderAll();
  },

  async load() {
    const [latest, coverage, details, navRows] = await Promise.all([
      supabaseClient.from('v_security_latest').select('*').limit(1000),
      supabaseClient.from('v_coverage').select('security_id,data_points,first_date,last_date,last_fetched_at,sources').limit(1000),
      supabaseClient.from('fund_details').select('security_id,fund_type,expense_ratio,nav_date').limit(1000),
      supabaseClient.from('fund_nav_history')
        .select('security_id,nav_date,nav,source_code')
        .order('nav_date', { ascending: false })
        .limit(1000)
    ]);
    [latest, coverage, details, navRows].forEach(result => {
      if (result.error) throw result.error;
    });

    const covById = new Map((coverage.data || []).map(row => [row.security_id, row]));
    const detailById = new Map((details.data || []).map(row => [row.security_id, row]));
    const fundChanges = this.buildFundChanges(navRows.data || []);

    this.state.rows = (latest.data || []).map(row => {
      const cov = covById.get(row.security_id) || {};
      const isFund = row.asset_type === 'mutual-fund';
      const change = isFund
        ? (fundChanges.get(row.security_id) || {}).change
        : (row.change_pct == null ? null : Number(row.change_pct));
      const lastDate = isFund ? row.fund_nav_date : row.price_date;
      return {
        securityId: row.security_id,
        symbol: row.symbol,
        name: row.name_th || row.name_en || '',
        assetType: row.asset_type,
        exchange: row.exchange_code,
        currency: row.currency,
        status: row.status,
        isFund,
        value: Number(isFund ? row.fund_nav : row.price),
        lastDate: lastDate || null,
        changePct: Number.isFinite(change) ? change : null,
        dataPoints: Number(cov.data_points) || 0,
        firstDate: cov.first_date || null,
        lastFetchedAt: cov.last_fetched_at || null,
        sources: Array.isArray(cov.sources) ? cov.sources : [],
        daysOld: this.daysSince(lastDate),
        fundDetail: detailById.get(row.security_id) || null
      };
    }).sort((a, b) => a.symbol.localeCompare(b.symbol));
  },

  // จุด NAV ล่าสุด 2 วันของแต่ละกอง (ข้ามแหล่งข้อมูลที่ให้วันเดียวกันซ้ำ)
  buildFundChanges(navRows) {
    const result = new Map();
    const done = new Set();
    navRows.forEach(row => {
      if (done.has(row.security_id)) return;
      let entry = result.get(row.security_id);
      if (!entry) {
        entry = { last: null, prev: null, dates: new Set() };
        result.set(row.security_id, entry);
      }
      if (entry.dates.has(row.nav_date)) return;
      entry.dates.add(row.nav_date);
      if (!entry.last) { entry.last = row; return; }
      entry.prev = row;
      done.add(row.security_id);
    });
    const changes = new Map();
    result.forEach((entry, securityId) => {
      const last = Number(entry.last && entry.last.nav);
      const prev = Number(entry.prev && entry.prev.nav);
      changes.set(securityId, {
        change: prev > 0 && last > 0 ? (last / prev - 1) * 100 : null
      });
    });
    return changes;
  },

  async fetchHistory(row) {
    const cached = this.state.historyCache.get(row.securityId);
    if (cached) return cached;
    const table = row.isFund ? 'fund_nav_history' : 'prices_daily';
    const dateCol = row.isFund ? 'nav_date' : 'trade_date';
    const valueCol = row.isFund ? 'nav' : 'close';
    const { data, error } = await supabaseClient
      .from(table)
      .select(`${dateCol},${valueCol}`)
      .eq('security_id', row.securityId)
      .order(dateCol, { ascending: false })
      .limit(this.HISTORY_LIMIT);
    if (error) throw error;
    const points = (data || []).reverse().map(item => ({ day: item[dateCol], value: Number(item[valueCol]) }));
    this.state.historyCache.set(row.securityId, points);
    return points;
  },

  // ---------------------------------------------------------------- render
  renderError(error) {
    this.container.innerHTML = `
      <div class="pf-glass" style="padding: 28px;">
        <div class="pf-card" style="padding: 22px 24px; color: var(--txt-soft);">
          <div style="font-weight: 800; font-size: 15px; margin-bottom: 6px;">โหลดข้อมูลหลักทรัพย์ไม่สำเร็จ</div>
          <div style="font-size: 13px;">${this.escape(error && error.message ? error.message : error)}</div>
        </div>
      </div>`;
  },

  renderAll() {
    const rows = this.state.rows;
    const latestFetch = rows.reduce((best, row) => {
      if (!row.lastFetchedAt) return best;
      return !best || row.lastFetchedAt > best ? row.lastFetchedAt : best;
    }, null);

    this.container.innerHTML = `
      <div class="pf-glass" style="padding: 22px 24px 30px;">
        <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 18px;">
          <div>
            <div style="font-size: 20px; font-weight: 800; color: var(--txt-strong);">ราคา & NAV จากฐานข้อมูล</div>
            <div style="font-size: 12.5px; color: var(--txt-muted); margin-top: 4px;">
              อ่านจากตาราง <span style="color: var(--txt-soft);">prices_daily · fund_nav_history · fund_details</span>
              ${latestFetch ? `· ดึงข้อมูลล่าสุด ${this.escape(new Date(latestFetch).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }))}` : ''}
            </div>
          </div>
          <button type="button" id="sec-refresh" style="background: rgba(96, 165, 250, 0.10); border: 1px solid rgba(129, 140, 248, 0.32); color: #c7d2fe; padding: 8px 16px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer;">↻ โหลดใหม่</button>
        </div>

        <div id="sec-kpis" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 18px;"></div>

        <div style="display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, 1fr); gap: 16px; align-items: start;" class="sec-grid">
          <div class="pf-card" style="padding: 18px 18px 12px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
              <input id="sec-search" type="text" placeholder="ค้นหาสัญลักษณ์หรือชื่อ…"
                style="flex: 1 1 220px; min-width: 180px; background: rgba(9, 13, 38, 0.5); border: 1px solid rgba(129, 140, 248, 0.22); border-radius: 9px; padding: 8px 12px; color: var(--txt); font-size: 13px; outline: none;">
              <div id="sec-filters" style="display: flex; gap: 6px; flex-wrap: wrap;"></div>
            </div>
            <div style="max-height: 620px; overflow: auto;">
              <table class="sec-table">
                <thead>
                  <tr>
                    <th>สัญลักษณ์</th>
                    <th>ประเภท</th>
                    <th style="text-align: right;">ล่าสุด</th>
                    <th style="text-align: right;">เปลี่ยน</th>
                    <th>วันที่</th>
                    <th style="text-align: right;">จุด</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody id="sec-table-body"></tbody>
              </table>
            </div>
          </div>

          <div id="sec-detail"></div>
        </div>
      </div>`;

    document.getElementById('sec-refresh').addEventListener('click', () => window.location.reload());
    document.getElementById('sec-search').addEventListener('input', event => {
      this.state.search = event.target.value.trim().toLowerCase();
      this.renderTable();
      this.syncSelection();
    });

    const filters = document.getElementById('sec-filters');
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

    document.getElementById('sec-table-body').addEventListener('click', event => {
      const tr = event.target.closest('tr[data-id]');
      if (tr) this.selectSecurity(tr.dataset.id);
    });

    this.renderKpis();
    this.renderTable();
    const first = this.visibleRows()[0];
    if (first) this.selectSecurity(first.securityId);
    else this.renderDetail(null);
  },

  renderKpis() {
    const rows = this.state.rows;
    const funds = rows.filter(row => row.isFund).length;
    const others = rows.length - funds;
    const points = rows.reduce((sum, row) => sum + row.dataPoints, 0);
    const newest = rows.reduce((best, row) => (row.lastDate && (!best || row.lastDate > best) ? row.lastDate : best), null);
    const stale = rows.filter(row => ['stale', 'missing'].includes(this.statusOf(row).key)).length;

    const card = (icon, label, value, hint) => `
      <div class="pf-card" style="padding: 14px 16px; display: flex; gap: 12px; align-items: flex-start;">
        <div class="pf-icon-chip">${icon}</div>
        <div style="min-width: 0;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; color: var(--txt-faint);">${label}</div>
          <div class="pf-num-grad" style="font-size: 22px; font-weight: 800; line-height: 1.25;">${value}</div>
          <div style="font-size: 11.5px; color: var(--txt-muted);">${hint}</div>
        </div>
      </div>`;

    document.getElementById('sec-kpis').innerHTML = [
      card('📚', 'หลักทรัพย์ในทะเบียน', this.num(rows.length, 0), `หุ้น/ETF/REIT ${others} · กองทุน ${funds}`),
      card('📈', 'จุดข้อมูลที่เก็บไว้', this.num(points, 0), 'ราคา + NAV ทุกแหล่งข้อมูล'),
      card('🗓️', 'ข้อมูลล่าสุด', newest ? this.thDate(newest) : '—', newest && this.daysSince(newest) != null ? `${this.daysSince(newest)} วันก่อน` : 'ยังไม่มีข้อมูล'),
      card('⚠️', 'ต้องตรวจสอบ', this.num(stale, 0), 'ค้างหรือไม่มีข้อมูลเลย')
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
    const body = document.getElementById('sec-table-body');
    if (!body) return;
    const rows = this.visibleRows();
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--txt-faint); padding: 24px;">ไม่พบหลักทรัพย์ที่ตรงกับตัวกรอง</td></tr>';
      return;
    }
    body.innerHTML = rows.map(row => {
      const status = this.statusOf(row);
      const changeColor = row.changePct == null ? 'var(--txt-faint)' : (row.changePct >= 0 ? 'var(--up)' : 'var(--down)');
      return `
        <tr data-id="${row.securityId}" class="${row.securityId === this.state.selectedId ? 'is-active' : ''}">
          <td><span class="sec-symbol">${this.escape(row.symbol)}</span></td>
          <td style="font-size: 12px; color: var(--txt-soft);">${this.TYPE_LABELS[row.assetType] || this.escape(row.assetType)}</td>
          <td style="text-align: right; font-weight: 700; color: var(--txt-strong);">${this.money(row.value, row.currency)}</td>
          <td style="text-align: right; color: ${changeColor}; font-weight: 700;">${this.pct(row.changePct)}</td>
          <td style="font-size: 12px;">${this.thDate(row.lastDate)}</td>
          <td style="text-align: right; font-size: 12px;">${this.num(row.dataPoints, 0)}</td>
          <td><span style="color: ${status.color}; font-size: 12px; font-weight: 700;">${status.label}</span></td>
        </tr>`;
    }).join('');
  },

  selectSecurity(securityId) {
    const row = this.state.rows.find(item => item.securityId === securityId);
    if (!row) return;
    this.state.selectedId = securityId;
    document.querySelectorAll('#sec-table-body tr[data-id]').forEach(tr => {
      tr.classList.toggle('is-active', tr.dataset.id === securityId);
    });
    this.renderDetail(row);
  },

  // ตัวที่เลือกอยู่อาจถูกกรองหายไป — เลือกตัวแรกที่ยังเห็นแทน เพื่อไม่ให้ panel ขัดกับตาราง
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
    const host = document.getElementById('sec-detail');
    if (!host) return;
    if (this.state.chart) { this.state.chart.destroy(); this.state.chart = null; }

    if (!row) {
      host.innerHTML = `<div class="pf-card" style="padding: 22px; color: var(--txt-muted); font-size: 13px;">เลือกหลักทรัพย์จากตารางเพื่อดูกราฟย้อนหลัง</div>`;
      return;
    }

    const status = this.statusOf(row);
    const changeColor = row.changePct == null ? 'var(--txt-faint)' : (row.changePct >= 0 ? 'var(--up)' : 'var(--down)');
    const detail = row.fundDetail || {};
    const sourceChips = (row.sources || []).map(source =>
      `<span style="background: rgba(96, 165, 250, 0.12); border: 1px solid rgba(96, 165, 250, 0.28); color: #c7d2fe; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;">${this.escape(source)}</span>`
    ).join(' ') || '<span style="color: var(--txt-faint); font-size: 12px;">—</span>';

    const fundRows = row.isFund ? `
      <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 12.5px; padding: 6px 0; border-bottom: 1px solid var(--line-soft);">
        <span style="color: var(--txt-muted);">ประเภทกองทุน</span>
        <span style="color: var(--txt-soft); font-weight: 700;">${this.escape(detail.fund_type || '—')}</span>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 12.5px; padding: 6px 0; border-bottom: 1px solid var(--line-soft);">
        <span style="color: var(--txt-muted);">ค่าธรรมเนียมรวม</span>
        <span style="color: var(--txt-soft); font-weight: 700;">${detail.expense_ratio == null ? '—' : Number(detail.expense_ratio).toFixed(2) + '% / ปี'}</span>
      </div>` : '';

    host.innerHTML = `
      <div class="pf-card" style="padding: 18px 18px 20px;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
          <div style="min-width: 0;">
            <div style="font-size: 18px; font-weight: 800; color: var(--txt-strong);">${this.escape(row.symbol)}</div>
            <div style="font-size: 12px; color: var(--txt-muted); margin-top: 2px;">${this.escape(row.name)}</div>
          </div>
          <span style="color: ${status.color}; font-size: 11.5px; font-weight: 800; white-space: nowrap;">${status.label}</span>
        </div>

        <div style="display: flex; align-items: baseline; gap: 10px; margin: 14px 0 4px;">
          <span class="pf-num-grad" style="font-size: 26px; font-weight: 800;">${this.money(row.value, row.currency)}</span>
          <span style="font-size: 13px; font-weight: 700; color: ${changeColor};">${this.pct(row.changePct)}</span>
        </div>
        <div style="font-size: 12px; color: var(--txt-muted); margin-bottom: 12px;">
          ${row.isFund ? 'NAV' : 'ราคาปิด'} ณ ${this.thDate(row.lastDate)} · ${this.escape(row.currency || '')}
        </div>

        <div class="sec-chart-box"><canvas id="sec-chart"></canvas></div>

        <div style="font-size: 12.5px;">
          <div style="display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--line-soft);">
            <span style="color: var(--txt-muted);">ช่วงข้อมูล</span>
            <span style="color: var(--txt-soft); font-weight: 700;">${this.thDate(row.firstDate)} → ${this.thDate(row.lastDate)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--line-soft);">
            <span style="color: var(--txt-muted);">จำนวนจุด</span>
            <span style="color: var(--txt-soft); font-weight: 700;">${this.num(row.dataPoints, 0)}</span>
          </div>
          ${fundRows}
          <div style="display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; align-items: center;">
            <span style="color: var(--txt-muted);">แหล่งข้อมูล</span>
            <span>${sourceChips}</span>
          </div>
        </div>

        <div id="sec-chart-note" style="font-size: 11.5px; color: var(--txt-faint); margin-top: 8px;">กำลังโหลดกราฟ…</div>
      </div>`;

    this.drawChart(row);
  },

  async drawChart(row) {
    const canvas = document.getElementById('sec-chart');
    const note = document.getElementById('sec-chart-note');
    if (!canvas) return;
    let points = [];
    try {
      points = await this.fetchHistory(row);
    } catch (error) {
      if (note) note.textContent = 'โหลดกราฟไม่สำเร็จ: ' + (error.message || error);
      return;
    }
    if (!canvas.isConnected) return;      // ผู้ใช้เปลี่ยนรายการระหว่างรอข้อมูล
    if (note) note.textContent = points.length ? `${points.length} จุดข้อมูลจากฐานข้อมูล` : 'ยังไม่มีข้อมูลย้อนหลังในฐานข้อมูล';
    if (!points.length || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 210);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.32)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.02)');

    this.state.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: points.map(point => this.thDate(point.day).slice(0, 5)),
        datasets: [{
          data: points.map(point => point.value),
          borderColor: '#38bdf8',
          backgroundColor: gradient,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          fill: true,
          tension: 0.25
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => this.money(context.parsed.y, row.currency)
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(129, 140, 248, 0.10)' },
            ticks: { color: '#93a2cf', maxTicksLimit: 6, font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(129, 140, 248, 0.10)' },
            ticks: { color: '#93a2cf', font: { size: 10 } }
          }
        }
      }
    });
  }
};

window.SecuritiesModule = SecuritiesModule;
