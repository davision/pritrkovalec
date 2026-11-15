#!/usr/bin/env bash
# Deploy Zvonko to zvonko.si (DirectAdmin + CloudLinux Node.js selector, LiteSpeed).
#
#   frontend  dist/  →  ~/domains/zvonko.si/public_html   (served directly by LiteSpeed: fast)
#   backend   server.cjs + package*.json  →  ~/zvonko       (Node/Passenger; gets every request
#                                                           that isn't a real file, e.g. /api/*)
#
# Needs the `zvonko` host in ~/.ssh/config (key ~/.ssh/zvonko_deploy).
# Usage: npm run deploy            (build + deploy)
#        SKIP_BUILD=1 npm run deploy
set -euo pipefail
cd "$(dirname "$0")/.."

HOST=zvonko
WEB='domains/zvonko.si/public_html'
APP='zvonko'
VENV='nodevenv/zvonko/26/bin/activate'

if [[ -z "${SKIP_BUILD:-}" ]]; then
  npm run build
fi

echo "→ frontend"
# .htaccess is managed by the hosting (Passenger block) + the snippet below: never touch/delete it
rsync -az --delete-after --exclude='/.htaccess' --exclude='/assets/.htaccess' dist/ "$HOST:$WEB/"

echo "→ backend"
changed=$(rsync -az --itemize-changes server.cjs package.json package-lock.json "$HOST:$APP/" | grep -c 'package' || true)

ssh "$HOST" bash -s -- "$WEB" "$APP" "$VENV" "$changed" <<'REMOTE'
set -euo pipefail
WEB=$1 APP=$2 VENV=$3 CHANGED=$4
cd ~

# cache headers: hashed build assets forever, entry files always revalidated
printf 'Header set Cache-Control "public, max-age=31536000, immutable"\n' > "$WEB/assets/.htaccess"
ht="$WEB/.htaccess"
sed -i '/# ZVONKO BEGIN/,/# ZVONKO END/d' "$ht"
cat >> "$ht" <<'EOF'
# ZVONKO BEGIN (managed by scripts/deploy.sh)
<FilesMatch "\.(html|webmanifest)$">
  Header set Cache-Control "no-cache"
</FilesMatch>
# ZVONKO END
EOF

if [[ "$CHANGED" != 0 ]]; then
  echo "  package.json changed → npm install"
  set +u; source "$VENV"; set -u   # CloudLinux activate script reads unset vars
  (cd "$APP" && npm install --omit=dev --no-audit --no-fund)
fi

mkdir -p "$APP/tmp" && touch "$APP/tmp/restart.txt"   # Passenger restarts on next request
REMOTE

echo "→ check"
curl -fsS -o /dev/null -w "  /            %{http_code}\n" https://zvonko.si/
curl -fsS -w "  /api/health  %{http_code}\n" https://zvonko.si/api/health
