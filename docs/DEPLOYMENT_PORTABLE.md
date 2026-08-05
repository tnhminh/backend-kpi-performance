# Portable production deployment

## Stack

- `web`: Nginx serving `dist/client` and proxying `/api`.
- `backend`: Node.js API with JWT auth and Jira connector.
- `db`: PostgreSQL 16.
- `redis`: Redis 7 with AOF, used for distributed Jira sync locking.

## Requirements

- Linux server with Docker Engine and Docker Compose v2.
- DNS/TLS termination or an approved reverse proxy.
- Network route/VPN from backend to Jira Data Center.
- Production secrets and database backup location.

## Configure

```sh
git clone https://github.com/tnhminh/backend-kpi-performance.git
cd backend-kpi-performance
cp .env.production.example .env
```

Set at minimum:

```env
POSTGRES_PASSWORD=<strong random secret>
APP_ORIGIN=https://kpi.example.internal
JWT_SECRET=<long random secret>
ADMIN_EMAIL=<initial admin email>
ADMIN_PASSWORD=<initial password, 12+ chars>
JIRA_BASE_URL=https://jira.example.internal
JIRA_PROJECT_KEY=BE
JIRA_TOKEN=<PAT from secret manager>
```

Do not reuse local credentials. Protect `.env` and prefer injected secrets.

## Deploy

```sh
./scripts/deploy.sh
```

Windows PowerShell operator:

```powershell
.\scripts\deploy.ps1
```

Default external port is `8080`; override with `HTTP_PORT`.

## Verify

```sh
docker compose ps
docker compose logs --tail=200 backend
./scripts/healthcheck.sh
```

Then verify login, role restrictions, Jira connection/sync, one KPI save and a non-production workflow period.

## Backup and restore

```sh
./scripts/backup.sh
```

A generated file is not sufficient proof. Restore it into an isolated PostgreSQL instance and validate row counts plus login/locked snapshot access. See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

## Release and rollback

Follow [TEST_RELEASE_MATRIX.md](TEST_RELEASE_MATRIX.md). Record the previous container image/commit before deployment. Keep database changes backward compatible where possible; use an approved restore procedure for destructive migrations.

## Security

- JWT is stored in an HttpOnly cookie.
- Set exact `APP_ORIGIN`; do not use wildcard CORS with credentials.
- Put HTTPS in front of the stack.
- Rotate bootstrap Admin password after handover.
- Restrict Jira PAT permissions to required read scope.
- Enable Redis for every multi-instance production deployment.
