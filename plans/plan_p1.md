# Phase 1 — Sửa Recording Lifecycle ✅ HOÀN TẤT

> **Mục tiêu:** Làm cho một session thật có thể start và stop thành công, không bị fail âm thầm.

> **Prerequisite:** Phase 0 đã hoàn tất — MVP contract đã được chốt.

---

## Bối cảnh & Root Cause

Recording hiện tại không thể hoạt động vì 3 lý do độc lập nhưng liên quan:

1. **Sai offscreen path** → offscreen document không được tạo thành công
2. **Message contract bị lệch** → Background và Content không nói chuyện được với nhau
3. **Offscreen lifecycle messages bị drop** → không biết recording thành công hay fail

---

## Danh sách việc cần làm

### 1.1 Sửa Offscreen Path Mismatch

**Vấn đề:**
- Background tạo offscreen bằng: `chrome.runtime.getURL('offscreen/offscreen.html')` (`src/background/index.js:226`)
- Output sau build tạo ra: `dist/src/offscreen/offscreen.html`
- Nên phải là: `dist/offscreen/offscreen.html`

**Việc cần làm:**
- [ ] Kiểm tra cấu hình build (`vite.config.js` hoặc tương đương) — xem `offscreen.html` được output vào đâu sau build
- [ ] Quyết định: sửa Vite config để output `dist/offscreen/offscreen.html`, hoặc sửa path trong `background/index.js`
- [ ] Sửa path cho đúng
- [ ] Verify: sau `npm run build`, file phải tồn tại tại đúng path mà Background đang trỏ tới

**Files cần sửa:**
- `src/background/index.js` dòng ~226 (nếu sửa path string)
- hoặc `vite.config.js` / build config (nếu sửa output structure)

---

### 1.2 Chuẩn hóa Message Contract

**Vấn đề — bảng lệch hiện tại:**

| Background gửi | Content lắng nghe | Kết quả |
|---|---|---|
| `RECORDING_STARTED` | `START_RECORDING` | ❌ không match |
| `RECORDING_STOPPED` | `STOP_RECORDING` | ❌ không match |

**Quyết định cần chốt:** Chọn một tên canonical và áp thống nhất. Gợi ý: dùng tên của bên Content làm chuẩn (`START_RECORDING` / `STOP_RECORDING`) vì tên này rõ nghĩa hơn (imperative command).

**Việc cần làm:**
- [ ] Tạo một file constants dùng chung, ví dụ: `src/shared/messages.js`
  ```js
  export const MSG = {
    START_RECORDING:  'START_RECORDING',
    STOP_RECORDING:   'STOP_RECORDING',
    START_CAPTURE:    'START_CAPTURE',
    CAPTURE_DONE:     'CAPTURE_DONE',
    CAPTURE_FAILED:   'CAPTURE_FAILED',
    CAPTURE_ERROR:    'CAPTURE_ERROR',
    DOM_EVENT:        'DOM_EVENT',
    CONSOLE_ERROR:    'CONSOLE_ERROR',
    NOTE_ADDED:       'NOTE_ADDED',
    NEW_RECORDING:    'NEW_RECORDING',
  }
  ```
- [ ] Update `src/background/index.js` — thay tất cả string message literals sang import từ `MSG`
- [ ] Update `src/content/index.js` — thay tất cả string message literals sang import từ `MSG`
- [ ] Update `src/offscreen/index.js` — thay tất cả string message literals sang import từ `MSG`
- [ ] Update `src/preview/App.jsx` — thay tất cả string message literals sang import từ `MSG`

**Files cần sửa:**
- `src/shared/messages.js` ← **[NEW]**
- `src/background/index.js`
- `src/content/index.js`
- `src/offscreen/index.js`
- `src/preview/App.jsx`

---

### 1.3 Xử lý Offscreen Lifecycle Messages

**Vấn đề:**
- Offscreen gửi: `CAPTURE_ERROR`, `CAPTURE_DONE`, `CAPTURE_FAILED`
- Background handler chỉ biết: `NEW_RECORDING`, `DOM_EVENT`, `NOTE_ADDED`, `CONSOLE_ERROR`
- → Kết quả: recording fail âm thầm, không có recovery path

