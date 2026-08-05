# Backend KPI Performance — Project handover

## 1. Product purpose

Hệ thống đánh giá KPI theo tháng cho phòng Backend. Điểm KPI được kết hợp từ tiêu chí đánh giá, thưởng/trừ và dữ liệu Jira; trưởng phòng có thể xem tổng quan rồi truy ngược tới tiêu chí và task evidence.

## 2. Current scope

Đã triển khai:

- Email/password authentication, scrypt password hash và HttpOnly JWT cookie.
- RBAC cho Admin, Leader và Member.
- SQLite local, PostgreSQL production và Redis distributed Jira sync lock.
- Jira Data Center sync với pagination, retry/backoff, timeout, scheduler và sync history.
- Quản trị user/reset password.
- Cấu hình tiêu chí, nhập điểm, task evidence và formula version/checksum.
- Dashboard trưởng phòng, dashboard tổng quan và đối soát KPI.
- Workflow `draft → submitted → approved → locked` được enforce ở backend.
- Immutable snapshot khi khóa kỳ.
- Excel-compatible/JSON export và print/PDF.
- Automated tests, browser E2E và portable Docker deployment.

Giới hạn cần biết:

- Frontend vẫn dùng localStorage làm cache UX; backend/database giữ state dùng chung và snapshot.
- Jira PAT runtime phải được đưa qua environment/secret manager khi production.
- Field ID, Done statuses và JQL phải xác nhận với Jira Data Center thật.
- Redis bắt buộc nếu chạy nhiều backend instance để có distributed lock.

## 3. Repository map

| Path | Trách nhiệm |
|---|---|
| `index.html` | Layout và module roots |
| `app.js` | Core state, criteria, score, render và local cache |
| `production-suite.js` | API persistence, formula version, RBAC UI |
| `manager-dashboard.js` | Dashboard trưởng phòng |
| `reconciliation.js` | Drill-down và export đối soát |
| `auth-ui.js` | Login/session/logout |
| `users-admin.js` | Quản trị user |
| `mock-jira-data.js` | Mock Jira deterministic |
| `backend/server.js` | API/auth/workflow/Jira scheduler |
| `backend/auth.js` | Password hash và JWT |
| `backend/store.js` | SQLite store |
| `backend/store-postgres.js` | PostgreSQL store |
| `scripts/build-site.mjs` | Build frontend sang `dist/client` |
| `tests/` | Unit/integration/browser tests |

## 4. Runtime architecture

```text
Browser
  ├─ static frontend
  ├─ localStorage cache
  └─ HttpOnly JWT cookie
          |
          v
Node.js API :8788
  ├─ SQLite local / PostgreSQL production
  ├─ Redis lock production
  └─ Jira Data Center REST API
```

Chi tiết: [ARCHITECTURE.md](ARCHITECTURE.md).

## 5. Main business flow

1. Admin tạo user và cấu hình kỳ/criteria.
2. Jira issues được sync và map vào member.
3. Member/Leader nhập điểm và gắn task evidence.
4. Member submit kỳ.
5. Leader review và approve.
6. Admin lock kỳ.
7. Backend tạo immutable snapshot với checksum.
8. Trưởng phòng dùng Dashboard và Đối soát KPI để kiểm chứng.

## 6. Local onboarding

Thực hiện theo [GETTING_STARTED.md](GETTING_STARTED.md). Các lệnh kiểm tra tối thiểu:

```powershell
npm test
npm run build
node tests/auth-browser-check.mjs
git diff --check
```

## 7. Production deployment

Production stack gồm Nginx, Node backend, PostgreSQL và Redis. Tạo `.env` từ `.env.production.example`, dùng secret thật và chạy script deploy tương ứng trong `scripts/`.

Chi tiết: [DEPLOYMENT_PORTABLE.md](DEPLOYMENT_PORTABLE.md).

## 8. Security ownership

- Platform/DevOps giữ JWT secret, Jira PAT, PostgreSQL password và TLS.
- Admin nghiệp vụ quản lý user/role và khóa kỳ.
- Leader chịu trách nhiệm review/approve và đối soát team.
- Không đưa secret vào frontend, commit, chat hoặc ticket.
- Revoke Jira PAT ngay khi nghi ngờ lộ.

## 9. Data and recovery

- Schema: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).
- Jira/KPI fields: [DATA_DICTIONARY.md](DATA_DICTIONARY.md).
- Backup PostgreSQL trước migration/release có thay đổi dữ liệu.
- Kiểm tra restore định kỳ, không chỉ kiểm tra file backup được tạo.
- Snapshot kỳ đã khóa không được sửa hoặc tái tạo âm thầm.

## 10. Release acceptance

Release chỉ được bàn giao khi:

- Automated tests, build và browser E2E đều pass.
- Health endpoint, login, Jira test/sync và workflow được smoke test.
- Không có secret/runtime database trong Git.
- Formula/Jira field thay đổi đã có docs, test và changelog.
- Có backup/rollback plan cho production.

Chi tiết: [TEST_RELEASE_MATRIX.md](TEST_RELEASE_MATRIX.md).

## 11. Documentation reading order

1. [GETTING_STARTED.md](GETTING_STARTED.md)
2. [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
3. [ARCHITECTURE.md](ARCHITECTURE.md)
4. [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
5. [DATA_DICTIONARY.md](DATA_DICTIONARY.md)
6. [API_REFERENCE.md](API_REFERENCE.md)
7. [RBAC_MATRIX.md](RBAC_MATRIX.md)
8. [KPI_CALCULATION_EXAMPLE.md](KPI_CALCULATION_EXAMPLE.md)
9. [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md)
10. [TEST_RELEASE_MATRIX.md](TEST_RELEASE_MATRIX.md)

## 12. Handover checklist

- [ ] Jira URL/project/custom fields/Done statuses đã xác nhận.
- [ ] Network từ backend production tới Jira hoạt động.
- [ ] Admin owner và Leader owners đã được chỉ định.
- [ ] Secrets nằm trong secret manager.
- [ ] PostgreSQL backup và restore test thành công.
- [ ] Redis health tốt nếu chạy nhiều instance.
- [ ] Login, RBAC, workflow và snapshot đã test.
- [ ] Dashboard/đối soát khớp dữ liệu Jira mẫu thực tế.
- [ ] Release commit/tag và rollback target được ghi lại.
