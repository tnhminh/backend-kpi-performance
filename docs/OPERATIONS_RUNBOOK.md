# Runbook vận hành

## 1. Kiểm tra nhanh

```text
GET http://<backend-host>:8788/api/health
GET http://<backend-host>:8788/api/jira/test
GET http://<backend-host>:8788/api/sync?maxResults=10
```

## 2. Sync không được

Kiểm tra theo thứ tự:

1. Backend process còn chạy không.
2. Backend API URL trong Cài đặt có đúng không.
3. Jira URL có truy cập được từ server backend không.
4. PAT còn hạn và có quyền đọc issue không.
5. `JIRA_AUTH_TYPE` có đúng là `pat` hay `basic` không.
6. Field Story Point có đúng không.
7. Status Done có khớp tên Jira không.
8. Xem response lỗi từ `/api/jira/test`.

## 3. Task có trong Jira nhưng không vào member

- Kiểm tra assignee của task.
- Kiểm tra tên member có dấu/ký tự khác nhau không.
- Ưu tiên bổ sung mapping bằng Jira account ID.
- Kiểm tra task có thuộc JQL hiện tại không.
- Kiểm tra task đã nằm trong kỳ đánh giá hiện tại chưa.

## 4. Điểm không đúng

- Kiểm tra tổng trọng số tiêu chí có bằng 10.
- Kiểm tra từng điểm con có vượt trọng số tối đa không.
- Kiểm tra thưởng/trừ có bị nhập nhầm dấu không.
- Kiểm tra member đang dùng đúng team/Leader criteria.
- Mở phần “Vì sao ra điểm này?” để đối soát `achieved`, `max`, `base`, `bonus`.
- Kiểm tra kỳ có bị khóa hoặc đang chọn sai tháng không.

## 5. Token Jira

- Không gửi token qua chat, issue hoặc commit.
- Nhập token tại `Cài đặt`.
- Nếu token bị nghi ngờ lộ: revoke ngay trên Jira và tạo PAT mới.
- Khi backend restart, cần cấu hình lại token nếu đang dùng runtime memory.
- Production nên dùng secret manager thay cho ô nhập token.

## 6. Release checklist

- [ ] `node --check app.js`
- [ ] `node --check backend/server.js`
- [ ] Test `/api/health`.
- [ ] Test Jira authentication.
- [ ] Test sync 10 task.
- [ ] Test sync 100 task.
- [ ] Test Task Jira empty state.
- [ ] Test slider và checkbox task evidence.
- [ ] Test mobile layout.
- [ ] Test quyền và khóa kỳ.
- [ ] Backup database trước khi deploy bản mới.
- [ ] Ghi commit/version deploy vào changelog.

