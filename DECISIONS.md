# Architecture and product decisions

Lightweight decision log. Add a dated entry when a choice affects future implementation.

## 2026-08-06 — Native frontend and backend retained

Decision: continue with static HTML/CSS/JavaScript and a native Node.js HTTP backend for the current product phase.

Reason: the repository is already structured this way, has a working build/test path and can be deployed portably without a framework migration.

Consequence: module overrides and global state require careful script ordering; tests must protect integration behavior.

## 2026-08-06 — JWT in HttpOnly cookie

Decision: authenticate using email/password and an HttpOnly `kpi_session` cookie.

Reason: frontend must not store API tokens or JWTs in localStorage.

Consequence: CORS must use exact origins with credentials; backend role lookup remains authoritative.

## 2026-08-06 — Dual local/production stores

Decision: SQLite for local development and PostgreSQL for production.

Reason: low-friction onboarding with production-grade shared persistence.

Consequence: every store/schema behavior change must be implemented and tested in both adapters.

## 2026-08-06 — Immutable locked snapshots

Decision: locking a period creates one immutable snapshot with checksum.

Reason: managers need reproducible KPI audit evidence even when live Jira changes.

Consequence: locked snapshots must not be silently rewritten; corrections need an explicit future business process.

## 2026-08-06 — localStorage is cache, not authority

Decision: retain localStorage temporarily for responsive/offline UX while persisting shared state to backend.

Reason: incremental migration from the prototype without blocking current use.

Consequence: backend-first initialization and conflict handling remain priority work in `NEXT.md`.

## 2026-08-06 — Jira sync locking

Decision: Redis distributed lock in production, process-memory fallback locally.

Reason: prevent overlapping sync while keeping local setup simple.

Consequence: multi-instance production requires healthy Redis.
