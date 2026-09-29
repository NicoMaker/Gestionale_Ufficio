/**
 * CESTINO — logica centrale
 * =========================
 * Quando un record viene "eliminato" non sparisce subito: viene spostato nella
 * tabella di sistema `cestino` come istantanea JSON completa (id, campi,
 * created_at, updated_at) e rimosso dalla tabella di origine.
 *
 * REGOLE
 *  1. ELIMINAZIONE: un record si può spostare nel cestino solo se NESSUN altro
 *     record attivo lo referenzia (collegamenti = 0). Altrimenti errore 409.
 *  2. RIPRISTINO: un record si può ripristinare solo se tutti i record a cui fa
 *     riferimento (foreign key valorizzate) esistono ancora nelle tabelle attive.
 *     - se il "padre" è nel cestino  -> va ripristinato prima lui
 *     - se il "padre" non esiste più -> il record NON è ripristinabile
 *  3. SCADENZA: dopo RETENTION_DAYS giorni (default 15) i record nel cestino
 *     vengono eliminati definitivamente in automatico.
 *  4. RIPRISTINA TUTTO: ripristina tutto ciò che è ripristinabile (in ordine di
 *     dipendenza, padri prima dei figli); il resto resta nel cestino.
 *
 * Le date sono salvate in ISO 8601 UTC (es. 2026-09-29T10:15:00.000Z).
 */

const { db } = require("./init");
const { TABLES } = require("./schema");

const RETENTION_DAYS = Math.max(
  parseInt(process.env.TRASH_RETENTION_DAYS, 10) || 15,
  1,
);
const PURGE_INTERVAL_MS = 60 * 60 * 1000; // controllo scadenze ogni ora
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BULK = 500; // massimo record per operazione multipla

const TABLE_MAP = new Map(TABLES.map((t) => [t.name, t]));

// Mappa inversa: tabella padre -> [{ table, field }] di chi la referenzia
const REFERENCED_BY = new Map();
for (const t of TABLES) {
  for (const f of t.fields) {
    if (f.type !== "fk") continue;
    if (!REFERENCED_BY.has(f.fk)) REFERENCED_BY.set(f.fk, []);
    REFERENCED_BY.get(f.fk).push({ table: t, field: f });
  }
}

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// ---------------------------------------------------------------------------
// Helper SQLite (promise) + lock per rendere atomiche le operazioni di scrittura
// ---------------------------------------------------------------------------
const run = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function cb(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    }),
  );
const get = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))),
  );
const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))),
  );

// Con una sola connessione SQLite le transazioni di richieste diverse non devono
// intrecciarsi: le operazioni di scrittura vengono messe in coda.
let queue = Promise.resolve();
function transaction(fn) {
  const task = queue.then(async () => {
    await run("BEGIN IMMEDIATE");
    try {
      const result = await fn();
      await run("COMMIT");
      return result;
    } catch (err) {
      await run("ROLLBACK").catch(() => {});
      throw err;
    }
  });
  queue = task.catch(() => {});
  return task;
}

// ---------------------------------------------------------------------------
// Utilità
// ---------------------------------------------------------------------------
function labelOf(table, row) {
  const f = table.labelField;
  const v = f && row[f] != null && row[f] !== "" ? row[f] : null;
  return v != null ? String(v) : `#${row.id}`;
}

function tableLabel(name) {
  return TABLE_MAP.get(name)?.label || name;
}

function parseData(entry) {
  try {
    return JSON.parse(entry.data);
  } catch (_) {
    return {};
  }
}

function assertTable(name) {
  const table = TABLE_MAP.get(name);
  if (!table) throw new HttpError(404, `Tabella "${name}" non trovata`);
  return table;
}

