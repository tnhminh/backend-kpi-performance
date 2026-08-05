# Production hardening suite

> Historical implementation note. Xem `../STATUS.md`, `PROJECT_HANDOVER.md` và `TEST_RELEASE_MATRIX.md` để biết trạng thái hiện hành.

## Phạm vi đã triển khai

1. **Regression tests**
   - Kiểm tra script load order, slider giữ state handler, modal không bị overlay chặn.
   - Kiểm tra Jira field multi-select, title fallback và color coding.
   - Kiểm tra SQLite store và RBAC API.
   - Chạy bằng `node --test tests/*.test.mjs`.

2. **Backend persistence**
   - SQLite qua `node:sqlite`, không cần package ngoài.
   - Lưu kỳ đánh giá, trạng thái, công thức, user, audit log và Jira sync run.
   - File mặc định: `backend/data/backend-kpi.sqlite`.

3. **RBAC**
   - Member chỉ sửa đánh giá của chính mình.
   - Leader chỉ review member cùng team.
   - Admin quản trị toàn bộ, cấu hình và khóa kỳ.
   - Backend nhận `x-user-id` và `x-user-role`; production thực tế cần thay bằng SSO/JWT đã xác thực.

4. **Jira quality**
   - Sync run idempotent theo JQL và time bucket.
   - Cảnh báo task thiếu assignee, Story Point, deadline hoặc labels.
   - Lưu lịch sử sync và hiển thị chất lượng dữ liệu trên dashboard.

5. **So sánh liên nhóm**
   - 30% completion.
   - 35% effort/Story Point.
   - 25% KPI chất lượng.
   - 10% predictability.
   - Điểm cuối gồm 75% tuyệt đối và 25% vị trí tương đối trong team.

6. **Formula version**
   - Sinh checksum theo toàn bộ trọng số và tiêu chí team.
   - Có thể tạo snapshot thủ công; tự snapshot khi khóa kỳ.
   - Backend lưu phiên bản bất biến trong bảng `formula_versions`.

7. **Data-quality dashboard**
   - Task Jira, task chưa map, task thiếu Story Point/deadline.
   - Member chưa có điểm và bộ công thức sai tổng.

8. **UI/motion**
   - Chú giải màu Jira field.
   - Công tắc tắt animation/parallax trong Cài đặt.
   - Hỗ trợ `prefers-reduced-motion`.

## API mới

- `GET|PUT /api/state?period=YYYY-MM`
- `GET|POST /api/users`
- `GET /api/audit?period=YYYY-MM`
- `GET|POST /api/formulas`
- `GET /api/jira/sync-runs`

## Lưu ý production

RBAC header hiện là cơ chế demo/local. Khi triển khai nội bộ, reverse proxy hoặc backend cần xác thực SSO/JWT và tự tạo user/role header; không tin header do trình duyệt gửi trực tiếp.
