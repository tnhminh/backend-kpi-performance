# Database schema

Backend tự tạo schema khi khởi động. Local dùng SQLite; production dùng PostgreSQL. Hai store phải giữ cùng hành vi.

## Entity overview

```text
users
  └─ actor identity for evaluation_periods, formula_versions,
     period_snapshots and audit_logs

evaluation_periods ── formula_versions
        └──────────── period_snapshots

jira_sync_runs ───── jira_issues
```

Các quan hệ actor/formula hiện là logical references, chưa khai báo foreign key để hỗ trợ import/migration linh hoạt.

## Tables

### `users`

| Column | Type | Meaning |
|---|---|---|
| `id` | text PK | Internal member/user ID |
| `display_name` | text | Display name |
| `role` | Member/Leader/Admin | Authorization role |
| `email` | text unique | Login email |
| `password_hash` | text | scrypt hash, never plaintext |
| `team` | text nullable | Team scope |
| `active` | boolean | Account enabled flag |
| timestamps | datetime | Created/updated |

### `evaluation_periods`

| Column | Meaning |
|---|---|
| `period` | `YYYY-MM`, primary key |
| `status` | draft/submitted/approved/locked |
| `state_json` | Member scores, workload, criteria links, Jira issues and UI state |
| `formula_version_id` | Logical formula version reference |
| `updated_by`, `updated_at` | Last writer |

### `formula_versions`

Stores immutable formula JSON, business version, checksum, creator and timestamp.

### `period_snapshots`

One row per locked period. `snapshot_json` contains locked state and formula; `checksum` is SHA-256 calculated by backend. Do not update an existing row.

### `audit_logs`

Tracks actor, role, action, entity, before/after JSON and time. Indexed by period/time.

### `jira_sync_runs`

Tracks idempotent `sync_key`, JQL, counts, warnings, timestamps and status. Used for operations and reconciliation.

### `jira_issues`

Stores the latest normalized issue plus raw normalized JSON, last sync key/time and searchable fields such as assignee, status, story points and deadline.

## Migration rules

1. Change both `store.js` and `store-postgres.js`.
2. Add a forward migration under `drizzle/` for production changes.
3. Backup PostgreSQL before applying a destructive migration.
4. Deploy backward-compatible application code before removing columns.
5. Validate row counts, health, login, state read/write and Jira issue read after migration.
6. Prefer forward-fix; rollback application only while database schema remains compatible.

## Backup/restore verification

- Backup: use `scripts/backup.sh` or the equivalent controlled PostgreSQL command.
- Restore into a separate database/environment.
- Verify users, periods, snapshots, formula versions, audit logs and Jira issue counts.
- Login and open a locked snapshot after restore.
