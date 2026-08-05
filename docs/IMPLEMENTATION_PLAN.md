# Kế hoạch triển khai Backend KPI Performance

> Historical plan. Không dùng file này để xác định trạng thái hiện tại. Xem `../STATUS.md` và `../NEXT.md`.

## Mục tiêu

Chuyển prototype hiện tại thành hệ thống có thể vận hành thật cho các team Backend, đồng bộ Jira Data Center và bảo đảm công thức KPI/audit có thể kiểm tra lại.

## Phase 0 – Tiếp nhận và khóa phạm vi

### Việc cần làm

- Xác nhận danh sách team, member, Leader và mã nhân viên.
- Xác nhận kỳ đánh giá: tháng hay chu kỳ khác.
- Chốt bộ tiêu chí và trọng số theo từng team.
- Xác nhận field Story Point, deadline, assignee và status Jira.
- Xác nhận người có quyền Admin, Leader, Member.

### Kết quả cần đạt

- Có file mapping member ↔ Jira account.
- Có catalog tiêu chí version `v1`.
- Có danh sách status Jira được tính là hoàn thành.

## Phase 1 – Dựng môi trường chạy

### Việc cần làm

- Dựng backend Node.js trên server nội bộ hoặc VM.
- Đảm bảo server truy cập được Jira Data Center.
- Cấu hình `.env` bằng secret manager.
- Cấu hình domain/API HTTPS.
- Cấu hình CORS chỉ cho domain KPI.

### Acceptance criteria

- `/api/health` trả `ok=true`.
- `/api/jira/test` xác thực thành công.
- `/api/sync` lấy được task thật.
- Không có token trong log, source hoặc response.

## Phase 2 – Đồng bộ Jira đáng tin cậy

### Việc cần làm

- Thêm pagination để lấy toàn bộ task khi tổng số vượt 100.
- Thêm bộ lọc JQL theo project, sprint, assignee và kỳ đánh giá.
- Chuẩn hóa timezone và deadline.
- Lưu `lastSyncAt`, số task lấy được, số task map được và lỗi.
- Có nút sync lại và trạng thái loading/error rõ ràng.
- Xử lý field story point tùy theo project.

### Acceptance criteria

- Không trùng task sau nhiều lần sync.
- Có báo cáo task không map được member.
- Có thể đối soát tổng task với Jira.

## Phase 3 – Đưa dữ liệu về database

### Việc cần làm

- Thay localStorage bằng database.
- Thiết kế các bảng chính:

```text
users
teams
members
review_periods
criteria_versions
criteria_parents
criteria_children
evaluations
evaluation_scores
evaluation_evidence
jira_issues
sync_runs
audit_logs
```

- Tách dữ liệu theo kỳ đánh giá và version bộ tiêu chí.
- Không cho sửa dữ liệu đã khóa nếu không có quy trình mở khóa.

### Acceptance criteria

- Hai người dùng khác nhau nhìn thấy cùng dữ liệu.
- Refresh hoặc đổi máy không mất dữ liệu.
- Có thể khôi phục dữ liệu theo kỳ.

## Phase 4 – Quyền và workflow

### Vai trò đề xuất

| Vai trò | Quyền |
|---|---|
| Admin | Cấu hình tiêu chí, member, Jira, kỳ và khóa báo cáo |
| Leader | Nhập/review điểm member thuộc team, xem minh chứng |
| Member | Xem task/điểm của mình, bổ sung minh chứng nếu được phép |
| Auditor/Viewer | Chỉ xem báo cáo và audit |

### Workflow

```text
Nháp → Đã gửi → Leader review → Đã duyệt → Đã khóa
```

### Acceptance criteria

- User không thể sửa dữ liệu ngoài quyền.
- Kỳ đã khóa không thể sửa trực tiếp.
- Mọi chuyển trạng thái có audit log.

## Phase 5 – Chuẩn hóa công thức

### Việc cần làm

- Đưa toàn bộ formula thành cấu hình hoặc rule engine.
- Version hóa bộ tiêu chí và ngưỡng xếp hạng.
- Lưu snapshot công thức tại thời điểm chốt kỳ.
- Cho phép xem breakdown của từng điểm.
- Có test case cố định cho từng ngưỡng 60%, 75%, 90%.

### Acceptance criteria

- Kết quả UI khớp với bảng tính chuẩn.
- Cùng input luôn cho cùng output.
- Có test biên: 0, đúng ngưỡng, vượt ngưỡng, tổng trọng số khác 10.

## Phase 6 – Tự động hóa

### Việc cần làm

- Scheduler sync Jira theo giờ/ngày.
- Nhắc deadline member và Leader.
- Email/Teams/Slack notification nếu cần.
- Tự phát hiện task thiếu story point, thiếu assignee hoặc không có deadline.
- Dashboard lịch sử theo tháng.

## Phase 7 – Báo cáo và bàn giao vận hành

### Việc cần làm

- Export Excel/PDF.
- Báo cáo theo member, team, kỳ và xu hướng.
- Trang audit có filter theo user/action/time.
- Viết runbook xử lý lỗi Jira, token và sync.
- Training ngắn cho Admin và Leader.

## Backlog ưu tiên

### P0 – Bắt buộc

- Backend authentication.
- HTTPS.
- Database trung tâm.
- Pagination Jira.
- Quyền Admin/Leader/Member.
- Snapshot công thức và kỳ khóa.

### P1 – Nên làm ngay sau P0

- Scheduler sync.
- Báo cáo export.
- Mapping member bằng Jira account ID chính thức.
- Notification deadline.
- Retry và sync history.

### P2 – Cải tiến

- Tạo task trong KPI và đẩy xuống Jira.
- Hai chiều cập nhật task.
- Phân tích xu hướng và cảnh báo bất thường.
- Tích hợp SSO.

## Rủi ro và cách giảm thiểu

| Rủi ro | Tác động | Cách giảm thiểu |
|---|---|---|
| Assignee Jira không khớp member | Sai workload | Dùng account ID mapping và danh sách ngoại lệ |
| Story point thiếu hoặc khác field | Sai fairness score | Cấu hình field theo project, hiển thị cảnh báo |
| Status Jira khác Done | Task chưa được tính hoàn thành | Cấu hình danh sách status và test thực tế |
| Sửa tiêu chí giữa kỳ | Không đối soát được | Version hóa và khóa bộ tiêu chí sau khi bắt đầu kỳ |
| Token hết hạn | Sync lỗi | Health check, cảnh báo và quy trình rotate token |
| LocalStorage mất dữ liệu | Mất đánh giá | Chuyển database trước khi go-live |

