# Phase 4 — Căn Chỉnh Export Theo MVP Contract ✅ HOÀN TẤT

> **Mục tiêu:** Export ra artifact mà người dùng thật sự có thể tin cậy — đúng tên, đúng cấu trúc, đúng dữ liệu thật.

> **Prerequisite:** Phase 1, Phase 2, và Phase 3 đã hoàn tất. Session data thật đang đi vào pipeline một cách ổn định.

---

## Bối cảnh

Export là feature cuối cùng trong user flow:

```
start record → capture events → stop → preview → export ← đây
```

Hiện tại utilities export (`zipExporter.js`, `curlBuilder.js`, `markdownBuilder.js`) khá tốt và đã có test, nhưng:

1. **Tên file và cấu trúc folder không khớp với docs**
2. **Json export path chưa tồn tại** (nếu Phase 0 quyết định cần thiết)
3. **Export thường bị chặn bởi thiếu recorded data** (sẽ được fix ở Phase 1 & 2)
4. **Export khi không có API errors nào được chọn chưa được verify**

---

## Bảng lệch tên file hiện tại vs. expectation

| | Hiện tại (`zipExporter.js`) | Docs kỳ vọng (`README.md` / `PLAN.md`) |
|---|---|---|
| Video file | `recording.webm` | `bug-record.webm` |
| Markdown report | `report.md` | `jira-ticket.md` |
| cURL files folder | `api-errors/` | `postman-curl/` |
| cURL file naming | `error-1.sh` | `[Time]_[API-Name].txt` |

> **Lưu ý:** Sau khi Phase 0 chốt MVP contract, tên file chính xác nên được confirm theo `FEATURE.md` (nguồn sự thật duy nhất). Nếu `FEATURE.md` vẫn chưa mô tả naming rõ ràng, Phase 4 cũng cần cập nhật `FEATURE.md`.

---

## Danh sách việc cần làm

### 4.1 Căn Chỉnh Tên File và Cấu Trúc Export

**Việc cần làm:**
- [ ] Trong `src/utils/zipExporter.js`, cập nhật tên file:
  - `recording.webm` → `bug-record.webm`
  - `report.md` → `jira-ticket.md`
  - Folder `api-errors/` → `postman-curl/`
- [ ] Cập nhật naming convention cho cURL files:
  - Hiện tại: `error-1.sh`, `error-2.sh`, ...
  - Cần: `[Timestamp]_[APIName].txt`, ví dụ: `2026-04-10T14-30-00_POST-api-users.txt`
  - Xử lý special characters trong API name (thay `/` bằng `-`, escape)
- [ ] Cập nhật unit test cho `zipExporter.js` để reflect naming mới

**Files cần sửa:**
- `src/utils/zipExporter.js`
- `src/utils/zipExporter.test.js`

---

### 4.2 JSON Export Path (nếu Phase 0 quyết định cần thiết)

**Nếu MVP yêu cầu JSON export:**
- [ ] Thêm export option trong preview: nút "Export JSON" bên cạnh "Export ZIP"
- [ ] Tạo function `generateJsonReport(session)` trong utils:
  ```js
  // Output structure
  {
    sessionId: string,
    startTime: ISO8601,
    endTime: ISO8601,
    url: string,
    steps: DOMEvent[],
    apiErrors: ApiError[],
    consoleErrors: ConsoleError[],
  }
  ```
- [ ] Trigger download file `.json` từ preview
- [ ] Viết test cho JSON report generator

**Files cần sửa/tạo:**
- `src/utils/jsonExporter.js` ← **[NEW]** (nếu cần)
- `src/preview/App.jsx`

**Nếu MVP KHÔNG yêu cầu JSON export:**
- [ ] Ghi rõ trong `FEATURE.md`: "JSON export — Out of scope for MVP"
- [ ] Trong preview UI, nếu có nút JSON, ẩn đi hoặc disable với tooltip "Coming soon"

---

### 4.3 Đảm Bảo Export Dùng Dữ Liệu Session Thật

**Vấn đề:**
- Preview có mock data path (`src/preview/main.jsx:12-30`) cho development
- Cần đảm bảo production path luôn dùng data từ `chrome.storage.session`

**Việc cần làm:**
- [ ] Rà soát `src/preview/main.jsx`: đảm bảo mock path chỉ được kích hoạt trong dev mode (e.g., qua `import.meta.env.DEV`)
- [ ] Trong production build, export pipeline phải dùng `chrome.storage.session` data
- [ ] Verify: session data đang bao gồm cả MediaRecorder blob (webm) hoặc IndexedDB chunks, không chỉ metadata

