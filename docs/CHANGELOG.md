# Changelog

## 2026-08-06

- Thêm email/password auth, HttpOnly JWT và user administration.
- Thêm SQLite/PostgreSQL persistence, formula versions và immutable snapshots.
- Enforce workflow `draft → submitted → approved → locked` ở backend.
- Thêm Jira retry/backoff, timeout, sync history, scheduler và sync lock.
- Thêm mock Jira 156 issues, task evidence và data-quality warnings.
- Thêm Dashboard trưởng phòng, Đối soát KPI và export Excel/JSON/print-PDF.
- Hoàn thiện onboarding, API, database, RBAC, KPI, operations và release docs.
- Thêm AI handoff: `AGENTS.md`, `MEMORY.md`, `STATUS.md`, `NEXT.md`, `DECISIONS.md`.
- Tinh gọn docs: hợp nhất checklist AI, archive plan cũ và chuyển reusable kit sang `templates/`.

## 2026-07-28

- Thêm Jira pagination, JQL filters và normalized Jira fields.
- Thêm Task Jira, task-to-member mapping và evidence selection.
- Thêm criteria configuration, workload/story point scoring, dashboard và audit.
- Thêm workflow/snapshot prototype và export CSV/JSON.

Các chi tiết trạng thái hiện tại nằm ở `../STATUS.md`; backlog nằm ở `../NEXT.md`.
