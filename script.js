document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "rechnungsCockpit_v2";
  const THEME_KEY = "rechnungsCockpit_theme";

  // Form elements
  const form = document.getElementById("invoiceForm");
  const numberInput = document.getElementById("invoiceNumber");
  const supplierInput = document.getElementById("supplier");
  const amountInput = document.getElementById("amount");
  const dueDateInput = document.getElementById("dueDate");
  const skontoPercentInput = document.getElementById("skontoPercent");
  const skontoDateInput = document.getElementById("skontoDate");
  const noteInput = document.getElementById("note");
  const skontoInfo = document.getElementById("skontoInfo");
  const clearFormBtn = document.getElementById("clearFormBtn");
  const saveBtn = document.getElementById("saveBtn");
  const supplierDatalist = document.getElementById("supplierDatalist");

  // Table / filter elements
  const tableBody = document.getElementById("invoiceTableBody");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const filterButtons = document.querySelectorAll("[data-filter]");
  const monthFilter = document.getElementById("monthFilter");
  const yearFilter = document.getElementById("yearFilter");

  // Supplier dashboard / sums
  const supplierCardsContainer = document.getElementById("supplierCards");
  const sumOpenEl = document.getElementById("sumOpen");
  const sumOverdueEl = document.getElementById("sumOverdue");
  const sumSkontoEl = document.getElementById("sumSkonto");

  // Theme
  const themeToggle = document.getElementById("themeToggle");

  // State
  let invoices = loadInvoices();
  let currentFilter = "open";
  let currentSearch = "";
  let currentMonth = "all";
  let currentYear = "all";
  let currentSupplierFilter = "all";
  let sortKey = "dueDate";
  let sortDir = 1; // 1=asc, -1=desc
  let editId = null;

  // Init
  initTheme();
  initDateDefaults();
  attachEvents();
  renderAll();

  // === INIT FUNCTIONS ===

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark") {
      document.body.classList.add("dark");
      themeToggle.textContent = "🌙";
    } else {
      themeToggle.textContent = "🌞";
    }
  }

  function initDateDefaults() {
    const today = new Date().toISOString().slice(0, 10);
    dueDateInput.value = today;
  }

  function attachEvents() {
    // Theme toggle
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      themeToggle.textContent = isDark ? "🌙" : "🌞";
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    });

    // Skonto info live
    amountInput.addEventListener("input", updateSkontoInfo);
    skontoPercentInput.addEventListener("change", updateSkontoInfo);

    clearFormBtn.addEventListener("click", () => {
      form.reset();
      editId = null;
      saveBtn.textContent = "Rechnung speichern";
      clearFormBtn.textContent = "Felder leeren";
      initDateDefaults();
      updateSkontoInfo();
    });

    form.addEventListener("submit", handleSaveInvoice);

    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        renderAll();
      });
    });

    searchInput.addEventListener("input", () => {
      currentSearch = searchInput.value.trim().toLowerCase();
      renderAll();
    });

    monthFilter.addEventListener("change", () => {
      currentMonth = monthFilter.value;
      renderAll();
    });

    yearFilter.addEventListener("change", () => {
      currentYear = yearFilter.value;
      renderAll();
    });

    // Table actions
    tableBody.addEventListener("click", (event) => {
      const target = event.target;
      const id = target.dataset.id;
      if (!id) return;

      if (target.classList.contains("edit-btn")) {
        startEdit(id);
      } else if (target.classList.contains("delete-btn")) {
        deleteInvoice(id);
      }
    });

    tableBody.addEventListener("change", (event) => {
      const target = event.target;
      if (target.classList.contains("paid-checkbox")) {
        const id = target.dataset.id;
        togglePaid(id, target.checked);
      }
    });

    // Sorting
    const headers = document.querySelectorAll(".invoice-table th[data-sort]");
    headers.forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (sortKey === key) {
          sortDir = -sortDir;
        } else {
          sortKey = key;
          sortDir = 1;
        }
        headers.forEach((h) => {
          h.classList.remove("sort-asc", "sort-desc");
        });
        th.classList.add(sortDir === 1 ? "sort-asc" : "sort-desc");
        renderTable();
      });
    });
  }

  // === STORAGE ===

  function loadInvoices() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("Konnte Daten nicht laden:", e);
      return [];
    }
  }

  function saveInvoices() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  }

  // === FORM & CRUD ===

  function handleSaveInvoice(e) {
    e.preventDefault();

    const number = numberInput.value.trim();
    const supplier = supplierInput.value.trim();
    const amount = parseFloat(String(amountInput.value).replace(",", "."));
    const dueDate = dueDateInput.value;
    const skontoPercent = skontoPercentInput.value
      ? parseFloat(skontoPercentInput.value)
      : null;
    const skontoDate = skontoDateInput.value || null;
    const note = noteInput.value.trim();

    if (!number || !supplier || !dueDate || isNaN(amount)) {
      alert("Bitte Rechnungsnummer, Lieferant, Betrag und Fälligkeitsdatum ausfüllen.");
      return;
    }

    const base = {
      number,
      supplier,
      amount,
      dueDate,
      skontoPercent,
      skontoDate,
      note,
    };

    if (editId) {
      const idx = invoices.findIndex((inv) => inv.id === editId);
      if (idx !== -1) {
        invoices[idx] = {
          ...invoices[idx],
          ...base,
        };
      }
      editId = null;
      saveBtn.textContent = "Rechnung speichern";
      clearFormBtn.textContent = "Felder leeren";
    } else {
      const invoice = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        ...base,
        paid: false,
        createdAt: new Date().toISOString(),
      };
      invoices.push(invoice);
    }

    saveInvoices();
    form.reset();
    initDateDefaults();
    updateSkontoInfo();
    renderAll();
  }

  function startEdit(id) {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;

    editId = id;
    numberInput.value = inv.number;
    supplierInput.value = inv.supplier;
    amountInput.value = inv.amount;
    dueDateInput.value = inv.dueDate;
    skontoPercentInput.value = inv.skontoPercent ?? "";
    skontoDateInput.value = inv.skontoDate || "";
    noteInput.value = inv.note || "";

    updateSkontoInfo();

    saveBtn.textContent = "Rechnung aktualisieren";
    clearFormBtn.textContent = "Bearbeitung abbrechen";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteInvoice(id) {
    if (!confirm("Rechnung wirklich löschen?")) return;
    invoices = invoices.filter((inv) => inv.id !== id);
    saveInvoices();
    renderAll();
  }

  function togglePaid(id, paid) {
    const idx = invoices.findIndex((inv) => inv.id === id);
    if (idx === -1) return;
    invoices[idx].paid = paid;
    saveInvoices();
    renderAll();
  }

  // === SKONTO ===

  function updateSkontoInfo() {
    const amount = parseFloat(String(amountInput.value).replace(",", "."));
    const percent = skontoPercentInput.value
      ? parseFloat(skontoPercentInput.value)
      : null;

    if (!percent || isNaN(amount)) {
      skontoInfo.textContent = "Kein Skonto ausgewählt.";
      return;
    }

    const skontoAmount = amount * (percent / 100);
    const net = amount - skontoAmount;

    skontoInfo.textContent =
      `${percent}% Skonto: ${formatCurrency(skontoAmount)} → Zahlbetrag mit Skonto: ${formatCurrency(net)}.`;
  }

  function calcSkontoAmount(inv) {
    if (!inv.skontoPercent) return 0;
    return inv.amount * (inv.skontoPercent / 100);
  }

  // === STATUS, FILTER, SORT ===

  function getStatus(inv) {
    const today = toDateOnly(new Date());
    const due = inv.dueDate ? toDateOnly(new Date(inv.dueDate)) : null;
    const skonto = inv.skontoDate ? toDateOnly(new Date(inv.skontoDate)) : null;

    if (inv.paid) {
      return { type: "paid", label: "Bezahlt", short: "Bezahlt" };
    }

    if (due && due < today) {
      return { type: "overdue", label: "Überfällig", short: "Überf." };
    }

    if (skonto && today <= skonto) {
      return {
        type: "skonto",
        label: "Skonto-Phase (Skonto noch möglich)",
        short: "Skonto",
      };
    }

    return { type: "open", label: "Offen", short: "Offen" };
  }

  function getFilteredInvoices() {
    return invoices.filter((inv) => {
      const status = getStatus(inv);

      // Status-Filter
      if (currentFilter !== "all" && status.type !== currentFilter) {
        return false;
      }

      // Lieferanten-Filter (Karte)
      if (currentSupplierFilter !== "all" && inv.supplier !== currentSupplierFilter) {
        return false;
      }

      // Monats-/Jahresfilter (nach Fälligkeitsdatum)
      if (currentMonth !== "all" || currentYear !== "all") {
        const d = inv.dueDate ? new Date(inv.dueDate) : null;
        if (!d || isNaN(d)) return false;

        const month = d.getMonth() + 1;
        const year = d.getFullYear();

        if (currentMonth !== "all" && Number(currentMonth) !== month) return false;
        if (currentYear !== "all" && Number(currentYear) !== year) return false;
      }

      // Suche
      if (currentSearch) {
        const haystack = (
          (inv.number || "") +
          " " +
          (inv.supplier || "") +
          " " +
          (inv.note || "")
        ).toLowerCase();

        if (!haystack.includes(currentSearch)) {
          return false;
        }
      }

      return true;
    });
  }

  function sortInvoices(list) {
    return [...list].sort((a, b) => {
      let va, vb;

      switch (sortKey) {
        case "number":
          va = (a.number || "").toLowerCase();
          vb = (b.number || "").toLowerCase();
          break;
        case "supplier":
          va = (a.supplier || "").toLowerCase();
          vb = (b.supplier || "").toLowerCase();
          break;
        case "amount":
          va = a.amount || 0;
          vb = b.amount || 0;
          break;
        case "skontoPercent":
          va = a.skontoPercent || 0;
          vb = b.skontoPercent || 0;
          break;
        case "skontoAmount":
          va = calcSkontoAmount(a);
          vb = calcSkontoAmount(b);
          break;
        case "skontoDate":
          va = a.skontoDate ? new Date(a.skontoDate).getTime() : 0;
          vb = b.skontoDate ? new Date(b.skontoDate).getTime() : 0;
          break;
        case "status":
          va = getStatus(a).type;
          vb = getStatus(b).type;
          break;
        case "dueDate":
        default:
          va = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          vb = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          break;
      }

      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
  }

  // === RENDER ===

  function renderAll() {
    renderFiltersMonthYear();
    renderTable();
    renderSupplierDashboard();
    renderSummaries();
  }

  function renderTable() {
    const filtered = sortInvoices(getFilteredInvoices());

    if (filtered.length === 0) {
      tableBody.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    const rows = filtered
      .map((inv) => {
        const status = getStatus(inv);
        const rowClass = `row-${status.type}`;
        const skontoAmount = calcSkontoAmount(inv);
        const skontoAmountText = skontoAmount
          ? formatCurrency(skontoAmount)
          : "–";

        return `
        <tr class="${rowClass}">
          <td>
            <span class="status-pill status-${status.type}">
              <span class="dot dot-${status.type}"></span>${status.short}
            </span>
          </td>
          <td><strong>${escapeHtml(inv.number)}</strong></td>
          <td>${escapeHtml(inv.supplier)}</td>
          <td class="numeric">${formatCurrency(inv.amount)}</td>
          <td class="numeric">${inv.skontoPercent ? inv.skontoPercent + " %" : "–"}</td>
          <td class="numeric">${skontoAmountText}</td>
          <td>${inv.skontoDate ? formatDate(inv.skontoDate) : "–"}</td>
          <td>${inv.dueDate ? formatDate(inv.dueDate) : "–"}</td>
          <td>${status.label}</td>
          <td class="checkbox-center">
            <input type="checkbox" class="paid-checkbox" data-id="${inv.id}" ${
          inv.paid ? "checked" : ""
        } />
          </td>
          <td>
            <div class="action-buttons">
              <button class="action-btn edit edit-btn" data-id="${inv.id}">Bearbeiten</button>
              <button class="action-btn delete delete-btn" data-id="${inv.id}">✖</button>
            </div>
          </td>
        </tr>`;
      })
      .join("");

    tableBody.innerHTML = rows;
  }

  function renderFiltersMonthYear() {
    // Jahre sammeln
    const yearsSet = new Set();
    invoices.forEach((inv) => {
      if (!inv.dueDate) return;
      const y = new Date(inv.dueDate).getFullYear();
      if (!isNaN(y)) yearsSet.add(y);
    });
    const years = Array.from(yearsSet).sort((a, b) => a - b);

    yearFilter.innerHTML = `<option value="all">Alle Jahre</option>` +
      years.map((y) => `<option value="${y}" ${currentYear == y ? "selected" : ""}>${y}</option>`).join("");

    // Monate statisch
    const monthsNames = [
      "Jänner",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
    ];

    monthFilter.innerHTML = `<option value="all">Alle Monate</option>` +
      monthsNames
        .map(
          (m, idx) =>
            `<option value="${idx + 1}" ${
              Number(currentMonth) === idx + 1 ? "selected" : ""
            }>${m}</option>`
        )
        .join("");
  }

  function renderSupplierDashboard() {
    const statsBySupplier = {};

    invoices.forEach((inv) => {
      const supplier = inv.supplier || "Unbekannt";
      if (!statsBySupplier[supplier]) {
        statsBySupplier[supplier] = {
          supplier,
          count: 0,
          sumOpen: 0,
          sumOverdue: 0,
          sumSkonto: 0,
        };
      }
      const s = statsBySupplier[supplier];
      s.count += 1;

      const status = getStatus(inv);
      if (!inv.paid) {
        s.sumOpen += inv.amount;
        if (status.type === "overdue") s.sumOverdue += inv.amount;
        if (status.type === "skonto") s.sumSkonto += inv.amount;
      }
    });

    const suppliers = Object.values(statsBySupplier).sort((a, b) =>
      a.supplier.localeCompare(b.supplier)
    );

    if (suppliers.length === 0) {
      supplierCardsContainer.innerHTML =
        `<p style="font-size:0.8rem;color:var(--muted);">Noch keine Lieferanten vorhanden.</p>`;
    } else {
      supplierCardsContainer.innerHTML = suppliers
        .map((s) => {
          const active = currentSupplierFilter === s.supplier ? "active" : "";
          return `
        <div class="supplier-card ${active}" data-supplier="${escapeHtml(
            s.supplier
          )}">
          <div class="supplier-card-header">
            <span class="supplier-name">${escapeHtml(s.supplier)}</span>
            <span class="supplier-count">${s.count} Rechn.</span>
          </div>
          <div class="supplier-sums">
            <span>Offen: ${formatCurrency(s.sumOpen)}</span>
          </div>
          <div class="supplier-sums">
            <span>Überfällig: ${formatCurrency(s.sumOverdue)}</span>
            <span>Skonto: ${formatCurrency(s.sumSkonto)}</span>
          </div>
        </div>`;
        })
        .join("");
    }

    // Click handling
    supplierCardsContainer.querySelectorAll(".supplier-card").forEach((card) => {
      card.addEventListener("click", () => {
        const supplier = card.dataset.supplier;
        if (currentSupplierFilter === supplier) {
          currentSupplierFilter = "all";
        } else {
          currentSupplierFilter = supplier;
        }
        renderAll();
      });
    });

    // datalist für Lieferanten (für schnelles Ausfüllen)
    const dlOptions = suppliers
      .map((s) => `<option value="${escapeHtml(s.supplier)}"></option>`)
      .join("");
    supplierDatalist.innerHTML = dlOptions;
  }

  function renderSummaries() {
    let sumOpen = 0;
    let sumOverdue = 0;
    let sumSkonto = 0;

    invoices.forEach((inv) => {
      if (inv.paid) return;
      const status = getStatus(inv);
      sumOpen += inv.amount || 0;
      if (status.type === "overdue") sumOverdue += inv.amount || 0;
      if (status.type === "skonto") sumSkonto += inv.amount || 0;
    });

    sumOpenEl.textContent = formatCurrency(sumOpen);
    sumOverdueEl.textContent = formatCurrency(sumOverdue);
    sumSkontoEl.textContent = formatCurrency(sumSkonto);
  }

  // === HELPERS ===

  function formatCurrency(amount) {
    if (isNaN(amount)) return "€ 0,00";
    try {
      return new Intl.NumberFormat("de-AT", {
        style: "currency",
        currency: "EUR",
      }).format(amount);
    } catch {
      return "€ " + amount.toFixed(2).replace(".", ",");
    }
  }

  function formatDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d)) return value;
    return d.toLocaleDateString("de-AT");
  }

  function toDateOnly(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