// ---------------------------------------------------------------------------
// COLLEGAMENTI: chi referenzia un record attivo?
// ---------------------------------------------------------------------------
async function getLinks(tableName, id) {
  const refs = REFERENCED_BY.get(tableName) || [];
  const links = [];
  for (const { table, field } of refs) {
    // un record che punta a se stesso non blocca la propria eliminazione
    const selfClause = table.name === tableName ? " AND id != ?" : "";
    const params = table.name === tableName ? [id, id] : [id];
    const row = await get(
      `SELECT COUNT(*) AS c FROM ${table.name} WHERE ${field.name} = ?${selfClause}`,
      params,
    );
    if (row.c > 0) {
      links.push({
        table: table.name,
        table_label: table.label,
        field: field.name,
        field_label: field.label,
        count: row.c,
      });
    }
  }
  return {
    total: links.reduce((sum, l) => sum + l.count, 0),
    links,
  };
}

function linksMessage(links) {
  return links
    .map((l) => `${l.table_label} (${l.field_label}): ${l.count}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// SPOSTA NEL CESTINO
// ---------------------------------------------------------------------------
async function moveToTrashNoLock(table, id) {
  const row = await get(`SELECT * FROM ${table.name} WHERE id = ?`, [id]);
  if (!row) throw new HttpError(404, "Record non trovato");

  const { total, links } = await getLinks(table.name, row.id);
  if (total > 0) {
    throw new HttpError(
      409,
      `Impossibile eliminare: il record è collegato a ${total} altr${total === 1 ? "o record" : "i record"}.\n${linksMessage(links)}\nElimina o scollega prima i record collegati.`,
      { code: "COLLEGATO", links, total },
    );
  }

  const now = Date.now();
  const expires = new Date(now + RETENTION_DAYS * DAY_MS).toISOString();
  await run(
    `INSERT OR REPLACE INTO cestino (table_name, record_id, label, data, deleted_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      table.name,
      row.id,
      labelOf(table, row),
      JSON.stringify(row),
      new Date(now).toISOString(),
      expires,
    ],
  );
  await run(`DELETE FROM ${table.name} WHERE id = ?`, [row.id]);
  return { row, expires_at: expires };
}

function moveToTrash(tableName, id) {
  const table = assertTable(tableName);
  return transaction(async () => {
    const { expires_at } = await moveToTrashNoLock(table, id);
    return { success: true, expires_at };
  });
}

// Elimina (sposta nel cestino) PIÙ record della stessa tabella in una volta.
// Regola invariata: un record si elimina solo se ha 0 collegamenti. Se nella
// selezione ci sono sia figli sia padre, i figli vengono eliminati per primi
// (più passate) e il padre si libera; ciò che resta collegato viene saltato.
function moveManyToTrash(tableName, ids) {
  const table = assertTable(tableName);
  const unique = [...new Set(ids.map(Number).filter(Number.isInteger))];
  if (unique.length === 0)
    throw new HttpError(400, "Nessun record selezionato");
  if (unique.length > MAX_BULK)
    throw new HttpError(400, `Massimo ${MAX_BULK} record per operazione`);

  return transaction(async () => {
    let pending = unique;
    const moved = [];
    let progress = true;
    while (progress && pending.length > 0) {
      progress = false;
      const next = [];
      for (const id of pending) {
        const row = await get(`SELECT id FROM ${table.name} WHERE id = ?`, [
          id,
        ]);
        if (!row) continue; // già inesistente: ignorato
        const { total } = await getLinks(table.name, id);
        if (total === 0) {
          const { row: full } = await moveToTrashNoLock(table, id);
          moved.push({ id, label: labelOf(table, full) });
          progress = true;
        } else {
          next.push(id);
        }
      }
      pending = next;
    }
    const blocked = [];
    for (const id of pending) {
      const { total, links } = await getLinks(table.name, id);
      blocked.push({ id, total, links });
    }
    return {
      success: true,
      requested: unique.length,
      moved: moved.length,
      blocked: blocked.length,
      moved_items: moved,
      blocked_items: blocked,
    };
  });
}

