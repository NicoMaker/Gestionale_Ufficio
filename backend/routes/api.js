const express = require("express");
const { db } = require("../db/init");
const { TABLES, GROUPS } = require("../db/schema");
const Trash = require("../db/trash");

const router = express.Router();

// Mappa nome tabella -> definizione, per validazione whitelist (protezione da SQL injection)
const TABLE_MAP = new Map(TABLES.map((t) => [t.name, t]));

function getTableOr404(req, res) {
  const table = TABLE_MAP.get(req.params.table);
  if (!table) {
    res
      .status(404)
      .json({ error: `Tabella "${req.params.table}" non trovata` });
    return null;
  }
  return table;
}

// Ripulisce il body in ingresso: tiene solo colonne note dallo schema
function sanitizeBody(table, body) {
  const clean = {};
  for (const field of table.fields) {
    if (Object.prototype.hasOwnProperty.call(body, field.name)) {
      let value = body[field.name];
      if (field.type === "boolean") {
        value = value ? 1 : 0;
      }
      if (value === "" || value === undefined) {
        value = null;
      }
      clean[field.name] = value;
    }
  }
  return clean;
}

function missingRequiredFields(table, data) {
  return table.fields
    .filter((f) => f.required)
    .filter((f) => data[f.name] === null || data[f.name] === undefined)
    .map((f) => f.label);
}

// ---------------------------------------------------------------------------
// GET /api/_meta -> schema completo + gruppi (usato dal frontend per costruire la UI)
// ---------------------------------------------------------------------------
router.get("/_meta", (req, res) => {
  res.json({
    groups: GROUPS,
    tables: TABLES,
    trash: { retentionDays: Trash.RETENTION_DAYS },
  });
});

// ---------------------------------------------------------------------------
// GET /api/:table -> elenco righe, con ricerca (?q=) e paginazione (?page=&limit=)
// ---------------------------------------------------------------------------
router.get("/:table", (req, res) => {
  const table = getTableOr404(req, res);
  if (!table) return;

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 200);
  const offset = (page - 1) * limit;
  const q = (req.query.q || "").trim();

  // Ordinamento: colonna in whitelist (schema) + direzione, mai input libero nel SQL
  const sortable = new Set(["id", ...table.fields.map((f) => f.name)]);
  const sortBy = sortable.has(req.query.sort) ? req.query.sort : "id";
  const sortDir =
    String(req.query.dir).toLowerCase() === "asc" ? "ASC" : "DESC";

  const textFields = table.fields.filter((f) =>
    ["text", "textarea", "select"].includes(f.type),
  );
  let whereSQL = "";
  const params = [];

  if (q && textFields.length > 0) {
    const clauses = textFields.map((f) => `${f.name} LIKE ?`);
    whereSQL = `WHERE ${clauses.join(" OR ")}`;
    textFields.forEach(() => params.push(`%${q}%`));
  }

  const countSQL = `SELECT COUNT(*) AS total FROM ${table.name} ${whereSQL}`;
  const listSQL = `SELECT * FROM ${table.name} ${whereSQL} ORDER BY ${sortBy} ${sortDir} LIMIT ? OFFSET ?`;

  db.get(countSQL, params, (err, countRow) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all(listSQL, [...params, limit, offset], (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({
        data: rows,
        page,
        limit,
        total: countRow.total,
        totalPages: Math.max(Math.ceil(countRow.total / limit), 1),
      });
    });
  });
});

