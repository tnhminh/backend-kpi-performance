# Backend KPI Performance - Kế hoạch build tiếp bằng vibecode

> Historical planning snapshot. Backlog hiện hành nằm ở `../NEXT.md`; trạng thái đã build nằm ở `../STATUS.md`.

## 1. Baseline hiện tại

Ngày lập plan: 2026-07-31

Commit baseline trước khi lập plan:

```text
9f4527c fix: recalculate V2 score when Jira tasks change
```

Trạng thái code tại thời điểm lập plan:

- Worktree sạch, không có file local chưa commit.
- Local Docker stack đã chạy được trên port 8081.
- Public site hiện có: `https://backend-kpi-performance.ngaquyenphamquyen682.chatgpt.site`.
- Public site có thể chưa phải bản mới nhất nếu project hosting hiện tại không truy cập được từ connector deploy.
- Test gần nhất: `22/22 passed`.

Những tính năng đã có nên giữ:

- Frontend KPI dashboard, đánh giá member, so sánh liên nhóm, tạo task, Task Jira, timeline, trình giả lập, công thức, audit log, cấu hình tiêu chí.
- Backend Node.js API, Docker Compose portable với web, backend, PostgreSQL, Redis.
- Jira sync, pagination, filter, field display, task evidence picker.
- Lưu đánh giá vào DB/backend state, không chỉ phụ thuộc localStorage như bản prototype cũ.
- V1 scoring được giữ lại.
- V2 Story Point 70/30 đã thêm và đã sửa lỗi tính lại điểm khi thay đổi task Jira.
- Auto fill Story Point cho task Jira hiện có trong DB.
- Formula panel cho màn So sánh liên nhóm.

## 2. Nguyên tắc build tiếp

- Build tiếp trên branch mới từ `main`, không sửa trực tiếp nếu chưa review.
- Giữ V1 bất biến. Mọi thay đổi liên quan Story Point phải nằm trong V2 hoặc version mới.
- Mọi logic tính điểm phải có formula text trên UI và test tương ứng.
- Dữ liệu Jira thiếu Story Point, deadline, assignee phải hiện cảnh báo rõ, không âm thầm tính sai.
- Mỗi task cần có acceptance criteria rõ để người review bấm vào test được.

## 3. Tổng manday dự kiến

Tổng dự kiến nếu vibecode: **8.5 - 11 manday**.

Nếu code chay thủ công, không dùng vibecode, cùng scope này thường khoảng **18 - 25 manday** vì mất nhiều thời gian ở các phần đọc code, dựng UI state, viết test hồi quy, test Jira/DB và sửa edge case.

Estimate bên dưới tính theo 1 member có thể dùng AI coding assistant để đọc code, patch, build, chạy test và QA nhanh.

## 4. Task breakdown

