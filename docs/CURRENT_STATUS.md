# Current implementation status

Last verified locally after the manager dashboard release.

## Implemented

- Email/password authentication with HttpOnly JWT cookies.
- SQLite local persistence and PostgreSQL production store.
- User management, roles and password reset.
- Immutable locked-period snapshots with checksum.
- Formula version/checksum persistence.
- Jira mock data with 156 deterministic issues.
- Jira pagination, retry/backoff, timeout, sync history and optional scheduler.
- Task Jira mapping and evidence drill-down.
- Manager Dashboard with KPI, grade, completion and data-quality charts.
- Reconciliation report with Excel-compatible export, JSON export and print/PDF flow.
- Backend-enforced `draft → submitted → approved → locked` workflow.
- Browser E2E and automated test suite.

## Known production decisions

- Frontend still keeps localStorage as a cache for responsive editing; backend API/database is used for persistence and snapshots.
- Redis should be enabled for distributed Jira sync locks when running multiple backend instances.
- Configure `JWT_SECRET`, admin credentials, Jira PAT and `APP_ORIGIN` through a secret manager.
- Before go-live, validate Jira custom field IDs and Done status names against the target Jira Data Center.

## Release reference

- Branch: `main`
- Remote: `https://github.com/tnhminh/backend-kpi-performance`
- Run `git log -1 --oneline` for the current release commit; do not hardcode a stale commit in operational procedures.
