/**
 * SCHEMA CENTRALE DEL GESTIONALE
 * ==============================
 * Ogni tabella e' definita qui una sola volta: da questo file vengono generati
 * automaticamente lo schema SQLite (db/init.js), le API REST generiche
 * (routes/api.js) e l'interfaccia frontend (public/js/app.js).
 *
 * Tipi di campo supportati:
 *  - text        -> input testo singola riga
 *  - textarea    -> area di testo multi riga
 *  - number      -> input numerico
 *  - date        -> input data (YYYY-MM-DD)
 *  - datetime    -> data e ora, gestita automaticamente (non editabile a mano)
 *  - boolean     -> checkbox (0/1)
 *  - select      -> menu a tendina con valori fissi (options)
 *  - fk          -> riferimento a un'altra tabella (menu a tendina dinamico)
 *
 * Ogni tabella riceve automaticamente: id (PK), created_at, updated_at.
 */

const GROUPS = [
  { id: "anagrafiche", label: "Anagrafiche", icon: "users" },
  { id: "magazzino", label: "Magazzino", icon: "box" },
  { id: "vendite", label: "Vendite", icon: "trending-up" },
  { id: "acquisti", label: "Acquisti", icon: "shopping-cart" },
  { id: "contabilita", label: "Contabilità", icon: "euro" },
  { id: "hr", label: "Risorse Umane", icon: "briefcase" },
  { id: "crm", label: "CRM", icon: "phone-call" },
  { id: "progetti", label: "Progetti", icon: "layout" },
  { id: "sistema", label: "Sistema", icon: "settings" },
];

