# Backend KPI Performance – Tài liệu bàn giao

## 1. Mục đích

Backend KPI Performance là webapp dùng để đánh giá hiệu suất member theo kỳ, theo team và theo vai trò Leader. Hệ thống hỗ trợ:

- Nhập điểm KPI theo từng hạng mục cha/con.
- Tính điểm, xếp hạng và hệ số KPI theo công thức đã thống nhất.
- So sánh member giữa các team bằng workload và effort/story point.
- Đồng bộ task thật từ Jira Data Center.
- Gắn task Jira vào từng tiêu chí con để làm minh chứng.
- Quản lý trạng thái kỳ đánh giá, timeline và nhắc việc.
- Cấu hình bộ tiêu chí riêng cho từng team và áp dụng sang team khác.
- Có dashboard, trình giả lập, audit log và màn hình giải thích công thức.

## 2. Trạng thái hiện tại

### Đã có

- Frontend static chạy bằng HTML/CSS/JavaScript native.
- Backend Node.js native, không phụ thuộc framework lớn.
- Jira Data Center connector dùng REST API `/rest/api/2/search`.
- Hỗ trợ PAT Bearer và Basic Auth.
- Màn hình nhập Jira PAT token trong Cài đặt.
- Sync tối đa 100 task mỗi lần gọi mặc định.
- Tab `Task Jira` hiển thị danh sách task sau khi sync.
- Mapping task vào member theo tên assignee đã chuẩn hóa hoặc account ID.
- Tự cập nhật workload, story point, tỷ lệ hoàn thành và điểm tiêu chí deadline.
- Slider nhập điểm cho tiêu chí con.
- Checkbox list chọn task Jira làm minh chứng.
- Popup nhập điểm member.
- Bộ tiêu chí chi tiết cha/con và cấu hình trọng số.
- Dashboard chart và phân bố xếp hạng.
- Timeline kỳ đánh giá và audit log.
- Public deployment:
  - https://backend-kpi-performance.ngaquyenphamquyen682.chatgpt.site

### Chưa nên xem là production-ready

- Backend hiện lưu Jira token trong memory của process; restart là mất token.
- Backend chưa có authentication/authorization riêng.
- CORS hiện mở `*`, chỉ phù hợp demo/internal prototype.
- Dữ liệu đánh giá frontend đang lưu trong `localStorage`, chưa có database trung tâm.
- Chưa có job scheduler chạy sync tự động theo lịch.
- Tạo task local chưa đẩy ngược xuống Jira.
- Cần kiểm thử thêm với các field Jira thực tế của từng project.

## 3. Kiến trúc

```text
Browser
  |
  |  Static HTML/CSS/JS
  v
Sites public deployment
  |
  |  GET /api/sync, /api/jira/issues, /api/jira/test
  v
KPI Backend Node.js
  |
  |  Authorization: Bearer <PAT>
  v
Jira Data Center
  https://jira.fptplay.net
```

### Frontend

- `index.html`: layout, sidebar module, card và placeholder root.
- `app.js`: state, công thức, render module, localStorage, sync Jira và event handler.
- `styles.css`: UI/UX, responsive layout, chart, slider, popup và task picker.

### Backend

- `backend/server.js`: HTTP server native, load `.env`, gọi Jira và normalize issue.
- `backend/.env.example`: mẫu cấu hình.
- `backend/package.json`: script start.

### Dữ liệu frontend

Frontend lưu theo kỳ đánh giá bằng localStorage:

- `backend-kpi-YYYY-MM`: điểm, thưởng/trừ, workload, task links, audit.
- `backend-kpi-YYYY-MM-status`: trạng thái kỳ.
- `backend-kpi-criteria`: cấu hình tiêu chí tùy chỉnh.
- `backend-jira-settings`: cấu hình Jira UI không chứa token.
- `backend-kpi-api-base`: URL backend KPI.
- `state.jiraIssues`: task đã sync nằm trong state của kỳ.

## 4. Các module chính

| Module | Mục đích |
|---|---|
| Tổng quan | Dashboard, KPI trung bình theo team, phân bố hạng và tình trạng hoàn thành task |
| Đánh giá member | Bảng xếp hạng, chọn member và nhập điểm bằng popup |
| So sánh liên nhóm | So sánh completion, effort và fairness score giữa team |
| Tạo task | Tạo task local và chuẩn bị cho flow đẩy sang Jira |
| Task Jira | Danh sách issue thật đã đồng bộ từ Jira |
| Timeline & nhắc việc | Mốc bắt đầu, hạn member, hạn Leader review và ngày khóa kỳ |
| Trình giả lập | Demo cách workload và KPI chất lượng tạo ra fairness score |
| Công thức | Giải thích công thức và ví dụ tính |
| Audit log | Lịch sử lưu dữ liệu, trạng thái và thay đổi cấu hình |
| Cấu hình tiêu chí | Chỉnh hạng mục cha/con, trọng số và apply cho team khác |
| Cài đặt | URL backend, Jira token và thao tác sync |

