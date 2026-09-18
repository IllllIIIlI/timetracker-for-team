# Cloudflare DDNS for a dynamic home IP

Keeps `timet.space`'s DNS A record pointed at this machine's current public IP, so
Caddy's Let's Encrypt certificate keeps working after your ISP changes it.

## 1. Move the domain's nameservers to Cloudflare

1. Sign up at [cloudflare.com](https://dash.cloudflare.com/sign-up) (free plan is enough).
2. **Add a site** → enter `timet.space` → pick the **Free** plan.
3. Cloudflare scans existing DNS records and shows two nameservers
   (e.g. `xxx.ns.cloudflare.com`).
4. Log into InternetoVizijos, find the nameserver/DNS settings for `timet.space`, and
   replace the current nameservers with the two Cloudflare gave you.
5. Wait for Cloudflare to email you that the zone is active (usually minutes, can take
   up to 24h for DNS propagation).

## 2. Add the DNS record

In Cloudflare → **DNS** → **Records** → **Add record**:

- Type: `A`
- Name: `@` (root domain, i.e. `timet.space`)
- IPv4 address: your current public IP (`curl https://api.ipify.org`)
- Proxy status: **DNS only** (grey cloud, *not* orange) — Caddy needs to see real
  visitor connections directly to get its own certificate; Cloudflare's proxy would
  terminate TLS itself instead.

## 3. Create an API token for the DDNS script

Cloudflare → profile icon → **My Profile** → **API Tokens** → **Create Token** →
**Edit zone DNS** template → restrict it to the `timet.space` zone only → Create.
Copy the token (shown once).

Also grab the **Zone ID** from the domain's Overview page in Cloudflare (right sidebar).

## 4. Install the updater on the Pi

```bash
sudo tee /etc/timetracker-ddns.env > /dev/null <<'EOF'
CF_API_TOKEN=your-api-token-here
CF_ZONE_ID=your-zone-id-here
CF_RECORD_NAME=timet.space
EOF
sudo chmod 600 /etc/timetracker-ddns.env

chmod +x ~/timetracker/deploy/cloudflare-ddns.sh

# Run it once to confirm it works
~/timetracker/deploy/cloudflare-ddns.sh

# Then run it every 5 minutes via cron
(crontab -l 2>/dev/null; echo "*/5 * * * * $HOME/timetracker/deploy/cloudflare-ddns.sh >> $HOME/ddns.log 2>&1") | crontab -
```
