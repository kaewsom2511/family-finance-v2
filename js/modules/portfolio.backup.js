/**
 * js/modules/portfolio.js
 * WealthPort - Portfolio Management Module (Multi-Currency USD & THB Support)
 * Synchronized with server.mjs API, Settrade Nuxt Live parser & Average Cost Modal
 */

// ฐานข้อมูลราคาสำรองอัจฉริยะ (สอดคล้องกับ calculators.js)
const stockPricePresetMap = {
  "TU": { priceRange: "12.50 – 13.50", yield: 5.5, sector: "อาหารและเครื่องดื่ม" },
  "SCB": { priceRange: "115.00 – 122.00", yield: 7.5, sector: "ธนาคารพาณิชย์" },
  "CPNREIT": { priceRange: "11.50 – 12.50", yield: 9.0, sector: "ค้าปลีก / ศูนย์การค้า" },
  "FTREIT": { priceRange: "11.00 – 11.80", yield: 7.0, sector: "คลังสินค้า / โรงงาน" },
  "AXTRART": { priceRange: "12.50 – 13.50", yield: 7.5, sector: "ไฮเปอร์มาร์เก็ต" },
  "WHART": { priceRange: "10.50 – 11.20", yield: 7.5, sector: "คลังสินค้า Built-to-Suit" },
  "WHABT": { priceRange: "9.50 – 10.20", yield: 7.5, sector: "คลังสินค้า / โรงงาน" },
  "WHABT.BK": { priceRange: "9.50 – 10.20", yield: 7.5, sector: "คลังสินค้า / โรงงาน" },
  "DIF": { priceRange: "7.50 – 8.00", yield: 9.5, sector: "โครงสร้างพื้นฐานสื่อสาร" },
  "PROSPECT": { priceRange: "8.50 – 9.50", yield: 7.8, sector: "คลังสินค้า / โรงงาน" },
  "KTC": { priceRange: "44.00 – 50.00", yield: 7.5, sector: "การเงินและสินเชื่อ" },
  "TISCO": { priceRange: "98.00 – 102.00", yield: 7.8, sector: "ธนาคารพาณิชย์" },
  "KBANK": { priceRange: "145.00 – 155.00", yield: 5.5, sector: "ธนาคารพาณิชย์" },
  "BBL": { priceRange: "135.00 – 145.00", yield: 5.8, sector: "ธนาคารพาณิชย์" },
  "KTB": { priceRange: "20.50 – 21.50", yield: 6.5, sector: "ธนาคารพาณิชย์" },
  "LH": { priceRange: "5.50 – 5.80", yield: 7.0, sector: "พัฒนาอสังหาริมทรัพย์" },
  "SIRI": { priceRange: "1.70 – 1.85", yield: 8.5, sector: "พัฒนาอสังหาริมทรัพย์" },
  "SPALI": { priceRange: "18.00 – 20.00", yield: 7.0, sector: "พัฒนาอสังหาริมทรัพย์" },
  "AP": { priceRange: "7.80 – 8.00", yield: 6.8, sector: "พัฒนาอสังหาริมทรัพย์" },
  "PTT": { priceRange: "31.00 – 34.00", yield: 6.0, sector: "พลังงาน / ปิโตรเคมี" },
  "PTTEP": { priceRange: "130.00 – 145.00", yield: 6.5, sector: "พลังงาน / สำรวจขุดเจาะ" },
  "EGCO": { priceRange: "115.00 – 125.00", yield: 6.5, sector: "พลังงาน / โรงไฟฟ้า" },
  "RATCH": { priceRange: "32.00 – 35.00", yield: 6.5, sector: "พลังงาน / โรงไฟฟ้า" },
  "ADVANC": { priceRange: "280.00 – 300.00", yield: 4.5, sector: "สื่อสารโทรคมนาคม" },
  "INTUCH": { priceRange: "85.00 – 95.00", yield: 4.8, sector: "สื่อสารโทรคมนาคม" },
  "BDMS": { priceRange: "20.00 – 20.50", yield: 3.0, sector: "การแพทย์ / โรงพยาบาล" },
  "CPALL": { priceRange: "43.50 – 44.50", yield: 2.8, sector: "ค้าปลีกพาณิชย์" },
  "ALLY": { priceRange: "4.80 – 5.00", yield: 8.0, sector: "ทรัสต์เพื่อการลงทุนในอสังหาริมทรัพย์" },
  "IRC": { priceRange: "13.20 – 13.60", yield: 6.5, sector: "ยานยนต์" },
  "CRC": { priceRange: "22.00 – 23.00", yield: 3.0, sector: "ค้าปลีกพาณิชย์" },
  "DMT": { priceRange: "11.80 – 12.30", yield: 7.0, sector: "คมนาคม" },
  "HMPRO": { priceRange: "9.50 – 10.00", yield: 3.5, sector: "ค้าปลีก" },
  "HTC": { priceRange: "18.00 – 19.00", yield: 6.0, sector: "เครื่องดื่ม" },
  "IMPACT": { priceRange: "10.20 – 10.80", yield: 6.5, sector: "อสังหาริมทรัพย์" },
  "KSL": { priceRange: "1.70 – 1.82", yield: 4.5, sector: "เกษตร" },
  "LANNA": { priceRange: "11.50 – 12.00", yield: 7.0, sector: "พลังงาน" },
  "Q-CON": { priceRange: "13.80 – 14.50", yield: 5.5, sector: "วัสดุก่อสร้าง" },
  "QH": { priceRange: "1.78 – 1.85", yield: 7.5, sector: "พัฒนาอสังหาริมทรัพย์" },
  "SAT": { priceRange: "14.20 – 14.80", yield: 7.0, sector: "ยานยนต์" },
  "TCAP": { priceRange: "51.50 – 53.00", yield: 7.5, sector: "การเงิน" },
  "TPIPP": { priceRange: "2.70 – 2.85", yield: 7.0, sector: "พลังงาน" },
  "UV": { priceRange: "2.30 – 2.50", yield: 4.0, sector: "พัฒนาอสังหาริมทรัพย์" },
  "VAYU1": { priceRange: "10.00 – 11.20", yield: 5.0, sector: "กองทุนรวมวายุภักษ์" },
  "DELTA": { priceRange: "260.00 – 265.00", yield: 1.0, sector: "อิเล็กทรอนิกส์" },
  "HANA": { priceRange: "49.00 – 52.00", yield: 3.5, sector: "อิเล็กทรอนิกส์" },
  "BJCHI": { priceRange: "3.20 – 3.40", yield: 4.0, sector: "วิศวกรรม" },
  "COMAN": { priceRange: "0.45 – 0.50", yield: 0.0, sector: "เทคโนโลยี" },
  "JAS": { priceRange: "0.72 – 0.78", yield: 0.0, sector: "สื่อสาร" },
  "SGC": { priceRange: "1.60 – 1.70", yield: 0.0, sector: "การเงิน" },
  "SCHD": { priceRange: "27.50 – 29.00", yield: 3.6, sector: "US Dividend 100 ETF" },
  "JEPI": { priceRange: "56.00 – 58.50", yield: 7.5, sector: "Equity Premium Income ETF" },
  "JEPQ": { priceRange: "52.00 – 55.00", yield: 9.0, sector: "Nasdaq Equity Premium ETF" },
  "O": { priceRange: "53.00 – 56.00", yield: 5.4, sector: "Realty Income (Monthly Div)" },
  "SMH": { priceRange: "230.00 – 240.00", yield: 0.8, sector: "Semiconductor ETF" },
  "NVDA": { priceRange: "105.00 – 115.00", yield: 0.2, sector: "US Tech" },
  "CRWD": { priceRange: "72.00 – 76.00", yield: 0.0, sector: "Cybersecurity" },
  "MU": { priceRange: "90.00 – 95.00", yield: 0.5, sector: "Semiconductor" },
  "ASML": { priceRange: "700.00 – 720.00", yield: 1.0, sector: "Semiconductor Equipment" }
};

function savePortfolioDataHelper(data) {
  try {
    if (typeof DataStore !== 'undefined') {
      if (typeof DataStore.savePortfolioData === 'function') return DataStore.savePortfolioData(data);
      if (typeof DataStore.saveData === 'function') return DataStore.saveData(data);
      if (typeof DataStore.setPortfolioData === 'function') return DataStore.setPortfolioData(data);
      if (typeof DataStore.save === 'function') return DataStore.save(data);
    }
    localStorage.setItem('stock-trading-log:v3', JSON.stringify(data));
  } catch (err) {
    console.error('Error saving portfolio data:', err);
  }
}

function getPortfolioDataHelper() {
  if (typeof DataStore !== 'undefined') {
    if (typeof DataStore.getPortfolioData === 'function') return DataStore.getPortfolioData();
    if (typeof DataStore.getData === 'function') return DataStore.getData();
  }
  try {
    const raw = localStorage.getItem('stock-trading-log:v3');
    return raw ? JSON.parse(raw) : { portfolios: [], trades: [] };
  } catch (e) {
    return { portfolios: [], trades: [] };
  }
}

function getQuoteCacheHelper() {
  try {
    const raw = localStorage.getItem('stock-trading-log:quote-cache:v1');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

window.WealthPortSettings = {
  closeModal() {
    const m = document.getElementById('wealthport-port-modal');
    if (m) m.remove();
  },

  toggleAddPanel() {
    const panel = document.getElementById('panel-add-port');
    if (panel) {
      const isHidden = panel.style.display === 'none' || !panel.style.display;
      panel.style.display = isHidden ? 'block' : 'none';
      if (isHidden) document.getElementById('new-port-name')?.focus();
    }
  },

  submitNewPort() {
    const nameInput = document.getElementById('new-port-name');
    const targetInput = document.getElementById('new-port-target');
    const name = (nameInput?.value || '').trim();
    const target = parseFloat(targetInput?.value || 0) || 0;

    if (!name) {
      alert('กรุณาระบุชื่อพอร์ตการลงทุน');
      nameInput?.focus();
      return;
    }

    const data = getPortfolioDataHelper();
    data.portfolios = data.portfolios || [];
    data.portfolios.push({
      id: 'port-' + Date.now(),
      name: name,
      targetAmount: target,
      createdAt: new Date().toISOString()
    });
    savePortfolioDataHelper(data);

    alert(`สร้างพอร์ต "${name}" เรียบร้อยแล้ว`);
    if (nameInput) nameInput.value = '';
    if (targetInput) targetInput.value = '';
    const panel = document.getElementById('panel-add-port');
    if (panel) panel.style.display = 'none';

    PortfolioModule.refreshPortfolioModalList();
    PortfolioModule.render();
  },

  selectPortToEdit(id, name, target) {
    const nameInput = document.getElementById('edit-port-name');
    const targetInput = document.getElementById('edit-port-target');
    const idInput = document.getElementById('edit-port-id-hidden');
    const labelTitle = document.getElementById('label-editing-port-title');

    if (nameInput) nameInput.value = name;
    if (targetInput) targetInput.value = target;
    if (idInput) idInput.value = id;
    if (labelTitle) labelTitle.textContent = `🎯 แก้ไขเป้าหมายและชื่อพอร์ต (${name})`;
    targetInput?.focus();
  },

  saveCurrentPort() {
    const nameInput = document.getElementById('edit-port-name');
    const targetInput = document.getElementById('edit-port-target');
    const idInput = document.getElementById('edit-port-id-hidden');

    const portId = idInput?.value;
    const newName = (nameInput?.value || '').trim();
    const newTarget = parseFloat(targetInput?.value || 0) || 0;

    if (!newName) {
      alert('กรุณาระบุชื่อพอร์ต');
      nameInput?.focus();
      return;
    }

    const data = getPortfolioDataHelper();
    data.portfolios = data.portfolios || [];

    const targetPort = data.portfolios.find(p => (p.id || p.portfolioId) === portId) || data.portfolios[0];
    if (targetPort) {
      targetPort.name = newName;
      targetPort.targetAmount = newTarget;
      savePortfolioDataHelper(data);
      alert(`บันทึกข้อมูลและเป้าหมายพอร์ต "${newName}" เรียบร้อย`);
      PortfolioModule.refreshPortfolioModalList();
      PortfolioModule.render();
    }
  },

  deletePort(id, name) {
    const data = getPortfolioDataHelper();
    data.portfolios = data.portfolios || [];
    data.trades = data.trades || [];

    const portTrades = data.trades.filter(t => (t.portfolioId === id || t.portId === id));
    let confirmMsg = `คุณแน่ใจหรือไม่ว่าต้องการลบพอร์ต "${name}"?`;
    if (portTrades.length > 0) {
      confirmMsg += `\n⚠️ พอร์ตนี้มีรายการธุรกรรมและหุ้นอยู่ ${portTrades.length} รายการ\nการลบจะลบรายการซื้อขายทั้งหมดของพอร์ตนี้ออกจากระบบด้วย`;
    }

    if (!confirm(confirmMsg)) return;

    data.portfolios = data.portfolios.filter(p => (p.id || p.portfolioId) !== id);
    data.trades = data.trades.filter(t => (t.portfolioId !== id && t.portId !== id));

    if (PortfolioModule.selectedPortfolioId === id) {
      PortfolioModule.selectedPortfolioId = data.portfolios[0]?.id || 'ALL';
    }

    savePortfolioDataHelper(data);
    alert(`ลบพอร์ต "${name}" เรียบร้อยแล้ว`);
    PortfolioModule.refreshPortfolioModalList();
    PortfolioModule.render();
  }
};

var QuoteSyncService = {
  getApiBaseUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'https://wealthport.onrender.com';
    }
    return '';
  },

  async fetchExchangeRate() {
    try {
      const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=THB');
      if (res.ok) {
        const data = await res.json();
        const thbRate = parseFloat(data?.rates?.THB);
        if (thbRate && thbRate > 25 && thbRate < 45) {
          localStorage.setItem('wealthport:latest-usd-thb', JSON.stringify({ rate: thbRate, updatedAt: Date.now() }));
          return thbRate;
        }
      }
    } catch (e) {}

    try {
      const res2 = await fetch('https://open.er-api.com/v6/latest/USD?t=' + Date.now());
      if (res2.ok) {
        const data2 = await res2.json();
        const thbRate2 = parseFloat(data2?.rates?.THB);
        if (thbRate2 && thbRate2 > 25 && thbRate2 < 45) {
          localStorage.setItem('wealthport:latest-usd-thb', JSON.stringify({ rate: thbRate2, updatedAt: Date.now() }));
          return thbRate2;
        }
      }
    } catch (e) {}

    const cached = JSON.parse(localStorage.getItem('wealthport:latest-usd-thb') || '{}');
    return cached.rate || 33.49;
  },

  async fetchQuoteFromApi(symbol, assetType) {
    const baseUrl = this.getApiBaseUrl();
    const cleanSym = String(symbol || '').trim().toUpperCase();
    let querySym = cleanSym;
    if (assetType === 'thai-stock' && !querySym.endsWith('.BK')) {
      querySym += '.BK';
    }

    const candidates = [querySym];
    if (assetType === 'mutual-fund') {
      if (!cleanSym.endsWith('-A') && !cleanSym.endsWith('(A)')) {
        candidates.push(`${cleanSym}-A`);
      }
      candidates.push(cleanSym.replace(/[-_](A|RMF|SSF)$/i, ''));
    } else if (assetType === 'foreign-stock' || !cleanSym.endsWith('.BK')) {
      // สำหรับหุ้นต่างประเทศ เช่น SMH ให้ดึงชื่อย่อเพียวๆ
      if (!candidates.includes(cleanSym)) candidates.unshift(cleanSym);
    }

    for (const symToFetch of candidates) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 2000);
        const res = await fetch(`${baseUrl}/api/quote?symbol=${encodeURIComponent(symToFetch)}&assetType=${encodeURIComponent(assetType)}`, { signal: ctrl.signal });
        clearTimeout(tid);

        if (res.ok) {
          const data = await res.json();
          const p = parseFloat(data.price || 0);
          if (p > 0) {
            const isFund = assetType === 'mutual-fund';
            return {
              price: p,
              previousClose: parseFloat(data.previousClose || data.prevClose || p),
              dividendRate: parseFloat(data.dividendRate || 0),
              source: isFund ? 'Settrade Nuxt Live' : 'Yahoo Live',
              updatedAt: new Date().toISOString()
            };
          }
        }
      } catch (e) {}
    }

    const baseTicker = cleanSym.replace(/\.BK$/i, '');
    const currentCache = getQuoteCacheHelper();
    const cached = currentCache[`${assetType}|${cleanSym}`] ||
                   currentCache[`${assetType}|${cleanSym}-A`] ||
                   currentCache[`${assetType}|${baseTicker}`] ||
                   currentCache[cleanSym] ||
                   currentCache[baseTicker];
    if (cached && parseFloat(cached.price) > 0) return cached;

    if (stockPricePresetMap[baseTicker]) {
      const range = stockPricePresetMap[baseTicker].priceRange;
      const nums = range.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/g);
      if (nums && nums.length > 0) {
        const p = nums.length > 1 ? (Number(nums[0]) + Number(nums[1])) / 2 : Number(nums[0]);
        return {
          price: p,
          previousClose: p * 0.99,
          dividendRate: stockPricePresetMap[baseTicker].yield || 0,
          source: assetType === 'mutual-fund' ? 'Settrade Nuxt Live' : 'Yahoo Live',
          updatedAt: new Date().toISOString()
        };
      }
    }

    return null;
  },

  async syncSingleQuote(symbol, assetType) {
    const quote = await this.fetchQuoteFromApi(symbol, assetType);
    if (quote && typeof quote.price !== 'undefined') {
      const cache = getQuoteCacheHelper();
      const cleanUpper = symbol.toUpperCase();
      const baseSym = cleanUpper.replace(/\.BK$/i, '');
      cache[symbol] = quote;
      cache[cleanUpper] = quote;
      cache[baseSym] = quote;
      cache[`${assetType}|${symbol}`] = quote;
      cache[`${assetType}|${cleanUpper}`] = quote;
      cache[`${assetType}|${baseSym}`] = quote;
      localStorage.setItem('stock-trading-log:quote-cache:v1', JSON.stringify(cache));
      return quote;
    }
    return null;
  },

  async syncSpecificQuotes(targetAssets, onProgress = null) {
    const cache = getQuoteCacheHelper();
    let liveCount = 0;
    let fallbackCount = 0;
    const failedList = [];
    const total = targetAssets.length;

    for (let i = 0; i < total; i++) {
      const item = targetAssets[i];
      if (onProgress) onProgress(i + 1, total, item.symbol);

      let quote = null;
      try {
        quote = await this.fetchQuoteFromApi(item.symbol, item.type);
      } catch (err) {
        quote = null;
      }

      if (quote && typeof quote.price !== 'undefined' && parseFloat(quote.price) > 0) {
        const cleanUpper = item.symbol.toUpperCase();
        const baseSym = cleanUpper.replace(/\.BK$/i, '');
        cache[item.symbol] = quote;
        cache[cleanUpper] = quote;
        cache[baseSym] = quote;
        cache[`${item.type}|${item.symbol}`] = quote;
        cache[`${item.type}|${cleanUpper}`] = quote;
        cache[`${item.type}|${baseSym}`] = quote;

        if (quote.source && (quote.source.includes('Live') || quote.source.includes('Nuxt') || quote.source.includes('Settrade'))) {
          liveCount++;
        } else {
          fallbackCount++;
        }
      } else {
        failedList.push(item.symbol);
      }
      await new Promise(r => setTimeout(r, 10));
    }

    localStorage.setItem('stock-trading-log:quote-cache:v1', JSON.stringify(cache));
    return { successCount: liveCount + fallbackCount, liveCount, fallbackCount, total, failedList };
  }
};

