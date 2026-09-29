# 🗑️ Cestino — regole, funzionamento e API

Il gestionale non elimina mai un record "a caso": ogni eliminazione passa dal **cestino**.
Da lì il record può essere **ripristinato** (se le condizioni sono corrette) oppure viene
**eliminato definitivamente in automatico dopo 15 giorni**.

## In breve

| Cosa                        | Regola                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| **Eliminare** un record     | Consentito **solo se non ha record collegati** (collegamenti = 0). Il record va nel cestino.     |
| **Ripristinare** un record  | Consentito **solo se tutti i record a cui fa riferimento esistono ancora**.                      |
| **Scadenza**                | Dopo **15 giorni** nel cestino il record viene eliminato **definitivamente** in automatico.      |
| **Ripristina tutto**        | Ripristina **tutto ciò che si può** (padri prima dei figli). Il resto **non** viene toccato.     |
| **Elimina definitivamente** | Sempre possibile dal cestino; avvisa se altri record nel cestino non saranno più ripristinabili. |
| **Svuota cestino**          | Elimina definitivamente tutti gli elementi del cestino.                                          |
| **Selezione multipla**      | Puoi **selezionare più record** (checkbox) e eliminarli, ripristinarli o cancellarli in una volta, con **le stesse regole** del singolo. |
| **Dashboard**               | La pagina iniziale ha un **pannello Cestino** con riepilogo e collegamento diretto alla pagina.   |

> La pagina **Cestino** (menu laterale con contatore, e pannello nella **Dashboard**) mostra per ogni elemento la **data di
> eliminazione**, la **data di eliminazione definitiva** con il conto alla rovescia
> ("tra 14 giorni", "tra 5 ore"…) e lo stato di ripristino con il motivo.

## 1. Eliminazione: solo se i collegamenti sono 0

Un record è "collegato" quando un altro record **attivo** lo referenzia tramite una foreign key
(es. un cliente con ordini, fatture, contatti…). In quel caso l'eliminazione è **bloccata**:

- l'interfaccia mostra quali tabelle lo usano e quante volte (es. _Ordini di Vendita (Cliente): 2_);
- l'API risponde `409 Conflict` con `code: "COLLEGATO"` e l'elenco `links`.

Per eliminare il "padre" bisogna prima eliminare (o scollegare) i "figli". Quando i collegamenti
sono 0 il record viene spostato nel cestino.

```
Categoria ◄── Cliente ◄── Contatto        ordine di eliminazione: Contatto → Cliente → Categoria
```

## 2. Ripristino: solo se i riferimenti esistono

Il record nel cestino conserva l'istantanea completa (compresi i riferimenti FK).
Al ripristino, ogni FK valorizzata deve puntare a un record **attivo**:

| Situazione del "padre"                          | Ripristino del "figlio"                                   |
| ----------------------------------------------- | --------------------------------------------------------- |
| Esiste (è attivo)                               | ✅ Ripristinabile                                         |
| È **nel cestino**                               | ❌ Prima ripristina il padre, poi il figlio               |
| È stato **eliminato definitivamente / scaduto** | ❌ **Non ripristinabile** (il riferimento non esiste più) |

Il record torna con lo **stesso ID** e con le date `created_at` / `updated_at` originali.

### Esempio

