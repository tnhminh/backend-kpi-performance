# AI session handoff

Use this checklist when an AI agent finishes a meaningful work session.

## Start of session

- Read `AGENTS.md`, `MEMORY.md`, `STATUS.md` and `NEXT.md`.
- Check `git status -sb`, current branch and latest commit.
- Read the docs/code relevant to the request.
- Verify local services before assuming a failure is application code.

## During work

- Keep changes scoped to the user request.
- Record durable architectural/business decisions in `DECISIONS.md`.
- Add or update tests with behavior changes.
- Keep source and `dist/client` aligned.
- Do not add secrets or runtime data.

## End of session

Update when applicable:

- `STATUS.md`: newly implemented/verified behavior.
- `NEXT.md`: completed items removed or new risks added.
- `MEMORY.md`: only stable new invariants.
- `DECISIONS.md`: decisions and tradeoffs.
- `docs/CHANGELOG.md`: release-visible changes.

Report:

```text
Outcome:
Files/features changed:
Tests run and results:
Known limitations/risks:
Branch and commit:
Pushed: yes/no
Local runtime status:
```

Never claim production readiness based only on local tests.
