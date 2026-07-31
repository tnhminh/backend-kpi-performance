# Backend KPI Performance - Vibecode next build plan

## 1. Baseline hien tai

Ngay lap plan: 2026-07-31

Commit moi nhat dang tren repo:

```text
9f4527c fix: recalculate V2 score when Jira tasks change
```

Trang thai code tai thoi diem lap plan:

- Worktree sach, khong co file local chua commit.
- Local Docker stack da chay duoc tren port 8081.
- Public site hien co: `https://backend-kpi-performance.ngaquyenphamquyen682.chatgpt.site`.
- Public site co the chua cap nhat neu hosting project hien tai khong truy cap duoc tu connector deploy.
- Test gan nhat: `22/22 passed`.

Nhung tinh nang da co nen giu:

- Frontend KPI dashboard, danh gia member, so sanh lien nhom, tao task, Task Jira, timeline, trinh gia lap, cong thuc, audit log, cau hinh tieu chi.
- Backend Node.js API, Docker Compose portable voi web, backend, PostgreSQL, Redis.
- Jira sync, pagination, filter, field display, task evidence picker.
- Luu danh gia vao DB/backend state, khong chi phu thuoc localStorage nhu ban prototype cu.
- V1 scoring duoc giu lai.
- V2 Story Point 70/30 da them va da sua loi tinh lai diem khi thay doi task Jira.
- Auto fill Story Point cho task Jira hien co trong DB.
- Formula panel cho So sanh lien nhom.

## 2. Nguyen tac build tiep

- Build tiep tren branch moi tu `main`, khong sua truc tiep neu chua review.
- Giu V1 bat bien, moi thay doi lien quan Story Point phai nam trong V2 hoac version moi.
- Moi logic tinh diem phai co formula text tren UI va test tuong ung.
- Du lieu Jira thieu Story Point, deadline, assignee phai hien canh bao ro, khong am tham tinh sai.
- Moi task can co acceptance criteria ro de nguoi review bam vao test duoc.

## 3. Tong manday du kien

Tong du kien neu vibecode: **8.5 - 11 manday**.

Neu code chay thu cong khong dung vibecode, cung scope nay thuong khoang **18 - 25 manday** vi mat nhieu thoi gian o cac phan doc code, lap UI state, viet test hoi quy, test Jira/DB va sua cac edge case.

Bang estimate ben duoi tinh theo 1 member co the dung AI coding assistant de doc code, patch, build, chay test va QA nhanh.

## 4. Task breakdown

