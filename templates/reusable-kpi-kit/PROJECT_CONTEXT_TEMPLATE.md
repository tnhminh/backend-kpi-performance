# Project Context – [TEN_DU_AN]

> Reusable template; not current application documentation.

## 1. Thông tin chung

- Tên hệ thống: `[TEN_DU_AN]`
- Phòng ban: `[PHONG_BAN]`
- Product owner: `[OWNER]`
- Người triển khai: `[IMPLEMENTATION_TEAM]`
- Kỳ đánh giá: `[REVIEW_PERIOD]`
- Domain: `[PUBLIC_URL]`

## 2. Team và vai trò

| Team | Leader | Số member | Bộ tiêu chí |
|---|---|---:|---|
| `[TEAM_1]` | `[LEADER_1]` | `[COUNT]` | `[CRITERIA_VERSION]` |
| `[TEAM_2]` | `[LEADER_2]` | `[COUNT]` | `[CRITERIA_VERSION]` |

Vai trò hệ thống:

- Admin: `[ADMIN_GROUP]`
- Leader: `[LEADER_GROUP]`
- Member: `[MEMBER_GROUP]`
- Viewer/Auditor: `[VIEWER_GROUP]`

## 3. Jira

- Jira URL: `[JIRA_URL]`
- Jira loại: `Data Center / Cloud`
- Project key: `[JIRA_PROJECT_KEY]`
- Assignee field: `[ASSIGNEE_FIELD]`
- Story point field: `[STORY_POINT_FIELD]`
- Deadline field: `[DEADLINE_FIELD]`
- Status hoàn thành: `[DONE_STATUSES]`
- JQL mặc định: `[DEFAULT_JQL]`

## 4. Dữ liệu member

Nguồn chính: `[HR_FILE / DIRECTORY / JIRA / MANUAL]`

Mỗi member tối thiểu cần:

```text
employeeId
displayName
email
team
leader
jiraAccountId
activeFrom
activeTo
```

## 5. Quy tắc nghiệp vụ đặc biệt

- Leader có bộ tiêu chí riêng: `[YES/NO]`
- Có thưởng/trừ: `[YES/NO]`
- Có so sánh liên nhóm: `[YES/NO]`
- Có khóa kỳ: `[YES/NO]`
- Có cần export Excel/PDF: `[YES/NO]`
- Có cần notification: `[YES/NO]`

## 6. Quyết định cần chốt trước khi code

- [ ] Công thức và ngưỡng điểm.
- [ ] Owner phê duyệt bộ tiêu chí.
- [ ] Jira field mapping.
- [ ] Quyền từng vai trò.
- [ ] Nguồn dữ liệu member.
- [ ] Nơi deploy frontend/backend.
- [ ] Chính sách lưu trữ và xóa dữ liệu.