// ---------------------------------------------------------------------------
// RIPRISTINABILE? Controlla che tutti i riferimenti esistano
// ---------------------------------------------------------------------------
async function checkRestorable(entry) {
  const table = TABLE_MAP.get(entry.table_name);
  if (!table) {
    return {
      restorable: false,
      missing: [],
      motivo: "La tabella di origine non esiste più nello schema.",
    };
  }
  const data = parseData(entry);
  const missing = [];

  for (const field of table.fields) {
    if (field.type !== "fk") continue;
    const value = data[field.name];
    if (value === null || value === undefined || value === "") continue;

    const exists = await get(`SELECT 1 AS ok FROM ${field.fk} WHERE id = ?`, [
      value,
    ]);
    if (exists) continue;

    const inTrash = await get(
      `SELECT id, label FROM cestino WHERE table_name = ? AND record_id = ?`,
      [field.fk, value],
    );
    missing.push({
      field: field.name,
      field_label: field.label,
      table: field.fk,
      table_label: tableLabel(field.fk),
      id: value,
      in_trash: Boolean(inTrash),
      trash_id: inTrash ? inTrash.id : null,
      label: inTrash ? inTrash.label : null,
    });
  }

  // difesa extra: l'id originale non deve essere già occupato
  const occupied = await get(`SELECT 1 AS ok FROM ${table.name} WHERE id = ?`, [
    entry.record_id,
  ]);

  let motivo = null;
  if (occupied) {
    motivo = "Esiste già un record attivo con lo stesso ID.";
  } else if (missing.length > 0) {
    motivo = missing
      .map((m) =>
        m.in_trash
          ? `${m.table_label} #${m.id}${m.label ? ` (${m.label})` : ""} è nel cestino: ripristinalo prima`
          : `${m.table_label} #${m.id} non esiste più`,
      )
      .join(" · ");
  }

  return { restorable: !occupied && missing.length === 0, missing, motivo };
}

// Quanti record NEL CESTINO dipendono da questo (perderebbero la possibilità di ripristino)
async function countDependentsInTrash(entry) {
  const refs = REFERENCED_BY.get(entry.table_name) || [];
  let total = 0;
  for (const { table, field } of refs) {
    const row = await get(
      `SELECT COUNT(*) AS c FROM cestino
        WHERE table_name = ? AND json_extract(data, '$.' || ?) = ?
          AND NOT (table_name = ? AND record_id = ?)`,
      [
        table.name,
        field.name,
        entry.record_id,
        entry.table_name,
        entry.record_id,
      ],
    );
    total += row.c;
  }
  return total;
}

