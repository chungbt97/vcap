# Phase 2 — Sửa Event Capture và Session Wiring ✅ HOÀN TẤT

> **Mục tiêu:** Làm cho user activity thật xuất hiện trong preview tab sau khi stop recording.

> **Prerequisite:** Phase 1 đã hoàn tất — recording có thể start và stop thành công.

---

## Bối cảnh & Root Cause

Ngay cả sau khi recording lifecycle được fix, preview vẫn sẽ rỗng vì:

1. **Content Script không bao giờ gửi event về Background** — không có `chrome.runtime.sendMessage(...)` nào trong `src/content/*`
2. **Content Script không nhận được đúng start/stop signal** (đã fix một phần ở Phase 1, nhưng cần hoàn thiện thêm logic collect)
3. **Event coverage thấp** — chỉ có `click`, `change`, `submit`; thiếu `scroll`, `input`, navigation
4. **Console capture đang bắt lỗi của extension, không phải của page** — cách implement hiện tại không phản ánh đúng console của app đang được test

---

## Quyết định kiến trúc cần chốt trước

### Transport model cho events

Chọn một trong hai:

**Option A — Stream realtime:** Content gửi từng event ngay lập tức lên Background via `chrome.runtime.sendMessage`
- Ưu: Background luôn có state mới nhất, có thể recover nếu crash
- Nhược: nhiều message traffic hơn

**Option B — Batch on stop:** Content tích lũy events cục bộ, gửi một payload lớn duy nhất khi nhận `STOP_RECORDING`
- Ưu: đơn giản hơn, ít message traffic
- Nhược: nếu recording crash trước khi stop, data bị mất

> **Gợi ý cho MVP:** Option B (batch on stop) — đơn giản hơn và phù hợp với flow hiện tại của `getStepsAndClear()` trong `src/content/eventCollector.js`. Có thể upgrade lên Option A sau MVP nếu cần.

---

## Danh sách việc cần làm

### 2.1 Nối Content Script với Background: gửi data khi stop

**Việc cần làm (nếu chọn Option B — batch on stop):**
- [ ] Trong `src/content/index.js`, khi nhận `STOP_RECORDING`:
  1. Gọi `getStepsAndClear()` để lấy mảng events đã collect
  2. Gọi `chrome.runtime.sendMessage({ type: MSG.DOM_EVENT_BATCH, payload: steps })`
- [ ] Trong `src/background/index.js`, thêm handler cho `DOM_EVENT_BATCH`:
  1. Merge payload vào `state.steps`
  2. Persist vào `chrome.storage.session`

**Files cần sửa:**
- `src/content/index.js`
- `src/background/index.js`
- `src/shared/messages.js` — thêm `DOM_EVENT_BATCH`

---

### 2.2 Mở rộng Event Coverage

**Vấn đề:**
- Hiện chỉ có: `click`, `change`, `submit` (`src/content/eventCollector.js:23-25`)
- Cần thêm: `scroll`, `input`, navigation tracking

**Việc cần làm:**
- [ ] Thêm `input` event listener (debounced để tránh spam)
- [ ] Thêm `scroll` event listener (debounced — chỉ capture khi dừng scroll)
- [ ] Thêm navigation tracking:
  - Lắng nghe `popstate` event
  - Override `history.pushState` và `history.replaceState` để track SPA navigation
- [ ] Đảm bảo mỗi event item có format nhất quán:
  ```js
  {
    type: 'click' | 'input' | 'scroll' | 'navigate' | ...,
    target: 'sanitized selector hoặc element description',
    value: 'giá trị nếu có (input)', // đã sanitize
    timestamp: Date.now(),
    url: window.location.href,
  }
  ```

**Files cần sửa:**
- `src/content/eventCollector.js`

---

### 2.3 Sửa Console Error Capture

**Vấn đề:**
- Code hiện tại override `console.error` bên trong Content Script environment
- Điều này không bắt được page-level console errors của app đang được test

