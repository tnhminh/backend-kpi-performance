# Backend KPI Performance

Webapp đánh giá KPI cho phòng Backend, kết hợp điểm tiêu chí, workload/story point và task Jira Data Center. Sản phẩm có dashboard trưởng phòng, đối soát KPI tới từng task, audit log, snapshot bất biến và workflow khóa kỳ.

## Bắt đầu nhanh

```powershell
git clone https://github.com/tnhminh/backend-kpi-performance.git
cd backend-kpi-performance
npm install
cd backend
npm install
Copy-Item .env.example .env
npm start
```

Terminal khác:

```powershell
cd backend-kpi-performance
npm run build
python -m http.server 5175 --directory dist/client
```

Mở `http://127.0.0.1:5175/`. Tài khoản local mặc định nằm trong `backend/.env`; không dùng thông tin local khi deploy production.

## Tài liệu bắt buộc

- [Getting started](docs/GETTING_STARTED.md) — clone, chạy local, test.
- [Architecture](docs/ARCHITECTURE.md) — frontend/backend/API/DB/auth/workflow.
- [Project context](docs/PROJECT_CONTEXT.md) — KPI formula, Jira fields, module map.
- [API reference](docs/API_REFERENCE.md) — endpoint và quyền.
- [Contributing](docs/CONTRIBUTING.md) — quy tắc sửa code và kiểm thử.
- [Project handover](docs/PROJECT_HANDOVER.md) — bàn giao chi tiết.
- [Current status](docs/CURRENT_STATUS.md) — những gì đã build và lưu ý production.
- [Operations runbook](docs/OPERATIONS_RUNBOOK.md) — xử lý sự cố.
- [Portable deployment](docs/DEPLOYMENT_PORTABLE.md) — Docker/PostgreSQL/Redis production.

## Kiểm tra trước khi bàn giao

```powershell
npm test
npm run build
node tests/auth-browser-check.mjs
git diff --check
```

## Kiến trúc runtime

- Frontend: HTML/CSS/JavaScript native, build vào `dist/client`.
- Backend: Node.js native tại port `8788`.
- Local DB: SQLite; production: PostgreSQL.
- Redis: distributed lock cho Jira sync production.
- Auth: email/password + scrypt + HttpOnly JWT cookie.

Token Jira và secret chỉ được cấu hình qua environment/secret manager, không commit vào repository.
