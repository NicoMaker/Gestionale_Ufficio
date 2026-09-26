/**
 * TableView — renderizza l'elenco dei record di una tabella con
 * ricerca, paginazione e azioni di modifica/eliminazione per riga.
 */
const TableView = (() => {
  const content = document.getElementById("view-content");
  const searchInput = document.getElementById("search-input");
  const btnNew = document.getElementById("btn-new");

  let currentTable = null;
  let currentPage = 1;
  let currentQuery = "";
  let searchDebounce = null;
  let fkLabelCache = {}; // { tableName: Map(id -> label) }

  async function render(table) {
    currentTable = table;
    currentPage = 1;
    currentQuery = "";
    searchInput.value = "";
    searchInput.style.display = "";
    btnNew.style.display = "";
    btnNew.onclick = () => FormModal.open({ table, onSaved: () => load() });

    await load();

    searchInput.oninput = () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        currentQuery = searchInput.value;
        currentPage = 1;
        load();
      }, 300);
    };
  }

  async function load() {
    content.innerHTML = '<div class="empty-state">Caricamento…</div>';
    try {
      const result = await API.list(currentTable.name, {
        page: currentPage,
        limit: 25,
        q: currentQuery,
      });
      await preloadFkLabels(result.data);
      content.innerHTML = buildTableHTML(result);
      wireRowActions();
      wirePagination(result);
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-title">Errore</div>${escapeHtml(err.message)}</div>`;
    }
  }

  // Precarica le etichette per i campi FK visibili, cosi' la tabella mostra
  // il nome leggibile ("Mario Rossi") invece del solo id numerico.
  async function preloadFkLabels(rows) {
    const fkFields = currentTable.fields.filter((f) => f.type === "fk");
    for (const field of fkFields) {
      if (!fkLabelCache[field.fk]) {
        try {
          const options = await API.options(field.fk);
          fkLabelCache[field.fk] = new Map(
            options.map((o) => [String(o.id), o.label]),
          );
        } catch (_) {
          fkLabelCache[field.fk] = new Map();
        }
      }
    }
  }

  function buildTableHTML(result) {
    const { data, page, totalPages, total } = result;
    const table = currentTable;
    const visibleFields = table.fields.slice(0, 6); // colonne principali in vista elenco

    if (data.length === 0) {
      return `
        <div class="table-wrap">
          <div class="empty-state">
            <div class="empty-icon">${Icons.html("inbox")}</div>
            <div class="empty-title">Nessun record trovato</div>
            <p>Crea il primo record con il pulsante "Nuovo" in alto a destra.</p>
          </div>
        </div>`;
    }

    const head = `
      <tr>
        <th>ID</th>
        ${visibleFields.map((f) => `<th>${f.label}</th>`).join("")}
        <th>Azioni</th>
      </tr>`;

    const rows = data
      .map(
        (row) => `
      <tr data-id="${row.id}">
        <td>${row.id}</td>
        ${visibleFields.map((f) => `<td>${renderCell(f, row)}</td>`).join("")}
        <td class="col-actions">
          <button class="row-btn" data-action="edit" title="Modifica">${Icons.html("pencil")}<span>Modifica</span></button>
          <button class="row-btn danger" data-action="delete" title="Elimina">${Icons.html("trash")}<span>Elimina</span></button>
        </td>
      </tr>`,
      )
      .join("");

    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead>${head}</thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="pagination">
          <span>${total} record totali — pagina ${page} di ${totalPages}</span>
          <div class="pager-btns">
            <button class="btn" data-page="prev" ${page <= 1 ? "disabled" : ""}>${Icons.html("chevron-left")}<span>Precedente</span></button>
            <button class="btn" data-page="next" ${page >= totalPages ? "disabled" : ""}><span>Successiva</span>${Icons.html("chevron-right")}</button>
          </div>
        </div>
      </div>`;
  }

  function renderCell(field, row) {
    const value = row[field.name];
    if (value === null || value === undefined || value === "")
      return '<span style="color:var(--muted)">—</span>';

    if (field.type === "fk") {
      const label = fkLabelCache[field.fk]?.get(String(value));
      return escapeHtml(label || `#${value}`);
    }
    if (field.type === "boolean") {
      return value
        ? '<span class="badge">Sì</span>'
        : '<span class="badge neutral">No</span>';
    }
    if (field.type === "select") {
      return `<span class="badge ${badgeClassFor(value)}">${escapeHtml(String(value).replace(/_/g, " "))}</span>`;
    }
    if (field.type === "number") {
      const num = Number(value);
      return Number.isFinite(num)
        ? num.toLocaleString("it-IT", { maximumFractionDigits: 2 })
        : escapeHtml(value);
    }
    return escapeHtml(String(value));
  }

  function badgeClassFor(value) {
    const negative = ["annullato", "rifiutato", "scaduta", "persa", "sospeso"];
    const warning = ["bozza", "da_pagare", "richiesto", "aperta", "aperto"];
    if (negative.includes(value)) return "danger";
    if (warning.includes(value)) return "warn";
    return "";
  }

  function wireRowActions() {
    content.querySelectorAll("tr[data-id]").forEach((tr) => {
      const id = tr.dataset.id;
      tr.querySelector('[data-action="edit"]').addEventListener(
        "click",
        async () => {
          try {
            const record = await API.get(currentTable.name, id);
            FormModal.open({
              table: currentTable,
              record,
              onSaved: () => load(),
            });
          } catch (err) {
            Toast.error(err.message);
          }
        },
      );
      tr.querySelector('[data-action="delete"]').addEventListener("click", () =>
        confirmDelete(id),
      );
    });
  }

  function confirmDelete(id) {
    if (!window.confirm(`Eliminare definitivamente il record #${id}?`)) return;
    API.remove(currentTable.name, id)
      .then(() => {
        Toast.success("Record eliminato");
        load();
      })
      .catch((err) => Toast.error(err.message));
  }

  function wirePagination(result) {
    const prevBtn = content.querySelector('[data-page="prev"]');
    const nextBtn = content.querySelector('[data-page="next"]');
    if (prevBtn)
      prevBtn.addEventListener("click", () => {
        currentPage = Math.max(1, currentPage - 1);
        load();
      });
    if (nextBtn)
      nextBtn.addEventListener("click", () => {
        currentPage = Math.min(result.totalPages, currentPage + 1);
        load();
      });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return { render };
})();
