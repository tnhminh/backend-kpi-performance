# Project context for the next builder

## Mục tiêu sản phẩm

Đánh giá KPI performance cho phòng Backend theo tháng, kết hợp điểm tiêu chí thủ công với bằng chứng task Jira Data Center. Trưởng phòng cần thấy điểm tổng, biết vì sao ra điểm đó và truy ngược được tới task/field Jira.

## Công thức hiện hành

- Điểm tiêu chí: `achieved / max * 10`, giới hạn theo trọng số tiêu chí.
- Điểm cuối: điểm nền cộng thưởng/trừ, grade và coefficient theo cấu hình team.
- Cross-team fairness: completion 30%, effort/story point 35%, quality KPI 25%, predictability 10%; absolute 75%, team index 25%.
- Formula version/checksum được tạo bởi `currentFormulaVersion()` trong `production-suite.js` và đi kèm snapshot.

Không đổi trọng số hoặc tên field Jira mà không cập nhật test, docs và changelog.

## Dữ liệu Jira cần cho KPI

- issue key/summary/status/assignee/accountId.
- issue type, priority, labels, project, sprint.
- story point field (`JIRA_STORY_POINTS_FIELD`).
- deadline/duedate và resolution date.
- created/updated để lọc theo kỳ.

Thiếu assignee, Story Point hoặc deadline sẽ xuất hiện trong data-quality warning và dashboard trưởng phòng.

## Mapping task

Ưu tiên `accountId`; fallback theo tên assignee đã normalize. Task evidence được lưu trong state member theo criterion index. Khi thay đổi mapping, phải kiểm tra lại reconciliation detail.

## Module map

| Module | Vai trò |
|---|---|
| Tổng quan | Dashboard cơ bản và dữ liệu chất lượng |
| Dashboard trưởng phòng | KPI cards, chart theo team/grade/completion và cảnh báo |
| Đối soát KPI | Drill-down member → formula → criteria → Jira evidence |
| Đánh giá member | Nhập điểm và chọn evidence |
| Task Jira | Kiểm tra issue sau sync |
| Cài đặt | Jira config và user admin |
| Audit log | Theo dõi thay đổi |
