# Backend KPI Performance — Project handover

## Product and current scope

Hệ thống đánh giá KPI tháng cho phòng Backend, kết hợp tiêu chí với Jira evidence. Trưởng phòng có thể xem điểm tổng và truy ngược qua formula, criteria, task Jira, audit và snapshot.

Đã có auth email/password, RBAC, SQLite/PostgreSQL, Redis sync lock, Jira sync/scheduler, quản trị user, dashboard trưởng phòng, đối soát/export và workflow backend `draft → submitted → approved → locked`.

Các giới hạn còn lại nằm ở [NEXT.md](../NEXT.md); trạng thái đã kiểm chứng nằm ở [STATUS.md](../STATUS.md).

## Repository map

| Path | Trách nhiệm |
|---|---|
| `app.js`, `index.html`, `styles.css` | Frontend core |
| `production-suite.js` | Persistence, formula version, RBAC UI |
| `manager-dashboard.js`, `reconciliation.js` | Manager view và traceability |
| `auth-ui.js`, `users-admin.js` | Auth và user administration |
| `backend/server.js`, `backend/auth.js` | API, JWT, workflow, Jira |
| `backend/store*.js` | SQLite/PostgreSQL adapters |
| `dist/client/` | Frontend build output |
| `tests/` | Automated và browser tests |

## Standard business flow

1. Admin cấu hình user, kỳ và criteria.
2. Jira issues được sync/map vào member.
3. Member/Leader nhập điểm và gắn evidence.
4. Member submit, Leader approve, Admin lock.
5. Backend tạo immutable snapshot/checksum.
6. Trưởng phòng kiểm tra Dashboard và Đối soát KPI.

## Ownership

- Platform/DevOps: secrets, TLS, PostgreSQL, Redis, backup/restore và network Jira.
- Admin nghiệp vụ: user/role, criteria, formula version và khóa kỳ.
- Leader: review, approve và đối soát team.
- Member: dữ liệu/evidence của chính mình.

## Required reading

1. [Getting started](GETTING_STARTED.md)
2. [Project context](PROJECT_CONTEXT.md)
3. [Architecture](ARCHITECTURE.md)
4. [API reference](API_REFERENCE.md)
5. [Database schema](DATABASE_SCHEMA.md)
6. [Data dictionary](DATA_DICTIONARY.md)
7. [RBAC matrix](RBAC_MATRIX.md)
8. [KPI calculation example](KPI_CALCULATION_EXAMPLE.md)
9. [Operations runbook](OPERATIONS_RUNBOOK.md)
10. [Test/release matrix](TEST_RELEASE_MATRIX.md)

## Handover checklist

- [ ] Jira URL/project/custom fields/Done statuses đã xác nhận.
- [ ] Production backend truy cập được Jira.
- [ ] Admin/Leader owners đã được chỉ định.
- [ ] Secrets nằm trong secret manager và bootstrap password đã rotate.
- [ ] PostgreSQL backup/restore drill thành công.
- [ ] Redis healthy nếu chạy nhiều instance.
- [ ] Login, RBAC, workflow và snapshot đã smoke test.
- [ ] Dashboard/đối soát khớp mẫu Jira thật.
- [ ] Release commit, migration và rollback target đã ghi lại.

Không xem local tests là bằng chứng production readiness nếu chưa hoàn thành checklist môi trường ở trên.
