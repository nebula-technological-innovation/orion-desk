# Debug: orion.nebulahq.work Cloudflare 502

Captured 2026-09-23 21:26 MDT.

## What is not broken

Vercel is fine. Sending `Host: orion.nebulahq.work` + SNI `orion.nebulahq.work` to Vercel anycast returns **200** and the 8336-byte marketing page:

- `76.76.21.61` (`cname.vercel-dns.com`)
- `66.33.60.130` (`cname.vercel-dns.com`)
- `64.29.17.131` / `216.198.79.131` (`orion-desk-seven.vercel.app`)

The domain is **verified** on project `orion-desk`. Alias https://orion-desk-seven.vercel.app returns 200 with `x-vercel-id`.

Apex https://nebulahq.work returns 200 through Cloudflare (`cf-cache: HIT`). Same public CF IPs as `orion`.

## What is broken

`https://orion.nebulahq.work/` returns Cloudflare-branded **502 Bad gateway**.

| Signal | Value | Meaning |
|---|---|---|
| Public A/AAAA | `104.21.4.75`, `172.67.131.197` (and v6 `2606:4700:…`) | Orange-cloud / proxied. Same anycast as the apex. |
| Public CNAME | none | Record is flattened behind the proxy. |
| `Server` | `cloudflare` | Edge generated the page. |
| `x-vercel-id` | missing | Request never completed at Vercel. |
| `Server-Timing` | `cfEdge;dur=31, cfOrigin;dur=192` (HTTPS also seen ~3414ms) | Cloudflare *did* contact some origin, then rejected the response. |
| Page title | `nebulahq.work \| 502: Bad gateway` | Zone-level CF error page, not a Vercel 404. |
| Earlier status | 530 / 1016 | Origin DNS used to be missing. Now an origin exists but answers badly. |

This is not a Vercel outage and not a missing project domain.

## Cause

Cloudflare is proxying `orion` to an origin that is **not** a healthy Vercel hop.

Typical zone states that produce exactly this:

1. Orange-cloud CNAME `orion` → `cname.vercel-dns.com` or `orion-desk-seven.vercel.app`. Cloudflare connecting to Vercel as a second CDN is a known 502/525 class. Vercel’s documented pattern is **DNS-only**.
2. Orange-cloud CNAME `orion` → `nebulahq.work` or another name already on Cloudflare. Origin becomes a Cloudflare IP. That is a proxy loop (1000/502).
3. Orange-cloud A record to a dead tunnel / old Caddy / empty box. Apex works; this name’s origin does not.

Public DNS cannot show the *origin* target because the proxy hides it. Only the Cloudflare DNS row for `orion` will.

## Fix (Cloudflare DNS, `nebulahq.work` zone)

1. Delete leftover **A / AAAA** rows named `orion`.
2. Create or edit:

| Type | Name | Target | Proxy |
|---|---|---|
| CNAME | `orion` | `cname.vercel-dns.com` | **DNS only** (grey cloud) |

3. SSL/TLS on the zone can stay as it is for the apex. Do not put Orion behind Full/Flexible to Vercel; grey-cloud skips CF origin TLS entirely.
4. Wait for TTL (currently 300s). Public lookup should then show Vercel IPs (`76.76.21.x` / `66.33.60.x`), not `104.21` / `172.67`.
5. Confirm `https://orion.nebulahq.work` returns the Orion H1 and an `x-vercel-id` header.

Do not orange-cloud this name. Cloudflare in front of Vercel is the 502.
