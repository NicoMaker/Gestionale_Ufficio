const path = require("path");
const express = require("express");
const cors = require("cors");
const { initDatabase, db } = require("./db/init");
const apiRouter = require("./routes/api");
const cestinoRouter = require("./routes/cestino");
const Trash = require("./db/trash");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(cors());
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "same-origin",
  });
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check (prima del router generico, che lo tratterebbe come tabella)
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime() }),
);

// Cestino (prima del router generico, che lo tratterebbe come tabella)
app.use("/api/cestino", cestinoRouter);

// API REST generica per tutte le 50 tabelle
app.use("/api", apiRouter);

// Frontend statico (HTML/CSS/JS a componenti)
app.use(express.static(path.join(__dirname, "../frontend")));

// Qualsiasi altra rotta non-API serve l'app (routing lato client)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// Gestore errori centralizzato
app.use((err, req, res, next) => {
  // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500).json({ error: "Errore interno del server" });
});

initDatabase()
  .then(() => {
    // Pulizia automatica del cestino (all'avvio e poi ogni ora)
    Trash.startPurgeJob();

    const server = app.listen(PORT, () => {
      console.log("==================================================");
      console.log("  GESTIONALE avviato correttamente");
      console.log(`  Apri il browser su: http://localhost:${PORT}`);
      console.log(
        `  Cestino: eliminazione definitiva dopo ${Trash.RETENTION_DAYS} giorni`,
      );
      console.log("==================================================");
    });

    // Chiusura pulita (Ctrl+C / deploy)
    const shutdown = () => server.close(() => db.close(() => process.exit(0)));
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  })
  .catch((err) => {
    console.error("Errore inizializzazione database:", err);
    process.exit(1);
  });
