#!/usr/bin/env bash
# Attach orion.nebulahq.work → the orion-desk Vercel project.
# Does not store secrets. Reads tokens from the environment only.
#
# Required:
#   VERCEL_TOKEN     https://vercel.com/account/tokens
# Optional (Cloudflare DNS):
#   CF_API_TOKEN     Zone.DNS Edit on nebulahq.work
#   CF_ZONE_ID       from the nebulahq.work overview
#
# Usage:
#   chmod +x scripts/attach-orion-host.sh
#   VERCEL_TOKEN=… CF_API_TOKEN=… CF_ZONE_ID=… ./scripts/attach-orion-host.sh

set -euo pipefail

HOST="orion.nebulahq.work"
PROJECT_ID="prj_NqbQH2WDzN6TOUxuQkZnKqpuKRTc"
TEAM_ID="team_DzADOLvfP3eihNYpbHFTeOeM"
CNAME_TARGET="cname.vercel-dns.com"

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "Missing VERCEL_TOKEN. Create one at https://vercel.com/account/tokens"
  echo "Dashboard fallback: https://vercel.com/christian-roes-projects/orion-desk/settings/domains"
  exit 1
fi

echo "1/2  Vercel: add ${HOST} to orion-desk"
code=$(curl -sS -o /tmp/orion-vercel-domain.json -w "%{http_code}" \
  -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/domains?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${HOST}\"}")
echo "    HTTP ${code}"
python3 - <<'PY'
import json
p="/tmp/orion-vercel-domain.json"
try:
    d=json.load(open(p))
except Exception:
    print(open(p).read()[:400]); raise SystemExit
print("   ", d.get("name") or d.get("error",{}).get("message") or d)
PY

if [[ -z "${CF_API_TOKEN:-}" || -z "${CF_ZONE_ID:-}" ]]; then
  echo "2/2  Cloudflare skipped (set CF_API_TOKEN and CF_ZONE_ID)."
  echo "    Manual: CNAME orion → ${CNAME_TARGET}, proxy DNS-only (grey cloud)."
  exit 0
fi

echo "2/2  Cloudflare: upsert grey-cloud CNAME ${HOST} → ${CNAME_TARGET}"
list=$(curl -sS -H "Authorization: Bearer ${CF_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?name=${HOST}")
rid=$(python3 - <<'PY'
import json
d=json.load(open("/dev/stdin"))
recs=d.get("result") or []
print(recs[0]["id"] if recs else "")
PY <<< "$list")

payload=$(python3 - <<PY
import json
print(json.dumps({
  "type": "CNAME",
  "name": "orion",
  "content": "${CNAME_TARGET}",
  "proxied": False,
  "ttl": 1
}))
PY
)

if [[ -n "$rid" ]]; then
  curl -sS -X PUT "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${rid}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$payload" | python3 -c "import json,sys; d=json.load(sys.stdin); print('    ok' if d.get('success') else d)"
else
  curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$payload" | python3 -c "import json,sys; d=json.load(sys.stdin); print('    ok' if d.get('success') else d)"
fi

echo "Check: https://${HOST}  (expect the Orion marketing page, not Cloudflare 530)"
