# Phase 5 — Thêm Release Gate ✅ HOÀN TẤT

> **Mục tiêu:** Ngăn tình trạng "UI nhìn xong rồi nhưng runtime vẫn hỏng" lặp lại trong các release tương lai.

> **Prerequisite:** Phase 1–4 đã hoàn tất. Extension đang hoạt động end-to-end.

---

## Bối cảnh

Một trong những root cause của trạng thái hiện tại là:

> _"Codebase có unit coverage cho helper thuần khá tốt nhưng gần như không có runtime coverage — vì vậy build/test vẫn pass trong khi core user flow đang fail."_

Phase 5 tạo ra một **release gate** để đảm bảo điều này không xảy ra nữa. Gate này bao gồm:
1. **Manual smoke test checklist** — có thể thực hiện trước mỗi release
2. **Integration test tối thiểu** — nếu khả thi trong giới hạn MV3
3. **Pre-store submission checklist** — đảm bảo store submission không bị reject

---

## Danh sách việc cần làm

### 5.1 Định Nghĩa Manual Smoke Test Checklist

**Việc cần làm:**
- [ ] Tạo file `SMOKE_TEST_CHECKLIST.md` tại root của project
- [ ] Checklist phải bao gồm 4 smoke tests từ audit:

**Nội dung `SMOKE_TEST_CHECKLIST.md`:**

```markdown
# VCAP — Pre-Release Smoke Test Checklist

Thực hiện TOÀN BỘ các bước dưới đây trước khi submit lên Chrome Web Store.
Mọi checkbox phải được tick trước khi release.

## Setup
- [ ] Chạy `npm install && npm run build`
- [ ] Load extension unpacked từ `dist/` vào Chrome
- [ ] Mở Service Worker inspector tại `chrome://extensions`

## Smoke Test A — Recording Start/Stop
- [ ] Mở một website bình thường
- [ ] Click icon extension → recording bắt đầu
- [ ] Screen/tab picker xuất hiện  
- [ ] Badge/UI thay đổi để báo hiệu đang recording
- [ ] Click stop → preview tab tự mở
- [ ] KHÔNG có lỗi trong Service Worker log

## Smoke Test B — DOM Event Capture
- [ ] Trong lúc recording: click button, gõ vào input, scroll
- [ ] Sau stop: tab DOM trong preview có ít nhất 3 events
- [ ] Events có timestamp hợp lý và URL đúng

## Smoke Test C — API Error Capture
- [ ] Trong lúc recording: tạo ra 1 request fail (4xx/5xx)
- [ ] Tab API Errors có item tương ứng
- [ ] Auth header/token bị REDACTED trong UI

## Smoke Test D — Export
- [ ] Bấm Export ZIP từ preview
- [ ] ZIP tải về thành công
- [ ] ZIP chứa: `bug-record.webm`, `jira-ticket.md`, và `postman-curl/` (nếu có API errors)
- [ ] File video phát được
- [ ] Auth header/token bị REDACTED trong cURL files
- [ ] Tên file ZIP có timestamp

## Security Check
- [ ] Mở Network tab của Service Worker → không thấy raw credentials bị gửi đi đâu
- [ ] Kiểm tra `chrome.storage.session` → không thấy raw token nào

## Build Check
- [ ] `npm test` — tất cả tests pass
- [ ] `npm run build` — build thành công, không có warning nghiêm trọng
```

---

### 5.2 Integration Test Tối Thiểu (nếu khả thi)

**Bối cảnh về giới hạn của MV3:**
- MV3 extensions rất khó test tự động hoàn toàn vì:
  - Service worker lifecycle không thể mock dễ dàng
  - `chrome.debugger` API không có trong unit test environment
  - `getDisplayMedia` không thể tự động trong automated test

**Phạm vi có thể test được tự động:**

- [ ] **Message routing test:** Mock `chrome.runtime.sendMessage` và verify Background handler routing đúng message đến đúng handler
- [ ] **State persistence test:** Verify `chrome.storage.session` được write/read đúng sau mỗi recording lifecycle event
- [ ] **Sanitize integration test:** End-to-end từ raw network data → sanitize → storage → export, verify không có sensitive data nào còn sót
- [ ] **Export generation test:** Tạo mock session data → generate ZIP → verify cấu trúc và naming

**Tools gợi ý:**
- Dùng `vitest` (hiện tại đang dùng) + `jest-chrome` mock hoặc manual mock cho chrome APIs
- Tham khảo: `vitest` + chrome extension testing patterns

**Files cần tạo:**
- `src/__tests__/background.integration.test.js` ← **[NEW]**
- `src/__tests__/exportPipeline.integration.test.js` ← **[NEW]**

---

### 5.3 Pre-Store Submission Checklist

**Việc cần làm:**
- [ ] Tạo section "Chrome Web Store Submission" trong `SMOKE_TEST_CHECKLIST.md`:

```markdown
## Chrome Web Store Submission Checklist

