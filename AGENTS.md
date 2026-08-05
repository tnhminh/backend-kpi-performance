# Instructions for AI agents

This file is the first source of project-specific instructions for any AI agent working in this repository.

## Required reading order

Before changing code, read completely:

1. `MEMORY.md` — stable facts and invariants.
2. `STATUS.md` — what is implemented and verified now.
3. `NEXT.md` — prioritized remaining work.
4. `docs/PROJECT_CONTEXT.md` — KPI/Jira business context.
5. The relevant technical document under `docs/` for the requested area.

Historical plans under `docs/archive/` and templates under `templates/` are references, not current application truth. When they conflict, use `STATUS.md`, current code and automated tests.

## Project commands

```powershell
npm test
npm run build
node tests/auth-browser-check.mjs
git diff --check
```

Local runtime:

```powershell
# Terminal 1
cd backend
npm start

# Terminal 2, from repository root
python -m http.server 5175 --directory dist/client
```

## Change rules

- Frontend source lives at repository root. After changing frontend source, run `npm run build` and include matching `dist/client` output.
- Backend behavior must remain aligned between `backend/store.js` and `backend/store-postgres.js`.
- Formula changes require tests, `docs/KPI_CALCULATION_EXAMPLE.md`, changelog and a new formula version/checksum.
- API/DB changes require `docs/API_REFERENCE.md` and `docs/DATABASE_SCHEMA.md` updates.
- Role/workflow changes require `docs/RBAC_MATRIX.md` and backend tests.
- Never commit `.env`, Jira PAT, JWT secret, passwords, SQLite files, logs or generated backups.
- Do not treat localStorage as the production source of truth. It is a frontend cache; backend state/snapshots are shared persistence.
- Preserve locked snapshots. Never modify/delete them to make a test or migration pass.
- Preserve unrelated user changes in a dirty worktree.

## Definition of done

- Requested behavior is implemented and documented.
- Relevant tests plus full `npm test` pass.
- Frontend build passes if UI changed.
- Browser E2E passes for user-facing/auth/module changes.
- `git diff --check` passes.
- `STATUS.md`, `NEXT.md`, `MEMORY.md` and `docs/CHANGELOG.md` are updated when the change affects project state or future work.

## End-of-session handoff

Update when applicable:

- `STATUS.md`: newly implemented or verified behavior.
- `NEXT.md`: completed items removed or newly discovered risks.
- `MEMORY.md`: stable new invariants only.
- `DECISIONS.md`: durable decisions and tradeoffs.
- `docs/CHANGELOG.md`: release-visible changes.

Report the outcome, files/features changed, tests and results, known risks, branch/commit, push status and local runtime status. Never claim production readiness based only on local tests.
