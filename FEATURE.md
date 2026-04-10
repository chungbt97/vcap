# VCAP — Feature Specification (MVP Release Contract)

> Ngày chốt: 2026-04-10  
> Đây là nguồn sự thật duy nhất (single source of truth) cho MVP release.  
> `README.md` và `PLAN.md` phải khớp với file này.

---

## In Scope (MVP)

### 1. Recording

- Click button **Start Record** → bắt đầu capture video màn hình của **current tab** (dùng `chrome.tabCapture` để tự động capture đúng tab đang test, không hiện generic display picker)
- **Không capture âm thanh** — chỉ capture video: `{ video: true, audio: false }`
- Có giới hạn tối đa **5 phút** per session, tự động stop khi hết giờ
- Click **Stop Record** → dừng recording và chuyển sang preview

### 2. Event Capture (trong quá trình record)

Extension tự động capture các hành động của người dùng trên trình duyệt:

| Event type | Trạng thái |
|---|---|
| `click` | ✅ In scope |
| `input` (nhập liệu) | ✅ In scope |
| `scroll` | ✅ In scope |
| `navigation` (SPA routing + history) | ✅ In scope |
| `submit` | ✅ In scope |

### 3. Preview Tab — sau khi Stop Record

Sau khi stop, extension tự động mở **Preview Tab** với các tab sau:

| Tab | Nội dung |
|---|---|
| **All** | Hiển thị tổng hợp: DOM events + API Errors + Console errors, sort theo timestamp |
| **DOM** | Tất cả DOM actions: click, scroll, input, navigation |
| **API Errors** | Tất cả HTTP request bị fail (status ≥ 400), kèm method, URL, status code, cURL command |
| **Console** | Tất cả console errors phát ra từ page đang được test |
| **Export** | Xem trước dữ liệu và trigger export ZIP |
| **Note** | UI placeholder — chưa implement function (xem mục Out of Scope) |

### 4. Export

- Bấm **Export ZIP** từ tab Export trong preview
- Output là một file `.zip` tải về thư mục Downloads của máy
- Cấu trúc ZIP:

```
bug-report-[timestamp].zip
├── bug-record.webm          ← video ghi lại màn hình (không có âm thanh)
├── jira-ticket.md           ← markdown report: steps, API errors, console errors
└── postman-curl/
    └── [Time]_[API-Name].txt  ← cURL command cho từng API error user đã chọn
```

- User có thể **chọn lọc** API errors nào được export (checklist trong preview)
- Nếu không có API error nào được chọn, folder `postman-curl/` không được tạo trong ZIP
- Tên file ZIP phải có timestamp: `bug-report-2026-04-10T14-30-00.zip`

### 5. Security

- **Bắt buộc** sanitize tất cả network data trước khi lưu vào storage, hiển thị, hoặc export
- Các field bị redact: `Authorization`, `Cookie`, `Set-Cookie`, `X-API-Key`, `X-Auth-Token`, `password`, `token`, `secret`
- Tất cả xử lý là **local-only** — không gửi data lên server nào

---

## Out of Scope (MVP — implement sau)

| Feature | Ghi chú |
|---|---|
| **Audio capture** | MVP chỉ cần video, không cần âm thanh |
| **JSON export** | MVP chỉ cần ZIP. JSON export là tính năng tương lai |
| **Note function** | Note tab hiển thị UI placeholder. Implement logic ở release sau |
| **Generic display picker** | MVP dùng `tabCapture` (auto capture current tab) |
| **Cloud sync / storage** | Hoàn toàn local-only |

---

## UI

> Toàn bộ UI hiện tại đang đúng — **không cần chỉnh sửa gì thêm**.  
> Chỉ cần implement các function đã mô tả ở trên.

---

## Điều kiện release (Definition of Done)

Extension được coi là sẵn sàng release khi pass tất cả các smoke test trong `SMOKE_TEST_CHECKLIST.md`:

- Tester có thể start và stop một session thành công (không fail âm thầm)
- DOM events xuất hiện trong tab DOM của preview
- API errors xuất hiện trong tab API Errors (nếu có request fail)
- Auth header/token bị redact trong UI và trong cURL export
- Export ZIP tải về thành công với đúng cấu trúc file