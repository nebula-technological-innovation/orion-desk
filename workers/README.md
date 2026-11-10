# Orion workers

Prototype services under the desk. Not a live pool.

## pool-ledger.js

Multi-currency share ledger. One Durable Object per tenant.

| Method | Path | Body / query | Effect |
|---|---|---|---|
| POST | `/share?tenant=` | `{ coin, worker, difficulty, address }` | Record share, credit address, merge-credit DOGE on LTC |
| POST | `/mature?tenant=` | `{ coin }` | Move balances ≥ min into payout buffer, arm 10s alarm |
| GET | `/balances?tenant=` | — | Current credits |
| GET | `/workers?tenant=` | — | Worker share counts |
| GET | `/recent?tenant=&coin=` | — | Last 20 shares for coin |

Payout id is `coin:address:amount` (stable). Alarm sends one Queue message, deletes buffer only after send succeeds. Consumer checks `seen` by `batchId` before any broadcast.

Coins: BTC, LTC, DOGE (merge), KAS. PPLNS window: last 1000 shares per coin.

## batch-idempotent.js

Generic debounce batch used as the pattern reference. Same delete-after-send and seen-table rules.

## Deploy

```bash
cd artifacts/dev/orion
npx wrangler d1 create orion-seen
# paste database_id into pool-ledger.wrangler.jsonc
npx wrangler d1 execute orion-seen --file=workers/schema.sql
npx wrangler queues create orion-payouts
npx wrangler queues create orion-payouts-dlq
npx wrangler deploy --config workers/pool-ledger.wrangler.jsonc
```

## Honest

- No stratum server.
- No node connection.
- Credit weights are placeholders until block value and network difficulty are wired.
- FPPS is a treasury decision. See `ops/FLOAT.md`. Do not offer it below the table.
- User vault seeds never reach these workers.
