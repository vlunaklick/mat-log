#!/usr/bin/env bash
# Build Mat Log and ship it to bjj.vmoon.tech (nginx behind the Coolify Traefik proxy on crecenly-apps).
set -euo pipefail
cd "$(dirname "$0")"
HOST=crecenly-apps
REMOTE=/opt/bjj

npm run build
rsync -az --delete dist/ "$HOST:$REMOTE/dist/"
ssh "$HOST" "docker compose -f $REMOTE/docker-compose.yml up -d && docker exec bjj-web nginx -s reload 2>/dev/null || true"
echo "Deployed: https://bjj.vmoon.tech"
