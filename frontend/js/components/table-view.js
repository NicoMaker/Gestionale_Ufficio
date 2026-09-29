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
  let currentSort = "id";
  let currentDir = "desc";
  let searchDebounce = null;
  let fkLabelCache = {}; // { tableName: Map(id -> label) }
  const selected = new Set(); // id selezionati (anche tra pagine)

  async function render(table) {
    currentTable = table;
    selected.clear();
    fkLabelCache = {}; // le etichette FK possono cambiare (ripristini, nuovi record)
    currentPage = 1;
    currentQuery = "";
    currentSort = "id";
    currentDir = "desc";
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
    content.innerHTML =
      '<div class="table-wrap" aria-busy="true">' +
      '<div class="skeleton-row"></div>'.repeat(8) +
      "</div>";
    try {
      const result = await API.list(currentTable.name, {
        page: currentPage,
        limit: 25,
        q: currentQuery,
        sort: currentSort,
        dir: currentDir,
      });
      await preloadFkLabels(result.data);
      content.innerHTML = buildTableHTML(result);
      wireRowActions();
      wireSelection(result.data.map((r) => r.id));
      wireSorting();
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

    const th = (name, label) => {
      const on = currentSort === name;
      const aria = on
        ? currentDir === "asc"
          ? "ascending"
          : "descending"
        : "none";
      const caret = on ? (currentDir === "asc" ? "▲" : "▼") : "";
      return `<th class="sortable${on ? " sorted" : ""}" data-sort="${name}" aria-sort="${aria}" tabindex="0">${label}<span class="sort-caret">${caret}</span></th>`;
    };
    const head = `
      <tr>
        <th class="col-check"><input type="checkbox" id="check-all" aria-label="Seleziona tutti in pagina" /></th>
        ${th("id", "ID")}
        ${visibleFields.map((f) => th(f.name, f.label)).join("")}
        <th>Azioni</th>
      </tr>`;

    const rows = data
      .map(
        (row) => `
      <tr data-id="${row.id}" class="${selected.has(row.id) ? "row-selected" : ""}">
        <td class="col-check"><input type="checkbox" class="row-check" ${selected.has(row.id) ? "checked" : ""} aria-label="Seleziona record ${row.id}" /></td>
        <td>${row.id}</td>
        ${visibleFields.map((f) => `<td>${renderCell(f, row)}</td>`).join("")}
        <td class="col-actions">
          <button class="row-btn" data-action="edit" title="Modifica">${Icons.html("pencil")}<span>Modifica</span></button>
          <button class="row-btn danger" data-action="delete" title="Sposta nel cestino">${Icons.html("trash")}<span>Elimina</span></button>
        </td>
      </tr>`,
      )
      .join("");

    return `
      <div id="bulk-bar-slot"></div>
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

  // ------------------------------------------------ selezione multipla
  function wireSelection(pageIds) {
    const checkAll = content.querySelector("#check-all");
    const sync = () => {
      if (!checkAll) return;
      const n = pageIds.filter((id) => selected.has(id)).length;
      checkAll.checked = n > 0 && n === pageIds.length;
      checkAll.indeterminate = n > 0 && n < pageIds.length;
    };
    checkAll?.addEventListener("change", () => {
      pageIds.forEach((id) =>
        checkAll.checked ? selected.add(id) : selected.delete(id),
      );
      content.querySelectorAll("tr[data-id]").forEach((tr) => {
        const on = selected.has(Number(tr.dataset.id));
        tr.querySelector(".row-check").checked = on;
        tr.classList.toggle("row-selected", on);
      });
      renderBulkBar();
    });
    content.querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.querySelector(".row-check").addEventListener("change", (e) => {
        const id = Number(tr.dataset.id);
        e.target.checked ? selected.add(id) : selected.delete(id);
        tr.classList.toggle("row-selected", e.target.checked);
        sync();
        renderBulkBar();
      });
    });
    sync();
    renderBulkBar();
  }

  function renderBulkBar() {
    const slot = content.querySelector("#bulk-bar-slot");
    if (!slot) return;
    if (selected.size === 0) {
      slot.innerHTML = "";
      return;
    }
    slot.innerHTML = `
      <div class="bulk-bar" role="region" aria-label="Azioni sulla selezione">
        <strong>${selected.size} selezionat${selected.size === 1 ? "o" : "i"}</strong>
        <div class="bulk-actions">
          <button class="btn btn-danger" id="bulk-delete">${Icons.html("trash")}<span>Sposta nel cestino</span></button>
          <button class="btn btn-ghost" id="bulk-clear">Deseleziona</button>
        </div>
      </div>`;
    slot.querySelector("#bulk-delete").addEventListener("click", confirmBulkDelete);
    slot.querySelector("#bulk-clear").addEventListener("click", () => {
      selected.clear();
      load();
    });
  }

  // Eliminazione multipla = spostamento nel cestino. Vale la stessa regola del
  // singolo: solo i record con collegamenti = 0; gli altri vengono saltati.
  async function confirmBulkDelete() {
    const ids = [...selected];
    const days = AppConfig.retentionDays;
    const ok = await ConfirmDialog.ask({
      title: `Spostare ${ids.length} record nel cestino?`,
      message:
        `I record potranno essere ripristinati per ${days} giorni, poi verranno eliminati definitivamente in automatico.\n\n` +
        "I record collegati ad altri record (collegamenti > 0) NON verranno eliminati: " +
        "se selezioni insieme i record collegati e quelli che li usano, questi ultimi vengono eliminati per primi.",
      confirmLabel: "Sposta nel cestino",
    });
    if (!ok) return;
    try {
      const r = await API.removeMany(currentTable.name, ids);
      selected.clear();
      r.blocked_items.forEach((b) => selected.add(b.id));
      Sidebar.refreshTrashCount();
      if (r.moved > 0) {
        Toast.success(
          `${r.moved} record spostat${r.moved === 1 ? "o" : "i"} nel cestino` +
            (r.blocked > 0 ? ` — ${r.blocked} non eliminabili (collegati)` : ""),
        );
      }
      if (r.blocked > 0) {
        const dettaglio = r.blocked_items
          .map(
            (b) =>
              `• #${b.id}: ` +
              b.links.map((l) => `${l.table_label} (${l.field_label}): ${l.count}`).join(", "),
          )
          .join("\n");
        await ConfirmDialog.ask({
          title: "Alcuni record non sono stati eliminati",
          message:
            `${r.blocked} record hanno ancora record collegati:\n${dettaglio}\n\n` +
            "Elimina o scollega prima i record collegati. Sono rimasti selezionati.",
          confirmLabel: "Ho capito",
          danger: false,
          hideCancel: true,
        });
      }
    } catch (err) {
      Toast.error(err.message);
    }
    load();
  }

  function wireSorting() {
    content.querySelectorAll("th[data-sort]").forEach((th) => {
      const go = () => {
        const name = th.dataset.sort;
        currentDir =
          currentSort === name && currentDir === "asc" ? "desc" : "asc";
        currentSort = name;
        currentPage = 1;
        load();
      };
      th.addEventListener("click", go);
      th.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    });
  }

  // Eliminazione = spostamento nel cestino. Consentita solo se il record non
  // ha altri record collegati (collegamenti = 0).
  async function confirmDelete(id) {
    let info;
    try {
      info = await API.links(currentTable.name, id);
    } catch (err) {
      Toast.error(err.message);
      return;
    }

    if (info.total > 0) {
      const dettaglio = info.links
        .map((l) => `• ${l.table_label} (${l.field_label}): ${l.count}`)
        .join("\n");
      await ConfirmDialog.ask({
        title: "Impossibile eliminare",
        message:
          `Il record #${id} è collegato a ${info.total} ${info.total === 1 ? "altro record" : "altri record"}:\n${dettaglio}\n\n` +
          "Elimina o scollega prima i record collegati.",
        confirmLabel: "Ho capito",
        danger: false,
        hideCancel: true,
      });
      return;
    }

    const days = AppConfig.retentionDays;
    const ok = await ConfirmDialog.ask({
      title: "Spostare nel cestino?",
      message:
        `Il record #${id} verrà spostato nel cestino e potrà essere ripristinato per ${days} giorni. ` +
        "Dopo questo periodo verrà eliminato definitivamente in automatico.",
      confirmLabel: "Sposta nel cestino",
    });
    if (!ok) return;
    try {
      await API.remove(currentTable.name, id);
      selected.delete(Number(id));
      Toast.success("Record spostato nel cestino");
      Sidebar.refreshTrashCount();
      load();
    } catch (err) {
      Toast.error(err.message);
      load();
    }
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
