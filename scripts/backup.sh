#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"
BACKUP_DIR=${BACKUP_DIR:-"$ROOT_DIR/backups"}
mkdir -p "$BACKUP_DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

set -a
. ./.env
set +a

docker compose exec -T db pg_dump -U "${POSTGRES_USER:-backend_kpi}" -d "${POSTGRES_DB:-backend_kpi}" --format=custom > "$BACKUP_DIR/backend-kpi-$STAMP.dump"
docker compose exec -T redis redis-cli BGSAVE >/dev/null
echo "$BACKUP_DIR/backend-kpi-$STAMP.dump"
