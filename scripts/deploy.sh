#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Engine and Docker Compose first." >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.production.example .env
  echo "Created .env from .env.production.example. Set POSTGRES_PASSWORD and Jira values, then rerun."
  exit 2
fi

set -a
. ./.env
set +a

if [ "${POSTGRES_PASSWORD:-}" = "" ] || [ "${POSTGRES_PASSWORD:-}" = "replace-with-a-long-random-password" ]; then
  echo "Set a strong POSTGRES_PASSWORD in .env before deploying." >&2
  exit 1
fi

docker compose pull db redis
docker compose build --pull
docker compose up -d
docker compose ps
./scripts/healthcheck.sh
