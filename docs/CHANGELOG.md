# Changelog bàn giao

## 2026-07-28

- Thêm Jira sync pagination và giới hạn số issue đồng bộ.
- Sync Jira theo project/kỳ đánh giá bằng JQL tạo từ cấu hình.
- Snapshot khóa kỳ lưu bộ tiêu chí hiệu lực để tính lại nhất quán.
- Sửa criteria Leader khi xem phạm vi Tất cả.
- Gộp data-quality dashboard và kiểm tra minh chứng bằng task links.
- Chặn nút hoàn tất đánh giá đi lùi workflow.
- Thêm snapshot bất biến khi kỳ chuyển sang trạng thái `Đã khóa`.
- Thêm data-quality panel trên dashboard: task chưa map, member thiếu workload và bộ tiêu chí sai tổng.
- Bổ sung export JSON bên cạnh CSV.
- Chuẩn hóa workflow chuyển trạng thái theo thứ tự Nháp → Đã gửi → Đã duyệt → Đã khóa.

## Hiện tại

- Sửa lỗi module `Task Jira` bị trắng do hàm `toggleModules` bị override ở cuối file.
- Public deployment đang dùng bản đã sửa.

## Các mốc đã triển khai

- Publish webapp KPI Performance.
- Thêm dashboard chart theo team và phân bố xếp hạng.
- Thêm timeline và nhắc việc.
- Thêm cấu hình tiêu chí cha/con, trọng số và apply sang team.
- Thêm slider nhập điểm.
- Thêm popup nhập điểm member.
- Thêm checkbox list chọn task Jira làm minh chứng.
- Tạo Node.js backend kết nối Jira Data Center.
- Thêm nhập PAT token trong Cài đặt.
- Sync và normalize task Jira.
- Map task vào member, workload và story point.
- Thêm module `Task Jira`.
- Sửa lỗi render module và visibility sau khi thêm nhiều module.
