# Contributing

## Quy tắc trước khi sửa

1. Đọc `GETTING_STARTED.md`, `ARCHITECTURE.md` và `PROJECT_CONTEXT.md`.
2. Kiểm tra branch và `git status`.
3. Không sửa trực tiếp `backend/.env`, database hoặc token.
4. Nếu sửa source frontend, chạy build để cập nhật `dist/client`.

## Kiểm thử bắt buộc

```powershell
npm test
npm run build
node tests/auth-browser-check.mjs
git diff --check
```

Browser test cần Chrome cài tại đường dẫn mặc định Windows và backend/frontend local đang chạy.

## Quy trình thay đổi

- Thay đổi công thức: cập nhật `production-suite.js`, `PROJECT_CONTEXT.md`, test formula và changelog.
- Thay đổi API/DB: cập nhật `API_REFERENCE.md`, store SQLite/Postgres và backend tests.
- Thay đổi module UI: cập nhật `index.html`, source JS/CSS, build output và browser test.
- Thay đổi env/deploy: cập nhật `.env.production.example`, backend README và deployment docs.

## Commit/push

Commit message nên mô tả mục tiêu, ví dụ:

```text
feat: add manager dashboard charts
fix: prevent concurrent Jira sync
docs: refresh project handover
```

Chỉ push sau khi toàn bộ test pass và `git status` không còn file runtime/secrets.
