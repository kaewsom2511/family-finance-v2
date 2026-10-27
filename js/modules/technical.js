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

            <div id="chart-viewport-box" style="height: 580px; min-height: 580px; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
              <div id="tradingview_chart_container" style="width: 100%; height: 100%; min-height: 580px;"></div>
            </div>

            <div id="chart-data-note" style="margin-top: 10px; font-size: 11.5px; color: #64748b; line-height: 1.6;"></div>
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
      decimals: isFund ? 4 : 2,
      avgCost: holdingMatch ? Number(isThai || isFund ? holdingMatch.avgCost : (holdingMatch.avgCostUSD || holdingMatch.avgCost)) || 0 : 0
    };

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

  drawPriceLevels(LW, series, points, context) {
    const info = this.computePriceLevels(points, context);
    if (!info || !series || typeof series.createPriceLine !== 'function') return info;
    info.levels.filter((x) => x.onChart).forEach((x) => {
      series.createPriceLine({
        price: x.price,
        color: x.color,
        lineWidth: 1,
        lineStyle: x.dashed ? LW.LineStyle.Dashed : LW.LineStyle.Solid,
        axisLabelVisible: true,
        title: x.key
      });
    });
    return info;
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
    const apiBase = (typeof QuoteSyncService !== 'undefined' && QuoteSyncService.getApiBaseUrl)
      ? QuoteSyncService.getApiBaseUrl()
      : 'https://wealthport.onrender.com';

    this.destroyOwnChart();
    host.innerHTML = '<div style="height:100%; min-height:560px; display:flex; align-items:center; justify-content:center; color:#64748b; font-size:13.5px; font-weight:600;">กำลังโหลดกราฟ…</div>';
    if (noteEl) noteEl.textContent = '';
    if (linksEl) linksEl.innerHTML = this.chartLinksHtml(cleanSym, chartType);

    const showError = (message) => {
      host.innerHTML = '';
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
          if ([open, high, low, close].every(Number.isFinite)) byTime.set(time, { time, open, high, low, close });
        }
      });
      return Array.from(byTime.values()).sort((a, b) => a.time.localeCompare(b.time));
    };

    try {
      let data = await requestChart();
      let points = toPoints(data);
      // Yahoo ตอบ 429 เป็นครั้งคราว ลองซ้ำอีกครั้งก่อนแจ้งผู้ใช้
      if (!points.length) {
        await new Promise((r) => setTimeout(r, 1200));
        data = await requestChart();
        points = toPoints(data);
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

      const chart = LW.createChart(host, {
        width: host.clientWidth || 800,
        height: host.clientHeight || 560,
        layout: { background: { type: 'solid', color: '#ffffff' }, textColor: '#475569', fontSize: 11 },
        grid: { vertLines: { color: '#f1f5f9' }, horzLines: { color: '#f1f5f9' } },
        rightPriceScale: { borderColor: '#e2e8f0', scaleMargins: { top: 0.08, bottom: 0.08 } },
        timeScale: { borderColor: '#e2e8f0', rightOffset: 4 },
        crosshair: { mode: LW.CrosshairMode.Normal },
        localization: { locale: 'th-TH' }
      });

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
        const seriesData = points.map((p) => ({ time: p.time, value: isFund ? p.value : p.close }));
        if (style === 'line') {
          mainSeries = chart.addLineSeries({ color: '#0284c7', lineWidth: 2, priceLineVisible: false });
        } else {
          mainSeries = chart.addAreaSeries({
            lineColor: '#0284c7', lineWidth: 2,
            topColor: 'rgba(2,132,199,0.28)', bottomColor: 'rgba(2,132,199,0.02)',
            priceLineVisible: false
          });
        }
        mainSeries.setData(seriesData);
      }

      const levelInfo = this.drawPriceLevels(LW, mainSeries, points, srContext);
      this.renderSrPanel(levelInfo, srContext);

      chart.timeScale().fitContent();
      this._chartInstance = chart;
      this._chartResize = new ResizeObserver(() => {
        if (!host.isConnected) return;
        chart.applyOptions({ width: host.clientWidth, height: host.clientHeight });
      });
      this._chartResize.observe(host);

      const lastPoint = points[points.length - 1];
      if (noteEl) {
        const parts = [
          isFund ? 'NAV รายวันจาก Settrade' : `ราคาจาก ${data.source || 'Yahoo Finance'}`,
          `${points.length} ${isFund ? 'จุด' : 'วันทำการ'}`,
          `ถึง ${lastPoint.time}`
        ];
        if (isFund && this.currentChartStyle === 'candles') parts.push('กองทุนมีเฉพาะ NAV รายวัน จึงแสดงเป็นกราฟพื้นที่');
        if (isFund && data.truncated) parts.push(`แหล่งข้อมูลมีข้อมูลย้อนหลังตั้งแต่ ${data.availableFrom}`);
        if (levelInfo && levelInfo.levels.length) parts.push(`วาดเส้นแนวรับ-แนวต้าน ${levelInfo.levels.filter((x) => x.onChart).length} ระดับบนกราฟ`);
        noteEl.textContent = parts.join(' · ');
      }
    } catch (err) {
      this.renderSrPanel(null, srContext);
      showError(err.name === 'AbortError' ? 'หมดเวลารอข้อมูลกราฟ (15 วินาที)' : err.message);
    }
  }
};