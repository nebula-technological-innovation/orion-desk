# Orion FPPS float model

Snapshot: 2026-09-07. Yellow inputs below. Recalculate if network EH/s or BTC mark moves.

Editable workbook in the workspace: `artifacts/dev/orion/ops/orion-fpps-float.xlsx`  
CSV of the computed book: [`orion-fpps-float.csv`](orion-fpps-float.csv)

## Inputs

| Key | Value | Note |
|---|---|---|
| Network_EH | 930.7 | EH/s |
| BTC_USD | 79,110 | USD |
| Subsidy_BTC | 3.125 | BTC / block |
| Fee_BTC | 0.10 | fee proxy / block |
| Blocks_day | 144 | network target |
| Pool_fee | 1% | list fee |
| Lag_days | 1 | owed shares |
| Z | 2.33 | 99% one-tail |
| Horizon_days | 14 | no-block cover |
| Block_value | 3.225 BTC / $255,130 | S + F |

Expected blocks in D days: λ = (H_pool / H_net) × 144 × 14.  
P(zero) = e^(−λ).  
Recommended float = 14d liability + 1d lag + z√λ × block value.

## Computed book

| Pool hashrate | Share of net | E[blocks / 14d] | P(zero in 14d) | Daily liability | Recommended float | Offer FPPS? |
|---|---:|---:|---:|---:|---:|---|
| 100 TH/s | 0.000011% | 0.00022 | 99.98% | $4 | $8,808 | No. PPLNS or don’t take public hash. |
| 1 PH/s | 0.00011% | 0.0022 | 99.78% | $39 | $28,253 | No. |
| 10 PH/s | 0.0011% | 0.022 | 97.86% | $391 | $93,352 | No. |
| 100 PH/s | 0.011% | 0.22 | 80.5% | $3,908 | $335,286 | Only with an outside backstop. |
| 1 EH/s | 0.11% | 2.17 | 11.5% | $39,080 | $1.46M | Conditional. Fund the line. |
| 10 EH/s | 1.07% | 21.7 | ~0% | $390,795 | $8.63M | Standard FPPS if treasury is funded. |

## Policy

- Do not sell FPPS if P(zero in 14d) > 20%. That is the 100 TH–10 PH band on this network snapshot.
- 100 PH–1 EH: FPPS only with a named treasury sized to Recommended float, plus a kill switch to PPLNS if float < 10 days of liability.
- ≥ 1 EH and float funded: 1% can be the list price. Below 0.5% is vanity.
- Hot wallet ≤ 2 days of liability. Cold / multisig holds the rest. User seeds never land on pool boxes.
- LTC+DOGE merge starts PPLNS until that book has its own Poisson table. KAS stays PPLNS in v1.
