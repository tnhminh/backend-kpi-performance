# Getting started

Tài liệu này dành cho thành viên mới: clone project, chạy local, đăng nhập và hiểu luồng build hiện tại.

## 1. Yêu cầu

- Node.js 18+ (khuyến nghị Node 20+).
- Python 3 nếu cần serve frontend tĩnh.
- Jira Data Center qua mạng nội bộ/VPN nếu muốn sync Jira thật.
- PostgreSQL và Redis chỉ bắt buộc khi chạy production Docker; local có thể dùng SQLite và fallback lock trong memory.

## 2. Clone và cài đặt

```powershell
git clone https://github.com/tnhminh/backend-kpi-performance.git
cd backend-kpi-performance
npm install
cd backend
npm install
Copy-Item .env.example .env
```

Không commit `backend/.env`, token Jira, JWT secret hoặc database local.

## 3. Chạy local

Terminal 1 - backend:

```powershell
cd backend
npm start
```

Backend mặc định ở `http://127.0.0.1:8788`.

Terminal 2 - frontend:

```powershell
python -m http.server 5175 --directory dist/client
```

Mở `http://127.0.0.1:5175/`. Nếu vừa sửa source, chạy `npm run build` ở root trước khi refresh.

Tài khoản local được bootstrap từ `backend/.env`:

```text
Email: admin@localhost
Password: ChangeMe2026!
```

Đổi thông tin này trước khi chia sẻ môi trường hoặc triển khai production.

## 4. Kiểm tra nhanh

```powershell
Invoke-WebRequest http://127.0.0.1:8788/api/health
npm test
npm run build
node tests/auth-browser-check.mjs
```

## 5. Luồng sử dụng chuẩn

1. Đăng nhập Admin/Leader/Member.
2. Chọn tháng đánh giá.
3. Vào Cài đặt để cấu hình Jira backend hoặc dùng Trình giả lập Jira.
4. Đồng bộ và kiểm tra tại Task Jira.
5. Nhập điểm, chọn task evidence ở Đánh giá member.
6. Trưởng phòng xem Dashboard trưởng phòng và Đối soát KPI.
7. Chuyển kỳ theo workflow `draft → submitted → approved → locked`.
8. Sau khi khóa, snapshot bất biến được lưu để audit.

## 6. Tài liệu liên quan

- [Kiến trúc](ARCHITECTURE.md)
- [API reference](API_REFERENCE.md)
- [KPI/Jira context](PROJECT_CONTEXT.md)
- [Hướng dẫn đóng góp](CONTRIBUTING.md)
- [Runbook vận hành](OPERATIONS_RUNBOOK.md)
- [Deploy production](DEPLOYMENT_PORTABLE.md)
