# Phase 0 — Chốt MVP Contract ✅ HOÀN TẤT

> Ngày chốt: 2026-04-10

> **Mục tiêu:** Quyết định rõ "release-ready" nghĩa là gì trước khi bắt đầu bất kỳ công việc code nào.

---

## Bối cảnh

Hiện tại có độ lệch giữa các tài liệu mô tả MVP:

| Nguồn | Kỳ vọng hiện tại |
|---|---|
| `FEATURE.md` | start/stop record, lưu audio + log, sau khi stop có 4 tab chính, export `json` hoặc `md`, Note hiện chỉ cần UI |
| `README.md` | quay video màn hình, DOM steps, API errors, export `.zip` chứa video + Jira markdown + cURL files |
| `PLAN.md` | pipeline MV3 với offscreen recording, preview tab, JSZip export, cấu trúc `postman-curl/` |

Nếu không có một nguồn sự thật duy nhất, không thể xác định "done" là gì và release sẽ không bao giờ có điểm kết thúc rõ ràng.

---

## Các quyết định cần chốt

### Q1 — Artifact cuối cùng của release là gì?

- [ ] **Option A:** Audio + logs (theo `FEATURE.md`)
- [ ] **Option B:** Video + markdown + cURL zip (theo `README.md` / `PLAN.md`)
- [ ] **Option C:** Cả hai

> **Gợi ý:** Chọn Option B vì implementation hiện tại (offscreen MediaRecorder + JSZip + curlBuilder) đang đi theo hướng này. Option A yêu cầu thêm audio capture pipeline mới.

### Q2 — `json` export có phải yêu cầu bắt buộc của MVP không?

- [ ] **Bắt buộc:** phải có JSON export path trước khi ship
- [ ] **Không bắt buộc:** MVP chỉ cần markdown/zip, json có thể thêm sau

> **Gợi ý:** Để MVP nhanh hơn, nên bỏ json export ra khỏi scope và giữ markdown/zip. Ghi rõ vào `FEATURE.md`.

### Q3 — Note feature ở trạng thái nào cho release này?

- [ ] **UI-only:** Note tab hiển thị nhưng chưa có event flow thật (acceptable)
- [ ] **Phải có data thật:** Note phải được capture và hiển thị trong preview

> **Gợi ý:** Giữ Note ở trạng thái UI-only cho release này để tránh scope creep.

### Q4 — Screen capture strategy là gì?

- [ ] **Generic display picker:** user tự chọn màn hình (hiện tại đang làm)
- [ ] **Tab-specific capture:** tự động capture đúng current tab với `tabId`

> **Gợi ý:** Tab-specific là trải nghiệm tốt hơn, nhưng generic display picker cho phép ship nhanh hơn. Có thể chọn generic picker cho MVP.

### Q5 — Có capture audio không?

- [ ] **Có:** `{ video: true, audio: true }`
- [ ] **Không:** `{ video: true, audio: false }` (hiện tại)

> **Gợi ý:** Nếu audio không phải trong `FEATURE.md` requirement cuối cùng, giữ `audio: false` để đơn giản hóa.

---

## Checklist thực hiện

- [ ] Họp/quyết định tất cả 5 câu hỏi trên
- [ ] Cập nhật `FEATURE.md` để phản ánh đúng các quyết định đã chốt
- [ ] Cập nhật `README.md` để khớp với `FEATURE.md` (scope mới nhất)
- [ ] Cập nhật `PLAN.md` để loại bỏ các feature bị cắt khỏi scope MVP
- [ ] Lập một bảng "In scope / Out of scope" rõ ràng trong `FEATURE.md`

---

## Điều kiện hoàn tất (Definition of Done)

- `FEATURE.md` là nguồn sự thật duy nhất cho release này
- `README.md` và `PLAN.md` đã được cập nhật để khớp
- Tất cả thành viên team đồng thuận với scope cuối cùng
- Có thể trả lời rõ ràng: "Release này phải làm gì và không làm gì?"

---

## Files cần chỉnh sửa

| File | Hành động |
|---|---|
| `FEATURE.md` | Cập nhật thành nguồn sự thật, thêm bảng In/Out of scope |
| `README.md` | Cập nhật để khớp với `FEATURE.md` |
| `PLAN.md` | Loại bỏ hoặc đánh dấu rõ các feature ngoài scope MVP |

---

## Ước tính thời gian

| Công việc | Thời gian ước tính |
|---|---|
| Quyết định và thảo luận | 1–2 giờ |
| Cập nhật `FEATURE.md` | 30 phút |
| Cập nhật `README.md` và `PLAN.md` | 30 phút |
| **Tổng** | **~2–3 giờ** |

---

## Dependencies

- Không có dependency kỹ thuật — đây là quyết định product
- **Phải hoàn tất Phase 0 trước khi bắt đầu Phase 1**

---

## Kết quả các quyết định đã chốt

| Câu hỏi | Quyết định | Chi tiết |
|---|---|---|
| Q1 — Artifact export | **A — ZIP** | `bug-report-[timestamp].zip` chứa video + markdown + cURL files |
| Q2 — Có video không? | **A — Có video** | `bug-record.webm`, không có âm thanh |
| Q3 — Note feature | **A — UI-only** | Note tab chỉ hiển thị placeholder, implement sau |
| Q4 — Screen capture | **B — tabCapture** | Tự động capture current tab, không dùng generic display picker |
| Q5 — Audio | **B — Không audio** | `{ video: true, audio: false }` |

---

## Checklist thực hiện

- [x] Quyết định tất cả 5 câu hỏi
- [x] Cập nhật `FEATURE.md` làm nguồn sự thật duy nhất
- [x] Cập nhật `README.md` để khớp với `FEATURE.md`
- [x] Cập nhật `PLAN.md` để loại bỏ các feature bị cắt khỏi scope MVP

---

## Trạng thái

**✅ Phase 0 đã hoàn tất.** Bắt đầu Phase 1.
