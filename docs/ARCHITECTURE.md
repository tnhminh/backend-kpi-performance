# Architecture

## Tổng quan

```text
Browser (HTML/CSS/JS native)
        |
        | HttpOnly JWT cookie + JSON API
        v
Node.js backend/server.js
        |              \
        |               +--> Jira Data Center REST API
        v
SQLite local / PostgreSQL production
        |
        +--> Redis distributed sync lock (production)
```

## Frontend

- `index.html`: layout, sidebar và các module root.
- `app.js`: state kỳ đánh giá, tiêu chí, result(), render và local cache.
- `production-suite.js`: API persistence, RBAC UI, formula version, workflow save.
- `manager-dashboard.js`: Dashboard trưởng phòng với KPI cards và chart native.
- `reconciliation.js`: drill-down KPI → criteria → task Jira → audit/snapshot.
- `mock-jira-data.js`: deterministic mock 156 issues cho demo/test.
- `auth-ui.js`: login overlay, session restore, logout và credentials fetch.
- `users-admin.js`: quản trị user trong Settings.
- `styles.css`: layout, responsive và chart styles.

Source ở root được build nguyên trạng sang `dist/client/` bằng `scripts/build-site.mjs`.

## Backend

- `backend/server.js`: HTTP server native, auth, CORS, API, Jira connector, workflow và scheduler.
- `backend/auth.js`: scrypt password hash và HMAC JWT.
- `backend/store.js`: SQLite store local.
- `backend/store-postgres.js`: PostgreSQL store production.
- `backend/.env`: runtime secrets (ignored).

## Persistence và source of truth

Frontend giữ localStorage như cache/offline UX, nhưng các dữ liệu quan trọng được đồng bộ API:

- users/password hash/role: database.
- period state: `PUT /api/state`.
- Jira issues và sync runs: database.
- formula versions, audit logs, immutable snapshots: database.

Khi production hóa hoàn toàn, backend/database nên là source of truth và frontend chỉ giữ cache.

## Auth và quyền

Login tạo cookie `kpi_session` HttpOnly. Backend lấy user từ JWT và database; không tin `x-user-id` hoặc `x-user-role` từ browser.

- Admin: toàn quyền, quản lý user, khóa kỳ, formula.
- Leader: xem team, duyệt kỳ, xem audit/snapshot.
- Member: nhập dữ liệu của chính mình và submit.

## Workflow

Backend chỉ cho phép:

```text
draft -> submitted -> approved -> locked
```

Chuyển sai bước trả HTTP 409. `locked` chỉ Admin và tạo snapshot checksum SHA-256 một lần.

## Jira sync

`/api/sync` dùng pagination, giới hạn issue, retry/backoff cho 408/429/5xx, timeout và sync history. Redis khóa phân tán khi có `REDIS_URL`; local fallback dùng lock trong process. Scheduler bật bằng `JIRA_SYNC_INTERVAL_MINUTES`.
