# Orion platform

Multi-currency pool desk + ledger. Prototype. Not a live pool.

## Layers

| Layer | What it is | What it is not |
|---|---|---|
| Desk | Farm, Pool, Vault, Desk, Payouts. Local vault. Live marks. | Stratum, custody, exchange book |
| Ledger | Durable Object. PPLNS window credit. LTC→DOGE merge. Idempotent payout flush. | Node, ASIC, user seed |
| Queue | At-least-once delivery. Seen table + external idempotency key. | Exactly-once by itself |
| Float | `ops/FLOAT.md`. FPPS only when treasury covers the table. | A reason to sell FPPS at 100 TH |

## Coins

| Coin | Algo | Scheme | Merge |
|---|---|---|---|
| BTC | SHA-256 | PPLNS (FPPS only with funded float) | — |
| LTC | Scrypt | PPLNS | DOGE |
| DOGE | Scrypt | PPLNS (credited on LTC shares) | — |
| KAS | kHeavyHash | PPLNS | — |

## Desk → ledger

Settings → Ledger URL → worker origin.

- Pool page: post a share, show worker stats.
- Payouts page: read balances.

```js
localStorage.setItem("orion.ledger", "https://orion-pool-ledger.workers.dev")
```

## Credit

\[
\text{amount} = \frac{\text{share difficulty}}{\text{window difficulty sum}} \times \text{reward}
\]

Window = last 1,000 shares per coin. Merge uses the parent window. `reward` is a placeholder until block value and network difficulty are wired.

## Do not

- Claim a live pool.
- Put user seeds on pool boxes.
- Offer FPPS below the float table.
- Treat the Queue ack as economic evidence.
