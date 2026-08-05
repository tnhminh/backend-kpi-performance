# KPI backend

Native Node.js API for authentication, KPI state, snapshots and Jira Data Center synchronization.

## Local setup

```powershell
Copy-Item .env.example .env
npm install
npm start
```

Default port: `8788`.

Required local auth variables:

```env
APP_ORIGIN=http://localhost:5175,http://127.0.0.1:5175
JWT_SECRET=local-only-secret
ADMIN_EMAIL=admin@localhost
ADMIN_PASSWORD=ChangeMe2026!
```

For Jira, set `JIRA_BASE_URL`, `JIRA_PROJECT_KEY`, `JIRA_TOKEN` and the relevant field/status variables. PAT uses Bearer auth; Basic auth also requires `JIRA_USER` and `JIRA_AUTH_TYPE=basic`.

## Storage

- Default: SQLite at `DB_PATH` (local development).
- Production: set `DB_DRIVER=postgres` and `DATABASE_URL`.
- `REDIS_URL` enables distributed Jira sync lock; without it the process uses an in-memory fallback lock.

## API

See [API reference](../docs/API_REFERENCE.md). Business routes require the `kpi_session` HttpOnly JWT cookie.

## Jira sync options

```env
JIRA_SYNC_MAX_ISSUES=1000
JIRA_RETRY_ATTEMPTS=3
JIRA_REQUEST_TIMEOUT_MS=15000
JIRA_SYNC_INTERVAL_MINUTES=0
```

Set the interval above zero to enable the backend scheduler. Keep Jira credentials in environment variables or a secret manager; never commit `.env`.
