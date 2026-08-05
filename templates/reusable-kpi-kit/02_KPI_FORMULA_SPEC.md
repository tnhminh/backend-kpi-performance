# KPI Formula Specification – [TEN_DU_AN]

> Reusable template; not current application documentation.

## 1. Nguyên tắc

- Công thức là source of truth của hệ thống.
- UI chỉ hiển thị và nhập dữ liệu, không tự định nghĩa công thức khác.
- Mỗi kỳ phải lưu version bộ tiêu chí và version công thức.
- Mọi điểm đều phải giải thích được từ input.

## 2. Cấu trúc tiêu chí

```text
CriterionGroup
  ├── name
  ├── maxWeight
  └── children[]
        ├── name
        ├── maxWeight
        ├── scoreRule
        └── evidenceRequired
```

Tổng `maxWeight` của toàn bộ tiêu chí con trong một team phải bằng `[TOTAL_WEIGHT]`, mặc định là `10`.

## 3. Điểm nền

```text
achieved = Σ điểm tiêu chí con sau khi giới hạn 0..maxWeight
maxScore = Σ maxWeight
baseScore = achieved / maxScore × 10
```

## 4. Thưởng/trừ và điểm cuối

```text
bonus = Σ (số lượng thưởng/trừ × hệ số thưởng/trừ)
finalScore = clamp(baseScore + bonus, 0, 10)
```

## 5. Xếp hạng

Thay bảng dưới đây bằng rule chính thức của project:

| Khoảng điểm | Hạng | Hệ số |
|---:|---|---:|
| `10.00` | A+ | 1.4 |
| `>= 9.70` | A | 1.3 |
| `>= 9.40` | B+ | 1.2 |
| `>= 9.00` | B | 1.1 |
| `>= 8.00` | C | 1.0 |
| `>= 7.50` | D | 0.8 |
| `< 7.50` | E | 0.6 |

## 6. So sánh liên nhóm

Không dùng số task thô làm kết luận duy nhất.

```text
completion = min(1, closedTasks / committedTasks)
effort = min(1, deliveredStoryPoints / committedStoryPoints)
quality = finalScore / 10

fairnessScore = (
  [COMPLETION_WEIGHT] × completion +
  [EFFORT_WEIGHT] × effort +
  [QUALITY_WEIGHT] × quality
) × 10
```

Các trọng số phải có tổng bằng `1.0`.

## 7. Ví dụ kiểm chứng

```text
Team A: 10/12 task, 44/60 SP, KPI 8.8/10
completion = 0.8333
effort = 0.7333
quality = 0.88

fairness = (0.35×0.8333 + 0.45×0.7333 + 0.20×0.88)×10
         ≈ 7.93/10
```

## 8. Test cases bắt buộc

- [ ] Điểm tất cả bằng 0.
- [ ] Điểm đúng max từng tiêu chí.
- [ ] Tổng trọng số đúng bằng 10.
- [ ] Tổng trọng số nhỏ/lớn hơn 10.
- [ ] Điểm tại từng ngưỡng xếp hạng.
- [ ] Thưởng dương.
- [ ] Trừ âm.
- [ ] Không có task cam kết.
- [ ] Có task nhưng không có story point.
- [ ] Task hoàn thành vượt 100%.

