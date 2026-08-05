# Project memory

Stable context that future contributors and AI agents should retain. Do not put secrets, temporary process IDs or one-off debugging output here.

## Product identity

- Repository: `tnhminh/backend-kpi-performance`.
- Product: monthly KPI performance system for the Backend department.
- Core requirement: a manager can see a member's KPI score and trace it back through formula, criteria and Jira task evidence.
- Primary Jira target: Jira Data Center, commonly project `BE`; real field IDs/statuses must be verified per environment.

## Technical shape

- Frontend: native HTML/CSS/JavaScript at repository root.
- Built frontend: `dist/client`.
- Backend: native Node.js HTTP server in `backend/server.js`.
- Local database: SQLite.
- Production database: PostgreSQL.
- Production distributed sync lock: Redis; local fallback is process memory.
- Auth: email/password, scrypt hashes, JWT in HttpOnly cookie `kpi_session`.

## Business invariants

- Roles: Member, Leader, Admin.
- Period workflow: `draft → submitted → approved → locked`.
- Leader/Admin approve; only Admin locks.
- Locking creates one immutable period snapshot with SHA-256 checksum.
- Jira is source of truth for issue facts; locked snapshot preserves the facts/formula used for KPI approval.
- Task-to-member mapping prioritizes account ID, then normalized assignee name.

## Formula invariants

- Current cross-team scoring version: `v2.1`.
- Raw weights: completion 30%, effort 35%, quality KPI 25%, predictability 10%.
- Fairness: absolute raw score 75%, relative team index 25%.
- Exact implementation/source of truth: `production-suite.js`.
- Worked example: `docs/KPI_CALCULATION_EXAMPLE.md`.

## Known architecture debt

- Frontend still writes localStorage as a responsive cache before backend synchronization.
- `/api/config` currently accepts any authenticated user; production ownership should be explicitly decided, likely Admin-only.
- Database logical relationships do not yet use foreign keys.
- Real Jira integration, backup restore and multi-instance Redis behavior require environment-level acceptance tests.

## Never store here

- Passwords, PATs, JWT secrets or cookies.
- Local process IDs/ports that are not architectural defaults.
- Temporary bug hypotheses.
- Claims that production is healthy without current environment evidence.
