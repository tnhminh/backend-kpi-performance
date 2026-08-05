# Production Build Plan – [TEN_DU_AN]

> Reusable template; not current application documentation.

Plan triển khai production đầy đủ cho hệ thống KPI có frontend, backend, database, API và tích hợp Jira.

## 1. Kiến trúc production

```text
Users
  |
  v
HTTPS / Reverse Proxy / WAF
  |
  ├── Frontend static app
  └── Backend API
        ├── Auth & RBAC
        ├── KPI Formula Service
        ├── Evaluation Service
        ├── Criteria Service
        ├── Jira Sync Service
        ├── Evidence Service
        ├── Audit Service
        └── Notification Service
              |
              ├── PostgreSQL/MySQL database
              ├── Redis/queue nếu cần
              ├── Secret manager
              └── Jira Data Center
```

## 2. Production decisions

- [ ] Domain frontend: `[PUBLIC_URL]`.
- [ ] Domain API: `[API_URL]`.
- [ ] Database: `PostgreSQL / MySQL`.
- [ ] Môi trường: `dev / staging / production`.
- [ ] Nơi chạy: `VM / Kubernetes / managed platform`.
- [ ] Secret manager.
- [ ] Nơi lưu file export/evidence.
- [ ] Owner vận hành và SLA.

## 3. Repository và codebase

```text
apps/web/                 # frontend
apps/api/                 # backend HTTP API
apps/worker/              # Jira sync, notification, scheduled jobs
packages/formula/         # công thức dùng chung
packages/contracts/       # API schemas/types
database/migrations/      # database migrations
database/seeds/           # seed role/team/criteria
tests/                    # unit/integration/e2e
infra/                    # docker/k8s/terraform
docs/                     # tài liệu và runbook
```

Quy tắc:

- Browser không gọi Jira trực tiếp.
- API, formula và database không phụ thuộc trực tiếp vào UI.
- Mọi input có schema validation.
- Formula service có unit test và golden test.
- Không lưu secret trong source.
- Migration phải backward-compatible khi rollout.

## 4. Database production

### Bảng tối thiểu

```text
users, roles, user_roles
teams, members, member_team_history
review_periods, review_period_status_history
criteria_versions, criteria_groups, criteria_items, criteria_rules
evaluations, evaluation_scores, evaluation_bonuses, evaluation_evidence
jira_connections, jira_issues, jira_issue_assignments
sync_runs, sync_errors, audit_logs, notifications
```

### Data rules

- Mọi bảng có `id`, `created_at`, `updated_at`.
- Dữ liệu chốt kỳ có `review_period_id`, `criteria_version_id`.
- Không update trực tiếp dữ liệu đã khóa.
- Soft delete team/member/criteria nếu cần lịch sử.
- Unique key: `jira_issues(provider, issue_key)`.
- Index: `review_period_id`, `member_id`, `team_id`, `jira_account_id`, `status`.
- Audit log append-only.

### Migration checklist

- [ ] Migration tạo schema.
- [ ] Seed role và permission.
- [ ] Seed dữ liệu mẫu staging.
- [ ] Seed criteria version đầu tiên.
- [ ] Có rollback hoặc forward-fix plan.
- [ ] Backup trước migration production.

## 5. Backend API

API dùng version prefix `/api/v1`.

```text
GET/PATCH /api/v1/me
GET/POST/PATCH /api/v1/users
GET/POST/PATCH /api/v1/teams
GET/POST/PATCH /api/v1/members

GET/POST /api/v1/review-periods
GET /api/v1/review-periods/:id
PATCH /api/v1/review-periods/:id/status
POST /api/v1/review-periods/:id/lock

GET/POST /api/v1/criteria-versions
POST /api/v1/criteria-versions/:id/apply-to-team
POST /api/v1/criteria-versions/:id/publish

GET /api/v1/review-periods/:id/evaluations
GET/PATCH /api/v1/evaluations/:id
PATCH /api/v1/evaluations/:id/scores
PATCH /api/v1/evaluations/:id/evidence
POST /api/v1/evaluations/:id/submit
POST /api/v1/evaluations/:id/review
POST /api/v1/evaluations/:id/approve

GET /api/v1/integrations/jira
POST /api/v1/integrations/jira/test
POST /api/v1/integrations/jira/sync
GET /api/v1/jira/issues
GET /api/v1/sync-runs
GET /api/v1/sync-runs/:id/errors

GET /api/v1/dashboard/overview
GET /api/v1/reports/member/:id
GET /api/v1/reports/team/:id
GET /api/v1/reports/export?format=xlsx
```

### API standards

- JSON response thống nhất.
- Error code ổn định, không trả stack trace production.
- Pagination cho list API.
- Filter/sort rõ ràng.
- Idempotency key cho sync, submit và lock.
- OpenAPI/Swagger được version hóa.