## 5. Luồng nghiệp vụ chuẩn

1. Admin chọn tháng/kỳ đánh giá.
2. Admin kiểm tra team và bộ tiêu chí áp dụng.
3. Admin/Leader cấu hình timeline và trạng thái kỳ.
4. Người dùng nhập Jira backend URL và PAT token trong `Cài đặt`.
5. Bấm `Lưu token & kiểm tra`.
6. Bấm `Đồng bộ Jira Data Center`.
7. Vào `Task Jira` kiểm tra danh sách issue.
8. Vào `Đánh giá member`, chọn member.
9. Nhập điểm bằng slider, chọn task Jira làm minh chứng nếu cần.
10. Kiểm tra phần giải thích điểm.
11. Leader review và cập nhật trạng thái.
12. Admin khóa kỳ, xem dashboard và audit log.

## 6. Cấu hình và chạy local

### Yêu cầu

- Node.js 18+.
- Máy chạy backend truy cập được `https://jira.fptplay.net`.
- Jira PAT hoặc tài khoản Basic Auth có quyền đọc issue.

### Backend

```powershell
cd backend
Copy-Item .env.example .env
# chỉnh .env
npm start
```

Ví dụ `.env`:

```env
PORT=8788
JIRA_BASE_URL=https://jira.fptplay.net
JIRA_PROJECT_KEY=
JIRA_AUTH_TYPE=pat
JIRA_DEFAULT_JQL=ORDER BY created DESC
SYNC_MAX_RESULTS=100
JIRA_STORY_POINTS_FIELD=customfield_10016
JIRA_DEADLINE_FIELD=duedate
JIRA_DONE_STATUSES=Done,Closed,Resolved
```

Không commit `backend/.env`. Token có thể nhập qua UI hoặc đặt bằng `JIRA_TOKEN` khi chạy backend riêng.

### Frontend

```powershell
python -m http.server 5174 -d outputs/backend-kpi-app
```

Sau đó mở `http://localhost:5174` và đặt Backend API URL là `http://localhost:8788`.

## 7. API backend

### Health

```text
GET /api/health
```

Trả về trạng thái backend, Jira đã cấu hình hay chưa và project key.

### Lưu cấu hình runtime

```text
POST /api/config
Content-Type: application/json

{
  "baseUrl": "https://jira.fptplay.net",
  "projectKey": "BE",
  "authType": "pat",
  "token": "<PAT>"
}
```

Token chỉ được giữ trong memory process hiện tại.

### Test Jira

```text
GET /api/jira/test
```

Gọi Jira `/rest/api/2/myself` để kiểm tra xác thực.

### Lấy issue

```text
GET /api/jira/issues?jql=ORDER%20BY%20created%20DESC&maxResults=100
```

### Sync issue cho KPI

```text
GET /api/sync?maxResults=100
```

Backend trả về issue đã normalize gồm:

- `key`
- `title`
- `url`
- `member`
- `accountId`
- `status`
- `done`
- `storyPoints`
- `deadline`
- `resolvedAt`
- `issueType`

## 8. Mapping Jira vào KPI

1. Backend lấy `assignee.displayName`, email hoặc username.
2. Frontend chuẩn hóa tên bằng cách bỏ dấu, lowercase và bỏ ký tự đặc biệt.
3. Nếu tên trùng member nội bộ thì map vào member.
4. Nếu không trùng tên, thử map bằng account ID.
5. Nếu không map được, task vẫn hiển thị trong `Task Jira` nhưng không cộng workload member.

### Workload

```text
committed       = tổng số task Jira được map vào member
closed          = số task có status thuộc Done/Closed/Resolved
committedPoints = tổng story point của task
deliveredPoints = tổng story point của task đã Done
```

## 9. Công thức KPI

### 9.1 Điểm tiêu chí

Mỗi tiêu chí con có trọng số tối đa. Điểm nhập thực tế bị giới hạn trong khoảng `0` đến trọng số tối đa.

```text
Điểm nền = Tổng điểm tiêu chí con đạt / Tổng trọng số tiêu chí × 10
Điểm cuối = giới hạn 0..10 của (Điểm nền + Thưởng/Trừ)
```

Tổng trọng số của một bộ tiêu chí phải bằng `10 điểm`.

