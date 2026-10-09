(() => {
  function initCalculator() {
    const root = document.getElementById("calculators");
    if (!root) return;

    root.onclick = (e) => { e.stopPropagation(); };
    root.onmousedown = (e) => { e.stopPropagation(); };

    const STORAGE_KEY = "wealthport:avg-cost-ledger:v1";
    const QUOTE_CACHE_KEY = "stock-trading-log:quote-cache:v1";
    const sampleRows = [
      ["buy", "2026-01-01", 5000, 8.31, "ไม้ที่ 1"],
      ["buy", "2026-01-08", 5000, 7.96, "ไม้ที่ 2"],
      ["buy", "2026-01-15", 5000, 7.81, "ไม้ที่ 3"],
      ["buy", "2026-01-22", 5000, 7.46, "ไม้ที่ 4"],
      ["buy", "2026-01-29", 5000, 7.66, "ไม้ที่ 5"],
      ["buy", "2026-02-05", 5000, 7.46, "ไม้ที่ 6"],
      ["buy", "2026-02-12", 20000, 7.16, "ไม้ที่ 7"],
      ["buy", "2026-02-19", 3000, 6.96, "ไม้ที่ 8"],
      ["buy", "2026-02-26", 5000, 5.91, "ไม้ที่ 9"],
      ["buy", "2026-03-05", 10000, 5.41, "ไม้ที่ 10"],
      ["sell", "2026-03-12", 2000, 4, "ขายบางส่วน"],
    ];

    const $ = (id) => root.querySelector(`#${id}`) || document.getElementById(id);
    const getField = (selector) => root.querySelector(selector);
    const parseNumber = (val) => Number(String(val || "").replace(/,/g, "").replace(/[฿$]/g, "").replace(/[^0-9.-]/g, "")) || 0;
    const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const today = () => new Date().toISOString().slice(0, 10);
    const fmt = (val, digits = 2) => Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
    const fmtShares = (val) => Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 6 });

    const normalizeType = (val) => {
      const text = String(val || "").trim().toLowerCase();
      if (["sell", "ขาย"].includes(text)) return "sell";
      if (["split", "stock split", "แตกพาร์"].includes(text)) return "split";
      if (["dividend", "div", "ปันผล"].includes(text)) return "dividend";
      return "buy";
    };

    const formatDate = (val) => {
      if (!val) return "-";
      const [year, month, day] = String(val).split("-");
      return year && month && day ? `${day}/${month}/${year}` : val;
    };

    const els = {
      form: $("avgCostForm"),
      type: $("avgCostType") || root.querySelectorAll("select")[0],
      date: $("avgCostDate") || getField("input[type='date']"),
      quantity: $("avgCostQuantity") || getField("input[placeholder*='5,000']"),
      price: $("avgCostUnitPrice") || getField("input[placeholder*='8.31']"),
      note: $("avgCostNote") || getField("input[placeholder*='ไม้ที่']"),
      rows: $("avgCostRows") || getField("tbody"),
      shares: $("avgCostShares"),
      avgPrice: $("avgCostPrice"),
      total: $("avgCostTotal"),
      count: $("avgCostCount"),
      footerShares: $("avgCostFooterShares"),
      footerGross: $("avgCostFooterGross"),
      footerTotalShares: $("avgCostFooterTotalShares"),
      footerAvg: $("avgCostFooterAvg"),
      importPortfolio: $("avgImportPortfolio") || root.querySelectorAll("select")[1],
      importSymbol: $("avgImportSymbol") || root.querySelectorAll("select")[2],
      importButton: $("avgImportButton") || Array.from(root.querySelectorAll("button")).find((b) => b.textContent.includes("ดึงจากพอร์ต")),
      importRefresh: $("avgImportRefresh") || Array.from(root.querySelectorAll("button")).find((b) => b.textContent.includes("รีเฟรช")),
      importNote: $("avgImportNote") || getField(".avg-import-note"),
      targetBuyPrice: $("avgTargetBuyPrice") || getField("input[placeholder*='6.50']"),
      targetPrice: $("avgTargetPrice") || getField("input[placeholder*='7.00']"),
      targetMode: $("avgTargetMode") || root.querySelectorAll("select")[3],
      targetExtra: $("avgTargetExtra") || getField("input[placeholder*='20,000']"),
      targetExtraLabel: $("avgTargetExtraLabel"),
      targetStatus: $("avgTargetStatus") || getField(".target-status"),
      targetNeedShares: $("avgTargetNeedShares"),
      targetNeedAmount: $("avgTargetNeedAmount"),
      targetExtraAvg: $("avgTargetExtraAvg"),
      targetExtraDetail: $("avgTargetExtraDetail"),
      targetExtraResultLabel: $("avgTargetExtraResultLabel"),
      targetNote: $("avgTargetNote"),
      comparePanel: $("avgComparePanel"),
      cmpBeforeShares: $("cmpBeforeShares"),
      cmpBeforeAvg: $("cmpBeforeAvg"),
      cmpBeforeTotal: $("cmpBeforeTotal"),
      cmpAfterShares: $("cmpAfterShares"),
      cmpAfterAvg: $("cmpAfterAvg"),
      cmpAfterTotal: $("cmpAfterTotal"),
      avgStrategyBadge: $("avgStrategyBadge"),
      avgSummaryDynamicText: $("avgSummaryDynamicText"),
      marketBar: $("avgMarketBar"),
      marketPrice: $("avgMarketPrice"),
      marketPnlBadge: $("avgMarketPnlBadge"),
      btnUseMarketPrice: $("avgUseMarketPrice"),
    };

    function applyBannerStyle(el, type = "info") {
      if (!el) return;
      el.style.display = "block";
      el.style.width = "100%";
      el.style.boxSizing = "border-box";
      el.style.padding = "12px 18px";
      el.style.borderRadius = "10px";
      el.style.fontSize = "13.5px";
      el.style.fontWeight = "600";
      el.style.marginTop = "14px";
      el.style.marginBottom = "8px";
      el.style.transition = "all 0.2s ease";

      if (type === "ok" || type === "success") {
        el.style.background = "#eefcf3";
        el.style.border = "1px solid #bbf7d0";
        el.style.color = "#00796b";
      } else if (type === "warn" || type === "warning") {
        el.style.background = "#fefce8";
        el.style.border = "1px solid #fef08a";
        el.style.color = "#a16207";
      } else {
        el.style.background = "#f8fafc";
        el.style.border = "1px solid #e2e8f0";
        el.style.color = "#475569";
      }
    }

    let records = load();

    function load() {
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    function save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }

    function getCurrencySymbol(symbol = "") {
      const sym = String(symbol || els.importSymbol?.value || "").trim().toUpperCase();
      if (sym.endsWith(".BK") || sym.startsWith("SCB") || sym.startsWith("K-") || sym.startsWith("T-")) {
        return "฿";
      }
      const portName = (els.importPortfolio?.selectedOptions?.[0]?.text || "").toUpperCase();
      if (portName.includes("DIME") || portName.includes("US") || portName.includes("FOREIGN") || (sym && !sym.includes(".") && /^[A-Z]{1,5}$/.test(sym))) {
        return "$";
      }
      return "฿";
    }

    function withRunningLedger(items) {
      let shares = 0, totalCost = 0, avgCost = 0, gross = 0;
      return items.map((item, index) => {
        const type = normalizeType(item.type);
        const qty = parseNumber(item.quantity);
        const price = parseNumber(item.price);
        const isBuy = type === "buy";
        const isSell = type === "sell";
        const isSplit = type === "split";
        const amount = isBuy ? qty * price : isSell ? qty * price * -1 : 0;

        if (isBuy) {
          shares += qty;
          totalCost += qty * price;
          gross += qty * price;
          avgCost = shares > 0 ? totalCost / shares : 0;
        } else if (isSell) {
          const sellQty = Math.min(qty, shares);
          shares -= sellQty;
          totalCost -= sellQty * avgCost;
          gross -= qty * price;
          if (shares <= 0.0000001) { shares = 0; totalCost = 0; avgCost = 0; }
        } else if (isSplit) {
          const ratio = parseNumber(item.splitRatio) || 1;
          if (ratio > 0 && shares > 0) {
            shares *= ratio;
            avgCost /= ratio;
          }
        }
        return {
          ...item,
          index: index + 1,
          amount,
          runningShares: shares,
          runningAvg: avgCost,
          runningTotalCost: totalCost,
          gross,
        };
      });
    }

    function currentPosition() {
      const ledger = withRunningLedger(records);
      return ledger.at(-1) || { runningShares: 0, runningAvg: 0, runningTotalCost: 0, gross: 0 };
    }

    function updateComparePanel(currentShares, currentAvg, buyShares, buyPrice) {
      const panel = els.comparePanel || document.getElementById("avgComparePanel");
      if (!panel) return;

      if (currentShares <= 0 || buyShares <= 0 || buyPrice <= 0) {
        panel.style.display = "none";
        return;
      }

      const curr = getCurrencySymbol();
      const currentTotal = currentShares * currentAvg;
      const newShares = currentShares + buyShares;
      const newTotal = currentTotal + (buyShares * buyPrice);
      const newAvg = newTotal / newShares;
      const diffPct = ((newAvg - currentAvg) / currentAvg) * 100;
      const isAverageDown = newAvg < currentAvg;

      if (els.cmpBeforeShares) els.cmpBeforeShares.textContent = `${fmtShares(currentShares)} หุ้น`;
      if (els.cmpBeforeAvg) els.cmpBeforeAvg.textContent = `${fmt(currentAvg)} ${curr}`;
      if (els.cmpBeforeTotal) els.cmpBeforeTotal.textContent = `${fmt(currentTotal)} ${curr}`;

      if (els.cmpAfterShares) els.cmpAfterShares.textContent = `${fmtShares(newShares)} หุ้น (+${fmtShares(buyShares)})`;
      if (els.cmpAfterAvg) els.cmpAfterAvg.textContent = `${fmt(newAvg)} ${curr} (${diffPct > 0 ? "+" : ""}${diffPct.toFixed(2)}%)`;
      if (els.cmpAfterTotal) els.cmpAfterTotal.textContent = `${fmt(newTotal)} ${curr}`;

      if (els.avgStrategyBadge) {
        if (isAverageDown) {
          els.avgStrategyBadge.className = "avg-strategy-badge down";
          els.avgStrategyBadge.textContent = `📉 ถัวลดต้นทุน ลง ${Math.abs(diffPct).toFixed(2)}%`;
        } else {
          els.avgStrategyBadge.className = "avg-strategy-badge up";
          els.avgStrategyBadge.textContent = `📈 ซื้อเฉลี่ยขาขึ้น +${diffPct.toFixed(2)}%`;
        }
      }

      if (els.avgSummaryDynamicText) {
        els.avgSummaryDynamicText.innerHTML = `💡 หากซื้อเพิ่ม <strong>${fmtShares(buyShares)} หุ้น</strong> ที่ราคา <strong>${fmt(buyPrice)} ${curr}</strong> (ใช้เงิน ${fmt(buyShares * buyPrice)} ${curr}) จะทำให้ต้นทุนเฉลี่ยเปลี่ยนจาก <strong>${fmt(currentAvg)} ${curr}</strong> เป็น <strong>${fmt(newAvg)} ${curr}</strong>`;
      }

      panel.style.display = "block";
    }

    function render() {
      const ledger = withRunningLedger(records);
      const current = currentPosition();

      if (els.shares) els.shares.textContent = fmtShares(current.runningShares);
      if (els.avgPrice) els.avgPrice.textContent = fmt(current.runningAvg);
      if (els.total) els.total.textContent = fmt(current.runningTotalCost);
      if (els.count) els.count.textContent = fmtShares(records.length);
      if (els.footerShares) els.footerShares.textContent = fmtShares(current.runningShares);
      if (els.footerGross) els.footerGross.textContent = fmt(current.gross);
      if (els.footerTotalShares) els.footerTotalShares.textContent = fmtShares(current.runningShares);
      if (els.footerAvg) els.footerAvg.textContent = fmt(current.runningAvg);

      renderTargetCalculator(current);

      const rowsContainer = els.rows || root.querySelector("tbody");
      if (!rowsContainer) return;

      if (!ledger.length) {
        rowsContainer.innerHTML = `<tr><td class="avg-cost-empty" colspan="9" style="text-align:center;padding:20px;">ยังไม่มีรายการ เลือก "ดึงจากพอร์ต" หรือใส่ข้อมูลด้านบนแล้วกด "เพิ่มรายการ"</td></tr>`;
        return;
      }

      rowsContainer.innerHTML = ledger.map((item) => {
        const type = normalizeType(item.type);
        const isBuy = type === "buy";
        const isSell = type === "sell";
        const isSplit = type === "split";
        const amountClass = isBuy ? "avg-cost-positive" : isSell ? "avg-cost-negative" : "";
        const typeText = isBuy ? "ซื้อ" : isSell ? "ขาย" : "Split";
        const quantityText = isSplit ? `x${fmt(item.splitRatio || 1)}` : fmtShares(item.quantity);
        return `
          <tr>
            <td>${item.index}</td>
            <td><span class="avg-cost-pill ${type}">${typeText}</span></td>
            <td>${formatDate(item.date)}</td>
            <td class="number">${quantityText}</td>
            <td class="number">${fmt(item.price)}</td>
            <td class="number ${amountClass}">${fmt(item.amount)}</td>
            <td class="number">${fmtShares(item.runningShares)}</td>
            <td class="number">${fmt(item.runningAvg)}</td>
            <td><button type="button" class="avg-cost-delete" data-delete="${item.id}" style="color:red;cursor:pointer;border:none;background:none;">ลบ</button></td>
          </tr>
        `;
      }).join("");
    }

    function renderTargetCalculator(current = currentPosition()) {
      const buyPriceInput = els.targetBuyPrice || root.querySelector("input[placeholder*='6.50']");
      const targetPriceInput = els.targetPrice || root.querySelector("input[placeholder*='7.00']");
      const targetModeSelect = els.targetMode || root.querySelectorAll("select")[3];
      const targetExtraInput = els.targetExtra || root.querySelector("input[placeholder*='20,000']");

      const currentShares = parseNumber(current.runningShares);
      const currentAvg = parseNumber(current.runningAvg);
      const currentCost = parseNumber(current.runningTotalCost);

      const buyPrice = parseNumber(buyPriceInput?.value);
      const targetAvg = parseNumber(targetPriceInput?.value);
      const targetMode = targetModeSelect?.value || "budget";
      const extraRaw = targetExtraInput?.value ? targetExtraInput.value.trim() : "";
      const extraValue = parseNumber(extraRaw);
      const showBudget = targetMode === "budget";
      const curr = getCurrencySymbol();

      if (els.targetExtraLabel) els.targetExtraLabel.textContent = showBudget ? "จำนวนเงินที่จะซื้อเพิ่ม" : "จำนวนหุ้นที่จะซื้อ";
      if (targetExtraInput) targetExtraInput.placeholder = showBudget ? "เช่น 20,000" : "เช่น 3,000";
      if (els.targetExtraResultLabel) els.targetExtraResultLabel.textContent = showBudget ? "เฉลี่ยใหม่จากจำนวนเงิน" : "เฉลี่ยใหม่จากจำนวนหุ้น";

      let requiredShares = 0;
      let requiredAmount = 0;
      let noteHtml = "ใส่ราคาซื้อเพิ่มและต้นทุนเฉลี่ยเป้าหมาย เพื่อคำนวณจำนวนหุ้นที่ต้องซื้อเพิ่ม";
      let tone = "info";

      if (buyPrice > 0 && targetAvg > 0 && currentShares > 0) {
        const isSame = Math.abs(targetAvg - currentAvg) < 0.0000001;
        const isAverageDown = targetAvg < currentAvg;
        const priceValid = (isAverageDown && buyPrice < targetAvg) || (!isAverageDown && buyPrice > targetAvg);

        if (isSame) {
          noteHtml = `เฉลี่ยปัจจุบันเท่ากับเป้าหมายแล้ว (<strong>${fmt(targetAvg)} ${curr}</strong>)`;
          tone = "ok";
        } else if (!priceValid) {
          const dir = isAverageDown ? "ถัวลง" : "ถัวขึ้น";
          const rule = isAverageDown ? "ต่ำกว่า" : "สูงกว่า";
          noteHtml = `กรณี${dir} ราคาซื้อเพิ่มต้อง${rule}เฉลี่ยเป้าหมาย <strong>${fmt(targetAvg)} ${curr}</strong> จึงจะคำนวณให้ถึงเป้าหมายได้`;
          tone = "warn";
        } else {
          requiredShares = (currentCost - targetAvg * currentShares) / (targetAvg - buyPrice);
          requiredAmount = requiredShares * buyPrice;
          const dir = isAverageDown ? "ถัวลง" : "ถัวขึ้น";
          noteHtml = `กรณี${dir}: ถ้าซื้อที่ราคา <strong>${fmt(buyPrice)} ${curr}</strong> ต้องซื้อเพิ่มประมาณ <strong>${fmtShares(requiredShares)}</strong> หุ้น เพื่อให้เฉลี่ยใหม่เป็น <strong>${fmt(targetAvg)} ${curr}</strong>`;
          tone = "ok";
        }
      }

      const needSharesEl = els.targetNeedShares || root.querySelector("[id*='NeedShares']");
      const needAmountEl = els.targetNeedAmount || root.querySelector("[id*='NeedAmount']");
      if (needSharesEl) needSharesEl.textContent = requiredShares > 0 ? fmtShares(requiredShares) : "0";
      if (needAmountEl) needAmountEl.textContent = requiredAmount > 0 ? fmt(requiredAmount) : "0.00";

      const noteEl = els.targetNote || root.querySelector(".target-note");
      if (noteEl) {
        noteHtml && (noteEl.innerHTML = noteHtml);
        applyBannerStyle(noteEl, tone);
      }

      const extraAvgEl = els.targetExtraAvg || root.querySelector("[id*='ExtraAvg']");
      const extraDetailEl = els.targetExtraDetail || root.querySelector("[id*='ExtraDetail']");

      let calculatedBuyShares = requiredShares;
      if (extraRaw !== "" && extraValue > 0 && buyPrice > 0) {
        const addedCost = showBudget ? extraValue : extraValue * buyPrice;
        const addedShares = showBudget ? extraValue / buyPrice : extraValue;
        const totalShares = currentShares + addedShares;
        const newAvg = totalShares > 0 ? (currentCost + addedCost) / totalShares : 0;

        if (extraAvgEl) extraAvgEl.textContent = fmt(newAvg);
        if (extraDetailEl) extraDetailEl.textContent = showBudget ? `ซื้อได้ ${fmtShares(addedShares)} หุ้น` : `ใช้เงิน ${fmt(addedCost)} ${curr}`;
        calculatedBuyShares = addedShares;
      } else {
        if (extraAvgEl) extraAvgEl.textContent = "0.00";
        if (extraDetailEl) extraDetailEl.textContent = showBudget ? "ซื้อได้ 0 หุ้น" : "ใช้เงิน 0.00";
      }

      if (calculatedBuyShares > 0 && buyPrice > 0 && currentShares > 0) {
        updateComparePanel(currentShares, currentAvg, calculatedBuyShares, buyPrice);
      } else {
        updateComparePanel(0, 0, 0, 0);
      }
    }

    function getPortfolioData() {
      const keys = ["stock-trading-log:v3", "stock-trading-log:v2", "stock-trading-log:v1"];
      for (const k of keys) {
        try {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.portfolios) && Array.isArray(parsed.trades)) {
            return parsed;
          }
        } catch {}
      }
      return { portfolios: [], trades: [] };
    }

    function getTradesForPortfolio(selectedPortId) {
      const { portfolios, trades } = getPortfolioData();
      let targetId = selectedPortId;
      if (selectedPortId) {
        const found = portfolios.find((p) => p.id === selectedPortId || p.name === selectedPortId);
        if (found) targetId = found.id;
      }
      return trades.filter((t) => {
        if (!targetId) return true;
        return String(t.portfolioId) === String(targetId);
      });
    }

    function refreshSymbols() {
      const portSelect = els.importPortfolio || root.querySelectorAll("select")[1];
      const symSelect = els.importSymbol || root.querySelectorAll("select")[2];
      if (!symSelect) return;

      const portId = portSelect?.value || "";
      const trades = getTradesForPortfolio(portId);
      const symbolMap = new Map();

      trades.forEach((t) => {
        const type = normalizeType(t.side || t.type);
        if (!["buy", "sell", "split"].includes(type)) return;
        const rawSym = String(t.symbol || "").trim().toUpperCase();
        if (!rawSym) return;
        const cleanSym = rawSym.replace(/\.BK$/, "");
        
        const existing = symbolMap.get(cleanSym) || { count: 0, rawSymbols: new Set() };
        existing.count += 1;
        existing.rawSymbols.add(rawSym);
        symbolMap.set(cleanSym, existing);
      });

      const symbols = Array.from(symbolMap.keys()).sort();
      symSelect.innerHTML = symbols.length
        ? symbols.map((s) => {
            const data = symbolMap.get(s);
            const rawList = Array.from(data.rawSymbols).join(",");
            return `<option value="${rawList}">${s} (${data.count} รายการ)</option>`;
          }).join("")
        : `<option value="">ไม่มีสินทรัพย์ในพอร์ตนี้</option>`;

      const noteEl = els.importNote || root.querySelector(".avg-import-note");
      if (noteEl) {
        if (symbols.length) {
          noteEl.innerHTML = `พบ <strong>${symbols.length}</strong> สินทรัพย์ในพอร์ตนี้ เลือกแล้วกด “ดึงจากพอร์ต”`;
          applyBannerStyle(noteEl, "ok");
        } else {
          noteEl.innerHTML = `ยังไม่มีรายการซื้อขายในพอร์ตนี้`;
          applyBannerStyle(noteEl, "warn");
        }
      }
    }

    function refreshPortfolios() {
      const portSelect = els.importPortfolio || root.querySelectorAll("select")[1];
      if (!portSelect) return;

      const { portfolios } = getPortfolioData();
      const sorted = [...portfolios].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

      portSelect.innerHTML = sorted.length
        ? sorted.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")
        : `<option value="">ทุกพอร์ต</option>`;

      refreshSymbols();
    }

    function executeImport() {
      const portSelect = els.importPortfolio || root.querySelectorAll("select")[1];
      const symSelect = els.importSymbol || root.querySelectorAll("select")[2];
      const selectedValue = (symSelect?.value || "").trim().toUpperCase();

      if (!selectedValue) return;

      const targetSymbols = selectedValue.split(",").map(s => s.trim());
      const trades = getTradesForPortfolio(portSelect?.value || "");
      const allTradesForSym = trades.filter((t) => {
        const tSym = String(t.symbol || "").trim().toUpperCase();
        return targetSymbols.includes(tSym);
      });

      const skippedDividends = allTradesForSym.filter((t) => normalizeType(t.side || t.type) === "dividend").length;
      const matched = allTradesForSym.filter((t) => ["buy", "sell", "split"].includes(normalizeType(t.side || t.type)));

      matched.sort((a, b) => String(a.tradeDate || a.date || "").localeCompare(String(b.tradeDate || b.date || "")));

      const imported = matched.map((t, idx) => ({
        id: `portfolio-${t.id || idx}-${Date.now()}`,
        type: normalizeType(t.side || t.type),
        date: t.tradeDate || t.date || today(),
        quantity: normalizeType(t.side || t.type) === "split" ? 0 : parseNumber(t.quantity ?? t.shares ?? t.volume ?? 0),
        price: normalizeType(t.side || t.type) === "split" ? 0 : parseNumber(t.price ?? t.unitPrice ?? t.cost ?? 0),
        splitRatio: parseNumber(t.splitRatio) || 1,
        note: t.note || t.stockName || t.symbol,
        createdAt: t.createdAt || new Date(Date.now() + idx).toISOString(),
      }));

      records = imported;
      save();
      render();

      const noteEl = els.importNote || root.querySelector(".avg-import-note");
      if (noteEl) {
        const divText = skippedDividends > 0 ? ` (ข้ามปันผล <strong>${skippedDividends}</strong> รายการ)` : "";
        noteEl.innerHTML = `ดึงรายการสำเร็จ <strong>${imported.length}</strong> รายการ${divText}`;
        applyBannerStyle(noteEl, "ok");
      }
    }

    function handleAddRecord() {
      const qtyEl = els.quantity || root.querySelector("input[placeholder*='5,000']");
      const priceEl = els.price || root.querySelector("input[placeholder*='8.31']");
      const noteEl = els.note || root.querySelector("input[placeholder*='ไม้ที่']");
      const dateEl = els.date || root.querySelector("input[type='date']");
      const typeEl = els.type || root.querySelectorAll("select")[0];

      const q = parseNumber(qtyEl?.value);
      const p = parseNumber(priceEl?.value);

      if (!q || !p) return;

      records.push({
        id: uid(),
        type: typeEl?.value || "buy",
        date: dateEl?.value || today(),
        quantity: q,
        price: p,
        note: (noteEl?.value || "").trim(),
        createdAt: new Date().toISOString(),
      });

      save();
      render();

      if (qtyEl) qtyEl.value = "";
      if (priceEl) priceEl.value = "";
      if (noteEl) noteEl.value = "";
      if (qtyEl) qtyEl.focus();
    }

    root.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const text = btn.textContent.trim();
      if (text.includes("ดึงจากพอร์ต") || btn.id === "avgCostImport" || btn.id === "avgImportButton") {
        e.preventDefault();
        executeImport();
        return;
      }
      if (text.includes("รีเฟรช") || btn.id === "avgImportRefresh") {
        e.preventDefault();
        refreshPortfolios();
        return;
      }
      if (text === "เพิ่มรายการ" || btn.id === "avgCostAdd") {
        e.preventDefault();
        handleAddRecord();
        return;
      }
      if (text.includes("ล้าง") || btn.id === "avgCostClear") {
        e.preventDefault();
        records = [];
        save();
        render();
        return;
      }
      if (btn.dataset.delete) {
        e.preventDefault();
        records = records.filter((r) => r.id !== btn.dataset.delete);
        save();
        render();
        return;
      }
    });

    if (els.form) {
      els.form.onsubmit = (e) => {
        e.preventDefault();
        handleAddRecord();
      };
    }

    root.addEventListener("input", () => {
      renderTargetCalculator();
    });

    root.addEventListener("change", (e) => {
      if (e.target === (els.importPortfolio || root.querySelectorAll("select")[1])) {
        refreshSymbols();
      } else {
        renderTargetCalculator();
      }
    });
    
    const buyIn = els.targetBuyPrice || root.querySelector("input[placeholder*='6.50']");
    const targetIn = els.targetPrice || root.querySelector("input[placeholder*='7.00']");
    const extraIn = els.targetExtra || root.querySelector("input[placeholder*='20,000']");
    if (buyIn) buyIn.value = "";
    if (targetIn) targetIn.value = "";
    if (extraIn) extraIn.value = "";
    refreshPortfolios();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCalculator);
  } else {
    initCalculator();
  }
})();