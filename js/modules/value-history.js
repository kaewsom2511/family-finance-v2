// ชั้นข้อมูลยอดคงเหลือวันตั้งต้น + เส้นโค้งมูลค่าย้อนหลัง
// ใช้ได้กับ portfolio.html (ต้องโหลดหลัง js/modules/portfolio.js)

var PositionAnchorService = {
  STORAGE_KEY: 'wealthport:position-anchors:v1',

  normSymbol(symbol) {
    return String(symbol || '').trim().toUpperCase().replace(/\.BK$/i, '');
  },

  entryKey(portfolioId, symbol) {
    return `${portfolioId}|${this.normSymbol(symbol)}`;
  },

  read() {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}'); } catch (e) { return {}; }
  },

  write(store) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(store));
      if (typeof CloudSync !== 'undefined' && CloudSync.scheduleCloudPush) CloudSync.scheduleCloudPush();
    } catch (e) { console.warn('[PositionAnchor] เขียนไม่ได้', e); }
  },

  get(portfolioId, symbol) {
    return this.read()[this.entryKey(portfolioId, symbol)] || null;
  },

  set(portfolioId, symbol, units, asOf, supersedes, note) {
    const store = this.read();
    const key = this.entryKey(portfolioId, symbol);
    const qty = Number(units);
    if (!(qty > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(String(asOf))) {
      if (store[key]) { delete store[key]; this.write(store); }
      return false;
    }
    store[key] = {
      units: qty,
      symbol: String(symbol).trim(),
      asOf,
      supersedes: (Array.isArray(supersedes) ? supersedes : []).filter(Boolean).map(String),
      note: note || '',
      updatedAt: Date.now()
    };
    this.write(store);
    return true;
  },

  clear(portfolioId, symbol) {
    const store = this.read();
    const key = this.entryKey(portfolioId, symbol);
    if (!store[key]) return false;
    delete store[key];
    this.write(store);
    return true;
  }
};