**Chiến lược đúng cho Content Script:**
- Content Script chạy trong same page context → có thể override `window.console.error` của page
- Nhưng cần inject script vào page context (không phải content context) để bắt đúng:
  ```js
  // Inject trực tiếp vào page context
  const script = document.createElement('script');
  script.textContent = `
    const _origError = console.error.bind(console);
    console.error = function(...args) {
      _origError(...args);
      window.postMessage({ type: '__VCAP_CONSOLE_ERROR__', args: args.map(String) }, '*');
    };
  `;
  document.documentElement.appendChild(script);
  ```
- Content Script lắng nghe `window.postMessage` với type `__VCAP_CONSOLE_ERROR__`

**Việc cần làm:**
- [ ] Inject page-context script để capture console.error thật
- [ ] Content Script listen `window.postMessage` từ page
- [ ] Tích lũy console errors vào mảng cục bộ
- [ ] Gửi batch về Background khi stop (tương tự DOM events)
- [ ] Thêm `CONSOLE_ERROR_BATCH` vào message constants

**Files cần sửa:**
- `src/content/eventCollector.js`
- `src/content/index.js`
- `src/shared/messages.js`
- `src/background/index.js`

---

### 2.4 Timestamp Consistency

**Vấn đề:**
- DOM steps, API errors, và console errors cần có timestamp nhất quán để có thể sort và hiển thị theo timeline

**Việc cần làm:**
- [ ] Đảm bảo mọi event đều dùng `Date.now()` hoặc `performance.now() + session.startTime`
- [ ] Background normalize timestamps khi merge data từ các nguồn khác nhau
- [ ] Preview tab sort `All` view theo timestamp

**Files cần sửa:**
- `src/content/eventCollector.js`
- `src/background/index.js`
- `src/preview/App.jsx` (sort logic)

---

### 2.5 Note Feature (UI-only, nếu đã chốt ở Phase 0)

Nếu Phase 0 quyết định Note là UI-only cho release này:
- [ ] Đảm bảo Note tab trong preview hiển thị placeholder message rõ ràng: _"Note capturing will be available in a future release."_
- [ ] Không cần implement note event flow cho MVP

Nếu Phase 0 quyết định Note cần có data thật:
- [ ] Implement note capture trong Content Script
- [ ] Forward note events về Background
- [ ] Hiển thị trong preview

---

## Smoke Test sau Phase 2

Sau khi hoàn tất, phải pass được **Smoke Test B**:

1. Start recording
2. Click vào một button trên trang
3. Gõ vào một input field
4. Scroll trang
5. Stop recording
6. Preview mở ra
7. Tab `DOM` phải hiển thị ít nhất 3 events
8. Tab `Console` phải không báo lỗi giả từ extension

---

## Files tổng hợp cần chỉnh sửa

| File | Loại thay đổi |
|---|---|
| `src/shared/messages.js` | MODIFY — thêm `DOM_EVENT_BATCH`, `CONSOLE_ERROR_BATCH` |
| `src/content/eventCollector.js` | MODIFY — thêm scroll/input/navigation, sửa console capture |
| `src/content/index.js` | MODIFY — gửi batch data về Background khi stop |
| `src/background/index.js` | MODIFY — thêm handlers cho batch events |
| `src/preview/App.jsx` | MODIFY — sort theo timestamp |

---

## Ước tính thời gian

| Công việc | Thời gian ước tính |
|---|---|
| 2.1 Nối Content → Background (batch) | 1–2 giờ |
| 2.2 Mở rộng event coverage | 1–2 giờ |
| 2.3 Sửa console error capture | 1–2 giờ |
| 2.4 Timestamp consistency | 30 phút |
| 2.5 Note (UI-only) | 30 phút |
| Smoke Test B | 30 phút |
| **Tổng** | **~5–8 giờ** |

---

## Trạng thái

- [ ] 2.1 — Nối Content Script với Background
- [ ] 2.2 — Mở rộng event coverage
- [ ] 2.3 — Sửa console error capture
- [ ] 2.4 — Timestamp consistency
- [ ] 2.5 — Note feature (UI-only hoặc full, theo Phase 0)
- [ ] Smoke Test B pass