## 6. Backend services

### Formula service

- Validate tổng trọng số.
- Tính base score, bonus, final score, grade, coefficient.
- Trả breakdown từng thành phần.
- Có test biên và golden test đối chiếu bảng tính.

### Evaluation service

- Kiểm tra quyền và trạng thái kỳ.
- Lưu score/evidence transactionally.
- Tạo audit event sau mỗi thay đổi.

### Jira sync service

- Đọc Jira theo JQL và pagination.
- Normalize issue và upsert theo issue key.
- Resolve member bằng account ID/email/name.
- Ghi task không map được.
- Retry lỗi tạm thời.
- Lưu sync run và metrics.

### Worker/scheduler

- Sync Jira theo lịch `[SYNC_SCHEDULE]`.
- Nhắc hạn member/Leader.
- Gửi notification lỗi sync.
- Dùng queue cho tác vụ chạy lâu.

## 7. Frontend production

- [ ] Tách API client khỏi component.
- [ ] Auth session và refresh.
- [ ] Route guard theo role.
- [ ] Loading skeleton.
- [ ] Empty/error/retry state.
- [ ] Form validation và cảnh báo dữ liệu chưa lưu.
- [ ] Responsive desktop/mobile.
- [ ] Accessibility keyboard/focus/contrast.
- [ ] Không để token trong localStorage.
- [ ] Dashboard gọi API thật, không dùng mock production.

## 8. Security

- [ ] SSO/OIDC hoặc corporate identity.
- [ ] RBAC backend, không chỉ ẩn nút frontend.
- [ ] HTTPS và secure headers.
- [ ] CORS allowlist.
- [ ] CSRF protection nếu dùng cookie session.
- [ ] Rate limit.
- [ ] Secret manager.
- [ ] Database encryption và backup encryption.
- [ ] Audit login, sync, score change, approve, lock.
- [ ] Dependency scan và secret scan CI.
- [ ] PAT Jira quyền tối thiểu và rotate định kỳ.

## 9. CI/CD

```text
Pull Request
  → lint/test/scan
  → build artifact
  → deploy staging
  → smoke test
  → approval
  → deploy production
  → health check
  → rollback nếu fail
```

CI bắt buộc:

- [ ] Lint và unit test.
- [ ] Formula golden test.
- [ ] Integration test API.
- [ ] Build frontend/backend.
- [ ] Migration validation.
- [ ] Secret scan.
- [ ] Dependency vulnerability scan.

Versioning dùng tag `vMAJOR.MINOR.PATCH`; release note phải ghi migration version và criteria version.

## 10. Observability

### Logs và metrics

- Structured JSON log.
- Có `requestId`, `userId`, `reviewPeriodId`, `syncRunId`.
- Không log token/password.
- Đo API latency/error rate.
- Đo Jira sync duration/success/failure.
- Đo task lấy được/map được/unmapped.
- Đo database storage và backup status.

### Alerts

- Backend down.
- Jira authentication fail.
- Sync fail liên tiếp.
- Database storage thấp.
- Backup fail.
- Error rate vượt ngưỡng.

## 11. Backup và disaster recovery

- [ ] Backup database tự động.
- [ ] Backup encrypted và lưu khác máy.
- [ ] Test restore định kỳ.
- [ ] RPO: `[RPO]`.
- [ ] RTO: `[RTO]`.
- [ ] Runbook rollback application.
- [ ] Runbook rotate Jira token.

## 12. Go-live

### Staging sign-off

- [ ] Nghiệp vụ duyệt công thức.
- [ ] Jira sync đối soát với source of truth.
- [ ] Member mapping đạt `[MAPPING_TARGET]%`.
- [ ] Role test pass.
- [ ] Lock period test pass.
- [ ] Export report test pass.
- [ ] Performance test pass.

### Production launch

- [ ] Backup trước release.
- [ ] Chạy migration.
- [ ] Deploy API.
- [ ] Deploy worker.
- [ ] Deploy frontend.
- [ ] Cấu hình secret.
- [ ] Smoke test login, dashboard, sync, scoring.
- [ ] Theo dõi logs/metrics trong `[OBSERVATION_WINDOW]`.
- [ ] Gửi thông báo go-live.

## 13. Production Definition of Done

- [ ] Frontend và backend chạy qua HTTPS.
- [ ] Database trung tâm hoạt động.
- [ ] API có auth, RBAC, validation và OpenAPI.
- [ ] Jira sync có pagination, retry, history và unmapped report.
- [ ] Formula có version, test và breakdown.
- [ ] Có migration, backup, restore và rollback.
- [ ] Có monitoring, alert và runbook.
- [ ] Không có secret trong Git/artifact/frontend.
- [ ] Product Owner và Operations ký nghiệm thu.