// ---------------------------------------------------------------------------
// RIPRISTINO (singolo e totale)
// ---------------------------------------------------------------------------
async function restoreEntryNoLock(entry) {
  const table = TABLE_MAP.get(entry.table_name);
  const data = parseData(entry);

  const cols = ["id"];
  const values = [entry.record_id];
  for (const f of table.fields) {
    if (Object.prototype.hasOwnProperty.call(data, f.name)) {
      cols.push(f.name);
      values.push(data[f.name]);
    }
  }
  for (const meta of ["created_at", "updated_at"]) {
    if (data[meta]) {
      cols.push(meta);
      values.push(data[meta]);
    }
  }

  await run(
    `INSERT INTO ${table.name} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
    values,
  );
  await run(`DELETE FROM cestino WHERE id = ?`, [entry.id]);
}

function restoreOne(trashId) {
  return transaction(async () => {
    const entry = await get(`SELECT * FROM cestino WHERE id = ?`, [trashId]);
    if (!entry) throw new HttpError(404, "Elemento non presente nel cestino");

    const check = await checkRestorable(entry);
    if (!check.restorable) {
      throw new HttpError(409, `Impossibile ripristinare: ${check.motivo}`, {
        code: "NON_RIPRISTINABILE",
        missing: check.missing,
      });
    }
    await restoreEntryNoLock(entry);
    return {
      success: true,
      table: entry.table_name,
      table_label: tableLabel(entry.table_name),
      record_id: entry.record_id,
    };
  });
}

// Ripristina il possibile tra le voci date (padri prima dei figli, più passate).
// Un figlio è ripristinabile anche se il padre è nella stessa selezione: il padre
// viene ripristinato prima e sblocca il figlio nella passata successiva.
async function restoreEntries(entries) {
  const total = entries.length;
  let restored = 0;
  const restoredItems = [];
  let progress = true;

  while (progress && entries.length > 0) {
    progress = false;
    const remaining = [];
    for (const entry of entries) {
      const check = await checkRestorable(entry);
      if (check.restorable) {
        await restoreEntryNoLock(entry);
        restored++;
        restoredItems.push({
          table: entry.table_name,
          table_label: tableLabel(entry.table_name),
          record_id: entry.record_id,
          label: entry.label,
        });
        progress = true;
      } else {
        remaining.push(entry);
      }
    }
    entries = remaining;
  }

  const skippedDetails = [];
  for (const entry of entries) {
    const check = await checkRestorable(entry);
    skippedDetails.push({
      id: entry.id,
      table: entry.table_name,
      table_label: tableLabel(entry.table_name),
      record_id: entry.record_id,
      label: entry.label,
      motivo: check.motivo,
    });
  }
  return {
    total,
    restored,
    skipped: entries.length,
    restored_items: restoredItems,
    skipped_details: skippedDetails,
  };
}

function restoreAll() {
  return transaction(async () =>
    restoreEntries(await all(`SELECT * FROM cestino ORDER BY id ASC`)),
  );
}

// Ripristina SOLO gli elementi selezionati (quelli che si possono).
function restoreMany(trashIds) {
  const ids = normalizeIds(trashIds);
  return transaction(async () => {
    const entries = await all(
      `SELECT * FROM cestino WHERE id IN (${ids.map(() => "?").join(",")}) ORDER BY id ASC`,
      ids,
    );
    if (entries.length === 0)
      throw new HttpError(404, "Nessuno degli elementi è più nel cestino");
    return restoreEntries(entries);
  });
}

function normalizeIds(list) {
  const ids = [
    ...new Set((Array.isArray(list) ? list : []).map(Number)),
  ].filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) throw new HttpError(400, "Nessun elemento selezionato");
  if (ids.length > MAX_BULK)
    throw new HttpError(400, `Massimo ${MAX_BULK} elementi per operazione`);
  return ids;
}

// ---------------------------------------------------------------------------
// ELIMINAZIONE DEFINITIVA / SVUOTA / SCADENZE
// ---------------------------------------------------------------------------
function deletePermanently(trashId) {
  return transaction(async () => {
    const entry = await get(`SELECT * FROM cestino WHERE id = ?`, [trashId]);
    if (!entry) throw new HttpError(404, "Elemento non presente nel cestino");
    const dependents = await countDependentsInTrash(entry);
    await run(`DELETE FROM cestino WHERE id = ?`, [trashId]);
    return { success: true, dipendenti_non_ripristinabili: dependents };
  });
}

// Elimina definitivamente più elementi. Restituisce quanti altri record rimasti
// nel cestino (non selezionati) perdono la possibilità di essere ripristinati.
function deleteMany(trashIds) {
  const ids = normalizeIds(trashIds);
  return transaction(async () => {
    const entries = await all(
      `SELECT * FROM cestino WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    let orphaned = 0;
    for (const entry of entries) {
      const refs = REFERENCED_BY.get(entry.table_name) || [];
      for (const { table, field } of refs) {
        const row = await get(
          `SELECT COUNT(*) AS c FROM cestino
            WHERE table_name = ? AND json_extract(data, '$.' || ?) = ?
              AND id NOT IN (${ids.map(() => "?").join(",")})`,
          [table.name, field.name, entry.record_id, ...ids],
        );
        orphaned += row.c;
      }
    }
    const r = await run(
      `DELETE FROM cestino WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    return {
      success: true,
      deleted: r.changes,
      dipendenti_non_ripristinabili: orphaned,
    };
  });
}

function emptyTrash() {
  return transaction(async () => {
    const r = await run(`DELETE FROM cestino`);
    return { success: true, deleted: r.changes };
  });
}

function purgeExpired() {
  return transaction(async () => {
    const r = await run(`DELETE FROM cestino WHERE expires_at <= ?`, [
      new Date().toISOString(),
    ]);
    return r.changes;
  });
}

let purgeTimer = null;
function startPurgeJob() {
  const tick = () =>
    purgeExpired()
      .then((n) => {
        if (n > 0)
          console.log(
            `[cestino] ${n} record scaduti eliminati definitivamente (oltre ${RETENTION_DAYS} giorni)`,
          );
      })
      .catch((err) => console.error("[cestino] errore pulizia scadenze:", err));
  tick();
  purgeTimer = setInterval(tick, PURGE_INTERVAL_MS);
  purgeTimer.unref();
}

// ---------------------------------------------------------------------------
// ELENCO
// ---------------------------------------------------------------------------
async function list({ page = 1, limit = 25, q = "", table = "" } = {}) {
  await purgeExpired();

  const where = [];
  const params = [];
  if (table && TABLE_MAP.has(table)) {
    where.push("table_name = ?");
    params.push(table);
  }
  if (q) {
    where.push("(label LIKE ? OR data LIKE ? OR table_name LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const { total } = await get(
    `SELECT COUNT(*) AS total FROM cestino ${whereSQL}`,
    params,
  );
  const rows = await all(
    `SELECT * FROM cestino ${whereSQL} ORDER BY deleted_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit],
  );

  const now = Date.now();
  const items = [];
  for (const entry of rows) {
    const check = await checkRestorable(entry);
    const t = TABLE_MAP.get(entry.table_name);
    items.push({
      id: entry.id,
      table_name: entry.table_name,
      table_label: tableLabel(entry.table_name),
      group: t ? t.group : null,
      record_id: entry.record_id,
      label: entry.label,
      data: parseData(entry),
      fields: t
        ? t.fields.map((f) => ({ name: f.name, label: f.label, type: f.type }))
        : [],
      deleted_at: entry.deleted_at,
      expires_at: entry.expires_at,
      secondi_rimanenti: Math.round(
        (new Date(entry.expires_at).getTime() - now) / 1000,
      ),
      restorable: check.restorable,
      missing: check.missing,
      motivo: check.motivo,
      dipendenti_nel_cestino: await countDependentsInTrash(entry),
    });
  }

  return {
    data: items,
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    retention_days: RETENTION_DAYS,
  };
}

