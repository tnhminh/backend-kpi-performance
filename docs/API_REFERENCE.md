# API reference

Tất cả endpoint business yêu cầu cookie JWT từ `/api/auth/login`, trừ health và login.

## Auth

```http
POST /api/auth/login
Content-Type: application/json
{"email":"admin@localhost","password":"ChangeMe2026!"}

GET /api/auth/me
POST /api/auth/logout
```

## State và snapshot

```http
GET /api/state?period=2026-08
PUT /api/state
Content-Type: application/json
{"period":"2026-08","status":"submitted","state":{}}

GET /api/snapshots?period=2026-08
```

`PUT /api/state` enforce workflow và role. Khi status chuyển sang `locked`, backend tạo immutable snapshot.

## Users

```http
GET /api/users                 # Leader/Admin
POST /api/users                # Admin
PATCH /api/users/:id           # Admin
POST /api/users/:id/password   # Admin
```

Password tối thiểu 12 ký tự; backend tự hash bằng scrypt.

## Jira

```http
GET /api/jira/test
GET /api/jira/issues?project=BE&maxResults=100
GET /api/jira/stored-issues
GET /api/sync?project=BE&maxIssues=1000
GET /api/jira/sync-runs
POST /api/jira/autofill-story-points
```

Issue normalize gồm `key`, `title`, `url`, `member`, `accountId`, `status`, `done`, `storyPoints`, `deadline`, `resolvedAt`, `issueType`, `priority`, `labels`, `created`, `updated`.

## Audit/formula/config

```http
GET /api/audit?period=2026-08
GET /api/formulas
POST /api/formulas              # Admin
POST /api/config                # runtime Jira config
GET /api/health
```

## Error conventions

- `401`: thiếu/không hợp lệ JWT.
- `403`: không đủ role.
- `409`: workflow conflict hoặc sync đang chạy.
- `400`: thiếu input.
- `500`: lỗi backend/Jira; xem log process và sync history.
