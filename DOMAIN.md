# Point Orion at a Nebula subdomain

Intended host: **https://orion.nebulahq.work**

`desk.nebulahq.work` already serves AetherDesk. Do not reuse it.

## What is already true

- Apex `nebulahq.work` is live on Cloudflare nameservers (`coby` / `fatima.ns.cloudflare.com`).
- `orion.nebulahq.work` already resolves to Cloudflare proxy IPs.
- Fetching it returns **Cloudflare 530** — hostname exists, origin is not wired.
- Vercel project `orion-desk` (`prj_NqbQH2WDzN6TOUxuQkZnKqpuKRTc`) currently has only `*.vercel.app` aliases. The connected Vercel tools cannot add a custom domain.

## Script (if you have tokens)

```bash
cd artifacts/dev/orion
chmod +x scripts/attach-orion-host.sh
VERCEL_TOKEN=… CF_API_TOKEN=… CF_ZONE_ID=… ./scripts/attach-orion-host.sh
```

Do not paste tokens into chat. Vercel-only still helps: the script adds the domain even if Cloudflare is done by hand.

## Two clicks (you)

### 1. Vercel — add the domain

1. Open [Vercel → orion-desk → Domains](https://vercel.com/christian-roes-projects/orion-desk/settings/domains)
2. Add `orion.nebulahq.work`
3. Leave `www.orion.nebulahq.work` off

Vercel will ask for a CNAME to `cname.vercel-dns.com`.

### 2. Cloudflare — aim the name at Vercel

In the `nebulahq.work` zone:

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `orion` | `cname.vercel-dns.com` | **DNS only** (grey cloud) |

Orange-cloud proxy on a Vercel CNAME is what produces the current 530. Grey-cloud it.

If a leftover A/AAAA for `orion` exists, delete those first.

## After it answers

Canonical URLs:

- https://orion.nebulahq.work
- https://orion.nebulahq.work/app/#/
- https://orion.nebulahq.work/ops.html

Keep https://orion-desk-seven.vercel.app as the raw alias.

This remains a prototype desk, not a live pool.
