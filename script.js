document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "rechnungsCockpit_v3";
  const THEME_KEY = "cockpit_theme";

  // Elemente
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

  const tableBody = document.getElementById("invoiceTableBody");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const filterButtons = document.querySelectorAll("[data-filter]");
  const monthFilter = document.getElementById("monthFilter");
  const yearFilter = document.getElementById("yearFilter");

  const supplierCardsContainer = document.getElementById("supplierCards");
  const sumOpenEl = document.getElementById("sumOpen");
  const sumOverdueEl = document.getElementById("sumOverdue");
  const sumSkontoEl = document.getElementById("sumSkonto");
  const supplierDatalist = document.getElementById("supplierDatalist");

  const themeToggle = document.getElementById("themeToggle");

  // Zustände
  let invoices = loadInvoices();
  let currentFilter = "open";
  let currentSearch = "";
  let currentMonth = "all";
  let currentYear = "all";
  let currentSupplierFilter = "all";
  let sortKey = "dueDate";
  let sortDir = 1;
  let editId = null;

  // INITIAL
  initTheme();
  initDateDefaults();
  attachEvents();
  renderAll();

  // DARK/LIGHT
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark") {
      document.body.classList.add("dark");
      themeToggle.textContent = "🌙";
    } else {
      themeToggle.textContent = "🌞";
    }
  }

  // HEUTE als Default
  function initDateDefaults() {
    const today = new Date().toISOString().slice(0, 10);
    dueDateInput.value = today;
  }

  // EVENT HANDLER
  function attachEvents() {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      themeToggle.textContent = isDark ? "🌙" : "🌞";
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    });

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

    form.addEventListener("submit", handleSave);

    filterButtons.forEach((btn) =>
      btn.addEventListener("click", () => {
        filterButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        renderAll();
      })
    );

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

    tableBody.addEventListener("click", (event) => {
      const t = event.target;
      const id = t.dataset.id;
      if (!id) return;

      if (t.classList.contains("edit-btn")) startEdit(id);
      if (t.classList.contains("delete-btn")) deleteInvoice(id);
    });

    tableBody.addEventListener("change", (event) => {
      const t = event.target;
      if (t.classList.contains("paid-checkbox")) {
        togglePaid(t.dataset.id, t.checked);
      }
    });

    document
      .querySelectorAll(".invoice-table th[data-sort]")
      .forEach((th) =>
        th.addEventListener("click", () => {
          const key = th.dataset.sort;
          if (sortKey === key) sortDir = -sortDir;
          else {
            sortKey = key;
            sortDir = 1;
          }

          document
            .querySelectorAll(".invoice-table th[data-sort]")
            .forEach((h) => h.classList.remove("sort-asc", "sort-desc"));
          th.classList.add(sortDir === 1 ? "sort-asc" : "sort-desc");

          renderTable();
        })
      );
  }

  // SPEICHERN / BEARBEITEN
  function handleSave(e) {
    e.preventDefault();

    let supplier = supplierInput.value.trim().toUpperCase();

    const number = numberInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const dueDate = dueDateInput.value;
    const skontoPercent = skontoPercentInput.value
      ? parseFloat(skontoPercentInput.value)
      : null;
    const skontoDate = skontoDateInput.value || null;
    const note = noteInput.value.trim();

    if (!number || !supplier || !dueDate || isNaN(amount)) {
      alert("Bitte alle Pflichtfelder ausfüllen.");
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
      const idx = invoices.findIndex((i) => i.id === editId);
      invoices[idx] = { ...invoices[idx], ...base };
      editId = null;
      saveBtn.textContent = "Rechnung speichern";
      clearFormBtn.textContent = "Felder leeren";
    } else {
      invoices.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        ...base,
        paid: false,
        createdAt: new Date().toISOString(),
      });
    }

    saveInvoices();
    form.reset();
    initDateDefaults();
    updateSkontoInfo();
    renderAll();
  }

  // STORAGE
  function loadInvoices() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveInvoices() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  }

  // BEARBEITEN
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

    saveBtn.textContent = "Rechnung aktualisieren";
    clearFormBtn.textContent = "Bearbeitung abbrechen";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteInvoice(id) {
    if (!confirm("Rechnung wirklich löschen?")) return;
    invoices = invoices.filter((i) => i.id !== id);
    saveInvoices();
    renderAll();
  }

  function togglePaid(id, paid) {
    const idx = invoices.findIndex((i) => i.id === id);
    if (idx === -1) return;
    invoices[idx].paid = paid;
    saveInvoices();
    renderAll();
  }

  // SKONTO
  function updateSkontoInfo() {
    const amount = parseFloat(amountInput.value);
    const percent = parseFloat(skontoPercentInput.value || "0");

    if (!percent || isNaN(amount)) {
      skontoInfo.textContent = "Kein Skonto ausgewählt.";
      return;
    }

    const skontoAmount = amount * (percent / 100);
    const net = amount - skontoAmount;

    skontoInfo.textContent = `${percent}% Skonto: € ${skontoAmount.toFixed(
      2
    )} → Zahlbetrag: € ${net.toFixed(2)}`;
  }

  function calcSkontoAmount(inv) {
    if (!inv.skontoPercent) return 0;
    return inv.amount * (inv.skontoPercent / 100);
  }

  // STATUS-BERECHNUNG
  function getStatus(inv) {
    const today = toDate(new Date());
    const due = inv.dueDate ? toDate(new Date(inv.dueDate)) : null;
    const sk = inv.skontoDate ? toDate(new Date(inv.skontoDate)) : null;

    if (inv.paid) return { type: "paid", label: "Bezahlt" };
    if (due && due < today) return { type: "overdue", label: "Überfällig" };
    if (due && +due === +today) return { type: "dueToday", label: "Heute fällig" };
    if (sk && today <= sk) return { type: "skonto", label: "Skonto-Phase" };

    return { type: "open", label: "Offen" };
  }

  // FILTER 
  function getFilteredInvoices() {
    return invoices.filter((inv) => {
      const status = getStatus(inv);

      if (currentFilter !== "all" && currentFilter !== status.type) return false;

      if (
        currentSupplierFilter !== "all" &&
        inv.supplier !== currentSupplierFilter
      )
        return false;

      if (currentMonth !== "all" || currentYear !== "all") {
        const d = new Date(inv.dueDate);
        if (currentMonth !== "all" && d.getMonth() + 1 !== Number(currentMonth))
          return false;
        if (currentYear !== "all" && d.getFullYear() !== Number(currentYear))
          return false;
      }

      if (currentSearch) {
        const haystack =
          (inv.number || "").toLowerCase() +
          " " +
          (inv.supplier || "").toLowerCase() +
          " " +
          (inv.note || "").toLowerCase();

        if (!haystack.includes(currentSearch)) return false;
      }

      return true;
    });
  }

  // SORTIEREN
  function sortInvoices(list) {
    return [...list].sort((a, b) => {
      const dir = sortDir;
      let va, vb;

      switch (sortKey) {
        case "number":
          va = a.number.toLowerCase();
          vb = b.number.toLowerCase();
          break;
        case "supplier":
          va = a.supplier.toLowerCase();
          vb = b.supplier.toLowerCase();
          break;
        case "amount":
          va = a.amount;
          vb = b.amount;
          break;
        case "skontoPercent":
          va = a.skontoPercent || 0;
          vb = b.skontoPercent || 0;
          break;
        case "skontoAmount":
          va = calcSkontoAmount(a);
          vb = calcSkontoAmount(b);
          break;
        default:
          va = new Date(a.dueDate).getTime();
          vb = new Date(b.dueDate).getTime();
      }

      return va < vb ? -1 * dir : va > vb ? 1 * dir : 0;
    });
  }

  // RENDER ALL
  function renderAll() {
    renderFiltersMonthYear();
    renderTable();
    renderSupplierDashboard();
    renderSummaries();
    renderSupplierDatalist();
  }

  // TABELLE
  function renderTable() {
    const data = sortInvoices(getFilteredInvoices());

    if (data.length === 0) {
      tableBody.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    tableBody.innerHTML = data
      .map((inv) => {
        const status = getStatus(inv);
        const skAmount = calcSkontoAmount(inv);

        let warnIcon = "";
        if (status.type === "overdue") warnIcon = `<span class="warn-icon">🔴</span>`;
        else if (status.type === "dueToday")
          warnIcon = `<span class="warn-icon">🟠</span>`;
        else if (inv.skontoDate && !inv.paid) {
          const today = toDate(new Date());
          const sk = toDate(new Date(inv.skontoDate));
          if (today > sk) warnIcon = `<span class="warn-icon">⏳</span>`;
          else warnIcon = `<span class="warn-icon">💸</span>`;
        }

        return `
      <tr class="row-${status.type}">
        <td>${status.label}</td>
        <td><strong>${inv.number}</strong></td>
        <td>${inv.supplier}</td>
        <td class="numeric">${inv.amount.toFixed(2)} €</td>
        <td class="numeric">${inv.skontoPercent || "-"}</td>
        <td class="numeric">${skAmount ? skAmount.toFixed(2) + " €" : "-"}</td>
        <td>${inv.skontoDate ? formatDate(inv.skontoDate) : "-"}</td>
        <td>${formatDate(inv.dueDate)}</td>
        <td>${warnIcon}</td>

        <td class="checkbox-center">
          <input type="checkbox" class="paid-checkbox" data-id="${inv.id}" ${
          inv.paid ? "checked" : ""
        }>
        </td>

        <td>
          <button class="action-btn edit-btn edit-btn" data-id="${inv.id}">
            🍬 Bearbeiten
          </button>
          <button class="action-btn delete-btn" data-id="${inv.id}">
            🧨 Löschen
          </button>
        </td>
      </tr>`;
      })
      .join("");
  }

  // MONAT / JAHR FILTER
  function renderFiltersMonthYear() {
    const years = [
      ...new Set(invoices.map((i) => new Date(i.dueDate).getFullYear())),
    ].sort();

    yearFilter.innerHTML =
      `<option value="all">Alle Jahre</option>` +
      years.map((y) => `<option value="${y}">${y}</option>`).join("");

    const months = [
      "Jänner","Februar","März","April","Mai","Juni",
      "Juli","August","September","Oktober","November","Dezember"
    ];

    monthFilter.innerHTML =
      `<option value="all">Alle Monate</option>` +
      months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
  }

  // SUPPLIER DASHBOARD
  function renderSupplierDashboard() {
    const stats = {};

    invoices.forEach((inv) => {
      const s = inv.supplier;
      if (!stats[s]) {
        stats[s] = { supplier: s, count: 0, sumOpen: 0, sumOverdue: 0, sumSkonto: 0 };
      }

      stats[s].count++;

      const st = getStatus(inv);
      if (!inv.paid) {
        stats[s].sumOpen += inv.amount;
        if (st.type === "overdue") stats[s].sumOverdue += inv.amount;
        if (st.type === "skonto") stats[s].sumSkonto += inv.amount;
      }
    });

    supplierCardsContainer.innerHTML = Object.values(stats)
      .map((s) => {
        const active = currentSupplierFilter === s.supplier ? "active" : "";
        return `
      <div class="supplier-card ${active}" data-supplier="${s.supplier}">
        <div><strong>${s.supplier}</strong> – ${s.count} Rechn.</div>
        <div>Offen: ${s.sumOpen.toFixed(2)} €</div>
        <div>Überfällig: ${s.sumOverdue.toFixed(2)} €</div>
        <div>Skonto: ${s.sumSkonto.toFixed(2)} €</div>
      </div>`;
      })
      .join("");

    document.querySelectorAll(".supplier-card").forEach((card) => {
      card.addEventListener("click", () => {
        const s = card.dataset.supplier;
        currentSupplierFilter = currentSupplierFilter === s ? "all" : s;
        renderAll();
      });
    });
  }

  // AUTOCOMPLETE
  function renderSupplierDatalist() {
    const suppliers = [...new Set(invoices.map((i) => i.supplier))].sort();
    supplierDatalist.innerHTML = suppliers
      .map((s) => `<option value="${s}"></option>`)
      .join("");
  }

  // SUMMEN
  function renderSummaries() {
    let open = 0;
    let overdue = 0;
    let skonto = 0;

    invoices.forEach((inv) => {
      const st = getStatus(inv);
      if (!inv.paid) {
        open += inv.amount;
        if (st.type === "overdue") overdue += inv.amount;
        if (st.type === "skonto") skonto += inv.amount;
      }
    });

    sumOpenEl.textContent = open.toFixed(2) + " €";
    sumOverdueEl.textContent = overdue.toFixed(2) + " €";
    sumSkontoEl.textContent = skonto.toFixed(2) + " €";
  }

  // HELPERS
  function toDate(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function formatDate(v) {
    const d = new Date(v);
    return d.toLocaleDateString("de-AT");
  }
});
