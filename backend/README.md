# Backend KPI – Jira Data Center connector

Backend tối giản dùng Node.js native, không lưu token ở frontend.

## Cấu hình

1. Copy `.env.example` thành `.env`.
2. Điền `JIRA_BASE_URL`, `JIRA_PROJECT_KEY` và `JIRA_TOKEN`.
3. Dùng `JIRA_AUTH_TYPE=pat` cho Personal Access Token. Nếu Jira DC dùng Basic Auth, đặt `JIRA_AUTH_TYPE=basic` và điền thêm `JIRA_USER`.

## Chạy

```text
npm start
```

API chính:

- `GET /api/health` – kiểm tra backend đã cấu hình Jira chưa.
- `GET /api/jira/test` – kiểm tra xác thực với Jira.
- `GET /api/jira/issues?jql=...` – lấy issue theo JQL.
- `GET /api/sync` – lấy và chuẩn hóa task cho KPI.

Backend cần chạy trên máy/server có thể truy cập được Jira Data Center qua mạng nội bộ hoặc VPN. Với Jira hiện tại, cấu hình `JIRA_BASE_URL=https://jira.fptplay.net`, để trống `JIRA_PROJECT_KEY` nếu muốn lấy toàn bộ task theo JQL mặc định `ORDER BY created DESC`.
