# Current status

Updated: 2026-08-06.

## Implemented

- Login/logout/session restore using HttpOnly JWT cookies.
- User management, role updates and password reset.
- SQLite and PostgreSQL stores.
- KPI period persistence, formula versions, audit logs and immutable snapshots.
- Backend-enforced period workflow.
- Jira search/sync, pagination, retry/backoff, timeout, warnings, history and optional scheduler.
- Redis distributed lock plus single-process fallback lock.
- Deterministic 156-issue Jira mock dataset.
- Member evaluation with Jira task evidence.
- Task Jira module and filtering.
- Manager Dashboard with KPI/team/grade/completion/data-quality charts.
- KPI reconciliation drill-down and Excel-compatible/JSON/print-PDF exports.
- Portable Docker stack with Nginx, Node, PostgreSQL and Redis.
- Complete onboarding, API, schema, RBAC, operations and release documentation.

## Verification baseline

- `npm test`: 22/22 passing.
- `npm run build`: 23 frontend assets.
- Browser E2E: login, reload, mock Jira, Task Jira, reconciliation, manager dashboard, user admin and logout passing.
- Local target used during development: frontend `127.0.0.1:5175`, backend `127.0.0.1:8788`.

Run the commands again; this file is context, not proof for a future commit/environment.

## Current persistence model

- Backend database stores users, periods, formulas, snapshots, audit, Jira issues and sync history.
- Frontend localStorage remains a cache/optimistic editing layer.
- Production should treat backend/database as the canonical shared state.

## Environment status

- Local SQLite mode is verified.
- PostgreSQL/Redis Docker configuration exists.
- Actual production deployment, real Jira custom fields, restore drill and SSO are environment-dependent and are not certified by local tests.

## Repository state reference

- Main branch is the integration branch.
- Use `git status -sb` and `git log -1 --oneline` for the live state; do not rely on a commit hash copied into this file.
