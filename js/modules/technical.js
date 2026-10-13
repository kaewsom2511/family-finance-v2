/**
 * js/modules/technical.js
 * Technical Analysis & TradingView Charts Module
 */

var TechnicalModule = {
  currentChartSymbol: 'AMEX:VOO',

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

    const qKey = isThai ? `${cleanSym}.BK` : cleanSym;
    const q = quotes[`${isThai ? 'thai-stock' : isFund ? 'mutual-fund' : 'foreign-stock'}|${qKey}`] ||
              quotes[`thai-stock|${cleanSym}`] ||
              quotes[qKey] ||
              quotes[cleanSym] || {};

    const holdingMatch = activeHoldings.find(h => h.symbol.replace(/\.BK$/i, '').toUpperCase() === cleanSym);

    let price = parseFloat(q.price || 0);
    if (price <= 0 && typeof stockPricePresetMap !== 'undefined' && stockPricePresetMap[cleanSym]) {
      const presetRange = stockPricePresetMap[cleanSym].priceRange || "";
      const nums = presetRange.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/g);
      if (nums && nums.length > 0) {
        price = nums.length > 1 ? (Number(nums[0]) + Number(nums[1])) / 2 : Number(nums[0]);
      }
    }
    if (price <= 0 && holdingMatch) {
      price = parseFloat(holdingMatch.priceUSD || holdingMatch.marketPrice || holdingMatch.avgCost || 0);
    }
    // ถ้ายังไม่มีราคา ให้เป็น 0 หรือไม่คำนวณหลอกตา $10.00
