# VCAP — Release Plans

Tất cả các plan release được tổ chức theo phase. Thực hiện **theo thứ tự**, bắt đầu từ Phase 0.

---

## Tổng quan các Phase

| File | Phase | Mục tiêu | Effort ước tính | Prerequisite |
|---|---|---|---|---|
| [plan_p0.md](./plan_p0.md) | Phase 0 | Chốt MVP contract | ~2–3 giờ | Không có |
| [plan_p1.md](./plan_p1.md) | Phase 1 | Sửa recording lifecycle | ~3–4 giờ | Phase 0 |
| [plan_p2.md](./plan_p2.md) | Phase 2 | Sửa event capture và session wiring | ~5–8 giờ | Phase 1 |
| [plan_p3.md](./plan_p3.md) | Phase 3 | Sửa security và data handling | ~4–6 giờ | Phase 1 |
| [plan_p4.md](./plan_p4.md) | Phase 4 | Căn chỉnh export theo MVP contract | ~4–9 giờ | Phase 1, 2, 3 |
| [plan_p5.md](./plan_p5.md) | Phase 5 | Thêm release gate | ~5–8 giờ | Phase 1–4 |

**Tổng ước tính:** ~23–38 giờ (không tính thời gian quyết định product ở Phase 0)

---

## Dependency Graph

```
Phase 0 (chốt contract)
    ↓
Phase 1 (recording lifecycle) ← PHẢI làm trước
    ↓              ↓
Phase 2          Phase 3
(event capture)  (security)
    ↓              ↓
        Phase 4 (export)
            ↓
        Phase 5 (release gate)
            ↓
        🚀 RELEASE
```

> **Lưu ý:** Phase 2 và Phase 3 có thể chạy song song nếu team có người, vì cả hai đều phụ thuộc Phase 1 nhưng không phụ thuộc nhau.

---

## Critical Path (con đường ngắn nhất để release)

Nếu chỉ có 1 người, thứ tự tối ưu:

1. **Phase 0** — 2–3 giờ (không thể bỏ qua)
2. **Phase 1** — 3–4 giờ (blocker cho mọi thứ còn lại)
3. **Phase 3** — 4–6 giờ (P0 blocker theo store policy)
4. **Phase 2** — 5–8 giờ
5. **Phase 4** — 4–9 giờ
6. **Phase 5** — 5–8 giờ

---

## Các P0 Blockers (phải xử lý trước khi release)

Theo `RELEASE_READINESS_AUDIT.md`, đây là các blocker cứng:

| Blocker | Phase xử lý |
|---|---|
| Lệch message contract Background ↔ Content | Phase 1 |
| Sai path offscreen document | Phase 1 |
| Offscreen lifecycle messages bị drop | Phase 1 |
| Sanitize network data trước khi lưu | Phase 3 |
| Chốt nguồn sự thật MVP | Phase 0 |

---

## Cách sử dụng các file plan này

Mỗi file plan có:
- **Bối cảnh** — tại sao phase này cần thiết
- **Danh sách việc cần làm** — các task cụ thể với checkbox
- **Files cần sửa** — biết ngay cần mở file nào
- **Smoke test** — cách verify phase đã hoàn tất
- **Ước tính thời gian** — để planning
- **Trạng thái** — checkbox tổng kết để track tiến độ

Khi bắt đầu một task: tick `[ ]` thành `[x]` khi xong.

---

## Nguồn tham khảo

- [`RELEASE_READINESS_AUDIT.md`](../RELEASE_READINESS_AUDIT.md) — audit đầy đủ với root causes
- [`FEATURE.md`](../FEATURE.md) — release contract (sau Phase 0)
- [`README.md`](../README.md) — tổng quan dự án
