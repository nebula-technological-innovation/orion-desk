# STATUS — Orion

Updated: 2026-11-09

## Now
- Desk: Farm, Pool, Vault, Desk, Payouts, Settings
- Settings: ledger URL field (persisted)
- Pool: share submit form + ledger worker stats
- Payouts: read-only balances from `GET /balances`
- Ledger: PPLNS window proportional credit, LTC→DOGE merge on parent window, stable payout ids
- Coins: BTC, LTC, DOGE (merge), KAS

## Done
- Desk v2
- FPPS float model and vendor shortlist
- Idempotent batch pattern
- Pool ledger v2
- Desk ↔ ledger wiring (settings, share post, balances, workers)
- PLATFORM.md

## Next
- Grey-cloud CNAME for orion.nebulahq.work
- Replace reward constants with block-value / network-diff when nodes exist
- Deploy ledger worker

## Blockers
- No live stratum
- No funded float
- Custom domain still proxied

## Honest
Not a live pool. The ledger records shares you feed it. It does not talk to ASICs, nodes, or user seeds.
