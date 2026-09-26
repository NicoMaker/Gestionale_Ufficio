/**
 * SEED DATI DI ESEMPIO
 * =====================
 * Popola tutte le 50 tabelle del gestionale con dati realistici di esempio,
 * rispettando le relazioni (foreign key) definite in `db/schema.js`.
 *
 * Uso:
 *   node db/seed.js            # crea lo schema (se serve) e inserisce i dati
 *   node db/seed.js --reset    # svuota prima tutte le tabelle, poi reinserisce
 *
 * Lo script e' idempotente solo se lanciato con --reset: altrimenti, se
 * eseguito piu' volte, duplica i dati (utile per aggiungere altro materiale
 * di test).
 */

const { db, initDatabase } = require("./init");
const { TABLES } = require("./schema");

// ---------------------------------------------------------------------------
// Helper generici
// ---------------------------------------------------------------------------

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

/** Inserisce una riga in `table` a partire da un oggetto {campo: valore}. */
function insert(table, data) {
  const cols = Object.keys(data);
  const placeholders = cols.map(() => "?").join(", ");
  const values = cols.map((c) => data[c]);
  const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;
  return run(sql, values);
}

async function insertMany(table, rows) {
  const ids = [];
  for (const row of rows) {
    ids.push(await insert(table, row));
  }
  return ids;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function pickId(ids) {
  return pick(ids);
}

function pad(n, len) {
  return String(n).padStart(len, "0");
}

/** Data casuale tra due anni, in formato YYYY-MM-DD. */
function randDate(startYear = 2024, endYear = 2026) {
  const year = randInt(startYear, endYear);
  const month = randInt(1, 12);
  const day = randInt(1, 28);
  return `${year}-${pad(month, 2)}-${pad(day, 2)}`;
}

function randDateTime(startYear = 2024, endYear = 2026) {
  return `${randDate(startYear, endYear)} ${pad(randInt(0, 23), 2)}:${pad(randInt(0, 59), 2)}:00`;
}

function piva() {
  let s = "";
  for (let i = 0; i < 11; i++) s += randInt(0, 9);
  return s;
}

function codiceFiscale(nome, cognome) {
  return (
    cognome.substring(0, 3).toUpperCase() +
    nome.substring(0, 3).toUpperCase() +
    randInt(70, 99) +
    pick(["A", "B", "C", "D", "E", "H", "L", "M", "P", "R", "S", "T"]) +
    pad(randInt(1, 28), 2) +
    pick(["A123B", "C456D", "E789F", "G012H"])
  );
}

function telefono() {
  return `0${randInt(1, 9)}${randInt(1000000, 9999999)}`;
}

function cellulare() {
  return `3${randInt(20, 99)}${randInt(1000000, 9999999)}`;
}

function iban() {
  return `IT${randInt(10, 99)}X${randInt(1000, 9999)}${randInt(10000, 99999)}${randInt(100000000000, 999999999999)}`;
}

// ---------------------------------------------------------------------------
// Pool di dati anagrafici realistici
// ---------------------------------------------------------------------------

const NOMI = [
  "Marco",
  "Luca",
  "Giulia",
  "Francesca",
  "Andrea",
  "Sara",
  "Matteo",
  "Chiara",
  "Davide",
  "Elena",
  "Simone",
  "Valentina",
  "Alessandro",
  "Martina",
  "Federico",
  "Ilaria",
  "Roberto",
  "Silvia",
];
const COGNOMI = [
  "Rossi",
  "Bianchi",
  "Verdi",
  "Ferrari",
  "Esposito",
  "Romano",
  "Colombo",
  "Ricci",
  "Marino",
  "Greco",
  "Bruno",
  "Gallo",
  "Conti",
  "De Luca",
  "Mancini",
  "Costa",
  "Fontana",
  "Villa",
];
const CITTA = [
  { citta: "Milano", cap: "20121" },
  { citta: "Roma", cap: "00184" },
  { citta: "Torino", cap: "10121" },
  { citta: "Padova", cap: "35121" },
  { citta: "Bologna", cap: "40121" },
  { citta: "Verona", cap: "37121" },
  { citta: "Firenze", cap: "50122" },
  { citta: "Bari", cap: "70121" },
];
const FORME_SOCIETARIE = ["Srl", "SpA", "Sas", "Snc", "Srls"];
const SETTORI = [
  "Costruzioni",
  "Elettronica",
  "Logistica",
  "Consulenza",
  "Arredamenti",
  "Impianti",
  "Trasporti",
  "Informatica",
  "Meccanica",
  "Tessile",
];

function ragioneSociale() {
  return `${pick(COGNOMI)} ${pick(SETTORI)} ${pick(FORME_SOCIETARIE)}`;
}

function emailFrom(str) {
  return (
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "") + "@example.com"
  );
}