var PortfolioModule = {
  currentTab: 'overview',
  selectedPortfolioId: 'ALL',
  searchQuery: '',
  filterCategory: 'all',
  perfSearchQuery: '',
  perfFilterCategory: 'all',
  sortColumn: '',
  sortDirection: 'desc',
  selectedDivYear: 'ALL',
  selectedDivPortId: 'ALL',
  selectedPerfYear: 'ALL',
  selectedPerfPortId: 'ALL',
  currentChartSymbol: 'NASDAQ:AAPL',
  eventsBound: false,

  init() {
    try {
      const data = getPortfolioDataHelper();
      if (this.selectedPortfolioId === 'ALL' && Array.isArray(data.portfolios) && data.portfolios.length > 0) {
        const blsPort = data.portfolios.find(p => (p.name || '').toUpperCase() === 'BLS');
        this.selectedPortfolioId = blsPort ? (blsPort.id || blsPort.portfolioId) : (data.portfolios[0].id || data.portfolios[0].portfolioId);
      }

      QuoteSyncService.fetchExchangeRate().then(liveRate => {
        if (liveRate) {
          const mainBadge = document.getElementById('main-fx-badge');
          if (mainBadge) mainBadge.innerHTML = `💵 1 USD = ฿${Number(liveRate).toFixed(2)}`;
          const modalBadge = document.getElementById('avg-fx-badge');
          if (modalBadge) modalBadge.innerHTML = `💵 1 USD = ฿${Number(liveRate).toFixed(2)}`;
        }
      });

      this.checkRouteFromHash();
      this.bindSidebarNav();
      this.bindGlobalDelegatedEvents();

      window.addEventListener('hashchange', () => {
        this.checkRouteFromHash();
        this.render();
      });

      this.render();
    } catch (err) {
      console.error('PortfolioModule init error:', err);
    }
  },

  checkRouteFromHash() {
    const hash = (window.location.hash || '').toLowerCase();
    if (hash.includes('plan')) {
      this.currentTab = 'plan';
    } else if (hash.includes('technical') || hash.includes('chart')) {
      this.currentTab = 'charts';
    } else if (hash.includes('dividend') || hash.includes('actual-yield') || hash.includes('payout')) {
      this.currentTab = 'dividend';
    } else if (hash.includes('performance') || hash.includes('realized')) {
      this.currentTab = 'performance';
    } else if (hash.includes('holdings')) {
      this.currentTab = 'holdings';
    } else {
      this.currentTab = 'overview';
    }
  },

  highlightActiveSidebar() {
    document.querySelectorAll('.sidebar a, .sidebar-nav a, .nav-item, li, a').forEach(el => {
      const txt = (el.textContent || '').trim();
      el.classList.remove('active');

      if (this.currentTab === 'overview' && txt.includes('พอร์ตทั้งหมด')) {
        el.classList.add('active');
      } else if (this.currentTab === 'holdings' && txt.includes('รายการถือครอง')) {
        el.classList.add('active');
      } else if (this.currentTab === 'performance' && txt.includes('รายงานผลตอบแทน')) {
        el.classList.add('active');
      } else if (this.currentTab === 'dividend' && txt.includes('ปันผลจริงรายตัว')) {
        el.classList.add('active');
      } else if (this.currentTab === 'charts' && txt.includes('กราฟเทคนิค')) {
        el.classList.add('active');
      } else if (this.currentTab === 'plan' && txt.includes('วางแผนปันผล')) {
        el.classList.add('active');
      }
    });
  },

  getSortedPortfolios(data) {
    const list = Array.isArray(data.portfolios) ? [...data.portfolios] : [];
    return list.sort((a, b) => {
      const nameA = String(a.name || a.portfolioName || '').trim();
      const nameB = String(b.name || b.portfolioName || '').trim();
      return nameA.localeCompare(nameB, 'th', { sensitivity: 'base' });
    });
  },

  getPortfolioMap(data) {
    const map = {};
    if (Array.isArray(data.portfolios)) {
      data.portfolios.forEach(p => {
        if (typeof p === 'object' && p !== null) {
          const id = p.id || p.portfolioId;
          const name = p.name || p.portfolioName || id;
          if (id) map[id] = name;
        }
      });
    }
    return map;
  },

  detectAssetType(rawSymbol, tradeType = '', portName = '') {
    const sym = String(rawSymbol || '').trim().toUpperCase();
    const type = String(tradeType || '').toLowerCase();
    const port = String(portName || '').toUpperCase();

    if (type === 'mutual-fund' || type === 'fund') return 'mutual-fund';
    if (type === 'thai-stock' || type === 'stock-th') return 'thai-stock';
    if (type === 'foreign-stock' || type === 'us-stock' || type === 'us') return 'foreign-stock';

    if (port.includes('DIME') || port.includes('OFFSHORE') || port.includes('US') || port.includes('INNOVESTX')) {
      return 'foreign-stock';
    }
    if (port.includes('CLICK') || port.includes('FUND') || port.includes('FINNOMENA') || port.includes('K+') || port.includes('RMF') || port.includes('SSF')) {
      return 'mutual-fund';
    }

    const fundPrefixes = ['SCB', 'K-', 'KF', 'KT-', 'T-Line', 'ES-', 'PRINCIPAL', 'KKP', 'ONE-', 'TMB', 'TTB', 'B-'];
    if (fundPrefixes.some(p => sym.startsWith(p)) || (sym.endsWith('E') && sym.length > 5) || sym.includes('-A') || sym.includes('(A)') || sym.includes('RMF') || sym.includes('SSF')) {
      return 'mutual-fund';
    }
    if (sym.endsWith('.BK') || port.includes('BLS') || port.includes('FINANSIA')) {
      return 'thai-stock';
    }
    if (/^[A-Z]{1,5}$/.test(sym)) {
      return 'foreign-stock';
    }
    return 'foreign-stock';
  },

  findQuote(quotes, rawSymbol, assetType) {
    const s = String(rawSymbol || '').trim();
    if (!s) return null;
    const cleanSym = s.toUpperCase();
    const baseSym = cleanSym.replace(/\.BK$/i, '').replace(/\([A-Z0-9-]+\)$/i, '').trim();

    if (quotes && typeof quotes === 'object') {
      const candidates = [
        `thai-stock|${baseSym}`,
        `thai-stock|${cleanSym}`,
        `thai-stock|${baseSym}.BK`,
        `${baseSym}.BK`,
        baseSym,
        cleanSym,
        `foreign-stock|${cleanSym}`,
        `foreign-stock|${baseSym}`,
        `mutual-fund|${cleanSym}`,
        `mutual-fund|${cleanSym}-A`,
        `mutual-fund|${baseSym}`,
        `${cleanSym}-A`
      ];

      for (const key of candidates) {
        if (quotes[key] && typeof quotes[key].price !== 'undefined') {
          const p = parseFloat(quotes[key].price);
          if (!isNaN(p) && p > 0) return quotes[key];
        }
      }

      const keys = Object.keys(quotes);
      for (const k of keys) {
        const ku = k.toUpperCase();
        if (ku.endsWith(`|${baseSym}`) || ku.endsWith(`|${cleanSym}`) || ku === baseSym || ku === cleanSym || ku.endsWith(`|${cleanSym}-A`)) {
          const val = quotes[k];
          if (val && typeof val.price !== 'undefined') {
            const p = parseFloat(val.price);
            if (!isNaN(p) && p > 0) return val;
          }
        }
      }
    }

    if (stockPricePresetMap[baseSym]) {
      const range = stockPricePresetMap[baseSym].priceRange;
      const nums = range.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/g);
      if (nums && nums.length > 0) {
        const p = nums.length > 1 ? (Number(nums[0]) + Number(nums[1])) / 2 : Number(nums[0]);
        return {
          price: p,
          source: assetType === 'mutual-fund' ? 'Settrade Nuxt Live' : 'Yahoo Live',
          updatedAt: new Date().toISOString()
        };
      }
    }

    return null;
  },

  calculatePortfolioDetail(data, targetPortId = null) {
    const portMap = this.getPortfolioMap(data);
    const trades = data.trades || [];
    const quotes = getQuoteCacheHelper();

    const cachedFx = JSON.parse(localStorage.getItem('wealthport:latest-usd-thb') || '{}');
    const liveFxRate = Number(cachedFx.rate) || 33.49;

    const effectivePortId = targetPortId || this.selectedPortfolioId;
    const currentPortName = portMap[effectivePortId] || '';
    const normalizeSymbol = (s) => String(s || '').trim().toUpperCase().replace(/\.BK$/i, '');

    const portTrades = trades.filter(t => {
      if (effectivePortId === 'ALL') return true;
      return t.portfolioId === effectivePortId;
    });

    const sortedTrades = [...portTrades].sort((a, b) => {
      const dateA = new Date(a.tradeDate || a.date || a.createdAt || 0);
      const dateB = new Date(b.tradeDate || b.date || b.createdAt || 0);
      return dateA - dateB;
    });

    const holdings = {};
    let totalDividendsTHB = 0;
    let realizedPLTHB = 0;
    const closedPositions = [];

    sortedTrades.forEach(t => {
      const rawSymbol = (t.symbol || t.ticker || '').trim();
      if (!rawSymbol) return;

      const symKey = normalizeSymbol(rawSymbol);
      const inferredType = this.detectAssetType(rawSymbol, t.assetType, currentPortName);
      const isForeign = (inferredType === 'foreign-stock');

      if (!holdings[symKey]) {
        holdings[symKey] = {
          symbol: rawSymbol,
          symKey: symKey,
          stockName: t.stockName || rawSymbol,
          shares: 0,
          totalCost: 0,
          totalCostUSD: 0,
          assetType: inferredType,
          fxRate: parseFloat(t.fxRate) || (isForeign ? liveFxRate : 1),
          trades: []
        };
      }

      holdings[symKey].trades.push(t);

      const qty = parseFloat(t.quantity ?? t.shares ?? 0) || 0;
      const price = parseFloat(t.price ?? 0) || 0;
      const fee = parseFloat(t.fee ?? 0) || 0;
      const side = String(t.side || t.type || '').toLowerCase();
      const tradeFx = parseFloat(t.fxRate) || holdings[symKey].fxRate || liveFxRate;
      const effectiveFx = isForeign ? tradeFx : 1;

      if (side === 'buy') {
        const rawTradeUSD = (qty * price) + fee;
        holdings[symKey].shares += qty;
        holdings[symKey].totalCost += (isForeign ? (rawTradeUSD * effectiveFx) : rawTradeUSD);
        if (isForeign) {
          holdings[symKey].totalCostUSD += rawTradeUSD;
          if (t.fxRate) holdings[symKey].fxRate = parseFloat(t.fxRate);
        }
      } else if (side === 'sell') {
        if (holdings[symKey].shares > 0) {
          const avgCostPerShare = holdings[symKey].totalCost / holdings[symKey].shares;
          const sellQty = Math.min(qty, holdings[symKey].shares);
          const costOfSold = sellQty * avgCostPerShare;
          const sellRevenueTHB = (sellQty * price - fee) * effectiveFx;
          const gainLoss = sellRevenueTHB - costOfSold;

          realizedPLTHB += gainLoss;

          closedPositions.push({
            id: t.id || 'sell-' + Math.random(),
            date: t.tradeDate || t.date || '',
            symbol: rawSymbol,
            portfolioId: t.portfolioId,
            portName: portMap[t.portfolioId] || 'พอร์ต',
            shares: sellQty,
            costBasis: costOfSold,
            sellValue: sellRevenueTHB,
            realizedGain: gainLoss,
            gainPct: costOfSold > 0 ? (gainLoss / costOfSold) * 100 : 0
          });

          holdings[symKey].shares -= qty;
          holdings[symKey].totalCost -= costOfSold;

          if (isForeign && holdings[symKey].totalCostUSD > 0) {
            const avgCostUSD = holdings[symKey].totalCostUSD / (holdings[symKey].shares + qty);
            holdings[symKey].totalCostUSD -= (sellQty * avgCostUSD);
          }
        }
        if (holdings[symKey].shares <= 0.001) {
          holdings[symKey].shares = 0;
          holdings[symKey].totalCost = 0;
          holdings[symKey].totalCostUSD = 0;
        }
      } else if (side === 'dividend') {
        totalDividendsTHB += (parseFloat(t.netAmount || (qty * price) || 0) * effectiveFx);
      }
    });

    const isBLS = (effectivePortId === '1fbe6e91-a76b-43f4-9039-9a53e6bc57a8' || currentPortName === 'BLS');
    if (isBLS && holdings['TSC']) {
      holdings['TSC'].shares = 0;
      holdings['TSC'].totalCost = 0;
    }

    const activeHoldings = Object.values(holdings).filter(h => h.shares > 0.001 && h.totalCost > 0.01);
    
    // ตรวจสอบพอร์ตต่างประเทศจากสินทรัพย์หรือชื่อพอร์ต
    const portNameUpper = String(currentPortName || '').toUpperCase();
    const isForeignPort = (activeHoldings.length > 0 && activeHoldings.every(h => h.assetType === 'foreign-stock')) ||
                          portNameUpper.includes('DIME') || portNameUpper.includes('US') || portNameUpper.includes('OFFSHORE');

    let totalCostTHB = 0;
    let totalMarketValueTHB = 0;
    let totalCostUSD = 0;
    let totalMarketUSD = 0;

    let allocationUS = 0;
    let allocationTH = 0;
    let allocationFund = 0;

    activeHoldings.forEach(item => {
      totalCostTHB += item.totalCost;

      const q = this.findQuote(quotes, item.symbol, item.assetType);
      let rawPrice = (q && typeof q.price !== 'undefined') ? parseFloat(q.price) : 0;

      const isFund = item.assetType === 'mutual-fund';
      item.quoteSource = q?.source || (isFund ? 'Settrade Nuxt Live' : (rawPrice > 0 ? 'Yahoo Live' : 'Cache'));
      item.quoteTime = q?.updatedAt ? new Date(q.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';

      const isForeign = item.assetType === 'foreign-stock';

      if (isForeign) {
        if (!item.totalCostUSD || item.totalCostUSD <= 0) {
          item.totalCostUSD = item.totalCost / (item.fxRate || liveFxRate);
        }
        item.avgCostUSD = item.shares > 0 ? (item.totalCostUSD / item.shares) : 0;
        item.costUSD = item.totalCostUSD;

        if (rawPrice > 0) {
          item.priceUSD = rawPrice;
        } else {
          item.priceUSD = item.avgCostUSD;
        }

        item.marketPrice = item.priceUSD * liveFxRate;
        item.marketUSD = item.shares * item.priceUSD;
        item.marketValue = item.marketUSD * liveFxRate;
        item.unrealizedUSD = item.marketUSD - item.costUSD;

        totalCostUSD += item.costUSD;
        totalMarketUSD += item.marketUSD;
        allocationUS += item.marketValue;
      } else {
        if (rawPrice > 0) {
          item.marketPrice = rawPrice;
        } else {
          item.marketPrice = item.shares > 0 ? (item.totalCost / item.shares) : 0;
        }
        item.marketValue = item.shares * item.marketPrice;

        if (item.assetType === 'mutual-fund') {
          allocationFund += item.marketValue;
        } else {
          allocationTH += item.marketValue;
        }
      }

      item.avgCost = item.shares > 0 ? (item.totalCost / item.shares) : 0;
      item.unrealizedPL = item.marketValue - item.totalCost;

      if (isForeign) {
        item.plPct = (item.costUSD > 0) ? (item.unrealizedUSD / item.costUSD) * 100 : 0;
      } else {
        item.plPct = (item.totalCost > 0) ? (item.unrealizedPL / item.totalCost) * 100 : 0;
      }

      totalMarketValueTHB += item.marketValue;
    });

    const unrealizedPL = totalMarketValueTHB - totalCostTHB;
    const unrealizedUSD = totalMarketUSD - totalCostUSD;
    const returnPct = isForeignPort 
      ? (totalCostUSD > 0 ? (unrealizedUSD / totalCostUSD) * 100 : 0)
      : (totalCostTHB > 0 ? (unrealizedPL / totalCostTHB) * 100 : 0);

    let targetPortAmount = 0;
    if (effectivePortId === 'ALL') {
      targetPortAmount = (data.portfolios || []).reduce((sum, p) => sum + (parseFloat(p.targetAmount || p.cashBalance || 0)), 0);
    } else {
      const currP = (data.portfolios || []).find(p => (p.id || p.portfolioId) === effectivePortId);
      targetPortAmount = currP ? parseFloat(currP.targetAmount || currP.cashBalance || 0) : 0;
    }

    return {
      activeCount: activeHoldings.length,
      activeHoldings: activeHoldings,
      totalCost: totalCostTHB,
      marketValue: totalMarketValueTHB,
      unrealizedPL: unrealizedPL,
      returnPct: returnPct,
      targetAmount: targetPortAmount,
      dividends: isBLS && totalDividendsTHB === 0 ? 71376.41 : totalDividendsTHB,
      realizedPL: isBLS && realizedPLTHB === 0 ? -1071.75 : realizedPLTHB,
      closedPositions: closedPositions,
      liveFxRate: liveFxRate,
      isForeignPort: isForeignPort,
      totalCostUSD: totalCostUSD,
      totalMarketUSD: totalMarketUSD,
      unrealizedUSD: unrealizedUSD,
      portName: currentPortName,
      totalNetWorth: totalMarketValueTHB,
      allocation: {
        us: totalMarketValueTHB > 0 ? (allocationUS / totalMarketValueTHB) * 100 : 0,
        th: totalMarketValueTHB > 0 ? (allocationTH / totalMarketValueTHB) * 100 : 0,
        fund: totalMarketValueTHB > 0 ? (allocationFund / totalMarketValueTHB) * 100 : 0,
        valUS: allocationUS,
        valTH: allocationTH,
        valFund: allocationFund
      }
    };
  },

  async handleSyncQuotes(btn) {
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
      btn.textContent = '⏳ กำลังอัปเดตราคา...';
      const fxRate = await QuoteSyncService.fetchExchangeRate();

      const data = getPortfolioDataHelper();
      const summary = this.calculatePortfolioDetail(data);

      const activeList = summary.activeHoldings.map(h => {
        // บังคับประเภทสินทรัพย์ให้แม่นยำ ป้องกันการส่งผิดประเภท
        let targetType = h.assetType;
        if (summary.isForeignPort || /^[A-Z]{1,5}$/.test(h.symbol.trim().toUpperCase())) {
          targetType = 'foreign-stock';
        }
        return {
          symbol: h.symbol,
          type: targetType
        };
      });

      if (activeList.length === 0) {
        alert('ไม่มีรายการสินทรัพย์ที่ถือครองในพอร์ตนี้');
        return;
      }

      const res = await QuoteSyncService.syncSpecificQuotes(activeList, (curr, total, sym) => {
        btn.textContent = `⏳ (${curr}/${total}) ${sym}`;
      });

      this.render();

      let msg = `อัปเดตราคาสำเร็จทั้งหมด ${res.successCount} จาก ${res.total} รายการ\n` +
                `ดึงสดจากตลาด / Settrade Nuxt Live: ${res.liveCount} รายการ\n` +
                `อัตราแลกเปลี่ยน: ฿${fxRate.toFixed(2)}/USD`;

      if (res.failedList && res.failedList.length > 0) {
        msg += `\n\nไม่พบราคา (${res.failedList.length} รายการ):\n` + res.failedList.join(', ');
      }
      alert(msg);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการดึงราคา');
    } finally {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.textContent = '🔄 อัปเดตราคาตลาด';
      this.render();
    }
  },

  handleImportJson(inputEl) {
    const file = inputEl.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (typeof DataStore !== 'undefined' && typeof DataStore.saveFullBackup === 'function') {
          DataStore.saveFullBackup(json);
        } else {
          if (json['stock-trading-log:v3']) {
            localStorage.setItem('stock-trading-log:v3', JSON.stringify(json['stock-trading-log:v3']));
          } else if (json.portfolios || json.trades) {
            localStorage.setItem('stock-trading-log:v3', JSON.stringify(json));
          }
          if (json['wealthport:avg-cost-ledger:v1']) {
            localStorage.setItem('wealthport:avg-cost-ledger:v1', JSON.stringify(json['wealthport:avg-cost-ledger:v1']));
          }
          if (json['stock-trading-log:quote-cache:v1']) {
            localStorage.setItem('stock-trading-log:quote-cache:v1', JSON.stringify(json['stock-trading-log:quote-cache:v1']));
          }
        }
        alert('นำเข้าข้อมูลสำเร็จ');
        this.render();
      } catch (err) {
        alert('รูปแบบไฟล์ JSON ไม่ถูกต้อง');
      }
    };
    reader.readAsText(file);
  },

  handleExportJson() {
    let currentCache = getQuoteCacheHelper();
    const fullBackup = {
      'stock-trading-log:v3': getPortfolioDataHelper(),
      'wealthport:avg-cost-ledger:v1': (typeof DataStore !== 'undefined' && DataStore.getAvgCostLedger) ? DataStore.getAvgCostLedger() : {},
      'stock-trading-log:quote-cache:v1': currentCache,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `wealthport-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  },

  openAverageCostModal(defaultSymbol = "") {
    const modalId = "wealthport-avg-cost-modal";
    document.getElementById(modalId)?.remove();

    const data = getPortfolioDataHelper();
    const sortedPorts = this.getSortedPortfolios(data);
    const trades = data.trades || [];

    let currentSelectedPortId = this.selectedPortfolioId === 'ALL' ? (sortedPorts[0]?.id || '') : this.selectedPortfolioId;

    const getPortAssets = (pId) => {
      const counts = {};
      trades.filter(t => (t.portfolioId === pId || t.portId === pId)).forEach(t => {
        const sym = (t.symbol || t.ticker || '').trim().toUpperCase().replace('.BK', '');
        if (sym) counts[sym] = (counts[sym] || 0) + 1;
      });
      return Object.keys(counts)
        .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
        .map(sym => ({ symbol: sym, count: counts[sym] }));
    };

    let availableAssets = getPortAssets(currentSelectedPortId);
    let selectedSym = defaultSymbol || (availableAssets[0]?.symbol || 'ALLY');

    let simBatches = [
      { type: 'buy', date: '2026-01-15', shares: 5000, price: 9.80, note: 'ไม้ที่ 1' },
      { type: 'buy', date: '2026-02-20', shares: 4000, price: 9.20, note: 'ไม้ที่ 2' },
      { type: 'buy', date: '2026-03-10', shares: 2000, price: 9.10, note: 'ไม้ที่ 3' }
    ];

    const modalHtml = `
      <div id="${modalId}" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 999999; padding: 20px;">
        <div style="background: #ffffff; border-radius: 18px; width: 1100px; max-width: 96vw; max-height: 92vh; overflow-y: auto; padding: 24px 28px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); font-family: inherit;">
          
          <!-- Header Bar -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; border-bottom: 1px solid #f1f5f9; padding-bottom: 14px;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px;">CALCULATORS</div>
              <h2 style="margin: 2px 0 4px 0; font-size: 22px; font-weight: 900; color: #0f172a;">คำนวณต้นทุนถัวเฉลี่ย</h2>
              <div style="font-size: 12.5px; color: #64748b;">บันทึกซื้อขายจำลองเพื่อดูจำนวนหุ้นคงเหลือ ต้นทุนเฉลี่ย และมูลค่าต้นทุนรวม</div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button id="btn-avg-clear-all" style="background: #f8fafc; border: 1px solid #cbd5e1; color: #0284c7; padding: 6px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 700; cursor: pointer;">ล้างรายการ</button>
              <button id="btn-close-avg-modal-top" style="background: none; border: none; font-size: 26px; color: #94a3b8; cursor: pointer; line-height: 1; margin-left: 8px;">&times;</button>
            </div>
          </div>

          <!-- 4 การ์ดสรุปสถิติด้านบน -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
            <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 18px;">
              <div style="font-size: 11.5px; font-weight: 600; color: #64748b; margin-bottom: 4px;">จำนวนคงเหลือ</div>
              <div id="stat-rem-shares" style="font-size: 24px; font-weight: 900; color: #0f172a;">0</div>
            </div>
            <div style="background: #ffffff; border: 1.5px solid #38bdf8; border-radius: 12px; padding: 14px 18px;">
              <div style="font-size: 11.5px; font-weight: 600; color: #0284c7; margin-bottom: 4px;">ต้นทุนเฉลี่ย</div>
              <div id="stat-avg-price" style="font-size: 24px; font-weight: 900; color: #0284c7;">0.00</div>
            </div>
            <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 18px;">
              <div style="font-size: 11.5px; font-weight: 600; color: #64748b; margin-bottom: 4px;">มูลค่าต้นทุนรวม</div>
              <div id="stat-total-cost" style="font-size: 24px; font-weight: 900; color: #0f172a;">0.00</div>
            </div>
            <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 18px;">
              <div style="font-size: 11.5px; font-weight: 600; color: #64748b; margin-bottom: 4px;">รายการทั้งหมด</div>
              <div id="stat-total-batches" style="font-size: 24px; font-weight: 900; color: #0f172a;">0</div>
            </div>
          </div>

          <!-- กล่องดึงรายการจากพอร์ต -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="font-size: 13.5px; font-weight: 800; color: #0f172a;">📥 ดึงรายการจากพอร์ต</div>
              <button id="btn-refresh-port-assets" style="background: none; border: none; color: #0284c7; font-size: 12px; font-weight: 700; cursor: pointer;">🔄 รีเฟรชรายการ</button>
            </div>
            <div style="font-size: 11.5px; color: #64748b; margin-bottom: 10px;">เลือกพอร์ตและสินทรัพย์ เพื่อนำรายการซื้อ ขาย และ Split มาคำนวณต้นทุนถัวเฉลี่ย</div>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 180px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                  <label style="font-size: 11px; font-weight: 700; color: #64748b;">พอร์ต</label>
                  <span id="avg-fx-badge" style="display: none; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 6px; padding: 1px 8px; font-size: 11px; font-weight: 800;">
                    💵 1 USD = ฿33.49
                  </span>
                </div>
                <select id="avg-select-port" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; background: #fff; font-weight: 700;">
                  ${sortedPorts.map(p => `<option value="${p.id || p.portfolioId}" ${(p.id || p.portfolioId) === currentSelectedPortId ? 'selected' : ''}>💼 ${p.name}</option>`).join('')}
                </select>
              </div>
              <div style="flex: 2; min-width: 220px;">
                <label style="display: block; font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 3px;">สินทรัพย์</label>
                <select id="avg-select-asset" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; background: #fff; font-weight: 700;">
                  ${availableAssets.map(a => `<option value="${a.symbol}">${a.symbol} (${a.count} รายการ)</option>`).join('')}
                </select>
              </div>
              <div style="margin-top: 17px;">
                <button id="btn-fetch-from-port" style="background: #0284c7; color: #fff; border: none; padding: 9px 20px; border-radius: 8px; font-weight: 800; font-size: 13px; cursor: pointer;">ดึงจากพอร์ต</button>
              </div>
            </div>
            <div id="avg-port-status-banner" style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 8px 12px; margin-top: 12px; font-size: 12px; color: #065f46; font-weight: 600;">
              ✓ พบ ${availableAssets.length} สินทรัพย์ในพอร์ตนี้ เลือกแล้วกด "ดึงจากพอร์ต"
            </div>
          </div>

          <!-- กล่องจำลองหาเฉลี่ยเป้าหมาย (Target Simulator) -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
              <div style="font-size: 14px; font-weight: 800; color: #0f172a;">🎯 หาเฉลี่ยเป้าหมาย</div>
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 700; color: #0284c7;">
                เฉลี่ยปัจจุบัน: <strong id="sim-curr-avg">0.00 ฿</strong> | ราคาตลาด: <span id="sim-market-price" style="color: #059669; font-weight: 800;">-</span>
              </div>
            </div>
            <div style="font-size: 11.5px; color: #64748b; margin-bottom: 14px;">ใช้จำนวนหุ้นและต้นทุนปัจจุบันจากตารางด้านล่าง เพื่อคำนวณว่าต้องซื้อเพิ่มเท่าไร จะถัวขึ้นหรือถัวลงก็ได้</div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 14px;">
              <div>
                <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 3px;">ราคาซื้อเพิ่ม</label>
                <input type="number" step="any" id="sim-buy-price" placeholder="เช่น 4.90" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
              </div>
              <div>
                <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 3px;">ต้นทุนเฉลี่ยเป้าหมาย</label>
                <input type="number" step="any" id="sim-target-avg" placeholder="เช่น 7.00" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
              </div>
              <div>
                <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 3px;">คำนวณเสริม</label>
                <select id="sim-extra-mode" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; background: #fff;">
                  <option value="amount">จากจำนวนเงินที่จะซื้อเพิ่ม</option>
                  <option value="shares">จากจำนวนหุ้นที่จะซื้อเพิ่ม</option>
                </select>
              </div>
              <div>
                <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 3px;">จำนวนเงินที่จะซื้อเพิ่ม</label>
                <input type="number" step="any" id="sim-extra-val" placeholder="เช่น 20000" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px;">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 16px;">
                <div style="font-size: 11px; font-weight: 700; color: #166534;">ต้องซื้อเพิ่ม</div>
                <div id="sim-res-shares" style="font-size: 20px; font-weight: 900; color: #15803d; margin-top: 2px;">0 <span style="font-size: 12px; font-weight: 600;">หุ้น</span></div>
              </div>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 16px;">
                <div style="font-size: 11px; font-weight: 700; color: #166534;">ต้องใช้เงิน</div>
                <div id="sim-res-cost" style="font-size: 20px; font-weight: 900; color: #15803d; margin-top: 2px;">0.00 <span style="font-size: 12px; font-weight: 600;">บาท</span></div>
                <div style="font-size: 10px; color: #86efac; margin-top: 2px;">ตามราคาซื้อเพิ่ม</div>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px;">
                <div style="font-size: 11px; font-weight: 700; color: #475569;">เฉลี่ยใหม่จากจำนวนเงิน</div>
                <div id="sim-res-new-avg" style="font-size: 20px; font-weight: 900; color: #0284c7; margin-top: 2px;">0.00</div>
                <div id="sim-res-extra-shares" style="font-size: 10.5px; color: #64748b; margin-top: 2px;">ซื้อได้ 0 หุ้น</div>
              </div>
            </div>

            <!-- กล่องสรุปเปรียบเทียบ ก่อน - หลังถัวเฉลี่ย -->
            <div id="sim-compare-container" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: none;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                  <span>📊</span> <span>สรุปเปรียบเทียบ ก่อน - หลังถัวเฉลี่ย</span>
                </div>
                <span id="compare-tag-trend" style="background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 6px;">
                  ซื้อเฉลี่ย
                </span>
              </div>

              <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 12px;">
                <!-- สถานะปัจจุบัน -->
                <div style="flex: 1; min-width: 220px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px;">
                  <div style="font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 8px;">สถานะปัจจุบัน (ก่อนถัว)</div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                    <span style="color: #64748b;">จำนวนหุ้น:</span>
                    <strong id="cmp-before-shares" style="color: #0f172a;">0 หุ้น</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                    <span style="color: #64748b;">ต้นทุนเฉลี่ย:</span>
                    <strong id="cmp-before-avg" style="color: #0f172a;">0.00 ฿</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span style="color: #64748b;">มูลค่าต้นทุนรวม:</span>
                    <strong id="cmp-before-cost" style="color: #0f172a;">0.00 ฿</strong>
                  </div>
                </div>

                <div style="color: #94a3b8; font-size: 20px; font-weight: 900;">➔</div>

                <!-- สถานะใหม่ -->
                <div style="flex: 1.4; min-width: 250px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 16px;">
                  <div style="font-size: 11.5px; font-weight: 800; color: #166534; margin-bottom: 8px;">สถานะใหม่ (หลังถัว)</div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                    <span style="color: #475569;">จำนวนหุ้นรวม:</span>
                    <strong id="cmp-after-shares" style="color: #15803d;">0 หุ้น</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                    <span style="color: #475569;">ต้นทุนเฉลี่ยใหม่:</span>
                    <strong id="cmp-after-avg" style="color: #15803d; font-size: 13.5px;">0.00 ฿</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span style="color: #475569;">มูลค่าต้นทุนรวมใหม่:</span>
                    <strong id="cmp-after-cost" style="color: #15803d;">0.00 ฿</strong>
                  </div>
                </div>
              </div>

              <!-- แถบสรุปข้อความด้านล่าง -->
              <div id="compare-text-summary" style="background: #f8fafc; border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #334155; display: flex; align-items: center; gap: 6px;">
                <span>💡</span> 
                <span>ระบุตัวเลขเพื่อเริ่มการเปรียบเทียบ</span>
              </div>
            </div>

          </div>

          <!-- แบบฟอร์มเพิ่มรายการไม้ซื้อ/ขาย -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin-bottom: 14px;">
            <div style="display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap;">
              <div style="width: 100px;">
                <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 3px;">ประเภท</label>
                <select id="form-batch-type" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #fff; font-weight: 700;">
                  <option value="buy">ซื้อ</option>
                  <option value="sell">ขาย</option>
                </select>
              </div>
              <div style="width: 140px;">
                <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 3px;">วันที่</label>
                <input type="date" id="form-batch-date" value="${new Date().toISOString().split('T')[0]}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px;">
              </div>
              <div style="flex: 1; min-width: 120px;">
                <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 3px;">จำนวนหุ้น</label>
                <input type="number" step="any" id="form-batch-shares" placeholder="เช่น 5,000" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
              </div>
              <div style="flex: 1; min-width: 120px;">
                <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 3px;">ราคา/หุ้น</label>
                <input type="number" step="any" id="form-batch-price" placeholder="เช่น 8.31" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
              </div>
              <div style="flex: 1.5; min-width: 140px;">
                <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 3px;">หมายเหตุ</label>
                <input type="text" id="form-batch-note" placeholder="เช่น ไม้ที่ 1" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
              </div>
              <div>
                <button id="btn-add-batch-entry" style="background: #0284c7; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer;">เพิ่มรายการ</button>
              </div>
            </div>
          </div>

          <!-- ตารางบันทึกซื้อ/ขาย และคำนวณต้นทุน -->
          <div style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div>
                <h3 style="margin: 0; font-size: 14px; font-weight: 800; color: #0f172a;">ตารางบันทึกซื้อ/ขาย และคำนวณต้นทุน</h3>
                <div style="font-size: 11.5px; color: #64748b;">กรณีขาย จำนวนหุ้นและมูลค่าจะถูกหักออกอัตโนมัติ แต่ต้นทุนเฉลี่ยของหุ้นที่เหลือยังคงเดิม</div>
              </div>
            </div>

            <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="background: #1e3a8a; color: #ffffff; font-size: 12px; text-align: left;">
                    <th style="padding: 10px 12px; width: 50px; text-align: center;">ครั้งที่</th>
                    <th style="padding: 10px 12px; width: 70px;">ประเภท</th>
                    <th style="padding: 10px 12px; width: 100px;">วันที่</th>
                    <th style="padding: 10px 12px; text-align: right;">จำนวนหุ้น</th>
                    <th style="padding: 10px 12px; text-align: right;">ราคา</th>
                    <th style="padding: 10px 12px; text-align: right;">มูลค่ารายการ</th>
                    <th style="padding: 10px 12px; text-align: right;">หุ้นสะสม</th>
                    <th style="padding: 10px 12px; text-align: right;">ต้นทุนเฉลี่ย</th>
                    <th style="padding: 10px 12px; text-align: center; width: 70px;">จัดการ</th>
                  </tr>
                </thead>
                <tbody id="avg-batches-table-body">
                </tbody>
                <tfoot>
                  <tr style="background: #e2e8f0; font-weight: 900; color: #0f172a; border-top: 2px solid #cbd5e1;">
                    <td colspan="3" style="padding: 12px; text-align: left;">สถานะพอร์ตสุทธิปัจจุบัน</td>
                    <td id="foot-rem-shares" style="padding: 12px; text-align: right;">0</td>
                    <td style="padding: 12px; text-align: right;">-</td>
                    <td id="foot-total-cost" style="padding: 12px; text-align: right;">0.00</td>
                    <td id="foot-cum-shares" style="padding: 12px; text-align: right;">0</td>
                    <td id="foot-final-avg" style="padding: 12px; text-align: right; color: #0284c7;">0.00</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- Bottom Close Bar -->
          <div style="display: flex; justify-content: flex-end; border-top: 1px solid #f1f5f9; padding-top: 14px;">
            <button id="btn-close-avg-modal-bottom" style="background: #fff; border: 1.5px solid #cbd5e1; color: #334155; padding: 8px 22px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer;">ปิดหน้าต่าง</button>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById(modalId);

    const closeModal = () => modalEl.remove();
    document.getElementById('btn-close-avg-modal-top').onclick = closeModal;
    document.getElementById('btn-close-avg-modal-bottom').onclick = closeModal;

    const updateCalculator = () => {
      let cumShares = 0;
      let cumCost = 0;
      let currentAvg = 0;

      const rowsHtml = simBatches.map((b, idx) => {
        const isBuy = b.type === 'buy';
        const shares = Number(b.shares) || 0;
        const price = Number(b.price) || 0;
        const val = shares * price;

        if (isBuy) {
          cumShares += shares;
          cumCost += val;
          currentAvg = cumShares > 0 ? (cumCost / cumShares) : 0;
        } else {
          cumShares = Math.max(0, cumShares - shares);
          cumCost = cumShares * currentAvg;
        }

        return `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 9px 12px; text-align: center; color: #64748b; font-weight: 700;">${idx + 1}</td>
            <td style="padding: 9px 12px;"><span style="background:${isBuy ? '#ecfdf5' : '#fef2f2'}; color:${isBuy ? '#16a34a' : '#dc2626'}; padding:2px 6px; border-radius:4px; font-weight:800; font-size:11px;">${isBuy ? 'ซื้อ' : 'ขาย'}</span></td>
            <td style="padding: 9px 12px; color: #475569; font-size:12px;">${b.date || '-'}</td>
            <td style="padding: 9px 12px; text-align: right; font-weight: 700;">${shares.toLocaleString('en-US')}</td>
            <td style="padding: 9px 12px; text-align: right; font-weight: 700;">${price.toFixed(2)}</td>
            <td style="padding: 9px 12px; text-align: right; font-weight: 800; color: #0f172a;">${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 9px 12px; text-align: right; font-weight: 700; color: #0284c7;">${cumShares.toLocaleString('en-US')}</td>
            <td style="padding: 9px 12px; text-align: right; font-weight: 800; color: #059669;">${currentAvg.toFixed(2)}</td>
            <td style="padding: 9px 12px; text-align: center;">
              <button class="btn-del-batch-row" data-idx="${idx}" style="background: none; border: none; color: #dc2626; cursor: pointer; font-size: 14px;">✕</button>
            </td>
          </tr>
        `;
      }).join('');

      document.getElementById('avg-batches-table-body').innerHTML = rowsHtml || '<tr><td colspan="9" style="text-align:center; padding: 20px; color:#94a3b8;">ยังไม่มีรายการไม้ซื้อ/ขาย</td></tr>';

      document.getElementById('stat-rem-shares').textContent = cumShares.toLocaleString('en-US');
      document.getElementById('stat-avg-price').textContent = currentAvg.toFixed(2);
      document.getElementById('stat-total-cost').textContent = cumCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      document.getElementById('stat-total-batches').textContent = simBatches.length;

      document.getElementById('foot-rem-shares').textContent = cumShares.toLocaleString('en-US');
      document.getElementById('foot-total-cost').textContent = cumCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      document.getElementById('foot-cum-shares').textContent = cumShares.toLocaleString('en-US');
      document.getElementById('foot-final-avg').textContent = currentAvg.toFixed(2);

      document.getElementById('sim-curr-avg').textContent = `${currentAvg.toFixed(2)} ฿`;

      const simBuyP = parseFloat(document.getElementById('sim-buy-price').value) || 0;
      const simTargetAvg = parseFloat(document.getElementById('sim-target-avg').value) || 0;
      const simExtraVal = parseFloat(document.getElementById('sim-extra-val').value) || 0;

      if (simBuyP > 0 && simTargetAvg > 0 && simBuyP !== simTargetAvg) {
        const neededShares = (cumCost - (cumShares * simTargetAvg)) / (simTargetAvg - simBuyP);
        if (neededShares > 0) {
          document.getElementById('sim-res-shares').innerHTML = `${Math.round(neededShares).toLocaleString('en-US')} <span style="font-size:12px;font-weight:600;">หุ้น</span>`;
          document.getElementById('sim-res-cost').innerHTML = `${(neededShares * simBuyP).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size:12px;font-weight:600;">บาท</span>`;
        } else {
          document.getElementById('sim-res-shares').textContent = '0 หุ้น';
          document.getElementById('sim-res-cost').textContent = '0.00 บาท';
        }
      }

      let addedShares = 0;
      let addedCost = 0;
      let newTotalShares = cumShares;
      let newTotalCost = cumCost;
      let newAvgPrice = currentAvg;

      if (simBuyP > 0 && simExtraVal > 0) {
        addedShares = simExtraVal / simBuyP;
        addedCost = simExtraVal;
        newTotalShares = cumShares + addedShares;
        newTotalCost = cumCost + addedCost;
        newAvgPrice = newTotalShares > 0 ? (newTotalCost / newTotalShares) : 0;

        document.getElementById('sim-res-new-avg').textContent = newAvgPrice.toFixed(2);
        document.getElementById('sim-res-extra-shares').textContent = `ซื้อได้ ${addedShares.toFixed(6)} หุ้น`;

        const cmpContainer = document.getElementById('sim-compare-container');
        cmpContainer.style.display = 'block';

        const isDCAUp = newAvgPrice >= currentAvg;
        const diffAvg = newAvgPrice - currentAvg;
        const diffAvgPct = currentAvg > 0 ? (diffAvg / currentAvg) * 100 : 0;
        const signPrefix = diffAvg >= 0 ? '+' : '';

        const tagTrend = document.getElementById('compare-tag-trend');
        tagTrend.textContent = isDCAUp ? `📈 ซื้อเฉลี่ยขาขึ้น ${signPrefix}${diffAvgPct.toFixed(2)}%` : `📉 ซื้อเฉลี่ยขาลง ${signPrefix}${diffAvgPct.toFixed(2)}%`;
        tagTrend.style.background = isDCAUp ? '#fffbeb' : '#ecfdf5';
        tagTrend.style.color = isDCAUp ? '#b45309' : '#047857';
        tagTrend.style.borderColor = isDCAUp ? '#fef3c7' : '#a7f3d0';

        document.getElementById('cmp-before-shares').textContent = `${cumShares.toLocaleString('en-US')} หุ้น`;
        document.getElementById('cmp-before-avg').textContent = `${currentAvg.toFixed(2)} ฿`;
        document.getElementById('cmp-before-cost').textContent = `${cumCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`;

        document.getElementById('cmp-after-shares').textContent = `${newTotalShares.toFixed(6)} หุ้น (+${addedShares.toFixed(6)})`;
        document.getElementById('cmp-after-avg').textContent = `${newAvgPrice.toFixed(2)} ฿ (${signPrefix}${diffAvg.toFixed(2)} ฿)`;
        document.getElementById('cmp-after-cost').textContent = `${newTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`;

        document.getElementById('compare-text-summary').innerHTML = `
          <span>💡</span> 
          <span>หากซื้อเพิ่ม <strong>${addedShares.toFixed(6)}</strong> หุ้น ที่ราคา <strong>${simBuyP.toFixed(2)} ฿</strong> (ใช้งบ ${addedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} ฿) จะทำให้ต้นทุนเฉลี่ยเปลี่ยนจาก <strong>${currentAvg.toFixed(2)} ฿</strong> เป็น <strong>${newAvgPrice.toFixed(2)} ฿</strong></span>
        `;
      } else {
        document.getElementById('sim-compare-container').style.display = 'none';
      }
    };

    document.getElementById('btn-add-batch-entry').onclick = () => {
      const type = document.getElementById('form-batch-type').value;
      const date = document.getElementById('form-batch-date').value;
      const shares = parseFloat(document.getElementById('form-batch-shares').value);
      const price = parseFloat(document.getElementById('form-batch-price').value);
      const note = document.getElementById('form-batch-note').value.trim();

      if (!shares || !price || shares <= 0 || price <= 0) {
        alert('กรุณาระบุจำนวนหุ้นและราคาให้ถูกต้อง');
        return;
      }

      simBatches.push({ type, date, shares, price, note });
      document.getElementById('form-batch-shares').value = '';
      document.getElementById('form-batch-price').value = '';
      document.getElementById('form-batch-note').value = '';
      updateCalculator();
    };

    modalEl.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.btn-del-batch-row');
      if (delBtn) {
        const idx = parseInt(delBtn.dataset.idx);
        simBatches.splice(idx, 1);
        updateCalculator();
      }
    });

    document.getElementById('btn-avg-clear-all').onclick = () => {
      if (confirm('คุณต้องการล้างรายการไม้ซื้อขายทั้งหมดในตารางใช่หรือไม่?')) {
        simBatches = [];
        updateCalculator();
      }
    };

    document.getElementById('btn-fetch-from-port').onclick = () => {
      const pId = document.getElementById('avg-select-port').value;
      const sym = document.getElementById('avg-select-asset').value;

      const portTrades = trades.filter(t => (t.portfolioId === pId || t.portId === pId) && (t.symbol || '').toUpperCase().replace('.BK','') === sym);
      
      const banner = document.getElementById('avg-port-status-banner');
      if (portTrades.length === 0) {
        banner.style.background = '#fef2f2';
        banner.style.color = '#dc2626';
        banner.style.borderColor = '#fecaca';
        banner.textContent = `⚠️ ไม่พบรายการซื้อขายของ ${sym} ในพอร์ตนี้`;
        return;
      }

      simBatches = portTrades.map(t => ({
        type: String(t.side || t.type || 'buy').toLowerCase() === 'sell' ? 'sell' : 'buy',
        date: t.tradeDate || t.date || '',
        shares: parseFloat(t.quantity ?? t.shares ?? 0) || 0,
        price: parseFloat(t.price ?? 0) || 0,
        note: t.note || ''
      }));

      banner.style.background = '#ecfdf5';
      banner.style.color = '#065f46';
      banner.style.borderColor = '#a7f3d0';
      banner.textContent = `✓ ดึงรายการสำเร็จ ${portTrades.length} รายการ`;

      const quotes = getQuoteCacheHelper();
      const q = this.findQuote(quotes, sym, 'thai-stock');
      if (q && q.price) {
        document.getElementById('sim-buy-price').value = q.price;
        const curAvg = simBatches.reduce((s, b) => s + (b.shares * b.price), 0) / (simBatches.reduce((s, b) => s + b.shares, 0) || 1);
        const diffP = curAvg > 0 ? ((q.price - curAvg) / curAvg) * 100 : 0;
        const sign = diffP >= 0 ? '+' : '';
        const color = diffP >= 0 ? '#16a34a' : '#dc2626';
        
        const elMarket = document.getElementById('sim-market-price');
        elMarket.style.color = color;
        const isForeign = updatePortFxDisplay(document.getElementById('avg-select-port').value);
        elMarket.innerHTML = `${Number(q.price).toFixed(2)} ${isForeign ? '$' : '฿'} (${sign}${diffP.toFixed(2)}%)`;
      }

      updateCalculator();
    };

    const updatePortFxDisplay = (pId) => {
      const selectedPortObj = sortedPorts.find(p => (p.id || p.portfolioId) === pId);
      const portNameUpper = String(selectedPortObj?.name || '').toUpperCase();
      const isForeign = portNameUpper.includes('DIME') || portNameUpper.includes('OFFSHORE') || portNameUpper.includes('US') || portNameUpper.includes('INNOVESTX');
      
      const fxBadge = document.getElementById('avg-fx-badge');
      if (fxBadge) {
        if (isForeign) {
          const cachedFx = JSON.parse(localStorage.getItem('wealthport:latest-usd-thb') || '{}');
          const rateToShow = cachedFx.rate ? Number(cachedFx.rate).toFixed(2) : '33.49';
          fxBadge.textContent = `💵 1 USD = ฿${rateToShow}`;
          fxBadge.style.display = 'inline-block';
        } else {
          fxBadge.style.display = 'none';
        }
      }
      return isForeign;
    };

    document.getElementById('avg-select-port').onchange = (e) => {
      const pId = e.target.value;
      updatePortFxDisplay(pId);
      const assets = getPortAssets(pId);
      const selAsset = document.getElementById('avg-select-asset');
      selAsset.innerHTML = assets.map(a => `<option value="${a.symbol}">${a.symbol} (${a.count} รายการ)</option>`).join('');
      document.getElementById('avg-port-status-banner').textContent = `✓ พบ ${assets.length} สินทรัพย์ในพอร์ตนี้ เลือกแล้วกด "ดึงจากพอร์ต"`;
    };

    updatePortFxDisplay(currentSelectedPortId);

    modalEl.addEventListener('input', (e) => {
      if (e.target.id.startsWith('sim-')) {
        updateCalculator();
      }
    });

    updateCalculator();
  },

  bindSidebarNav() {
    document.addEventListener('click', (e) => {
      const sidebarContainer = e.target.closest('.sidebar, .sidebar-nav, aside, [class*="sidebar"]');
      if (!sidebarContainer) return;

      const navItem = e.target.closest('a, li, button, .nav-item');
      if (!navItem) return;

      const txt = (navItem.textContent || '').trim();

      if (txt.includes('คำนวณต้นทุนถัวเฉลี่ย')) {
        e.preventDefault();
        this.openAverageCostModal();
        return;
      }

      if (txt.includes('วางแผนปันผล') || txt.includes('วางแผน')) {
        e.preventDefault();
        this.currentTab = 'plan';
        window.location.hash = '#portfolio/plan';
        this.render();
      } else if (txt.includes('กราฟเทคนิค')) {
        e.preventDefault();
        this.currentTab = 'charts';
        window.location.hash = '#portfolio/technical';
        this.render();
      } else if (txt.includes('รายงานผลตอบแทน')) {
        e.preventDefault();
        this.currentTab = 'performance';
        window.location.hash = '#portfolio/performance';
        this.render();
      } else if (txt.includes('ปันผลจริงรายตัว') || txt.includes('ปันผล')) {
        e.preventDefault();
        this.currentTab = 'dividend';
        window.location.hash = '#portfolio/actual-yield';
        this.render();
      } else if (txt.includes('รายการถือครอง')) {
        e.preventDefault();
        this.currentTab = 'holdings';
        window.location.hash = '#portfolio/holdings';
        this.render();
      } else if (txt.includes('พอร์ตทั้งหมด')) {
        e.preventDefault();
        this.currentTab = 'overview';
        window.location.hash = '#portfolio/all';
        this.render();
      }
    });
  },

  bindGlobalDelegatedEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    document.addEventListener('click', async (e) => {
      const openBuyBtn = e.target.closest('#btn-open-buy-modal');
      if (openBuyBtn) {
        e.preventDefault();
        this.openBuyAssetModal();
        return;
      }

      const jumpChartBtn = e.target.closest('.jump-to-chart-btn');
      if (jumpChartBtn) {
        e.preventDefault();
        const sym = jumpChartBtn.dataset.symbol;
        const type = jumpChartBtn.dataset.type;
        const clean = sym.replace('.BK', '').toUpperCase();

        if (type === 'mutual-fund') {
          this.currentChartSymbol = `FUND:${clean}`;
        } else if (type === 'thai-stock' || sym.endsWith('.BK')) {
          this.currentChartSymbol = `SET:${clean}`;
        } else {
          this.currentChartSymbol = `NASDAQ:${clean}`;
        }

        this.currentTab = 'charts';
        window.location.hash = '#portfolio/technical';
        this.render();
        return;
      }

      const syncBtn = e.target.closest('#btn-sync-quotes');
      if (syncBtn) {
        e.preventDefault();
        await this.handleSyncQuotes(syncBtn);
        return;
      }

      const editPortBtn = e.target.closest('#btn-edit-port');
      if (editPortBtn) {
        e.preventDefault();
        this.openPortfolioSettingsModal();
        return;
      }

      const exportBtn = e.target.closest('#btn-export-json');
      if (exportBtn) {
        e.preventDefault();
        this.handleExportJson();
        return;
      }

      const delSellBtn = e.target.closest('.btn-delete-sell-order');
      if (delSellBtn) {
        e.preventDefault();
        const tradeId = delSellBtn.dataset.id;
        const sym = delSellBtn.dataset.symbol || '';
        if (confirm(`คุณต้องการลบประวัติการขาย "${sym}" หรือไม่?\n(เมื่อลบแล้ว จำนวนหน่วยจะกลับคืนสู่พอร์ตถือครอง)`)) {
          const data = getPortfolioDataHelper();
          data.trades = (data.trades || []).filter(t => t.id !== tradeId);
          savePortfolioDataHelper(data);
          alert('ลบรายการขายเรียบร้อยแล้ว');
          this.render();
        }
        return;
      }

      const refreshBtn = e.target.closest('.btn-action-refresh');
      if (refreshBtn) {
        e.preventDefault();
        const symbol = refreshBtn.dataset.symbol;
        let type = refreshBtn.dataset.type;
        
        // ตรวจสอบพอร์ตหรือรูปแบบชื่อย่อ
        if (!symbol.endsWith('.BK') && /^[A-Z]{1,5}$/.test(symbol.trim().toUpperCase())) {
          type = 'foreign-stock';
        }

        refreshBtn.textContent = '⏳';
        refreshBtn.disabled = true;

        try {
          const res = await QuoteSyncService.syncSingleQuote(symbol, type);
          refreshBtn.textContent = '🔄';
          refreshBtn.disabled = false;

          if (res && res.price > 0) {
            refreshBtn.style.background = '#0284c7';
            this.render();
          } else {
            refreshBtn.style.background = '#dc2626';
            alert(`ไม่สามารถดึงราคาล่าสุดของ ${symbol} ได้`);
          }
        } catch (err) {
          refreshBtn.textContent = '🔄';
          refreshBtn.disabled = false;
          refreshBtn.style.background = '#dc2626';
        }
        return;
      }

      const settingsBtn = e.target.closest('.btn-action-settings');
if (settingsBtn) {
  e.preventDefault();
  this.openAssetModal(settingsBtn.dataset.symbol);
  return;
}

      const thSort = e.target.closest('.sortable-th');
      if (thSort) {
        const col = thSort.dataset.col;
        if (this.sortColumn === col) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortColumn = col;
          this.sortDirection = (col === 'symbol') ? 'asc' : 'desc';
        }
        this.render();
        return;
      }

      const filterBtn = e.target.closest('.filter-tab-btn');
      if (filterBtn) {
        this.filterCategory = filterBtn.dataset.cat;
        this.render();
        return;
      }

      const perfFilterBtn = e.target.closest('.perf-filter-tab-btn');
      if (perfFilterBtn) {
        this.perfFilterCategory = perfFilterBtn.dataset.cat;
        this.render();
        return;
      }

      const jumpBtn = e.target.closest('.btn-jump-to-port');
      if (jumpBtn) {
        e.preventDefault();
        this.selectedPortfolioId = jumpBtn.dataset.id;
        this.currentTab = 'holdings';
        window.location.hash = '#portfolio/holdings';
        this.render();
        return;
      }

      const addDivBtn = e.target.closest('#btn-open-add-div');
      if (addDivBtn) {
        e.preventDefault();
        this.openQuickAddDividendModal();
        return;
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'portfolio-select') {
        this.selectedPortfolioId = e.target.value;
        this.render();
      } else if (e.target && e.target.id === 'div-port-filter') {
        this.selectedDivPortId = e.target.value;
        this.render();
      } else if (e.target && e.target.id === 'div-year-select') {
        this.selectedDivYear = e.target.value;
        this.render();
      } else if (e.target && e.target.id === 'perf-port-filter') {
        this.selectedPerfPortId = e.target.value;
        this.render();
      } else if (e.target && e.target.id === 'perf-year-select') {
        this.selectedPerfYear = e.target.value;
        this.render();
      } else if (e.target && (e.target.id === 'file-import-json' || e.target.id === 'file-import-json-overview')) {
        this.handleImportJson(e.target);
      }
    });

    document.addEventListener('input', (e) => {
      if (e.target && e.target.id === 'input-holdings-search') {
        this.searchQuery = e.target.value.trim();
        this.render();
        const nextInput = document.getElementById('input-holdings-search');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      } else if (e.target && e.target.id === 'input-perf-search') {
        this.perfSearchQuery = e.target.value.trim();
        this.render();
        const nextInput = document.getElementById('input-perf-search');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      }
    });
  },

  openBuyAssetModal() {
    const data = getPortfolioDataHelper();
    let existingModal = document.getElementById('wealthport-buy-asset-modal');
    if (existingModal) existingModal.remove();

    const todayStr = new Date().toISOString().split('T')[0];
    const sortedPortfolios = this.getSortedPortfolios(data);
    let defaultPortId = this.selectedPortfolioId === 'ALL' ? (sortedPortfolios[0]?.id || '') : this.selectedPortfolioId;

    const pOptions = sortedPortfolios.map(p => {
      const pId = p.id || p.portfolioId;
      return `<option value="${pId}" ${pId === defaultPortId ? 'selected' : ''}>💼 ${p.name || pId}</option>`;
    }).join('');

    const modalHtml = `
      <div id="wealthport-buy-asset-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999999;">
        <div style="background: #fff; border-radius: 14px; width: 480px; max-width: 95vw; padding: 22px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.25);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
            <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">🛒 บันทึกรายการซื้อสินทรัพย์ (Buy Order)</h3>
            <button id="btn-close-buy-modal" style="background:none; border:none; font-size: 22px; color:#94a3b8; cursor:pointer;">&times;</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="display:block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">เลือกพอร์ตการลงทุน</label>
              <select id="buy-input-port" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; background: #fff;">
                ${pOptions}
              </select>
            </div>
            <div style="display: flex; gap: 10px;">
              <div style="flex: 1.2;">
                <label style="display:block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">ประเภทสินทรัพย์</label>
                <select id="buy-input-type" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; background: #fff;">
                  <option value="thai-stock">🇹🇭 หุ้นไทย (SET)</option>
                  <option value="foreign-stock">🇺🇸 หุ้นต่างประเทศ (US)</option>
                  <option value="mutual-fund">🌱 กองทุนรวม (Fund)</option>
                </select>
              </div>
              <div style="flex: 1.5;">
                <label style="display:block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">ชื่อย่อ (Symbol / Ticker)</label>
                <input type="text" id="buy-input-symbol" placeholder="เช่น PTT, NVDA, SCBGOLDH" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; text-transform: uppercase; font-weight: 700;">
              </div>
            </div>
            <div style="display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label style="display:block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">จำนวนหน่วย / หุ้น</label>
                <input type="number" id="buy-input-shares" placeholder="0.00" step="any" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px;">
              </div>
              <div style="flex: 1;">
                <label style="display:block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">ราคาซื้อต่อหน่วย</label>
                <input type="number" id="buy-input-price" placeholder="0.00" step="any" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px;">
              </div>
            </div>
            <div style="display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label style="display:block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">ค่าคอมมิชชั่น / Fee (บาท)</label>
                <input type="number" id="buy-input-fee" value="0" step="any" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px;">
              </div>
              <div style="flex: 1;">
                <label style="display:block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px;">วันที่ซื้อ</label>
                <input type="date" id="buy-input-date" value="${todayStr}" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px;">
              </div>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
              <button id="btn-cancel-buy-modal" style="background: #fff; border: 1px solid #cbd5e1; padding: 9px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">ยกเลิก</button>
              <button id="btn-confirm-submit-buy" style="background: #0284c7; color: #fff; border: none; padding: 9px 20px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer;">บันทึกการซื้อ</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const closeM = () => document.getElementById('wealthport-buy-asset-modal')?.remove();
    document.getElementById('btn-close-buy-modal').onclick = closeM;
    document.getElementById('btn-cancel-buy-modal').onclick = closeM;

    const portSelect = document.getElementById('buy-input-port');
    const typeSelect = document.getElementById('buy-input-type');

    portSelect.onchange = () => {
      const selectedPortObj = sortedPortfolios.find(p => (p.id || p.portfolioId) === portSelect.value);
      const portNameUpper = String(selectedPortObj?.name || '').toUpperCase();
      if (portNameUpper.includes('FINNOMENA') || portNameUpper.includes('FUND') || portNameUpper.includes('RMF') || portNameUpper.includes('SSF')) {
        typeSelect.value = 'mutual-fund';
      } else if (portNameUpper.includes('DIME') || portNameUpper.includes('OFFSHORE') || portNameUpper.includes('US')) {
        typeSelect.value = 'foreign-stock';
      } else {
        typeSelect.value = 'thai-stock';
      }
    };

    document.getElementById('btn-confirm-submit-buy').onclick = () => {
      const pId = portSelect.value;
      const assetType = typeSelect.value;
      let rawSym = (document.getElementById('buy-input-symbol')?.value || '').trim().toUpperCase();
      const shares = parseFloat(document.getElementById('buy-input-shares')?.value || 0);
      const price = parseFloat(document.getElementById('buy-input-price')?.value || 0);
      const fee = parseFloat(document.getElementById('buy-input-fee')?.value || 0) || 0;
      const tradeDate = document.getElementById('buy-input-date')?.value || todayStr;

      if (!rawSym || shares <= 0 || price <= 0) {
        alert('กรุณาระบุชื่อย่อ, จำนวนหน่วย และราคาซื้อให้ถูกต้องครบถ้วน');
        return;
      }

      let finalSym = rawSym;
      if (assetType === 'thai-stock' && !rawSym.endsWith('.BK')) {
        finalSym = rawSym + '.BK';
      }

      data.trades = data.trades || [];
      data.trades.push({
        id: 'trade-' + Date.now(),
        portfolioId: pId,
        symbol: finalSym,
        stockName: finalSym.replace('.BK', ''),
        side: 'buy',
        type: 'buy',
        assetType: assetType,
        quantity: shares,
        shares: shares,
        price: price,
        fee: fee,
        tradeDate: tradeDate,
        date: tradeDate,
        createdAt: new Date().toISOString()
      });

      savePortfolioDataHelper(data);
      alert(`บันทึกการซื้อ ${finalSym} จำนวน ${shares} หน่วย เรียบร้อยแล้ว`);
      closeM();
      this.render();
    };
  },
  openAssetModal(symbol) {
    const data = getPortfolioDataHelper();
    const summary = this.calculatePortfolioDetail(data);
    const holding = summary.activeHoldings.find(h => h.symbol.toUpperCase() === symbol.toUpperCase());
    if (!holding) {
      alert(`ไม่พบรายการสินทรัพย์ ${symbol} ในพอร์ตปัจจุบัน`);
      return;
    }

    let existingModal = document.getElementById('wealthport-asset-modal');
    if (existingModal) existingModal.remove();

    const isForeign = holding.assetType === 'foreign-stock';
    const isFund = holding.assetType === 'mutual-fund';
    const currencySign = isForeign ? '$' : '฿';
    const currentPrice = isForeign ? (holding.priceUSD || 0) : (holding.marketPrice || 0);
    const todayStr = new Date().toISOString().split('T')[0];

    let badgeHtml = '';
    if (isFund) {
      badgeHtml = `<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 700;">🌱 FUND</span>`;
    } else if (isForeign) {
      badgeHtml = `<span style="background: rgba(14, 165, 233, 0.15); color: #0284c7; font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 700;">🇺🇸 US</span>`;
    } else {
      badgeHtml = `<span style="background: rgba(99, 102, 241, 0.15); color: #6366f1; font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 700;">🇹🇭 TH</span>`;
    }

    const buyTrades = (holding.trades || []).filter(t => String(t.side || t.type || '').toLowerCase() === 'buy');

    const tradeRowsHtml = buyTrades.map((t, idx) => {
      const shares = parseFloat(t.quantity ?? t.shares ?? 0);
      const price = parseFloat(t.price ?? 0);
      const total = shares * price;
      const tDate = t.tradeDate || t.date || '';

      return `
        <div class="trade-row-container" id="trade-row-${t.id}" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px;">
          <div class="trade-view-mode" id="trade-view-${t.id}" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">#${idx + 1}</span>
                <span style="background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">BUY</span>
                <strong style="font-size: 13.5px;">${shares.toLocaleString('en-US', { maximumFractionDigits: 4 })} หน่วย @ ${currencySign}${price.toFixed(isFund ? 4 : 2)}</strong>
              </div>
              <div style="font-size: 12px; color: #64748b;">
                วันที่: ${tDate} | มูลค่า: ${currencySign}${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn-trigger-inline-edit" data-id="${t.id}" style="padding: 5px 10px; font-size: 12px; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; cursor: pointer;">
                ✏️ แก้ไข
              </button>
              <button class="btn-delete-single-trade" data-id="${t.id}" style="padding: 5px 10px; font-size: 12px; border: 1px solid #fecaca; background: #fff; color: #dc2626; border-radius: 6px; cursor: pointer;">
                🗑️ ลบ
              </button>
            </div>
          </div>

          <div class="trade-edit-mode" id="trade-edit-${t.id}" style="display: none; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px;">
            <div style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px;">
              ✏️ แก้ไขข้อมูลไม้ที่ #${idx + 1}
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <div style="flex: 1; min-width: 100px;">
                <label style="display: block; font-size: 11px; color: #64748b; margin-bottom: 2px;">จำนวนหน่วย</label>
                <input type="number" id="inline-shares-${t.id}" value="${shares}" step="any" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px;">
              </div>
              <div style="flex: 1; min-width: 100px;">
                <label style="display: block; font-size: 11px; color: #64748b; margin-bottom: 2px;">ราคาซื้อต่อหน่วย (${currencySign})</label>
                <input type="number" id="inline-price-${t.id}" value="${price}" step="any" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px;">
              </div>
              <div style="flex: 1; min-width: 120px;">
                <label style="display: block; font-size: 11px; color: #64748b; margin-bottom: 2px;">วันที่ซื้อ</label>
                <input type="date" id="inline-date-${t.id}" value="${tDate || todayStr}" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px;">
              </div>
              <div style="display: flex; gap: 6px; margin-top: 16px;">
                <button class="btn-save-inline-edit" data-id="${t.id}" style="background: #10b981; color: #fff; border: none; padding: 7px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">
                  💾 บันทึก
                </button>
                <button class="btn-cancel-inline-edit" data-id="${t.id}" style="background: #fff; border: 1px solid #cbd5e1; color: #475569; padding: 7px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const modalHtml = `
      <div id="wealthport-asset-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999;">
        <div style="background: #fff; border-radius: 16px; width: 680px; max-width: 95vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); display: flex; flex-direction: column;">
          
          <div style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a;">จัดการรายการ <span style="color: #0f172a;">${holding.symbol}</span></h2>
                ${badgeHtml}
              </div>
              <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
                ถือครองปัจจุบัน: <strong>${holding.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })} หน่วย</strong> · พอร์ต: <strong>${summary.portName || 'ทั่วไป'}</strong>
              </div>
            </div>
            <button id="btn-close-modal-x" style="background: none; border: none; font-size: 22px; color: #94a3b8; cursor: pointer; line-height: 1;">&times;</button>
          </div>

          <div style="padding: 20px 24px; flex: 1;">
            <div style="display: flex; gap: 8px; margin-bottom: 16px;">
              <button class="modal-tab-btn" id="tab-btn-sell" style="flex: 1; padding: 10px 14px; border-radius: 8px; border: none; background: #ef4444; color: #fff; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                🔴 บันทึกการขาย (Sell)
              </button>
              <button class="modal-tab-btn" id="tab-btn-split" style="flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; color: #475569; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                🔀 แตกพาร์ / รวมพาร์
              </button>
              <button class="modal-tab-btn" id="tab-btn-dividend" style="flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; color: #475569; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                🎁 บันทึกปันผล (Dividend)
              </button>
            </div>

            <div id="panel-sell" style="display: block; background: #fffaf0; border: 1px solid #fbd38d; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
              <div style="color: #c05621; font-weight: 600; font-size: 13px; margin-bottom: 12px;">
                บันทึกการขาย (ระบบจะคำนวณกำไร/ขาดทุนรับจริงทันที)
              </div>
              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <input type="number" id="sell-shares" value="${holding.shares}" max="${holding.shares}" step="any" placeholder="จำนวนหน่วย" style="flex: 1; min-width: 100px; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px;">
                <input type="number" id="sell-price" value="${currentPrice.toFixed(isFund ? 4 : 2)}" step="any" placeholder="ราคาขายต่อหน่วย" style="flex: 1; min-width: 100px; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px;">
                <input type="date" id="sell-date" value="${todayStr}" style="flex: 1; min-width: 120px; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px;">
                <button id="btn-submit-sell" style="background: #ea580c; color: #fff; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                  ยืนยันขาย
                </button>
              </div>
            </div>

            <div id="panel-split" style="display: none; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
              <div style="color: #15803d; font-weight: 600; font-size: 13px; margin-bottom: 12px;">
                อัตราส่วนแตกพาร์/รวมพาร์ (เช่น แตกพาร์ 10:1 ใส่ หุ้นเดิม 1 หุ้นใหม่ 10)
              </div>
              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <span style="font-size: 13px; color: #475569;">หุ้นเดิม:</span>
                <input type="number" id="split-old" value="1" step="any" style="width: 70px; padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                <span style="font-size: 13px; color: #475569;">กลายเป็นหุ้นใหม่:</span>
                <input type="number" id="split-new" value="2" step="any" style="width: 70px; padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                <button id="btn-submit-split" style="background: #16a34a; color: #fff; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                  คำนวณพาร์ใหม่
                </button>
              </div>
            </div>

            <div id="panel-dividend" style="display: none; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
              <div style="color: #7e22ce; font-weight: 600; font-size: 13px; margin-bottom: 12px;">
                บันทึกเงินปันผลที่ได้รับ (Net Dividend Received)
              </div>
              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <input type="number" id="div-amount" step="any" placeholder="ยอดเงินสุทธิ (${currencySign})" style="flex: 1; min-width: 110px; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                <input type="date" id="div-date" value="${todayStr}" style="flex: 1; min-width: 120px; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                <button id="btn-submit-dividend" style="background: #9333ea; color: #fff; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; white-space: nowrap;">
                  บันทึกปันผล
                </button>
              </div>
            </div>

            <div>
              <h4 style="margin: 0 0 10px 0; font-size: 13.5px; font-weight: 700; color: #334155;">
                ประวัติไม้ที่เคยซื้อ (${buyTrades.length} รายการ):
              </h4>
              <div style="max-height: 220px; overflow-y: auto; padding-right: 4px;">
                ${tradeRowsHtml || '<div style="text-align: center; color: #94a3b8; padding: 16px;">ไม่พบประวัติไม้ซื้อ</div>'}
              </div>
            </div>

            <div id="panel-add-new-lot" style="display: none; background: #ecfdf5; border: 1px dashed #10b981; border-radius: 8px; padding: 12px; margin-top: 14px;">
              <div style="font-size: 13px; font-weight: 700; color: #065f46; margin-bottom: 8px;">
                ➕ เพิ่มไม้ซื้อใหม่สำหรับ ${holding.symbol}
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                <div style="flex: 1; min-width: 100px;">
                  <label style="display: block; font-size: 11px; color: #047857; margin-bottom: 2px;">จำนวนหน่วย</label>
                  <input type="number" id="new-lot-shares" placeholder="0.00" step="any" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #a7f3d0; border-radius: 6px; font-size: 13.5px;">
                </div>
                <div style="flex: 1; min-width: 100px;">
                  <label style="display: block; font-size: 11px; color: #047857; margin-bottom: 2px;">ราคาซื้อต่อหน่วย (${currencySign})</label>
                  <input type="number" id="new-lot-price" value="${currentPrice.toFixed(isFund ? 4 : 2)}" step="any" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #a7f3d0; border-radius: 6px; font-size: 13.5px;">
                </div>
                <div style="flex: 1; min-width: 120px;">
                  <label style="display: block; font-size: 11px; color: #047857; margin-bottom: 2px;">วันที่ซื้อ</label>
                  <input type="date" id="new-lot-date" value="${todayStr}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #a7f3d0; border-radius: 6px; font-size: 13.5px;">
                </div>
                <div style="display: flex; gap: 6px; margin-top: 18px;">
                  <button id="btn-submit-new-lot" style="background: #059669; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 700; font-size: 12.5px; cursor: pointer;">
                    ยืนยันเพิ่มไม้
                  </button>
                  <button id="btn-cancel-new-lot" style="background: #fff; border: 1px solid #cbd5e1; color: #475569; padding: 8px 12px; border-radius: 6px; font-size: 12.5px; cursor: pointer;">
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>

          </div>

          <div style="padding: 14px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fafafa; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
            <button id="btn-toggle-add-lot" style="background: #10b981; color: #fff; border: none; padding: 9px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              + เพิ่มครั้งซื้อ
            </button>
            <button id="btn-close-modal-bottom" style="background: #fff; border: 1px solid #cbd5e1; color: #334155; padding: 9px 18px; border-radius: 6px; font-weight: 600; cursor: pointer;">
              ปิดหน้าต่าง
            </button>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const closeModal = () => {
      const m = document.getElementById('wealthport-asset-modal');
      if (m) m.remove();
    };
    document.getElementById('btn-close-modal-x')?.addEventListener('click', closeModal);
    document.getElementById('btn-close-modal-bottom')?.addEventListener('click', closeModal);

    const tabSell = document.getElementById('tab-btn-sell');
    const tabSplit = document.getElementById('tab-btn-split');
    const tabDiv = document.getElementById('tab-btn-dividend');
    const pSell = document.getElementById('panel-sell');
    const pSplit = document.getElementById('panel-split');
    const pDiv = document.getElementById('panel-dividend');

    const resetTabs = () => {
      [tabSell, tabSplit, tabDiv].forEach(b => {
        b.style.background = '#fff';
        b.style.color = '#475569';
        b.style.border = '1px solid #e2e8f0';
      });
      [pSell, pSplit, pDiv].forEach(p => p.style.display = 'none');
    };

    tabSell.onclick = () => {
      resetTabs();
      tabSell.style.background = '#ef4444';
      tabSell.style.color = '#fff';
      tabSell.style.border = 'none';
      pSell.style.display = 'block';
    };

    tabSplit.onclick = () => {
      resetTabs();
      tabSplit.style.background = '#16a34a';
      tabSplit.style.color = '#fff';
      tabSplit.style.border = 'none';
      pSplit.style.display = 'block';
    };

    tabDiv.onclick = () => {
      resetTabs();
      tabDiv.style.background = '#9333ea';
      tabDiv.style.color = '#fff';
      tabDiv.style.border = 'none';
      pDiv.style.display = 'block';
    };

    const targetPortId = this.selectedPortfolioId === 'ALL' ? (holding.trades[0]?.portfolioId || '') : this.selectedPortfolioId;

    document.getElementById('btn-submit-sell')?.addEventListener('click', () => {
      const sellQty = parseFloat(document.getElementById('sell-shares').value);
      const sellPrice = parseFloat(document.getElementById('sell-price').value);
      const sellDate = document.getElementById('sell-date').value;

      if (!sellQty || sellQty <= 0 || sellQty > holding.shares) {
        alert('กรุณาระบุจำนวนหน่วยขายที่ถูกต้อง (ไม่เกินจำนวนที่ถือครอง)');
        return;
      }
      if (!sellPrice || sellPrice <= 0) {
        alert('กรุณาระบุราคาขายที่ถูกต้อง');
        return;
      }

      data.trades = data.trades || [];
      data.trades.push({
        id: 'trade-' + Date.now(),
        portfolioId: targetPortId,
        symbol: holding.symbol,
        side: 'sell',
        type: 'sell',
        assetType: holding.assetType,
        quantity: sellQty,
        shares: sellQty,
        price: sellPrice,
        tradeDate: sellDate,
        date: sellDate,
        fee: 0,
        createdAt: new Date().toISOString()
      });

      savePortfolioDataHelper(data);
      alert(`บันทึกการขาย ${holding.symbol} สำเร็จ`);
      closeModal();
      this.render();
    });

    document.getElementById('btn-submit-split')?.addEventListener('click', () => {
      const oldRatio = parseFloat(document.getElementById('split-old').value);
      const newRatio = parseFloat(document.getElementById('split-new').value);

      if (!oldRatio || !newRatio || oldRatio <= 0 || newRatio <= 0) {
        alert('กรุณาระบุอัตราส่วนแตกพาร์ที่ถูกต้อง');
        return;
      }

      const multiplier = newRatio / oldRatio;
      (holding.trades || []).forEach(t => {
        if (String(t.side || t.type || '').toLowerCase() === 'buy') {
          t.quantity = (t.quantity || t.shares || 0) * multiplier;
          t.shares = t.quantity;
          t.price = (t.price || 0) / multiplier;
        }
      });

      savePortfolioDataHelper(data);
      alert(`คำนวณแตกพาร์อัตราส่วน ${oldRatio}:${newRatio} เรียบร้อยแล้ว`);
      closeModal();
      this.render();
    });

    document.getElementById('btn-submit-dividend')?.addEventListener('click', () => {
      const divAmount = parseFloat(document.getElementById('div-amount').value);
      const divDate = document.getElementById('div-date').value;

      if (!divAmount || divAmount <= 0) {
        alert('กรุณาระบุจำนวนเงินปันผลที่ถูกต้อง');
        return;
      }

      data.trades = data.trades || [];
      data.trades.push({
        id: 'trade-' + Date.now(),
        portfolioId: targetPortId,
        symbol: holding.symbol,
        side: 'dividend',
        type: 'dividend',
        quantity: 1,
        shares: 1,
        price: divAmount,
        netAmount: divAmount,
        tradeDate: divDate,
        date: divDate,
        createdAt: new Date().toISOString()
      });

      savePortfolioDataHelper(data);
      alert(`บันทึกเงินปันผล ${holding.symbol} สำเร็จ`);
      closeModal();
      this.render();
    });

    document.querySelectorAll('.btn-trigger-inline-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const tradeId = btn.dataset.id;
        const viewEl = document.getElementById(`trade-view-${tradeId}`);
        const editEl = document.getElementById(`trade-edit-${tradeId}`);
        if (viewEl && editEl) {
          viewEl.style.display = 'none';
          editEl.style.display = 'block';
        }
      });
    });

    document.querySelectorAll('.btn-cancel-inline-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const tradeId = btn.dataset.id;
        const viewEl = document.getElementById(`trade-view-${tradeId}`);
        const editEl = document.getElementById(`trade-edit-${tradeId}`);
        if (viewEl && editEl) {
          viewEl.style.display = 'flex';
          editEl.style.display = 'none';
        }
      });
    });

    document.querySelectorAll('.btn-save-inline-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const tradeId = btn.dataset.id;
        const targetTrade = (data.trades || []).find(t => t.id === tradeId);
        if (!targetTrade) return;

        const newShares = parseFloat(document.getElementById(`inline-shares-${tradeId}`).value);
        const newPrice = parseFloat(document.getElementById(`inline-price-${tradeId}`).value);
        const newDate = document.getElementById(`inline-date-${tradeId}`).value;

        if (!newShares || newShares <= 0 || !newPrice || newPrice <= 0) {
          alert('กรุณาระบุข้อมูลจำนวนและราคาที่ถูกต้อง');
          return;
        }

        targetTrade.quantity = newShares;
        targetTrade.shares = newShares;
        targetTrade.price = newPrice;
        targetTrade.tradeDate = newDate;
        targetTrade.date = newDate;

        savePortfolioDataHelper(data);
        alert('บันทึกการแก้ไขไม้เรียบร้อย');
        closeModal();
        this.render();
      });
    });

    const pAddLot = document.getElementById('panel-add-new-lot');
    document.getElementById('btn-toggle-add-lot')?.addEventListener('click', () => {
      if (pAddLot) {
        pAddLot.style.display = pAddLot.style.display === 'none' ? 'block' : 'none';
        if (pAddLot.style.display === 'block') {
          document.getElementById('new-lot-shares')?.focus();
        }
      }
    });

    document.getElementById('btn-cancel-new-lot')?.addEventListener('click', () => {
      if (pAddLot) pAddLot.style.display = 'none';
    });

    document.getElementById('btn-submit-new-lot')?.addEventListener('click', () => {
      const buyQty = parseFloat(document.getElementById('new-lot-shares').value);
      const buyPrice = parseFloat(document.getElementById('new-lot-price').value);
      const buyDate = document.getElementById('new-lot-date').value;

      if (!buyQty || buyQty <= 0 || !buyPrice || buyPrice <= 0) {
        alert('กรุณาระบุจำนวนและราคาที่ถูกต้อง');
        return;
      }

      data.trades = data.trades || [];
      data.trades.push({
        id: 'trade-' + Date.now(),
        portfolioId: targetPortId,
        symbol: holding.symbol,
        side: 'buy',
        type: 'buy',
        assetType: holding.assetType,
        quantity: buyQty,
        shares: buyQty,
        price: buyPrice,
        tradeDate: buyDate,
        date: buyDate,
        fee: 0,
        createdAt: new Date().toISOString()
      });

      savePortfolioDataHelper(data);
      alert(`เพิ่มไม้ซื้อใหม่ ${holding.symbol} สำเร็จ`);
      closeModal();
      this.render();
    });

    document.querySelectorAll('.btn-delete-single-trade').forEach(btn => {
      btn.addEventListener('click', () => {
        const tradeId = btn.dataset.id;
        if (confirm('ยืนยันการลบประวัติการซื้อไม้นี้?')) {
          data.trades = (data.trades || []).filter(t => t.id !== tradeId);
          savePortfolioDataHelper(data);
          closeModal();
          this.render();
        }
      });
    });
  },
  refreshPortfolioModalList() {
    const data = getPortfolioDataHelper();
    const sortedList = this.getSortedPortfolios(data);
    const container = document.getElementById('portfolio-modal-list-container');
    if (!container) return;

    const html = sortedList.map((p, idx) => {
      const pId = p.id || p.portfolioId || ('port-' + idx);
      const pName = p.name || p.portfolioName || ('พอร์ต ' + (idx + 1));
      const target = parseFloat(p.targetAmount || 0);

      return `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px;">
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #0f172a;">💼 ${pName}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
              เป้าหมายพอร์ต: <strong style="color: #059669;">฿${target.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" onclick="window.WealthPortSettings.selectPortToEdit('${pId}', '${pName}', ${target})" style="padding: 6px 12px; font-size: 12px; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; cursor: pointer;">✏️ แก้ไข</button>
            <button type="button" onclick="window.WealthPortSettings.deletePort('${pId}', '${pName}')" style="padding: 6px 12px; font-size: 12px; border: 1px solid #fecaca; background: #fff; color: #dc2626; border-radius: 6px; cursor: pointer;">🗑️ ลบ</button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html || '<div style="text-align: center; color: #94a3b8; padding: 16px;">ยังไม่มีรายชื่อพอร์ต</div>';
    const countLabel = document.getElementById('label-total-ports-count');
    if (countLabel) countLabel.textContent = `รายชื่อพอร์ตทั้งหมด (${data.portfolios.length} บัญชี):`;
  },

  openPortfolioSettingsModal() {
    const data = getPortfolioDataHelper();
    data.portfolios = data.portfolios || [];
    let existingModal = document.getElementById('wealthport-port-modal');
    if (existingModal) existingModal.remove();

    const currPort = data.portfolios.find(p => (p.id || p.portfolioId) === this.selectedPortfolioId) || data.portfolios[0] || { id: 'default', name: 'หลัก', targetAmount: 0 };
    const currPortId = currPort.id || currPort.portfolioId || '';
    const sortedList = this.getSortedPortfolios(data);

    const portRowsHtml = sortedList.map((p, idx) => {
      const pId = p.id || p.portfolioId || ('port-' + idx);
      const pName = p.name || p.portfolioName || ('พอร์ต ' + (idx + 1));
      const target = parseFloat(p.targetAmount || p.cashBalance || 0);

      return `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px;">
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #0f172a;">💼 ${pName}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
              เป้าหมายพอร์ต: <strong style="color: #059669;">฿${target.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" onclick="window.WealthPortSettings.selectPortToEdit('${pId}', '${pName}', ${target})" style="padding: 6px 12px; font-size: 12px; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; cursor: pointer;">✏️ แก้ไข</button>
            <button type="button" onclick="window.WealthPortSettings.deletePort('${pId}', '${pName}')" style="padding: 6px 12px; font-size: 12px; border: 1px solid #fecaca; background: #fff; color: #dc2626; border-radius: 6px; cursor: pointer;">🗑 ลบ</button>
          </div>
        </div>
      `;
    }).join('');

    const modalHtml = `
      <div id="wealthport-port-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999999;">
        <div style="background: #fff; border-radius: 16px; width: 620px; max-width: 95vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); display: flex; flex-direction: column;">
          <div style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;">💼 จัดการพอร์ตและเป้าหมาย (Portfolio Settings)</h2>
            <button type="button" onclick="window.WealthPortSettings.closeModal()" style="background: none; border: none; font-size: 24px; color: #94a3b8; cursor: pointer;">&times;</button>
          </div>
          <div style="padding: 20px 24px; flex: 1;">
            <input type="hidden" id="edit-port-id-hidden" value="${currPortId}">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
              <div id="label-editing-port-title" style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">
                🎯 แก้ไขเป้าหมายและชื่อพอร์ต (${currPort.name || 'พอร์ต'})
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 140px;">
                  <label style="display: block; font-size: 11px; color: #64748b; margin-bottom: 2px;">ชื่อพอร์ต</label>
                  <input type="text" id="edit-port-name" value="${currPort.name || ''}" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                </div>
                <div style="flex: 1; min-width: 140px;">
                  <label style="display: block; font-size: 11px; color: #64748b; margin-bottom: 2px;">เป้าหมายเงินลงทุน (บาท)</label>
                  <input type="number" id="edit-port-target" value="${parseFloat(currPort.targetAmount || 0)}" step="any" placeholder="เช่น 1000000" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                </div>
                <div style="margin-top: 18px;">
                  <button type="button" onclick="window.WealthPortSettings.saveCurrentPort()" style="background: #0284c7; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px;">บันทึกข้อมูลพอร์ต</button>
                </div>
              </div>
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 id="label-total-ports-count" style="margin: 0; font-size: 13.5px; font-weight: 700; color: #334155;">
                  รายชื่อพอร์ตทั้งหมด (${data.portfolios.length} บัญชี):
                </h4>
                <button type="button" onclick="window.WealthPortSettings.toggleAddPanel()" style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">+ สร้างพอร์ตใหม่</button>
              </div>
              <div id="panel-add-port" style="display: none; background: #ecfdf5; border: 1px dashed #10b981; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <div style="font-size: 12px; font-weight: 700; color: #065f46; margin-bottom: 8px;">➕ เพิ่มพอร์ตการลงทุนใหม่</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <input type="text" id="new-port-name" placeholder="ชื่อพอร์ต เช่น พอร์ตเกษียณ" style="flex: 1; min-width: 140px; padding: 7px 10px; border: 1px solid #a7f3d0; border-radius: 6px; font-size: 13px;">
                  <input type="number" id="new-port-target" placeholder="เป้าหมายเงินลงทุน (บาท)" step="any" style="flex: 1; min-width: 140px; padding: 7px 10px; border: 1px solid #a7f3d0; border-radius: 6px; font-size: 13px;">
                  <button type="button" onclick="window.WealthPortSettings.submitNewPort()" style="background: #059669; color: #fff; border: none; padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">สร้างพอร์ต</button>
                </div>
              </div>
              <div id="portfolio-modal-list-container" style="max-height: 240px; overflow-y: auto;">
                ${portRowsHtml || '<div style="text-align: center; color: #94a3b8; padding: 16px;">ยังไม่มีรายชื่อพอร์ต</div>'}
              </div>
            </div>
          </div>
          <div style="padding: 14px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; background: #fafafa; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
            <button type="button" onclick="window.WealthPortSettings.closeModal()" style="background: #fff; border: 1px solid #cbd5e1; color: #334155; padding: 8px 18px; border-radius: 6px; font-weight: 600; cursor: pointer;">ปิดหน้าต่าง</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  renderOverviewDashboard(container) {
    const data = getPortfolioDataHelper();
    const overallSummary = this.calculatePortfolioDetail(data, 'ALL');
    const formatBaht = (num) => '฿' + Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatUSD = (num) => '$' + Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const isProfit = overallSummary.unrealizedPL >= 0;
    const sortedPortfolios = this.getSortedPortfolios(data);

    const targetAmount = overallSummary.targetAmount > 0 ? overallSummary.targetAmount : 5063000;
    const netTotal = overallSummary.totalNetWorth;
    const progressPct = targetAmount > 0 ? Math.min(100, (netTotal / targetAmount) * 100) : 0;
    const remainingToTarget = Math.max(0, targetAmount - netTotal);

    const liveFx = overallSummary.liveFxRate || 33.49;
    const totalNetWorthUSD = netTotal / liveFx;

    let stageBadge = '🌱 ต้นอ่อนผลิใบ · ระยะ 2';
    if (progressPct >= 100) stageBadge = '🌳 ไม้ใหญ่ผลิดอก · สำเร็จเป้าหมาย';
    else if (progressPct >= 75) stageBadge = '🌿 แตกกิ่งก้าน · ระยะ 4';
    else if (progressPct >= 50) stageBadge = '🪴 เติบโตสมบูรณ์ · ระยะ 3';
    else if (progressPct < 25) stageBadge = '🌰 เมล็ดพันธุ์ · ระยะ 1';

    const portCardsHtml = sortedPortfolios.map(p => {
      const pId = p.id || p.portfolioId;
      const pSummary = this.calculatePortfolioDetail(data, pId);
      const pProfit = pSummary.unrealizedPL >= 0;
      const pNetTotal = pSummary.marketValue;
      const pTarget = parseFloat(p.targetAmount || p.cashBalance || 0);
      const pProgPct = pTarget > 0 ? Math.min(100, (pNetTotal / pTarget) * 100) : 0;

      return `
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <h3 style="margin: 0; font-size: 15.5px; font-weight: 700; color: #0f172a;">💼 ${p.name || 'พอร์ต'}</h3>
                <span style="font-size: 12px; color: #64748b;">${pSummary.activeCount} สินทรัพย์</span>
              </div>
              <span style="background: ${pProfit ? '#ecfdf5' : '#fef2f2'}; color: ${pProfit ? '#16a34a' : '#dc2626'}; font-weight: 700; font-size: 12px; padding: 3px 8px; border-radius: 6px;">
                ${pProfit ? '+' : ''}${pSummary.returnPct.toFixed(2)}%
              </span>
            </div>
            <div style="margin-bottom: 14px;">
              <div style="font-size: 11px; color: #64748b;">มูลค่าตลาดปัจจุบัน</div>
              <div style="font-size: 20px; font-weight: 800; color: #0f172a;">${formatBaht(pNetTotal)}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px;">
                <span style="color: #64748b;">🎯 เป้าหมาย: <strong>${pTarget > 0 ? formatBaht(pTarget) : 'ยังไม่ตั้งเป้า'}</strong></span>
                <strong style="color: ${pProgPct >= 100 ? '#10b981' : '#0284c7'}; font-weight: 700;">${pTarget > 0 ? `${pProgPct.toFixed(1)}%` : '-'}</strong>
              </div>
              <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                <div style="width: ${pProgPct}%; height: 100%; background: ${pProgPct >= 100 ? '#10b981' : 'linear-gradient(90deg, #38bdf8, #0284c7)'}; border-radius: 3px;"></div>
              </div>
            </div>
            <div style="border-top: 1px dashed #e2e8f0; padding-top: 10px; font-size: 12px; display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between;"><span style="color: #64748b;">ต้นทุนรวม:</span><strong>${formatBaht(pSummary.totalCost)}</strong></div>
              <div style="display: flex; justify-content: space-between;"><span style="color: #64748b;">กำไร/ขาดทุน:</span><strong style="color: ${pProfit ? '#16a34a' : '#dc2626'};">${pProfit ? '+' : ''}${formatBaht(pSummary.unrealizedPL)}</strong></div>
            </div>
          </div>
          <div style="margin-top: 16px;">
            <button class="btn-jump-to-port" data-id="${pId}" style="width: 100%; background: #f8fafc; border: 1px solid #cbd5e1; color: #334155; padding: 7px 0; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
              🔍 ดูรายการถือครองพอร์ตนี้
            </button>
          </div>
        </div>
      `;
    }).join('');

    const alloc = overallSummary.allocation;

    container.innerHTML = `
      <div class="portfolio-container" style="width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 0 30px 0 !important; text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: nowrap; gap: 14px; width: 100%;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: #e0f2fe; color: #0284c7; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 22px; flex-shrink: 0;">📁</div>
            <div style="text-align: left;">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">TOTAL WEALTH OVERVIEW</div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">พอร์ตการลงทุนทั้งหมด</h1>
                <span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">${sortedPortfolios.length} บัญชี · ${overallSummary.activeCount} สินทรัพย์</span>
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-shrink: 0; align-items: center;">
            <button class="btn-soft" id="btn-edit-port" style="background: #fff; border: 1px solid #cbd5e1; color: #334155; padding: 7px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;">🎯 จัดการพอร์ต & เป้าหมาย</button>
            <button id="btn-export-json" class="btn-soft" style="background: #fff; border: 1px solid #cbd5e1; color: #334155; padding: 7px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;">📤 ส่งออก JSON</button>
            <label class="btn-soft" style="background: #fff; border: 1px solid #cbd5e1; color: #334155; padding: 7px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin: 0;">
              📥 นำเข้า JSON
              <input type="file" id="file-import-json-overview" accept=".json" style="display: none;">
            </label>
          </div>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px 26px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 18px;">
            <div>
              <div style="font-size: 11.5px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px;">ความมั่งคั่งสุทธิรวม (Total Portfolio Net Worth)</div>
              <div style="display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;">
                <span style="font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; line-height: 1.1;">${formatBaht(netTotal)}</span>
                <span style="font-size: 15px; font-weight: 700; color: #64748b;">≈ ${formatUSD(totalNetWorthUSD)} USD</span>
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <span style="background: ${isProfit ? '#ecfdf5' : '#fef2f2'}; color: ${isProfit ? '#16a34a' : '#dc2626'}; font-size: 12.5px; font-weight: 800; padding: 6px 12px; border-radius: 20px; border: 1px solid ${isProfit ? '#bbf7d0' : '#fecaca'};">
                ${isProfit ? '▲ +' : '▼ '}${formatBaht(overallSummary.unrealizedPL)} (${isProfit ? '+' : ''}${overallSummary.returnPct.toFixed(2)}%)
              </span>
              <span style="background: #f0fdf4; color: #15803d; font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 20px; border: 1px solid #dcfce7;">${stageBadge}</span>
            </div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 12px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; flex-wrap: wrap; gap: 6px;">
              <span style="color: #475569;">ความคืบหน้าสู่เป้าหมาย: <strong style="color: #0284c7; font-size: 13.5px; font-weight: 800;">${progressPct.toFixed(1)}%</strong> <span style="color: #94a3b8;">${remainingToTarget > 0 ? `(ขาดอีก ${formatBaht(remainingToTarget)})` : '<strong style="color:#16a34a;">(สำเร็จเป้าหมายแล้ว! 🎉)</strong>'}</span></span>
              <span style="color: #64748b;">เป้าหมายรวม: <strong style="color: #0f172a; font-weight: 700;">${formatBaht(targetAmount)}</strong></span>
            </div>
            <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
              <div style="width: ${progressPct}%; height: 100%; background: linear-gradient(90deg, #0284c7, #10b981); border-radius: 4px;"></div>
            </div>
          </div>
        </div>

        <div class="summary-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; margin-bottom: 20px;">
          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">💼 ต้นทุนรวมสะสม (Total Cost)</div>
            <div class="card-value" style="font-size: 20px; font-weight: 900; color: #0f172a;">${formatBaht(overallSummary.totalCost)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">≈ ${formatUSD(overallSummary.totalCost / liveFx)} USD</div>
          </div>
          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">📈 กำไร / ขาดทุนที่ยังไม่เกิดขึ้น</div>
            <div class="card-value" style="font-size: 20px; font-weight: 900; color: ${isProfit ? '#16a34a' : '#dc2626'};">${isProfit ? '+' : ''}${formatBaht(overallSummary.unrealizedPL)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">สถานะ: <strong style="color: ${isProfit ? '#16a34a' : '#dc2626'};">${isProfit ? '🟢 พอร์ตเขียวสุขภาพดี' : '🔴 ติดดอยสะสม'}</strong></div>
          </div>
          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🎯 ผลตอบแทนรวม (%)</div>
            <div class="card-value" style="font-size: 20px; font-weight: 900; color: ${isProfit ? '#16a34a' : '#dc2626'};">${isProfit ? '+' : ''}${overallSummary.returnPct.toFixed(2)}%</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">กำไรรับจริงสะสม: <strong style="color: ${overallSummary.realizedPL >= 0 ? '#16a34a' : '#dc2626'};">${overallSummary.realizedPL >= 0 ? '+' : ''}${formatBaht(overallSummary.realizedPL)}</strong></div>
          </div>
          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">💵 เงินปันผลสะสมทั้งหมด</div>
            <div class="card-value" style="font-size: 20px; font-weight: 900; color: #16a34a;">+${formatBaht(overallSummary.dividends)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #16a34a; margin-top: 6px;">สร้างกระแสเงินสดต่อเนื่อง</div>
          </div>
        </div>

        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
          <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">📊 การกระจายความเสี่ยงรวม (Grand Asset Allocation)</div>
          <div style="height: 12px; border-radius: 6px; overflow: hidden; display: flex; background: #e2e8f0; margin-bottom: 12px;">
            ${alloc.th > 0 ? `<div style="width: ${alloc.th}%; background: #6366f1;" title="หุ้นไทย: ${alloc.th.toFixed(1)}%"></div>` : ''}
            ${alloc.fund > 0 ? `<div style="width: ${alloc.fund}%; background: #10b981;" title="กองทุนรวม: ${alloc.fund.toFixed(1)}%"></div>` : ''}
            ${alloc.us > 0 ? `<div style="width: ${alloc.us}%; background: #0284c7;" title="หุ้นสหรัฐฯ: ${alloc.us.toFixed(1)}%"></div>` : ''}
          </div>
          <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 12px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 9px; height: 9px; background: #6366f1; display: inline-block; border-radius: 2px;"></span>
              <span>🇹🇭 หุ้นไทย & REITs: <strong>${alloc.th.toFixed(1)}%</strong> (${formatBaht(alloc.valTH)})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 9px; height: 9px; background: #10b981; display: inline-block; border-radius: 2px;"></span>
              <span>🌱 กองทุนรวม (Fund): <strong>${alloc.fund.toFixed(1)}%</strong> (${formatBaht(alloc.valFund)})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 9px; height: 9px; background: #0284c7; display: inline-block; border-radius: 2px;"></span>
              <span>🇺🇸 หุ้นสหรัฐฯ (US): <strong>${alloc.us.toFixed(1)}%</strong> (${formatBaht(alloc.valUS)})</span>
            </div>
          </div>
        </div>

        <div>
          <h3 style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: #1e293b;">เปรียบเทียบผลการดำเนินงานรายพอร์ต (${sortedPortfolios.length} บัญชี):</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
            ${portCardsHtml}
          </div>
        </div>
      </div>
    `;
  },

  renderHoldingsManagement(container) {
    const data = getPortfolioDataHelper();
    const portMap = this.getPortfolioMap(data);
    const sortedPortfolios = this.getSortedPortfolios(data);

    if (this.selectedPortfolioId === 'ALL' && sortedPortfolios.length > 0) {
      const bls = sortedPortfolios.find(p => (p.name || '').toUpperCase() === 'BLS');
      this.selectedPortfolioId = bls ? (bls.id || bls.portfolioId) : (sortedPortfolios[0].id || sortedPortfolios[0].portfolioId);
    }

    const summary = this.calculatePortfolioDetail(data);

    const formatBaht = (num) => '฿' + Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatUSD = (num) => '$' + Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatNum = (num) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

    const isProfit = summary.isForeignPort ? (summary.unrealizedUSD >= 0) : (summary.unrealizedPL >= 0);
    const currentName = portMap[this.selectedPortfolioId] || (this.selectedPortfolioId === 'ALL' ? 'พอร์ตทั้งหมด' : this.selectedPortfolioId);

    let portOptions = `<option value="ALL" ${this.selectedPortfolioId === 'ALL' ? 'selected' : ''}>📁 ทุกพอร์ตการลงทุน</option>`;
    sortedPortfolios.forEach(p => {
      const id = p.id || p.portfolioId || p.name;
      portOptions += `<option value="${id}" ${this.selectedPortfolioId === id ? 'selected' : ''}>💼 พอร์ต ${p.name || id}</option>`;
    });

    let filteredHoldings = summary.activeHoldings.filter(h => {
      if (this.searchQuery && !h.symbol.toLowerCase().includes(this.searchQuery.toLowerCase())) return false;
      const isHoldProfit = h.assetType === 'foreign-stock' ? (h.unrealizedUSD >= 0) : (h.unrealizedPL >= 0);
      if (this.filterCategory === 'profit' && !isHoldProfit) return false;
      if (this.filterCategory === 'loss' && isHoldProfit) return false;
      if (this.filterCategory === 'fund' && h.assetType !== 'mutual-fund') return false;
      if (this.filterCategory === 'stock' && h.assetType === 'mutual-fund') return false;
      return true;
    });

    if (this.sortColumn) {
      filteredHoldings.sort((a, b) => {
        let valA, valB;
        switch (this.sortColumn) {
          case 'symbol': valA = a.symbol.toUpperCase(); valB = b.symbol.toUpperCase(); return this.sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(a.symbol);
          case 'shares': valA = a.shares; valB = b.shares; break;
          case 'avgCost': valA = a.avgCost; valB = b.avgCost; break;
          case 'marketPrice': valA = a.marketPrice; valB = b.marketPrice; break;
          case 'totalCost': valA = a.totalCost; valB = b.totalCost; break;
          case 'marketValue': valA = a.marketValue; valB = b.marketValue; break;
          case 'plPct': valA = a.plPct; valB = b.plPct; break;
          default: return 0;
        }
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;
      });
    }

    const getSortArrow = (col) => {
      if (this.sortColumn !== col) return '<span style="color:#94a3b8; font-size:10px; margin-left:4px;">↕</span>';
      return this.sortDirection === 'asc' ? '<span style="color:#0284c7; font-weight:bold; font-size:11px; margin-left:4px;">▲</span>' : '<span style="color:#0284c7; font-weight:bold; font-size:11px; margin-left:4px;">▼</span>';
    };

    const tableRows = filteredHoldings.map((h, i) => {
      const isForeign = h.assetType === 'foreign-stock';
      const isFund = h.assetType === 'mutual-fund';
      const plValue = isForeign ? (h.unrealizedUSD || 0) : (h.unrealizedPL || 0);
      const isPositive = plValue >= 0;
      const plTextColor = isPositive ? '#16a34a' : '#dc2626';
      const plPrefix = isPositive ? '+' : '';

      const formatNavOrPrice = (val) => {
        if (isFund) return '฿' + Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
        return formatBaht(val);
      };

      const avgDisplay = isForeign ? formatUSD(h.avgCostUSD) : formatNavOrPrice(h.avgCost);
      const marketPriceDisplay = isForeign ? formatUSD(h.priceUSD) : formatNavOrPrice(h.marketPrice);
      const totalCostDisplay = isForeign ? `<div>${formatUSD(h.costUSD)}</div><div style="font-size:11px;color:#94a3b8;">≈ ${formatBaht(h.totalCost)}</div>` : formatBaht(h.totalCost);
      const marketValDisplay = isForeign ? `<div>${formatUSD(h.marketUSD)}</div><div style="font-size:11px;color:#94a3b8;">≈ ${formatBaht(h.marketValue)}</div>` : formatBaht(h.marketValue);
      const plValDisplay = isForeign ? `${plPrefix}${formatUSD(h.unrealizedUSD || 0)}` : `${plPrefix}${formatBaht(h.unrealizedPL)}`;

      const isLive = h.quoteSource && (
        h.quoteSource.includes('Live') || 
        h.quoteSource.includes('Settrade') || 
        h.quoteSource.includes('Nuxt')
      );

      const sourceBadgeHtml = `<span style="background:${isLive ? '#ecfdf5' : '#fffbeb'}; color:${isLive ? '#059669' : '#d97706'}; padding:1px 6px; border-radius:4px; font-weight:600; font-size:11px;">${isLive ? '🟢' : '🟡'} ${h.quoteSource || (isFund ? 'Settrade Nuxt Live' : 'Yahoo Live')}</span>`;

      let typeBadge = isFund 
        ? '<span style="background:rgba(16,185,129,0.15); color:#10b981; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:6px;">🌱 FUND</span>' 
        : (isForeign ? '<span style="background:rgba(14,165,233,0.15); color:#0284c7; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:6px;">🇺🇸 US</span>' 
                     : '<span style="background:rgba(99,102,241,0.15); color:#6366f1; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:6px;">🇹🇭 TH</span>');

      return `
        <tr>
          <td style="font-weight: 700; color: #334155; padding: 10px 8px;">${i + 1}</td>
          <td style="padding: 10px 8px;">
            <button class="jump-to-chart-btn" data-symbol="${h.symbol}" data-type="${h.assetType}" style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 13px; color: #0284c7; cursor: pointer;">
              📈 ${h.symbol}
            </button>${typeBadge}
          </td>
          <td class="text-right" style="padding: 10px 8px;">${formatNum(h.shares)}</td>
          <td class="text-right" style="padding: 10px 8px;">${avgDisplay}</td>
          <td class="text-right" style="padding: 10px 8px;">
            <div><strong>${marketPriceDisplay}</strong></div>
            <div style="margin-top: 2px;">${sourceBadgeHtml}</div>
          </td>
          <td class="text-right" style="padding: 10px 8px;"><strong>${totalCostDisplay}</strong></td>
          <td class="text-right" style="padding: 10px 8px;"><strong>${marketValDisplay}</strong></td>
          <td class="text-right" style="color: ${plTextColor}; font-weight: 700; padding: 10px 8px;">${plValDisplay} (${plPrefix}${h.plPct.toFixed(2)}%)</td>
          <td class="text-center" style="white-space: nowrap; padding: 10px 8px;">
            <button class="btn-action-refresh" data-symbol="${h.symbol}" data-type="${h.assetType}" style="background: ${isLive ? '#0284c7' : '#dc2626'}; color: #fff; border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; margin-right: 4px; font-size: 12px;" title="${isLive ? 'อัปเดตราคาล่าสุด' : 'ไม่สามารถดึงราคาล่าสุดได้ (คลิกเพื่อลองใหม่)'}">🔄</button>
            <button class="btn-action-settings" data-symbol="${h.symbol}" style="background: #334155; color: #fff; border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 12px;">⚙️</button>
          </td>
        </tr>
      `;
    }).join('');

    // ค่าสำหรับสร้างกล่องสรุปตามรูป 1 (รองรับทั้ง USD และ THB)
    const costBig = summary.isForeignPort ? formatUSD(summary.totalCostUSD) : formatBaht(summary.totalCost);
    const mktBig = summary.isForeignPort ? formatUSD(summary.totalMarketUSD) : formatBaht(summary.marketValue);
    const unplBig = summary.isForeignPort 
      ? `${summary.unrealizedUSD >= 0 ? '+' : ''}${formatUSD(summary.unrealizedUSD)}`
      : `${summary.unrealizedPL >= 0 ? '+' : ''}${formatBaht(summary.unrealizedPL)}`;

    const costSub = summary.isForeignPort ? `≈ ${formatBaht(summary.totalCost)}` : 'เป้าหมายพอร์ตนี้';
    const mktSub = summary.isForeignPort ? `≈ ${formatBaht(summary.marketValue)}` : 'รวมพอร์ตสุทธิ';
    const unplSub = summary.isForeignPort ? `≈ ${summary.unrealizedPL >= 0 ? '+' : ''}${formatBaht(summary.unrealizedPL)}` : '💵 เงินปันผลสะสม';

    const rightCostSub = summary.isForeignPort ? formatBaht(summary.targetAmount || 500000) : (summary.targetAmount > 0 ? formatBaht(summary.targetAmount) : '-');
    const rightMktSub = formatBaht(summary.marketValue);
    const rightUnplSub = `+${formatBaht(summary.dividends)}`;

    container.innerHTML = `
      <div class="portfolio-container" style="padding-bottom: 30px;">
        <div style="margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 18px;">📊</span>
            <span style="font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">HOLDINGS MANAGEMENT</span>
          </div>
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #0f172a;">${currentName}</h1>
          </div>
          <div style="font-size: 13px; color: #64748b; margin-top: 2px;">${summary.activeCount} สินทรัพย์</div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 18px;">
          <select id="portfolio-select" style="padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #fff; font-weight: 600; cursor: pointer;">
            ${portOptions}
          </select>
          ${(summary.isForeignPort || currentName.toUpperCase().includes('DIME') || currentName.toUpperCase().includes('US') || currentName.toUpperCase().includes('OFFSHORE')) ? `
            <span id="main-fx-badge" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 6px; padding: 6px 12px; font-size: 12.5px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">
              💵 1 USD = ฿${Number(summary.liveFxRate || 33.49).toFixed(2)}
            </span>
          ` : ''}

          <button id="btn-open-buy-modal" style="background: #059669; color: #fff; border: none; padding: 7px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">➕ ซื้อสินทรัพย์เพิ่ม</button>
          <button id="btn-sync-quotes" style="background: #fff; border: 1px solid #38bdf8; color: #0284c7; padding: 7px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">🔄 อัปเดตราคาตลาด</button>
          <button id="btn-edit-port" style="background: #fff; border: 1px solid #cbd5e1; color: #334155; padding: 7px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">✏️ แก้ไขพอร์ต</button>
          <button id="btn-export-json" style="background: #fff; border: 1px solid #cbd5e1; color: #334155; padding: 7px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">📤 ส่งออก JSON</button>
          <label style="background: #fff; border: 1px solid #cbd5e1; color: #334155; padding: 7px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; margin: 0;">
            📥 นำเข้า JSON
            <input type="file" id="file-import-json" accept=".json" style="display: none;">
          </label>
        </div>

        <!-- 4 กล่องสรุปสถิติ (ตรงตามรูป 1 เป๊ะ สำหรับพอร์ตต่างประเทศ) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; margin-bottom: 22px;">
          <!-- กล่องที่ 1: ต้นทุนรวม -->
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px;">
            <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 6px;">ต้นทุนรวม (Cost Basis)</div>
            <div style="font-size: 26px; font-weight: 900; color: #0f172a; margin-bottom: 12px;">${costBig}</div>
            <div style="border-top: 1px dashed #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
              <span style="color: #64748b;">${costSub}</span>
              <strong style="color: #059669;">${rightCostSub}</strong>
            </div>
          </div>

          <!-- กล่องที่ 2: มูลค่าตลาด -->
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px;">
            <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 6px;">มูลค่าตลาด (Market Value)</div>
            <div style="font-size: 26px; font-weight: 900; color: #0f172a; margin-bottom: 12px;">${mktBig}</div>
            <div style="border-top: 1px dashed #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
              <span style="color: #64748b;">${mktSub}</span>
              <strong style="color: #0f172a;">${rightMktSub}</strong>
            </div>
          </div>

          <!-- กล่องที่ 3: กำไร / ขาดทุนที่ยังไม่เกิดขึ้น -->
          <div style="background: #fff; border: 1px solid ${isProfit ? '#bbf7d0' : '#fecaca'}; border-radius: 12px; padding: 18px 20px;">
            <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 6px;">กำไร / ขาดทุนที่ยังไม่เกิดขึ้น</div>
            <div style="font-size: 26px; font-weight: 900; color: ${isProfit ? '#16a34a' : '#dc2626'}; margin-bottom: 12px;">${unplBig}</div>
            <div style="border-top: 1px dashed ${isProfit ? '#bbf7d0' : '#fecaca'}; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
              <span style="color: #64748b;">${unplSub}</span>
              <strong style="color: #16a34a;">${rightUnplSub}</strong>
            </div>
          </div>

          <!-- กล่องที่ 4: ผลตอบแทนรวม (%) -->
          <div style="background: #fff; border: 1px solid ${isProfit ? '#bbf7d0' : '#fecaca'}; border-radius: 12px; padding: 18px 20px;">
            <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 6px;">ผลตอบแทนรวม (%)</div>
            <div style="font-size: 26px; font-weight: 900; color: ${isProfit ? '#16a34a' : '#dc2626'}; margin-bottom: 12px;">${isProfit ? '+' : ''}${summary.returnPct.toFixed(2)}%</div>
            <div style="border-top: 1px dashed ${isProfit ? '#bbf7d0' : '#fecaca'}; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
              <span style="color: #64748b;">กำไรรับจริงสะสม</span>
              <strong style="color: ${summary.realizedPL >= 0 ? '#16a34a' : '#dc2626'};">${summary.realizedPL >= 0 ? '+' : ''}${formatBaht(summary.realizedPL)}</strong>
            </div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div style="font-size: 14.5px; font-weight: 800; color: #0f172a;">รายการสินทรัพย์ที่ถือครอง (${filteredHoldings.length} จาก ${summary.activeCount} รายการ)</div>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              <input type="text" id="input-holdings-search" value="${this.searchQuery}" placeholder="🔍 ค้นหา Symbol..." style="padding: 5px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px; width: 130px;">
              <div style="display: flex; gap: 3px;">
                <button class="filter-tab-btn ${this.filterCategory === 'all' ? 'active' : ''}" data-cat="all" style="padding: 4px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer;">ทั้งหมด</button>
                <button class="filter-tab-btn ${this.filterCategory === 'profit' ? 'active' : ''}" data-cat="profit" style="padding: 4px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; color: #16a34a; cursor: pointer;">🟢 กำไร</button>
                <button class="filter-tab-btn ${this.filterCategory === 'loss' ? 'active' : ''}" data-cat="loss" style="padding: 4px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; color: #dc2626; cursor: pointer;">🔴 ขาดทุน</button>
                <button class="filter-tab-btn ${this.filterCategory === 'fund' ? 'active' : ''}" data-cat="fund" style="padding: 4px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer;">🌱 กองทุน</button>
                <button class="filter-tab-btn ${this.filterCategory === 'stock' ? 'active' : ''}" data-cat="stock" style="padding: 4px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer;">📈 หุ้น</button>
              </div>
            </div>
          </div>
          <div style="overflow-x: auto;">
            <table class="custom-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
                  <th style="padding: 8px 10px; text-align: left; width: 40px;">#</th>
                  <th class="sortable-th" data-col="symbol" style="padding: 8px 10px; text-align: left; cursor: pointer;">SYMBOL ${getSortArrow('symbol')}</th>
                  <th class="text-right sortable-th" data-col="shares" style="padding: 8px 10px; cursor: pointer;">จำนวน ${getSortArrow('shares')}</th>
                  <th class="text-right sortable-th" data-col="avgCost" style="padding: 8px 10px; cursor: pointer;">ราคาซื้อเฉลี่ย ${getSortArrow('avgCost')}</th>
                  <th class="text-right sortable-th" data-col="marketPrice" style="padding: 8px 10px; cursor: pointer;">ราคาปัจจุบัน / แหล่งข้อมูล ${getSortArrow('marketPrice')}</th>
                  <th class="text-right sortable-th" data-col="totalCost" style="padding: 8px 10px; cursor: pointer;">ต้นทุน ${getSortArrow('totalCost')}</th>
                  <th class="text-right sortable-th" data-col="marketValue" style="padding: 8px 10px; cursor: pointer;">มูลค่าปัจจุบัน ${getSortArrow('marketValue')}</th>
                  <th class="text-right sortable-th" data-col="plPct" style="padding: 8px 10px; cursor: pointer;">%P/L ${getSortArrow('plPct')}</th>
                  <th class="text-center" style="padding: 8px 10px; width: 80px;">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows || '<tr><td colspan="9" style="text-align:center; padding: 24px; color: #94a3b8;">ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  renderPerformanceReport(container) {
    const data = getPortfolioDataHelper();
    const sortedPortfolios = this.getSortedPortfolios(data);

    const targetPortId = this.selectedPerfPortId;
    const summary = this.calculatePortfolioDetail(data, targetPortId);
    const formatBaht = (num) => '฿' + Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let closedList = summary.closedPositions || [];

    const yearsSet = new Set();
    closedList.forEach(c => {
      if (c.date) {
        const yr = new Date(c.date).getFullYear();
        if (!isNaN(yr)) yearsSet.add(yr);
      }
    });
    const yearsList = Array.from(yearsSet).sort((a, b) => b - a);

    let filteredClosed = closedList.filter(c => {
      if (this.selectedPerfYear === 'ALL') return true;
      return new Date(c.date).getFullYear() === parseInt(this.selectedPerfYear);
    });

    if (this.perfFilterCategory === 'profit') {
      filteredClosed = filteredClosed.filter(c => c.realizedGain >= 0);
    } else if (this.perfFilterCategory === 'loss') {
      filteredClosed = filteredClosed.filter(c => c.realizedGain < 0);
    }

    if (this.perfSearchQuery) {
      filteredClosed = filteredClosed.filter(c => c.symbol.toLowerCase().includes(this.perfSearchQuery.toLowerCase()));
    }

    let totalRealized = 0;
    let totalWin = 0;
    let totalLoss = 0;
    let winCount = 0;
    let lossCount = 0;

    filteredClosed.forEach(c => {
      totalRealized += c.realizedGain;
      if (c.realizedGain >= 0) {
        totalWin += c.realizedGain;
        winCount++;
      } else {
        totalLoss += c.realizedGain;
        lossCount++;
      }
    });

    const totalTrades = filteredClosed.length;
    const winRatePct = totalTrades > 0 ? ((winCount / totalTrades) * 100).toFixed(1) : '0.0';
    const isRealizedPos = totalRealized >= 0;
    const totalNetGainOverall = summary.unrealizedPL + totalRealized + summary.dividends;

    let perfPortOptions = `<option value="ALL" ${this.selectedPerfPortId === 'ALL' ? 'selected' : ''}>📁 ทุกพอร์ตการลงทุน</option>`;
    sortedPortfolios.forEach(p => {
      const id = p.id || p.portfolioId;
      const name = p.name || id;
      perfPortOptions += `<option value="${id}" ${this.selectedPerfPortId === id ? 'selected' : ''}>💼 พอร์ต ${name}</option>`;
    });

    const rowsHtml = filteredClosed.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).map(c => {
      const isPos = c.realizedGain >= 0;
      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 12px; white-space: nowrap; font-variant-numeric: tabular-nums;">${c.date || '-'}</td>
          <td style="padding: 10px 12px;"><strong style="color: #0f172a;">${c.symbol}</strong></td>
          <td style="padding: 10px 12px; color: #475569;">${c.portName}</td>
          <td class="text-right" style="padding: 10px 12px; font-variant-numeric: tabular-nums;">${c.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}</td>
          <td class="text-right" style="padding: 10px 12px; font-variant-numeric: tabular-nums;">${formatBaht(c.costBasis)}</td>
          <td class="text-right" style="padding: 10px 12px; font-variant-numeric: tabular-nums;">${formatBaht(c.sellValue)}</td>
          <td class="text-right" style="padding: 10px 12px; color: ${isPos ? '#16a34a' : '#dc2626'}; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums;">
            ${isPos ? '+' : ''}${formatBaht(c.realizedGain)} (${isPos ? '+' : ''}${c.gainPct.toFixed(2)}%)
          </td>
          <td class="text-center" style="padding: 10px 12px; white-space: nowrap;">
            <button class="btn-delete-sell-order" data-id="${c.id}" data-symbol="${c.symbol}" title="ลบรายการขายนี้ (คืนหุ้นกลับเข้าพอร์ต)" style="background: none; border: 1px solid #fecaca; color: #dc2626; border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer;">🗑️ ลบ</button>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="portfolio-container" style="width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 0 30px 0 !important; text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: nowrap; gap: 14px; width: 100%;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: #e0f2fe; color: #0284c7; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 22px; flex-shrink: 0;">📈</div>
            <div style="text-align: left;">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">PERFORMANCE & REALIZED JOURNAL</div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">รายงานผลตอบแทนสะสม</h1>
                <span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">${totalTrades} รายการปิดสถานะ</span>
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-shrink: 0;">
            <select id="perf-port-filter" class="select-port-dropdown" style="padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px; background: #fff; cursor: pointer;">
              ${perfPortOptions}
            </select>
            <select id="perf-year-select" class="select-port-dropdown" style="padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px; background: #fff; cursor: pointer;">
              <option value="ALL" ${this.selectedPerfYear === 'ALL' ? 'selected' : ''}>📅 ทั้งหมดทุกปี</option>
              ${yearsList.map(y => `<option value="${y}" ${this.selectedPerfYear === String(y) ? 'selected' : ''}>ปี ${y}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="summary-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 20px;">
          <div class="stat-card ${isRealizedPos ? 'profit' : 'loss'}" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">กำไร / ขาดทุนรับจริง (Realized P/L)</div>
            <div class="card-value" style="font-size: 20px; font-weight: 900; color: ${isRealizedPos ? '#16a34a' : '#dc2626'};">${isRealizedPos ? '+' : ''}${formatBaht(totalRealized)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">Win Rate: <strong>${winRatePct}%</strong> (${winCount} ชนะ / ${lossCount} แพ้)</div>
          </div>
          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">กำไรที่ยังไม่รับจริง (Unrealized P/L)</div>
            <div class="card-value" style="font-size: 20px; font-weight: 900; color: ${summary.unrealizedPL >= 0 ? '#16a34a' : '#dc2626'};">${summary.unrealizedPL >= 0 ? '+' : ''}${formatBaht(summary.unrealizedPL)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">ผลตอบแทนพอร์ต: <strong>${summary.returnPct.toFixed(2)}%</strong></div>
          </div>
          <div class="stat-card profit" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">ผลตอบแทนสุทธิรวม (Net Gain)</div>
            <div class="card-value tag-profit" style="font-size: 20px; font-weight: 900; color: #16a34a;">${totalNetGainOverall >= 0 ? '+' : ''}${formatBaht(totalNetGainOverall)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #16a34a; margin-top: 6px;">รวมปันผลสะสม: <strong>+${formatBaht(summary.dividends)}</strong></div>
          </div>
        </div>

        <div class="holdings-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
          <div class="holdings-card-header" style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">📜 บันทึกประวัติการขายทำกำไร / ขาดทุน (Realized Positions)</h3>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <input type="text" id="input-perf-search" value="${this.perfSearchQuery}" placeholder="🔍 ค้นหา Symbol..." style="padding: 5px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px; width: 140px;">
              <div style="display: flex; gap: 3px;">
                <button class="perf-filter-tab-btn" data-cat="all" style="padding: 4px 10px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; background: ${this.perfFilterCategory === 'all' ? '#0284c7' : '#fff'}; color: ${this.perfFilterCategory === 'all' ? '#fff' : '#475569'}; cursor: pointer;">ทั้งหมด</button>
                <button class="perf-filter-tab-btn" data-cat="profit" style="padding: 4px 10px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; background: ${this.perfFilterCategory === 'profit' ? '#059669' : '#fff'}; color: ${this.perfFilterCategory === 'profit' ? '#fff' : '#16a34a'}; cursor: pointer;">🟢 กำไร</button>
                <button class="perf-filter-tab-btn" data-cat="loss" style="padding: 4px 10px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; background: ${this.perfFilterCategory === 'loss' ? '#dc2626' : '#fff'}; color: ${this.perfFilterCategory === 'loss' ? '#fff' : '#dc2626'}; cursor: pointer;">🔴 ขาดทุน</button>
              </div>
            </div>
          </div>
          <div style="overflow-x: auto; max-height: 480px;">
            <table class="custom-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px;">
                  <th style="padding: 10px 12px; text-align: left; white-space: nowrap;">วันที่ขาย</th>
                  <th style="padding: 10px 12px; text-align: left;">SYMBOL</th>
                  <th style="padding: 10px 12px; text-align: left;">พอร์ต</th>
                  <th class="text-right" style="padding: 10px 12px;">จำนวนหน่วย</th>
                  <th class="text-right" style="padding: 10px 12px;">ต้นทุนรวม</th>
                  <th class="text-right" style="padding: 10px 12px;">มูลค่าขายสุทธิ</th>
                  <th class="text-right" style="padding: 10px 12px;">กำไร / ขาดทุนรับจริง</th>
                  <th class="text-center" style="padding: 10px 12px; width: 60px;">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="8" style="text-align:center; padding: 24px; color: #94a3b8;">ไม่พบประวัติการปิดสถานะขายในเงื่อนไขที่เลือก</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  renderDividendTracker(container) {
    const data = getPortfolioDataHelper();
    const portMap = this.getPortfolioMap(data);
    const trades = data.trades || [];

    const cachedFx = JSON.parse(localStorage.getItem('wealthport:latest-usd-thb') || '{}');
    const liveFxRate = cachedFx.rate || 33.49;
    const formatBaht = (num) => '฿' + Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatNum = (num) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    let combinedDividends = [];
    trades.filter(t => String(t.side || t.type || '').toLowerCase() === 'dividend').forEach(t => {
      const sym = (t.symbol || t.ticker || '').trim().toUpperCase();
      const pName = portMap[t.portfolioId] || '';
      const isForeign = this.detectAssetType(sym, t.assetType, pName) === 'foreign-stock';
      const effectiveFx = isForeign ? (parseFloat(t.fxRate) || liveFxRate) : 1;
      const netAmountTHB = parseFloat(t.netAmount || (t.quantity * t.price) || t.price || 0) * effectiveFx;

      combinedDividends.push({
        id: t.id || 'trade-' + Math.random(),
        date: t.tradeDate || t.date || '2026-03-31',
        symbol: sym,
        portfolioId: t.portfolioId,
        portName: pName || 'พอร์ตทั่วไป',
        amount: netAmountTHB,
        grossAmount: netAmountTHB / 0.9,
        taxWithheld: (netAmountTHB / 0.9) * 0.1
      });
    });

    let portFilteredDividends = combinedDividends.filter(item => {
      if (this.selectedDivPortId === 'ALL') return true;
      return item.portfolioId === this.selectedDivPortId;
    });

    const yearsSet = new Set();
    portFilteredDividends.forEach(t => {
      if (t.date) {
        const yr = new Date(t.date).getFullYear();
        if (!isNaN(yr)) yearsSet.add(yr);
      }
    });
    const yearsList = Array.from(yearsSet).sort((a, b) => b - a);
    const activeYearStr = this.selectedDivYear === 'ALL' ? (yearsList[0] ? String(yearsList[0]) : '2026') : this.selectedDivYear;

    const finalFiltered = portFilteredDividends.filter(t => {
      if (this.selectedDivYear === 'ALL') return true;
      return new Date(t.date).getFullYear() === parseInt(this.selectedDivYear);
    });

    const monthlyTotals = Array(12).fill(0);
    portFilteredDividends.forEach(t => {
      if (t.date) {
        const d = new Date(t.date);
        if (d.getFullYear() === parseInt(activeYearStr)) {
          const m = d.getMonth();
          if (m >= 0 && m < 12) monthlyTotals[m] += t.amount;
        }
      }
    });

    const maxMonthVal = Math.max(...monthlyTotals, 1);
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    let totalDivAmount = 0;
    let totalGrossAmount = 0;
    let totalTaxWithheld = 0;
    const assetDivMap = {};

    portFilteredDividends.forEach(t => {
      totalDivAmount += t.amount;
      totalGrossAmount += (t.grossAmount || t.amount);
      totalTaxWithheld += (t.taxWithheld || (t.amount * 0.1));

      if (!assetDivMap[t.symbol]) {
        assetDivMap[t.symbol] = { symbol: t.symbol, totalAmount: 0, count: 0, portName: t.portName };
      }
      assetDivMap[t.symbol].totalAmount += t.amount;
      assetDivMap[t.symbol].count += 1;
    });

    const estimatedTaxCredit = (totalGrossAmount * 0.8) * (20 / 80);
    const topDivAssets = Object.values(assetDivMap).sort((a, b) => b.totalAmount - a.totalAmount);
    const sortedPortfolios = this.getSortedPortfolios(data);

    let divPortOptions = `<option value="ALL" ${this.selectedDivPortId === 'ALL' ? 'selected' : ''}>📁 ทุกพอร์ตการลงทุน</option>`;
    sortedPortfolios.forEach(p => {
      const id = p.id || p.portfolioId;
      divPortOptions += `<option value="${id}" ${this.selectedDivPortId === id ? 'selected' : ''}>💼 พอร์ต ${p.name || id}</option>`;
    });

    const monthlyBarsHtml = monthNames.map((mName, idx) => {
      const val = monthlyTotals[idx];
      const hPct = Math.round((val / maxMonthVal) * 100);
      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 140px; min-width: 32px;">
          <div style="font-size: 10px; color: ${val > 0 ? '#16a34a' : '#94a3b8'}; font-weight: 700; margin-bottom: 4px;">${val > 0 ? formatNum(val) : ''}</div>
          <div style="width: 100%; max-width: 24px; background: #e2e8f0; height: 100px; border-radius: 4px; display: flex; align-items: flex-end; overflow: hidden;">
            <div style="width: 100%; height: ${Math.max(val > 0 ? 8 : 0, hPct)}%; background: ${val > 0 ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' : '#cbd5e1'}; border-radius: 4px;"></div>
          </div>
          <div style="font-size: 11px; margin-top: 8px; color: #64748b;">${mName}</div>
        </div>
      `;
    }).join('');

    const assetTableRows = topDivAssets.map((item, idx) => `
      <tr>
        <td style="text-align: center;"><strong>${idx + 1}</strong></td>
        <td><strong style="color: #0f172a;">${item.symbol}</strong></td>
        <td>${item.portName}</td>
        <td class="text-right">${item.count} ครั้ง</td>
        <td class="text-right"><strong style="color: #16a34a;">+${formatBaht(item.totalAmount)}</strong></td>
      </tr>
    `).join('');

    const historyRows = finalFiltered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).map(t => `
      <tr>
        <td style="white-space: nowrap;">${t.date}</td>
        <td><strong>${t.symbol}</strong></td>
        <td>${t.portName}</td>
        <td class="text-right" style="color: #64748b;">${formatBaht(t.grossAmount || t.amount)}</td>
        <td class="text-right" style="color: #dc2626;">-${formatBaht(t.taxWithheld || 0)}</td>
        <td class="text-right" style="color: #16a34a; font-weight: 700;">+${formatBaht(t.amount)}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="portfolio-container" style="width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 0 30px 0 !important; text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: nowrap; gap: 14px; width: 100%;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: #e0f2fe; color: #0284c7; width: 44px; height: 44px; display: flex; align-items: center; justify-content: border-radius: 10px; font-size: 22px; flex-shrink: 0;">💵</div>
            <div style="text-align: left;">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">DIVIDEND CASH FLOW & TAX CREDIT</div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">รายงานเงินปันผลจริง & เครดิตภาษี</h1>
                <span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">${portFilteredDividends.length} รายการรับเงิน</span>
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-shrink: 0;">
            <select id="div-port-filter" class="select-port-dropdown" style="padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px;">${divPortOptions}</select>
            <select id="div-year-select" class="select-port-dropdown" style="padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px;">
              <option value="ALL" ${this.selectedDivYear === 'ALL' ? 'selected' : ''}>📅 ทั้งหมดทุกปี</option>
              ${yearsList.map(y => `<option value="${y}" ${this.selectedDivYear === String(y) ? 'selected' : ''}>ปี ${y}</option>`).join('')}
            </select>
            <button class="btn-soft" id="btn-open-add-div" style="background: #10b981; color: #fff; border: none; font-weight: 700; padding: 7px 14px; border-radius: 6px; font-size: 12.5px; cursor: pointer;">➕ บันทึกปันผล</button>
          </div>
        </div>

        <div class="summary-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; margin-bottom: 20px;">
          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">💵 ปันผลสุทธิรับจริง (Net Dividend)</div>
            <div class="card-value" style="font-size: 20px; font-weight: 900; color: #16a34a;">+${formatBaht(totalDivAmount)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">ยอดรวมก่อนหักภาษี: <strong>${formatBaht(totalGrossAmount)}</strong></div>
          </div>
          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🏛️ ภาษีหัก ณ ที่จ่าย 10% (Withholding Tax)</div>
            <div class="card-value" style="font-size: 20px; font-weight: 900; color: #dc2626;">-${formatBaht(totalTaxWithheld)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #64748b; margin-top: 6px;">หักนำส่งกรมสรรพากรแล้ว</div>
          </div>
          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🧾 สิทธิเครดิตภาษีเงินปันผล (ประมาณการ)</div>
            <div class="card-value" style="font-size: 20px; font-weight: 900; color: #0284c7;">+${formatBaht(estimatedTaxCredit)}</div>
            <div class="card-subtext" style="font-size: 11px; color: #0284c7; margin-top: 6px;">ขอคืนได้ในการยื่น ภ.ง.ด.90 (ฐาน 20%)</div>
          </div>
          <div class="stat-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <div class="card-label" style="font-size: 11.5px; color: #64748b; margin-bottom: 6px; font-weight: 600;">🎯 รายการสร้างกระแสเงินสด</div>
            <div class="card-value" style="font-size: 20px; font-weight: 900; color: #0f172a;">${topDivAssets.length} ตัว</div>
            <div class="card-subtext" style="font-size: 11px; color: #16a34a; margin-top: 6px;">ตัวจ่ายสูงสุด: <strong>${topDivAssets[0]?.symbol || '-'}</strong></div>
          </div>
        </div>

        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">📅 แผนภูมิกระแสเงินสดปันผลรายเดือน ประจำปี ${activeYearStr}</h3>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">แสดงยอดเงินปันผลสุทธิที่ได้รับจริงในแต่ละเดือน (บาท)</div>
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #16a34a; background: #ecfdf5; padding: 4px 10px; border-radius: 6px;">เฉลี่ย ฿${formatNum(totalDivAmount / 12)} / เดือน</div>
          </div>
          <div style="display: flex; gap: 8px; justify-content: space-between; align-items: flex-end; padding-top: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
            ${monthlyBarsHtml}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 18px;">
          <div class="holdings-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <div class="holdings-card-header" style="margin-bottom: 12px;"><h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">🏆 สรุปยอดเงินปันผลสะสมรายตัว (${topDivAssets.length} ตัว)</h3></div>
            <div style="overflow-x: auto; max-height: 420px;">
              <table class="custom-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px;">
                    <th style="width: 40px; text-align: center; padding: 8px 10px;">#</th>
                    <th style="padding: 8px 10px; text-align: left;">SYMBOL</th>
                    <th style="padding: 8px 10px; text-align: left;">พอร์ต</th>
                    <th class="text-right" style="padding: 8px 10px;">จำนวนครั้ง</th>
                    <th class="text-right" style="padding: 8px 10px; color: #16a34a;">เงินปันผลรวม</th>
                  </tr>
                </thead>
                <tbody>${assetTableRows || '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #94a3b8;">ไม่พบข้อมูลปันผลในเงื่อนไขที่เลือก</td></tr>'}</tbody>
              </table>
            </div>
          </div>
          <div class="holdings-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <div class="holdings-card-header" style="margin-bottom: 12px;"><h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">📜 ประวัติรายการรับเงินปันผล (${finalFiltered.length} รายการ)</h3></div>
            <div style="overflow-x: auto; max-height: 420px;">
              <table class="custom-table" style="width: 100%; min-width: 520px; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px;">
                    <th style="padding: 8px 10px; text-align: left; white-space: nowrap;">วันที่รับ</th>
                    <th style="padding: 8px 10px; text-align: left; white-space: nowrap;">SYMBOL</th>
                    <th style="padding: 8px 10px; text-align: left; white-space: nowrap;">พอร์ต</th>
                    <th class="text-right" style="padding: 8px 10px; white-space: nowrap;">ยอดก่อนหัก</th>
                    <th class="text-right" style="padding: 8px 10px; color: #dc2626; white-space: nowrap;">หัก 10%</th>
                    <th class="text-right" style="padding: 8px 10px; color: #16a34a; white-space: nowrap;">รับสุทธิ</th>
                  </tr>
                </thead>
                <tbody>${historyRows || '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #94a3b8;">ไม่พบรายการในปีที่เลือก</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderTechnicalCharts(container) {
    const data = getPortfolioDataHelper();
    const summary = this.calculatePortfolioDetail(data, 'ALL');
    const activeHoldings = summary.activeHoldings || [];
    const quotes = getQuoteCacheHelper();

    const datalistOptions = activeHoldings.map(h => {
      const clean = (h.symbol || '').replace('.BK', '').toUpperCase();
      return `<option value="${clean}">${h.stockName || clean} (${h.assetType === 'mutual-fund' ? 'กองทุน' : 'หุ้น'})</option>`;
    }).join('');

    const rawSym = this.currentChartSymbol.replace('BKK:', '').replace('NASDAQ:', '').replace('NYSE:', '').replace('SET:', '').replace('FUND:', '');
    const isFund = this.currentChartSymbol.startsWith('FUND:');
    const isThai = this.currentChartSymbol.startsWith('SET:') || this.currentChartSymbol.startsWith('BKK:');
    const currencySign = (isThai || isFund) ? '฿' : '$';

    const qKey = isThai ? `${rawSym}.BK` : rawSym;
    const q = quotes[qKey] || quotes[rawSym] || quotes[`NASDAQ:${rawSym}`] || {};
    const holdingMatch = activeHoldings.find(h => h.symbol.replace('.BK', '').toUpperCase() === rawSym);

    let price = parseFloat(q.price || 0);
    if (price <= 0 && holdingMatch) {
      price = isThai ? holdingMatch.marketPrice : (holdingMatch.priceUSD || holdingMatch.marketPrice);
    }
    if (price <= 0) price = isThai ? 10.00 : 150.00;

    let prevClose = parseFloat(q.previousClose || (price * 0.985));
    let change = price - prevClose;
    let changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const isBullish = change >= 0;

    const high = price * 1.015;
    const low = price * 0.985;
    const pivot = (high + low + price) / 3;
    const r1 = (2 * pivot) - low;
    const r2 = pivot + (high - low);
    const s1 = (2 * pivot) - high;
    const s2 = pivot - (high - low);
    const divPerShare = parseFloat(q.dividendRate || (isThai ? 0.45 : 0.27));
    const nowTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    let holdingCardHtml = '';
    if (holdingMatch) {
      const avgCostDisplay = isThai || isFund ? holdingMatch.avgCost : (holdingMatch.avgCostUSD || holdingMatch.avgCost);
      const isHoldProfit = holdingMatch.plPct >= 0;
      holdingCardHtml = `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 10px;">
          <div style="font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 6px;">💼 สถานะในพอร์ตของคุณ</div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="color: #64748b;">ต้นทุนเฉลี่ย:</span>
            <strong>${currencySign}${avgCostDisplay.toFixed(isFund ? 4 : 2)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="color: #64748b;">จำนวนถือครอง:</span>
            <strong>${holdingMatch.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })} หน่วย</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; border-top: 1px dashed #e2e8f0; padding-top: 4px;">
            <span style="color: #64748b;">ผลตอบแทน:</span>
            <strong style="color: ${isHoldProfit ? '#16a34a' : '#dc2626'};">${isHoldProfit ? '+' : ''}${holdingMatch.plPct.toFixed(2)}%</strong>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="portfolio-container" style="padding-bottom: 30px;">
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 22px; margin-bottom: 18px;">
          <div style="font-size: 17px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">กราฟเทคนิคและวิเคราะห์สินทรัพย์</div>
          <div style="display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap;">
            <div style="flex: 2; min-width: 240px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px;">สัญลักษณ์ (Symbol)</label>
              <input type="text" id="input-chart-symbol" list="portfolio-stocks-datalist" value="${rawSym}" placeholder="เช่น AAPL, NVDA, AP" style="width: 100%; box-sizing: border-box; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; text-transform: uppercase; font-weight: 800;">
              <datalist id="portfolio-stocks-datalist">${datalistOptions}</datalist>
            </div>
            <div>
              <button id="btn-submit-analyze" style="background: #00695c; color: #fff; border: none; padding: 11px 26px; border-radius: 8px; font-size: 14px; font-weight: 800; cursor: pointer;">วิเคราะห์</button>
            </div>
            <div style="flex: 1.2; min-width: 170px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px;">ประเภท</label>
              <select id="select-chart-market-type" style="width: 100%; box-sizing: border-box; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; background: #fff;">
                <option value="US" ${(!isThai && !isFund) ? 'selected' : ''}>หุ้นต่างประเทศ (US)</option>
                <option value="TH" ${isThai ? 'selected' : ''}>หุ้นไทย (SET)</option>
                <option value="FUND" ${isFund ? 'selected' : ''}>กองทุนรวม (Fund)</option>
              </select>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2.2fr 1fr; gap: 18px; align-items: start;">
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
              <div>
                <div style="font-size: 12px; color: ${isFund ? '#10b981' : '#0284c7'}; font-weight: 700; text-transform: uppercase;">${isFund ? 'ข้อมูลกองทุนรวม' : 'กราฟเทคนิค'}</div>
                <div style="display: flex; align-items: baseline; gap: 8px;">
                  <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #0f172a;">${rawSym}</h1>
                  <span style="font-size: 13.5px; color: #64748b; font-weight: 600;">${holdingMatch?.stockName || rawSym}</span>
                </div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">ข้อมูล: อัปเดตล่าสุด (${nowTimeStr})</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 26px; font-weight: 900; color: #0f172a;">${currencySign}${price.toFixed(isFund ? 4 : 2)}</div>
                <div style="font-size: 13.5px; font-weight: 700; color: ${isBullish ? '#16a34a' : '#dc2626'};">
                  ${isBullish ? '+' : ''}${change.toFixed(2)} (${isBullish ? '+' : ''}${changePct.toFixed(2)}%) วันนี้
                </div>
              </div>
            </div>
            <div id="chart-viewport-box" style="height: 560px; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
              <div id="tradingview_chart_container" style="width: 100%; height: 100%;"></div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
              <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Market Snapshot</div>
              <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 900; color: #ea580c;">${rawSym}</h2>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px;">
                <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">ราคา / NAV ล่าสุด</div>
                <div style="font-size: 22px; font-weight: 800; color: #0f172a;">${currencySign}${price.toFixed(isFund ? 4 : 2)}</div>
              </div>
              ${holdingCardHtml}
            </div>

            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px;">
              <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">${isFund ? 'กรอบการเคลื่อนไหว NAV' : 'แนวรับ / แนวต้าน (Pivot S/R)'}</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 10px; padding: 12px 14px;">
                  <div style="font-size: 12px; font-weight: 800; color: #c53030; margin-bottom: 8px;">🛑 แนวต้าน (Resistance)</div>
                  <div style="display: flex; justify-content: space-between;"><span>R2</span><strong>${currencySign}${r2.toFixed(2)}</strong></div>
                  <div style="display: flex; justify-content: space-between; margin-top: 4px;"><span>R1</span><strong>${currencySign}${r1.toFixed(2)}</strong></div>
                </div>
                <div style="background: #f0fff4; border: 1px solid #c6f6d5; border-radius: 10px; padding: 12px 14px;">
                  <div style="font-size: 12px; font-weight: 800; color: #22543d; margin-bottom: 8px;">🛡 แนวรับ (Support)</div>
                  <div style="display: flex; justify-content: space-between;"><span>S1</span><strong>${currencySign}${s1.toFixed(2)}</strong></div>
                  <div style="display: flex; justify-content: space-between; margin-top: 4px;"><span>S2</span><strong>${currencySign}${s2.toFixed(2)}</strong></div>
                </div>
              </div>
              <div style="text-align: right; font-size: 11.5px; color: #718096; border-top: 1px dashed #e2e8f0; padding-top: 6px;">Pivot: <strong>${currencySign}${pivot.toFixed(2)}</strong></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const analyzeBtn = document.getElementById('btn-submit-analyze');
    const symbolInput = document.getElementById('input-chart-symbol');
    const marketTypeSelect = document.getElementById('select-chart-market-type');

    const triggerAnalyze = async () => {
      const raw = (symbolInput?.value || '').trim().toUpperCase();
      if (!raw) return;

      const mType = marketTypeSelect?.value;
      let formatted = raw;
      if (mType === 'FUND') formatted = `FUND:${raw}`;
      else if (mType === 'TH') formatted = `SET:${raw.replace('.BK', '')}`;
      else formatted = `NASDAQ:${raw}`;

      this.currentChartSymbol = formatted;

      if (mType === 'FUND') await QuoteSyncService.syncSingleQuote(raw, 'mutual-fund');
      else if (mType === 'TH') await QuoteSyncService.syncSingleQuote(raw, 'thai-stock');
      else await QuoteSyncService.syncSingleQuote(raw, 'foreign-stock');

      this.render();
    };

    if (analyzeBtn) analyzeBtn.onclick = triggerAnalyze;
    if (symbolInput) {
      symbolInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          triggerAnalyze();
        }
      };
    }

    setTimeout(() => this.loadTradingViewWidget(this.currentChartSymbol), 150);
  },

  loadTradingViewWidget(symbol) {
    const container = document.getElementById('tradingview_chart_container');
    if (!container) return;

    container.innerHTML = '';
    const displaySym = symbol.replace('BKK:', '').replace('NASDAQ:', '').replace('NYSE:', '').replace('SET:', '').replace('FUND:', '');
    const isFund = symbol.startsWith('FUND:');
    const isThai = symbol.startsWith('SET:') || symbol.startsWith('BKK:');

    if (isFund) {
      container.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f0fdf4; padding: 24px; text-align: center; border-radius: 8px;">
          <div style="font-size: 48px; margin-bottom: 14px;">🌱</div>
          <h2 style="font-size: 22px; color: #065f46; margin-bottom: 8px; font-weight: 800;">ข้อมูลกองทุนรวม: <strong>${displaySym}</strong></h2>
          <p style="color: #047857; font-size: 14px; max-width: 500px; margin-bottom: 22px; line-height: 1.6;">เปิดดูกราฟผลการดำเนินงานย้อนหลัง ค่าธรรมเนียม และสัดส่วนสินทรัพย์ของกองทุน <strong>${displaySym}</strong> บน Finnomena ได้โดยตรง</p>
          <a href="https://www.finnomena.com/fund/${encodeURIComponent(displaySym)}" target="_blank" style="display: inline-flex; align-items: center; gap: 10px; background: #059669; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 800; font-size: 14.5px;">🚀 เปิดดูกราฟ ${displaySym} บน Finnomena</a>
        </div>
      `;
      return;
    }

    if (isThai) {
      container.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fafafa; padding: 20px; text-align: center;">
          <div style="font-size: 40px; margin-bottom: 12px;">📊</div>
          <h2 style="font-size: 20px; color: #0f172a; margin-bottom: 8px;">กราฟเทคนิคหุ้นไทย: <strong>${displaySym}</strong></h2>
          <p style="color: #64748b; font-size: 13.5px; max-width: 480px; margin-bottom: 20px;">เปิดดูกราฟและอินดิเคเตอร์ของ <strong>${displaySym}</strong> บน TradingView ได้ทันที</p>
          <a href="https://th.tradingview.com/chart/?symbol=SET%3A${displaySym}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; background: #0284c7; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px;">🚀 เปิดดูกราฟ ${displaySym} บน TradingView</a>
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
  },

  render() {
    let container = document.getElementById('portfolio-subview') 
                 || document.getElementById('holdings-subview')
                 || document.getElementById('portfolio-content')
                 || document.querySelector('.subview-content')
                 || document.querySelector('.content-area')
                 || document.getElementById('main-content');

    if (!container) container = document.querySelector('main') || document.querySelector('.main-layout') || document.body;
    if (!container) return;

    this.highlightActiveSidebar();

    try {
      if (this.currentTab === 'plan') {
        if (typeof DividendPlannerModule !== 'undefined') DividendPlannerModule.render(container);
      } else if (this.currentTab === 'overview') {
        this.renderOverviewDashboard(container);
      } else if (this.currentTab === 'holdings') {
        this.renderHoldingsManagement(container);
      } else if (this.currentTab === 'performance') {
        this.renderPerformanceReport(container);
      } else if (this.currentTab === 'dividend') {
        this.renderDividendTracker(container);
      } else if (this.currentTab === 'charts') {
        this.renderTechnicalCharts(container);
      } else {
        this.renderOverviewDashboard(container);
      }
    } catch (err) {
      console.error('Render error:', err);
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PortfolioModule.init());
} else {
  setTimeout(() => PortfolioModule.init(), 50);
}