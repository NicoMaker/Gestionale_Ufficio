/**
 * Genera il diagramma ER (Mermaid) a partire da db/schema.js, cosi' il
 * diagramma resta sempre sincronizzato con le tabelle reali.
 * Uso: node docs/generate-er-diagram.js  -> scrive docs/schema.mmd
 */
const fs = require('fs');
const path = require('path');
const { TABLES } = require('../db/schema');

function sqlType(field) {
  switch (field.type) {
    case 'number': return 'REAL';
    case 'boolean': return 'INTEGER';
    case 'fk': return 'INTEGER';
    default: return 'TEXT';
  }
}

function buildEntities() {
  return TABLES.map((table) => {
    const attrs = [
      '        INTEGER id PK',
      ...table.fields.map((f) => {
        const suffix = f.type === 'fk' ? ' FK' : '';
        return `        ${sqlType(f)} ${f.name}${suffix}`;
      }),
      '        TEXT created_at',
      '        TEXT updated_at',
    ];
    return `    ${table.name} {\n${attrs.join('\n')}\n    }`;
  }).join('\n');
}

function buildRelationships() {
  const lines = [];
  TABLES.forEach((table) => {
    table.fields
      .filter((f) => f.type === 'fk')
      .forEach((f) => {
        // parent ||--o{ child : "campo_fk" (0 o piu' righe figlie per ogni riga padre)
        lines.push(`    ${f.fk} ||--o{ ${table.name} : "${f.name}"`);
      });
  });
  return lines.join('\n');
}

function build() {
  return [
    '%% Diagramma ER generato automaticamente da db/schema.js',
    '%% Rigenera con: node docs/generate-er-diagram.js',
    'erDiagram',
    buildRelationships(),
    '',
    buildEntities(),
  ].join('\n');
}

const output = build();
fs.writeFileSync(path.join(__dirname, 'schema.mmd'), output);
console.log(`Diagramma generato: ${TABLES.length} tabelle, scritto in docs/schema.mmd`);