const TABLES = [
  // ============================= ANAGRAFICHE =============================
  {
    name: "categorie_clienti",
    label: "Categorie Clienti",
    group: "anagrafiche",
    labelField: "nome",
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "descrizione", label: "Descrizione", type: "textarea" },
    ],
  },
  {
    name: "clienti",
    label: "Clienti",
    group: "anagrafiche",
    labelField: "ragione_sociale",
    fields: [
      {
        name: "ragione_sociale",
        label: "Ragione Sociale",
        type: "text",
        required: true,
      },
      { name: "partita_iva", label: "Partita IVA", type: "text" },
      { name: "codice_fiscale", label: "Codice Fiscale", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "telefono", label: "Telefono", type: "text" },
      { name: "indirizzo", label: "Indirizzo", type: "text" },
      { name: "citta", label: "Città", type: "text" },
      { name: "cap", label: "CAP", type: "text" },
      {
        name: "categoria_id",
        label: "Categoria",
        type: "fk",
        fk: "categorie_clienti",
      },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },
  {
    name: "fornitori",
    label: "Fornitori",
    group: "anagrafiche",
    labelField: "ragione_sociale",
    fields: [
      {
        name: "ragione_sociale",
        label: "Ragione Sociale",
        type: "text",
        required: true,
      },
      { name: "partita_iva", label: "Partita IVA", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "telefono", label: "Telefono", type: "text" },
      { name: "indirizzo", label: "Indirizzo", type: "text" },
      { name: "citta", label: "Città", type: "text" },
      { name: "cap", label: "CAP", type: "text" },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },
  {
    name: "contatti",
    label: "Contatti",
    group: "anagrafiche",
    labelField: "nome",
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "cognome", label: "Cognome", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "telefono", label: "Telefono", type: "text" },
      { name: "cliente_id", label: "Cliente", type: "fk", fk: "clienti" },
      { name: "ruolo", label: "Ruolo", type: "text" },
    ],
  },

  // ============================== MAGAZZINO ===============================
  {
    name: "categorie_prodotti",
    label: "Categorie Prodotti",
    group: "magazzino",
    labelField: "nome",
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "descrizione", label: "Descrizione", type: "textarea" },
    ],
  },
  {
    name: "unita_misura",
    label: "Unità di Misura",
    group: "magazzino",
    labelField: "nome",
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "simbolo", label: "Simbolo", type: "text", required: true },
    ],
  },
  {
    name: "magazzini",
    label: "Magazzini",
    group: "magazzino",
    labelField: "nome",
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "indirizzo", label: "Indirizzo", type: "text" },
      { name: "responsabile", label: "Responsabile", type: "text" },
    ],
  },
  {
    name: "prodotti",
    label: "Prodotti",
    group: "magazzino",
    labelField: "nome",
    fields: [
      { name: "codice", label: "Codice", type: "text", required: true },
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "descrizione", label: "Descrizione", type: "textarea" },
      {
        name: "categoria_id",
        label: "Categoria",
        type: "fk",
        fk: "categorie_prodotti",
      },
      {
        name: "unita_misura_id",
        label: "Unità di Misura",
        type: "fk",
        fk: "unita_misura",
      },
      { name: "prezzo_acquisto", label: "Prezzo Acquisto", type: "number" },
      { name: "prezzo_vendita", label: "Prezzo Vendita", type: "number" },
      { name: "scorta_minima", label: "Scorta Minima", type: "number" },
    ],
  },
  {
    name: "giacenze",
    label: "Giacenze",
    group: "magazzino",
    labelField: "id",
    fields: [
      {
        name: "prodotto_id",
        label: "Prodotto",
        type: "fk",
        fk: "prodotti",
        required: true,
      },
      {
        name: "magazzino_id",
        label: "Magazzino",
        type: "fk",
        fk: "magazzini",
        required: true,
      },
      { name: "quantita", label: "Quantità", type: "number", required: true },
      { name: "ubicazione", label: "Ubicazione", type: "text" },
    ],
  },
  {
    name: "movimenti_magazzino",
    label: "Movimenti Magazzino",
    group: "magazzino",
    labelField: "id",
    fields: [
      {
        name: "prodotto_id",
        label: "Prodotto",
        type: "fk",
        fk: "prodotti",
        required: true,
      },
      {
        name: "magazzino_id",
        label: "Magazzino",
        type: "fk",
        fk: "magazzini",
        required: true,
      },
      {
        name: "tipo",
        label: "Tipo",
        type: "select",
        options: ["carico", "scarico"],
        required: true,
      },
      { name: "quantita", label: "Quantità", type: "number", required: true },
      {
        name: "data_movimento",
        label: "Data Movimento",
        type: "date",
        required: true,
      },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },
  {
    name: "lotti",
    label: "Lotti",
    group: "magazzino",
    labelField: "numero_lotto",
    fields: [
      {
        name: "prodotto_id",
        label: "Prodotto",
        type: "fk",
        fk: "prodotti",
        required: true,
      },
      {
        name: "numero_lotto",
        label: "Numero Lotto",
        type: "text",
        required: true,
      },
      { name: "data_scadenza", label: "Data Scadenza", type: "date" },
      { name: "quantita", label: "Quantità", type: "number" },
    ],
  },
  {
    name: "fornitori_prodotti",
    label: "Prodotti per Fornitore",
    group: "magazzino",
    labelField: "id",
    fields: [
      {
        name: "fornitore_id",
        label: "Fornitore",
        type: "fk",
        fk: "fornitori",
        required: true,
      },
      {
        name: "prodotto_id",
        label: "Prodotto",
        type: "fk",
        fk: "prodotti",
        required: true,
      },
      { name: "prezzo", label: "Prezzo", type: "number" },
      {
        name: "tempo_consegna_giorni",
        label: "Tempo Consegna (giorni)",
        type: "number",
      },
    ],
  },
  {
    name: "listini_prezzi",
    label: "Listini Prezzi",
    group: "magazzino",
    labelField: "nome",
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "data_inizio", label: "Data Inizio", type: "date" },
      { name: "data_fine", label: "Data Fine", type: "date" },
      { name: "sconto_percentuale", label: "Sconto %", type: "number" },
    ],
  },

  // =============================== VENDITE ================================
  {
    name: "preventivi",
    label: "Preventivi",
    group: "vendite",
    labelField: "numero",
    fields: [
      { name: "numero", label: "Numero", type: "text", required: true },
      {
        name: "cliente_id",
        label: "Cliente",
        type: "fk",
        fk: "clienti",
        required: true,
      },
      { name: "data_preventivo", label: "Data", type: "date", required: true },
      { name: "validita_giorni", label: "Validità (giorni)", type: "number" },
      {
        name: "stato",
        label: "Stato",
        type: "select",
        options: ["inviato", "accettato", "rifiutato"],
      },
      { name: "totale", label: "Totale", type: "number" },
    ],
  },
  {
    name: "preventivi_righe",
    label: "Righe Preventivo",
    group: "vendite",
    labelField: "id",
    fields: [
      {
        name: "preventivo_id",
        label: "Preventivo",
        type: "fk",
        fk: "preventivi",
        required: true,
      },
      {
        name: "prodotto_id",
        label: "Prodotto",
        type: "fk",
        fk: "prodotti",
        required: true,
      },
      { name: "quantita", label: "Quantità", type: "number", required: true },
      {
        name: "prezzo_unitario",
        label: "Prezzo Unitario",
        type: "number",
        required: true,
      },
    ],
  },
  {
    name: "ordini_vendita",
    label: "Ordini di Vendita",
    group: "vendite",
    labelField: "numero",
    fields: [
      { name: "numero", label: "Numero", type: "text", required: true },
      {
        name: "cliente_id",
        label: "Cliente",
        type: "fk",
        fk: "clienti",
        required: true,
      },
      {
        name: "data_ordine",
        label: "Data Ordine",
        type: "date",
        required: true,
      },
      {
        name: "stato",
        label: "Stato",
        type: "select",
        options: ["bozza", "confermato", "evaso", "annullato"],
      },
      { name: "totale", label: "Totale", type: "number" },
    ],
  },
  {
    name: "ordini_vendita_righe",
    label: "Righe Ordine Vendita",
    group: "vendite",
    labelField: "id",
    fields: [
      {
        name: "ordine_id",
        label: "Ordine",
        type: "fk",
        fk: "ordini_vendita",
        required: true,
      },
      {
        name: "prodotto_id",
        label: "Prodotto",
        type: "fk",
        fk: "prodotti",
        required: true,
      },
      { name: "quantita", label: "Quantità", type: "number", required: true },
      {
        name: "prezzo_unitario",
        label: "Prezzo Unitario",
        type: "number",
        required: true,
      },
    ],
  },
  {
    name: "ddt_vendita",
    label: "DDT Vendita",
    group: "vendite",
    labelField: "numero",
    fields: [
      { name: "numero", label: "Numero", type: "text", required: true },
      {
        name: "cliente_id",
        label: "Cliente",
        type: "fk",
        fk: "clienti",
        required: true,
      },
      { name: "data_ddt", label: "Data", type: "date", required: true },
      { name: "causale", label: "Causale", type: "text" },
    ],
  },
  {
    name: "ddt_vendita_righe",
    label: "Righe DDT Vendita",
    group: "vendite",
    labelField: "id",
    fields: [
      {
        name: "ddt_id",
        label: "DDT",
        type: "fk",
        fk: "ddt_vendita",
        required: true,
      },
      {
        name: "prodotto_id",
        label: "Prodotto",
        type: "fk",
        fk: "prodotti",
        required: true,
      },
      { name: "quantita", label: "Quantità", type: "number", required: true },
    ],
  },
  {
    name: "fatture_vendita",
    label: "Fatture Vendita",
    group: "vendite",
    labelField: "numero",
    fields: [
      { name: "numero", label: "Numero", type: "text", required: true },
      {
        name: "cliente_id",
        label: "Cliente",
        type: "fk",
        fk: "clienti",
        required: true,
      },
      {
        name: "data_fattura",
        label: "Data Fattura",
        type: "date",
        required: true,
      },
      { name: "scadenza", label: "Scadenza", type: "date" },
      {
        name: "stato",
        label: "Stato",
        type: "select",
        options: ["da_pagare", "pagata", "scaduta"],
      },
      { name: "totale", label: "Totale", type: "number" },
    ],
  },
  {
    name: "fatture_vendita_righe",
    label: "Righe Fattura Vendita",
    group: "vendite",
    labelField: "id",
    fields: [
      {
        name: "fattura_id",
        label: "Fattura",
        type: "fk",
        fk: "fatture_vendita",
        required: true,
      },
      {
        name: "prodotto_id",
        label: "Prodotto",
        type: "fk",
        fk: "prodotti",
        required: true,
      },
      { name: "quantita", label: "Quantità", type: "number", required: true },
      {
        name: "prezzo_unitario",
        label: "Prezzo Unitario",
        type: "number",
        required: true,
      },
      { name: "iva_percentuale", label: "IVA %", type: "number" },
    ],
  },

  // =============================== ACQUISTI ===============================
  {
    name: "ordini_acquisto",
    label: "Ordini di Acquisto",
    group: "acquisti",
    labelField: "numero",
    fields: [
      { name: "numero", label: "Numero", type: "text", required: true },
      {
        name: "fornitore_id",
        label: "Fornitore",
        type: "fk",
        fk: "fornitori",
        required: true,
      },
      {
        name: "data_ordine",
        label: "Data Ordine",
        type: "date",
        required: true,
      },
      {
        name: "stato",
        label: "Stato",
        type: "select",
        options: ["bozza", "confermato", "ricevuto", "annullato"],
      },
      { name: "totale", label: "Totale", type: "number" },
    ],
  },
  {
    name: "ordini_acquisto_righe",
    label: "Righe Ordine Acquisto",
    group: "acquisti",
    labelField: "id",
    fields: [
      {
        name: "ordine_id",
        label: "Ordine",
        type: "fk",
        fk: "ordini_acquisto",
        required: true,
      },
      {
        name: "prodotto_id",
        label: "Prodotto",
        type: "fk",
        fk: "prodotti",
        required: true,
      },
      { name: "quantita", label: "Quantità", type: "number", required: true },
      {
        name: "prezzo_unitario",
        label: "Prezzo Unitario",
        type: "number",
        required: true,
      },
    ],
  },
  {
    name: "ddt_acquisto",
    label: "DDT Acquisto",
    group: "acquisti",
    labelField: "numero",
    fields: [
      { name: "numero", label: "Numero", type: "text", required: true },
      {
        name: "fornitore_id",
        label: "Fornitore",
        type: "fk",
        fk: "fornitori",
        required: true,
      },
      { name: "data_ddt", label: "Data", type: "date", required: true },
      { name: "causale", label: "Causale", type: "text" },
    ],
  },
  {
    name: "fatture_acquisto",
    label: "Fatture Acquisto",
    group: "acquisti",
    labelField: "numero",
    fields: [
      { name: "numero", label: "Numero", type: "text", required: true },
      {
        name: "fornitore_id",
        label: "Fornitore",
        type: "fk",
        fk: "fornitori",
        required: true,
      },
      {
        name: "data_fattura",
        label: "Data Fattura",
        type: "date",
        required: true,
      },
      { name: "scadenza", label: "Scadenza", type: "date" },
      {
        name: "stato",
        label: "Stato",
        type: "select",
        options: ["da_pagare", "pagata", "scaduta"],
      },
      { name: "totale", label: "Totale", type: "number" },
    ],
  },
  {
    name: "fatture_acquisto_righe",
    label: "Righe Fattura Acquisto",
    group: "acquisti",
    labelField: "id",
    fields: [
      {
        name: "fattura_id",
        label: "Fattura",
        type: "fk",
        fk: "fatture_acquisto",
        required: true,
      },
      {
        name: "prodotto_id",
        label: "Prodotto",
        type: "fk",
        fk: "prodotti",
        required: true,
      },
      { name: "quantita", label: "Quantità", type: "number", required: true },
      {
        name: "prezzo_unitario",
        label: "Prezzo Unitario",
        type: "number",
        required: true,
      },
    ],
  },

  // ============================= CONTABILITA' =============================
  {
    name: "iva_aliquote",
    label: "Aliquote IVA",
    group: "contabilita",
    labelField: "descrizione",
    fields: [
      {
        name: "descrizione",
        label: "Descrizione",
        type: "text",
        required: true,
      },
      {
        name: "percentuale",
        label: "Percentuale",
        type: "number",
        required: true,
      },
    ],
  },
  {
    name: "piano_conti",
    label: "Piano dei Conti",
    group: "contabilita",
    labelField: "descrizione",
    fields: [
      { name: "codice", label: "Codice", type: "text", required: true },
      {
        name: "descrizione",
        label: "Descrizione",
        type: "text",
        required: true,
      },
      {
        name: "tipo",
        label: "Tipo",
        type: "select",
        options: ["attivo", "passivo", "costo", "ricavo"],
      },
    ],
  },
  {
    name: "conti_bancari",
    label: "Conti Bancari",
    group: "contabilita",
    labelField: "nome",
    fields: [
      { name: "nome", label: "Nome Conto", type: "text", required: true },
      { name: "iban", label: "IBAN", type: "text" },
      { name: "banca", label: "Banca", type: "text" },
      { name: "saldo", label: "Saldo", type: "number" },
    ],
  },
  {
    name: "movimenti_bancari",
    label: "Movimenti Bancari",
    group: "contabilita",
    labelField: "id",
    fields: [
      {
        name: "conto_id",
        label: "Conto",
        type: "fk",
        fk: "conti_bancari",
        required: true,
      },
      { name: "data_movimento", label: "Data", type: "date", required: true },
      { name: "importo", label: "Importo", type: "number", required: true },
      {
        name: "tipo",
        label: "Tipo",
        type: "select",
        options: ["entrata", "uscita"],
      },
      { name: "descrizione", label: "Descrizione", type: "text" },
    ],
  },
  {
    name: "pagamenti",
    label: "Pagamenti",
    group: "contabilita",
    labelField: "id",
    fields: [
      {
        name: "tipo",
        label: "Tipo",
        type: "select",
        options: ["entrata", "uscita"],
        required: true,
      },
      { name: "importo", label: "Importo", type: "number", required: true },
      { name: "data_pagamento", label: "Data", type: "date", required: true },
      {
        name: "metodo",
        label: "Metodo",
        type: "select",
        options: ["bonifico", "contanti", "assegno", "carta"],
      },
      { name: "cliente_id", label: "Cliente", type: "fk", fk: "clienti" },
      { name: "fornitore_id", label: "Fornitore", type: "fk", fk: "fornitori" },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },
  {
    name: "scadenze",
    label: "Scadenze",
    group: "contabilita",
    labelField: "descrizione",
    fields: [
      {
        name: "descrizione",
        label: "Descrizione",
        type: "text",
        required: true,
      },
      {
        name: "data_scadenza",
        label: "Data Scadenza",
        type: "date",
        required: true,
      },
      { name: "importo", label: "Importo", type: "number", required: true },
      {
        name: "stato",
        label: "Stato",
        type: "select",
        options: ["aperta", "saldata"],
      },
      { name: "cliente_id", label: "Cliente", type: "fk", fk: "clienti" },
      { name: "fornitore_id", label: "Fornitore", type: "fk", fk: "fornitori" },
    ],
  },
  {
    name: "note_credito",
    label: "Note di Credito",
    group: "contabilita",
    labelField: "numero",
    fields: [
      { name: "numero", label: "Numero", type: "text", required: true },
      {
        name: "cliente_id",
        label: "Cliente",
        type: "fk",
        fk: "clienti",
        required: true,
      },
      { name: "data_nota", label: "Data", type: "date", required: true },
      { name: "importo", label: "Importo", type: "number", required: true },
      { name: "motivo", label: "Motivo", type: "textarea" },
    ],
  },

  // ============================ RISORSE UMANE =============================
  {
    name: "dipartimenti",
    label: "Dipartimenti",
    group: "hr",
    labelField: "nome",
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "responsabile", label: "Responsabile", type: "text" },
    ],
  },
  {
    name: "ruoli",
    label: "Ruoli",
    group: "hr",
    labelField: "nome",
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "descrizione", label: "Descrizione", type: "textarea" },
    ],
  },
  {
    name: "dipendenti",
    label: "Dipendenti",
    group: "hr",
    labelField: "nome",
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "cognome", label: "Cognome", type: "text", required: true },
      { name: "email", label: "Email", type: "text" },
      { name: "telefono", label: "Telefono", type: "text" },
      {
        name: "dipartimento_id",
        label: "Dipartimento",
        type: "fk",
        fk: "dipartimenti",
      },
      { name: "ruolo_id", label: "Ruolo", type: "fk", fk: "ruoli" },
      { name: "data_assunzione", label: "Data Assunzione", type: "date" },
      { name: "stipendio", label: "Stipendio", type: "number" },
    ],
  },
  {
    name: "contratti",
    label: "Contratti",
    group: "hr",
    labelField: "id",
    fields: [
      {
        name: "dipendente_id",
        label: "Dipendente",
        type: "fk",
        fk: "dipendenti",
        required: true,
      },
      {
        name: "tipo_contratto",
        label: "Tipo Contratto",
        type: "select",
        options: ["indeterminato", "determinato", "apprendistato"],
      },
      {
        name: "data_inizio",
        label: "Data Inizio",
        type: "date",
        required: true,
      },
      { name: "data_fine", label: "Data Fine", type: "date" },
    ],
  },
  {
    name: "presenze",
    label: "Presenze",
    group: "hr",
    labelField: "id",
    fields: [
      {
        name: "dipendente_id",
        label: "Dipendente",
        type: "fk",
        fk: "dipendenti",
        required: true,
      },
      { name: "data", label: "Data", type: "date", required: true },
      { name: "ore_lavorate", label: "Ore Lavorate", type: "number" },
      {
        name: "tipo",
        label: "Tipo",
        type: "select",
        options: ["presente", "malattia", "ferie", "permesso"],
      },
    ],
  },
  {
    name: "ferie_permessi",
    label: "Ferie e Permessi",
    group: "hr",
    labelField: "id",
    fields: [
      {
        name: "dipendente_id",
        label: "Dipendente",
        type: "fk",
        fk: "dipendenti",
        required: true,
      },
      {
        name: "tipo",
        label: "Tipo",
        type: "select",
        options: ["ferie", "permesso"],
        required: true,
      },
      {
        name: "data_inizio",
        label: "Data Inizio",
        type: "date",
        required: true,
      },
      { name: "data_fine", label: "Data Fine", type: "date", required: true },
      {
        name: "stato",
        label: "Stato",
        type: "select",
        options: ["richiesto", "approvato", "rifiutato"],
      },
    ],
  },

  // =================================== CRM =================================
  {
    name: "opportunita",
    label: "Opportunità",
    group: "crm",
    labelField: "nome",
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "cliente_id", label: "Cliente", type: "fk", fk: "clienti" },
      { name: "valore_stimato", label: "Valore Stimato", type: "number" },
      {
        name: "stato",
        label: "Stato",
        type: "select",
        options: ["aperta", "vinta", "persa"],
      },
      {
        name: "data_chiusura_prevista",
        label: "Chiusura Prevista",
        type: "date",
      },
    ],
  },
  {
    name: "attivita_crm",
    label: "Attività CRM",
    group: "crm",
    labelField: "id",
    fields: [
      {
        name: "tipo",
        label: "Tipo",
        type: "select",
        options: ["chiamata", "email", "riunione", "visita"],
        required: true,
      },
      { name: "data_attivita", label: "Data", type: "date", required: true },
      { name: "cliente_id", label: "Cliente", type: "fk", fk: "clienti" },
      { name: "descrizione", label: "Descrizione", type: "textarea" },
      { name: "esito", label: "Esito", type: "text" },
    ],
  },
  {
    name: "trattative",
    label: "Trattative",
    group: "crm",
    labelField: "id",
    fields: [
      {
        name: "opportunita_id",
        label: "Opportunità",
        type: "fk",
        fk: "opportunita",
        required: true,
      },
      {
        name: "fase",
        label: "Fase",
        type: "select",
        options: ["qualifica", "proposta", "negoziazione", "chiusura"],
      },
      { name: "probabilita", label: "Probabilità %", type: "number" },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },

  // ================================ PROGETTI ===============================
  {
    name: "progetti",
    label: "Progetti",
    group: "progetti",
    labelField: "nome",
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "cliente_id", label: "Cliente", type: "fk", fk: "clienti" },
      { name: "data_inizio", label: "Data Inizio", type: "date" },
      { name: "data_fine", label: "Data Fine", type: "date" },
      {
        name: "stato",
        label: "Stato",
        type: "select",
        options: ["pianificato", "in_corso", "completato", "sospeso"],
      },
      { name: "budget", label: "Budget", type: "number" },
    ],
  },
  {
    name: "task",
    label: "Task",
    group: "progetti",
    labelField: "titolo",
    fields: [
      {
        name: "progetto_id",
        label: "Progetto",
        type: "fk",
        fk: "progetti",
        required: true,
      },
      { name: "titolo", label: "Titolo", type: "text", required: true },
      { name: "descrizione", label: "Descrizione", type: "textarea" },
      {
        name: "stato",
        label: "Stato",
        type: "select",
        options: ["da_fare", "in_corso", "completato"],
      },
      { name: "scadenza", label: "Scadenza", type: "date" },
      {
        name: "priorita",
        label: "Priorità",
        type: "select",
        options: ["bassa", "media", "alta"],
      },
    ],
  },
  {
    name: "task_assegnazioni",
    label: "Assegnazioni Task",
    group: "progetti",
    labelField: "id",
    fields: [
      {
        name: "task_id",
        label: "Task",
        type: "fk",
        fk: "task",
        required: true,
      },
      {
        name: "dipendente_id",
        label: "Dipendente",
        type: "fk",
        fk: "dipendenti",
        required: true,
      },
      { name: "data_assegnazione", label: "Data Assegnazione", type: "date" },
    ],
  },
  {
    name: "time_tracking",
    label: "Time Tracking",
    group: "progetti",
    labelField: "id",
    fields: [
      {
        name: "task_id",
        label: "Task",
        type: "fk",
        fk: "task",
        required: true,
      },
      {
        name: "dipendente_id",
        label: "Dipendente",
        type: "fk",
        fk: "dipendenti",
        required: true,
      },
      { name: "data", label: "Data", type: "date", required: true },
      { name: "ore", label: "Ore", type: "number", required: true },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },

  // ================================ SISTEMA ================================
  {
    name: "utenti",
    label: "Utenti",
    group: "sistema",
    labelField: "username",
    fields: [
      { name: "username", label: "Username", type: "text", required: true },
      { name: "email", label: "Email", type: "text", required: true },
      {
        name: "password_hash",
        label: "Password",
        type: "text",
        required: true,
      },
      {
        name: "ruolo",
        label: "Ruolo",
        type: "select",
        options: ["admin", "operatore", "visualizzatore"],
      },
      { name: "attivo", label: "Attivo", type: "boolean" },
    ],
  },
  {
    name: "impostazioni",
    label: "Impostazioni",
    group: "sistema",
    labelField: "chiave",
    fields: [
      { name: "chiave", label: "Chiave", type: "text", required: true },
      { name: "valore", label: "Valore", type: "text" },
    ],
  },
  {
    name: "notifiche",
    label: "Notifiche",
    group: "sistema",
    labelField: "messaggio",
    fields: [
      { name: "utente_id", label: "Utente", type: "fk", fk: "utenti" },
      { name: "messaggio", label: "Messaggio", type: "text", required: true },
      { name: "letto", label: "Letto", type: "boolean" },
      { name: "data_creazione", label: "Data Creazione", type: "datetime" },
    ],
  },
  {
    name: "log_attivita",
    label: "Log Attività",
    group: "sistema",
    labelField: "azione",
    fields: [
      { name: "utente_id", label: "Utente", type: "fk", fk: "utenti" },
      { name: "azione", label: "Azione", type: "text", required: true },
      { name: "tabella", label: "Tabella", type: "text" },
      { name: "data_azione", label: "Data Azione", type: "datetime" },
      { name: "dettagli", label: "Dettagli", type: "textarea" },
    ],
  },
];

module.exports = { GROUPS, TABLES };
