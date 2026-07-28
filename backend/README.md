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

`/api/sync` có pagination và giới hạn tổng số issue bằng `JIRA_SYNC_MAX_ISSUES` (mặc định 1000). Có thể truyền `maxIssues`, `maxResults`, `project` hoặc `jql` để giới hạn phạm vi đồng bộ.

Backend cần chạy trên máy/server có thể truy cập được Jira Data Center qua mạng nội bộ hoặc VPN. Cấu hình mặc định mẫu đang lấy project `BE`, label `Sprint26`, sắp xếp theo `lastViewed DESC`; có thể thay `JIRA_DEFAULT_JQL` theo kỳ/sprint thực tế.
