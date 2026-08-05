# Test and release matrix

## Automated gates

| Gate | Command | Expected |
|---|---|---|
| Unit/integration | `npm test` | All tests pass |
| Frontend build | `npm run build` | Assets copied to `dist/client` |
| Browser E2E | `node tests/auth-browser-check.mjs` | Login, mock Jira, modules and logout pass |
| Syntax/diff | `git diff --check` | No whitespace errors |

## Manual smoke matrix

| Area | Check |
|---|---|
| Health | Frontend and `/api/health` return 200 |
| Auth | Valid login, invalid login, session reload, logout |
| RBAC | Member cannot admin; Leader cannot lock; Admin can manage users |
| Jira | Test connection, sync, stored issues, sync history, quality warnings |
| KPI | Input score, bonus/penalty, grade, task evidence |
| Dashboard | Team KPI, grade, completion and warnings render |
| Reconciliation | Member drill-down matches criteria and Jira task |
| Workflow | draft → submitted → approved → locked only |
| Snapshot | Lock creates one checksum snapshot and survives reload |
| Export | Excel-compatible, JSON and print/PDF |
| Recovery | Backup restore opens users, period and locked snapshot |

## Release procedure

1. Pull latest `main` and verify clean working tree.
2. Record current production commit/tag as rollback target.
3. Review env/schema/formula/Jira field changes.
4. Backup database and verify backup metadata.
5. Run all automated gates.
6. Build/deploy containers.
7. Run health and manual smoke checks.
8. Record deployed commit, time, operator and migration version.
9. Monitor backend errors, Jira sync history and database health.

## Rollback

- Application-only change: deploy the recorded previous image/commit.
- Additive schema change: previous app may run if schema remains backward compatible.
- Destructive schema/data change: stop rollout and restore only through the approved recovery procedure.
- Never delete or overwrite a locked period snapshot to make rollback appear successful.

## Acceptance rule

A release is not “100% pass” unless automated gates pass and all smoke checks affected by the change have evidence. Production Jira/network/backup restore cannot be proven by local automated tests alone.
