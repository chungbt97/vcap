# Phase 3 — Sửa Security và Data Handling ✅ HOÀN TẤT

> **Mục tiêu:** Làm cho dữ liệu captured đủ an toàn để release trên Chrome Web Store.

> **Prerequisite:** Phase 1 đã hoàn tất. Phase 2 có thể chạy song song nếu team đủ người.

---

## Bối cảnh & Rủi ro

Đây là phase bảo mật — không phải tính năng mới. Nhưng đây là **P0 blocker** vì:

1. **Chrome Web Store policy** yêu cầu không được leak auth/session/token data
2. **Rủi ro bảo mật thật**: nếu user export `.zip` và share, họ có thể vô tình leak credentials
3. **Hiện tại:** network data (bao gồm `requestHeaders`, `requestBody`, `responseBody`) đang được lưu raw vào `state.apiErrors` mà **chưa qua sanitize**
4. Sanitize hiện chỉ xảy ra ở bước cuối (`curlBuilder.js:19-20`) — quá muộn

### Những gì đang ở rủi ro cao nhất

```
Authorization: Bearer eyJhbGciOi...  ← đang bị lưu raw
Cookie: session=abc123; csrf=xyz      ← đang bị lưu raw
X-API-Key: sk_live_xxxx               ← đang bị lưu raw
```

---

## Danh sách việc cần làm

### 3.1 Áp Sanitize Ngay Tại Điểm Capture

**Vị trí lưu dữ liệu hiện tại:** `src/background/index.js:138-170`

**Việc cần làm:**
- [ ] Tại điểm lưu `requestHeaders`, gọi `sanitizeHeaders(headers)` **trước** khi push vào `state.apiErrors`
- [ ] Tương tự với `requestBody` và `responseBody` — sanitize trước khi lưu
- [ ] Import và dùng `sanitize.js` functions ngay trong background handler

**Ví dụ thay đổi:**
```js
// TRƯỚC (không an toàn):
state.apiErrors.push({
  requestHeaders: details.requestHeaders,  // raw!
  ...
});

// SAU (đã sanitize):
state.apiErrors.push({
  requestHeaders: sanitizeHeaders(details.requestHeaders),  // safe
  ...
});
```

**Files cần sửa:**
- `src/background/index.js`

---

### 3.2 Kiểm tra và Đảm bảo Sanitize Coverage

**Việc cần làm:**
- [ ] Rà soát `src/utils/sanitize.js` — danh sách header/field bị redact hiện tại có đủ chưa?
  - Cần cover ít nhất: `Authorization`, `Cookie`, `Set-Cookie`, `X-API-Key`, `X-Auth-Token`, `X-CSRF-Token`
  - Cần redact values chứa token patterns (Bearer, Basic, sk_...)
- [ ] Nếu thiếu, bổ sung vào `sanitize.js` và viết thêm unit test
- [ ] Kiểm tra `requestBody`: có sanitize JSON body khi có field `password`, `token`, `secret`, `api_key` không?
- [ ] Kiểm tra `responseBody`: tương tự

**Files cần sửa:**
- `src/utils/sanitize.js`
- `src/utils/sanitize.test.js` (thêm test cases)

---

### 3.3 Redact Trước Khi Render Preview

**Vấn đề:**
- Ngay cả khi lưu an toàn rồi, cần đảm bảo preview không accidentally hiển thị raw data nếu có session data cũ hoặc data từ legacy path

**Việc cần làm:**
- [ ] Trong preview components hiển thị API Errors, double-check: data được render đã qua sanitize chưa?
- [ ] Nếu preview đang render trực tiếp từ `chrome.storage.session`, và data trong session đã được sanitize ở bước 3.1, thì đây chỉ là verify — không cần sửa thêm
- [ ] Nếu preview có path nào render raw data, sửa để luôn pipe qua sanitize function trước khi hiển thị

**Files cần sửa:**
- `src/preview/App.jsx` hoặc component hiển thị API Errors

---

### 3.4 Đảm bảo cURL Export Luôn Sanitized

**Trạng thái hiện tại:**
- `curlBuilder.js:19-20` đang làm việc này, nhưng chỉ ở export time
- Sau fix 3.1, data trong session đã sanitize từ sớm → cURL export sẽ inherit sự an toàn đó

