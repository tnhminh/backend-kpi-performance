#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

PORT=${HTTP_PORT:-8080}
URL="http://127.0.0.1:${PORT}/api/health"
attempt=1
while [ "$attempt" -le 30 ]; do
  if command -v curl >/dev/null 2>&1 && curl -fsS "$URL"; then
    echo
    exit 0
  fi
  attempt=$((attempt + 1))
  sleep 2
done

docker compose ps
docker compose logs --tail=80 backend
exit 1