### Manifest
- [ ] `manifest_version: 3` 
- [ ] `permissions` đã khai báo đầy đủ (debugger, storage, activeTab, tabs, offscreen)
- [ ] `host_permissions` đã khai báo nếu cần
- [ ] `description` rõ ràng, không quá 132 ký tự

### Privacy & Policy
- [ ] Privacy Policy URL đã có và accessible
- [ ] Privacy Policy mô tả rõ: dữ liệu được lưu local, không gửi lên server nào
- [ ] Mô tả tại sao extension dùng `chrome.debugger` permission

### Assets
- [ ] Icon có đủ các size: 16, 32, 48, 128px
- [ ] Screenshots cho store listing (ít nhất 1)
- [ ] Store description và promotional text đã chuẩn bị

### Final Build
- [ ] `npm run build` từ clean state (xóa `dist/` trước)
- [ ] ZIP toàn bộ thư mục `dist/` để upload
- [ ] Verify ZIP size không vượt giới hạn Chrome Web Store (128MB)
```

---

### 5.4 CI Gate Tối Thiểu (Optional nhưng khuyến nghị)

**Nếu project dùng GitHub Actions hoặc CI tương tự:**

- [ ] Tạo workflow chạy `npm test` trên mỗi PR
- [ ] Tạo workflow chạy `npm run build` để verify build không bị break
- [ ] Optionally: fail build nếu test coverage dưới ngưỡng (e.g., 60% cho utils)

**File cần tạo (nếu dùng GitHub Actions):**
- `.github/workflows/ci.yml` ← **[NEW]**

---

### 5.5 Cập Nhật README Với Hướng Dẫn Testing

**Việc cần làm:**
- [ ] Thêm section "Testing" vào `README.md`:
  - Hường dẫn chạy unit tests (`npm test`)
  - Link tới `SMOKE_TEST_CHECKLIST.md`
  - Hướng dẫn load extension unpacked để manual test

---

## Release Gate Summary

Trước mỗi release candidate, phải đảm bảo:

```
npm test     → ✅ tất cả tests pass
npm run build → ✅ build thành công
Smoke Test A  → ✅ recording start/stop
Smoke Test B  → ✅ DOM events visible
Smoke Test C  → ✅ API errors captured
Smoke Test D  → ✅ export hợp lệ
Security check → ✅ không có raw credentials
Store checklist → ✅ sẵn sàng submit
```

---

## Files tổng hợp cần tạo/chỉnh sửa

| File | Loại thay đổi |
|---|---|
| `SMOKE_TEST_CHECKLIST.md` | **[NEW]** — manual test checklist |
| `src/__tests__/background.integration.test.js` | **[NEW]** — integration tests |
| `src/__tests__/exportPipeline.integration.test.js` | **[NEW]** — export integration tests |
| `.github/workflows/ci.yml` | **[NEW]** — CI gate (optional) |
| `README.md` | MODIFY — thêm section Testing |

---

## Ước tính thời gian

| Công việc | Thời gian ước tính |
|---|---|
| 5.1 Manual smoke test checklist | 1 giờ |
| 5.2 Integration tests | 2–4 giờ |
| 5.3 Store submission checklist | 1 giờ |
| 5.4 CI gate (optional) | 1–2 giờ |
| 5.5 Cập nhật README | 30 phút |
| **Tổng** | **~5–8 giờ** |

---

## Trạng thái

- [ ] 5.1 — Manual smoke test checklist (`SMOKE_TEST_CHECKLIST.md`)
- [ ] 5.2 — Integration tests
- [ ] 5.3 — Pre-store submission checklist
- [ ] 5.4 — CI gate (optional)
- [ ] 5.5 — Cập nhật README
- [ ] 🎉 **VCAP sẵn sàng release**
