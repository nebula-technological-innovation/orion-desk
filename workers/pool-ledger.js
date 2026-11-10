/**
 * Orion pool ledger v2 — multi-currency PPLNS + merge + idempotent payout.
 *
 * One Durable Object per tenant.
 * Shares are recorded per coin. LTC shares also credit DOGE (merge).
 * PPLNS window is the last WINDOW shares per coin.
 * Mature credits flush to Queue with a stable batchId.
 * No stratum. No user seeds.
 */

const WINDOW = 1000;
const COINS = {
  BTC:  { algo: "SHA-256",    unit: "TH/s", minPayout: 0.0001, merge: [], reward: 0.00001 },
  LTC:  { algo: "Scrypt",     unit: "GH/s", minPayout: 0.01,   merge: ["DOGE"], reward: 0.01 },
  DOGE: { algo: "Scrypt",     unit: "GH/s", minPayout: 10,     merge: [], reward: 10 },
  KAS:  { algo: "kHeavyHash", unit: "GH/s", minPayout: 10,     merge: [], reward: 1 },
};
// reward = expected coin units paid across one full window. Credit is share difficulty / window difficulty * reward.

export class PoolLedger {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS schema (v INTEGER);
        CREATE TABLE IF NOT EXISTS shares (
          id TEXT PRIMARY KEY,
          coin TEXT NOT NULL,
          worker TEXT NOT NULL,
          address TEXT NOT NULL,
          difficulty REAL NOT NULL,
          accepted INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS shares_coin_at ON shares (coin, created_at);
        CREATE TABLE IF NOT EXISTS credits (
          coin TEXT NOT NULL,
          address TEXT NOT NULL,
          amount REAL NOT NULL,
          PRIMARY KEY (coin, address)
        );
        CREATE TABLE IF NOT EXISTS payout_buf (
          id TEXT PRIMARY KEY,
          coin TEXT NOT NULL,
          address TEXT NOT NULL,
          amount REAL NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS workers (
          id TEXT PRIMARY KEY,
          coin TEXT NOT NULL,
          last_share INTEGER NOT NULL,
          shares INTEGER NOT NULL,
          difficulty REAL NOT NULL
        );
      `);
      const ver = this.sql.exec("SELECT v FROM schema").one();
      if (!ver) this.sql.exec("INSERT INTO schema (v) VALUES (2)");
    });
  }

  async recordShare(coin, worker, difficulty, address) {
    if (!COINS[coin]) throw new Error(`unsupported coin: ${coin}`);
    const now = Date.now();
    const id = crypto.randomUUID();
    this.sql.exec(
      "INSERT INTO shares (id, coin, worker, address, difficulty, accepted, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
      id, coin, worker, address, difficulty, now,
    );
    this.sql.exec(
      `INSERT INTO workers (id, coin, last_share, shares, difficulty)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(id) DO UPDATE SET
         last_share = excluded.last_share,
         shares = shares + 1,
         difficulty = excluded.difficulty`,
      worker, coin, now, difficulty,
    );
    this.credit(coin, address, difficulty, coin);
    for (const m of COINS[coin].merge) this.credit(m, address, difficulty, coin);
    this.trim(coin);
    return { id, coin, difficulty, merge: COINS[coin].merge, credit: this.lastCredit };
  }

  credit(coin, address, difficulty, windowCoin) {
    const sum = this.sql.exec(
      "SELECT COALESCE(SUM(difficulty), 0) AS s FROM shares WHERE coin = ?", windowCoin,
    ).one().s || difficulty;
    const reward = COINS[coin]?.reward || 0;
    const amount = sum > 0 ? (difficulty / sum) * reward : 0;
    if (coin === windowCoin) this.lastCredit = amount;
    this.sql.exec(
      `INSERT INTO credits (coin, address, amount) VALUES (?, ?, ?)
       ON CONFLICT(coin, address) DO UPDATE SET amount = amount + excluded.amount`,
      coin, address, amount,
    );
  }

  trim(coin) {
    const n = this.sql.exec("SELECT COUNT(*) AS c FROM shares WHERE coin = ?", coin).one().c;
    if (n > WINDOW) {
      this.sql.exec(
        `DELETE FROM shares WHERE coin = ? AND id IN (
           SELECT id FROM shares WHERE coin = ? ORDER BY created_at ASC LIMIT ?
         )`,
        coin, coin, n - WINDOW,
      );
    }
  }

  async mature(coin) {
    if (!COINS[coin]) throw new Error(`unsupported coin: ${coin}`);
    const min = COINS[coin].minPayout;
    const due = this.sql
      .exec("SELECT address, amount FROM credits WHERE coin = ? AND amount >= ?", coin, min)
      .toArray();
    const now = Date.now();
    for (const row of due) {
      // Stable id: coin + address + rounded amount. Retry of the same mature is the same row.
      const amt = Math.round(row.amount * 1e8) / 1e8;
      const id = `${coin}:${row.address}:${amt}`;
      this.sql.exec(
        "INSERT OR IGNORE INTO payout_buf (id, coin, address, amount, created_at) VALUES (?, ?, ?, ?, ?)",
        id, coin, row.address, amt, now,
      );
      this.sql.exec("UPDATE credits SET amount = 0 WHERE coin = ? AND address = ?", coin, row.address);
    }
    if (due.length && (await this.ctx.storage.getAlarm()) == null) {
      await this.ctx.storage.setAlarm(now + 10_000);
    }
    return { coin, queued: due.length };
  }

  async alarm() {
    const rows = this.sql
      .exec("SELECT id, coin, address, amount FROM payout_buf ORDER BY id")
      .toArray();
    if (rows.length === 0) return;

    const batchId = rows.map((r) => r.id).join(",");
    await this.env.QUEUE.send({
      batchId,
      rows: rows.map((r) => ({ id: r.id, coin: r.coin, address: r.address, amount: r.amount })),
      tenant_id: this.ctx.id.name,
      correlation_id: batchId,
    });

    const ph = rows.map(() => "?").join(",");
    this.sql.exec(`DELETE FROM payout_buf WHERE id IN (${ph})`, ...rows.map((r) => r.id));
  }

  async balances() {
    return this.sql.exec("SELECT coin, address, amount FROM credits ORDER BY coin, address").toArray();
  }

  async workers() {
    return this.sql.exec("SELECT id, coin, last_share, shares, difficulty FROM workers ORDER BY coin, id").toArray();
  }

  async recent(coin, limit = 20) {
    return this.sql
      .exec("SELECT id, coin, worker, address, difficulty, created_at FROM shares WHERE coin = ? ORDER BY created_at DESC LIMIT ?", coin, limit)
      .toArray();
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const tenant = url.searchParams.get("tenant") || "default";
    const stub = env.LEDGER.getByName(tenant);

    if (request.method === "POST" && url.pathname === "/share") {
      const { coin, worker, difficulty, address } = await request.json();
      if (!coin || !worker || !difficulty || !address) return new Response("missing fields", { status: 400 });
      return Response.json(await stub.recordShare(coin, worker, Number(difficulty), address));
    }
    if (request.method === "POST" && url.pathname === "/mature") {
      const { coin } = await request.json();
      return Response.json(await stub.mature(coin));
    }
    if (request.method === "GET" && url.pathname === "/balances") return Response.json(await stub.balances());
    if (request.method === "GET" && url.pathname === "/workers") return Response.json(await stub.workers());
    if (request.method === "GET" && url.pathname === "/recent") {
      const coin = url.searchParams.get("coin") || "BTC";
      return Response.json(await stub.recent(coin));
    }
    return new Response("orion pool ledger v2");
  },

  async queue(batch, env) {
    for (const msg of batch.messages) {
      const { batchId, rows, tenant_id } = msg.body;
      const seen = await env.DB.prepare("SELECT 1 FROM seen WHERE batch_id = ?").bind(batchId).first();
      if (seen) { msg.ack(); continue; }

      // Broadcast goes here. Idempotency-Key = batchId. User seeds never arrive.
      await env.DB.prepare("INSERT INTO seen (batch_id, tenant_id, at) VALUES (?, ?, ?)")
        .bind(batchId, tenant_id, Date.now()).run();
      msg.ack();
    }
  },
};
