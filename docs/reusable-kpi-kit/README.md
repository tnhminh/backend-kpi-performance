# Reusable KPI Project Kit

Bộ tài liệu dùng để khởi tạo nhanh các webapp KPI tương tự cho team/phòng ban khác.

## Cách sử dụng

1. Copy nguyên thư mục `docs/reusable-kpi-kit` sang project mới.
2. Mở [PROJECT_CONTEXT_TEMPLATE.md](PROJECT_CONTEXT_TEMPLATE.md).
3. Thay toàn bộ placeholder dạng `[TEN_DU_AN]`, `[TEAM]`, `[JIRA_URL]`.
4. Đổi tên `PROJECT_CONTEXT_TEMPLATE.md` thành `PROJECT_CONTEXT.md` sau khi điền.
5. Đọc theo thứ tự:

```text
01_PRODUCT_REQUIREMENTS.md
02_KPI_FORMULA_SPEC.md
03_JIRA_INTEGRATION_SPEC.md
04_SYSTEM_ARCHITECTURE.md
05_IMPLEMENTATION_PLAN.md
06_SECURITY_DEPLOYMENT.md
07_HANDOVER_CHECKLIST.md
08_PRODUCTION_BUILD_PLAN.md
PROJECT_CONTEXT_TEMPLATE.md
BUILD_BRIEF_TEMPLATE.md
```

5. Giao các file này cho người triển khai cùng với file context đã điền.

## Quy tắc placeholder

| Placeholder | Ý nghĩa |
|---|---|
| `[TEN_DU_AN]` | Tên project |
| `[PHONG_BAN]` | Phòng ban sử dụng |
| `[TEAM_LIST]` | Danh sách team |
| `[JIRA_URL]` | Jira Data Center/Cloud URL |
| `[JIRA_PROJECT_KEY]` | Project key |
| `[OWNER]` | Người sở hữu sản phẩm |
| `[ADMIN_GROUP]` | Nhóm Admin |
| `[REVIEW_PERIOD]` | Kỳ đánh giá |
| `[PUBLIC_URL]` | Domain public nếu có |

## Nguyên tắc bắt buộc

- Công thức phải nằm trong tài liệu và có ví dụ kiểm chứng.
- Tổng trọng số tiêu chí phải được validate bằng code.
- Không commit token/password.
- Mọi dữ liệu chốt kỳ phải có version và audit log.
- Jira sync phải có trạng thái, lỗi và danh sách task không map được.
