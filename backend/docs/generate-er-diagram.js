/**
 * Genera il diagramma ER (Mermaid) a partire da db/schema.js, cosi' il
 * diagramma resta sempre sincronizzato con le tabelle reali.
 * Uso: node docs/generate-er-diagram.js  -> scrive docs/schema.mmd
 */
const fs = require("fs");
const path = require("path");
const { TABLES } = require("../db/schema");

function sqlType(field) {
  switch (field.type) {
    case "number":
      return "REAL";
    case "boolean":
      return "INTEGER";
    case "fk":
      return "INTEGER";
    default:
      return "TEXT";
  }
}

function buildEntities() {
  return TABLES.map((table) => {
    const attrs = [
      "        INTEGER id PK",
      ...table.fields.map((f) => {
        const suffix = f.type === "fk" ? " FK" : "";
        return `        ${sqlType(f)} ${f.name}${suffix}`;
      }),
      "        TEXT created_at",
      "        TEXT updated_at",
    ];
    return `    ${table.name} {\n${attrs.join("\n")}\n    }`;
  }).join("\n");
}

function buildRelationships() {
  const lines = [];
  TABLES.forEach((table) => {
    table.fields
      .filter((f) => f.type === "fk")
      .forEach((f) => {
        // parent ||--o{ child : "campo_fk" (0 o piu' righe figlie per ogni riga padre)
        lines.push(`    ${f.fk} ||--o{ ${table.name} : "${f.name}"`);
      });
  });
  return lines.join("\n");
}

// Tabella di sistema del cestino (definita in db/init.js, non in schema.js).
// Il legame con le altre tabelle e' LOGICO (table_name + record_id): il record
// eliminato vive nel cestino come istantanea JSON, senza foreign key fisica.
function buildTrashEntity() {
  return [
    "    %% CESTINO: record eliminati (istantanea JSON), eliminati in automatico dopo 15 giorni",
    "    %% Ripristino possibile solo se tutte le FK contenute in `data` puntano a record esistenti",
    "    cestino {",
    "        INTEGER id PK",
    '        TEXT table_name "tabella di origine (una delle 50 tabelle)"',
    '        INTEGER record_id "id originale del record eliminato"',
    '        TEXT label "etichetta leggibile del record"',
    '        TEXT data "istantanea JSON completa (id, campi, FK, created_at, updated_at)"',
    '        TEXT deleted_at "data di eliminazione (ISO 8601 UTC)"',
    '        TEXT expires_at "data di eliminazione definitiva = deleted_at + 15 giorni"',
    "    }",
  ].join("\n");
}

function build() {
  return [
    "%% Diagramma ER generato automaticamente da db/schema.js",
    "%% Rigenera con: node docs/generate-er-diagram.js",
    "erDiagram",
    buildRelationships(),
    "",
    buildEntities(),
    "",
    buildTrashEntity(),
  ].join("\n");
}

const output = build();
fs.writeFileSync(path.join(__dirname, "schema.mmd"), output);
console.log(
  `Diagramma generato: ${TABLES.length} tabelle + cestino, scritto in docs/schema.mmd`,
);
