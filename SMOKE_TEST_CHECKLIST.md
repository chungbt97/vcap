# VCAP — Pre-Release Smoke Test Checklist

> Thực hiện **TOÀN BỘ** các bước dưới đây trước khi submit lên Chrome Web Store.  
> Mọi checkbox phải được tick. Nếu bất kỳ bước nào fail → **đừng release**.

---

## Setup

- [ ] Chạy `npm install && npm run build` từ project root
- [ ] Mở `chrome://extensions` trong Chrome
- [ ] Bật **Developer mode**
- [ ] Bấm **Load unpacked** → chọn thư mục `dist/`
- [ ] Pin extension để dễ click khi test
- [ ] Mở **Service Worker inspector** (bấm link "Inspect" trên card VCAP)

---

## Smoke Test A — Recording Start/Stop

1. Mở một website bình thường (vd: `https://example.com`)
2. Click icon VCAP trên toolbar
3. **Kỳ vọng:**
   - [ ] Badge "REC" xuất hiện trên icon extension (màu đỏ)
   - [ ] Extension bắt đầu record tab hiện tại **không hiện display picker** (tabCapture tự động)
   - [ ] Không có lỗi trong Service Worker inspector log
4. Click icon VCAP lần nữa để stop
5. **Kỳ vọng:**
   - [ ] Badge biến mất
   - [ ] Preview tab tự mở (sau khi recording dừng hoàn toàn)
   - [ ] Không có silent fail trong Service Worker log

---

## Smoke Test B — DOM Event Capture

1. Click icon VCAP → start recording
2. Thực hiện trên page đang test:
   - [ ] Click một button
   - [ ] Gõ vào một input field
   - [ ] Scroll trang
   - [ ] Navigate sang trang khác (nếu là SPA)
3. Click icon VCAP → stop
4. Mở tab **DOM** trong preview
5. **Kỳ vọng:**
   - [ ] Có ít nhất 3 events hiển thị
   - [ ] Events có timestamp (`mm:ss`) hợp lý
   - [ ] Input password field hiển thị `[REDACTED]` thay vì giá trị thật
   - [ ] Scroll event hiển thị `scrollY: Xpx`

---

## Smoke Test C — API Error Capture

1. Click icon VCAP → start recording
2. Thực hiện một request fail:
   - Cách đơn giản: mở DevTools Network → disable cache → tải lại trang có API gọi backend → hoặc gọi một endpoint không tồn tại
   - Mục tiêu: tạo ra ít nhất 1 response HTTP ≥ 400
3. Click icon VCAP → stop
4. Mở tab **API Errors** trong preview
5. **Kỳ vọng:**
   - [ ] API error xuất hiện trong danh sách
   - [ ] Cột **Authorization** header hiển thị `[REDACTED]` hoặc không tồn tại
   - [ ] Cookie header không xuất hiện
   - [ ] Method, URL, status code hiển thị đúng

---

## Smoke Test D — Export

1. Chạy một session thật (có ít nhất vài DOM events và 1 API error nếu có thể)
2. Trong preview → bấm **Export ZIP**
3. Mở file ZIP vừa tải về
4. **Kỳ vọng — cấu trúc ZIP:**
   - [ ] File `bug-record.webm` tồn tại
   - [ ] File `bug-record.webm` phát được trong trình duyệt
   - [ ] File `jira-ticket.md` tồn tại với nội dung có ý nghĩa
   - [ ] Folder `postman-curl/` tồn tại (nếu có API error được chọn)
   - [ ] File cURL trong `postman-curl/` có naming: `[time]_[METHOD]-[api-name].txt`
   - [ ] Tên ZIP: `bug-report-[timestamp].zip`
5. **Kỳ vọng — nội dung cURL file:**
   - [ ] `Authorization` header bị `[REDACTED]`
   - [ ] `Cookie` header không có mặt
   - [ ] cURL command hợp lệ (copy-paste được vào terminal)
6. **Edge case — export không có API errors:**
   - [ ] Export vẫn thành công
   - [ ] ZIP không có folder `postman-curl/` (không tạo folder rỗng)

---

## Security Check

- [ ] Mở Service Worker inspector → kiểm tra Console → không thấy raw token/auth string nào bị log
- [ ] Trong `chrome.storage.session` (DevTools → Application → Session Storage) → không thấy raw credentials

---

## Build & Test Gate

- [ ] `npm test` → **tất cả tests pass**
- [ ] `npm run build` → **build pass, không có warning nghiêm trọng**

---

## Chrome Web Store Submission Checklist

### Manifest
- [ ] `manifest_version: 3`
- [ ] `permissions` đã khai báo: `activeTab`, `storage`, `downloads`, `debugger`, `offscreen`, `notifications`, `tabCapture`
- [ ] `description` rõ ràng, dưới 132 ký tự
- [ ] `version` được bump

### Privacy & Policy
- [ ] File `PRIVACY_POLICY.md` đã có tại root
- [ ] Privacy Policy URL accessible (host trên GitHub Pages hoặc Notion public)
- [ ] Privacy Policy URL điền vào form Chrome Web Store submission

### Icons & Assets
- [ ] Icon có đủ: `icons/icon16.svg`, `icons/icon48.svg`, `icons/icon128.svg`
- [ ] Screenshot cho store listing (ít nhất 1 ảnh, 1280x800 hoặc 640x400)
- [ ] Store description và promotional text đã chuẩn bị

### Final Build
- [ ] `npm run build` từ **clean state** (xóa `dist/` trước nếu cần)
- [ ] ZIP toàn bộ thư mục `dist/` để upload
- [ ] Verify ZIP size < 128MB (giới hạn Chrome Web Store)

---

## Kết quả

| Smoke Test | Ngày test | Pass/Fail | Ghi chú |
|---|---|---|---|
| A — Recording | | | |
| B — DOM Events | | | |
| C — API Errors | | | |
| D — Export | | | |
| Security Check | | | |
| Build & Test | | | |
