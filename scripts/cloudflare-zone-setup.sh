#!/usr/bin/env bash
#
# One-off setup of zone-level security & performance settings for hena.dev,
# per §10.4 of the spec.  Requires CLOUDFLARE_API_TOKEN with the
# `Zone:Zone Settings:Edit` permission scoped to the hena.dev zone.
#
# Usage:
#   CLOUDFLARE_API_TOKEN=xxx bash scripts/cloudflare-zone-setup.sh
#
# Idempotent: re-running re-applies the same settings.
set -euo pipefail

ZONE_NAME="${ZONE_NAME:-hena.dev}"
API="https://api.cloudflare.com/client/v4"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN is not set" >&2
  exit 1
fi

auth=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json")

echo "Looking up zone id for ${ZONE_NAME}..."
zone_resp=$(curl -fsS "${auth[@]}" "${API}/zones?name=${ZONE_NAME}")
zone_id=$(echo "${zone_resp}" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["result"][0]["id"])')
echo "  zone_id=${zone_id}"

apply_setting() {
  local key="$1" body="$2"
  echo "  setting ${key}..."
  curl -fsS -X PATCH "${auth[@]}" \
    "${API}/zones/${zone_id}/settings/${key}" \
    --data "${body}" >/dev/null
  echo "    OK"
}

echo "Applying security headers..."
# HSTS — Strict-Transport-Security: max-age=15552000; includeSubDomains; preload
apply_setting security_header '{
  "value": {
    "strict_transport_security": {
      "enabled": true,
      "max_age": 15552000,
      "include_subdomains": true,
      "preload": true,
      "nosniff": true
    }
  }
}'

# Force HTTPS, automatic HTTPS rewrites, TLS 1.2+
apply_setting always_use_https           '{"value":"on"}'
apply_setting automatic_https_rewrites   '{"value":"on"}'
apply_setting min_tls_version            '{"value":"1.2"}'
apply_setting opportunistic_encryption   '{"value":"on"}'

echo "Applying performance settings..."
apply_setting brotli                     '{"value":"on"}'
apply_setting http3                      '{"value":"on"}'
apply_setting "0rtt"                     '{"value":"on"}'
apply_setting early_hints                '{"value":"on"}'
apply_setting websockets                 '{"value":"on"}'

echo
echo "Done.  All zone-level settings applied for ${ZONE_NAME}."
