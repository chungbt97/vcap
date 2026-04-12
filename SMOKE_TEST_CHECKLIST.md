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

## E2E Tests (Phase C — Popup + Side Panel)

| Test | Nội dung | Pass? |
|---|---|---|
| E2E-1 | Popup → nhập ticket → Start → record → Stop → Side Panel hiện data | |
| E2E-2 | Popup START button chuyển sang **orange gradient `#f97300`** khi recording | |
| E2E-3 | Status dot + text "Recording" hiển thị màu `#f97300`, pulse animation | |
| E2E-4 | Ticket input bị disabled (opacity 40%) khi đang recording | |
| E2E-5 | Click 📷 → flash animation → screenshot counter tăng trong stats row | |
| E2E-6 | Export Markdown → ZIP có `bug-record.webm` + `jira-ticket.md` + `screenshots/` + `postman-curl/` | |
| E2E-7 | Filename ZIP đúng format `BUG-123_2026-04-11_14-30-00.zip` | |
| E2E-8 | Side Panel hiện real-time events khi đang record | |
| E2E-9 | Website có CSP strict → console capture hoạt động | |
| E2E-10 | Click events hiện text content thay vì class names | |
| E2E-11 | Network tab filter + search hoạt động | |
| E2E-12 | Record lần 2 sau khi stop hoạt động bình thường | |

---

## Smoke Test A — Recording Start/Stop (Popup)

1. Click icon VCAP → Popup mở
2. Nhập Ticket ID: `BUG-123`
3. Bấm **START RECORDING**
4. **Kỳ vọng:**
   - [x] Badge "REC" xuất hiện trên icon extension (màu cam `#f97300`)
   - [x] Popup ở lại, button chuyển sang **orange gradient**
   - [x] Status pill hiển thị "Recording" (cam, pulse animation)
   - [x] Ticket input bị disabled
   - [x] Extension bắt đầu record tab hiện tại **không hiện display picker**
   - [x] Không có lỗi trong Service Worker inspector log
5. Bấm **STOP RECORDING**
6. **Kỳ vọng:**
   - [x] Badge biến mất
   - [x] Side Panel tự mở (thay vì tab mới)
   - [-] Side Panel hiển thị events đã capture
   - [-] Không có silent fail trong Service Worker log

---

## Smoke Test B — DOM Event Capture

1. Click icon VCAP → nhập ticket → Start recording
2. Thực hiện trên page đang test:
   - [x] Click một button
   - [x] Gõ vào một input field
   - [x] Navigate sang trang khác (nếu là SPA)
3. Bấm Stop
4. Mở tab **DOM** trong Side Panel
5. **Kỳ vọng:**
   - [-] Có ít nhất 3 events hiển thị
   - [x] Events có timestamp (`mm:ss`) hợp lý
   - [x] Input password field hiển thị `[REDACTED]` thay vì giá trị thật
   - [x] Click events hiển thị **text content** của element (không phải CSS classes)

---

## Smoke Test C — Network Capture

1. Click icon VCAP → Start recording
2. Thực hiện requests (thành công + thất bại nếu có thể)
3. Stop → Mở tab **Network** trong Side Panel
4. **Kỳ vọng:**
   - [x] Tất cả requests hiển thị (không chỉ errors)
   - [x] 🟢 cho 2xx, 🔴 cho 4xx/5xx/failed
   - [x] Filter pills (All / Success / Error) hoạt động
   - [x] URL search (debounce 300ms) hoạt động
   - [x] Authorization header hiển thị `[REDACTED]`

---

## Smoke Test D — Screenshot

1. Click icon VCAP (popup mở)
2. Bấm nút 📷 (camera, 52×52px bên phải Start button)
3. **Kỳ vọng:**
   - [x] Flash animation ngắn (orange → reset)
   - [x] Screenshot counter trong stats row tăng lên 1
   - [x] Hoạt động cả khi KHÔNG đang recording
4. Bấm 📷 thêm vài lần, sau đó export ZIP
5. **Kỳ vọng trong ZIP:**
   - [x] Folder `screenshots/` tồn tại
   - [x] Files `shot-001_mm-ss.png`, `shot-002_mm-ss.png`, ... đúng format

---

## Smoke Test E — Export

1. Chạy một session thật (có events + network requests + screenshots)
2. Trong Side Panel hoặc Popup → bấm **Export Markdown**
3. Mở file ZIP vừa tải về
4. **Kỳ vọng — cấu trúc ZIP:**
   - [x] File `bug-record.webm` tồn tại và phát được
   - [x] File `jira-ticket.md` tồn tại với nội dung có ý nghĩa
   - [x] Folder `screenshots/` tồn tại (nếu đã chụp)
   - [x] Folder `postman-curl/` tồn tại (nếu có error requests được chọn)
   - [x] Tên ZIP: `{TicketName}_{YYYY-MM-DD}_{HH-mm-ss}.zip` (vd: `BUG-123_2026-04-11_14-30-00.zip`)
   - [x] Nếu không có ticket: `vcap_{YYYY-MM-DD}_{HH-mm-ss}.zip`
5. **Kỳ vọng — nội dung cURL:**
   - [x] `Authorization` header bị `[REDACTED]`
   - [x] `Cookie` header không có mặt
   - [x] cURL command hợp lệ

---