**Việc cần làm:**
- [ ] Xác nhận: `curlBuilder.js` vẫn apply sanitize thêm một lần nữa ở export time (defense in depth)
- [ ] Viết hoặc review test: export một curl file từ mock data có auth header → verify output đã bị redact

**Files cần sửa (verify only, có thể không cần sửa code):**
- `src/utils/curlBuilder.js`
- `src/utils/curlBuilder.test.js`

---

### 3.5 Không Có Raw Sensitive Payload Nào Còn Bị Giữ

**Việc cần làm:**
- [ ] Rà soát toàn bộ các nơi write vào `chrome.storage.session` và `chrome.storage.local`
- [ ] Tìm kiếm text: `requestHeaders`, `requestBody`, `responseBody`, `credentials` trong codebase
- [ ] Xác nhận không có path nào còn lưu raw data sau fix 3.1

**Lệnh tìm kiếm gợi ý:**
```bash
grep -rn "requestHeaders\|requestBody\|responseBody" src/
```

---

### 3.6 Privacy Policy Wording (chuẩn bị cho Chrome Web Store)

**Vấn đề:**
- Extension dùng `chrome.debugger` — Chrome Web Store yêu cầu khai báo rõ mục đích sử dụng
- Cần có Privacy Policy URL khi submit store listing

**Việc cần làm:**
- [ ] Soạn một đoạn privacy policy ngắn, nêu rõ:
  - Extension capture network requests để bug reporting
  - Dữ liệu được sanitize, không gửi lên server nào
  - Tất cả data chỉ tồn tại local trên máy user
- [ ] Nếu chưa có website để host policy, có thể dùng GitHub Pages hoặc một gist public
- [ ] Thêm URL vào `manifest.json` (field `homepage_url` hoặc chuẩn bị cho submission form)

**Files cần sửa:**
- `manifest.json` (thêm homepage_url nếu chưa có)
- Tạo file `PRIVACY_POLICY.md` trong repo

---

## Smoke Test sau Phase 3

1. Start recording
2. Tạo ra một `401` hoặc `403` request (request có auth header)
3. Stop recording
4. Mở tab `API Errors` trong preview
5. Xác nhận: giá trị của `Authorization` header bị redact (hiển thị `[REDACTED]` hoặc tương đương)
6. Export ZIP
7. Mở file `.sh` cURL trong ZIP
8. Xác nhận: auth header cũng bị redact trong cURL output

---

## Files tổng hợp cần chỉnh sửa

| File | Loại thay đổi |
|---|---|
| `src/background/index.js` | MODIFY — sanitize trước khi lưu vào session state |
| `src/utils/sanitize.js` | MODIFY — mở rộng coverage nếu cần |
| `src/utils/sanitize.test.js` | MODIFY — thêm test cases |
| `src/preview/App.jsx` | VERIFY/MODIFY — đảm bảo không render raw data |
| `src/utils/curlBuilder.js` | VERIFY — confirm defense-in-depth vẫn đang hoạt động |
| `manifest.json` | MODIFY — thêm homepage_url |
| `PRIVACY_POLICY.md` | **[NEW]** |

---

## Ước tính thời gian

| Công việc | Thời gian ước tính |
|---|---|
| 3.1 Sanitize tại điểm capture | 30–60 phút |
| 3.2 Rà soát và mở rộng sanitize coverage | 1–2 giờ |
| 3.3 Verify preview rendering | 30 phút |
| 3.4 Verify cURL export | 30 phút |
| 3.5 Audit toàn bộ storage writes | 30 phút |
| 3.6 Privacy policy | 1 giờ |
| Smoke Test | 30 phút |
| **Tổng** | **~4–6 giờ** |

---

## Trạng thái

- [ ] 3.1 — Sanitize ngay tại điểm capture
- [ ] 3.2 — Kiểm tra và mở rộng sanitize coverage
- [ ] 3.3 — Verify preview không render raw data
- [ ] 3.4 — Verify cURL export sanitized
- [ ] 3.5 — Audit toàn bộ storage writes
- [ ] 3.6 — Privacy policy
- [ ] Smoke Test security pass
