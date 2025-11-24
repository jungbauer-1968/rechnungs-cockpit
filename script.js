document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "rechnungsCockpit_v1";

  const form = document.getElementById("invoiceForm");
  const numberInput = document.getElementById("invoiceNumber");
  const supplierInput = document.getElementById("supplier");
  const amountInput = document.getElementById("amount");
  const dueDateInput = document.getElementById("dueDate");
  const skontoDateInput = document.getElementById("skontoDate");
  const noteInput = document.getElementById("note");
  const clearFormBtn = document.getElementById("clearFormBtn");

  const tableBody = document.getElementById("invoiceTableBody");
  const emptyState = document.getElementById("emptyState");

  const filterButtons = document.querySelectorAll("[data-filter]");
  const searchInput = document.getElementById("searchInput");
  const supplierList = document.getElementById("supplierList");
  const supplierDatalist = document.getElementById("supplierDatalist");

  const sumOpenEl = document.getElementById("sumOpen");
  const sumOverdueEl = document.getElementById("sumOverdue");
  const sumSkontoEl = document.getElementById("sumSkonto");

  let invoices = loadInvoices();
  let currentFilter = "open";
  let currentSupplier = "all";
  let currentSearch = "";

  // --- Init ---
  setDefaultDates();
  attachEvents();
  renderAll();

  // --- Functions ---

  function setDefaultDates() {
    const today = new Date().toISOString().slice(0, 10);
    dueDateInput.value = today;
  }

  function attachEvents() {
    form.addEventListener("submit", handleAddInvoice);
    clearFormBtn.addEventListener("click", handleClearForm);

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

    tableBody.addEventListener("change", (event) => {
      if (event.target.matches(".paid-checkbox")) {
        const id = event.target.dataset.id;
        togglePaid(id, event.target.checked);
      }
    });

    tableBody.addEventListener("click", (event) => {
      if (event.target.matches(".delete-btn")) {
        const id = event.target.dataset.id;
        deleteInvoice(id);
      }
    });

    supplierList.addEventListener("click", (event) => {
      const li = event.target.closest("li");
      if (!li) return;
      const supplier = li.dataset.supplier;
      if (supplier === currentSupplier) {
        currentSupplier = "all";
      } else {
        currentSupplier = supplier;
      }
      renderAll();
    });
  }

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

  function handleAddInvoice(event) {
    event.preventDefault();

    const number = numberInput.value.trim();
    const supplier = supplierInput.value.trim();
    const amount = parseFloat(amountInput.value.replace(",", "."));
    const dueDate = dueDateInput.value;
    const skontoDate = skontoDateInput.value || null;
    const note = noteInput.value.trim();

    if (!number || !supplier || !dueDate || isNaN(amount)) {
      alert("Bitte Rechnungsnummer, Lieferant, Betrag und Fälligkeitsdatum ausfüllen.");
      return;
    }

    const invoice = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      number,
      supplier,
      amount,
      dueDate,
      skontoDate,
      note,
      paid: false,
      createdAt: new Date().toISOString()
    };

    invoices.push(invoice);
    saveInvoices();
    renderAll();
    form.reset();
    setDefaultDates();
  }

  function handleClearForm() {
    form.reset();
    setDefaultDates();
  }

  function togglePaid(id, paid) {
    const idx = invoices.findIndex((inv) => inv.id === id);
    if (idx === -1) return;
    invoices[idx].paid = paid;
    saveInvoices();
    renderAll();
  }

  function deleteInvoice(id) {
    if (!confirm("Rechnung wirklich löschen?")) return;
    invoices = invoices.filter((inv) => inv.id !== id);
    saveInvoices();
    renderAll();
  }

  function renderAll() {
    renderTable();
    renderSuppliers();
    renderSummaries();
    renderSupplierFilterActive();
  }

  function renderTable() {
    const filtered = getFilteredInvoices();

    if (filtered.length === 0) {
      tableBody.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    filtered.sort((a, b) => {
      const da = new Date(a.dueDate).getTime();
      const db = new Date(b.dueDate).getTime();
      return da - db;
    });

    const rows = filtered
      .map((inv) => {
        const status = getStatus(inv);
        const amountFormatted = formatCurrency(inv.amount);
        const skontoText = inv.skontoDate ? formatDate(inv.skontoDate) : "–";
        const dueText = formatDate(inv.dueDate);
        const noteIcon = inv.note ? "📝" : "";
        const rowClass = `row-${status.type}`;

        return `
          <tr class="${rowClass}">
            <td class="status-cell">
              <span class="status-pill status-${status.type}">
                <span class="dot dot-${status.type === "open" ? "open" : status.type}"></span>
                ${status.short}
              </span>
            </td>
            <td>
              <strong>${escapeHtml(inv.number)}</strong>
              ${noteIcon ? `<span class="badge badge-small" title="${escapeHtml(inv.note)}">${noteIcon}</span>` : ""}
            </td>
            <td>${escapeHtml(inv.supplier)}</td>
            <td>${amountFormatted}</td>
            <td>${skontoText}</td>
            <td>${dueText}</td>
            <td>${status.label}</td>
            <td class="checkbox-center">
              <input
                type="checkbox"
                class="paid-checkbox"
                data-id="${inv.id}"
                ${inv.paid ? "checked" : ""}
              />
            </td>
            <td class="checkbox-center">
              <button class="action-btn delete-btn" title="Löschen" data-id="${inv.id}">✖</button>
            </td>
          </tr>
        `;
      })
      .join("");

    tableBody.innerHTML = rows;
  }

  function getFilteredInvoices() {
    return invoices.filter((inv) => {
      const status = getStatus(inv);

      if (currentFilter !== "all" && currentFilter !== status.type) {
        if (!(currentFilter === "open" && status.type === "future")) {
          return false;
        }
      }

      if (currentSupplier !== "all" && inv.supplier !== currentSupplier) {
        return false;
      }

      if (currentSearch) {
        const haystack =
          (inv.number + " " + inv.supplier).toLowerCase();
        if (!haystack.includes(currentSearch)) {
          return false;
        }
      }

      return true;
    });
  }

  function getStatus(inv) {
    if (inv.paid) {
      return {
        type: "paid",
        label: "Bezahlt",
        short: "Bezahlt"
      };
    }

    const today = toDateOnly(new Date());
    const due = inv.dueDate ? toDateOnly(new Date(inv.dueDate)) : null;
    const skonto = inv.skontoDate ? toDateOnly(new Date(inv.skontoDate)) : null;

    if (due && due < today) {
      return {
        type: "overdue",
        label: "Überfällig",
        short: "Überf."
      };
    }

    if (skonto && skonto < today && (!due || today <= due)) {
      return {
        type: "skonto",
        label: "Skonto-Phase (Skonto vorbei, noch nicht fällig)",
        short: "Skonto"
      };
    }

    if (due && today >= toDateOnly(new Date()) && (!skonto || today < skonto)) {
      // Rechnung ist „offen / noch nicht fällig“
      return {
        type: "future",
        label: "Noch nicht fällig",
        short: "Offen"
      };
    }

    return {
      type: "open",
      label: "Offen",
      short: "Offen"
    };
  }

  function renderSuppliers() {
    const counts = {};
    invoices.forEach((inv) => {
      const key = inv.supplier;
      counts[key] = (counts[key] || 0) + 1;
    });

    const suppliers = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const items = suppliers
      .map(
        (s) => `
        <li data-supplier="${escapeHtml(s.name)}" class="${currentSupplier === s.name ? "active" : ""}">
          <span>${escapeHtml(s.name)}</span>
          <span class="badge">${s.count}</span>
        </li>
      `
      )
      .join("");

    supplierList.innerHTML =
      `<li data-supplier="all" class="${currentSupplier === "all" ? "active" : ""}">
        <span>Alle Lieferanten</span>
        <span class="badge">${invoices.length}</span>
      </li>` + items;

    // datalist für Lieferanten
    const dlOptions = suppliers
      .map(
        (s) => `<option value="${escapeHtml(s.name)}"></option>`
      )
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
      if (status.type === "overdue") {
        sumOverdue += inv.amount;
        sumOpen += inv.amount;
      } else if (status.type === "skonto") {
        sumSkonto += inv.amount;
        sumOpen += inv.amount;
      } else {
        sumOpen += inv.amount;
      }
    });

    sumOpenEl.textContent = formatCurrency(sumOpen);
    sumOverdueEl.textContent = formatCurrency(sumOverdue);
    sumSkontoEl.textContent = formatCurrency(sumSkonto);
  }

  function renderSupplierFilterActive() {
    const lis = supplierList.querySelectorAll("li");
    lis.forEach((li) => {
      const supplier = li.dataset.supplier;
      if (supplier === currentSupplier) {
        li.classList.add("active");
      } else {
        li.classList.remove("active");
      }
    });
  }

  function formatCurrency(amount) {
    try {
      return new Intl.NumberFormat("de-AT", {
        style: "currency",
        currency: "EUR"
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
