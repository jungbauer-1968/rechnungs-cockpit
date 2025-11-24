// ==========================================
// STORAGE HELFER
// ==========================================
function loadInvoices() {
    return JSON.parse(localStorage.getItem("invoices") || "[]");
}

function saveInvoices(list) {
    localStorage.setItem("invoices", JSON.stringify(list));
}

// ==========================================
// DOM ELEMENTE
// ==========================================
const form = document.getElementById("invoiceForm");
const tableBody = document.getElementById("invoiceTableBody");
const supplierCards = document.getElementById("supplierCards");

const sumOpen = document.getElementById("sumOpen");
const sumOverdue = document.getElementById("sumOverdue");
const sumSkonto = document.getElementById("sumSkonto");

const searchInput = document.getElementById("searchInput");

// Filter-Buttons
const filterButtons = document.querySelectorAll(".btn.chip");

// ==========================================
// RECHNUNG SPEICHERN
// ==========================================
form.addEventListener("submit", (e) => {
    e.preventDefault();

    const invoice = {
        id: Date.now(),
        number: document.getElementById("invoiceNumber").value.trim(),
        supplier: document.getElementById("supplier").value.trim(),
        amount: parseFloat(document.getElementById("amount").value),
        dueDate: document.getElementById("dueDate").value,
        skontoPercent: document.getElementById("skontoPercent").value || "",
        skontoDate: document.getElementById("skontoDate").value || "",
        note: document.getElementById("note").value.trim(),
        paid: false
    };

    const invoices = loadInvoices();
    invoices.push(invoice);
    saveInvoices(invoices);

    form.reset();
    updateUI();
});

// ==========================================
// UI UPDATEN
// ==========================================
function updateUI() {
    const invoices = loadInvoices();

    if (invoices.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11" class="empty-state">Noch keine Rechnungen angelegt – oben eine neue erfassen 🔍</td></tr>`;
        supplierCards.innerHTML = "";
        sumOpen.textContent = "0.00 €";
        sumOverdue.textContent = "0.00 €";
        sumSkonto.textContent = "0.00 €";
        return;
    }

    renderTable(invoices);
    renderSuppliers(invoices);
    renderSummary(invoices);
}

// ==========================================
// TABELLE RENDERN
// ==========================================
function renderTable(invoices) {

    let rows = "";

    invoices.forEach(inv => {
        const isOverdue = !inv.paid && new Date(inv.dueDate) < new Date();
        const isSkonto = !inv.paid && inv.skontoDate && new Date(inv.skontoDate) >= new Date();

        let rowClass = "";
        let warnIcon = "";

        if (inv.paid) rowClass = "row-paid";
        else if (isOverdue) { rowClass = "row-overdue"; warnIcon = "⚠️"; }
        else if (isSkonto) rowClass = "row-skonto";
        else rowClass = "row-open";

        const skontoEuro = inv.skontoPercent ? (inv.amount * (inv.skontoPercent / 100)).toFixed(2) : "-";

        rows += `
        <tr class="${rowClass}">
            <td>${rowClass === "row-paid" ? "✔" : rowClass === "row-overdue" ? "❗" : rowClass === "row-skonto" ? "💛" : "🔵"}</td>
            <td>${inv.number}</td>
            <td>${inv.supplier}</td>
            <td class="numeric">${inv.amount.toFixed(2)}</td>
            <td class="numeric">${inv.skontoPercent || "-"}</td>
            <td class="numeric">${skontoEuro}</td>
            <td class="numeric">${inv.skontoDate || "-"}</td>
            <td class="numeric">${inv.dueDate}</td>
            <td>${warnIcon}</td>
            <td><input type="checkbox" data-id="${inv.id}" class="paidCheck" ${inv.paid ? "checked" : ""}></td>
            <td><button class="deleteBtn" data-id="${inv.id}">❌</button></td>
        </tr>`;
    });

    tableBody.innerHTML = rows;

    attachRowEvents();
}

// ==========================================
// BUTTONS IN DER TABELLE
// ==========================================
function attachRowEvents() {

    // Bezahlt Checkbox
    document.querySelectorAll(".paidCheck").forEach(box => {
        box.addEventListener("change", () => {
            const id = parseInt(box.dataset.id);
            const invoices = loadInvoices();

            const inv = invoices.find(a => a.id === id);
            inv.paid = box.checked;

            saveInvoices(invoices);
            updateUI();
        });
    });

    // Löschen
    document.querySelectorAll(".deleteBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            let invoices = loadInvoices();
            invoices = invoices.filter(a => a.id !== id);
            saveInvoices(invoices);

            updateUI();
        });
    });
}

// ==========================================
// LIEFERANTEN-CARDS
// ==========================================
function renderSuppliers(invoices) {
    const names = [...new Set(invoices.map(a => a.supplier))];

    supplierCards.innerHTML = names.map(name =>
        `<div class="supplier-card" data-supplier="${name}">${name}</div>`
    ).join("");

    document.querySelectorAll(".supplier-card").forEach(card => {
        card.addEventListener("click", () => {
            const supplier = card.dataset.supplier;
            const filtered = loadInvoices().filter(a => a.supplier === supplier);
            renderTable(filtered);
        });
    });
}

// ==========================================
// SUMMEN
// ==========================================
function renderSummary(invoices) {

    let open = 0;
    let overdue = 0;
    let skonto = 0;

    invoices.forEach(inv => {
        if (!inv.paid) open += inv.amount;

        if (!inv.paid && new Date(inv.dueDate) < new Date())
            overdue += inv.amount;

        if (!inv.paid && inv.skontoPercent && inv.skontoDate && new Date(inv.skontoDate) >= new Date())
            skonto += inv.amount;
    });

    sumOpen.textContent = open.toFixed(2) + " €";
    sumOverdue.textContent = overdue.toFixed(2) + " €";
    sumSkonto.textContent = skonto.toFixed(2) + " €";
}

// ==========================================
// SUCHE
// ==========================================
searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();
    const invoices = loadInvoices();

    const filtered = invoices.filter(inv =>
        inv.number.toLowerCase().includes(q) ||
        inv.supplier.toLowerCase().includes(q) ||
        inv.note.toLowerCase().includes(q)
    );

    renderTable(filtered);
});

// ==========================================
// START
// ==========================================
updateUI();
