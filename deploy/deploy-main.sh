#!/usr/bin/env bash
# Installed as /usr/local/sbin/mat-log-deploy; invoked by a restricted SSH key.
set -euo pipefail
exec 9>/var/lock/mat-log-deploy.lock
flock -w 900 9
SERVICE=peohorsmczbc4vvmhczqtxz7
REMOTE=/data/coolify/services/$SERVICE
CHECKOUT=/opt/bjj/main-checkout
if [[ ! -d "$CHECKOUT/.git" ]]; then
  git clone --branch main --single-branch https://github.com/vlunaklick/mat-log.git "$CHECKOUT"
fi
cd "$CHECKOUT"
git fetch origin main
git reset --hard origin/main
REVISION=$(git rev-parse HEAD)
docker run --rm -v "$CHECKOUT:/app" -w /app node:24-slim sh -ec 'npm ci && npm run build'
test -f "$REMOTE/docker-compose.yml"
mkdir -p "$REMOTE/app/server" "$REMOTE/app/src/lib" "$REMOTE/dist"
rsync -a deploy/nginx.conf "$REMOTE/nginx.conf"
rsync -a --delete --exclude node_modules --exclude .env server/ "$REMOTE/app/server/"
rsync -a --delete src/lib/ "$REMOTE/app/src/lib/"
# Keep previous hashed assets for browser tabs running the prior version.
rsync -a dist/ "$REMOTE/dist/"
cp deploy/docker-compose.yml /tmp/mat-log-compose.yml
docker cp /tmp/mat-log-compose.yml coolify:/tmp/mat-log-compose.yml
docker cp deploy/coolify-deploy.php coolify:/tmp/mat-log-deploy.php
declare -A previous
for component in web api db; do
  previous[$component]=$(docker inspect --format '{{.Id}}' "$component-$SERVICE")
done
docker exec coolify php /tmp/mat-log-deploy.php
for attempt in $(seq 1 90); do
  healthy=true
  for component in web api db; do
    status=$(docker inspect --format '{{.State.Health.Status}}' "$component-$SERVICE" 2>/dev/null || true)
    current=$(docker inspect --format '{{.Id}}' "$component-$SERVICE" 2>/dev/null || true)
    [[ "$status" == healthy && "$current" != "${previous[$component]}" ]] || healthy=false
  done
  if $healthy && curl --fail --silent https://bjj.vmoon.tech/api/health >/dev/null; then
    printf '%s\n' "$REVISION" > "$REMOTE/deployed-revision"
    echo "Deployed $REVISION"
    exit 0
  fi
  sleep 5
done
echo 'Deployment did not become healthy within 450 seconds' >&2
exit 1
