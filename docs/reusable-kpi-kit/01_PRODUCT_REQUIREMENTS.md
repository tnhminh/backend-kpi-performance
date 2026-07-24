# Product Requirements – [TEN_DU_AN]

## 1. Mục tiêu

Xây dựng hệ thống đánh giá hiệu suất cho `[PHONG_BAN]`, giúp Admin/Leader:

- Đánh giá theo tiêu chí rõ ràng.
- Tự động lấy dữ liệu task từ Jira.
- Giải thích được vì sao member đạt điểm đó.
- So sánh công bằng giữa các team có độ khó task khác nhau.
- Chốt kỳ và truy vết lịch sử thay đổi.

## 2. Phạm vi MVP

### Bắt buộc

- Quản lý kỳ đánh giá.
- Danh sách member/team.
- Bộ tiêu chí cha/con và trọng số.
- Nhập điểm bằng slider hoặc input.
- Tính điểm, hạng và hệ số.
- Jira sync read-only.
- Gắn task Jira làm minh chứng.
- Dashboard cơ bản.
- Audit log.

### Ngoài MVP

- Tạo task và push ngược Jira.
- Notification đa kênh.
- SSO.
- Phân tích xu hướng dài hạn.
- AI recommendation.

## 3. User story

### Admin

- Tôi muốn tạo kỳ đánh giá để dữ liệu được tách theo tháng.
- Tôi muốn cấu hình tiêu chí theo từng team.
- Tôi muốn khóa kỳ để không ai sửa dữ liệu sau khi chốt.

### Leader

- Tôi muốn xem member thuộc team mình.
- Tôi muốn nhập điểm và xem minh chứng Jira.
- Tôi muốn review và gửi kết quả.

### Member

- Tôi muốn xem task, tiêu chí và điểm của mình.
- Tôi muốn bổ sung link/task làm minh chứng nếu được cho phép.

## 4. Acceptance criteria

- Người dùng mới vào hệ thống hiểu được luồng nhờ demo/tour.
- Điểm hiển thị có breakdown rõ ràng.
- Tổng trọng số sai thì không cho lưu.
- Task Jira sync nhiều lần không tạo bản ghi trùng.
- Task không map được member phải có danh sách cảnh báo.
- Kỳ đã khóa không cho sửa.
- Mọi thao tác lưu/chuyển trạng thái có audit.

