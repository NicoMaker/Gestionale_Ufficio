/**
 * Test automatico delle regole del cestino (usa un database temporaneo).
 * Uso:  npm test
 */
const os = require("os");
const path = require("path");
const fs = require("fs");
const assert = require("assert");

process.env.DB_PATH = path.join(
  os.tmpdir(),
  `gestionale-test-${Date.now()}.db`,
);
process.env.TRASH_RETENTION_DAYS = "15";

const { initDatabase, db } = require("../db/init");
const Trash = require("../db/trash");

const run = (sql, p = []) =>
  new Promise((res, rej) =>
    db.run(sql, p, function (e) {
      e ? rej(e) : res(this.lastID);
    }),
  );
const get = (sql, p = []) =>
  new Promise((res, rej) => db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const active = async (t, id) =>
  Boolean(await get(`SELECT 1 x FROM ${t} WHERE id=?`, [id]));
const rejects = async (fn, status) => {
  try {
    await fn();
  } catch (e) {
    assert.strictEqual(e.status, status, e.message);
    return e;
  }
  assert.fail(`atteso errore ${status}`);
};
const trashId = async (t, id) =>
  (
    await get(`SELECT id FROM cestino WHERE table_name=? AND record_id=?`, [
      t,
      id,
    ])
  )?.id;

let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log(`  ✔ ${name}`);
}

(async () => {
  await initDatabase();
  const cat = await run(`INSERT INTO categorie_clienti (nome) VALUES ('Cat')`);
  const cli = await run(
    `INSERT INTO clienti (ragione_sociale, categoria_id) VALUES ('Cli', ?)`,
    [cat],
  );
  const con = await run(
    `INSERT INTO contatti (nome, cognome, cliente_id) VALUES ('A','B', ?)`,
    [cli],
  );

  console.log("Cestino — test regole");

  await test("non si elimina un record con collegamenti > 0 (409)", async () => {
    const e = await rejects(
      () => Trash.moveToTrash("categorie_clienti", cat),
      409,
    );
    assert.strictEqual(e.extra.code, "COLLEGATO");
    assert.ok(await active("categorie_clienti", cat));
  });

  await test("eliminazione multipla: figli prima, poi il padre si libera", async () => {
    await Trash.moveManyToTrash("contatti", [con]);
    const r1 = await Trash.moveManyToTrash("clienti", [cli]);
    assert.strictEqual(r1.moved, 1);
    const r2 = await Trash.moveManyToTrash("categorie_clienti", [cat]);
    assert.strictEqual(r2.moved, 1);
    assert.strictEqual((await Trash.count()).total, 3);
  });

  await test("eliminazione multipla: il padre collegato viene saltato, non eliminato", async () => {
    const c2 = await run(
      `INSERT INTO categorie_clienti (nome) VALUES ('Cat2')`,
    );
    await run(
      `INSERT INTO clienti (ragione_sociale, categoria_id) VALUES ('Cli2', ?)`,
      [c2],
    );
    const r = await Trash.moveManyToTrash("categorie_clienti", [c2]);
    assert.strictEqual(r.moved, 0);
    assert.strictEqual(r.blocked, 1);
    assert.ok(await active("categorie_clienti", c2));
  });

  await test("figlio NON ripristinabile se il padre è nel cestino", async () => {
    const tid = await trashId("contatti", con);
    const e = await rejects(() => Trash.restoreOne(tid), 409);
    assert.strictEqual(e.extra.code, "NON_RIPRISTINABILE");
    assert.strictEqual(e.extra.missing[0].in_trash, true);
  });

  await test("ripristino selezionati: solo il figlio → saltato, niente cambia", async () => {
    const r = await Trash.restoreMany([await trashId("contatti", con)]);
    assert.strictEqual(r.restored, 0);
    assert.strictEqual(r.skipped, 1);
    assert.ok(!(await active("contatti", con)));
  });

  await test("ripristino selezionati in disordine: padri prima dei figli", async () => {
    const ids = [
      await trashId("contatti", con),
      await trashId("clienti", cli),
      await trashId("categorie_clienti", cat),
    ];
    const r = await Trash.restoreMany(ids);
    assert.strictEqual(r.restored, 3);
    assert.ok(await active("contatti", con));
    // stesso ID originale
    assert.ok(await active("clienti", cli));
  });

  await test("padre eliminato definitivamente → figlio non più ripristinabile", async () => {
    await Trash.moveManyToTrash("contatti", [con]);
    await Trash.moveManyToTrash("clienti", [cli]);
    const del = await Trash.deleteMany([await trashId("clienti", cli)]);
    assert.strictEqual(del.dipendenti_non_ripristinabili, 1);
    const list = await Trash.list();
    const item = list.data.find((i) => i.table_name === "contatti");
    assert.strictEqual(item.restorable, false);
    assert.strictEqual(item.missing[0].in_trash, false);
    await rejects(() => Trash.restoreOne(item.id), 409);
    const all = await Trash.restoreAll();
    assert.ok(all.skipped >= 1);
  });

  await test("ripristina tutto: ripristina solo il possibile", async () => {
    const list = await Trash.list();
    const restorableNow = list.data.filter((i) => i.restorable).length;
    const r = await Trash.restoreAll();
    assert.strictEqual(r.restored, restorableNow);
  });

  await test("scadenza automatica dopo 15 giorni", async () => {
    const u = await run(
      `INSERT INTO unita_misura (nome, simbolo) VALUES ('X','x')`,
    );
    await Trash.moveToTrash("unita_misura", u);
    const row = await get(
      `SELECT deleted_at, expires_at FROM cestino WHERE table_name='unita_misura'`,
    );
    const days =
      (new Date(row.expires_at) - new Date(row.deleted_at)) / 86400000;
    assert.strictEqual(days, 15);
    await run(
      `UPDATE cestino SET expires_at=? WHERE table_name='unita_misura'`,
      [new Date(Date.now() - 1000).toISOString()],
    );
    assert.strictEqual(await Trash.purgeExpired(), 1);
    assert.ok(!(await trashId("unita_misura", u)));
  });

  await test("riepilogo dashboard coerente", async () => {
    const s = await Trash.summary();
    assert.strictEqual(s.total, s.restorable + s.not_restorable);
  });

  console.log(`\n${passed} test superati`);
  db.close(() => {
    try {
      fs.unlinkSync(process.env.DB_PATH);
    } catch (_) {}
    process.exit(0);
  });
})().catch((e) => {
  console.error("\n✖ FALLITO:", e.message);
  process.exit(1);
});
