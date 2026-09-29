---

# Gestionale

Gestionale aziendale completo — Node.js, Express, SQLite3, frontend a componenti (HTML/CSS/JS vanilla).

## Cosa contiene

- **50 tabelle** organizzate in 9 moduli: Anagrafiche, Magazzino, Vendite, Acquisti,
  Contabilità, Risorse Umane, CRM, Progetti, Sistema.
- **Backend Express** con API REST generiche (CRUD + ricerca + paginazione) che
  funzionano per tutte le 50 tabelle, generate automaticamente da un unico schema.
- **Database SQLite3**, creato e strutturato automaticamente al primo avvio
  (nessuna configurazione richiesta).
- **Cestino con ripristino**: le eliminazioni passano da un cestino; un record si può
  eliminare solo se non ha record collegati, si può ripristinare solo se i suoi
  riferimenti esistono ancora, e viene eliminato definitivamente in automatico dopo
  **15 giorni** (vedi [`backend/docs/CESTINO.md`](backend/docs/CESTINO.md)).
- **Frontend a componenti** (vanilla JS, nessun framework/build step):
  sidebar di navigazione, dashboard, vista tabellare con ricerca/paginazione,
  form modali generati dinamicamente, gestione dei riferimenti (foreign key)
  con menu a tendina, notifiche toast.

## Struttura del progetto

```
gestionale_Ufficio/
│
├── backend/                          # 🖥️ Server Express + Database SQLite
│   │
│   ├── server.js                     # Avvio server Express
│   ├── package.json                  # Dipendenze e script backend
│   ├── package-lock.json             # Lock delle versioni dipendenze
│   │
│   ├── db/                           # 🗄️ Database SQLite
│   │   ├── schema.js                 # DEFINIZIONE CENTRALE delle 50 tabelle (campi, tipi, relazioni)
│   │   ├── init.js                   # Crea il database SQLite a partire dallo schema
│   │   ├── seed.js                   # Popola il DB con dati di esempio iniziali
│   │   ├── trash.js                  # 🗑️ Logica del cestino (collegamenti, ripristino, scadenze)
│   │   └── gestionale.db             # File del database (creato al primo avvio)
│   │
│   ├── routes/                       # 🛣️ API REST
│   │   ├── api.js                    # API REST generiche (GET/POST/PUT/DELETE) per tutte le tabelle
│   │   └── cestino.js                # API del cestino (/api/cestino)
│   │
│   └── docs/                         # 📚 Documentazione tecnica (solo backend)
│       ├── generate-er-diagram.js    # Script per generare il diagramma ER
│       ├── schema.mmd                # Sorgente Mermaid del diagramma ER (incluso il cestino)
│       ├── schema.png                # Diagramma ER esportato come immagine
│       └── CESTINO.md                # Regole, funzionamento e API del cestino
│
└── frontend/                         # 🎨 Frontend servito da Express
    │
    ├── index.html                    # Pagina principale SPA
    │
    ├── css/                          # 💅 Stili
    │   └── style.css                 # Foglio di stile principale
    │
    └── js/                           # ⚙️ Logica frontend
        ├── api.js                    # Chiamate fetch verso il backend
        ├── icons.js                  # Set di icone SVG/emoji riutilizzabili
        ├── app.js                    # Routing e inizializzazione app
        │
        └── components/               # 🧩 Componenti UI modulari
            ├── sidebar.js            # Menu di navigazione a moduli
            ├── dashboard.js          # Schermata iniziale con statistiche
            ├── cestino.js            # Pagina Cestino (ripristina, elimina, scadenze)
            ├── table-view.js         # Elenco, ricerca, paginazione, azioni
            ├── form-modal.js         # Form dinamico di creazione/modifica
            ├── confirm-dialog.js     # Dialog di conferma per azioni distruttive
            ├── theme.js              # Gestione tema chiaro/scuro
            └── toast.js              # Notifiche a comparsa
```

## Come avviarlo