### 9.2 Bậc xếp hạng và hệ số

| Điểm cuối | Hạng | Hệ số KPI |
|---:|---|---:|
| 10.00 | A+ | 1.4 |
| 9.70–9.99 | A | 1.3 |
| 9.40–9.69 | B+ | 1.2 |
| 9.00–9.39 | B | 1.1 |
| 8.00–8.99 | C | 1.0 |
| 7.50–7.99 | D | 0.8 |
| dưới 7.50 | E | 0.6 |
| dưới 0 hoặc vượt 10 | giới hạn về 0 hoặc 10 | theo điểm sau khi giới hạn |

### 9.3 Thưởng/trừ

Mỗi team có danh sách thưởng/trừ riêng. Giá trị người dùng nhập được nhân với hệ số thưởng/trừ của hạng mục, sau đó cộng vào điểm nền.

Ví dụ:

```text
Điểm nền = 8.20
Thưởng = 1 × 0.50 = +0.50
Điểm cuối = 8.70
```

### 9.4 So sánh liên nhóm

Không so sánh chỉ bằng số task thô. Hệ thống dùng:

```text
completion = min(1, task đã đóng / task cam kết)
effort     = min(1, story point đạt / story point cam kết)
kpi        = điểm KPI chất lượng / 10

fairness score = (35% × completion
                + 45% × effort
                + 20% × kpi) × 10
```

Ví dụ:

```text
CMS: 10/12 task, 44/60 SP, KPI 8.8
completion = 0.8333
effort     = 0.7333
kpi        = 0.88

fairness = (0.35×0.8333 + 0.45×0.7333 + 0.20×0.88)×10
         ≈ 7.93/10
```

Điểm này giúp so sánh người làm ít task nhưng task khó với người làm nhiều task nhưng effort thấp hơn.

### 9.5 Tiêu chí deadline từ Jira

Mặc định tiêu chí đầu tiên được map theo tỷ lệ hoàn thành:

```text
Tỷ lệ = task Done / tổng task cam kết

≥ 90% → đạt tối đa tiêu chí
≥ 75% → đạt 60% trọng số tiêu chí
≥ 60% → đạt khoảng 26.7% trọng số tiêu chí
< 60% → 0 điểm
```

Đây là mapping tự động hiện tại. Khi triển khai chính thức nên đưa các ngưỡng này thành cấu hình versioned thay vì hard-code.

## 10. Bảo mật hiện tại

- Không đặt Jira token trong frontend static bundle.
- Ô nhập token dùng `type=password`.
- Backend không trả token trong response.
- `backend/.env` nằm trong `.gitignore`.
- Token runtime lưu trong memory và mất khi process restart.

### Việc bắt buộc trước production

- Thêm authentication cho backend KPI.
- Giới hạn CORS theo domain được phép.
- Dùng HTTPS cho backend.
- Không để PAT trong URL hoặc query string.
- Dùng secret manager hoặc environment secret trên server.
- Mask thông tin nhạy cảm trong log.
- Thêm rate limit và audit cho endpoint `/api/config`.
- Nếu token đã từng bị lộ, revoke PAT và cấp token mới.

## 11. Lịch sử build theo các mốc chính

| Commit | Nội dung |
|---|---|
| `bb4b854` | Publish bản Backend KPI Performance đầu tiên |
| `9af0193` | Cải thiện dashboard chart |
| `f7db8d5` | Sửa mặc định scope module |
| `62d10df` | Sửa render module cấu hình tiêu chí |
| `27a3330` | Kết nối frontend với Jira backend |
| `9e854bc` | Thêm module danh sách task Jira đã sync |
| `d8fc4e8` | Sửa render module Task Jira |
| `1443dc9` | Sửa lỗi Task Jira bị trắng do override visibility |

## 12. Checklist bàn giao

- [ ] Nhận Jira URL, project key, field story point và status Done thật.
- [ ] Cấp PAT với quyền read issue tối thiểu.
- [ ] Dựng backend trên server có network tới Jira.
- [ ] Đặt HTTPS và authentication cho backend.
- [ ] Test `/api/health`, `/api/jira/test`, `/api/sync`.
- [ ] Test mapping assignee với danh sách member.
- [ ] Test bộ tiêu chí từng team và Leader.
- [ ] Test trạng thái nháp → đã gửi → duyệt → khóa.
- [ ] Test audit log và export báo cáo.
- [ ] Test trên Chrome/Edge desktop và mobile responsive.
- [ ] Chốt người sở hữu quyền Admin, Leader, Member.
- [ ] Revoke token demo sau khi bàn giao.