| ID | Task | Subtask | MD vibecode | Output | Acceptance criteria |
|---|---|---|---:|---|---|
| T1 | Onboard và đồng bộ môi trường | Clone/pull `main`, checkout từ commit mới nhất, cài dependency, tạo `.env`, chạy Docker stack | 0.25 | Local app chạy được | Mở `http://localhost:8081`, backend health ok |
| T1 | Onboard và đồng bộ môi trường | Đọc `README.md`, `PROJECT_HANDOVER.md`, `PRODUCTION_SUITE.md`, `DEPLOYMENT_PORTABLE.md`, file plan này | 0.25 | Nắm được kiến trúc | Member giải thích được luồng Jira -> DB -> UI -> điểm KPI |
| T2 | Cập nhật docs theo trạng thái mới | Sửa docs cũ còn nói localStorage/memory token thành trạng thái mới: DB, Docker, V1/V2, Story Point autofill | 0.5 | Docs không lệch code | Handover doc khớp tính năng hiện tại |
| T2 | Cập nhật docs theo trạng thái mới | Bổ sung troubleshooting: public site chưa update, hosting project inaccessible, cách deploy portable | 0.25 | Hướng dẫn vận hành rõ hơn | Member mới không nhầm public đã là latest |
| T3 | Khóa chặt scoring V1/V2 | Tạo test case cho V1: slider thủ công, task evidence chỉ làm minh chứng, điểm đổi theo slider | 0.5 | Regression test V1 | V1 không bị logic Story Point ảnh hưởng |
| T3 | Khóa chặt scoring V1/V2 | Tạo test case cho V2: thêm/bỏ task, task thiếu deadline/SP, on-time/off-time, score cập nhật ngay | 0.75 | Regression test V2 | Chọn task thay đổi thì delivery score và total score cập nhật |
| T3 | Khóa chặt scoring V1/V2 | UI copy giải thích rõ: điểm có thể không đổi nếu tỷ lệ đạt không đổi | 0.25 | Tooltip/text ngắn trong modal | User hiểu vì sao thêm/bớt task có lúc điểm vẫn bằng nhau |
| T4 | Cải thiện task evidence picker | Thêm count theo nhóm: selected, on-time, late, missing deadline, missing story point | 0.75 | Picker có summary | Mở dropdown nhìn được chất lượng task đang chọn |
| T4 | Cải thiện task evidence picker | Thêm filter trong picker: tất cả, done, late, missing SP, missing deadline | 0.75 | Chọn task nhanh hơn | Danh sách lớn vẫn dễ thao tác |
| T4 | Cải thiện task evidence picker | Hiện công thức mini ngay dưới picker cho V2 delivery criterion | 0.25 | UI minh bạch | Reviewer đối soát được selected tasks -> điểm |
| T5 | Jira data quality và auto fill Story Point | Chạy auto fill Story Point trên DB hiện tại, log số task đã cập nhật/bỏ qua | 0.5 | Batch update on demand | Có summary: updated/skipped/errors |
| T5 | Jira data quality và auto fill Story Point | Thêm dry-run mode cho auto fill để preview trước khi ghi DB | 0.5 | Preview an toàn | Bấm dry-run không làm đổi data |
| T5 | Jira data quality và auto fill Story Point | Thêm audit log cho auto fill Story Point | 0.25 | Audit truy vết được | Audit hiện ai chạy, lúc nào, số record |
| T6 | Database và state consistency | Kiểm tra lại các màn hình đọc/ghi cùng 1 source backend state, tránh localStorage shadow data | 0.75 | State source-of-truth rõ | Refresh/máy khác vẫn thấy cùng dữ liệu |
| T6 | Database và state consistency | Thêm migration/seed nhỏ cho review period, formula version, users demo nếu DB mới | 0.75 | DB mới có data khởi tạo | Docker up lần đầu không trắng rỗng bất thường |
| T6 | Database và state consistency | Thêm backup/restore smoke check cho PostgreSQL | 0.5 | Kịch bản khôi phục | Backup file tạo được và restore test qua |
| T7 | Auth/RBAC sẵn sàng nội bộ | Thay demo headers bằng middleware để sau này gắn SSO/JWT/reverse proxy | 0.75 | Auth boundary rõ | Không tin role từ browser nếu deploy production |
| T7 | Auth/RBAC sẵn sàng nội bộ | Enforcement trên API: Admin/Leader/Member/Viewer cho state, formula, audit, sync | 1.0 | API không vượt quyền | Test role pass/fail rõ |
| T7 | Auth/RBAC sẵn sàng nội bộ | UI hide/disable action theo role, kèm message khi không có quyền | 0.5 | UX đúng role | Member không thấy nút admin nguy hiểm |
| T8 | Jira sync automation | Thêm scheduler sync theo config giờ/ngày, có lock Redis để tránh chạy trùng | 0.75 | Auto sync | 2 instance không sync trùng |
| T8 | Jira sync automation | Thêm sync history detail: JQL, duration, total, mapped, unmapped, warning count | 0.5 | Lịch sử sync rõ | Admin đối soát từng lần sync |
| T8 | Jira sync automation | Thêm retry/backoff và error state để UI hiện lỗi Jira dễ hiểu | 0.5 | Sync bền hơn | Jira fail không làm UI treo |
| T9 | Báo cáo và export | Export Excel theo kỳ: ranking, chi tiết member, task evidence, formula version | 0.75 | File Excel | File mở được, số liệu khớp UI |
| T9 | Báo cáo và export | Export JSON snapshot để đối soát/audit | 0.25 | File JSON | Có period, formula checksum, scores, evidence |
| T9 | Báo cáo và export | Thêm filter audit log theo period/user/action | 0.5 | Audit usable | Admin tìm được thay đổi điểm của 1 member |
| T10 | Public/hosting deployment | Xác minh quyền deploy Sites hoặc chuyển sang portable hosting riêng | 0.5 | Chốt đường deploy | Không còn tình trạng local mới hơn public |
| T10 | Public/hosting deployment | Viết script/checklist deploy 1 lệnh cho môi trường chọn | 0.5 | Deploy repeatable | Member mới deploy lại được |
| T10 | Public/hosting deployment | Smoke test public: version asset, API health, task picker, V2 scoring | 0.5 | Public latest | Public có commit/asset mới nhất |
| T11 | QA hồi quy | Chạy full unit/smoke tests, build, Docker rebuild | 0.5 | Test report | All tests pass |
| T11 | QA hồi quy | Playwright QA các flow chính: sync Jira, Task Jira pagination/filter, đánh giá member, V1/V2, formula, audit | 1.0 | QA notes | Không có console/page error nghiêm trọng |
| T11 | QA hồi quy | Cross-browser quick check Chrome/Edge desktop | 0.25 | Browser check | Layout không vỡ ở viewport desktop |
| T12 | Handover | Cập nhật changelog, commit message, PR description, screenshots trước/sau nếu có UI | 0.5 | PR sẵn review | Reviewer đọc PR là nắm được scope |

