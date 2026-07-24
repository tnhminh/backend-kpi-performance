# System Architecture – [TEN_DU_AN]

## 1. Kiến trúc đề xuất

```text
Browser
  ├── Frontend webapp
  └── HTTPS API
          |
          v
KPI Backend API
  ├── Authentication / RBAC
  ├── KPI formula service
  ├── Jira sync service
  ├── Audit service
  └── Notification service
          |
          ├── Database
          ├── Secret manager
          └── Jira Data Center
```

## 2. Bounded context

- Identity & access.
- Team/member directory.
- Review period.
- Criteria configuration.
- Evaluation scoring.
- Jira synchronization.
- Evidence/task linking.
- Reporting/dashboard.
- Audit and history.

## 3. Data model tối thiểu

```text
users
teams
members
review_periods
criteria_versions
criteria_groups
criteria_items
evaluations
evaluation_scores
evaluation_evidence
jira_issues
sync_runs
audit_logs
notifications
```

## 4. Nguyên tắc triển khai

- Frontend không giữ secret.
- Backend là nơi duy nhất gọi Jira.
- Công thức dùng một implementation duy nhất.
- Dữ liệu chốt kỳ bất biến.
- Audit log append-only.
- API có schema validation.
- Có health check và structured logging.

## 5. UI module chuẩn

- Overview/dashboard.
- Member evaluation.
- Cross-team comparison.
- Jira tasks.
- Criteria configuration.
- Formula explanation.
- Timeline/reminders.
- Audit log.
- Settings.