// ---------------------------------------------------------------------------
// GET /api/:table/options -> coppie {id, label} per popolare i menu a tendina FK
// ---------------------------------------------------------------------------
router.get("/:table/options", (req, res) => {
  const table = getTableOr404(req, res);
  if (!table) return;

  const labelField =
    table.labelField && table.fields.some((f) => f.name === table.labelField)
      ? table.labelField
      : "id";

  db.all(
    `SELECT id, ${labelField} AS label FROM ${table.name} ORDER BY ${labelField} ASC LIMIT 1000`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

// ---------------------------------------------------------------------------
// GET /api/:table/:id -> singola riga
// ---------------------------------------------------------------------------
router.get("/:table/:id", (req, res) => {
  const table = getTableOr404(req, res);
  if (!table) return;

  db.get(
    `SELECT * FROM ${table.name} WHERE id = ?`,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Record non trovato" });
      res.json(row);
    },
  );
});

// ---------------------------------------------------------------------------
// POST /api/:table -> crea riga
// ---------------------------------------------------------------------------
router.post("/:table", (req, res) => {
  const table = getTableOr404(req, res);
  if (!table) return;

  const data = sanitizeBody(table, req.body || {});
  const missing = missingRequiredFields(table, data);
  if (missing.length > 0) {
    return res
      .status(400)
      .json({ error: `Campi obbligatori mancanti: ${missing.join(", ")}` });
  }

  const cols = Object.keys(data);
  const placeholders = cols.map(() => "?").join(", ");
  const values = cols.map((c) => data[c]);

  const sql =
    cols.length > 0
      ? `INSERT INTO ${table.name} (${cols.join(", ")}) VALUES (${placeholders})`
      : `INSERT INTO ${table.name} DEFAULT VALUES`;

  db.run(sql, values, function insertCallback(err) {
    if (err) return res.status(400).json({ error: err.message });
    db.get(
      `SELECT * FROM ${table.name} WHERE id = ?`,
      [this.lastID],
      (err2, row) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.status(201).json(row);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// PUT /api/:table/:id -> aggiorna riga
// ---------------------------------------------------------------------------
router.put("/:table/:id", (req, res) => {
  const table = getTableOr404(req, res);
  if (!table) return;

  const data = sanitizeBody(table, req.body || {});
  const missing = missingRequiredFields(table, data);
  if (missing.length > 0) {
    return res
      .status(400)
      .json({ error: `Campi obbligatori mancanti: ${missing.join(", ")}` });
  }

  const cols = Object.keys(data);
  if (cols.length === 0) {
    return res.status(400).json({ error: "Nessun campo da aggiornare" });
  }

  const setSQL = cols.map((c) => `${c} = ?`).join(", ");
  const values = cols.map((c) => data[c]);
  values.push(req.params.id);

  const sql = `UPDATE ${table.name} SET ${setSQL}, updated_at = datetime('now') WHERE id = ?`;

  db.run(sql, values, function updateCallback(err) {
    if (err) return res.status(400).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ error: "Record non trovato" });
    db.get(
      `SELECT * FROM ${table.name} WHERE id = ?`,
      [req.params.id],
      (err2, row) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json(row);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// GET /api/:table/:id/links -> record che referenziano questo record.
// Se total > 0 il record NON si può eliminare (collegamenti != 0).
// ---------------------------------------------------------------------------
router.get("/:table/:id/links", async (req, res) => {
  const table = getTableOr404(req, res);
  if (!table) return;
  try {
    const exists = await new Promise((resolve, reject) =>
      db.get(
        `SELECT id FROM ${table.name} WHERE id = ?`,
        [req.params.id],
        (err, row) => (err ? reject(err) : resolve(row)),
      ),
    );
    if (!exists) return res.status(404).json({ error: "Record non trovato" });
    res.json(await Trash.getLinks(table.name, exists.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/:table/:id -> sposta il record nel CESTINO (eliminazione "soft").
// Consentito solo se nessun altro record lo referenzia (altrimenti 409).
// Il record resta ripristinabile e viene eliminato definitivamente in automatico
// dopo TRASH_RETENTION_DAYS giorni (default 15).
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// POST /api/:table/bulk-delete  { ids: [...] } -> sposta PIÙ record nel cestino.
// Vale la stessa regola: solo i record con 0 collegamenti vengono eliminati,
// gli altri vengono saltati e restituiti in `blocked_items`.
// ---------------------------------------------------------------------------
router.post("/:table/bulk-delete", async (req, res) => {
  const table = getTableOr404(req, res);
  if (!table) return;
  try {
    res.json(
      await Trash.moveManyToTrash(table.name, (req.body || {}).ids || []),
    );
  } catch (err) {
    if (err instanceof Trash.HttpError) {
      return res.status(err.status).json({ error: err.message, ...err.extra });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:table/:id", async (req, res) => {
  const table = getTableOr404(req, res);
  if (!table) return;
  try {
    res.json(await Trash.moveToTrash(table.name, Number(req.params.id)));
  } catch (err) {
    if (err instanceof Trash.HttpError) {
      return res.status(err.status).json({ error: err.message, ...err.extra });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
