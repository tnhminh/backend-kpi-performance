# Security & Deployment – [TEN_DU_AN]

> Reusable template; not current application documentation.

## 1. Secret policy

- Không commit PAT, password, API key, cookie hoặc bearer token.
- Không đặt secret trong frontend, URL, localStorage hoặc query string.
- Dùng secret manager/environment secret ở backend.
- Mask secret trong log và error response.
- Rotate token khi có nghi ngờ lộ.

## 2. Backend security

- HTTPS bắt buộc.
- Authentication cho mọi endpoint thay đổi dữ liệu.
- RBAC theo Admin/Leader/Member/Viewer.
- CORS chỉ cho `[PUBLIC_URL]`.
- Rate limit endpoint sync/config.
- Validate body/query trước khi gọi Jira.
- Timeout và giới hạn kích thước response.

## 3. Deployment

### Frontend

- Build static asset.
- Deploy lên `[FRONTEND_HOST]`.
- Cấu hình API base URL bằng environment/config an toàn.

### Backend

- Deploy trên server có network tới `[JIRA_URL]`.
- Chạy bằng process manager/container.
- Có health check.
- Có log rotation.
- Có backup database.

## 4. Pre-release checklist

- [ ] `node --check` hoặc build pass.
- [ ] Unit test formula pass.
- [ ] Integration test Jira pass.
- [ ] Không có secret bằng secret scanner.
- [ ] CORS đúng domain.
- [ ] Auth/RBAC pass.
- [ ] Migration database pass.
- [ ] Rollback version được chuẩn bị.