**Việc cần làm:**
- [ ] Trong `src/background/index.js`, thêm handlers cho:
  - `CAPTURE_DONE` → persist recording metadata, mở preview tab
  - `CAPTURE_FAILED` → reset state, hiển thị error (badge đỏ hoặc notification)
  - `CAPTURE_ERROR` → log error, reset state
- [ ] Đảm bảo preview tab chỉ mở khi nhận được `CAPTURE_DONE` (không mở sớm hơn)

**Files cần sửa:**
- `src/background/index.js`

---

### 1.4 Verify Preview Chỉ Mở Sau Session Hợp Lệ

**Vấn đề:**
- Cần chắc chắn preview không mở khi session data chưa được persist thành công

**Việc cần làm:**
- [ ] Rà soát logic mở preview trong `src/background/index.js:117-128`
- [ ] Preview chỉ được mở trong handler của `CAPTURE_DONE`, sau khi session đã được write vào `chrome.storage.session`
- [ ] Thêm guard check: nếu session trống thì không mở preview (hoặc mở preview với trạng thái error rõ ràng)

**Files cần sửa:**
- `src/background/index.js`

---

## Smoke Test sau Phase 1

Sau khi hoàn tất, phải pass được **Smoke Test A**:

1. Load extension unpacked từ `dist/`
2. Mở một website bình thường
3. Click icon extension để start recording
4. Xác nhận: offscreen document được tạo thành công (không có lỗi trong Service Worker log)
5. Xác nhận: screen/tab picker xuất hiện
6. Click stop
7. Xác nhận: preview tab mở ra (không mở sớm hơn)
8. Xác nhận: không có silent fail nào trong Service Worker log

---

## Files tổng hợp cần chỉnh sửa

| File | Loại thay đổi |
|---|---|
| `src/shared/messages.js` | **[NEW]** — message constants |
| `src/background/index.js` | MODIFY — sửa offscreen path, chuẩn hóa messages, thêm lifecycle handlers |
| `src/content/index.js` | MODIFY — chuẩn hóa message names |
| `src/offscreen/index.js` | MODIFY — chuẩn hóa message names |
| `src/preview/App.jsx` | MODIFY — chuẩn hóa message names |

---

## Ước tính thời gian

| Công việc | Thời gian ước tính |
|---|---|
| 1.1 Sửa offscreen path | 30 phút |
| 1.2 Tạo message constants + update tất cả files | 1–2 giờ |
| 1.3 Thêm lifecycle handlers | 1 giờ |
| 1.4 Preview guard + verify | 30 phút |
| Smoke Test A | 30 phút |
| **Tổng** | **~3–4 giờ** |

---

## Kết quả thực hiện

| Task | File đã sửa | Thay đổi |
|---|---|---|
| 1.1 Path offscreen | Verified `manifest.json` + `background/index.js` | Path `src/offscreen/offscreen.html` khớp dist output |
| 1.2 Message constants | `src/shared/messages.js` **[NEW]** | Tất cả message types được tập trung |
| 1.2 Background | `src/background/index.js` | Import MSG, gửi đúng `START_RECORDING`/`STOP_RECORDING` |
| 1.2 Content | `src/content/index.js` | Lắng nghe đúng `START_RECORDING`/`STOP_RECORDING` |
| 1.2 Offscreen | `src/offscreen/index.js` | Import MSG, sửa tên message |
| 1.2 Preview | `src/preview/App.jsx` | Import MSG, dùng `MSG.NEW_RECORDING` |
| 1.3 Lifecycle handlers | `src/background/index.js` | Xử lý `CAPTURE_DONE`, `CAPTURE_FAILED`, `CAPTURE_ERROR` |
| 1.4 Preview guard | `src/background/index.js` | Preview chỉ mở sau `CAPTURE_DONE` qua `finalizeSession()` |
| tabCapture (Q4) | `background/index.js`, `offscreen/index.js`, `manifest.json` | MV3 pattern: `getMediaStreamId` → `getUserMedia` |

**Build:** ✅ Pass  
**Tests:** ✅ 38/38 pass

---

## Trạng thái

- [x] 1.1 — Sửa offscreen path
- [x] 1.2 — Chuẩn hóa message contract
- [x] 1.3 — Xử lý offscreen lifecycle messages
- [x] 1.4 — Guard preview chỉ mở sau session hợp lệ
- [x] tabCapture MV3 pattern (Phase 0 Q4)

**✅ Phase 1 đã hoàn tất.** Bắt đầu Phase 2.