## 5. Gợi ý chia sprint

### Sprint 1 - Stabilize scoring và docs

Scope: T1, T2, T3, T4

Dự kiến: **3.5 - 4 manday**

Mục tiêu: member mới vào nắm được project, V1/V2 không bị hồi quy, task picker minh bạch hơn.

### Sprint 2 - Data và Jira quality

Scope: T5, T6, T8

Dự kiến: **4 - 4.75 manday**

Mục tiêu: DB/state ổn định, Jira sync và Story Point data quality đủ tin để chấm thật.

### Sprint 3 - Production readiness và báo cáo

Scope: T7, T9, T10, T11, T12

Dự kiến: **5 - 6.25 manday**

Mục tiêu: có quyền, export, deploy repeatable, public/latest rõ ràng, sẵn sàng cho pilot nội bộ.

Nếu cần rút gọn để demo nhanh, làm Sprint 1 + T10 trước: **4 - 4.5 manday**.

## 6. Definition of Done chung

- Code đã commit trên branch và PR có mô tả scope.
- `npm test` pass.
- `npm run build` pass.
- Docker stack chạy được local.
- Không commit token Jira, `.env`, DB dump thật.
- UI không có console/page error trong flow chính.
- Mỗi thay đổi công thức có text giải thích trên UI và test.
- Mỗi API ghi data có audit log nếu ảnh hưởng kết quả KPI.

## 7. Rủi ro cần canh chừng

| Rủi ro | Ảnh hưởng | Cách xử lý |
|---|---|---|
| Public hosting không cập nhật được | User thấy bản cũ, nhầm là bug chưa fix | Chốt lại quyền deploy hoặc dùng portable hosting riêng |
| Jira field Story Point khác project | Điểm V2 sai | Cho cấu hình field theo project/team và hiện warning |
| Task thiếu deadline/SP nhiều | V2 có thể ra điểm thấp/bằng 0 | Hiện data-quality summary và cho auto fill/dry-run |
| V1/V2 bị trộn logic | Kết quả KPI không đối soát được | Test riêng V1/V2 và snapshot formula theo kỳ |
| Demo RBAC headers bị dùng production | Vượt quyền | Bắt buộc đặt sau SSO/JWT/reverse proxy trước go-live |