function indirizzo() {
  return `Via ${pick(["Roma", "Garibaldi", "Dante", "Verdi", "Mazzini", "Cavour", "Marconi", "Manzoni"])}, ${randInt(1, 200)}`;
}

// ---------------------------------------------------------------------------
// Svuota tutte le tabelle (ordine inverso rispetto a TABLES, per rispettare
// i vincoli di foreign key) - usato solo con --reset
// ---------------------------------------------------------------------------

async function resetAllTables() {
  const reversed = [...TABLES].reverse();
  for (const table of reversed) {
    await run(`DELETE FROM ${table.name}`);
    await run(`DELETE FROM sqlite_sequence WHERE name = ?`, [table.name]);
  }
  console.log("Tutte le tabelle sono state svuotate.");
}

// ---------------------------------------------------------------------------
// Seed vero e proprio, tabella per tabella (rispetta l'ordine di
// dipendenza delle foreign key definito in db/schema.js)
// ---------------------------------------------------------------------------

async function seed() {
  const ids = {};

  // --------------------------- ANAGRAFICHE ---------------------------
  ids.categorie_clienti = await insertMany(
    "categorie_clienti",
    ["Privato", "Azienda", "Pubblica Amministrazione", "Rivenditore"].map(
      (nome) => ({
        nome,
        descrizione: `Clienti classificati come ${nome.toLowerCase()}`,
      }),
    ),
  );

  ids.clienti = [];
  for (let i = 0; i < 10; i++) {
    const rs = ragioneSociale();
    const loc = pick(CITTA);
    ids.clienti.push(
      await insert("clienti", {
        ragione_sociale: rs,
        partita_iva: piva(),
        codice_fiscale: piva(),
        email: emailFrom(rs),
        telefono: telefono(),
        indirizzo: indirizzo(),
        citta: loc.citta,
        cap: loc.cap,
        categoria_id: pickId(ids.categorie_clienti),
        note: "",
      }),
    );
  }

  ids.fornitori = [];
  for (let i = 0; i < 6; i++) {
    const rs = ragioneSociale();
    const loc = pick(CITTA);
    ids.fornitori.push(
      await insert("fornitori", {
        ragione_sociale: rs,
        partita_iva: piva(),
        email: emailFrom(rs),
        telefono: telefono(),
        indirizzo: indirizzo(),
        citta: loc.citta,
        cap: loc.cap,
        note: "",
      }),
    );
  }

  ids.contatti = [];
  for (let i = 0; i < 10; i++) {
    const nome = pick(NOMI);
    const cognome = pick(COGNOMI);
    ids.contatti.push(
      await insert("contatti", {
        nome,
        cognome,
        email: emailFrom(`${nome}.${cognome}`),
        telefono: cellulare(),
        cliente_id: pickId(ids.clienti),
        ruolo: pick([
          "Referente Acquisti",
          "Amministrazione",
          "Titolare",
          "Responsabile Tecnico",
        ]),
      }),
    );
  }

  // ---------------------------- MAGAZZINO -----------------------------
  ids.categorie_prodotti = await insertMany(
    "categorie_prodotti",
    [
      "Elettronica",
      "Informatica",
      "Cancelleria",
      "Arredamento Ufficio",
      "Materiale di Consumo",
    ].map((nome) => ({
      nome,
      descrizione: `Prodotti della categoria ${nome}`,
    })),
  );

  ids.unita_misura = await insertMany("unita_misura", [
    { nome: "Pezzo", simbolo: "pz" },
    { nome: "Chilogrammo", simbolo: "kg" },
    { nome: "Litro", simbolo: "lt" },
    { nome: "Metro", simbolo: "mt" },
    { nome: "Confezione", simbolo: "conf" },
  ]);

  ids.magazzini = await insertMany("magazzini", [
    {
      nome: "Magazzino Centrale",
      indirizzo: "Via dell'Industria, 12 - Milano",
      responsabile: "Roberto Costa",
    },
    {
      nome: "Magazzino Nord",
      indirizzo: "Via Artigianato, 5 - Padova",
      responsabile: "Silvia Fontana",
    },
    {
      nome: "Magazzino Sud",
      indirizzo: "Zona Industriale, 34 - Bari",
      responsabile: "Davide Villa",
    },
  ]);

  const NOMI_PRODOTTI = [
    'Monitor 24" Full HD',
    "Notebook Pro 15",
    "Tastiera Meccanica",
    "Mouse Wireless",
    "Scrivania Regolabile",
    "Sedia Ergonomica",
    "Stampante Laser",
    "Toner Nero",
    "Risma Carta A4",
    "Faldone Archivio",
    "Lampada da Scrivania",
    "Armadio Metallico",
    "Router Wi-Fi 6",
    "Webcam HD",
    "Cuffie con Microfono",
  ];
  ids.prodotti = [];
  for (let i = 0; i < NOMI_PRODOTTI.length; i++) {
    const nome = NOMI_PRODOTTI[i];
    const prezzoAcquisto = randFloat(10, 500);
    ids.prodotti.push(
      await insert("prodotti", {
        codice: `PRD-${pad(i + 1, 4)}`,
        nome,
        descrizione: `${nome} - articolo standard di magazzino`,
        categoria_id: pickId(ids.categorie_prodotti),
        unita_misura_id: pickId(ids.unita_misura),
        prezzo_acquisto: prezzoAcquisto,
        prezzo_vendita: Number(
          (prezzoAcquisto * randFloat(1.3, 1.8)).toFixed(2),
        ),
        scorta_minima: randInt(5, 50),
      }),
    );
  }

  ids.giacenze = [];
  for (const prodottoId of ids.prodotti) {
    for (const magazzinoId of ids.magazzini) {
      if (Math.random() < 0.7) {
        ids.giacenze.push(
          await insert("giacenze", {
            prodotto_id: prodottoId,
            magazzino_id: magazzinoId,
            quantita: randInt(0, 300),
            ubicazione: `Scaffale ${pick(["A", "B", "C", "D"])}${randInt(1, 20)}`,
          }),
        );
      }
    }
  }

  ids.movimenti_magazzino = [];
  for (let i = 0; i < 20; i++) {
    ids.movimenti_magazzino.push(
      await insert("movimenti_magazzino", {
        prodotto_id: pickId(ids.prodotti),
        magazzino_id: pickId(ids.magazzini),
        tipo: pick(["carico", "scarico"]),
        quantita: randInt(1, 100),
        data_movimento: randDate(),
        note: "",
      }),
    );
  }

  ids.lotti = [];
  for (let i = 0; i < 10; i++) {
    ids.lotti.push(
      await insert("lotti", {
        prodotto_id: pickId(ids.prodotti),
        numero_lotto: `LOT-${randDate().slice(0, 4)}-${pad(i + 1, 3)}`,
        data_scadenza: randDate(2026, 2028),
        quantita: randInt(10, 200),
      }),
    );
  }

  ids.fornitori_prodotti = [];
  for (let i = 0; i < 15; i++) {
    ids.fornitori_prodotti.push(
      await insert("fornitori_prodotti", {
        fornitore_id: pickId(ids.fornitori),
        prodotto_id: pickId(ids.prodotti),
        prezzo: randFloat(10, 450),
        tempo_consegna_giorni: randInt(1, 30),
      }),
    );
  }

  ids.listini_prezzi = await insertMany("listini_prezzi", [
    {
      nome: "Listino Standard 2026",
      data_inizio: "2026-01-01",
      data_fine: "2026-12-31",
      sconto_percentuale: 0,
    },
    {
      nome: "Listino Rivenditori",
      data_inizio: "2026-01-01",
      data_fine: "2026-12-31",
      sconto_percentuale: 15,
    },
    {
      nome: "Listino Promozionale Estate",
      data_inizio: "2026-06-01",
      data_fine: "2026-08-31",
      sconto_percentuale: 10,
    },
  ]);

  // ------------------------------ VENDITE ------------------------------
  ids.preventivi = [];
  for (let i = 0; i < 8; i++) {
    ids.preventivi.push(
      await insert("preventivi", {
        numero: `PRV-2026-${pad(i + 1, 3)}`,
        cliente_id: pickId(ids.clienti),
        data_preventivo: randDate(),
        validita_giorni: pick([15, 30, 60]),
        stato: pick(["inviato", "accettato", "rifiutato"]),
        totale: randFloat(200, 8000),
      }),
    );
  }
  for (let i = 0; i < 15; i++) {
    await insert("preventivi_righe", {
      preventivo_id: pickId(ids.preventivi),
      prodotto_id: pickId(ids.prodotti),
      quantita: randInt(1, 20),
      prezzo_unitario: randFloat(10, 500),
    });
  }

  ids.ordini_vendita = [];
  for (let i = 0; i < 10; i++) {
    ids.ordini_vendita.push(
      await insert("ordini_vendita", {
        numero: `OV-2026-${pad(i + 1, 3)}`,
        cliente_id: pickId(ids.clienti),
        data_ordine: randDate(),
        stato: pick(["bozza", "confermato", "evaso", "annullato"]),
        totale: randFloat(200, 10000),
      }),
    );
  }
  for (let i = 0; i < 20; i++) {
    await insert("ordini_vendita_righe", {
      ordine_id: pickId(ids.ordini_vendita),
      prodotto_id: pickId(ids.prodotti),
      quantita: randInt(1, 25),
      prezzo_unitario: randFloat(10, 500),
    });
  }

  ids.ddt_vendita = [];
  for (let i = 0; i < 8; i++) {
    ids.ddt_vendita.push(
      await insert("ddt_vendita", {
        numero: `DDTV-2026-${pad(i + 1, 3)}`,
        cliente_id: pickId(ids.clienti),
        data_ddt: randDate(),
        causale: "Vendita",
      }),
    );
  }
  for (let i = 0; i < 15; i++) {
    await insert("ddt_vendita_righe", {
      ddt_id: pickId(ids.ddt_vendita),
      prodotto_id: pickId(ids.prodotti),
      quantita: randInt(1, 30),
    });
  }

  ids.fatture_vendita = [];
  for (let i = 0; i < 10; i++) {
    ids.fatture_vendita.push(
      await insert("fatture_vendita", {
        numero: `FTV-2026-${pad(i + 1, 3)}`,
        cliente_id: pickId(ids.clienti),
        data_fattura: randDate(),
        scadenza: randDate(2026, 2027),
        stato: pick(["da_pagare", "pagata", "scaduta"]),
        totale: randFloat(200, 12000),
      }),
    );
  }
  for (let i = 0; i < 20; i++) {
    await insert("fatture_vendita_righe", {
      fattura_id: pickId(ids.fatture_vendita),
      prodotto_id: pickId(ids.prodotti),
      quantita: randInt(1, 25),
      prezzo_unitario: randFloat(10, 500),
      iva_percentuale: pick([22, 10, 4]),
    });
  }

  // ------------------------------ ACQUISTI -----------------------------
  ids.ordini_acquisto = [];
  for (let i = 0; i < 8; i++) {
    ids.ordini_acquisto.push(
      await insert("ordini_acquisto", {
        numero: `OA-2026-${pad(i + 1, 3)}`,
        fornitore_id: pickId(ids.fornitori),
        data_ordine: randDate(),
        stato: pick(["bozza", "confermato", "ricevuto", "annullato"]),
        totale: randFloat(200, 9000),
      }),
    );
  }
  for (let i = 0; i < 15; i++) {
    await insert("ordini_acquisto_righe", {
      ordine_id: pickId(ids.ordini_acquisto),
      prodotto_id: pickId(ids.prodotti),
      quantita: randInt(5, 100),
      prezzo_unitario: randFloat(10, 400),
    });
  }

  ids.ddt_acquisto = [];
  for (let i = 0; i < 6; i++) {
    ids.ddt_acquisto.push(
      await insert("ddt_acquisto", {
        numero: `DDTA-2026-${pad(i + 1, 3)}`,
        fornitore_id: pickId(ids.fornitori),
        data_ddt: randDate(),
        causale: "Acquisto",
      }),
    );
  }

  ids.fatture_acquisto = [];
  for (let i = 0; i < 8; i++) {
    ids.fatture_acquisto.push(
      await insert("fatture_acquisto", {
        numero: `FTA-2026-${pad(i + 1, 3)}`,
        fornitore_id: pickId(ids.fornitori),
        data_fattura: randDate(),
        scadenza: randDate(2026, 2027),
        stato: pick(["da_pagare", "pagata", "scaduta"]),
        totale: randFloat(200, 9500),
      }),
    );
  }
  for (let i = 0; i < 15; i++) {
    await insert("fatture_acquisto_righe", {
      fattura_id: pickId(ids.fatture_acquisto),
      prodotto_id: pickId(ids.prodotti),
      quantita: randInt(5, 100),
      prezzo_unitario: randFloat(10, 400),
    });
  }

  // ---------------------------- CONTABILITA' ---------------------------
  ids.iva_aliquote = await insertMany("iva_aliquote", [
    { descrizione: "IVA Ordinaria", percentuale: 22 },
    { descrizione: "IVA Ridotta", percentuale: 10 },
    { descrizione: "IVA Minima", percentuale: 4 },
    { descrizione: "Esente IVA", percentuale: 0 },
  ]);

  ids.piano_conti = await insertMany("piano_conti", [
    { codice: "100", descrizione: "Cassa", tipo: "attivo" },
    { codice: "110", descrizione: "Banca c/c", tipo: "attivo" },
    { codice: "200", descrizione: "Debiti v/fornitori", tipo: "passivo" },
    { codice: "210", descrizione: "Crediti v/clienti", tipo: "attivo" },
    { codice: "300", descrizione: "Ricavi da vendite", tipo: "ricavo" },
    { codice: "310", descrizione: "Ricavi da servizi", tipo: "ricavo" },
    { codice: "400", descrizione: "Costi per acquisti", tipo: "costo" },
    { codice: "410", descrizione: "Costi del personale", tipo: "costo" },
  ]);

  ids.conti_bancari = await insertMany("conti_bancari", [
    {
      nome: "Conto Corrente Principale",
      iban: iban(),
      banca: "Intesa Sanpaolo",
      saldo: randFloat(5000, 80000),
    },
    {
      nome: "Conto Corrente Secondario",
      iban: iban(),
      banca: "UniCredit",
      saldo: randFloat(1000, 30000),
    },
    {
      nome: "Conto Deposito",
      iban: iban(),
      banca: "BPER Banca",
      saldo: randFloat(10000, 100000),
    },
  ]);

  for (let i = 0; i < 15; i++) {
    await insert("movimenti_bancari", {
      conto_id: pickId(ids.conti_bancari),
      data_movimento: randDate(),
      importo: randFloat(50, 5000),
      tipo: pick(["entrata", "uscita"]),
      descrizione: pick([
        "Incasso fattura",
        "Pagamento fornitore",
        "Bonifico stipendi",
        "Spese bancarie",
        "Incasso cliente",
      ]),
    });
  }

  for (let i = 0; i < 15; i++) {
    await insert("pagamenti", {
      tipo: pick(["entrata", "uscita"]),
      importo: randFloat(50, 6000),
      data_pagamento: randDate(),
      metodo: pick(["bonifico", "contanti", "assegno", "carta"]),
      cliente_id: Math.random() < 0.5 ? pickId(ids.clienti) : null,
      fornitore_id: Math.random() < 0.5 ? pickId(ids.fornitori) : null,
      note: "",
    });
  }

  for (let i = 0; i < 10; i++) {
    await insert("scadenze", {
      descrizione: pick([
        "Saldo fattura vendita",
        "Saldo fattura acquisto",
        "Rata leasing",
        "Canone affitto",
      ]),
      data_scadenza: randDate(2026, 2027),
      importo: randFloat(100, 5000),
      stato: pick(["aperta", "saldata"]),
      cliente_id: Math.random() < 0.5 ? pickId(ids.clienti) : null,
      fornitore_id: Math.random() < 0.5 ? pickId(ids.fornitori) : null,
    });
  }

  for (let i = 0; i < 4; i++) {
    await insert("note_credito", {
      numero: `NC-2026-${pad(i + 1, 3)}`,
      cliente_id: pickId(ids.clienti),
      data_nota: randDate(),
      importo: randFloat(50, 1500),
      motivo: pick([
        "Reso merce",
        "Errore di fatturazione",
        "Sconto commerciale concordato",
      ]),
    });
  }

  // --------------------------- RISORSE UMANE ---------------------------
  ids.dipartimenti = await insertMany("dipartimenti", [
    { nome: "Amministrazione", responsabile: "Elena Marino" },
    { nome: "Vendite", responsabile: "Matteo Greco" },
    { nome: "Acquisti", responsabile: "Chiara Bruno" },
    { nome: "Magazzino", responsabile: "Roberto Costa" },
    { nome: "IT", responsabile: "Simone Gallo" },
  ]);

  ids.ruoli = await insertMany("ruoli", [
    { nome: "Impiegato", descrizione: "Mansioni amministrative" },
    { nome: "Responsabile", descrizione: "Gestione di un reparto o team" },
    {
      nome: "Operaio",
      descrizione: "Attività operative di magazzino/produzione",
    },
    { nome: "Tecnico", descrizione: "Supporto tecnico specialistico" },
    { nome: "Manager", descrizione: "Coordinamento di piu' team" },
    { nome: "Direttore", descrizione: "Direzione aziendale" },
  ]);

  ids.dipendenti = [];
  const usedNames = new Set();
  for (let i = 0; i < 12; i++) {
    let nome, cognome, key;
    do {
      nome = pick(NOMI);
      cognome = pick(COGNOMI);
      key = `${nome} ${cognome}`;
    } while (usedNames.has(key));
    usedNames.add(key);
    ids.dipendenti.push(
      await insert("dipendenti", {
        nome,
        cognome,
        email: emailFrom(`${nome}.${cognome}`),
        telefono: cellulare(),
        dipartimento_id: pickId(ids.dipartimenti),
        ruolo_id: pickId(ids.ruoli),
        data_assunzione: randDate(2018, 2025),
        stipendio: randFloat(1400, 4500),
      }),
    );
  }

  for (const dipendenteId of ids.dipendenti) {
    await insert("contratti", {
      dipendente_id: dipendenteId,
      tipo_contratto: pick(["indeterminato", "determinato", "apprendistato"]),
      data_inizio: randDate(2018, 2025),
      data_fine: Math.random() < 0.3 ? randDate(2026, 2027) : null,
    });
  }

  for (let i = 0; i < 20; i++) {
    await insert("presenze", {
      dipendente_id: pickId(ids.dipendenti),
      data: randDate(),
      ore_lavorate: pick([0, 4, 8]),
      tipo: pick(["presente", "malattia", "ferie", "permesso"]),
    });
  }

  for (let i = 0; i < 10; i++) {
    const inizio = randDate();
    await insert("ferie_permessi", {
      dipendente_id: pickId(ids.dipendenti),
      tipo: pick(["ferie", "permesso"]),
      data_inizio: inizio,
      data_fine: inizio,
      stato: pick(["richiesto", "approvato", "rifiutato"]),
    });
  }

  // ------------------------------- CRM ----------------------------------
  ids.opportunita = [];
  for (let i = 0; i < 8; i++) {
    ids.opportunita.push(
      await insert("opportunita", {
        nome: `Fornitura ${pick(NOMI_PRODOTTI)} - ${pick(SETTORI)}`,
        cliente_id: pickId(ids.clienti),
        valore_stimato: randFloat(500, 15000),
        stato: pick(["aperta", "vinta", "persa"]),
        data_chiusura_prevista: randDate(2026, 2027),
      }),
    );
  }

  for (let i = 0; i < 15; i++) {
    await insert("attivita_crm", {
      tipo: pick(["chiamata", "email", "riunione", "visita"]),
      data_attivita: randDate(),
      cliente_id: pickId(ids.clienti),
      descrizione: pick([
        "Presentazione nuovo catalogo prodotti",
        "Follow-up preventivo inviato",
        "Richiesta informazioni su disponibilità",
        "Negoziazione condizioni commerciali",
        "Verifica soddisfazione post-vendita",
      ]),
      esito: pick([
        "Positivo",
        "Da ricontattare",
        "Nessuna risposta",
        "Interessato",
      ]),
    });
  }

  for (let i = 0; i < 8; i++) {
    await insert("trattative", {
      opportunita_id: pickId(ids.opportunita),
      fase: pick(["qualifica", "proposta", "negoziazione", "chiusura"]),
      probabilita: randInt(10, 90),
      note: "",
    });
  }

  // ----------------------------- PROGETTI --------------------------------
  const NOMI_PROGETTI = [
    "Rinnovo Parco Informatico",
    "Ristrutturazione Ufficio Vendite",
    "Migrazione Gestionale",
    "Espansione Magazzino Nord",
    "Campagna Marketing 2026",
    "Automazione Processi Interni",
  ];
  ids.progetti = [];
  for (let i = 0; i < NOMI_PROGETTI.length; i++) {
    ids.progetti.push(
      await insert("progetti", {
        nome: NOMI_PROGETTI[i],
        cliente_id: Math.random() < 0.6 ? pickId(ids.clienti) : null,
        data_inizio: randDate(2025, 2026),
        data_fine: randDate(2026, 2027),
        stato: pick(["pianificato", "in_corso", "completato", "sospeso"]),
        budget: randFloat(2000, 50000),
      }),
    );
  }

  ids.task = [];
  const TITOLI_TASK = [
    "Analisi requisiti",
    "Sviluppo componente",
    "Test funzionale",
    "Revisione documentazione",
    "Formazione utenti",
    "Deploy in produzione",
    "Raccolta feedback cliente",
    "Ottimizzazione performance",
  ];
  for (let i = 0; i < 15; i++) {
    ids.task.push(
      await insert("task", {
        progetto_id: pickId(ids.progetti),
        titolo: pick(TITOLI_TASK),
        descrizione: "",
        stato: pick(["da_fare", "in_corso", "completato"]),
        scadenza: randDate(2026, 2027),
        priorita: pick(["bassa", "media", "alta"]),
      }),
    );
  }

  for (let i = 0; i < 15; i++) {
    await insert("task_assegnazioni", {
      task_id: pickId(ids.task),
      dipendente_id: pickId(ids.dipendenti),
      data_assegnazione: randDate(),
    });
  }

  for (let i = 0; i < 20; i++) {
    await insert("time_tracking", {
      task_id: pickId(ids.task),
      dipendente_id: pickId(ids.dipendenti),
      data: randDate(),
      ore: randFloat(0.5, 8, 1),
      note: "",
    });
  }

  // ------------------------------ SISTEMA ---------------------------------
  ids.utenti = await insertMany("utenti", [
    {
      username: "admin",
      email: "admin@example.com",
      password_hash: "hash_admin_demo",
      ruolo: "admin",
      attivo: 1,
    },
    {
      username: "operatore1",
      email: "operatore1@example.com",
      password_hash: "hash_op1_demo",
      ruolo: "operatore",
      attivo: 1,
    },
    {
      username: "operatore2",
      email: "operatore2@example.com",
      password_hash: "hash_op2_demo",
      ruolo: "operatore",
      attivo: 1,
    },
    {
      username: "supervisore",
      email: "supervisore@example.com",
      password_hash: "hash_sup_demo",
      ruolo: "visualizzatore",
      attivo: 0,
    },
  ]);

  await insertMany("impostazioni", [
    { chiave: "nome_azienda", valore: "Gestionale Demo Srl" },
    { chiave: "valuta", valore: "EUR" },
    { chiave: "aliquota_iva_default", valore: "22" },
    { chiave: "formato_data", valore: "DD/MM/YYYY" },
    { chiave: "lingua", valore: "it" },
  ]);

  for (let i = 0; i < 8; i++) {
    await insert("notifiche", {
      utente_id: pickId(ids.utenti),
      messaggio: pick([
        "Nuovo ordine di vendita ricevuto",
        "Scorta minima raggiunta per un prodotto",
        "Fattura in scadenza tra 3 giorni",
        "Nuova richiesta ferie da approvare",
        "Task assegnato in scadenza oggi",
      ]),
      letto: Math.random() < 0.5 ? 1 : 0,
      data_creazione: randDateTime(),
    });
  }

  for (let i = 0; i < 10; i++) {
    await insert("log_attivita", {
      utente_id: pickId(ids.utenti),
      azione: pick(["CREATE", "UPDATE", "DELETE", "LOGIN"]),
      tabella: pick([
        "clienti",
        "prodotti",
        "ordini_vendita",
        "fatture_vendita",
        "dipendenti",
      ]),
      data_azione: randDateTime(),
      dettagli: "",
    });
  }

  console.log("Seed completato: dati di esempio inseriti in tutte le tabelle.");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  await initDatabase();

  if (process.argv.includes("--reset")) {
    await resetAllTables();
  }

  await seed();
  db.close();
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Errore durante il seed:", err);
    process.exit(1);
  });
}

module.exports = { seed, resetAllTables };
