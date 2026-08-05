# Next work

Prioritized backlog for the next builder. Revalidate against the user's latest goal before starting.

## P0 — production acceptance

- Validate Jira Data Center project/JQL, Story Point field, deadline field, account IDs and Done statuses with real data.
- Deploy PostgreSQL + Redis environment and run the full manual smoke matrix.
- Perform and document an actual PostgreSQL backup/restore drill.
- Configure production secrets, HTTPS, exact CORS origin and rotate bootstrap Admin password.

## P1 — backend source of truth

- Make period initialization/read backend-first after login.
- Add conflict/version handling so multiple browsers cannot silently overwrite period state.
- Reduce localStorage to recoverable cache only and clearly show pending/synced/conflict states.
- Add integration tests for refresh and cross-browser consistency.

## P1 — security/API hardening

- Decide and enforce Admin-only access for `/api/config` if Jira configuration is centrally owned.
- Add request schema validation and consistent error codes.
- Add rate limiting/login lockout and password change/self-service policy.
- Evaluate SSO/OIDC integration for production.
- Publish an OpenAPI specification.

## P1 — data lifecycle

- Add versioned forward migrations instead of relying only on startup `CREATE/ALTER` behavior.
- Add foreign keys or documented retention strategy for logical actor/formula references.
- Define retention for audit logs, sync runs, Jira issues and inactive users.

## P2 — operations and observability

- Add structured logs, request IDs and metrics for auth, state saves and Jira sync.
- Add alerts for failed sync, stale Jira data, backup failure and repeated auth failure.
- Add CI workflow that runs tests/build and a container smoke test on every pull request.

## P2 — product enhancements

- Trend charts using real historical period snapshots rather than current-period-only data.
- Manager annotations/approval comments and an exception workflow.
- Real `.xlsx`/PDF server-side reports if strict document formatting is required.
- Optional Jira task creation flow after permissions and field mapping are approved.

## Explicitly not complete

- Production certification.
- SSO.
- Backend-only state with conflict resolution.
- Real Jira acceptance evidence.
- Automated restore verification.
- OpenAPI and full schema validation.
