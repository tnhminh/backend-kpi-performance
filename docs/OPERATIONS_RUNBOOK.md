# Operations runbook

## Health checks

```text
GET /api/health
```

Expected: HTTP 200 with storage health, Jira configured flag and Redis health. Redis may be false for single-process local development; it should be true for multi-instance production.

## Login fails / `Failed to fetch`

1. Verify frontend and backend ports are listening.
2. Confirm `APP_ORIGIN` exactly includes the browser origin.
3. Confirm browser uses the intended host (`127.0.0.1` vs `localhost`).
4. Check backend logs and `/api/health`.
5. Confirm Admin was bootstrapped and password is 12+ characters.
6. Clear only the site cookie/session if testing a changed JWT secret.

Never solve credentialed CORS by setting `Access-Control-Allow-Origin: *`.

## New frontend code is not visible

1. Run `npm run build`.
2. Confirm the server serves `dist/client`, not repository root or another project.
3. Hard refresh the browser.
4. Inspect port owner if multiple local servers exist.

Local command:

```powershell
python -m http.server 5175 --directory dist/client
```

## Jira connection/sync fails

Check in order:

1. Backend network/VPN route to Jira.
2. Jira base URL, auth type, user/PAT and token expiry.
3. Project/JQL permissions.
4. Story Point/deadline custom field IDs.
5. Done status names.
6. Retry/timeout logs and `/api/jira/sync-runs`.
7. Redis health/lock if a sync reports another run in progress.

## Task does not map to member

- Compare Jira account ID with internal member ID/mapping.
- Check assignee and normalized display name.
- Confirm issue belongs to current JQL/period.
- Do not manually attribute an unmapped task without traceable mapping.

## KPI appears wrong

1. Open Đối soát KPI and inspect criteria, base, bonus and evidence.
2. Verify criteria total/max and team/Leader criteria selection.
3. Verify committed/closed tasks and Story Points.
4. Check missing deadline/Story Point warnings.
5. Check formula version/checksum.
6. For locked periods, compare against immutable snapshot rather than live Jira.

See [KPI_CALCULATION_EXAMPLE.md](KPI_CALCULATION_EXAMPLE.md).

## Workflow errors

- HTTP 409: attempted to skip/reverse a state.
- HTTP 403: authenticated role lacks permission.
- Allowed sequence: `draft → submitted → approved → locked`.
- Do not alter database status manually to bypass workflow.

## Backup incident

If backup/restore validation fails:

1. Stop destructive migrations/releases.
2. Preserve database logs and backup artifacts.
3. Restore into an isolated environment.
4. Validate tables and locked snapshots.
5. Escalate before replacing production data.

## Standard release checklist

- [ ] Tests/build/browser E2E pass.
- [ ] Database backup and restore evidence available.
- [ ] Secrets and origins verified.
- [ ] Health/login/Jira smoke checks pass.
- [ ] RBAC/workflow/snapshot checks pass if affected.
- [ ] Release commit and rollback target recorded.
- [ ] Monitoring/log review completed after deploy.

Full matrix: [TEST_RELEASE_MATRIX.md](TEST_RELEASE_MATRIX.md).
