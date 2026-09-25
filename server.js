const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db/init');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API REST generica per tutte le 50 tabelle
app.use('/api', apiRouter);

// Frontend statico (HTML/CSS/JS a componenti)
app.use(express.static(path.join(__dirname, 'public')));

// Qualsiasi altra rotta non-API serve l'app (routing lato client)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestore errori centralizzato
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500).json({ error: 'Errore interno del server' });
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('==================================================');
      console.log('  GESTIONALE avviato correttamente');
      console.log(`  Apri il browser su: http://localhost:${PORT}`);
      console.log('==================================================');
    });
  })
  .catch((err) => {
    console.error('Errore inizializzazione database:', err);
    process.exit(1);
  });
