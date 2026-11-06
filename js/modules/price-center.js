/**
 * js/modules/price-center.js
 * ศูนย์ราคา — ราคาปิด/NAV ล่าสุดของทุกหลักทรัพย์ + กราฟและตารางข้อมูลย้อนหลัง
 * อ่าน prices_daily / fund_nav_history / v_security_latest / v_coverage แบบ anon (RLS read-only)
 */
var PriceCenterModule = {
  STALE_DAYS: 4,
  HISTORY_LIMIT: 500,
  HISTORY_ROWS: 12,

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

  RANGES: [
    { key: '1M', label: '1 เดือน', days: 31 },
    { key: '3M', label: '3 เดือน', days: 92 },
    { key: '6M', label: '6 เดือน', days: 183 },
    { key: '1Y', label: '1 ปี', days: 366 },
    { key: 'ALL', label: 'ทั้งหมด', days: null }
  ],

  state: {
    rows: [],
    filter: 'all',
    search: '',
    selectedId: null,
    range: '1Y',
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
    if (!Number.isFinite(v)) return '—';
    return (v > 0 ? '+' : '') + v.toFixed(2) + '%';
  },

  thDate(day) {
    if (!day) return '—';
    const [y, m, d] = String(day).slice(0, 10).split('-');
    if (!y || !m || !d) return '—';
    return `${d}/${m}/${y}`;
  },

  thTime(stamp) {
    if (!stamp) return '—';
    const date = new Date(stamp);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('th-TH', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
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
      console.error('[PriceCenter] load error', error);
      this.renderError(error);
      return;
    }
    this.renderAll();
  },

  async load() {
    // Supabase ตอบ statement timeout เป็นครั้งคราวตอนยิง 3 query พร้อมกัน — ลองซ้ำหนึ่งครั้ง
    try {
      await this.loadOnce();
    } catch (error) {
      console.warn('[PriceCenter] retry after', error && error.message);
      await new Promise(resolve => setTimeout(resolve, 900));
      await this.loadOnce();
    }
  },

  async loadOnce() {
    // ทะเบียนทั้งตลาดมีหลักหมื่นตัว — หน้านี้แสดง "ตัวที่ติดตาม" (track_history) ไม่ใช่ทั้งทะเบียน
    // (ทั้งทะเบียนดูได้ที่หน้าศูนย์ข้อมูลราคา & NAV ซึ่งค้นหา/แบ่งหน้าฝั่งเซิร์ฟเวอร์)
    const [latest, coverage, navRows] = await Promise.all([
      supabaseClient.from('v_security_latest').select('*').eq('track_history', true).limit(1000),
      supabaseClient.from('v_coverage')
        .select('security_id,data_points,first_date,last_date,last_fetched_at,sources')
        .eq('track_history', true)
        .limit(1000),
      supabaseClient.from('fund_nav_history')
        .select('security_id,nav_date,nav')
        .order('nav_date', { ascending: false })
        .limit(1000)
    ]);
    [latest, coverage, navRows].forEach(result => {
      if (result.error) throw result.error;
    });

    const covById = new Map((coverage.data || []).map(row => [row.security_id, row]));
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
        currency: row.currency,
        isFund,
        value: Number(isFund ? row.fund_nav : row.price),
        prevClose: isFund ? null : (row.prev_close == null ? null : Number(row.prev_close)),
        lastDate: lastDate || null,
        changePct: Number.isFinite(change) ? change : null,
        dataPoints: Number(cov.data_points) || 0,
        firstDate: cov.first_date || null,
        lastFetchedAt: cov.last_fetched_at || null,
        sources: Array.isArray(cov.sources) ? cov.sources : [],
        daysOld: this.daysSince(lastDate)
      };
    }).filter(row => Number.isFinite(row.value))
      .sort((a, b) => Math.abs(b.changePct || 0) - Math.abs(a.changePct || 0));
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
      .select(`${dateCol},${valueCol},source_code`)
      .eq('security_id', row.securityId)
      .order(dateCol, { ascending: false })
      .limit(this.HISTORY_LIMIT);
    if (error) throw error;
    const points = (data || []).reverse().map(item => ({
      day: item[dateCol],
      value: Number(item[valueCol]),
      source: item.source_code || ''
    }));
    this.state.historyCache.set(row.securityId, points);
    return points;
  },

  // ---------------------------------------------------------------- render
  renderError(error) {
    this.container.innerHTML = `
      <div class="pf-glass" style="padding: 28px;">
        <div class="pf-card" style="padding: 22px 24px; color: var(--txt-soft);">
          <div style="font-weight: 800; font-size: 15px; margin-bottom: 6px;">โหลดข้อมูลราคาไม่สำเร็จ</div>
          <div style="font-size: 13px;">${this.escape(error && error.message ? error.message : error)}</div>
        </div>
      </div>`;
  },

  renderAll() {
    const rows = this.state.rows;
    this.container.innerHTML = `
      <div class="pf-glass" style="padding: 22px 24px 30px;">
        <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 18px;">
          <div>
            <div style="font-size: 20px; font-weight: 800; color: var(--txt-strong);">ศูนย์ราคา</div>
            <div style="font-size: 12.5px; color: var(--txt-muted); margin-top: 4px;">
              ราคาปิด/NAV ล่าสุดของหลักทรัพย์ที่ติดตาม พร้อมกราฟและข้อมูลย้อนหลังจาก <span style="color: var(--txt-soft);">prices_daily · fund_nav_history</span>
              · ทั้งทะเบียนดูที่ <span style="color: var(--txt-soft);">securities.html</span>
            </div>
          </div>
          <button type="button" id="pc-refresh" style="background: rgba(96, 165, 250, 0.10); border: 1px solid rgba(129, 140, 248, 0.32); color: #c7d2fe; padding: 8px 16px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer;">↻ โหลดใหม่</button>
        </div>

        <div id="pc-kpis" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 18px;"></div>

        <div style="display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(320px, 1fr); gap: 16px; align-items: start;" class="pc-grid">
          <div class="pf-card" style="padding: 18px 18px 12px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
              <input id="pc-search" type="text" placeholder="ค้นหาสัญลักษณ์หรือชื่อ…"
                style="flex: 1 1 220px; min-width: 180px; background: rgba(9, 13, 38, 0.5); border: 1px solid rgba(129, 140, 248, 0.22); border-radius: 9px; padding: 8px 12px; color: var(--txt); font-size: 13px; outline: none;">
              <div id="pc-filters" style="display: flex; gap: 6px; flex-wrap: wrap;"></div>
            </div>
            <div style="max-height: 620px; overflow: auto;">
              <table class="pc-table">
                <thead>
                  <tr>
                    <th>สัญลักษณ์</th>
                    <th>ประเภท</th>
                    <th style="text-align: right;">ราคาล่าสุด</th>
                    <th style="text-align: right;">เปลี่ยน</th>
                    <th style="text-align: right;">%</th>
                    <th>วันที่</th>
                  </tr>
                </thead>
                <tbody id="pc-table-body"></tbody>
              </table>
            </div>
          </div>

          <div id="pc-detail"></div>
        </div>
      </div>`;

    document.getElementById('pc-refresh').addEventListener('click', () => window.location.reload());
    document.getElementById('pc-search').addEventListener('input', event => {
      this.state.search = event.target.value.trim().toLowerCase();
      this.renderTable();
      this.syncSelection();
    });

    const filters = document.getElementById('pc-filters');
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

    document.getElementById('pc-table-body').addEventListener('click', event => {
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
    const withChange = rows.filter(row => row.changePct != null);
    const up = withChange.filter(row => row.changePct > 0).length;
    const down = withChange.filter(row => row.changePct < 0).length;
    const newest = rows.reduce((best, row) => (row.lastDate && (!best || row.lastDate > best) ? row.lastDate : best), null);
    const latestFetch = rows.reduce((best, row) => {
      if (!row.lastFetchedAt) return best;
      return !best || row.lastFetchedAt > best ? row.lastFetchedAt : best;
    }, null);

    const card = (icon, label, value, hint) => `
      <div class="pf-card" style="padding: 14px 16px; display: flex; gap: 12px; align-items: flex-start;">
        <div class="pf-icon-chip">${icon}</div>
        <div style="min-width: 0;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; color: var(--txt-faint);">${label}</div>
          <div class="pf-num-grad" style="font-size: 22px; font-weight: 800; line-height: 1.25;">${value}</div>
          <div style="font-size: 11.5px; color: var(--txt-muted);">${hint}</div>
        </div>
      </div>`;

    document.getElementById('pc-kpis').innerHTML = [
      card('📚', 'หลักทรัพย์ที่ติดตาม', this.num(rows.length, 0), `หุ้น/ETF/REIT ${others} · กองทุน ${funds}`),
      card('🗓️', 'ราคาปิดล่าสุด', newest ? this.thDate(newest) : '—', newest && this.daysSince(newest) != null ? `${this.daysSince(newest)} วันก่อน` : 'ยังไม่มีข้อมูล'),
      card('📊', 'ตลาดวันนี้', `<span style="color: var(--up);">▲ ${up}</span> <span style="color: var(--txt-faint);">/</span> <span style="color: var(--down);">▼ ${down}</span>`, `ไม่เปลี่ยน ${withChange.length - up - down} · ไม่มีข้อมูล ${rows.length - withChange.length}`),
      card('🔄', 'ดึงข้อมูลล่าสุด', latestFetch ? this.thTime(latestFetch) : '—', 'เวลาจากแหล่งข้อมูล (fetched_at)')
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
    const body = document.getElementById('pc-table-body');
    if (!body) return;
    const rows = this.visibleRows();
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--txt-faint); padding: 24px;">ไม่พบหลักทรัพย์ที่ตรงกับตัวกรอง</td></tr>';
      return;
    }
    body.innerHTML = rows.map(row => {
      const change = row.changePct == null ? null : row.changePct;
      const color = change == null ? 'var(--txt-faint)' : (change >= 0 ? 'var(--up)' : 'var(--down)');
      const amount = row.prevClose == null ? null : row.value - row.prevClose;
      return `
        <tr data-id="${row.securityId}" class="${row.securityId === this.state.selectedId ? 'is-active' : ''}">
          <td><span class="pc-symbol">${this.escape(row.symbol)}</span></td>
          <td style="font-size: 12px; color: var(--txt-soft);">${this.TYPE_LABELS[row.assetType] || this.escape(row.assetType)}</td>
          <td style="text-align: right; font-weight: 700; color: var(--txt-strong);">${this.money(row.value, row.currency)}</td>
          <td style="text-align: right; color: ${color}; font-weight: 700;">${change == null ? '—' : this.money(amount, row.currency)}</td>
          <td style="text-align: right; color: ${color}; font-weight: 700;">${this.pct(change)}</td>
          <td style="font-size: 12px;">${this.thDate(row.lastDate)}</td>
        </tr>`;
    }).join('');
  },

  selectSecurity(securityId) {
    const row = this.state.rows.find(item => item.securityId === securityId);
    if (!row) return;
    this.state.selectedId = securityId;
    document.querySelectorAll('#pc-table-body tr[data-id]').forEach(tr => {
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
    const host = document.getElementById('pc-detail');
    if (!host) return;
    if (this.state.chart) { this.state.chart.destroy(); this.state.chart = null; }

    if (!row) {
      host.innerHTML = `<div class="pf-card" style="padding: 22px; color: var(--txt-muted); font-size: 13px;">เลือกหลักทรัพย์จากตารางเพื่อดูกราฟและข้อมูลย้อนหลัง</div>`;
      return;
    }

    const change = row.changePct;
    const changeColor = change == null ? 'var(--txt-faint)' : (change >= 0 ? 'var(--up)' : 'var(--down)');
    const rangeChips = this.RANGES.map(item => `
      <button type="button" data-range="${item.key}"
        style="background: ${item.key === this.state.range ? 'rgba(96, 165, 250, 0.22)' : 'transparent'};
               border: 1px solid ${item.key === this.state.range ? 'rgba(96, 165, 250, 0.55)' : 'rgba(129, 140, 248, 0.22)'};
               color: ${item.key === this.state.range ? '#dbeafe' : 'var(--txt-soft)'};
               padding: 4px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700; cursor: pointer;">${item.label}</button>
    `).join('');

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
          <span class="pf-num-grad" style="font-size: 26px; font-weight: 800;">${this.money(row.value, row.currency)}</span>
          <span style="font-size: 13px; font-weight: 700; color: ${changeColor};">${this.pct(change)}</span>
        </div>
        <div style="font-size: 12px; color: var(--txt-muted); margin-bottom: 12px;">
          ${row.isFund ? 'NAV' : 'ราคาปิด'} ณ ${this.thDate(row.lastDate)} · ${this.escape(row.currency || '')}
        </div>

        <div id="pc-ranges" style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">${rangeChips}</div>
        <div class="pc-chart-box"><canvas id="pc-chart"></canvas></div>
        <div id="pc-chart-note" style="font-size: 11.5px; color: var(--txt-faint); margin-bottom: 12px;">กำลังโหลดกราฟ…</div>

        <div id="pc-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;"></div>

        <div style="font-size: 12px; font-weight: 800; color: var(--txt-soft); margin-bottom: 6px;">ข้อมูลย้อนหลังล่าสุด</div>
        <div style="max-height: 220px; overflow: auto;">
          <table class="pc-table" style="font-size: 12px;">
            <thead>
              <tr>
                <th>วันที่</th>
                <th style="text-align: right;">ราคา</th>
                <th style="text-align: right;">เปลี่ยน</th>
                <th style="text-align: right;">แหล่ง</th>
              </tr>
            </thead>
            <tbody id="pc-history-body"></tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('pc-ranges').addEventListener('click', event => {
      const button = event.target.closest('button[data-range]');
      if (!button) return;
      this.state.range = button.dataset.range;
      this.renderDetail(row);
    });

    this.drawDetail(row);
  },

  rangeCutoff(rangeKey) {
    const range = this.RANGES.find(item => item.key === rangeKey);
    if (!range || range.days == null) return null;
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - range.days);
    return cutoff.toISOString().slice(0, 10);
  },

  async drawDetail(row) {
    const note = document.getElementById('pc-chart-note');
    let points = [];
    try {
      points = await this.fetchHistory(row);
    } catch (error) {
      if (note) note.textContent = 'โหลดกราฟไม่สำเร็จ: ' + (error.message || error);
      return;
    }
    if (!document.getElementById('pc-chart') || this.state.selectedId !== row.securityId) return;

    const entries = points.map((point, index) => ({
      day: point.day,
      value: point.value,
      source: point.source,
      prev: index ? points[index - 1].value : null
    }));
    const cutoff = this.rangeCutoff(this.state.range);
    const visible = cutoff ? entries.filter(entry => entry.day >= cutoff) : entries;

    if (note) note.textContent = visible.length
      ? `${visible.length} จุดข้อมูล · ${this.thDate(visible[0].day)} → ${this.thDate(visible[visible.length - 1].day)}`
      : 'ยังไม่มีข้อมูลย้อนหลังในช่วงที่เลือก';

    this.renderStats(row, visible);
    this.renderHistoryTable(row, visible);
    this.drawChart(row, visible);
  },

  renderStats(row, points) {
    const host = document.getElementById('pc-stats');
    if (!host) return;
    const values = points.map(point => point.value).filter(Number.isFinite);
    const box = (label, value, color) => `
      <div style="background: rgba(9, 13, 38, 0.45); border: 1px solid var(--line-soft); border-radius: 9px; padding: 8px 10px;">
        <div style="font-size: 10.5px; font-weight: 700; color: var(--txt-faint); text-transform: uppercase; letter-spacing: .3px;">${label}</div>
        <div style="font-size: 14px; font-weight: 800; color: ${color || 'var(--txt-strong)'};">${value}</div>
      </div>`;
    if (!values.length) {
      host.innerHTML = box('สูงสุด', '—') + box('ต่ำสุด', '—') + box('เฉลี่ย', '—') + box('เปลี่ยนตามช่วง', '—');
      return;
    }
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    const first = values[0];
    const last = values[values.length - 1];
    const rangeChange = first > 0 ? (last / first - 1) * 100 : null;
    const color = rangeChange == null ? 'var(--txt-faint)' : (rangeChange >= 0 ? 'var(--up)' : 'var(--down)');
    host.innerHTML =
      box('สูงสุด', this.money(max, row.currency)) +
      box('ต่ำสุด', this.money(min, row.currency)) +
      box('เฉลี่ย', this.money(avg, row.currency)) +
      box('เปลี่ยนตามช่วง', this.pct(rangeChange), color);
  },

  renderHistoryTable(row, points) {
    const body = document.getElementById('pc-history-body');
    if (!body) return;
    const rows = points.slice(-this.HISTORY_ROWS).reverse();
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--txt-faint); padding: 14px;">ไม่มีข้อมูล</td></tr>';
      return;
    }
    body.innerHTML = rows.map(point => {
      const change = point.prev != null && point.prev > 0 ? (point.value / point.prev - 1) * 100 : null;
      const color = change == null ? 'var(--txt-faint)' : (change >= 0 ? 'var(--up)' : 'var(--down)');
      return `
        <tr>
          <td>${this.thDate(point.day)}</td>
          <td style="text-align: right; font-weight: 700;">${this.money(point.value, row.currency)}</td>
          <td style="text-align: right; color: ${color}; font-weight: 700;">${this.pct(change)}</td>
          <td style="text-align: right; font-size: 11px; color: var(--txt-muted);">${this.escape(point.source || '—')}</td>
        </tr>`;
    }).join('');
  },

  drawChart(row, points) {
    const canvas = document.getElementById('pc-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (this.state.chart) { this.state.chart.destroy(); this.state.chart = null; }
    if (!points.length) return;

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
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
          pointRadius: points.length < 3 ? 3 : 0,
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
              title: items => this.thDate(points[items[0].dataIndex].day),
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

window.PriceCenterModule = PriceCenterModule;
