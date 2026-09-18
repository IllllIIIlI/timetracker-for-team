#!/bin/sh
# Keeps a Cloudflare DNS A record pointed at this machine's current public IP.
# Meant to run periodically via cron (see deploy/README.md).
set -eu

ENV_FILE="${DDNS_ENV_FILE:-/etc/timetracker-ddns.env}"
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

: "${CF_API_TOKEN:?Set CF_API_TOKEN (Cloudflare API token, Zone:DNS:Edit for the zone)}"
: "${CF_ZONE_ID:?Set CF_ZONE_ID (Cloudflare zone ID for the domain)}"
: "${CF_RECORD_NAME:?Set CF_RECORD_NAME (e.g. timet.space)}"

CURRENT_IP=$(curl -s https://api.ipify.org)
if [ -z "$CURRENT_IP" ]; then
  echo "Could not determine current public IP" >&2
  exit 1
fi

RECORD=$(curl -s -X GET \
  "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records?type=A&name=$CF_RECORD_NAME" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json")

RECORD_ID=$(echo "$RECORD" | grep -o '"id":"[a-f0-9]*"' | head -1 | cut -d'"' -f4)
RECORD_IP=$(echo "$RECORD" | grep -o '"content":"[0-9.]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RECORD_ID" ]; then
  echo "Could not find an A record for $CF_RECORD_NAME in zone $CF_ZONE_ID" >&2
  echo "$RECORD" >&2
  exit 1
fi

if [ "$CURRENT_IP" = "$RECORD_IP" ]; then
  echo "IP unchanged ($CURRENT_IP)"
  exit 0
fi

curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"type\":\"A\",\"name\":\"$CF_RECORD_NAME\",\"content\":\"$CURRENT_IP\",\"ttl\":300,\"proxied\":false}" \
  > /dev/null

echo "Updated $CF_RECORD_NAME: $RECORD_IP -> $CURRENT_IP"