## Smoke Test F — CSP Compliance

1. Mở website có CSP strict (vd: `uat-admin.sdax.co`)
2. Start recording
3. Thực hiện một số actions
4. Stop
5. **Kỳ vọng:**
   - [-] Không có CSP violation error trong page console
   - [-] Console errors được capture (không trống)

---

## Smoke Test G — Record Lần 2

1. Record lần 1 → Stop
2. Side Panel mở
3. Click Popup → bấm **START RECORDING** lần 2
4. **Kỳ vọng:**
   - [x] Recording bắt đầu bình thường (không bị stuck)
   - [x] Badge "REC" xuất hiện
   - [x] Data từ session mới, không lẫn session cũ

---

## Security Check

- [ ] Mở Service Worker inspector → kiểm tra Console → không thấy raw token/auth string nào bị log
- [ ] Trong `chrome.storage.session` (DevTools → Application → Session Storage) → không thấy raw credentials

---

## Build & Test Gate

- [ ] `npm test` → **57 tests pass**
- [ ] `npm run build` → **build pass, không có warning nghiêm trọng**

---

## Chrome Web Store Submission Checklist

### Manifest
- [ ] `manifest_version: 3`
- [ ] `permissions` đã khai báo: `activeTab`, `storage`, `downloads`, `debugger`, `offscreen`, `notifications`, `tabCapture`, `sidePanel`
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
| A — Recording (Popup) | | | |
| B — DOM Events | | | |
| C — Network Capture | | | |
| D — Screenshot | | | |
| E — Export | | | |
| F — CSP Compliance | | | |
| G — Record Lần 2 | | | |
| Security Check | | | |
| Build & Test | | | |


---

## Setup

- [x] Chạy `npm install && npm run build` từ project root
- [x] Mở `chrome://extensions` trong Chrome
- [x] Bật **Developer mode**
- [x] Bấm **Load unpacked** → chọn thư mục `dist/`
- [x] Pin extension để dễ click khi test
- [x] Mở **Service Worker inspector** (bấm link "Inspect" trên card VCAP)

---

## Smoke Test A — Recording Start/Stop

1. Mở một website bình thường (vd: `https://example.com`)
2. Click icon VCAP trên toolbar
3. **Kỳ vọng:**
   - [x] Badge "REC" xuất hiện trên icon extension (màu đỏ)
   - [x] Extension bắt đầu record tab hiện tại **không hiện display picker** (tabCapture tự động)
   - [x] Không có lỗi trong Service Worker inspector log
4. Click icon VCAP lần nữa để stop
5. **Kỳ vọng:**
   - [x] Badge biến mất
   - [x] Preview tab tự mở (sau khi recording dừng hoàn toàn)
   - [x] Không có silent fail trong Service Worker log

---

## Smoke Test B — DOM Event Capture

1. Click icon VCAP → start recording
2. Thực hiện trên page đang test:
   - [x] Click một button
   - [x] Gõ vào một input field
   - [x] Scroll trang
   - [x] Navigate sang trang khác (nếu là SPA)
3. Click icon VCAP → stop
4. Mở tab **DOM** trong preview
5. **Kỳ vọng:**
   - [-] Có ít nhất 3 events hiển thị
   - [x] Events có timestamp (`mm:ss`) hợp lý
   - [x] Input password field hiển thị `[REDACTED]` thay vì giá trị thật
   - [-] Scroll event hiển thị `scrollY: Xpx`

---

## Smoke Test C — API Error Capture

1. Click icon VCAP → start recording
2. Thực hiện một request fail:
   - Cách đơn giản: mở DevTools Network → disable cache → tải lại trang có API gọi backend → hoặc gọi một endpoint không tồn tại
   - Mục tiêu: tạo ra ít nhất 1 response HTTP ≥ 400
3. Click icon VCAP → stop
4. Mở tab **API Errors** trong preview
5. **Kỳ vọng:**
   - [x] API error xuất hiện trong danh sách
   - [x] Cột **Authorization** header hiển thị `[REDACTED]` hoặc không tồn tại
   - [x] Cookie header không xuất hiện
   - [x] Method, URL, status code hiển thị đúng

---

## Smoke Test D — Export

1. Chạy một session thật (có ít nhất vài DOM events và 1 API error nếu có thể)
2. Trong preview → bấm **Export ZIP**
3. Mở file ZIP vừa tải về
4. **Kỳ vọng — cấu trúc ZIP:**
   - [x] File `bug-record.webm` tồn tại
   - [x] File `bug-record.webm` phát được trong trình duyệt
   - [x] File `jira-ticket.md` tồn tại với nội dung có ý nghĩa
   - [x] Folder `postman-curl/` tồn tại (nếu có API error được chọn)
   - [x] File cURL trong `postman-curl/` có naming: `[time]_[METHOD]-[api-name].txt`
   - [x] Tên ZIP: `bug-report-[timestamp].zip`
5. **Kỳ vọng — nội dung cURL file:**
   - [x] `Authorization` header bị `[REDACTED]`
   - [x] `Cookie` header không có mặt
   - [x] cURL command hợp lệ (copy-paste được vào terminal)
6. **Edge case — export không có API errors:**
   - [x] Export vẫn thành công
   - [x] ZIP không có folder `postman-curl/` (không tạo folder rỗng)

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
