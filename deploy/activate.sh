#!/usr/bin/env bash
set -euo pipefail
release=${1:?Usage: activate.sh /opt/jieqi/releases/RELEASE}
case "$release" in /opt/jieqi/releases/*) ;; *) exit 2 ;; esac
test -f "$release/site/dist/server/index.js"
test -d "$release/site/dist/client/_next/static"
id jieqi >/dev/null 2>&1 || useradd --system --home-dir /opt/jieqi --shell /usr/sbin/nologin jieqi
install -d -o jieqi -g jieqi /opt/jieqi/shared
install -d -o jieqi -g jieqi /opt/jieqi/shared/uploads
mkdir -p /opt/jieqi/static "$release/public/assets"
cp -a "$release/site/public/assets/." "$release/public/assets/"
if [ ! -f /opt/jieqi/shared/api.env ]; then
  node --input-type=module <<'JS'
import {writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
writeFileSync('/opt/jieqi/shared/api.env', `ADMIN_TOKEN=${randomBytes(32).toString('hex')}\nHOST=127.0.0.1\nPORT=4318\nDATABASE_PATH=/opt/jieqi/shared/calendar.sqlite\nSTATIC_ORIGIN=https://static.jieqi.dev\n`, {mode:0o600,flag:'wx'});
JS
fi
chown jieqi:jieqi /opt/jieqi/shared/api.env
chown -R jieqi:jieqi "$release"
cd "$release"
runuser -u jieqi -- node --env-file=/opt/jieqi/shared/api.env deploy/bootstrap.ts
# Keep old hashed chunks available for visitors with an older page open.
cp -a site/dist/client/. /opt/jieqi/static/
cp -a public/assets/. /opt/jieqi/static/assets/
chmod -R a+rX /opt/jieqi/static
ln -sfn "$release" /opt/jieqi/current
install -m 644 deploy/jieqi-web.service deploy/jieqi-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now jieqi-api jieqi-web
systemctl restart jieqi-api jieqi-web
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4318/health >/dev/null && curl -fsS http://127.0.0.1:4319/ >/dev/null; then break; fi
  sleep 1
done
curl -fsS http://127.0.0.1:4318/health
curl -fsS http://127.0.0.1:4319/ -o /dev/null
config=/etc/caddy/sites/jieqi.caddy
if ! cmp -s deploy/jieqi.caddy "$config"; then
  if [ -f "$config" ]; then cp -a "$config" "/opt/jieqi/shared/jieqi.caddy.$(date -u +%Y%m%dT%H%M%SZ).bak"; fi
  install -m 644 deploy/jieqi.caddy "$config"
  # The active web server imports /etc/caddy/sites/*.caddy.
  if systemctl is-active --quiet caddy; then
    caddy validate --config /etc/caddy/Caddyfile
    systemctl reload caddy
  elif systemctl is-active --quiet frankenphp; then
    frankenphp validate --config /etc/frankenphp/Caddyfile
    systemctl reload frankenphp
  else
    echo 'Neither Caddy nor FrankenPHP is active' >&2
    exit 1
  fi
fi
node scripts/organize-assets.ts /opt/jieqi/static/assets
printf '\nJieqi services activated; verify public TLS and domains next.\n'