1. Elimino _Contatto → Cliente → Categoria_ (in quest'ordine): sono tutti e 3 nel cestino.
2. Provo a ripristinare il _Contatto_: **bloccato** (il Cliente è nel cestino).
3. Ripristino la _Categoria_, poi il _Cliente_, poi il _Contatto_: **ok**.
   Oppure premo **Ripristina tutto**: li ripristina tutti e 3 nell'ordine giusto.
4. Variante: elimino definitivamente il _Cliente_ dal cestino → il _Contatto_ diventa
   **non ripristinabile**. Con **Ripristina tutto** torna solo la _Categoria_.

## 3. Operazioni multiple (più record in una volta)

Le regole **non cambiano**: la selezione multipla applica la stessa logica del singolo record,
elemento per elemento. Ciò che non si può fare viene **saltato** (mai forzato) e ti viene spiegato perché.

| Dove                   | Azione                        | Comportamento                                                                                                                       |
| ---------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Tabella** (elenco)   | **Sposta nel cestino**        | Elimina solo i record con **collegamenti = 0**. I collegati restano dove sono, selezionati, con il dettaglio di chi li usa.         |
| **Cestino**            | **Ripristina selezionati**    | Ripristina solo quelli con **riferimenti esistenti**. Se padre e figlio sono selezionati insieme, il padre torna per primo.         |
| **Cestino**            | **Elimina definitivamente**   | Elimina per sempre i selezionati. Avvisa che i record nel cestino che ne dipendono **non saranno più ripristinabili**.               |

- Le caselle di selezione funzionano **anche tra pagine diverse**; la casella nell'intestazione seleziona tutta la pagina.
- **Ordine automatico**: se in una tabella selezioni insieme un padre e i suoi figli (nella stessa tabella,
  es. record che si referenziano tra loro), i figli vengono eliminati per primi e il padre si libera.
  Un padre i cui figli sono in un'altra tabella non selezionata resta bloccato.
- Massimo **500 record** per operazione.
- Ogni operazione multipla è **transazionale**: il database non resta mai a metà.

## 4. Eliminazione automatica dopo 15 giorni

- Ogni elemento ha `deleted_at` (quando è stato eliminato) e `expires_at` (`deleted_at + 15 giorni`).
- Il server elimina i record scaduti **all'avvio**, **ogni ora** e a ogni consultazione del cestino.
- Il periodo si può cambiare con la variabile d'ambiente `TRASH_RETENTION_DAYS`:

```bash
TRASH_RETENTION_DAYS=30 npm start      # Linux/macOS
set TRASH_RETENTION_DAYS=30 && npm start   # Windows (cmd)
```

> ⚠️ Il conteggio parte dal momento in cui il **singolo record** entra nel cestino.
> Se il server è spento, la pulizia avviene al riavvio successivo.

## 5. Dove sono i dati

Tabella di sistema `cestino` (non fa parte delle 50 tabelle dello schema, creata in `db/init.js`):

| Colonna      | Descrizione                                           |
| ------------ | ----------------------------------------------------- |
| `id`         | ID dell'elemento nel cestino                          |
| `table_name` | Tabella di origine                                    |
| `record_id`  | ID originale del record                               |
| `label`      | Etichetta leggibile (es. ragione sociale)             |
| `data`       | Istantanea JSON completa del record (campi, FK, date) |
| `deleted_at` | Data di eliminazione (ISO 8601 UTC)                   |
| `expires_at` | Data di eliminazione definitiva                       |

Il record eliminato viene **rimosso** dalla tabella di origine: per questo non compare più negli
elenchi, nei menu a tendina FK e nei conteggi. Il legame con le altre tabelle è **logico**
(`table_name` + `record_id`), quindi eliminare definitivamente un padre non altera mai i figli
nel cestino: restano semplicemente non ripristinabili.

## 6. API

Tutte le risposte sono JSON.

| Metodo   | Endpoint                   | Descrizione                                                                |
| -------- | -------------------------- | -------------------------------------------------------------------------- |
| `GET`    | `/api/:table/:id/links`    | Record che referenziano questo record (`total`, `links[]`)                 |
| `DELETE` | `/api/:table/:id`          | Sposta nel cestino. `409` se ci sono collegamenti                          |
| `POST`   | `/api/:table/bulk-delete`  | `{ ids: [...] }` sposta più record nel cestino → `{ moved, blocked, blocked_items[] }` |
| `GET`    | `/api/cestino`             | Elenco (`?page` `?limit` `?q` `?table`) con stato di ripristino e scadenza |
| `GET`    | `/api/cestino/count`       | Numero di elementi nel cestino                                             |
| `GET`    | `/api/cestino/summary`     | Riepilogo per la dashboard: `total`, `restorable`, `not_restorable`, `expiring_soon`, `next_expiry`, `by_table[]` |
| `POST`   | `/api/cestino/:id/restore` | Ripristina un elemento. `409` se i riferimenti mancano                     |
| `POST`   | `/api/cestino/restore-all` | Ripristina tutto il possibile → `{ total, restored, skipped, … }`          |
| `POST`   | `/api/cestino/restore-selected` | `{ ids: [...] }` ripristina i selezionati (quelli che si può) → `{ total, restored, skipped, skipped_details[] }` |
| `POST`   | `/api/cestino/delete-selected`  | `{ ids: [...] }` elimina definitivamente i selezionati → `{ deleted, dipendenti_non_ripristinabili }` |
| `DELETE` | `/api/cestino/:id`         | Elimina definitivamente un elemento                                        |
| `DELETE` | `/api/cestino`             | Svuota il cestino                                                          |

Ogni elemento di `GET /api/cestino` contiene, oltre ai dati del record:
`deleted_at`, `expires_at`, `secondi_rimanenti`, `restorable`, `motivo`, `missing[]`
(riferimenti mancanti, con `in_trash: true|false`) e `dipendenti_nel_cestino`.

## 7. Dove sta il codice

| File                                   | Ruolo                                                             |
| -------------------------------------- | ----------------------------------------------------------------- |
| `backend/db/trash.js`                  | Logica: collegamenti, spostamento, ripristino, scadenze           |
| `backend/db/init.js`                   | Creazione della tabella `cestino`                                 |
| `backend/routes/cestino.js`            | API `/api/cestino`                                                |
| `backend/routes/api.js`                | `DELETE` → cestino, `GET /:table/:id/links`                       |
| `frontend/js/components/cestino.js`    | Pagina Cestino                                                    |
| `frontend/js/components/table-view.js` | Eliminazione singola e multipla (blocco se collegato / sposta nel cestino) |
| `frontend/js/components/dashboard.js`  | Pannello Cestino con riepilogo e collegamento alla pagina         |
| `backend/tests/cestino.test.js`        | Test automatici delle regole (`npm test`)                         |

Per verificare le regole in automatico: `cd backend && npm test` (usa un database temporaneo, non tocca i tuoi dati).

Le operazioni di scrittura sul cestino sono **transazionali** (tutto o niente) e serializzate:
due richieste contemporanee non possono lasciare il database in uno stato inconsistente.
