const express = require("express");
const Trash = require("../db/trash");

/**
 * API del CESTINO (montata su /api/cestino)
 *
 *  GET    /api/cestino                 elenco (?page &limit &q &table)
 *  GET    /api/cestino/count           numero di elementi nel cestino
 *  GET    /api/cestino/summary         riepilogo per la dashboard
 *  POST   /api/cestino/restore-all     ripristina tutto ciò che è ripristinabile
 *  POST   /api/cestino/restore-selected  { ids }  ripristina più elementi (quelli che si può)
 *  POST   /api/cestino/delete-selected   { ids }  elimina definitivamente più elementi
 *  POST   /api/cestino/:id/restore     ripristina un elemento (se i riferimenti esistono)
 *  DELETE /api/cestino/:id             elimina definitivamente un elemento
 *  DELETE /api/cestino                 svuota il cestino
 */
const router = express.Router();

const handle = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (err) {
    if (err instanceof Trash.HttpError) {
      return res.status(err.status).json({ error: err.message, ...err.extra });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

router.get(
  "/",
  handle((req) =>
    Trash.list({
      page: Math.max(parseInt(req.query.page, 10) || 1, 1),
      limit: Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 200),
      q: String(req.query.q || "").trim(),
      table: String(req.query.table || ""),
    }),
  ),
);

router.get(
  "/count",
  handle(() => Trash.count()),
);

router.get(
  "/summary",
  handle(() => Trash.summary()),
);

router.post(
  "/restore-selected",
  handle((req) => Trash.restoreMany((req.body || {}).ids)),
);

router.post(
  "/delete-selected",
  handle((req) => Trash.deleteMany((req.body || {}).ids)),
);

router.post(
  "/restore-all",
  handle(() => Trash.restoreAll()),
);

router.post(
  "/:id/restore",
  handle((req) => Trash.restoreOne(Number(req.params.id))),
);

router.delete(
  "/:id",
  handle((req) => Trash.deletePermanently(Number(req.params.id))),
);

router.delete(
  "/",
  handle(() => Trash.emptyTrash()),
);

module.exports = router;
