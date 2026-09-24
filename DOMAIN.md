# Point Orion at a Nebula subdomain

Intended host: **https://orion.nebulahq.work**

`desk.nebulahq.work` already serves AetherDesk. Do not reuse it.

## What is already true (2026-09-23)

- Apex `nebulahq.work` is on Cloudflare NS (`coby` / `fatima`). Vercel also lists the apex as an external verified domain for the team.
- `orion.nebulahq.work` is **on the orion-desk Vercel project and verified**.
- Public DNS for `orion` still answers Cloudflare proxy IPs. Fetches return **502** (was 530). Orange-cloud origin is not Vercel.
- Raw alias still works: https://orion-desk-seven.vercel.app

## One click left (Cloudflare)

Vercel step is done. In the `nebulahq.work` zone:

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `orion` | `cname.vercel-dns.com` | **DNS only** (grey cloud) |

Delete leftover A/AAAA for `orion` first. Leave the proxy grey. Orange cloud is the 502.

Optional token path: `scripts/attach-orion-host.sh` (Cloudflare half only now).

## After it answers

- https://orion.nebulahq.work
- https://orion.nebulahq.work/app/#/
- https://orion.nebulahq.work/ops.html

This remains a prototype desk, not a live pool.