```bash
cd backend
npm install
npm start
```

Poi apri il browser su **http://localhost:3000**.

Il database SQLite viene creato automaticamente al primo avvio (file
`db/gestionale.db`), con tutte le 50 tabelle e i relativi indici.
Non serve nessuna configurazione aggiuntiva.

## 📜 Script `npm` disponibili

Nel `package.json` del backend sono definiti i seguenti script:

| Script         | Comando effettivo             | Cosa fa                                                                                                                                                  |
| -------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`start`**    | `node server.js`              | Avvia il server Express in modalità **produzione** (senza auto-reload). Il DB viene creato se non esiste, ma **non** viene popolato con dati di esempio. |
| **`dev`**      | `nodemon server.js`           | Avvia il server in modalità **sviluppo**: `nodemon` riavvia automaticamente il processo a ogni modifica dei file. Utile mentre si scrive codice.         |
| **`dati`**     | `node db/seed.js`             | Esegue solo lo **script di seeding**: popola il database con dati di esempio realistici (clienti, prodotti, ordini, ecc.) senza avviare il server.       |
| **`run_dati`** | `npm run dati && npm start`   | **Seeding + avvio produzione** in un colpo solo: prima popola il DB, poi avvia il server con `node server.js`.                                           |
| **`dev_dati`** | `npm run dati && npm run dev` | **Seeding + avvio sviluppo** in un colpo solo: popola il DB e poi avvia il server con `nodemon` per lo sviluppo attivo.                                  |

### 🎯 Quando usare quale

| Scenario                                                                | Script consigliato |
| ----------------------------------------------------------------------- | ------------------ |
| Prima installazione, voglio vedere subito dati realistici in produzione | `npm run run_dati` |
| Sto sviluppando e voglio hot-reload + dati di test                      | `npm run dev_dati` |
| Voglio solo ripopolare il DB senza toccare il server                    | `npm run dati`     |
| Server già avviato, voglio solo riavviarlo in dev                       | `npm run dev`      |
| Deploy finale / produzione pulita                                       | `npm start`        |

### ⚠️ Nota sul seeding

Lo script `dati` (`db/seed.js`) **inserisce** dati di esempio: se eseguito più
volte sullo stesso database, potrebbero verificarsi duplicati o errori di
vincoli univoci. Per ripartire da zero:

```bash
rm db/gestionale.db      # Linux/macOS
del db\gestionale.db     # Windows
npm run dati
```

Il file `gestionale.db` verrà ricreato automaticamente al successivo avvio.

## 🗑️ Cestino

Ogni eliminazione passa dal cestino (menu laterale → **Cestino**, con contatore).

| Regola                     | Descrizione                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| **Eliminazione**           | Possibile **solo se il record non ha dati collegati** (collegamenti = 0). Altrimenti viene bloccata e ti mostra chi lo usa. |
| **Ripristino**             | Possibile **solo se tutti i record a cui fa riferimento esistono**. Se il padre è nel cestino ripristina prima lui; se non esiste più, il record **non è ripristinabile**. |
| **Scadenza**               | Dopo **15 giorni** nel cestino l'elemento viene **eliminato definitivamente** in automatico. La pagina mostra la data esatta e il conto alla rovescia. |
| **Ripristina tutto**       | Ripristina tutto ciò che si può (padri prima dei figli); il resto non viene toccato.               |
| **Elimina / Svuota**       | Eliminazione definitiva di un elemento o di tutto il cestino (con avviso sui figli che non saranno più ripristinabili). |

Il periodo di 15 giorni si cambia con la variabile d'ambiente `TRASH_RETENTION_DAYS`
(es. `TRASH_RETENTION_DAYS=30 npm start`). Dettagli, esempi e API in
[`backend/docs/CESTINO.md`](backend/docs/CESTINO.md).

## Schema ER

