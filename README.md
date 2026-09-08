# Orion

Multi-currency mining pool console + self-custody vault + no-KYC swap surface.

This is a **prototype**. It does not run stratum, broadcast transactions, or custody funds.

## Run

```bash
python3 -m http.server 4173
```

- Marketing site: `/`
- App: `/app/#/`
- Ops: `/ops.html`

State key: `orion.v2` in `localStorage`.

## Ops pack

- `ops.html` — vendor shortlist, float rules, swap rails, vault libraries
- `ops/orion-fpps-float.xlsx` — editable FPPS treasury model (in workspace; binary not always in git)
