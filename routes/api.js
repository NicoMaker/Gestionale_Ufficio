const express = require('express');
const { db } = require('../db/init');
const { TABLES, GROUPS } = require('../db/schema');

const router = express.Router();

// Mappa nome tabella -> definizione, per validazione whitelist (protezione da SQL injection)
const TABLE_MAP = new Map(TABLES.map((t) => [t.name, t]));

function getTableOr404(req, res) {
  const table = TABLE_MAP.get(req.params.table);
  if (!table) {
    res.status(404).json({ error: `Tabella "${req.params.table}" non trovata` });
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
      if (field.type === 'boolean') {
        value = value ? 1 : 0;
      }
      if (value === '' || value === undefined) {
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
router.get('/_meta', (req, res) => {
  res.json({ groups: GROUPS, tables: TABLES });
});

// ---------------------------------------------------------------------------
// GET /api/:table -> elenco righe, con ricerca (?q=) e paginazione (?page=&limit=)
// ---------------------------------------------------------------------------
router.get('/:table', (req, res) => {
  const table = getTableOr404(req, res);
  if (!table) return;

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 200);
  const offset = (page - 1) * limit;
  const q = (req.query.q || '').trim();

  const textFields = table.fields.filter((f) => ['text', 'textarea', 'select'].includes(f.type));
  let whereSQL = '';
  const params = [];

  if (q && textFields.length > 0) {
    const clauses = textFields.map((f) => `${f.name} LIKE ?`);
    whereSQL = `WHERE ${clauses.join(' OR ')}`;
    textFields.forEach(() => params.push(`%${q}%`));
  }

  const countSQL = `SELECT COUNT(*) AS total FROM ${table.name} ${whereSQL}`;
  const listSQL = `SELECT * FROM ${table.name} ${whereSQL} ORDER BY id DESC LIMIT ? OFFSET ?`;

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
router.get('/:table/options', (req, res) => {
  const table = getTableOr404(req, res);
  if (!table) return;

  const labelField = table.labelField && table.fields.some((f) => f.name === table.labelField)
    ? table.labelField
    : 'id';

  db.all(`SELECT id, ${labelField} AS label FROM ${table.name} ORDER BY ${labelField} ASC LIMIT 1000`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ---------------------------------------------------------------------------
// GET /api/:table/:id -> singola riga
// ---------------------------------------------------------------------------
router.get('/:table/:id', (req, res) => {
  const table = getTableOr404(req, res);
  if (!table) return;

  db.get(`SELECT * FROM ${table.name} WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Record non trovato' });
    res.json(row);
  });
});

// ---------------------------------------------------------------------------
// POST /api/:table -> crea riga
// ---------------------------------------------------------------------------
router.post('/:table', (req, res) => {
  const table = getTableOr404(req, res);
  if (!table) return;

  const data = sanitizeBody(table, req.body || {});
  const missing = missingRequiredFields(table, data);
  if (missing.length > 0) {
    return res.status(400).json({ error: `Campi obbligatori mancanti: ${missing.join(', ')}` });
  }

  const cols = Object.keys(data);
  const placeholders = cols.map(() => '?').join(', ');
  const values = cols.map((c) => data[c]);

  const sql = cols.length > 0
    ? `INSERT INTO ${table.name} (${cols.join(', ')}) VALUES (${placeholders})`
    : `INSERT INTO ${table.name} DEFAULT VALUES`;

  db.run(sql, values, function insertCallback(err) {
    if (err) return res.status(400).json({ error: err.message });
    db.get(`SELECT * FROM ${table.name} WHERE id = ?`, [this.lastID], (err2, row) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.status(201).json(row);
    });
  });
});

// ---------------------------------------------------------------------------
// PUT /api/:table/:id -> aggiorna riga
// ---------------------------------------------------------------------------
router.put('/:table/:id', (req, res) => {
  const table = getTableOr404(req, res);
  if (!table) return;

  const data = sanitizeBody(table, req.body || {});
  const missing = missingRequiredFields(table, data);
  if (missing.length > 0) {
    return res.status(400).json({ error: `Campi obbligatori mancanti: ${missing.join(', ')}` });
  }

  const cols = Object.keys(data);
  if (cols.length === 0) {
    return res.status(400).json({ error: 'Nessun campo da aggiornare' });
  }

  const setSQL = cols.map((c) => `${c} = ?`).join(', ');
  const values = cols.map((c) => data[c]);
  values.push(req.params.id);

  const sql = `UPDATE ${table.name} SET ${setSQL}, updated_at = datetime('now') WHERE id = ?`;

  db.run(sql, values, function updateCallback(err) {
    if (err) return res.status(400).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Record non trovato' });
    db.get(`SELECT * FROM ${table.name} WHERE id = ?`, [req.params.id], (err2, row) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json(row);
    });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/:table/:id -> elimina riga
// ---------------------------------------------------------------------------
router.delete('/:table/:id', (req, res) => {
  const table = getTableOr404(req, res);
  if (!table) return;

  db.run(`DELETE FROM ${table.name} WHERE id = ?`, [req.params.id], function deleteCallback(err) {
    if (err) return res.status(400).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Record non trovato' });
    res.json({ success: true });
  });
});

module.exports = router;
