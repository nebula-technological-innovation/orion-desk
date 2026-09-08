# Orion

Multi-currency mining pool console + self-custody vault + no-KYC swap surface.

This is a **prototype**. It does not run stratum, broadcast transactions, or custody funds.

Live alias: https://orion-desk-seven.vercel.app

## Run

```bash
cd artifacts/dev/orion
python3 -m http.server 4173
```

- Marketing site: `/`
- Ops pack: `/ops.html`
- App: `/app/#/`

## Surfaces

| Path | Job |
|---|---|
| `index.html` | Promise, coin table, honest limits |
| `ops.html` | Vendor shortlist, float rules, swap rails |
| `app/index.html` | Hash-routed console |

State key: `orion.v2` in `localStorage`.

Scripts: `scripts/core.js` → `scripts/views.js` → `scripts/bind.js`.

## What is real vs mocked

Real in this folder: information architecture, copy, vault generate/import/wipe on-device, worker list, swap and send forms, payouts table, live marks when APIs respond.

Mocked: shares, stratum hosts (`pool.orion.invalid`), addresses, fills, temperatures. Seed wordlist is a demo list, not BIP-39.

## Stack

Static HTML + CSS tokens. No bundler.

## Ops pack

- `ops.html` — vendor shortlist, float rules, swap rails, vault libraries
- `ops/orion-fpps-float.xlsx` — editable FPPS treasury model
