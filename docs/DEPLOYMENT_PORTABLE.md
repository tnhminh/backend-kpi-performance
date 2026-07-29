# Portable production deployment

## What is included

- `web`: Nginx serving the static frontend and proxying `/api`.
- `backend`: Node.js API using PostgreSQL and Redis.
- `db`: PostgreSQL 16 with a schema created automatically at startup.
- `redis`: Redis 7 with AOF persistence, used for health and sync locking.
- `scripts/deploy.sh`: one-command build, start and health check.
- `scripts/backup.sh`: PostgreSQL backup.

## Deploy on a new Linux server

Requirements: Docker Engine, Docker Compose v2, Git and a server route to Jira Data Center. Linux/macOS use `.sh`; Windows uses `.ps1`.

```sh
git clone <repository-url>
cd backend-kpi-performance
cp .env.production.example .env
# edit .env and set a strong POSTGRES_PASSWORD plus Jira settings
./scripts/deploy.sh
```

On Windows PowerShell:

```powershell
.\scripts\deploy.ps1
```

The application is available on `http://SERVER:8080` by default. Set `HTTP_PORT` to change it.

## Operations

```sh
docker compose ps
docker compose logs -f backend
./scripts/healthcheck.sh
./scripts/backup.sh
docker compose down
```

Put TLS, DNS and an identity-aware reverse proxy in front of the stack before allowing broad access. The current demo RBAC headers are not a substitute for SSO/JWT at the network boundary.
