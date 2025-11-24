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

  let invoices = loadInvoices();

  let currentFilter = "open";
  let currentSearch = "";
  let editId = null;  // ⭐ NEU → merken welche Rechnung bearbeitet wird

  init();
  function init() {
    form.addEventListener("submit", handleSave);
    searchInput.addEventListener("input", () => {
      currentSearch = searchInput.value.toLowerCase();
      render();
    });

    clearFormBtn.addEventListener("click", () => {
      form.reset();
      editId = null;
      clearFormBtn.textContent = "Felder leeren";
    });

    filterButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        render();
      });
    });

    tableBody.addEventListener("click", (event) => {
      const id = event.target.dataset.id;

      if (event.target.classList.contains("delete-btn")) {
        deleteInvoice(id);
      }

      if (event.target.classList.contains("edit-btn")) {
        loadForEdit(id);
      }
    });

    render();
  }

  function handleSave(e) {
    e.preventDefault();

    const data = {
      number: numberInput.value.trim(),
      supplier: supplierInput.value.trim(),
      amount: parseFloat(amountInput.value),
      dueDate: dueDateInput.value,
      skontoDate: skontoDateInput.value || null,
      note: noteInput.value.trim(),
      paid: false
    };

    if (!data.number || !data.supplier || !data.amount || !data.dueDate) {
      alert("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }

    if (editId === null) {
      // ⭐ Neue Rechnung
      data.id = crypto.randomUUID();
      data.createdAt = new Date().toISOString();
      invoices.push(data);
    } else {
      // ⭐ Rechnung aktualisieren
      const idx = invoices.findIndex(inv => inv.id === editId);
      invoices[idx] = { ...invoices[idx], ...data };
      editId = null;
      clearFormBtn.textContent = "Felder leeren";
    }

    saveInvoices();
    form.reset();
    render();
  }

  function loadForEdit(id) {
    const inv = invoices.find(i => i.id === id);

    numberInput.value = inv.number;
    supplierInput.value = inv.supplier;
    amountInput.value = inv.amount;
    dueDateInput.value = inv.dueDate;
    skontoDateInput.value = inv.skontoDate || "";
    noteInput.value = inv.note;

    editId = id;

    clearFormBtn.textContent = "Bearbeitung abbrechen";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteInvoice(id) {
    if (!confirm("Willst du die Rechnung wirklich löschen?")) return;
    invoices = invoices.filter(inv => inv.id !== id);
    saveInvoices();
    render();
  }

  function render() {
    let list = invoices;

    // ⭐ FILTER
    if (currentFilter !== "all") {
      list = list.filter(inv => getStatus(inv).type === currentFilter);
    }

    // ⭐ SUCHE
    if (currentSearch.length > 0) {
      list = list.filter(inv =>
        inv.number.toLowerCase().includes(currentSearch) ||
        inv.supplier.toLowerCase().includes(currentSearch)
      );
    }

    if (list.length === 0) {
      tableBody.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    tableBody.innerHTML = list.map(inv => {
      const status = getStatus(inv);

      return `
        <tr class="row-${status.type}">
          <td>${status.short}</td>
          <td><strong>${inv.number}</strong></td>
          <td>${inv.supplier}</td>
          <td>${inv.amount.toFixed(2)} €</td>
          <td>${inv.skontoDate ? formatDate(inv.skontoDate) : "-"}</td>
          <td>${formatDate(inv.dueDate)}</td>
          <td>${status.label}</td>
          <td>
            <button class="edit-btn" data-id="${inv.id}">Bearbeiten</button>
          </td>
          <td>
            <button class="delete-btn" data-id="${inv.id}">✖</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function getStatus(inv) {
    const today = toDate(new Date());
    const due = toDate(new Date(inv.dueDate));
    const sk = inv.skontoDate ? toDate(new Date(inv.skontoDate)) : null;

    if (due < today) return { type: "overdue", short: "Überf.", label: "Überfällig" };
    if (sk && sk < today && today < due) return { type: "skonto", short: "Skonto", label: "Skonto-Phase" };

    return { type: "open", short: "Offen", label: "Offen" };
  }

  function saveInvoices() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  }

  function loadInvoices() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString("de-AT");
  }

  function toDate(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
});