// Riepilogo per la dashboard: totale, ripristinabili, in scadenza, per tabella.
async function summary() {
  await purgeExpired();
  const entries = await all(`SELECT * FROM cestino ORDER BY expires_at ASC`);
  const now = Date.now();
  let restorable = 0;
  let expiringSoon = 0;
  const byTable = new Map();
  for (const entry of entries) {
    const check = await checkRestorable(entry);
    if (check.restorable) restorable++;
    if (new Date(entry.expires_at).getTime() - now <= 3 * DAY_MS)
      expiringSoon++;
    byTable.set(entry.table_name, (byTable.get(entry.table_name) || 0) + 1);
  }
  return {
    total: entries.length,
    restorable,
    not_restorable: entries.length - restorable,
    expiring_soon: expiringSoon,
    next_expiry: entries.length ? entries[0].expires_at : null,
    retention_days: RETENTION_DAYS,
    by_table: [...byTable.entries()]
      .map(([table, n]) => ({
        table,
        table_label: tableLabel(table),
        count: n,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

async function count() {
  await purgeExpired();
  const row = await get(`SELECT COUNT(*) AS total FROM cestino`);
  return { total: row.total, retention_days: RETENTION_DAYS };
}

module.exports = {
  RETENTION_DAYS,
  HttpError,
  getLinks,
  linksMessage,
  moveToTrash,
  moveManyToTrash,
  checkRestorable,
  restoreOne,
  restoreAll,
  restoreMany,
  deletePermanently,
  deleteMany,
  emptyTrash,
  purgeExpired,
  startPurgeJob,
  list,
  count,
  summary,
};