Il diagramma entità-relazione completo delle 50 tabelle è in
`backend/docs/schema.mmd` (Mermaid, visualizzabile su GitHub o in qualunque
editor con supporto Mermaid) ed è generato automaticamente dallo schema
reale, quindi resta sempre allineato al codice. Comprende anche la tabella di
sistema `cestino`. Per rigenerarlo dopo aver modificato `db/schema.js`:

```bash
cd backend
node docs/generate-er-diagram.js
```

Lo script scrive `backend/docs/schema.mmd`. L'immagine `schema.png` si esporta
dal file `.mmd` con Mermaid CLI:

```bash
npx -p @mermaid-js/mermaid-cli mmdc -i docs/schema.mmd -o docs/schema.png
```

## Come funziona (architettura)

L'intero sistema è **guidato dallo schema** definito in `db/schema.js`: ogni
tabella è descritta una sola volta (nome, gruppo/modulo, campi, tipi,
relazioni). Da questa unica fonte vengono generati automaticamente:

1. **Lo schema del database** (`db/init.js` legge `TABLES` e crea le tabelle SQLite).
2. **Le API REST** (`routes/api.js` espone `GET/POST/PUT/DELETE /api/:table`
   per qualunque tabella dello schema, con whitelist di sicurezza contro
   SQL injection, validazione dei campi obbligatori, ricerca testuale e
   paginazione). `DELETE` sposta il record nel cestino; le API del cestino
   sono in `routes/cestino.js`.
3. **L'interfaccia** (il frontend chiama `GET /api/_meta` per scoprire tabelle
   e campi, e costruisce dinamicamente sidebar, tabelle ed elenchi form).

### Aggiungere una 51ª tabella

Basta aggiungere una nuova voce nell'array `TABLES` di `db/schema.js`
(nome, gruppo, campi): al riavvio del server la tabella viene creata nel
database, esposta via API e resa disponibile in sidebar con la sua vista
tabellare e il suo form di inserimento — senza scrivere altro codice.

### Tipi di campo supportati

| Tipo       | Descrizione                                              |
| ---------- | -------------------------------------------------------- |
| `text`     | Testo su singola riga                                    |
| `textarea` | Testo multi-riga                                         |
| `number`   | Numero (anche decimale)                                  |
| `date`     | Data                                                     |
| `datetime` | Data e ora, gestita automaticamente                      |
| `boolean`  | Checkbox Sì/No                                           |
| `select`   | Menu a tendina con valori fissi                          |
| `fk`       | Riferimento a un'altra tabella (menu a tendina dinamico) |

## Note

- Nessuna autenticazione è implementata: la tabella `utenti` è predisposta
  nello schema ma va collegata a un livello di autenticazione/sessioni se
  necessario in produzione.
- Il file del database (`db/gestionale.db`) viene creato al primo avvio;
  cancellalo per ripartire con un database vuoto.
- Le tabelle di riferimento (`fk`) usano `ON DELETE SET NULL` a livello SQL, ma
  dall'app non si può eliminare un record che ha record collegati: la regola
  "collegamenti = 0" è applicata dal server prima di spostare nel cestino.
- Il cestino è una tabella di sistema (`cestino`) fuori dalle 50 tabelle dello
  schema: non compare nel menu dei moduli ma ha la sua voce dedicata.
- Lo script `dati` è **idempotente solo su DB vuoto**: per ripopolare da zero,
  cancella prima `gestionale.db`.

---

## 📋 Riepilogo dei comandi rapidi

```bash
# 🚀 Avvio produzione (DB vuoto se non esiste)
npm start

# 🔧 Avvio sviluppo con hot-reload
npm run dev

# 🌱 Solo seeding (popola dati di esempio)
npm run dati

# 🚀🌱 Seeding + avvio produzione
npm run run_dati

# 🔧🌱 Seeding + avvio sviluppo
npm run dev_dati

# 📊 Rigenera diagramma ER (da backend/)
node docs/generate-er-diagram.js

# 🗑️ Cestino con scadenza personalizzata (default 15 giorni)
TRASH_RETENTION_DAYS=30 npm start
```
