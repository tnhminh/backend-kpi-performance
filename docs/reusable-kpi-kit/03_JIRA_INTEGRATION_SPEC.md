# Jira Integration Specification – [TEN_DU_AN]

## 1. Mục tiêu tích hợp

Đọc task Jira theo kỳ/project, normalize dữ liệu và đưa vào KPI. MVP dùng read-only API.

## 2. Endpoint tối thiểu

```text
GET  /api/health
POST /api/config
GET  /api/jira/test
GET  /api/jira/issues
GET  /api/sync
```

## 3. Jira REST API

```text
GET [JIRA_URL]/rest/api/2/search
GET [JIRA_URL]/rest/api/2/myself
```

JQL mặc định:

```text
[DEFAULT_JQL]
```

## 4. Field mapping

| Dữ liệu KPI | Jira field | Bắt buộc |
|---|---|---|
| Task key | `issue.key` | Có |
| Tiêu đề | `fields.summary` | Có |
| Assignee | `fields.assignee` | Có |
| Trạng thái | `fields.status.name` | Có |
| Story point | `[STORY_POINT_FIELD]` | Nên có |
| Deadline | `[DEADLINE_FIELD]` | Tùy nghiệp vụ |
| Resolved time | `fields.resolutiondate` | Tùy nghiệp vụ |
| Issue type | `fields.issuetype.name` | Nên có |

## 5. Normalize issue

```json
{
  "key": "BE-123",
  "title": "Example task",
  "url": "[JIRA_URL]/browse/BE-123",
  "member": "Assignee display name",
  "accountId": "jira-account-id",
  "status": "Done",
  "done": true,
  "storyPoints": 3,
  "deadline": "2026-07-20",
  "resolvedAt": "2026-07-20T10:00:00Z",
  "issueType": "Story"
}
```

## 6. Mapping member

Ưu tiên theo thứ tự:

1. Jira account ID.
2. Email.
3. Tên đã normalize: bỏ dấu, lowercase, bỏ ký tự đặc biệt.
4. Danh sách mapping thủ công.

Task không map được phải được đưa vào `unmapped issues` để xử lý, không âm thầm bỏ qua.

## 7. Sync policy

- Có `syncRunId`, thời gian bắt đầu/kết thúc và trạng thái.
- Có pagination.
- Có retry cho lỗi 429/5xx.
- Có timeout.
- Không lưu token trong database log.
- Sync idempotent theo Jira issue key.
- Có thể lọc theo project, assignee, sprint và kỳ.

## 8. Jira permission

PAT chỉ nên có quyền đọc issue cần thiết. Không dùng token Admin nếu không cần.