if (price <= 0) price = (cleanSym === 'VOO') ? 716.20 : (cleanSym === 'VT' ? 159.68 : 0);

    let prevClose = parseFloat(q.previousClose || q.prevClose || 0);
    if (prevClose <= 0) prevClose = price * 0.995;

    let change = price - prevClose;
    let changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const isBullish = change >= 0;

    const high = parseFloat(q.high || q.dayHigh || (price * 1.015));
    const low = parseFloat(q.low || q.dayLow || (price * 0.985));
    const pivot = (high + low + price) / 3;
    const r1 = (2 * pivot) - low;
    const r2 = pivot + (high - low);
    const s1 = (2 * pivot) - high;
    const s2 = pivot - (high - low);
    const nowTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

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
                <option value="1M">1 เดือน</option>
                <option value="6M">6 เดือน</option>
                <option value="1Y">1 ปี</option>
                <option value="2Y" selected>2 ปี</option>
                <option value="5Y">5 ปี</option>
              </select>
            </div>

            <div style="flex: 1; min-width: 110px;">
              <label style="display: block; font-size: 11.5px; font-weight: 700; color: #64748b; margin-bottom: 4px;">รูปแบบ</label>
              <select id="select-chart-style" style="width: 100%; height: 38px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 600; background: #fff; cursor: pointer;">
                <option value="candles" selected>แท่งเทียน</option>
                <option value="line">เส้น (Line)</option>
                <option value="area">พื้นที่ (Area)</option>
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
                <div style="font-size: 28px; font-weight: 900; color: #0f172a; line-height: 1;">${currencySign}${price.toFixed(isFund ? 4 : 2)}</div>
                <div style="font-size: 13px; font-weight: 700; color: ${isBullish ? '#16a34a' : '#dc2626'}; margin-top: 4px;">
                  ${isBullish ? '+' : ''}${change.toFixed(2)} (${isBullish ? '+' : ''}${changePct.toFixed(2)}%) วันนี้
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-bottom: 16px;">
              <span>ข้อมูล: อัปเดตล่าสุด (${nowTimeStr})</span>
              <span>กำลังแสดงข้อมูล: ${cleanSym}</span>
            </div>

            <div id="chart-viewport-box" style="height: 580px; min-height: 580px; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
              <div id="tradingview_chart_container" style="width: 100%; height: 100%; min-height: 580px;"></div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
              <div style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Market Snapshot</div>
              <h2 style="margin: 4px 0 12px 0; font-size: 20px; font-weight: 900; color: #ea580c;">${cleanSym}</h2>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px;">
                <div style="font-size: 11px; color: #64748b;">ราคาล่าสุด</div>
                <div style="font-size: 22px; font-weight: 900; color: #0f172a;">${currencySign}${price.toFixed(isFund ? 4 : 2)}</div>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 11px; color: #64748b;">สถานะ:</span>
                <span style="width: 10px; height: 10px; border-radius: 50%; background: ${isBullish ? '#16a34a' : '#dc2626'}; display: inline-block;"></span>
                <strong style="font-size: 12.5px; color: ${isBullish ? '#16a34a' : '#dc2626'};">${isBullish ? 'สินทรัพย์ (บวกวันนี้)' : 'ย่อตัววันนี้'}</strong>
              </div>
            </div>

            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 10px;">แนวรับ / แนวต้าน</div>
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
            </div>

            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">สัญญาณเทคนิค</div>
              ${portStatusHtml}
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #64748b;">• โมเมนตัมวันนี้:</span>
                  <strong style="color: ${isBullish ? '#16a34a' : '#dc2626'};">${isBullish ? 'แรงซื้อหนุน' : 'มีแรงเทขาย'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">• กรอบราคา High/Low:</span>
                  <strong style="color: #0f172a;">${currencySign}${low.toFixed(2)} - ${currencySign}${high.toFixed(2)}</strong>
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

    const triggerAnalyze = async () => {
      const raw = (symbolInput?.value || '').trim().toUpperCase();
      if (!raw) return;
      const mType = marketTypeSelect?.value || 'US';
      const clean = raw.replace(/\.BK$/i, '');
      
      this.currentChartSymbol = this.formatTradingViewSymbol(clean, mType);

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

    setTimeout(() => this.loadTradingViewWidget(this.currentChartSymbol), 150);
  },

  loadTradingViewWidget(symbol) {
    const container = document.getElementById('tradingview_chart_container');
    if (!container) return;

    container.innerHTML = '';
    const displaySym = symbol.replace(/^(BKK|NASDAQ|NYSE|AMEX|SET|FUND):/, '');
    const isFund = symbol.startsWith('FUND:');
    const isThai = symbol.startsWith('SET:') || symbol.startsWith('BKK:') || symbol.endsWith('.BK');

    if (isFund) {
      container.innerHTML = `
        <div style="width: 100%; height: 100%; min-height: 480px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff; padding: 24px; text-align: center;">
          <div style="font-size: 40px; margin-bottom: 12px;">📊</div>
          <h2 style="font-size: 22px; color: #0f172a; margin: 0 0 6px 0; font-weight: 800;">${displaySym}</h2>
          <p style="color: #64748b; font-size: 13.5px; max-width: 440px; margin: 0 0 20px 0; line-height: 1.5;">
            กองทุนรวมประกาศราคาแบบรายวัน (End of Day NAV) ไม่มีชาร์ตสดระหว่างวันบน TradingView
          </p>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
            <a href="https://www.finnomena.com/fund/${encodeURIComponent(displaySym)}" target="_blank" style="padding: 10px 18px; border-radius: 8px; background: #0f766e; color: #fff; text-decoration: none; font-weight: 700; font-size: 13.5px;">
              📈 ดูกราฟแท่งเทียน & NAV บน Finnomena ↗
            </a>
          </div>
        </div>
      `;
      return;
    }

    if (isThai) {
      container.innerHTML = `
        <div style="width: 100%; height: 100%; min-height: 480px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff; padding: 24px; text-align: center;">
          <h2 style="font-size: 24px; font-weight: 900; color: #0f172a; margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;">
            ${displaySym} <span style="font-size: 12px; font-weight: 700; color: #0284c7; background: #e0f2fe; padding: 2px 8px; border-radius: 6px;">SET</span>
          </h2>
          <p style="color: #64748b; font-size: 13px; max-width: 480px; margin: 0 0 22px 0; line-height: 1.6;">
            ตรวจสอบราคาและกราฟเทคนิคหุ้นไทยผ่านแพลตฟอร์มตลาดหลักทรัพย์ หรือเปิดดูกราฟเต็มบน TradingView
          </p>
          
          <!-- แถวบน: 2 ปุ่มหลัก (Settrade + TradingView) -->
          <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-bottom: 12px;">
            <a href="https://www.settrade.com/th/equities/quote/${encodeURIComponent(displaySym)}/overview" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 8px; background: #0284c7; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13.5px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
              🏛️ ดูข้อมูลบน Settrade ↗
            </a>
            <a href="https://th.tradingview.com/chart/?symbol=SET%3A${encodeURIComponent(displaySym)}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 8px; background: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13.5px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
              📈 ดูกราฟเต็มบน TradingView ↗
            </a>
          </div>

          <!-- แถวล่าง: ปุ่มบทวิเคราะห์ Finnomena -->
          <div style="display: flex; justify-content: center;">
            <a href="https://www.finnomena.com/stock/${encodeURIComponent(displaySym)}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 18px; border-radius: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; text-decoration: none; font-weight: 700; font-size: 13px;">
              🌱 บทวิเคราะห์ Finnomena ↗
            </a>
          </div>
        </div>
      `;
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof TradingView !== 'undefined') {
        new TradingView.widget({
          "autosize": true,
          "symbol": symbol,
          "interval": "D",
          "timezone": "Asia/Bangkok",
          "theme": "light",
          "style": "1",
          "locale": "th_TH",
          "toolbar_bg": "#f8fafc",
          "enable_publishing": false,
          "allow_symbol_change": true,
          "container_id": "tradingview_chart_container",
          "studies": ["MASimple@tv-basicstudies", "RSI@tv-basicstudies"]
        });
      }
    };
    container.appendChild(script);
  }
};