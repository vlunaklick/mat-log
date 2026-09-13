#!/usr/bin/env bash
# Build Mat Log and ship it to bjj.vmoon.tech (nginx + Node API + Postgres behind the Coolify Traefik proxy).
# Secrets live only in /opt/bjj/.env on the VPS (see deploy/.env.example).
set -euo pipefail
cd "$(dirname "$0")"
HOST=crecenly-apps
REMOTE=/opt/bjj

npm run build
ssh "$HOST" "mkdir -p $REMOTE/app/server $REMOTE/app/src/lib $REMOTE/dist"
rsync -az deploy/nginx.conf "$HOST:$REMOTE/nginx.conf"
rsync -az deploy/docker-compose.yml "$HOST:$REMOTE/docker-compose.yml"
rsync -az --delete --exclude node_modules --exclude .env server/ "$HOST:$REMOTE/app/server/"
rsync -az --delete src/lib/ "$HOST:$REMOTE/app/src/lib/"
rsync -az --delete dist/ "$HOST:$REMOTE/dist/"
ssh "$HOST" "cd $REMOTE && docker compose build --quiet api && docker compose up -d --remove-orphans && docker compose ps"
echo "Deployed: https://bjj.vmoon.tech"
