/**
 * Trash — pagina "Cestino": elenco dei record eliminati con
 *  - data di eliminazione e DATA DI ELIMINAZIONE DEFINITIVA (con conto alla rovescia)
 *  - stato di ripristino (ripristinabile / non ripristinabile + motivo)
 *  - azioni: dettagli, ripristina, elimina definitivamente
 *  - SELEZIONE MULTIPLA: ripristina / elimina definitivamente più elementi insieme
 *  - azioni globali: "Ripristina tutto" (solo ciò che si può) e "Svuota cestino"
 *
 * Regola di ripristino: un record torna attivo solo se tutti i record a cui fa
 * riferimento esistono ancora. Se il "padre" è nel cestino va ripristinato prima;
 * se è stato eliminato definitivamente il figlio non è più ripristinabile.
 */
const Trash = (() => {
  const content = document.getElementById("view-content");
  const searchInput = document.getElementById("search-input");
  const btnNew = document.getElementById("btn-new");

  let meta = null;
  let page = 1;
  let query = "";
  let tableFilter = "";
  let searchDebounce = null;
  let lastResult = null;
  const selected = new Set(); // id degli elementi selezionati (anche tra pagine)

  async function render(metaData) {
    meta = metaData;
    page = 1;
    query = "";
    tableFilter = "";
    selected.clear();
    searchInput.value = "";
    searchInput.placeholder = "Cerca nel cestino...";
    searchInput.style.display = "";
    btnNew.style.display = "none";
    searchInput.oninput = () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        query = searchInput.value;
        page = 1;
        load();
      }, 300);
    };
    await load();
  }

  // Ripristina il placeholder originale quando si lascia il cestino
  function leave() {
    searchInput.placeholder = "Cerca...";
  }

  async function load() {
    content.innerHTML =
      '<div class="table-wrap" aria-busy="true">' +
      '<div class="skeleton-row"></div>'.repeat(6) +
      "</div>";
    try {
      lastResult = await API.trashList({
        page,
        limit: 25,
        q: query,
        table: tableFilter,
      });
      AppConfig.retentionDays = lastResult.retention_days;
      content.innerHTML = buildHTML(lastResult);
      wire(lastResult);
      Sidebar.refreshTrashCount();
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-title">Errore</div>${esc(err.message)}</div>`;
    }
  }

  // ------------------------------------------------------------------ HTML
  function buildHTML(result) {
    const { data, total, totalPages } = result;
    const days = result.retention_days;

    const banner = `
      <div class="trash-banner">
        <span class="trash-banner-icon">${Icons.html("clock")}</span>
        <div>
          <strong>I record eliminati restano nel cestino per ${days} giorni</strong>,
          poi vengono eliminati definitivamente in automatico. Un record si può
          ripristinare solo se tutti i record a cui fa riferimento esistono ancora
          (se il padre è nel cestino, ripristinalo prima).
        </div>
      </div>`;

    const options = meta.tables
      .map(
        (t) =>
          `<option value="${t.name}" ${t.name === tableFilter ? "selected" : ""}>${esc(t.label)}</option>`,
      )
      .join("");

    const toolbar = `
      <div class="trash-toolbar">
        <div class="field trash-filter">
          <select id="trash-filter" aria-label="Filtra per tabella">
            <option value="">Tutte le tabelle</option>
            ${options}
          </select>
        </div>
        <div class="trash-toolbar-actions">
          <button class="btn" id="btn-restore-all" ${total === 0 ? "disabled" : ""}>
            ${Icons.html("restore")}<span>Ripristina tutto</span>
          </button>
          <button class="btn btn-danger" id="btn-empty" ${total === 0 ? "disabled" : ""}>
            ${Icons.html("trash")}<span>Svuota cestino</span>
          </button>
        </div>
      </div>`;

    if (data.length === 0) {
      const filtered = query || tableFilter;
      return `${banner}${toolbar}
        <div class="table-wrap">
          <div class="empty-state">
            <div class="empty-icon">${Icons.html("trash")}</div>
            <div class="empty-title">${filtered ? "Nessun risultato" : "Il cestino è vuoto"}</div>
            <p>${filtered ? "Nessun elemento corrisponde ai filtri." : "I record eliminati compariranno qui e potranno essere ripristinati."}</p>
          </div>
        </div>`;
    }

    const rows = data.map(rowHTML).join("");

    return `${banner}${toolbar}<div id="bulk-bar-slot"></div>
      <div class="table-wrap">
        <table class="data-table trash-table">
          <thead>
            <tr>
              <th class="col-check"><input type="checkbox" id="trash-check-all" aria-label="Seleziona tutti in pagina" /></th>
              <th>Record</th>
              <th>Eliminato il</th>
              <th>Eliminazione definitiva</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="pagination">
          <span>${total} element${total === 1 ? "o" : "i"} nel cestino — pagina ${result.page} di ${totalPages}</span>
          <div class="pager-btns">
            <button class="btn" data-page="prev" ${result.page <= 1 ? "disabled" : ""}>${Icons.html("chevron-left")}<span>Precedente</span></button>
            <button class="btn" data-page="next" ${result.page >= totalPages ? "disabled" : ""}><span>Successiva</span>${Icons.html("chevron-right")}</button>
          </div>
        </div>
      </div>`;
  }

  function rowHTML(item) {
    const remaining = countdown(item.secondi_rimanenti);
    const status = item.restorable
      ? '<span class="badge">Ripristinabile</span>'
      : `<span class="badge danger">Non ripristinabile</span>
         <div class="trash-reason" title="${esc(item.motivo || "")}">${esc(item.motivo || "")}</div>`;

    return `
      <tr data-id="${item.id}" class="${selected.has(item.id) ? "row-selected" : ""}">
        <td class="col-check"><input type="checkbox" class="row-check" ${selected.has(item.id) ? "checked" : ""} aria-label="Seleziona ${esc(item.label)}" /></td>
        <td>
          <div class="trash-record">
            <span class="badge neutral">${esc(item.table_label)}</span>
            <strong>${esc(item.label)}</strong>
            <span class="muted">ID ${item.record_id}</span>
          </div>
        </td>
        <td>${fmtDate(item.deleted_at)}</td>
        <td>
          <div>${fmtDate(item.expires_at)}</div>
          <span class="badge ${remaining.cls}">${remaining.text}</span>
        </td>
        <td class="trash-status">${status}</td>
        <td class="col-actions">
          <button class="row-btn" data-action="details" title="Dettagli">${Icons.html("eye")}<span>Dettagli</span></button>
          <button class="row-btn" data-action="restore" ${item.restorable ? "" : "disabled"} title="${item.restorable ? "Ripristina" : "Non ripristinabile"}">${Icons.html("restore")}<span>Ripristina</span></button>
          <button class="row-btn danger" data-action="delete" title="Elimina definitivamente">${Icons.html("trash")}<span>Elimina</span></button>
        </td>
      </tr>`;
  }

  // ---------------------------------------------------------------- eventi
  function wire(result) {
    const filter = content.querySelector("#trash-filter");
    if (filter)
      filter.addEventListener("change", () => {
        tableFilter = filter.value;
        page = 1;
        load();
      });

    content
      .querySelector("#btn-restore-all")
      ?.addEventListener("click", restoreAll);
    content.querySelector("#btn-empty")?.addEventListener("click", emptyTrash);

    // ---- selezione multipla
    const checkAll = content.querySelector("#trash-check-all");
    const pageIds = result.data.map((i) => i.id);
    const syncCheckAll = () => {
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
        syncCheckAll();
        renderBulkBar();
      });
    });
    syncCheckAll();
    renderBulkBar();

    content.querySelectorAll("tr[data-id]").forEach((tr) => {
      const item = result.data.find((i) => String(i.id) === tr.dataset.id);
      tr.querySelector('[data-action="details"]').addEventListener(
        "click",
        () => showDetails(item),
      );
      tr.querySelector('[data-action="restore"]').addEventListener(
        "click",
        () => restoreOne(item),
      );
      tr.querySelector('[data-action="delete"]').addEventListener("click", () =>
        deleteForever(item),
      );
    });

    const prev = content.querySelector('[data-page="prev"]');
    const next = content.querySelector('[data-page="next"]');
    if (prev)
      prev.addEventListener("click", () => {
        page = Math.max(1, page - 1);
        load();
      });
    if (next)
      next.addEventListener("click", () => {
        page = Math.min(result.totalPages, page + 1);
        load();
      });
  }

  // ----------------------------------------------------- azioni multiple
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
          <button class="btn" id="bulk-restore">${Icons.html("restore")}<span>Ripristina selezionati</span></button>
          <button class="btn btn-danger" id="bulk-delete">${Icons.html("trash")}<span>Elimina definitivamente</span></button>
          <button class="btn btn-ghost" id="bulk-clear">Deseleziona</button>
        </div>
      </div>`;
    slot.querySelector("#bulk-restore").addEventListener("click", restoreSelected);
    slot.querySelector("#bulk-delete").addEventListener("click", deleteSelected);
    slot.querySelector("#bulk-clear").addEventListener("click", () => {
      selected.clear();
      load();
    });
  }

  async function restoreSelected() {
    const ids = [...selected];
    const ok = await ConfirmDialog.ask({
      title: `Ripristinare ${ids.length} elementi?`,
      message:
        "Verranno ripristinati quelli che possono esserlo (i padri prima dei figli, anche se selezionati insieme). " +
        "Gli elementi con riferimenti mancanti resteranno nel cestino.",
      confirmLabel: "Ripristina selezionati",
      danger: false,
    });
    if (!ok) return;
    try {
      const r = await API.trashRestoreMany(ids);
      if (r.restored === 0) {
        Toast.info("Nessuno dei selezionati è ripristinabile al momento");
      } else if (r.skipped > 0) {
        Toast.success(
          `Ripristinati ${r.restored} su ${r.total}. ${r.skipped} non ripristinabili sono rimasti nel cestino.`,
        );
      } else {
        Toast.success(`Ripristinati tutti i ${r.restored} elementi selezionati`);
      }
      // restano selezionati solo quelli non ripristinati
      selected.clear();
      r.skipped_details.forEach((d) => selected.add(d.id));
    } catch (err) {
      Toast.error(err.message);
    }
    load();
  }

  async function deleteSelected() {
    const ids = [...selected];
    const items = (lastResult?.data || []).filter((i) => selected.has(i.id));
    const withDeps = items.some((i) => i.dipendenti_nel_cestino > 0);
    const ok = await ConfirmDialog.ask({
      title: `Eliminare definitivamente ${ids.length} elementi?`,
      message:
        "Verranno eliminati per sempre, senza possibilità di ripristino." +
        (withDeps
          ? "\n\nAttenzione: altri record nel cestino che dipendono da questi non potranno più essere ripristinati."
          : ""),
      confirmLabel: "Elimina definitivamente",
    });
    if (!ok) return;
    try {
      const r = await API.trashDeleteMany(ids);
      Toast.success(
        `${r.deleted} element${r.deleted === 1 ? "o eliminato" : "i eliminati"} definitivamente` +
          (r.dipendenti_non_ripristinabili > 0
            ? ` — ${r.dipendenti_non_ripristinabili} nel cestino non più ripristinabili`
            : ""),
      );
      selected.clear();
    } catch (err) {
      Toast.error(err.message);
    }
    load();
  }

  async function restoreOne(item) {
    try {
      const r = await API.trashRestore(item.id);
      selected.delete(item.id);
      Toast.success(`Record ripristinato in "${r.table_label}"`);
    } catch (err) {
      Toast.error(err.message);
    }
    load();
  }

  async function restoreAll() {
    const ok = await ConfirmDialog.ask({
      title: "Ripristinare tutto?",
      message:
        "Verranno ripristinati tutti i record che possono esserlo (i padri prima dei figli). " +
        "I record con riferimenti mancanti resteranno nel cestino.",
      confirmLabel: "Ripristina tutto",
      danger: false,
    });
    if (!ok) return;
    try {
      const r = await API.trashRestoreAll();
      selected.clear();
      if (r.restored === 0) {
        Toast.info("Nessun record ripristinabile al momento");
      } else if (r.skipped > 0) {
        Toast.success(
          `Ripristinati ${r.restored} record. ${r.skipped} non ripristinabili sono rimasti nel cestino.`,
        );
      } else {
        Toast.success(`Ripristinati tutti i ${r.restored} record`);
      }
    } catch (err) {
      Toast.error(err.message);
    }
    load();
  }

  async function deleteForever(item) {
    let extra = "";
    if (item.dipendenti_nel_cestino > 0) {
      extra =
        `\n\nAttenzione: ${item.dipendenti_nel_cestino} ${item.dipendenti_nel_cestino === 1 ? "record nel cestino dipende" : "record nel cestino dipendono"} da questo ` +
        `e ${item.dipendenti_nel_cestino === 1 ? "non potrà più essere ripristinato" : "non potranno più essere ripristinati"}.`;
    }
    const ok = await ConfirmDialog.ask({
      title: "Eliminare definitivamente?",
      message: `"${item.label}" (${item.table_label}) verrà eliminato per sempre, senza possibilità di ripristino.${extra}`,
      confirmLabel: "Elimina definitivamente",
    });
    if (!ok) return;
    try {
      await API.trashDelete(item.id);
      selected.delete(item.id);
      Toast.success("Record eliminato definitivamente");
    } catch (err) {
      Toast.error(err.message);
    }
    load();
  }

  async function emptyTrash() {
    const total = lastResult ? lastResult.total : 0;
    const ok = await ConfirmDialog.ask({
      title: "Svuotare il cestino?",
      message: `Tutti gli elementi del cestino verranno eliminati definitivamente${tableFilter || query ? " (anche quelli non visibili con i filtri attuali)" : ""}. L'operazione non è reversibile.`,
      confirmLabel: total ? "Svuota cestino" : "Svuota",
    });
    if (!ok) return;
    try {
      const r = await API.trashEmpty();
      selected.clear();
      Toast.success(`Cestino svuotato (${r.deleted} elementi eliminati)`);
    } catch (err) {
      Toast.error(err.message);
    }
    load();
  }

  function showDetails(item) {
    const rows = item.fields
      .map((f) => {
        let v = item.data[f.name];
        if (v === null || v === undefined || v === "") v = "—";
        else if (f.type === "boolean") v = v ? "Sì" : "No";
        else if (f.type === "fk") v = `#${v}`;
        return `<dt>${esc(f.label)}</dt><dd>${esc(String(v))}</dd>`;
      })
      .join("");

    const dlg = document.createElement("dialog");
    dlg.className = "confirm-dialog details-dialog";
    dlg.innerHTML = `
      <h3>${esc(item.table_label)} — ID ${item.record_id}</h3>
      <dl class="details-list">${rows}
        <dt>Eliminato il</dt><dd>${fmtDate(item.deleted_at)}</dd>
        <dt>Eliminazione definitiva</dt><dd>${fmtDate(item.expires_at)}</dd>
      </dl>
      ${item.restorable ? "" : `<p class="trash-reason-block">${Icons.html("alert")}<span>${esc(item.motivo || "")}</span></p>`}
      <div class="confirm-actions"><button type="button" class="btn btn-primary">Chiudi</button></div>`;
    dlg.querySelector("button").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
    dlg.addEventListener("close", () => dlg.remove());
    document.body.appendChild(dlg);
    dlg.showModal();
  }

  // --------------------------------------------------------------- utilità
  function fmtDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("it-IT", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function countdown(seconds) {
    if (seconds <= 0) return { text: "In scadenza", cls: "danger" };
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(seconds / 86400);
    if (seconds < 3600) return { text: "tra meno di un'ora", cls: "danger" };
    if (days < 1)
      return {
        text: `tra ${hours} or${hours === 1 ? "a" : "e"}`,
        cls: "danger",
      };
    const cls = days <= 3 ? "warn" : "neutral";
    return { text: `tra ${days} giorn${days === 1 ? "o" : "i"}`, cls };
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return { render, leave };
})();