| ID | Task | Subtask | MD vibecode | Output | Acceptance criteria |
|---|---|---|---:|---|---|
| T1 | Onboard va dong bo moi truong | Clone/pull `main`, checkout tu commit moi nhat, cai dependency, tao `.env`, chay Docker stack | 0.25 | Local app chay duoc | Mo `http://localhost:8081`, backend health ok |
| T1 | Onboard va dong bo moi truong | Doc `README.md`, `PROJECT_HANDOVER.md`, `PRODUCTION_SUITE.md`, `DEPLOYMENT_PORTABLE.md`, file plan nay | 0.25 | Nam duoc kien truc | Member giai thich duoc luong Jira -> DB -> UI -> diem KPI |
| T2 | Cap nhat docs theo trang thai moi | Sua docs cu con noi localStorage/memory token thanh trang thai moi: DB, Docker, V1/V2, Story Point autofill | 0.5 | Docs khong lech code | Handover doc khop tinh nang hien tai |
| T2 | Cap nhat docs theo trang thai moi | Bo sung troubleshooting: public site chua update, hosting project inaccessible, cach deploy portable | 0.25 | Huong dan van hanh ro hon | Member moi khong nham public da la latest |
| T3 | Khoa chat scoring V1/V2 | Tao test case cho V1: slider thu cong, task evidence chi lam minh chung, diem doi theo slider | 0.5 | Regression test V1 | V1 khong bi logic Story Point anh huong |
| T3 | Khoa chat scoring V1/V2 | Tao test case cho V2: them/bo task, task missing deadline/SP, on-time/off-time, score cap nhat ngay | 0.75 | Regression test V2 | Chon task thay doi thi delivery score va total score cap nhat |
| T3 | Khoa chat scoring V1/V2 | UI copy giai thich ro: diem co the khong doi neu ty le dat khong doi | 0.25 | Tooltip/text ngan trong modal | User hieu vi sao them/bot task co luc diem van bang nhau |
| T4 | Cai thien task evidence picker | Them count theo nhom: selected, on-time, late, missing deadline, missing story point | 0.75 | Picker co summary | Mo dropdown nhin duoc chat luong task dang chon |
| T4 | Cai thien task evidence picker | Them filter trong picker: tat ca, done, late, missing SP, missing deadline | 0.75 | Chon task nhanh hon | Danh sach lon van de thao tac |
| T4 | Cai thien task evidence picker | Hien cong thuc mini ngay duoi picker cho V2 delivery criterion | 0.25 | UI minh bach | Reviewer doi soat duoc selected tasks -> diem |
| T5 | Jira data quality va auto fill Story Point | Chay auto fill Story Point tren DB hien tai, log so task da cap nhat/bo qua | 0.5 | Batch update on demand | Co summary: updated/skipped/errors |
| T5 | Jira data quality va auto fill Story Point | Them dry-run mode cho auto fill de preview truoc khi ghi DB | 0.5 | Preview an toan | Bam dry-run khong lam doi data |
| T5 | Jira data quality va auto fill Story Point | Them audit log cho auto fill Story Point | 0.25 | Audit truy vet duoc | Audit hien ai chay, luc nao, so record |
| T6 | Database va state consistency | Kiem tra lai cac man hinh doc/ghi cung 1 source backend state, tranh localStorage shadow data | 0.75 | State source-of-truth ro | Refresh/may khac van thay cung du lieu |
| T6 | Database va state consistency | Them migration/seed nho cho review period, formula version, users demo neu DB moi | 0.75 | DB moi co data khoi tao | Docker up lan dau khong trang rong bat thuong |
| T6 | Database va state consistency | Them backup/restore smoke check cho PostgreSQL | 0.5 | Kich ban khoi phuc | Backup file tao duoc va restore test qua |
| T7 | Auth/RBAC san sang noi bo | Thay demo headers bang middleware de sau nay gan SSO/JWT/reverse proxy | 0.75 | Auth boundary ro | Khong tin role tu browser neu deploy production |
| T7 | Auth/RBAC san sang noi bo | Enforcement tren API: Admin/Leader/Member/Viewer cho state, formula, audit, sync | 1.0 | API khong vuot quyen | Test role pass/fail ro |
| T7 | Auth/RBAC san sang noi bo | UI hide/disable action theo role, kem message khi khong co quyen | 0.5 | UX dung role | Member khong thay nut admin nguy hiem |
| T8 | Jira sync automation | Them scheduler sync theo config gio/ngay, co lock Redis de tranh chay trung | 0.75 | Auto sync | 2 instance khong sync trung |
| T8 | Jira sync automation | Them sync history detail: JQL, duration, total, mapped, unmapped, warning count | 0.5 | Lich su sync ro | Admin doi soat tung lan sync |
| T8 | Jira sync automation | Them retry/backoff va error state de UI hien loi Jira de hieu | 0.5 | Sync ben hon | Jira fail khong lam UI treo |
| T9 | Bao cao va export | Export Excel theo ky: ranking, chi tiet member, task evidence, formula version | 0.75 | File Excel | File mo duoc, so lieu khop UI |
| T9 | Bao cao va export | Export JSON snapshot de doi soat/audit | 0.25 | File JSON | Co period, formula checksum, scores, evidence |
| T9 | Bao cao va export | Them filter audit log theo period/user/action | 0.5 | Audit usable | Admin tim duoc thay doi diem cua 1 member |
| T10 | Public/hosting deployment | Xac minh quyen deploy Sites hoac chuyen sang portable hosting rieng | 0.5 | Chot duong deploy | Khong con tinh trang local moi hon public |
| T10 | Public/hosting deployment | Viet script/checklist deploy 1 lenh cho moi truong chon | 0.5 | Deploy repeatable | Member moi deploy lai duoc |
| T10 | Public/hosting deployment | Smoke test public: version asset, API health, task picker, V2 scoring | 0.5 | Public latest | Public co commit/asset moi nhat |
| T11 | QA hoi quy | Chay full unit/smoke tests, build, Docker rebuild | 0.5 | Test report | All tests pass |
| T11 | QA hoi quy | Playwright QA cac flow chinh: sync Jira, Task Jira pagination/filter, danh gia member, V1/V2, formula, audit | 1.0 | QA notes | Khong co console/page error nghiem trong |
| T11 | QA hoi quy | Cross-browser quick check Chrome/Edge desktop | 0.25 | Browser check | Layout khong vo o viewport desktop |
| T12 | Handover | Cap nhat changelog, commit message, PR description, screenshots truoc/sau neu co UI | 0.5 | PR san review | Reviewer doc PR la nam duoc scope |

## 5. Goi y chia sprint

### Sprint 1 - Stabilize scoring va docs

Scope: T1, T2, T3, T4

Du kien: **3.5 - 4 manday**

Muc tieu: member moi vao nam duoc project, V1/V2 khong bi hoi quy, task picker minh bach hon.

### Sprint 2 - Data va Jira quality

Scope: T5, T6, T8

Du kien: **4 - 4.75 manday**

Muc tieu: DB/state on dinh, Jira sync va Story Point data quality dung de cham that.

### Sprint 3 - Production readiness va bao cao

Scope: T7, T9, T10, T11, T12

Du kien: **5 - 6.25 manday**

Muc tieu: co quyen, export, deploy repeatable, public/latest ro rang, san sang cho pilot noi bo.

Neu can rut gon de demo nhanh, lam Sprint 1 + T10 truoc: **4 - 4.5 manday**.

## 6. Definition of Done chung

- Code da commit tren branch va PR co mo ta scope.
- `npm test` pass.
- `npm run build` pass.
- Docker stack chay duoc local.
- Khong commit token Jira, `.env`, DB dump that.
- UI khong co console/page error trong flow chinh.
- Moi thay doi cong thuc co text giai thich tren UI va test.
- Moi API ghi data co audit log neu anh huong ket qua KPI.

## 7. Rui ro can canh chung

| Rui ro | Anh huong | Cach xu ly |
|---|---|---|
| Public hosting khong cap nhat duoc | User thay ban cu, nham la bug chua fix | Chot lai quyen deploy hoac dung portable hosting rieng |
| Jira field Story Point khac project | Diem V2 sai | Cho cau hinh field theo project/team va hien warning |
| Task thieu deadline/SP nhieu | V2 co the ra diem thap/bang 0 | Hien data-quality summary va cho auto fill/dry-run |
| V1/V2 bi tron logic | Ket qua KPI khong doi soat duoc | Test rieng V1/V2 va snapshot formula theo ky |
| Demo RBAC headers bi dung production | Vuot quyen | Bat buoc dat sau SSO/JWT/reverse proxy truoc go-live |