**Files cần sửa:**
- `src/preview/main.jsx`

---

### 4.4 Verify Export Khi Không Có API Errors

**Vấn đề:**
- Export flow phải vẫn tạo ra artifact kể cả khi:
  - Không có API error nào
  - User không chọn API error nào để export
  - `postman-curl/` folder sẽ trống hoặc không tồn tại trong ZIP

**Việc cần làm:**
- [ ] Test export với session không có API errors → ZIP phải vẫn tạo được với `bug-record.webm` và `jira-ticket.md`
- [ ] Nếu không có cURL files, `postman-curl/` folder không nên được tạo (không có empty folder trong ZIP)
- [ ] Verify markdown report vẫn hợp lệ khi không có API error section

**Files cần sửa:**
- `src/utils/zipExporter.js`

---

### 4.5 Export Edge Cases

**Việc cần làm:**
- [ ] Export khi video blob bị null/undefined → báo lỗi rõ ràng thay vì crash
- [ ] Export khi session data là empty object → báo lỗi, không tạo ZIP rỗng
- [ ] Export khi `chrome.storage.session` bị clear (e.g., sau khi reload) → hiển thị thông báo "No session data available"
- [ ] Tên ZIP file nên bao gồm timestamp: `vcap-session-2026-04-10.zip`

**Files cần sửa:**
- `src/utils/zipExporter.js`
- `src/preview/App.jsx` (error handling UI)

---

### 4.6 Cập Nhật FEATURE.md Với Export Spec Cuối Cùng

**Việc cần làm:**
- [ ] Thêm vào `FEATURE.md` một section "Export Specification":
  - Tên file ZIP
  - Cấu trúc bên trong ZIP
  - Naming convention cho cURL files
  - Export formats được hỗ trợ (json / md / zip)

---

## Smoke Test sau Phase 4

**Smoke Test D — Export có tạo ra artifact dùng được không?**

1. Chạy một session thật (start → interact → stop)
2. Mở preview
3. Bấm **Export ZIP**
4. Mở file ZIP vừa tải xuống
5. Kiểm tra cấu trúc bên trong:
   - [ ] File `bug-record.webm` tồn tại và phát được
   - [ ] File `jira-ticket.md` tồn tại và có nội dung thật
   - [ ] Folder `postman-curl/` tồn tại với các file `.txt` (nếu có API errors)
   - [ ] File naming theo format `[Time]_[API-Name].txt`
6. Export khi không có API errors — ZIP vẫn tạo được
7. Tên file ZIP có timestamp

---

## Files tổng hợp cần chỉnh sửa

| File | Loại thay đổi |
|---|---|
| `src/utils/zipExporter.js` | MODIFY — sửa naming, edge cases |
| `src/utils/zipExporter.test.js` | MODIFY — cập nhật test cho naming mới |
| `src/utils/jsonExporter.js` | **[NEW]** — chỉ nếu Phase 0 yêu cầu JSON |
| `src/preview/main.jsx` | MODIFY — đảm bảo mock chỉ ở dev mode |
| `src/preview/App.jsx` | MODIFY — error handling, JSON export button nếu cần |
| `FEATURE.md` | MODIFY — thêm export specification |

---

## Ước tính thời gian

| Công việc | Thời gian ước tính |
|---|---|
| 4.1 Căn chỉnh tên file/cấu trúc | 1–2 giờ |
| 4.2 JSON export (nếu cần) | 2–3 giờ |
| 4.3 Verify production path | 30 phút |
| 4.4 Edge case: no API errors | 30–60 phút |
| 4.5 Export error handling | 1 giờ |
| 4.6 Update FEATURE.md | 30 phút |
| Smoke Test D | 30 phút |
| **Tổng** | **~6–9 giờ** (có JSON) hoặc **~4–6 giờ** (không có JSON) |

---

## Trạng thái

- [ ] 4.1 — Căn chỉnh tên file và cấu trúc export
- [ ] 4.2 — JSON export (phụ thuộc quyết định Phase 0)
- [ ] 4.3 — Verify export dùng session thật
- [ ] 4.4 — Verify khi không có API errors
- [ ] 4.5 — Export edge cases
- [ ] 4.6 — Cập nhật FEATURE.md với export spec
- [ ] Smoke Test D pass