var ValueHistoryService = {
  CACHE_KEY: 'wealthport:value-history-cache:v1',
  FX_KEY: 'fx|THB=X',
  REFETCH_MS: 12 * 60 * 60 * 1000,
  // ครั้งที่แหล่งข้อมูลตอบผิด/ตอบครึ่ง ๆ ไม่ควรต้องรอถึง 12 ชม. กว่า จะลองใหม่
  RETRY_FAIL_MS: 2 * 60 * 1000,
  REQUEST_GAP_MS: 320,
  MAX_PER_RUN: 12,
  FETCH_TIMEOUT_MS: 20000,
  DEFAULT_FX: 33.49,
  MAX_STALE_DAYS: 10,
  // range=1y ของทุกชั้นสินทรัพย์มีหลักร้อยจุด ถ้าได้กลับมาไม่กี่จุดคือแหล่งข้อมูลตอบครึ่ง ๆ (เช่นแท่งเดียวของวันนี้)
  // ให้ถือว่าดึงไม่สำเร็จ เพื่อให้ 12 ชม. ถ้ายิงใหม่ ไม่ใช่เก็บไปถาวรแล้วทำให้เส้นโค้งเพี้ยน
  MIN_POINTS: 5,

  running: false,
  progress: { done: 0, total: 0 },
  _onDone: null,

  readCache() {
    try { return JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}'); } catch (e) { return {}; }
  },

  writeCache(store) {
    try { localStorage.setItem(this.CACHE_KEY, JSON.stringify(store)); } catch (e) {}
  },

  entryKey(symbol, assetType) {
    return `${assetType || 'foreign-stock'}|${PositionAnchorService.normSymbol(symbol)}`;
  },

  seriesUrl(symbol, assetType) {
    const base = (typeof QuoteSyncService !== 'undefined' && QuoteSyncService.getApiBaseUrl)
      ? QuoteSyncService.getApiBaseUrl() : 'https://wealthport.onrender.com';
    const clean = String(symbol || '').trim().replace(/\.BK$/i, '');
    if (assetType === 'fx') return `${base}/api/chart?symbol=THB%3DX&assetType=foreign-stock&range=1y&interval=1d`;
    if (assetType === 'mutual-fund') return `${base}/api/fund-chart?symbol=${encodeURIComponent(clean)}&range=1y`;
    const isThai = assetType === 'thai-stock';
    return `${base}/api/chart?symbol=${encodeURIComponent(isThai ? `${clean}.BK` : clean)}&assetType=${isThai ? 'thai-stock' : 'foreign-stock'}&range=1y&interval=1d`;
  },

  async fetchOne(symbol, assetType) {
    // แหล่งข้อมูลตอบ "ดึงกราฟราคาไม่สำเร็จ" แบบชั่วคราวได้บ่อยเมื่อ ยิงติดกัน → ลองใหม่ 1 ครั้ง
    const first = await this.fetchOnce(symbol, assetType);
    if (first) return first;
    await new Promise((r) => setTimeout(r, 1200));
    return this.fetchOnce(symbol, assetType);
  },

  async fetchOnce(symbol, assetType) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), this.FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(this.seriesUrl(symbol, assetType), { signal: ctrl.signal });
      if (!res.ok) return null;
      const data = await res.json();
      const isFund = assetType === 'mutual-fund';
      const closes = {};
      (Array.isArray(data && data.points) ? data.points : []).forEach((p) => {
        const d = String(p.time || '').slice(0, 10);
        const v = Number(isFund ? p.value : p.close);
        // some Thai series carry 0 rows for halted days and would flatten the curve
        if (/^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(v) && v > 0) closes[d] = v;
      });
      return Object.keys(closes).length >= this.MIN_POINTS ? closes : null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(tid);
    }
  },

  // แถวรายการซื้อ-ขายของ 1 ตำแหน่ง (portfolioId+symbol) เรียงตามวันที่
  buildPositions(data, portfolioIds) {
    const map = new Map();
    const wanted = portfolioIds && portfolioIds.length ? new Set(portfolioIds) : null;
    (data.trades || []).forEach((t) => {
      if (wanted && !wanted.has(t.portfolioId)) return;
      const sym = String(t.symbol || '').trim();
      if (!sym) return;
      const key = PositionAnchorService.entryKey(t.portfolioId, sym);
      let p = map.get(key);
      if (!p) {
        p = { key, portfolioId: t.portfolioId, symbol: sym, assetType: t.assetType || 'foreign-stock', rows: [], earliest: '9999-99-99' };
        map.set(key, p);
      }
      const day = String(t.tradeDate || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
      if (day < p.earliest) p.earliest = day;
      p.rows.push({ id: t.id ? String(t.id) : null, day, side: String(t.side || 'buy').toLowerCase(), qty: Number(t.quantity || 0), ratio: Number(t.splitRatio || 1) });
    });
    map.forEach((p) => p.rows.sort((a, b) => a.day.localeCompare(b.day)));
    return map;
  },

  // anchor = ยอดหน่วยที่ถือจริง ณ วันตั้งต้น ซึ่งแอปไม่มีรายการซื้อ-ขายรองรับ
  // แถวที่ anchor มาแทนที่ (supersedes) ต้องถูกกันออก มิฉะนั้นจะนับซ้ำกับยอดตั้งต้น
  // ก่อนวันตั้งต้น ถอดรายการจริงที่เกิดหลังวันนั้นกลับย้อน เพื่อให้เส้นโค้งต่อเนื่องกัน
  positionUnits(p, day, anchor) {
    const dead = anchor && anchor.supersedes && anchor.supersedes.length ? new Set(anchor.supersedes) : null;
    const rows = dead ? p.rows.filter((r) => !r.id || !dead.has(r.id)) : p.rows;
    const apply = (units, r) => {
      if (r.side === 'buy') return units + r.qty;
      if (r.side === 'sell') return Math.max(0, units - r.qty);
      if (r.side === 'split' && r.ratio > 1) return units * r.ratio;
      return units;
    };
    if (!anchor || !anchor.asOf) {
      let units = 0;
      for (const r of rows) { if (r.day > day) break; units = apply(units, r); }
      return units;
    }
    if (day >= anchor.asOf) {
      let units = Number(anchor.units) || 0;
      for (const r of rows) {
        if (r.day <= anchor.asOf) continue;
        if (r.day > day) break;
        units = apply(units, r);
      }
      return units;
    }
    let units = Number(anchor.units) || 0;
    const undo = rows.filter((r) => r.day > day && r.day <= anchor.asOf).sort((a, b) => b.day.localeCompare(a.day));
    for (const r of undo) {
      if (r.side === 'buy') units -= r.qty;
      else if (r.side === 'sell') units += r.qty;
      else if (r.side === 'split' && r.ratio > 1) units /= r.ratio;
    }
    return Math.max(0, units);
  },

  // แถวที่ anchor ณ วัน asOf ต้องกลืนไป มิฉะนั้นจะนับซ้ำกับยอดตั้งต้น
  // asOf ย้อนไปก่อนวันที่แอปบันทึกก็ยังต้องกลืนแถววันแรกนั้นด้วย เพราะแถวนั้นคือ snapshot ยอดถือ ไม่ใช่การซื้อจริง
  // คืน missingIds เมื่อยังมีแถวที่ไมีเลขที่ (anchor แทนที่ไม่ได้) เพื่อกันการนับซ้ำ
  supersedesFor(p, asOf) {
    const cut = asOf > p.earliest ? asOf : p.earliest;
    const rows = p.rows.filter((r) => r.day <= cut);
    return { ids: rows.map((r) => r.id).filter(Boolean), missingIds: rows.filter((r) => !r.id).length };
  },

  // ยอดที่ควร prefill ให้ modal: ถ้าตั้งวันเดียวกับที่แอปบันทึกก็ใช้ยอดวันนั้น
  // ถ้าย้อนไปก่อนหน้า ให้สมมติว่าถือเท่าเดิมมาตลอด (ไม่มีหลักฐานซื้อ-ขายคั่นกลาง)
  openingUnitsAt(p, asOf) {
    return asOf >= p.earliest ? this.positionUnits(p, asOf, null) : this.positionUnits(p, p.earliest, null);
  },

  coverageFrom(p, anchor) {
    if (anchor && anchor.asOf) return anchor.asOf;
    return p.earliest;
  },

  carry(closes, day) {
    const dates = Object.keys(closes).filter((d) => d <= day).sort();
    if (!dates.length) return null;
    const last = dates[dates.length - 1];
    const age = Math.round((new Date(day) - new Date(last)) / 86400000);
    return { value: closes[last], date: last, ageDays: age };
  },

  dayKey(d) { return d.toISOString().slice(0, 10); },

  tradingDays(fromDate, toDate) {
    const out = [];
    const stop = new Date(toDate);
    for (const c = new Date(fromDate); c <= stop; c.setDate(c.getDate() + 1)) {
      const wd = c.getDay();
      if (wd === 0 || wd === 6) continue;
      out.push(this.dayKey(new Date(c)));
    }
    return out;
  },

  // cache ที่ "ใช้การได้" ต้องมีจุดข้อมูลอย่างน้อย MIN_POINTS → ของที่ดึงพลาดจะลองใหม่ภายใน 2 นาที ไม่ต้องรอ 12 ชม.
  isFresh(e) {
    if (!e) return false;
    const good = !!e.closes && Object.keys(e.closes).length >= this.MIN_POINTS;
    const age = Date.now() - (e.fetchedAt || 0);
    return good ? age < this.REFETCH_MS : age < this.RETRY_FAIL_MS;
  },

  // ดึงเพิ่มทีละไม่เกิน MAX_PER_RUN สัญลักษณ์ แล้วเรียก onDone ให้วาดใหม่
  async ensure(targets, onDone) {
    if (this.running) { this._onDone = onDone; return; }
    const cache = this.readCache();
    const needFx = !this.isFresh(cache[this.FX_KEY]);
    const queue = [];
    if (needFx) queue.push({ fx: true, symbol: 'THB=X', assetType: 'fx' });
    for (const t of targets) {
      if (this.isFresh(cache[this.entryKey(t.symbol, t.assetType)])) continue;
      queue.push(t);
      if (queue.length > this.MAX_PER_RUN) break;
    }
    if (!queue.length) return;

    this.running = true;
    this.progress = { done: needFx ? 1 : 0, total: queue.length };
    let changed = false;
    for (const t of queue) {
      const key = this.entryKey(t.symbol, t.assetType);
      // เก็บ fetchedAt แม้ดึงไม่สำเร็จ มิฉะนั้นจะยิง API ซ้ำทุกรอบที่วาด
      cache[key] = { closes: (await this.fetchOne(t.symbol, t.assetType)) || {}, fetchedAt: Date.now() };
      changed = true;
      this.progress.done++;
      await new Promise((r) => setTimeout(r, this.REQUEST_GAP_MS));
    }
    if (changed) this.writeCache(cache);
    this.running = false;
    const cb = onDone || this._onDone;
    this._onDone = null;
    if (changed && cb) cb();
  },

  // ฉาบข้อมูลราคา + anchor เข้ากับตำแหน่ง ใช้ร่วมกันทั้งการสร้างเส้นโค้งและหน้าจอ
  positionIndex(positions) {
    const cache = this.readCache();
    const anchors = PositionAnchorService.read();
    const list = [...positions.values()].map((p) => {
      const anchor = anchors[p.key] || null;
      const series = cache[this.entryKey(p.symbol, p.assetType)];
      return { p, anchor, series, coverageFrom: this.coverageFrom(p, anchor) };
    });
    return { list, anchors, fx: cache[this.FX_KEY] };
  },

  buildCurve(positions, days) {
    const indexed = this.positionIndex(positions);
    const missing = new Set();
    const list = [];
    // honestFrom = วันแรกที่ "ทุกสถานะ" รู้ยอดคงเหลือแล้ว = coverageFrom ที่ช้าที่สุด
    // ก่อนวันนั้นยังมีสถานะที่แอปไม่รู้เลยว่าถือกี่หน่วย → เส้นโค้งจะต่ำปลอมจนกระโดดวันนำเข้าข้อมูลชุดใหญ่
    let honestFrom = '0000-00-00';
    indexed.list.forEach((item) => {
      // สัญลักษณ์ที่ไร้แหล่งราคาปิด → ไม่ใช่ "ยังไม่รู้ยอด" อย่านำมาถ่วงวันเริ่มข้อมูลจริง
      if (!item.series || !Object.keys(item.series.closes).length) {
        missing.add(String(item.p.symbol));
        return;
      }
      list.push(item);
      if (item.coverageFrom > honestFrom) honestFrom = item.coverageFrom;
    });
    if (!list.length) honestFrom = '9999-99-99';

    const points = [];
    for (const day of days) {
      let total = 0;
      let counted = 0;
      // unknown = ยังไม่รู้ว่าถือกี่หน่วย (ก่อนวันตั้งต้น) → วันนั้นยังไม่ควรวาดกราฟทั้งวัน
      // noPrice = รู้ยอดแต่หาราคาปิดวันนั้นไม่ได้ (ข้อมูลขาด) → มูลค่าวันนั้นต่ำไปนิด แต่ยังวาดได้
      let unknown = 0;
      let noPrice = 0;
      const fxHit = indexed.fx ? this.carry(indexed.fx.closes, day) : null;
      const fx = fxHit ? fxHit.value : this.DEFAULT_FX;
      for (const item of list) {
        const units = this.positionUnits(item.p, day, item.anchor);
        if (units <= 1e-9) continue;
        if (day < item.coverageFrom) { unknown++; continue; }
        const hit = this.carry(item.series.closes, day);
        if (!hit || hit.ageDays > this.MAX_STALE_DAYS) { noPrice++; continue; }
        total += units * hit.value * (item.p.assetType === 'foreign-stock' ? fx : 1);
        counted++;
      }
      points.push({ date: day, valueTHB: total, positions: counted, unknown, noPrice });
    }
    return { points, honestFrom, missingSymbols: [...missing], needAnchor: this.needAnchor(list, days[0]) };
  },

  // สถานะที่ข้อมูลยังไปไม่ถึงวันแรกของกราฟ (รวมทั้งที่ตั้ง anchor ไว้แล้วยังตั้งไว้ช้าไป) คือตัวที่ควรชวนให้ตั้ง/แก้
  // ตั้งแล้วแต่ asOf ยังเกินวันแรกของ窗口 ก็ยังแก้ได้จากรายการนี้ จนกว่าจะครอบคลุมทั้งช่วงจึงจะหายไป
  // ยอดแนะนำ = เท่าที่มีอยู่ในวันแรกที่แอป record (ปกติเป็นวันนำเข้าข้อมูลชุดใหญ่)
  // และแถว ในวันนั้นทั้งหมดคือแถวที่ anchor จะมาแทนที่
  needAnchor(list, firstDay) {
    if (!firstDay) return [];
    return list
      .filter((i) => i.coverageFrom > firstDay)
      .map((i) => {
        const sup = this.supersedesFor(i.p, i.p.earliest);
        return {
          portfolioId: i.p.portfolioId,
          symbol: i.p.symbol,
          assetType: i.p.assetType,
          firstRecorded: i.p.earliest,
          suggestedUnits: this.positionUnits(i.p, i.p.earliest, null),
          supersedes: sup.ids,
          rowsOnFirstDay: i.p.rows.filter((r) => r.day === i.p.earliest).length,
          // แถวในวันแรกที่ไม่ระบุ id → anchor แทนที่ไม่ได้ กันการนับซ้ำ
          anchorable: sup.missingIds === 0,
          // ยอดปัจจุบันจากบันทึกจริง (ไม่ใช้ anchor) ให้เทียบในหน้าจอได้ว่ากรอกไปไกลแค่ไหน
          unitsNow: this.positionUnits(i.p, '9999-12-31', null)
        };
      })
      .sort((a, b) => b.firstRecorded.localeCompare(a.firstRecorded) || b.suggestedUnits - a.suggestedUnits);
  },

  resetCache() {
    try { localStorage.removeItem(this.CACHE_KEY); } catch (e) {}
  }
};
