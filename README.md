# Backend KPI Performance

Webapp đánh giá KPI cho phòng Backend, có tính điểm theo tiêu chí cha/con, so sánh workload liên nhóm và đồng bộ task từ Jira Data Center.

## Tài liệu bàn giao

- [Tài liệu tổng quan và bàn giao](docs/PROJECT_HANDOVER.md)
- [Kế hoạch triển khai](docs/IMPLEMENTATION_PLAN.md)
- [Runbook vận hành](docs/OPERATIONS_RUNBOOK.md)
- [Changelog](docs/CHANGELOG.md)

## Chạy nhanh

```powershell
cd backend
npm start
```

Frontend có thể chạy từ `outputs/backend-kpi-app` trên port `5174`. Xem tài liệu bàn giao để biết cấu hình Jira, công thức và checklist production.

## Deploy portable

Project production đã bao gồm frontend, backend, PostgreSQL, Redis, Nginx, health check và backup trong Docker Compose. Trên server Linux có Docker:

```sh
cp .env.production.example .env
# điền POSTGRES_PASSWORD và cấu hình Jira trong .env
./scripts/deploy.sh
```

Chi tiết xem [hướng dẫn deploy portable](docs/DEPLOYMENT_PORTABLE.md).

## Public demo

https://backend-kpi-performance.ngaquyenphamquyen682.chatgpt.site

