#!/usr/bin/env bash
# Upload sources, then ask Coolify to deploy its managed Mat Log service.
set -euo pipefail
cd "$(dirname "$0")"
HOST=crecenly-apps
SERVICE=peohorsmczbc4vvmhczqtxz7
REMOTE="/data/coolify/services/$SERVICE"

npm run build
ssh "$HOST" "test -f $REMOTE/docker-compose.yml && mkdir -p $REMOTE/app/server $REMOTE/app/src/lib $REMOTE/dist"
rsync -az deploy/nginx.conf "$HOST:$REMOTE/nginx.conf"
rsync -az --delete --exclude node_modules --exclude .env server/ "$HOST:$REMOTE/app/server/"
rsync -az --delete src/lib/ "$HOST:$REMOTE/app/src/lib/"
rsync -az --delete dist/ "$HOST:$REMOTE/dist/"
scp deploy/docker-compose.yml "$HOST:/tmp/mat-log-compose.yml"
scp deploy/coolify-deploy.php "$HOST:/tmp/mat-log-deploy.php"
ssh "$HOST" 'set -eu
  docker cp /tmp/mat-log-compose.yml coolify:/tmp/mat-log-compose.yml
  docker cp /tmp/mat-log-deploy.php coolify:/tmp/mat-log-deploy.php
  docker exec coolify php /tmp/mat-log-deploy.php
'
echo "Deployment requested. Check status in Coolify:"
echo "https://coolify.vmoon.tech/project/whbor1e1vtyhc3scyxppzoen/environment/eweqghafzlevkffaye7hfvum/service/$SERVICE"
