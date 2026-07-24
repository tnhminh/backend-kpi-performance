# Build Brief – Dùng để giao cho agent/team triển khai

Bạn đang xây dựng `[TEN_DU_AN]` cho `[PHONG_BAN]`.

Hãy đọc toàn bộ file trong thư mục `docs/reusable-kpi-kit` trước khi code, đặc biệt:

1. `PROJECT_CONTEXT.md` đã được điền từ `PROJECT_CONTEXT_TEMPLATE.md`.
2. `01_PRODUCT_REQUIREMENTS.md`.
3. `02_KPI_FORMULA_SPEC.md`.
4. `03_JIRA_INTEGRATION_SPEC.md`.
5. `04_SYSTEM_ARCHITECTURE.md`.
6. `05_IMPLEMENTATION_PLAN.md`.
7. `06_SECURITY_DEPLOYMENT.md`.
8. `07_HANDOVER_CHECKLIST.md`.

## Yêu cầu triển khai

- Giữ đúng công thức trong formula spec.
- Không hard-code token hoặc password.
- Không thay đổi nghiệp vụ khi chưa cập nhật tài liệu.
- Mỗi module phải có loading, empty và error state.
- Mỗi thay đổi phải có test hoặc cách kiểm chứng.
- Cập nhật changelog sau mỗi milestone.
- Trước khi bàn giao, chạy toàn bộ handover checklist.

## Output bắt buộc

- Source code frontend/backend.
- `.env.example`.
- README chạy local.
- Test formula.
- API documentation.
- Changelog.
- Deployment/runbook.
- Handover checklist đã đánh dấu.

## Câu hỏi phải hỏi trước khi triển khai nếu context còn thiếu

- Công thức chính thức là gì?
- Tổng trọng số là bao nhiêu?
- Jira field nào là story point/deadline?
- Status nào được xem là hoàn thành?
- Ai được xem/sửa/duyệt/khóa?
- Dữ liệu lưu bao lâu?
- Domain/backend host production là gì?
