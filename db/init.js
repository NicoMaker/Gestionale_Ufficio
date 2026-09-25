const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { TABLES } = require('./schema');

const DB_PATH = path.join(__dirname, 'gestionale.sqlite3');
const db = new sqlite3.Database(DB_PATH);

// Converte un tipo di campo dello schema nel tipo colonna SQLite corrispondente
function sqlType(field) {
  switch (field.type) {
    case 'number':
      return 'REAL';
    case 'boolean':
      return 'INTEGER';
    case 'fk':
      return 'INTEGER';
    default: // text, textarea, select, date, datetime
      return 'TEXT';
  }
}

function buildCreateTableSQL(table) {
  const columns = [
    'id INTEGER PRIMARY KEY AUTOINCREMENT',
  ];

  for (const field of table.fields) {
    let col = `${field.name} ${sqlType(field)}`;
    if (field.type === 'fk') {
      col += ` REFERENCES ${field.fk}(id) ON DELETE SET NULL`;
    }
    columns.push(col);
  }

  columns.push("created_at TEXT DEFAULT (datetime('now'))");
  columns.push("updated_at TEXT DEFAULT (datetime('now'))");

  return `CREATE TABLE IF NOT EXISTS ${table.name} (\n  ${columns.join(',\n  ')}\n)`;
}

function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('PRAGMA foreign_keys = ON');

      for (const table of TABLES) {
        const sql = buildCreateTableSQL(table);
        db.run(sql, (err) => {
          if (err) {
            console.error(`Errore creazione tabella "${table.name}":`, err.message);
          }
        });
      }

      // Indici sulle colonne fk per query più veloci
      for (const table of TABLES) {
        for (const field of table.fields) {
          if (field.type === 'fk') {
            const idxName = `idx_${table.name}_${field.name}`;
            db.run(`CREATE INDEX IF NOT EXISTS ${idxName} ON ${table.name}(${field.name})`);
          }
        }
      }

      db.run('SELECT 1', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

module.exports = { db, initDatabase, DB_PATH };
