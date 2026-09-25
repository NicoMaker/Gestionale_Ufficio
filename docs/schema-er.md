# Schema ER — Gestionale (50 tabelle)

Diagramma entità-relazione generato automaticamente da `db/schema.js`.
Per rigenerarlo dopo una modifica allo schema: `node docs/generate-er-diagram.js`.

```mermaid
%% Diagramma ER generato automaticamente da db/schema.js
%% Rigenera con: node docs/generate-er-diagram.js
erDiagram
    categorie_clienti ||--o{ clienti : "categoria_id"
    clienti ||--o{ contatti : "cliente_id"
    categorie_prodotti ||--o{ prodotti : "categoria_id"
    unita_misura ||--o{ prodotti : "unita_misura_id"
    prodotti ||--o{ giacenze : "prodotto_id"
    magazzini ||--o{ giacenze : "magazzino_id"
    prodotti ||--o{ movimenti_magazzino : "prodotto_id"
    magazzini ||--o{ movimenti_magazzino : "magazzino_id"
    prodotti ||--o{ lotti : "prodotto_id"
    fornitori ||--o{ fornitori_prodotti : "fornitore_id"
    prodotti ||--o{ fornitori_prodotti : "prodotto_id"
    clienti ||--o{ preventivi : "cliente_id"
    preventivi ||--o{ preventivi_righe : "preventivo_id"
    prodotti ||--o{ preventivi_righe : "prodotto_id"
    clienti ||--o{ ordini_vendita : "cliente_id"
    ordini_vendita ||--o{ ordini_vendita_righe : "ordine_id"
    prodotti ||--o{ ordini_vendita_righe : "prodotto_id"
    clienti ||--o{ ddt_vendita : "cliente_id"
    ddt_vendita ||--o{ ddt_vendita_righe : "ddt_id"
    prodotti ||--o{ ddt_vendita_righe : "prodotto_id"
    clienti ||--o{ fatture_vendita : "cliente_id"
    fatture_vendita ||--o{ fatture_vendita_righe : "fattura_id"
    prodotti ||--o{ fatture_vendita_righe : "prodotto_id"
    fornitori ||--o{ ordini_acquisto : "fornitore_id"
    ordini_acquisto ||--o{ ordini_acquisto_righe : "ordine_id"
    prodotti ||--o{ ordini_acquisto_righe : "prodotto_id"
    fornitori ||--o{ ddt_acquisto : "fornitore_id"
    fornitori ||--o{ fatture_acquisto : "fornitore_id"
    fatture_acquisto ||--o{ fatture_acquisto_righe : "fattura_id"
    prodotti ||--o{ fatture_acquisto_righe : "prodotto_id"
    conti_bancari ||--o{ movimenti_bancari : "conto_id"
    clienti ||--o{ pagamenti : "cliente_id"
    fornitori ||--o{ pagamenti : "fornitore_id"
    clienti ||--o{ scadenze : "cliente_id"
    fornitori ||--o{ scadenze : "fornitore_id"
    clienti ||--o{ note_credito : "cliente_id"
    dipartimenti ||--o{ dipendenti : "dipartimento_id"
    ruoli ||--o{ dipendenti : "ruolo_id"
    dipendenti ||--o{ contratti : "dipendente_id"
    dipendenti ||--o{ presenze : "dipendente_id"
    dipendenti ||--o{ ferie_permessi : "dipendente_id"
    clienti ||--o{ opportunita : "cliente_id"
    clienti ||--o{ attivita_crm : "cliente_id"
    opportunita ||--o{ trattative : "opportunita_id"
    clienti ||--o{ progetti : "cliente_id"
    progetti ||--o{ task : "progetto_id"
    task ||--o{ task_assegnazioni : "task_id"
    dipendenti ||--o{ task_assegnazioni : "dipendente_id"
    task ||--o{ time_tracking : "task_id"
    dipendenti ||--o{ time_tracking : "dipendente_id"
    utenti ||--o{ notifiche : "utente_id"
    utenti ||--o{ log_attivita : "utente_id"

    categorie_clienti {
        INTEGER id PK
        TEXT nome
        TEXT descrizione
        TEXT created_at
        TEXT updated_at
    }
    clienti {
        INTEGER id PK
        TEXT ragione_sociale
        TEXT partita_iva
        TEXT codice_fiscale
        TEXT email
        TEXT telefono
        TEXT indirizzo
        TEXT citta
        TEXT cap
        INTEGER categoria_id FK
        TEXT note
        TEXT created_at
        TEXT updated_at
    }
    fornitori {
        INTEGER id PK
        TEXT ragione_sociale
        TEXT partita_iva
        TEXT email
        TEXT telefono
        TEXT indirizzo
        TEXT citta
        TEXT cap
        TEXT note
        TEXT created_at
        TEXT updated_at
    }
    contatti {
        INTEGER id PK
        TEXT nome
        TEXT cognome
        TEXT email
        TEXT telefono
        INTEGER cliente_id FK
        TEXT ruolo
        TEXT created_at
        TEXT updated_at
    }
    categorie_prodotti {
        INTEGER id PK
        TEXT nome
        TEXT descrizione
        TEXT created_at
        TEXT updated_at
    }
    unita_misura {
        INTEGER id PK
        TEXT nome
        TEXT simbolo
        TEXT created_at
        TEXT updated_at
    }
    magazzini {
        INTEGER id PK
        TEXT nome
        TEXT indirizzo
        TEXT responsabile
        TEXT created_at
        TEXT updated_at
    }
    prodotti {
        INTEGER id PK
        TEXT codice
        TEXT nome
        TEXT descrizione
        INTEGER categoria_id FK
        INTEGER unita_misura_id FK
        REAL prezzo_acquisto
        REAL prezzo_vendita
        REAL scorta_minima
        TEXT created_at
        TEXT updated_at
    }
    giacenze {
        INTEGER id PK
        INTEGER prodotto_id FK
        INTEGER magazzino_id FK
        REAL quantita
        TEXT ubicazione
        TEXT created_at
        TEXT updated_at
    }
    movimenti_magazzino {
        INTEGER id PK
        INTEGER prodotto_id FK
        INTEGER magazzino_id FK
        TEXT tipo
        REAL quantita
        TEXT data_movimento
        TEXT note
        TEXT created_at
        TEXT updated_at
    }
    lotti {
        INTEGER id PK
        INTEGER prodotto_id FK
        TEXT numero_lotto
        TEXT data_scadenza
        REAL quantita
        TEXT created_at
        TEXT updated_at
    }
    fornitori_prodotti {
        INTEGER id PK
        INTEGER fornitore_id FK
        INTEGER prodotto_id FK
        REAL prezzo
        REAL tempo_consegna_giorni
        TEXT created_at
        TEXT updated_at
    }
    listini_prezzi {
        INTEGER id PK
        TEXT nome
        TEXT data_inizio
        TEXT data_fine
        REAL sconto_percentuale
        TEXT created_at
        TEXT updated_at
    }
    preventivi {
        INTEGER id PK
        TEXT numero
        INTEGER cliente_id FK
        TEXT data_preventivo
        REAL validita_giorni
        TEXT stato
        REAL totale
        TEXT created_at
        TEXT updated_at
    }
    preventivi_righe {
        INTEGER id PK
        INTEGER preventivo_id FK
        INTEGER prodotto_id FK
        REAL quantita
        REAL prezzo_unitario
        TEXT created_at
        TEXT updated_at
    }
    ordini_vendita {
        INTEGER id PK
        TEXT numero
        INTEGER cliente_id FK
        TEXT data_ordine
        TEXT stato
        REAL totale
        TEXT created_at
        TEXT updated_at
    }
    ordini_vendita_righe {
        INTEGER id PK
        INTEGER ordine_id FK
        INTEGER prodotto_id FK
        REAL quantita
        REAL prezzo_unitario
        TEXT created_at
        TEXT updated_at
    }
    ddt_vendita {
        INTEGER id PK
        TEXT numero
        INTEGER cliente_id FK
        TEXT data_ddt
        TEXT causale
        TEXT created_at
        TEXT updated_at
    }
    ddt_vendita_righe {
        INTEGER id PK
        INTEGER ddt_id FK
        INTEGER prodotto_id FK
        REAL quantita
        TEXT created_at
        TEXT updated_at
    }
    fatture_vendita {
        INTEGER id PK
        TEXT numero
        INTEGER cliente_id FK
        TEXT data_fattura
        TEXT scadenza
        TEXT stato
        REAL totale
        TEXT created_at
        TEXT updated_at
    }
    fatture_vendita_righe {
        INTEGER id PK
        INTEGER fattura_id FK
        INTEGER prodotto_id FK
        REAL quantita
        REAL prezzo_unitario
        REAL iva_percentuale
        TEXT created_at
        TEXT updated_at
    }
    ordini_acquisto {
        INTEGER id PK
        TEXT numero
        INTEGER fornitore_id FK
        TEXT data_ordine
        TEXT stato
        REAL totale
        TEXT created_at
        TEXT updated_at
    }
    ordini_acquisto_righe {
        INTEGER id PK
        INTEGER ordine_id FK
        INTEGER prodotto_id FK
        REAL quantita
        REAL prezzo_unitario
        TEXT created_at
        TEXT updated_at
    }
    ddt_acquisto {
        INTEGER id PK
        TEXT numero
        INTEGER fornitore_id FK
        TEXT data_ddt
        TEXT causale
        TEXT created_at
        TEXT updated_at
    }
    fatture_acquisto {
        INTEGER id PK
        TEXT numero
        INTEGER fornitore_id FK
        TEXT data_fattura
        TEXT scadenza
        TEXT stato
        REAL totale
        TEXT created_at
        TEXT updated_at
    }
    fatture_acquisto_righe {
        INTEGER id PK
        INTEGER fattura_id FK
        INTEGER prodotto_id FK
        REAL quantita
        REAL prezzo_unitario
        TEXT created_at
        TEXT updated_at
    }
    iva_aliquote {
        INTEGER id PK
        TEXT descrizione
        REAL percentuale
        TEXT created_at
        TEXT updated_at
    }
    piano_conti {
        INTEGER id PK
        TEXT codice
        TEXT descrizione
        TEXT tipo
        TEXT created_at
        TEXT updated_at
    }
    conti_bancari {
        INTEGER id PK
        TEXT nome
        TEXT iban
        TEXT banca
        REAL saldo
        TEXT created_at
        TEXT updated_at
    }
    movimenti_bancari {
        INTEGER id PK
        INTEGER conto_id FK
        TEXT data_movimento
        REAL importo
        TEXT tipo
        TEXT descrizione
        TEXT created_at
        TEXT updated_at
    }
    pagamenti {
        INTEGER id PK
        TEXT tipo
        REAL importo
        TEXT data_pagamento
        TEXT metodo
        INTEGER cliente_id FK
        INTEGER fornitore_id FK
        TEXT note
        TEXT created_at
        TEXT updated_at
    }
    scadenze {
        INTEGER id PK
        TEXT descrizione
        TEXT data_scadenza
        REAL importo
        TEXT stato
        INTEGER cliente_id FK
        INTEGER fornitore_id FK
        TEXT created_at
        TEXT updated_at
    }
    note_credito {
        INTEGER id PK
        TEXT numero
        INTEGER cliente_id FK
        TEXT data_nota
        REAL importo
        TEXT motivo
        TEXT created_at
        TEXT updated_at
    }
    dipartimenti {
        INTEGER id PK
        TEXT nome
        TEXT responsabile
        TEXT created_at
        TEXT updated_at
    }
    ruoli {
        INTEGER id PK
        TEXT nome
        TEXT descrizione
        TEXT created_at
        TEXT updated_at
    }
    dipendenti {
        INTEGER id PK
        TEXT nome
        TEXT cognome
        TEXT email
        TEXT telefono
        INTEGER dipartimento_id FK
        INTEGER ruolo_id FK
        TEXT data_assunzione
        REAL stipendio
        TEXT created_at
        TEXT updated_at
    }
    contratti {
        INTEGER id PK
        INTEGER dipendente_id FK
        TEXT tipo_contratto
        TEXT data_inizio
        TEXT data_fine
        TEXT created_at
        TEXT updated_at
    }
    presenze {
        INTEGER id PK
        INTEGER dipendente_id FK
        TEXT data
        REAL ore_lavorate
        TEXT tipo
        TEXT created_at
        TEXT updated_at
    }
    ferie_permessi {
        INTEGER id PK
        INTEGER dipendente_id FK
        TEXT tipo
        TEXT data_inizio
        TEXT data_fine
        TEXT stato
        TEXT created_at
        TEXT updated_at
    }
    opportunita {
        INTEGER id PK
        TEXT nome
        INTEGER cliente_id FK
        REAL valore_stimato
        TEXT stato
        TEXT data_chiusura_prevista
        TEXT created_at
        TEXT updated_at
    }
    attivita_crm {
        INTEGER id PK
        TEXT tipo
        TEXT data_attivita
        INTEGER cliente_id FK
        TEXT descrizione
        TEXT esito
        TEXT created_at
        TEXT updated_at
    }
    trattative {
        INTEGER id PK
        INTEGER opportunita_id FK
        TEXT fase
        REAL probabilita
        TEXT note
        TEXT created_at
        TEXT updated_at
    }
    progetti {
        INTEGER id PK
        TEXT nome
        INTEGER cliente_id FK
        TEXT data_inizio
        TEXT data_fine
        TEXT stato
        REAL budget
        TEXT created_at
        TEXT updated_at
    }
    task {
        INTEGER id PK
        INTEGER progetto_id FK
        TEXT titolo
        TEXT descrizione
        TEXT stato
        TEXT scadenza
        TEXT priorita
        TEXT created_at
        TEXT updated_at
    }
    task_assegnazioni {
        INTEGER id PK
        INTEGER task_id FK
        INTEGER dipendente_id FK
        TEXT data_assegnazione
        TEXT created_at
        TEXT updated_at
    }
    time_tracking {
        INTEGER id PK
        INTEGER task_id FK
        INTEGER dipendente_id FK
        TEXT data
        REAL ore
        TEXT note
        TEXT created_at
        TEXT updated_at
    }
    utenti {
        INTEGER id PK
        TEXT username
        TEXT email
        TEXT password_hash
        TEXT ruolo
        INTEGER attivo
        TEXT created_at
        TEXT updated_at
    }
    impostazioni {
        INTEGER id PK
        TEXT chiave
        TEXT valore
        TEXT created_at
        TEXT updated_at
    }
    notifiche {
        INTEGER id PK
        INTEGER utente_id FK
        TEXT messaggio
        INTEGER letto
        TEXT data_creazione
        TEXT created_at
        TEXT updated_at
    }
    log_attivita {
        INTEGER id PK
        INTEGER utente_id FK
        TEXT azione
        TEXT tabella
        TEXT data_azione
        TEXT dettagli
        TEXT created_at
        TEXT updated_at
    }```
