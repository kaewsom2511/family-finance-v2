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
  // ทะเบียนทั้งตลาดมีหลักหมื่นตัว → อ่านทีละหน้าและค้นฝั่งเซิร์ฟเวอร์ ไม่โหลดทั้งหมดมาเก็บในเบราว์เซอร์
  PAGE_SIZE: 50,

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
    page: 0,
    total: 0,
    stats: { counts: {}, total: 0, missingTracked: 0, newest: null },
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
    // ตัวเลขสรุปเป็นของประกอบ — พังไม่ควรทำให้ทั้งหน้าล่ม
    try {
      await this.loadStats();
    } catch (error) {
      console.warn('[Securities] stats error', error && error.message);
    }
    this.renderAll();
  },

  async load() {
    await this.fetchPage();
  },

  pageQuery() {
    const { filter, search, page } = this.state;
    const from = page * this.PAGE_SIZE;
    let query = supabaseClient.from('v_security_latest').select('*', { count: 'exact' });
    if (filter !== 'all') query = query.eq('asset_type', filter);
    // ตัดอักขระที่ทำให้ไวยากรณ์ or() ของ PostgREST พัง (ค้นหาว่าง = ไม่กรอง)
    const term = String(search || '').replace(/[%,()*]/g, ' ').trim();
    if (term.length > 0 && term.length <= 3) {
      // คำสั้น = พิมพ์ชื่อยอก → match เฉพาะ symbol ขึ้นต้น ไม่แตะชื่อ (มิฉะนั้น "tu" จะไปโดน "Infra-stru-cture")
      query = query.ilike('symbol', `${term}*`);
    } else if (term) {
      query = query.or(`symbol.ilike.%${term}%,name_th.ilike.%${term}%,name_en.ilike.%${term}%`);
    }
    return query.order('symbol', { ascending: true }).range(from, from + this.PAGE_SIZE - 1);
  },

  async fetchPage() {
    const { data, error, count } = await this.pageQuery();
    if (error) throw error;
    const rows = data || [];
    this.state.total = count || 0;
    if (!rows.length && this.state.page > 0) {
      // ข้อมูลเปลี่ยนจนหน้านี้หาย (เช่นค้นหาผลแคบลง) → ถอยกลับหน้าแรก
      this.state.page = 0;
      return this.fetchPage();
    }
    this.state.rows = await this.decorate(rows);
  },

  // เติมเฉพาะข้อมูลของแถวในหน้านี้ — ไม่ดึงทั้งทะเบียนมาคำนวณในเบราว์เซอร์
  async decorate(rows) {
    if (!rows.length) return [];
    const ids = rows.map(row => row.security_id);
    const fundIds = rows.filter(row => row.asset_type === 'mutual-fund').map(row => row.security_id);
    const [coverage, details] = await Promise.all([
      supabaseClient.from('v_coverage')
        .select('security_id,data_points,first_date,last_date,last_fetched_at,sources')
        .in('security_id', ids),
      fundIds.length
        ? supabaseClient.from('fund_details')
            .select('security_id,fund_type,expense_ratio,nav_date,latest_nav,prev_nav')
            .in('security_id', fundIds)
        : Promise.resolve({ data: [], error: null })
    ]);
    [coverage, details].forEach(result => { if (result.error) throw result.error; });

    const covById = new Map((coverage.data || []).map(row => [row.security_id, row]));
    const detailById = new Map((details.data || []).map(row => [row.security_id, row]));

    return rows.map(row => {
      const cov = covById.get(row.security_id) || {};
      const detail = detailById.get(row.security_id) || null;
      const isFund = row.asset_type === 'mutual-fund';
      const nav = Number(detail && detail.latest_nav);
      const prevNav = Number(detail && detail.prev_nav);
      const change = isFund
        ? (nav > 0 && prevNav > 0 ? (nav / prevNav - 1) * 100 : null)
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
        fundDetail: detail
      };
    });
  },

  // ยอดรวมทั้งทะเบียนสำหรับการ์ดสรุป — นับฝั่งเซิร์ฟเวอร์ด้วย head request (ไม่ดึงแถวจริง)
  async loadStats() {
    const types = this.FILTERS.filter(item => item.key !== 'all').map(item => item.key);
    const results = await Promise.all([
      supabaseClient.from('v_security_latest').select('security_id', { count: 'exact', head: true }),
      ...types.map(type => supabaseClient.from('v_security_latest')
        .select('security_id', { count: 'exact', head: true }).eq('asset_type', type)),
      supabaseClient.from('v_coverage').select('security_id', { count: 'exact', head: true })
        .eq('track_history', true).eq('data_points', 0)
    ]);
    results.forEach(result => { if (result.error) throw result.error; });
    const counts = {};
    types.forEach((type, index) => { counts[type] = results[index + 1].count || 0; });
    this.state.stats = {
      total: results[0].count || 0,
      counts,
      missingTracked: results[results.length - 1].count || 0
    };
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
            <div id="sec-pager" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 2px 4px; font-size: 12.5px; color: var(--txt-muted);"></div>
          </div>

          <div id="sec-detail"></div>
        </div>
      </div>`;

    document.getElementById('sec-refresh').addEventListener('click', () => window.location.reload());
    let searchTimer = null;
    document.getElementById('sec-search').addEventListener('input', event => {
      const value = event.target.value.trim();
      clearTimeout(searchTimer);
      // ช้าไปหน่อยเพื่อไม่ให้ยิงคำขอทุกตัวอักษร
      searchTimer = setTimeout(() => this.applyFilters({ search: value }), 350);
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
      filters.querySelectorAll('button[data-filter]').forEach(item => {
        const active = item.dataset.filter === button.dataset.filter;
        item.style.background = active ? 'rgba(96, 165, 250, 0.22)' : 'transparent';
        item.style.borderColor = active ? 'rgba(96, 165, 250, 0.55)' : 'rgba(129, 140, 248, 0.22)';
        item.style.color = active ? '#dbeafe' : 'var(--txt-soft)';
      });
      this.applyFilters({ filter: button.dataset.filter });
    });

    document.getElementById('sec-pager').addEventListener('click', event => {
      const button = event.target.closest('button[data-page]');
      if (button && !button.disabled) this.changePage(Number(button.dataset.page));
    });

    document.getElementById('sec-table-body').addEventListener('click', event => {
      const tr = event.target.closest('tr[data-id]');
      if (tr) this.selectSecurity(tr.dataset.id);
    });

    this.renderKpis();
    this.renderTable();
    this.renderPager();
    const first = this.state.rows[0];
    if (first) this.selectSecurity(first.securityId);
    else this.renderDetail(null);
  },

  async applyFilters(patch) {
    Object.assign(this.state, patch, { page: 0 });
    try {
      await this.load();
    } catch (error) {
      console.error('[Securities] filter error', error);
      return;
    }
    this.renderKpis();
    this.renderTable();
    this.renderPager();
    this.syncSelection();
  },

  async changePage(page) {
    const pages = Math.max(1, Math.ceil(this.state.total / this.PAGE_SIZE));
    if (page < 0 || page >= pages || page === this.state.page) return;
    this.state.page = page;
    try {
      await this.load();
    } catch (error) {
      console.error('[Securities] page error', error);
      return;
    }
    this.renderKpis();
    this.renderTable();
    this.renderPager();
    this.syncSelection();
  },

  renderKpis() {
    const rows = this.state.rows;
    const stats = this.state.stats || {};
    const counts = stats.counts || {};
    const newest = rows.reduce((best, row) => (row.lastDate && (!best || row.lastDate > best) ? row.lastDate : best), null);
    const start = this.state.page * this.PAGE_SIZE + 1;
    const shown = rows.length ? `${start}–${start + rows.length - 1} จาก ${this.state.total}` : 'ไม่มีแถว';

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
      card('📚', 'หลักทรัพย์ในทะเบียน', this.num(stats.total || 0, 0),
        `หุ้นไทย ${this.num(counts['thai-stock'] || 0, 0)} · หุ้นนอก ${this.num(counts['foreign-stock'] || 0, 0)} · ETF ${this.num(counts['etf'] || 0, 0)} · กองทุน ${this.num(counts['mutual-fund'] || 0, 0)}`),
      card('🔎', 'ผลที่ตรงกับเงื่อนไข', this.num(this.state.total, 0), `กำลังแสดง ${shown}`),
      card('🗓️', 'ข้อมูลล่าสุดในหน้านี้', newest ? this.thDate(newest) : '—',
        newest && this.daysSince(newest) != null ? `${this.daysSince(newest)} วันก่อน` : 'ยังไม่มีข้อมูล'),
      card('⚠️', 'ตัวที่ติดตามยังไม่มีข้อมูล', this.num(stats.missingTracked || 0, 0), 'นับเฉพาะ track_history = true')
    ].join('');
  },

  renderPager() {
    const host = document.getElementById('sec-pager');
    if (!host) return;
    const total = this.state.total;
    if (!total) {
      host.innerHTML = '';
      return;
    }
    const pages = Math.max(1, Math.ceil(total / this.PAGE_SIZE));
    const page = this.state.page;
    const button = (label, target, disabled) => `
      <button type="button" data-page="${target}" ${disabled ? 'disabled' : ''}
        style="background: ${disabled ? 'transparent' : 'rgba(96, 165, 250, 0.10)'};
               border: 1px solid rgba(129, 140, 248, ${disabled ? '0.15' : '0.32'});
               color: ${disabled ? 'var(--txt-faint)' : '#c7d2fe'};
               padding: 6px 12px; border-radius: 9px; font-size: 12px; font-weight: 700;
               cursor: ${disabled ? 'default' : 'pointer'};">${label}</button>`;
    host.innerHTML = `
      ${button('← ก่อนหน้า', page - 1, page <= 0)}
      <span>หน้า ${page + 1} / ${pages} · ${this.num(total, 0)} รายการ</span>
      ${button('ถัดไป →', page + 1, page >= pages - 1)}`;
  },

  renderTable() {
    const body = document.getElementById('sec-table-body');
    if (!body) return;
    const rows = this.state.rows;
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
    const rows = this.state.rows;
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
        <div id="sec-history-request" style="margin-top: 10px;"></div>
      </div>`;

    this.drawChart(row);
    this.renderHistoryRequest(row);
  },

  // ตัวที่ยังไม่มีประวัติ (ทะเบียนทั้งตลาด) — ให้กดขอเข้าคิว history_requests
  // collector รอบรายวันค่อย ๆ ดึง ~1 ปีย้อนหลังให้ทีละชุด
  async renderHistoryRequest(row) {
    const host = document.getElementById('sec-history-request');
    if (!host) return;
    if (row.dataPoints > 0) { host.innerHTML = ''; return; }

    const btnStyle = 'width: 100%; padding: 9px 12px; border-radius: 10px; font-size: 12.5px; font-weight: 700; '
      + 'background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); '
      + 'color: #7dd3fc; cursor: pointer;';
    host.innerHTML = `
      <button id="sec-request-history" style="${btnStyle}">📥 ขอประวัติย้อนหลัง (~1 ปี)</button>
      <div id="sec-request-note" style="font-size: 11.5px; color: var(--txt-faint); margin-top: 6px;"></div>`;

    const btn = document.getElementById('sec-request-history');
    const note = document.getElementById('sec-request-note');
    btn.addEventListener('click', () => this.requestHistory(row, btn, note));

    try {
      const { data } = await supabaseClient.from('history_requests')
        .select('status,message').eq('security_id', row.securityId).maybeSingle();
      if (!data) return;
      if (data.status === 'pending') {
        btn.disabled = true;
        btn.style.opacity = '0.55';
        btn.textContent = '⏳ อยู่ในคิวแล้ว';
        note.textContent = 'ระบบจะดึงประวัติให้ในรอบเก็บข้อมูลถัดไป (ราคาราว 17:45 / 05:30)';
      } else if (data.status === 'failed') {
        note.textContent = 'รอบก่อนล้มเหลว: ' + (data.message || 'ไม่ทราบสาเหตุ') + ' — กดปุ่มเพื่อขอใหม่';
      }
    } catch (error) {
      // ตารางคิวยังไม่ถูกสร้าง (migration ยังไม่รัน) — ปล่อยปุ่มไว้ให้กด จะมีข้อความผิดพลาดชัดเจน
    }
  },

  async requestHistory(row, btn, note) {
    btn.disabled = true;
    if (note) note.textContent = 'กำลังส่งคำขอ…';
    try {
      // แยกตามสถานะเดิม: คิวใหม่ insert · คิวที่เคยล้มเหลว update กลับเป็น pending
      // (upsert/on_conflict ใช้ไม่ได้ — RLS ของ UPDATE แยกจาก INSERT และ PostgREST
      // ต้องผ่าน USING ของ policy อัปเดตแม้แถวจะยังไม่เคยมี)
      const { data: existing } = await supabaseClient.from('history_requests')
        .select('status').eq('security_id', row.securityId).maybeSingle();
      let error = null;
      if (!existing) {
        ({ error } = await supabaseClient.from('history_requests')
          .insert({ security_id: row.securityId, status: 'pending' }));
      } else if (existing.status === 'failed') {
        ({ error } = await supabaseClient.from('history_requests')
          .update({ status: 'pending', message: null, processed_at: null,
                    requested_at: new Date().toISOString() })
          .eq('security_id', row.securityId));
      }
      if (error) throw error;
      btn.style.opacity = '0.55';
      btn.textContent = '⏳ อยู่ในคิวแล้ว';
      if (note) note.textContent = 'ระบบจะดึงประวัติให้ในรอบเก็บข้อมูลถัดไป (ราคาราว 17:45 / 05:30)';
    } catch (error) {
      btn.disabled = false;
      if (note) note.textContent = 'ส่งคำขอไม่สำเร็จ: ' + (error.message || error)
        + ' — ถ้าเพิ่งอัปเดตระบบ ลองรีเฟรชหน้านี้หนึ่งครั้ง';
    }
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
