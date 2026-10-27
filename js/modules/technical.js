/**
 * js/modules/technical.js
 * Technical Analysis & TradingView Charts Module
 */

var TechnicalModule = {
  currentChartSymbol: 'AMEX:VOO',
  currentRange: '2Y',
  currentChartStyle: 'candles',
  _chartInstance: null,
  _chartResize: null,
  _lwPromise: null,
  _chartContext: null,
  _subCharts: [],
  _subResizes: [],
  _chartCache: null,
  chartOverlays: { ema20: true, ema50: true, ema200: false, volume: true, sr: true, fib: false },

  formatTradingViewSymbol(rawSymbol, marketType) {
    if (!rawSymbol) return 'AMEX:VOO';
    const clean = rawSymbol.replace(/\.BK$/i, '').trim().toUpperCase();

    if (marketType === 'FUND') {
      return `FUND:${clean}`;
    }
    if (marketType === 'TH') {
      return `SET:${clean}`;
    }

    // สำหรับหุ้น/ETF สหรัฐฯ: เช็คกลุ่ม ETF ยอดนิยมที่ไม่ได้อยู่ใน NASDAQ
    const usEtfList = ['VOO', 'SPY', 'IVV', 'VTI', 'DIA', 'VNQ', 'SCHD', 'JEPI', 'JEPQ', 'TLT', 'BND'];
    if (usEtfList.includes(clean)) {
      return `AMEX:${clean}`;
    }

    // หุ้นสหรัฐฯ ทั่วไป ให้ TradingView ค้นหาตลาดอัตโนมัติ
    return clean;
  },

  render(container) {
    if (!container) return;

    const data = (typeof getPortfolioDataHelper === 'function') ? getPortfolioDataHelper() : { portfolios: [], trades: [] };
    const summary = (typeof PortfolioModule !== 'undefined' && PortfolioModule.calculatePortfolioDetail) 
      ? PortfolioModule.calculatePortfolioDetail(data, 'ALL') 
      : { activeHoldings: [] };
    const activeHoldings = summary.activeHoldings || [];
    const quotes = (typeof getQuoteCacheHelper === 'function') ? getQuoteCacheHelper() : {};

    const datalistOptions = activeHoldings.map(h => {
      const clean = (h.symbol || '').replace('.BK', '').toUpperCase();
      return `<option value="${clean}">${h.stockName || clean} (${h.assetType === 'mutual-fund' ? 'กองทุน' : 'หุ้น'})</option>`;
    }).join('');

    const rawSym = this.currentChartSymbol.replace(/^(BKK|NASDAQ|NYSE|AMEX|SET|FUND):/, '');
    const isFund = this.currentChartSymbol.startsWith('FUND:');
    const isThai = this.currentChartSymbol.startsWith('SET:') || this.currentChartSymbol.startsWith('BKK:') || rawSym.endsWith('.BK');
    const cleanSym = rawSym.replace('.BK', '');
    const currencySign = (isThai || isFund) ? '฿' : '$';

    const chartAssetType = isThai ? 'thai-stock' : isFund ? 'mutual-fund' : 'foreign-stock';
    const q = (typeof PortfolioModule !== 'undefined' && PortfolioModule.findQuote)
      ? (PortfolioModule.findQuote(quotes, isThai ? `${cleanSym}.BK` : cleanSym, chartAssetType) || {})
      : {};

    const holdingMatch = activeHoldings.find(h => h.symbol.replace(/\.BK$/i, '').toUpperCase() === cleanSym);

    // ราคา: ใช้ราคาที่ดึงได้จริงก่อน ถ้าไม่มีจึงใช้ราคาในพอร์ต และติดป้ายว่าไม่ใช่ราคาสด
    let price = parseFloat(q.price || 0);
    let priceSource = q.isEstimate ? 'ราคาประมาณการ' : (q.stale ? 'ข้อมูลเก่า' : (q.source || ''));
    if (!(price > 0) && holdingMatch) {
      price = parseFloat(holdingMatch.marketPrice || holdingMatch.priceUSD || 0) || 0;
      priceSource = 'ราคาในพอร์ต (ทุนเฉลี่ย)';
    }
    const hasPrice = price > 0;
    const priceDisplay = hasPrice ? `${currencySign}${price.toFixed(isFund ? 4 : 2)}` : '—';

    // เปลี่ยนราคาวันนี้: คำนวณเฉพาะเมื่อมี previousClose จริงจากแหล่งข้อมูล
    const prevClose = parseFloat(q.previousClose || q.prevClose || 0);
    const hasChange = hasPrice && prevClose > 0;
    const change = hasChange ? price - prevClose : 0;
    const changePct = hasChange ? (change / prevClose) * 100 : 0;
    const isBullish = change >= 0;

    // High/Low ใช้เฉพาะข้อมูลจริง — ไม่สังเคราะห์ขึ้นมาเอง
    const high = parseFloat(q.high || q.dayHigh || 0);
    const low = parseFloat(q.low || q.dayLow || 0);
    const hasRange = high > 0 && low > 0 && high >= low;
    const pivot = hasRange ? (high + low + price) / 3 : 0;
    const r1 = hasRange ? (2 * pivot) - low : 0;
    const r2 = hasRange ? pivot + (high - low) : 0;
    const s1 = hasRange ? (2 * pivot) - high : 0;
    const s2 = hasRange ? pivot - (high - low) : 0;

    const dataTimeStr = q.updatedAt
      ? new Date(q.updatedAt).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '';

    let portStatusHtml = '';
    if (holdingMatch) {
      const avgCostDisplay = isThai || isFund ? holdingMatch.avgCost : (holdingMatch.avgCostUSD || holdingMatch.avgCost);
      const diffCost = price - avgCostDisplay;
      const profitLossTHB = holdingMatch.shares * diffCost * (isThai ? 1 : (summary.liveFxRate || 33.49));
      const pnlPct = avgCostDisplay > 0 ? (diffCost / avgCostDisplay) * 100 : 0;
      const isGain = pnlPct >= 0;

      portStatusHtml = `
        <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="color: #166534; font-weight: 800; font-size: 12.5px;">💼 สถานะในพอร์ตของคุณ</span>
            <strong style="color: ${isGain ? '#16a34a' : '#dc2626'}; font-size: 13px; font-weight: 900;">${isGain ? '+' : ''}${pnlPct.toFixed(2)}%</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #334155; margin-bottom: 4px;">
            <span>ถือครอง: <strong>${holdingMatch.shares.toLocaleString('en-US')} ${isFund ? 'หน่วย' : 'หุ้น'}</strong></span>
            <span>ทุนเฉลี่ย: <strong>${currencySign}${avgCostDisplay.toFixed(isFund ? 4 : 2)}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569; border-top: 1px dashed #bbf7d0; padding-top: 4px;">
            <span>กำไรสุทธิ:</span>
            <strong style="color: ${isGain ? '#16a34a' : '#dc2626'};">${isGain ? '+' : '-'}${currencySign}${Math.abs(profitLossTHB).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="portfolio-container" style="padding-bottom: 30px;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
          <div style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap;">
            <div style="flex: 2; min-width: 200px;">
              <label style="display: block; font-size: 11.5px; font-weight: 700; color: #64748b; margin-bottom: 4px;">สัญลักษณ์</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="input-chart-symbol" list="portfolio-stocks-datalist" value="${cleanSym}" placeholder="เช่น VOO, AAPL, PTT" style="flex: 1; height: 38px; padding: 0 12px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-size: 14px; text-transform: uppercase; font-weight: 800; outline: none;">
                <datalist id="portfolio-stocks-datalist">${datalistOptions}</datalist>
                <button id="btn-submit-analyze" style="height: 38px; padding: 0 18px; border-radius: 6px; border: none; background: #00695c; color: #ffffff; font-weight: 800; font-size: 13.5px; cursor: pointer;">วิเคราะห์</button>
              </div>
            </div>
            
            <div style="flex: 1.2; min-width: 140px;">
              <label style="display: block; font-size: 11.5px; font-weight: 700; color: #64748b; margin-bottom: 4px;">ประเภท</label>
              <select id="select-chart-market-type" style="width: 100%; height: 38px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 600; background: #fff; cursor: pointer;">
                <option value="US" ${(!isThai && !isFund) ? 'selected' : ''}>หุ้นต่างประเทศ (US)</option>
                <option value="TH" ${isThai ? 'selected' : ''}>หุ้นไทย (SET)</option>
                <option value="FUND" ${isFund ? 'selected' : ''}>กองทุนรวม (Fund)</option>
              </select>
            </div>

            <div style="flex: 1; min-width: 110px;">
              <label style="display: block; font-size: 11.5px; font-weight: 700; color: #64748b; margin-bottom: 4px;">ช่วงเวลา</label>
              <select id="select-chart-timeframe" style="width: 100%; height: 38px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 600; background: #fff; cursor: pointer;">
                <option value="1M" ${this.currentRange === '1M' ? 'selected' : ''}>1 เดือน</option>
                <option value="6M" ${this.currentRange === '6M' ? 'selected' : ''}>6 เดือน</option>
                <option value="1Y" ${this.currentRange === '1Y' ? 'selected' : ''}>1 ปี</option>
                <option value="2Y" ${this.currentRange === '2Y' ? 'selected' : ''}>2 ปี</option>
                <option value="5Y" ${this.currentRange === '5Y' ? 'selected' : ''}>5 ปี</option>
              </select>
            </div>

            <div style="flex: 1; min-width: 110px;">
              <label style="display: block; font-size: 11.5px; font-weight: 700; color: #64748b; margin-bottom: 4px;">รูปแบบ</label>
              <select id="select-chart-style" style="width: 100%; height: 38px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 600; background: #fff; cursor: pointer;">
                <option value="candles" ${this.currentChartStyle === 'candles' ? 'selected' : ''}>แท่งเทียน</option>
                <option value="line" ${this.currentChartStyle === 'line' ? 'selected' : ''}>เส้น (Line)</option>
                <option value="area" ${this.currentChartStyle === 'area' ? 'selected' : ''}>พื้นที่ (Area)</option>
              </select>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2.2fr 1fr; gap: 20px; align-items: start;">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <div style="font-size: 12px; color: #0284c7; font-weight: 700; text-transform: uppercase;">กราฟเทคนิค</div>
                <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 2px;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #0f172a;">${cleanSym}</h1>
                  <span style="font-size: 13.5px; color: #64748b; font-weight: 600;">${holdingMatch?.stockName || cleanSym}</span>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 28px; font-weight: 900; color: #0f172a; line-height: 1;">${priceDisplay}</div>
                <div style="font-size: 13px; font-weight: 700; color: ${isBullish ? '#16a34a' : '#dc2626'}; margin-top: 4px;">
                  ${hasChange ? `${isBullish ? '+' : ''}${change.toFixed(2)} (${isBullish ? '+' : ''}${changePct.toFixed(2)}%) วันนี้` : '<span style="color:#94a3b8; font-weight:600;">ไม่มีข้อมูลราคาปิดก่อนหน้า</span>'}
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-bottom: 16px;">
              <span>ข้อมูล: ${dataTimeStr ? `อัปเดตล่าสุด ${dataTimeStr}` : 'ยังไม่มีข้อมูลราคา'}${priceSource ? ` · ${priceSource}` : ''}</span>
              <span>กำลังแสดงข้อมูล: ${cleanSym}</span>
            </div>

            <div id="chart-overlay-chips" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">${this.overlayChipsHtml()}</div>

            <div id="chart-viewport-box" style="height: 440px; min-height: 440px; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
              <div id="tradingview_chart_container" style="width: 100%; height: 100%; min-height: 440px;"></div>
            </div>

            <div style="font-size:11px; font-weight:700; color:#64748b; margin:10px 0 4px;">RSI (14)</div>
            <div id="rsi-viewport-box" style="height: 110px; min-height: 110px; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
              <div id="rsi_chart_container" style="width: 100%; height: 100%; min-height: 110px;"></div>
            </div>

            <div style="font-size:11px; font-weight:700; color:#64748b; margin:10px 0 4px;">MACD (12, 26, 9)</div>
            <div id="macd-viewport-box" style="height: 140px; min-height: 140px; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
              <div id="macd_chart_container" style="width: 100%; height: 100%; min-height: 140px;"></div>
            </div>

            <div id="chart-data-note" style="margin-top: 10px; font-size: 11.5px; color: #64748b; line-height: 1.6;"></div>
            <div id="chart-stats-strip" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px; margin-top:12px;"></div>
            <div id="chart-summary-banner" style="margin-top:12px;"></div>
            <div id="chart-links" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;"></div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
              <div style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Market Snapshot</div>
              <h2 style="margin: 4px 0 12px 0; font-size: 20px; font-weight: 900; color: #ea580c;">${cleanSym}</h2>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px;">
                <div style="font-size: 11px; color: #64748b;">ราคาล่าสุด</div>
                <div style="font-size: 22px; font-weight: 900; color: #0f172a;">${priceDisplay}</div>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 11px; color: #64748b;">สถานะ:</span>
                <span style="width: 10px; height: 10px; border-radius: 50%; background: ${hasChange ? (isBullish ? '#16a34a' : '#dc2626') : '#cbd5e1'}; display: inline-block;"></span>
                <strong style="font-size: 12.5px; color: ${hasChange ? (isBullish ? '#16a34a' : '#dc2626') : '#64748b'};">${hasChange ? (isBullish ? 'สินทรัพย์ (บวกวันนี้)' : 'ย่อตัววันนี้') : 'ยังไม่มีข้อมูลเปลี่ยนแปลงรายวัน'}</strong>
              </div>
            </div>

            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 10px;">แนวรับ / แนวต้าน</div>
              <div id="sr-panel-body">
              ${hasRange ? `
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px;">
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 8px 10px;">
                  <div style="font-size: 11px; font-weight: 700; color: #dc2626; margin-bottom: 4px;">แนวต้าน (Resistance)</div>
                  <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: #475569;"><span>R2:</span><b>${currencySign}${r2.toFixed(2)}</b></div>
                  <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: #475569;"><span>R1:</span><b>${currencySign}${r1.toFixed(2)}</b></div>
                </div>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 10px;">
                  <div style="font-size: 11px; font-weight: 700; color: #16a34a; margin-bottom: 4px;">แนวรับ (Support)</div>
                  <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: #475569;"><span>S1:</span><b>${currencySign}${s1.toFixed(2)}</b></div>
                  <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: #475569;"><span>S2:</span><b>${currencySign}${s2.toFixed(2)}</b></div>
                </div>
              </div>
              <div style="text-align: right; font-size: 11px; color: #64748b;">Pivot Point: ${currencySign}${pivot.toFixed(2)}</div>
              ` : `
              <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; font-size: 11.5px; color: #64748b; text-align: center; line-height: 1.6;">
                กำลังคำนวณแนวรับ-แนวต้านจากข้อมูลกราฟ…
              </div>
              `}
              </div>
            </div>

            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">สัญญาณเทคนิค</div>
              ${portStatusHtml}
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #64748b;">• โมเมนตัมวันนี้:</span>
                  <strong style="color: ${hasChange ? (isBullish ? '#16a34a' : '#dc2626') : '#94a3b8'};">${hasChange ? (isBullish ? 'แรงซื้อหนุน' : 'มีแรงเทขาย') : 'ไม่มีข้อมูล'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">• กรอบราคา High/Low:</span>
                  <strong style="color: #0f172a;">${hasRange ? `${currencySign}${low.toFixed(2)} - ${currencySign}${high.toFixed(2)}` : '—'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const analyzeBtn = container.querySelector('#btn-submit-analyze');
    const symbolInput = container.querySelector('#input-chart-symbol');
    const marketTypeSelect = container.querySelector('#select-chart-market-type');
    const rangeSelect = container.querySelector('#select-chart-timeframe');
    const styleSelect = container.querySelector('#select-chart-style');

    const triggerAnalyze = async () => {
      const raw = (symbolInput?.value || '').trim().toUpperCase();
      if (!raw) return;
      const mType = marketTypeSelect?.value || 'US';
      const clean = raw.replace(/\.BK$/i, '');

      this.currentChartSymbol = this.formatTradingViewSymbol(clean, mType);
      this.destroyOwnChart();

      if (analyzeBtn) {
        analyzeBtn.textContent = 'กำลังดึง...';
        analyzeBtn.disabled = true;
      }

      // ดึงราคาตลาดสดผ่าน API มาเก็บลง Quote Cache ก่อนเรนเดอร์หน้าจอ
      if (typeof QuoteSyncService !== 'undefined') {
        const qType = (mType === 'FUND') ? 'mutual-fund' : (mType === 'TH' ? 'thai-stock' : 'foreign-stock');
        try {
          await QuoteSyncService.syncSingleQuote(clean, qType);
        } catch (e) {
          console.warn('Sync quote error:', e);
        }
      }

      if (analyzeBtn) {
        analyzeBtn.textContent = 'วิเคราะห์';
        analyzeBtn.disabled = false;
      }

      this.render(container);
    };

    if (analyzeBtn) analyzeBtn.onclick = (e) => { e.preventDefault(); triggerAnalyze(); };
    if (symbolInput) {
      symbolInput.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); triggerAnalyze(); }
      };
    }

    const chartType = isFund ? 'FUND' : isThai ? 'TH' : 'US';

    this._chartContext = {
      chartType,
      currencySign,
      symbolLabel: cleanSym,
      decimals: isFund ? 4 : 2,
      avgCost: holdingMatch ? Number(isThai || isFund ? holdingMatch.avgCost : (holdingMatch.avgCostUSD || holdingMatch.avgCost)) || 0 : 0
    };

    this.bindOverlayChips(container, cleanSym, chartType);

    if (rangeSelect) {
      rangeSelect.onchange = () => {
        this.currentRange = rangeSelect.value;
        this.loadOwnChart(cleanSym, chartType);
      };
    }
    if (styleSelect) {
      styleSelect.onchange = () => {
        this.currentChartStyle = styleSelect.value;
        this.loadOwnChart(cleanSym, chartType);
      };
    }

    setTimeout(() => this.loadOwnChart(cleanSym, chartType), 150);
  },

  destroyOwnChart() {
    if (this._chartResize) {
      try { this._chartResize.disconnect(); } catch (e) {}
      this._chartResize = null;
    }
    if (this._chartInstance) {
      try { this._chartInstance.remove(); } catch (e) {}
      this._chartInstance = null;
    }
    this._subResizes.forEach((r) => { try { r.disconnect(); } catch (e) {} });
    this._subResizes = [];
    this._subCharts.forEach((c) => { try { c.remove(); } catch (e) {} });
    this._subCharts = [];
  },

  ensureLightweightCharts() {
    if (window.LightweightCharts) return Promise.resolve(window.LightweightCharts);
    if (this._lwPromise) return this._lwPromise;
    this._lwPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js';
      script.async = true;
      script.onload = () => resolve(window.LightweightCharts);
      script.onerror = () => reject(new Error('โหลดไลบรารีกราฟไม่สำเร็จ'));
      document.head.appendChild(script);
    });
    return this._lwPromise;
  },

  chartRangeParam(isFund) {
    const map = isFund
      ? { '1M': '1m', '6M': '6m', '1Y': '1y', '2Y': '2y', '5Y': '5y' }
      : { '1M': '1mo', '6M': '6mo', '1Y': '1y', '2Y': '2y', '5Y': '5y' };
    return map[this.currentRange] || (isFund ? '1y' : '2y');
  },

  chartLinksHtml(cleanSym, chartType) {
    const sym = encodeURIComponent(cleanSym);
    const linkStyle = 'display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; font-weight:700; font-size:12.5px; text-decoration:none;';
    if (chartType === 'FUND') {
      return `
        <a href="https://www.finnomena.com/fund/${sym}" target="_blank" style="${linkStyle} background:#0f766e; color:#fff;">📈 Finnomena ↗</a>
        <a href="https://www.settrade.com/th/mutualfund/quote/${sym}/overview" target="_blank" style="${linkStyle} background:#f1f5f9; color:#334155; border:1px solid #e2e8f0;">🏛️ Settrade ↗</a>
      `;
    }
    if (chartType === 'TH') {
      return `
        <a href="https://www.settrade.com/th/equities/quote/${sym}/overview" target="_blank" style="${linkStyle} background:#0284c7; color:#fff;">🏛️ Settrade ↗</a>
        <a href="https://th.tradingview.com/chart/?symbol=SET%3A${sym}" target="_blank" style="${linkStyle} background:#0f172a; color:#fff;">📈 TradingView ↗</a>
        <a href="https://www.finnomena.com/stock/${sym}" target="_blank" style="${linkStyle} background:#f0fdf4; color:#166534; border:1px solid #bbf7d0;">🌱 Finnomena ↗</a>
      `;
    }
    return `
      <a href="https://finance.yahoo.com/quote/${sym}" target="_blank" style="${linkStyle} background:#0284c7; color:#fff;">📊 Yahoo Finance ↗</a>
      <a href="https://www.tradingview.com/chart/?symbol=${sym}" target="_blank" style="${linkStyle} background:#0f172a; color:#fff;">📈 TradingView ↗</a>
    `;
  },

  sma(closes, period) {
    if (closes.length < period) return null;
    let sum = 0;
    for (let i = closes.length - period; i < closes.length; i++) sum += closes[i];
    return sum / period;
  },

  // ส่งค่ากลับมาเท่าจำนวนแท่ง (null ในช่วงที่ยังคำนวณไม่ได้) เพื่อวางบนกราฟได้ตรงเวลา
  emaSeries(values, period) {
    const out = new Array(values.length).fill(null);
    if (values.length < period) return out;
    const k = 2 / (period + 1);
    let seed = 0;
    for (let i = 0; i < period; i++) seed += values[i];
    let prev = seed / period;
    out[period - 1] = prev;
    for (let i = period; i < values.length; i++) {
      prev = values[i] * k + prev * (1 - k);
      out[i] = prev;
    }
    return out;
  },

  rsiSeries(closes, period = 14) {
    const out = new Array(closes.length).fill(null);
    if (closes.length <= period) return out;
    let gain = 0, loss = 0;
    for (let i = 1; i <= period; i++) {
      const d = closes[i] - closes[i - 1];
      gain += Math.max(d, 0);
      loss += Math.max(-d, 0);
    }
    gain /= period;
    loss /= period;
    out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    for (let i = period + 1; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      gain = (gain * (period - 1) + Math.max(d, 0)) / period;
      loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
      out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    }
    return out;
  },

  macdSeries(closes, fast = 12, slow = 26, signalPeriod = 9) {
    const fastEma = this.emaSeries(closes, fast);
    const slowEma = this.emaSeries(closes, slow);
    const line = closes.map((_, i) => (fastEma[i] === null || slowEma[i] === null) ? null : fastEma[i] - slowEma[i]);
    const packed = line.filter((v) => v !== null);
    const sigPacked = this.emaSeries(packed, signalPeriod);
    const signal = new Array(closes.length).fill(null);
    const hist = new Array(closes.length).fill(null);
    let j = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === null) continue;
      signal[i] = sigPacked[j];
      hist[i] = sigPacked[j] === null ? null : line[i] - sigPacked[j];
      j++;
    }
    return { line, signal, hist };
  },

  fibLevels(high, low) {
    const gap = high - low;
    if (!(gap > 0)) return [];
    return [0.236, 0.382, 0.5, 0.618, 0.786].map((r) => ({ ratio: r, price: high - gap * r }));
  },

  computeChartStats(points, context) {
    const isFund = context.chartType === 'FUND';
    const val = (p) => Number(isFund ? p.value : p.close);
    const closes = points.map(val).filter(Number.isFinite);
    if (!closes.length) return null;
    const last = closes[closes.length - 1];
    const window = points.slice(-252);
    const highs = window.map((p) => Number(isFund ? p.value : p.high)).filter(Number.isFinite);
    const lows = window.map((p) => Number(isFund ? p.value : p.low)).filter(Number.isFinite);
    const high52 = Math.max(...highs);
    const low52 = Math.min(...lows);

    const rets = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i - 1] > 0) rets.push(closes[i] / closes[i - 1] - 1);
    }
    let vol = null;
    if (rets.length > 20) {
      const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
      const varSum = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1);
      vol = Math.sqrt(varSum) * Math.sqrt(252) * 100;
    }

    const volumes = points.map((p) => Number(p.volume)).filter((v) => Number.isFinite(v) && v > 0);
    const recentVol = volumes.slice(-30);
    const avgVol = recentVol.length ? recentVol.reduce((s, v) => s + v, 0) / recentVol.length : null;
    const lastVol = volumes.length ? volumes[volumes.length - 1] : null;

    const ema = (period) => {
      const s = this.emaSeries(closes, period);
      return s[s.length - 1];
    };
    const rsiArr = this.rsiSeries(closes, 14);
    const macd = this.macdSeries(closes);
    const lastIdx = closes.length - 1;
    const prevHistIdx = (() => {
      for (let i = lastIdx - 1; i >= 0; i--) if (macd.hist[i] !== null) return i;
      return null;
    })();

    return {
      last,
      high52,
      low52,
      windowLabel: window.length >= 252 ? '52 สัปดาห์' : `${window.length} วันทำการ`,
      pctFromHigh: high52 > 0 ? ((last - high52) / high52) * 100 : null,
      pctFromLow: low52 > 0 ? ((last - low52) / low52) * 100 : null,
      ema20: ema(20),
      ema50: ema(50),
      ema200: ema(200),
      rsi: rsiArr[lastIdx],
      macdLine: macd.line[lastIdx],
      macdSignal: macd.signal[lastIdx],
      macdHist: macd.hist[lastIdx],
      macdHistPrev: prevHistIdx === null ? null : macd.hist[prevHistIdx],
      avgVol,
      avgVolDays: recentVol.length,
      lastVol,
      volatility: vol,
      hasEnoughForEma200: ema(200) !== null
    };
  },

  // คำนวณแนวรับ-แนวต้านจากชุด OHLC ที่โหลดมาจริง เพราะ quote รายวันมักไม่มี High/Low ของ ETF ต่างประเทศ
  computePriceLevels(points, context) {
    const isFund = context.chartType === 'FUND';
    const closes = points.map((p) => Number(isFund ? p.value : p.close)).filter((v) => Number.isFinite(v));
    if (!closes.length) return null;
    const last = closes[closes.length - 1];
    const levels = [];
    // onChart=false แสดงเฉพาะในแผงด้านขวา เพราะเส้นที่ห่างมากจะทำให้สเกลราคาบีบจนแท่งเทียนอ่านยาก
    const push = (key, title, price, color, dashed, onChart = true) => {
      if (Number.isFinite(price) && price > 0) levels.push({ key, title, price, color, dashed: !!dashed, onChart });
    };

    if (!isFund) {
      const bar = points[points.length - 1];
      const h = Number(bar.high), l = Number(bar.low), c = Number(bar.close);
      if ([h, l, c].every(Number.isFinite) && h > 0 && h >= l) {
        const pivot = (h + l + c) / 3;
        push('P', `Pivot`, pivot, '#64748b', false);
        push('R1', 'R1', 2 * pivot - l, '#dc2626', false);
        push('S1', 'S1', 2 * pivot - h, '#16a34a', false);
        push('R2', 'R2', pivot + (h - l), '#fca5a5', false, false);
        push('S2', 'S2', pivot - (h - l), '#86efac', false, false);
      }
    }

    const sma20 = this.sma(closes, 20);
    const sma50 = this.sma(closes, 50);
    push('SMA20', 'SMA 20', sma20, '#f59e0b', true);
    push('SMA50', 'SMA 50', sma50, '#7c3aed', true);

    const highs = points.map((p) => Number(isFund ? p.value : p.high)).filter(Number.isFinite);
    const lows = points.map((p) => Number(isFund ? p.value : p.low)).filter(Number.isFinite);
    push('RH', `${context.rangeLabel} สูงสุด`, Math.max(...highs), '#0ea5e9', false, false);
    push('RL', `${context.rangeLabel} ต่ำสุด`, Math.min(...lows), '#0ea5e9', false, false);

    if (context.avgCost > 0) push('COST', 'ทุนเฉลี่ย', context.avgCost, '#0f766e', true);

    const above = levels.filter((x) => x.price > last * 1.0005).sort((a, b) => a.price - b.price);
    const below = levels.filter((x) => x.price < last * 0.9995).sort((a, b) => b.price - a.price);
    return { levels, last, nearestResistance: above[0] || null, nearestSupport: below[0] || null };
  },

  srPanelHtml(info, context) {
    const fmt = (v) => `${context.currencySign}${v.toFixed(context.decimals)}`;
    const dist = (price) => ((price - info.last) / info.last) * 100;
    const row = (x) => {
      const pct = dist(x.price);
      const color = x.price >= info.last ? '#dc2626' : '#16a34a';
      return `<div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; padding:3px 0; border-bottom:1px dashed #f1f5f9;">
        <span style="color:#475569;"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${x.color};margin-right:6px;vertical-align:middle;"></span>${x.title}</span>
        <span style="text-align:right;"><b style="color:#0f172a;">${fmt(x.price)}</b> <span style="color:${color};">(${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)</span></span>
      </div>`;
    };
    const box = (label, x, tone) => `
      <div style="background:${tone.bg}; border:1px solid ${tone.border}; border-radius:8px; padding:8px 10px;">
        <div style="font-size:11px; font-weight:700; color:${tone.text}; margin-bottom:2px;">${label}</div>
        <div style="font-size:16px; font-weight:900; color:#0f172a;">${x ? fmt(x.price) : '—'}</div>
        <div style="font-size:11px; color:#64748b;">${x ? `${x.title} · ${dist(x.price) >= 0 ? '+' : ''}${dist(x.price).toFixed(2)}%จากราคาล่าสุด` : 'นอกกรอบที่เลือก'}</div>
      </div>`;
    const sorted = [...info.levels].sort((a, b) => b.price - a.price).map(row).join('');
    return `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
        ${box('แนวต้านใกล้สุด', info.nearestResistance, { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' })}
        ${box('แนวรับใกล้สุด', info.nearestSupport, { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' })}
      </div>
      ${sorted}
      <div style="margin-top:8px; font-size:10.5px; color:#94a3b8; line-height:1.6;">
        คำนวณจากข้อมูลกราฟ ${context.rangeLabel} · Pivot จากแท่งล่าสุด · SMA 20/50 · เปรียบเทียบราคาล่าสุด ${fmt(info.last)}
      </div>`;
  },

  renderSrPanel(info, context) {
    const host = document.getElementById('sr-panel-body');
    if (!host) return;
    if (!info || !info.levels.length) {
      host.innerHTML = `<div style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px; padding:12px; font-size:11.5px; color:#64748b; text-align:center; line-height:1.6;">โหลดกราฟไม่สำเร็จ<br>จึงยังคำนวณแนวรับ-แนวต้านไม่ได้</div>`;
      return;
    }
    host.innerHTML = this.srPanelHtml(info, context);
  },

  drawPriceLevels(LW, series, points, context, precomputed) {
    const info = precomputed || this.computePriceLevels(points, context);
    if (!info || !series || typeof series.createPriceLine !== 'function') return info;
    // ระดับที่ชิดกันเกินกว่า 0.2% ป้ายบนแกนราคาจะทับกันจนอ่านไม่ออก จึงเว้นเส้นที่ซ้ำโซนไว้ (แผงขวายังแสดงครบทุกตัว)
    const MIN_GAP = 0.002;
    const kept = [];
    info.levels.filter((x) => x.onChart).forEach((x) => {
      if (kept.some((p) => Math.abs(p - x.price) / Math.max(p, x.price) < MIN_GAP)) return;
      kept.push(x.price);
      series.createPriceLine({
        price: x.price,
        color: x.color,
        lineWidth: 1,
        lineStyle: x.dashed ? LW.LineStyle.Dashed : LW.LineStyle.Solid,
        axisLabelVisible: true,
        title: x.key
      });
    });
    info.drawnCount = kept.length;
    return info;
  },

  overlayChipsHtml() {
    const defs = [
      { key: 'ema20', label: 'EMA 20' },
      { key: 'ema50', label: 'EMA 50' },
      { key: 'ema200', label: 'EMA 200' },
      { key: 'volume', label: 'Volume' },
      { key: 'sr', label: 'แนวรับ-แนวต้าน' },
      { key: 'fib', label: 'Fibonacci' }
    ];
    return defs.map((d) => {
      const on = !!this.chartOverlays[d.key];
      return `<button data-overlay="${d.key}" style="padding:5px 11px; border-radius:999px; font-size:11.5px; font-weight:700; cursor:pointer; border:1.5px solid ${on ? '#0f172a' : '#cbd5e1'}; background:${on ? '#0f172a' : '#fff'}; color:${on ? '#fff' : '#64748b'};">${d.label}</button>`;
    }).join('');
  },

  bindOverlayChips(container, cleanSym, chartType) {
    container.querySelectorAll('#chart-overlay-chips button').forEach((btn) => {
      btn.onclick = () => {
        const key = btn.getAttribute('data-overlay');
        this.chartOverlays[key] = !this.chartOverlays[key];
        const host = container.querySelector('#chart-overlay-chips');
        if (host) {
          host.innerHTML = this.overlayChipsHtml();
          this.bindOverlayChips(container, cleanSym, chartType);
        }
        this.loadOwnChart(cleanSym, chartType);
      };
    });
  },

  subChartOptions(LW, host) {
    return {
      width: host.clientWidth || 800,
      height: host.clientHeight || 120,
      layout: { background: { type: 'solid', color: '#ffffff' }, textColor: '#94a3b8', fontSize: 10 },
      grid: { vertLines: { color: '#f8fafc' }, horzLines: { color: '#f1f5f9' } },
      rightPriceScale: { borderColor: '#e2e8f0', scaleMargins: { top: 0.15, bottom: 0.12 } },
      timeScale: { borderColor: '#e2e8f0', rightOffset: 4 },
      crosshair: { mode: LW.CrosshairMode.Normal },
      handleScroll: false,
      handleScale: false,
      localization: { locale: 'th-TH' }
    };
  },

  statsStripHtml(stats, context) {
    if (!stats) return '';
    const fmtPrice = (v) => (Number.isFinite(v) ? `${context.currencySign}${v.toFixed(context.decimals)}` : '—');
    const fmtVol = (v) => {
      if (!Number.isFinite(v)) return '—';
      if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
      if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
      if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
      return String(Math.round(v));
    };
    const tile = (label, value, sub, color) => `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px;">
        <div style="font-size:10.5px; color:#64748b; margin-bottom:3px;">${label}</div>
        <div style="font-size:16px; font-weight:900; color:${color || '#0f172a'}; line-height:1.1;">${value}</div>
        <div style="font-size:10.5px; color:#94a3b8; margin-top:2px;">${sub || ''}</div>
      </div>`;
    const trendColor = (v) => (v === null ? '#94a3b8' : v >= 0 ? '#16a34a' : '#dc2626');
    const rsiColor = (r) => (r === null || r === undefined ? '#94a3b8' : r >= 70 ? '#dc2626' : r <= 30 ? '#16a34a' : '#0f172a');
    const volRatio = stats.avgVol && stats.lastVol ? stats.lastVol / stats.avgVol : null;

    return [
      tile(`สูงสุด ${stats.windowLabel}`, fmtPrice(stats.high52), stats.pctFromHigh === null ? '' : `ห่าง ${stats.pctFromHigh.toFixed(2)}%`, trendColor(stats.pctFromHigh)),
      tile(`ต่ำสุด ${stats.windowLabel}`, fmtPrice(stats.low52), stats.pctFromLow === null ? '' : `ห่าง +${stats.pctFromLow.toFixed(2)}%`, '#16a34a'),
      tile('RSI 14 วัน', Number.isFinite(stats.rsi) ? stats.rsi.toFixed(1) : '—', stats.rsi === null || stats.rsi === undefined ? 'ข้อมูลไม่พอ' : stats.rsi >= 70 ? 'ซื้อมากเกินไป' : stats.rsi <= 30 ? 'ขายมากเกินไป' : 'กลาง ๆ', rsiColor(stats.rsi)),
      tile('MACD Hist', Number.isFinite(stats.macdHist) ? stats.macdHist.toFixed(3) : '—', stats.macdHist === null || stats.macdHist === undefined ? 'ข้อมูลไม่พอ' : (stats.macdHist >= 0 ? 'ฝั่งบวก' : 'ฝั่งลบ'), trendColor(stats.macdHist)),
      tile('ปริมาณซื้อขาย', volRatio === null ? '—' : `${volRatio.toFixed(2)}x`, volRatio === null ? 'ไม่มีข้อมูล Volume' : `เทียบเฉลี่ย ${stats.avgVolDays} วัน (${fmtVol(stats.avgVol)})`, trendColor(volRatio === null ? 0 : volRatio - 1)),
      tile('ความผันผวนต่อปี', Number.isFinite(stats.volatility) ? `${stats.volatility.toFixed(1)}%` : '—', 'คำนวณจากผลตอบแทนรายวัน', '#0f172a')
    ].join('');
  },

  // สรุปแบบกฎตายตัวจากค่าอินดิเคเตอร์ (ไม่มี LLM) — เรียงจากแนวโน้ม โมเมนตัม แล้วถึงระดับราคา
  summaryBannerHtml(stats, levelInfo, context) {
    if (!stats) return '';
    const above = (ref) => (Number.isFinite(ref) ? stats.last >= ref : null);
    const points = [];
    let score = 0;

    const e50 = above(stats.ema50);
    const e200 = above(stats.ema200);
    if (e50 !== null && e200 !== null) {
      const gold = stats.ema50 > stats.ema200;
      points.push({ text: `ราคา${stats.last >= stats.ema50 ? 'ยืนเหนือ' : 'หลุดใต้'} EMA50 และ${gold ? ' EMA50 อยู่เหนือ EMA200 (Golden Zone)' : ' EMA50 อยู่ใต้ EMA200 (Death Zone)'}`, vote: (e50 ? 1 : -1) + (e200 ? 1 : -1) });
    } else if (e50 !== null) {
      points.push({ text: `ราคา${e50 ? 'ยืนเหนือ' : 'หลุดใต้'} EMA50`, vote: e50 ? 1 : -1 });
    }

    if (Number.isFinite(stats.rsi)) {
      if (stats.rsi >= 70) points.push({ text: `RSI ${stats.rsi.toFixed(1)} เข้าเขตซื้อมากเกินไป มีโอกาสพักฐานระยะสั้น`, vote: -1 });
      else if (stats.rsi <= 30) points.push({ text: `RSI ${stats.rsi.toFixed(1)} เข้าเขตขายมากเกินไป เริ่มน่าจับตาสำหรับรีบาวด์`, vote: 1 });
      else points.push({ text: `RSI ${stats.rsi.toFixed(1)} ยังอยู่โซนกลาง ๆ ไม่มีสัญญาณ extremes`, vote: stats.rsi >= 50 ? 1 : -1 });
    }

    if (Number.isFinite(stats.macdHist) && Number.isFinite(stats.macdHistPrev)) {
      const rising = stats.macdHist > stats.macdHistPrev;
      const phrase = stats.macdHist >= 0
        ? (rising ? 'เป็นบวกและขยายขึ้น โมเมนตัมฝั่งซื้อยังหนุน' : 'เป็นบวกแต่เริ่มอ่อนแรง')
        : (rising ? 'เป็นลบแต่หดตัวเข้าหาฝั่งบวก แรงขายเริ่มเบาลง' : 'เป็นลบและลึกลง แรงขายยังกดดัน');
      points.push({ text: `MACD Histogram ${phrase}`, vote: stats.macdHist >= 0 ? 1 : -1 });
    }

    if (Number.isFinite(stats.pctFromHigh)) {
      points.push({ text: `ราคายังห่างจุดสูงสุด ${stats.windowLabel} อยู่ ${Math.abs(stats.pctFromHigh).toFixed(2)}%`, vote: stats.pctFromHigh > -5 ? 1 : -1 });
    }

    const nearest = [];
    if (levelInfo && levelInfo.nearestResistance) nearest.push(`แนวต้านถัดไป ${context.currencySign}${levelInfo.nearestResistance.price.toFixed(context.decimals)} (${levelInfo.nearestResistance.title})`);
    if (levelInfo && levelInfo.nearestSupport) nearest.push(`แนวรับถัดไป ${context.currencySign}${levelInfo.nearestSupport.price.toFixed(context.decimals)} (${levelInfo.nearestSupport.title})`);

    const tone = score + points.reduce((s, p) => s + p.vote, 0);
    const verdict = tone >= 2 ? { label: 'มุมมองเชิงบวก', bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' }
      : tone <= -2 ? { label: 'มุมมองระวังตัว', bg: '#fef2f2', border: '#fecaca', text: '#991b1b' }
      : { label: 'ยังแกว่งออกข้าง', bg: '#f8fafc', border: '#cbd5e1', text: '#334155' };

    return `
      <div style="background:${verdict.bg}; border:1.5px solid ${verdict.border}; border-radius:10px; padding:12px 14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px; flex-wrap:wrap;">
          <span style="font-size:12.5px; font-weight:900; color:${verdict.text};">🧭 สรุปสัญญาณเทคนิค · ${context.symbolLabel || ''}</span>
          <span style="font-size:11px; color:${verdict.text}; font-weight:700;">${verdict.label}</span>
        </div>
        <ul style="margin:0; padding-left:18px; font-size:12px; color:#334155; line-height:1.75;">
          ${points.map((p) => `<li>${p.text}</li>`).join('')}
          ${nearest.length ? `<li>${nearest.join(' · ')}</li>` : ''}
        </ul>
        <div style="margin-top:6px; font-size:10.5px; color:#94a3b8;">คำนวณจากกฎตายตัวบนข้อมูลกราฟนี้เท่านั้น ไม่ใช่คำแนะนำการลงทุน</div>
      </div>`;
  },

  async loadOwnChart(cleanSym, chartType) {
    const host = document.getElementById('tradingview_chart_container');
    if (!host) return;
    const isFund = chartType === 'FUND';
    const isThai = chartType === 'TH';
    const srContext = Object.assign({}, this._chartContext, {
      chartType: chartType || 'US',
      rangeLabel: this.currentRange,
      currencySign: (this._chartContext && this._chartContext.currencySign) || (isFund || isThai ? '฿' : '$'),
      decimals: (this._chartContext && this._chartContext.decimals) || (isFund ? 4 : 2)
    });
    const noteEl = document.getElementById('chart-data-note');
    const linksEl = document.getElementById('chart-links');
    const rsiHost = document.getElementById('rsi_chart_container');
    const macdHost = document.getElementById('macd_chart_container');
    const statsEl = document.getElementById('chart-stats-strip');
    const bannerEl = document.getElementById('chart-summary-banner');
    const apiBase = (typeof QuoteSyncService !== 'undefined' && QuoteSyncService.getApiBaseUrl)
      ? QuoteSyncService.getApiBaseUrl()
      : 'https://wealthport.onrender.com';

    this.destroyOwnChart();
    host.innerHTML = '<div style="height:100%; min-height:440px; display:flex; align-items:center; justify-content:center; color:#64748b; font-size:13.5px; font-weight:600;">กำลังโหลดกราฟ…</div>';
    if (rsiHost) rsiHost.innerHTML = '';
    if (macdHost) macdHost.innerHTML = '';
    if (statsEl) statsEl.innerHTML = '';
    if (bannerEl) bannerEl.innerHTML = '';
    if (noteEl) noteEl.textContent = '';
    if (linksEl) linksEl.innerHTML = this.chartLinksHtml(cleanSym, chartType);

    const showError = (message) => {
      host.innerHTML = '';
      if (rsiHost) rsiHost.innerHTML = '';
      if (macdHost) macdHost.innerHTML = '';
      if (statsEl) statsEl.innerHTML = '';
      if (bannerEl) bannerEl.innerHTML = '';
      const box = document.createElement('div');
      box.style.cssText = 'height:100%; min-height:560px; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; text-align:center; gap:8px;';
      const icon = document.createElement('div');
      icon.textContent = '📉';
      icon.style.cssText = 'font-size:36px;';
      const title = document.createElement('div');
      title.textContent = 'ยังแสดงกราฟไม่ได้';
      title.style.cssText = 'font-size:16px; font-weight:800; color:#0f172a;';
      const detail = document.createElement('div');
      detail.textContent = message;
      detail.style.cssText = 'font-size:12.5px; color:#64748b; max-width:460px; line-height:1.6;';
      box.append(icon, title, detail);
      host.appendChild(box);
    };

    const url = isFund
      ? `${apiBase}/api/fund-chart?symbol=${encodeURIComponent(cleanSym)}&range=${this.chartRangeParam(true)}`
      : `${apiBase}/api/chart?symbol=${encodeURIComponent(isThai ? `${cleanSym}.BK` : cleanSym)}&assetType=${isThai ? 'thai-stock' : 'foreign-stock'}&range=${this.chartRangeParam(false)}&interval=1d`;

    const requestChart = async () => {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        return await res.json();
      } finally {
        clearTimeout(tid);
      }
    };

    const toPoints = (data) => {
      const byTime = new Map();
      (Array.isArray(data?.points) ? data.points : []).forEach((p) => {
        const time = String(p.time || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(time)) return;
        if (isFund) {
          const value = Number(p.value);
          if (Number.isFinite(value) && value > 0) byTime.set(time, { time, value });
        } else {
          const open = Number(p.open);
          const high = Number(p.high);
          const low = Number(p.low);
          const close = Number(p.close);
          if ([open, high, low, close].every(Number.isFinite)) {
            byTime.set(time, { time, open, high, low, close, volume: Number(p.volume) || 0 });
          }
        }
      });
      return Array.from(byTime.values()).sort((a, b) => a.time.localeCompare(b.time));
    };

    try {
      // แคชสั้น ๆ เพื่อให้การเปิด/ปิดเส้น overlay หรือเปลี่ยนรูปแบบกราฟ ไม่ไปเรียก Yahoo ซ้ำจนโดน limit
      const CACHE_MS = 5 * 60 * 1000;
      let data = null;
      let points = null;
      if (this._chartCache && this._chartCache.url === url && Date.now() - this._chartCache.at < CACHE_MS) {
        data = this._chartCache.data;
        points = this._chartCache.points;
      } else {
        data = await requestChart();
        points = toPoints(data);
        // Yahoo ตอบ 429 เป็นครั้งคราว ลองซ้ำอีกครั้งก่อนแจ้งผู้ใช้
        if (!points.length) {
          await new Promise((r) => setTimeout(r, 1200));
          data = await requestChart();
          points = toPoints(data);
        }
        if (points.length) this._chartCache = { url, at: Date.now(), data, points };
      }
      if (!points.length) {
        const detail = String(data?.detail || '');
        this.renderSrPanel(null, srContext);
        showError(/429/.test(detail)
          ? 'แหล่งข้อมูลจำกัดจำนวนการเรียก (429) กรุณากด "วิเคราะห์" ซ้ำอีกครั้ง'
          : (data?.error || 'แหล่งข้อมูลไม่ส่งข้อมูลกราฟกลับมา'));
        return;
      }

      const LW = await this.ensureLightweightCharts();
      host.innerHTML = '';

      const showVolume = this.chartOverlays.volume && !isFund && points.some((p) => Number(p.volume) > 0);
      const chart = LW.createChart(host, {
        width: host.clientWidth || 800,
        height: host.clientHeight || 440,
        layout: { background: { type: 'solid', color: '#ffffff' }, textColor: '#475569', fontSize: 11 },
        grid: { vertLines: { color: '#f1f5f9' }, horzLines: { color: '#f1f5f9' } },
        rightPriceScale: { borderColor: '#e2e8f0', scaleMargins: { top: 0.06, bottom: showVolume ? 0.24 : 0.08 } },
        // อย่าซ่อนแกนเวลาของกราฟหลัก: lightweight-charts v4 จะไม่ยอมทำ fitContent/setVisibleLogicalRange ให้ขณะ visible=false
        timeScale: { borderColor: '#e2e8f0', rightOffset: 4 },
        crosshair: { mode: LW.CrosshairMode.Normal },
        localization: { locale: 'th-TH' }
      });

      const times = points.map((p) => p.time);
      const closes = points.map((p) => (isFund ? p.value : p.close));
      const toLine = (arr) => arr.map((v, i) => (Number.isFinite(v) ? { time: times[i], value: v } : null)).filter(Boolean);

      const style = (isFund && this.currentChartStyle === 'candles') ? 'area' : this.currentChartStyle;
      let mainSeries = null;
      if (style === 'candles') {
        mainSeries = chart.addCandlestickSeries({
          upColor: '#16a34a', downColor: '#dc2626',
          wickUpColor: '#16a34a', wickDownColor: '#dc2626',
          borderVisible: false
        });
        mainSeries.setData(points);
      } else {
        if (style === 'line') {
          mainSeries = chart.addLineSeries({ color: '#0284c7', lineWidth: 2, priceLineVisible: false });
        } else {
          mainSeries = chart.addAreaSeries({
            lineColor: '#0284c7', lineWidth: 2,
            topColor: 'rgba(2,132,199,0.28)', bottomColor: 'rgba(2,132,199,0.02)',
            priceLineVisible: false
          });
        }
        mainSeries.setData(toLine(closes));
      }

      const addEma = (period, color, key) => {
        if (!this.chartOverlays[key] || points.length < period) return;
        chart.addLineSeries({
          color, lineWidth: 1.6, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false
        }).setData(toLine(this.emaSeries(closes, period)));
      };
      addEma(20, '#f59e0b', 'ema20');
      addEma(50, '#0284c7', 'ema50');
      addEma(200, '#7c3aed', 'ema200');

      if (showVolume) {
        const volSeries = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'volume-pane' });
        chart.priceScale('volume-pane').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        volSeries.setData(points
          .filter((p) => Number(p.volume) > 0)
          .map((p) => ({ time: p.time, value: p.volume, color: p.close >= p.open ? 'rgba(22,163,74,0.45)' : 'rgba(220,38,38,0.45)' })));
      }

      const levelInfo = this.computePriceLevels(points, srContext);
      if (this.chartOverlays.sr) this.drawPriceLevels(LW, mainSeries, points, srContext, levelInfo);
      if (this.chartOverlays.fib) {
        const highs = points.map((p) => Number(isFund ? p.value : p.high)).filter(Number.isFinite);
        const lows = points.map((p) => Number(isFund ? p.value : p.low)).filter(Number.isFinite);
        this.fibLevels(Math.max(...highs), Math.min(...lows)).forEach((f) => {
          mainSeries.createPriceLine({
            price: f.price,
            color: '#0ea5e9',
            lineWidth: 1,
            lineStyle: LW.LineStyle.Dotted,
            axisLabelVisible: true,
            title: `Fib ${(f.ratio * 100).toFixed(1)}%`
          });
        });
      }
      this.renderSrPanel(levelInfo, srContext);

      const subCharts = [];
      let rsiChart = null;
      let macdChart = null;
      const panelNote = (el, text) => {
        el.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:11.5px; text-align:center; padding:0 12px;">${text}</div>`;
      };
      const rsiArr = this.rsiSeries(closes, 14);
      if (rsiHost) {
        rsiHost.innerHTML = '';
        if (rsiArr.filter((v) => Number.isFinite(v)).length < 5) {
          panelNote(rsiHost, `ช่วงเวลานี้มีข้อมูล ${points.length} วัน ไม่พอสำหรับ RSI 14`);
        } else {
          rsiChart = LW.createChart(rsiHost, this.subChartOptions(LW, rsiHost));
          rsiChart.timeScale().applyOptions({ visible: false });
          const rsiLine = rsiChart.addLineSeries({ color: '#7c3aed', lineWidth: 1.5, priceLineVisible: false });
          rsiLine.setData(toLine(rsiArr));
          [30, 70].forEach((lvl) => rsiLine.createPriceLine({
            price: lvl, color: '#cbd5e1', lineWidth: 1, lineStyle: LW.LineStyle.Dashed, axisLabelVisible: true, title: String(lvl)
          }));
          subCharts.push(rsiChart);
        }
      }

      const macdArr = this.macdSeries(closes);
      if (macdHost) {
        macdHost.innerHTML = '';
        if (macdArr.hist.filter((v) => Number.isFinite(v)).length < 5) {
          panelNote(macdHost, `ช่วงเวลานี้มีข้อมูล ${points.length} วัน ไม่พอสำหรับ MACD (12,26,9) ซึ่งต้องใช้อย่างน้อย 34 วัน`);
        } else {
          macdChart = LW.createChart(macdHost, this.subChartOptions(LW, macdHost));
          macdChart.addHistogramSeries({ priceFormat: { type: 'price', precision: 3, minMove: 0.001 } }).setData(
            macdArr.hist.map((v, i) => (Number.isFinite(v) ? { time: times[i], value: v, color: v >= 0 ? 'rgba(22,163,74,0.5)' : 'rgba(220,38,38,0.5)' } : null)).filter(Boolean)
          );
          const macdLine = macdChart.addLineSeries({ color: '#0284c7', lineWidth: 1.5, priceLineVisible: false });
          macdLine.setData(toLine(macdArr.line));
          macdChart.addLineSeries({ color: '#f59e0b', lineWidth: 1.2, priceLineVisible: false }).setData(toLine(macdArr.signal));
          macdLine.createPriceLine({ price: 0, color: '#e2e8f0', lineWidth: 1, lineStyle: LW.LineStyle.Solid, axisLabelVisible: false, title: '' });
          subCharts.push(macdChart);
        }
      }

      // ซิงก์ด้วย "ช่วงเวลา" ไม่ใช่ logical index เพราะ RSI เริ่มแท่งที่ 15 และ MACD ที่ 35 ถ้าใช้ index จะเหลื่อมกัน
      let syncing = false;
      const applyRangeToSubs = () => {
        const range = chart.timeScale().getVisibleRange();
        if (!range || !range.from) return;
        syncing = true;
        subCharts.forEach((other) => {
          try { other.timeScale().setVisibleRange(range); } catch (e) {}
        });
        syncing = false;
      };
      chart.timeScale().subscribeVisibleTimeRangeChange(() => {
        if (!syncing) applyRangeToSubs();
      });

      chart.timeScale().fitContent();
      applyRangeToSubs();
      this._chartInstance = chart;
      this._subCharts = subCharts;
      const observe = (el, target) => {
        const ro = new ResizeObserver(() => {
          if (!el.isConnected) return;
          target.applyOptions({ width: el.clientWidth, height: el.clientHeight });
        });
        ro.observe(el);
        return ro;
      };
      this._chartResize = observe(host, chart);
      if (rsiChart) this._subResizes.push(observe(rsiHost, rsiChart));
      if (macdChart) this._subResizes.push(observe(macdHost, macdChart));

      const stats = this.computeChartStats(points, srContext);
      if (statsEl) statsEl.innerHTML = this.statsStripHtml(stats, srContext);
      if (bannerEl) bannerEl.innerHTML = this.summaryBannerHtml(stats, levelInfo, srContext);

      const lastPoint = points[points.length - 1];
      if (noteEl) {
        const parts = [
          isFund ? 'NAV รายวันจาก Settrade' : `ราคาจาก ${data.source || 'Yahoo Finance'}`,
          `${points.length} ${isFund ? 'จุด' : 'วันทำการ'}`,
          `ถึง ${lastPoint.time}`
        ];
        if (isFund && this.currentChartStyle === 'candles') parts.push('กองทุนมีเฉพาะ NAV รายวัน จึงแสดงเป็นกราฟพื้นที่');
        if (isFund && data.truncated) parts.push(`แหล่งข้อมูลมีข้อมูลย้อนหลังตั้งแต่ ${data.availableFrom}`);
        if (levelInfo && levelInfo.drawnCount) parts.push(`วาดเส้นแนวรับ-แนวต้าน ${levelInfo.drawnCount} ระดับบนกราฟ`);
        if (points.length < 200) parts.push('ข้อมูลน้อยกว่า 200 วัน จึงยังไม่แสดง EMA 200');
        noteEl.textContent = parts.join(' · ');
      }
    } catch (err) {
      this.renderSrPanel(null, srContext);
      showError(err.name === 'AbortError' ? 'หมดเวลารอข้อมูลกราฟ (15 วินาที)' : err.message);
    }
  }
};