# Gestionale

Gestionale aziendale completo — Node.js, Express, SQLite3, frontend a componenti (HTML/CSS/JS vanilla).

## Cosa contiene

- **50 tabelle** organizzate in 9 moduli: Anagrafiche, Magazzino, Vendite, Acquisti,
  Contabilità, Risorse Umane, CRM, Progetti, Sistema.
- **Backend Express** con API REST generiche (CRUD + ricerca + paginazione) che
  funzionano per tutte le 50 tabelle, generate automaticamente da un unico schema.
- **Database SQLite3**, creato e strutturato automaticamente al primo avvio
  (nessuna configurazione richiesta).
- **Frontend a componenti** (vanilla JS, nessun framework/build step):
  sidebar di navigazione, dashboard, vista tabellare con ricerca/paginazione,
  form modali generati dinamicamente, gestione dei riferimenti (foreign key)
  con menu a tendina, notifiche toast.

## Struttura del progetto

```
gestionale/
├── server.js               # avvio server Express
├── package.json
├── db/
│   ├── schema.js            # DEFINIZIONE CENTRALE delle 50 tabelle (campi, tipi, relazioni)
│   ├── init.js               # crea il database SQLite a partire dallo schema
│   └── gestionale.sqlite3    # file del database (creato al primo avvio)
├── routes/
│   └── api.js                # API REST generiche (GET/POST/PUT/DELETE) per tutte le tabelle
└── public/                   # frontend servito da Express
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js                    # chiamate fetch verso il backend
        ├── app.js                    # routing e inizializzazione app
        └── components/
            ├── sidebar.js             # menu di navigazione a moduli
            ├── dashboard.js           # schermata iniziale con statistiche
            ├── table-view.js          # elenco, ricerca, paginazione, azioni
            ├── form-modal.js          # form dinamico di creazione/modifica
            └── toast.js               # notifiche
```

## Come avviarlo

```bash
npm install
npm start
```

Poi apri il browser su **http://localhost:3000**.

Il database SQLite viene creato automaticamente al primo avvio (file
`db/gestionale.sqlite3`), con tutte le 50 tabelle e i relativi indici.
Non serve nessuna configurazione aggiuntiva.

## Schema ER

Il diagramma entità-relazione completo delle 50 tabelle è in
`docs/schema-er.md` (Mermaid, visualizzabile su GitHub o in qualunque
editor con supporto Mermaid) ed è generato automaticamente dallo schema
reale, quindi resta sempre allineato al codice. Per rigenerarlo dopo aver
modificato `db/schema.js`:

```bash
node docs/generate-er-diagram.js
```

## Come funziona (architettura)

L'intero sistema è **guidato dallo schema** definito in `db/schema.js`: ogni
tabella è descritta una sola volta (nome, gruppo/modulo, campi, tipi,
relazioni). Da questa unica fonte vengono generati automaticamente:

1. **Lo schema del database** (`db/init.js` legge `TABLES` e crea le tabelle SQLite).
2. **Le API REST** (`routes/api.js` espone `GET/POST/PUT/DELETE /api/:table`
   per qualunque tabella dello schema, con whitelist di sicurezza contro
   SQL injection, validazione dei campi obbligatori, ricerca testuale e
   paginazione).
3. **L'interfaccia** (il frontend chiama `GET /api/_meta` per scoprire tabelle
   e campi, e costruisce dinamicamente sidebar, tabelle ed elenchi form).

### Aggiungere una 51ª tabella

Basta aggiungere una nuova voce nell'array `TABLES` di `db/schema.js`
(nome, gruppo, campi): al riavvio del server la tabella viene creata nel
database, esposta via API e resa disponibile in sidebar con la sua vista
tabellare e il suo form di inserimento — senza scrivere altro codice.

### Tipi di campo supportati

| Tipo       | Descrizione                                              |
|------------|-----------------------------------------------------------|
| `text`     | Testo su singola riga                                     |
| `textarea` | Testo multi-riga                                           |
| `number`   | Numero (anche decimale)                                    |
| `date`     | Data                                                        |
| `datetime` | Data e ora, gestita automaticamente                         |
| `boolean`  | Checkbox Sì/No                                              |
| `select`   | Menu a tendina con valori fissi                              |
| `fk`       | Riferimento a un'altra tabella (menu a tendina dinamico)     |

## Note

- Nessuna autenticazione è implementata: la tabella `utenti` è predisposta
  nello schema ma va collegata a un livello di autenticazione/sessioni se
  necessario in produzione.
- Il file del database (`db/gestionale.sqlite3`) viene creato al primo avvio;
  cancellalo per ripartire con un database vuoto.
