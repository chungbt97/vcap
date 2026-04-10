# Đánh giá mức độ sẵn sàng phát hành — VCAP

Ngày: 2026-04-10

Các nguồn đã được rà soát:
- `README.md`
- `PLAN.md`
- `FEATURE.md`
- `design/`
- `manifest.json`
- `src/background/*`
- `src/content/*`
- `src/offscreen/*`
- `src/preview/*`
- `src/utils/*`
- output sau build trong `dist/`

Các bước kiểm chứng dùng cho bản đánh giá này:
- `npm test` -> 38/38 test pass
- `npm run build` -> pass

Lưu ý quan trọng:
- các test đang pass chỉ bao phủ `src/utils/*`
- hiện chưa có integration test cho luồng MV3 thật giữa Background <-> Content <-> Offscreen <-> Preview

---

## 1. Tóm tắt điều hành

UI và độ polish về mặt hình ảnh hiện đang đi trước độ đúng của runtime.

Dự án **chưa sẵn sàng để release**. Vấn đề chính không nằm ở design. Vấn đề chính là các phần runtime theo kiến trúc Manifest V3 mới chỉ được nối với nhau một phần, nên luồng end-to-end thực tế đang bị đứt ở nhiều ranh giới:

`bắt đầu record -> capture sự kiện -> dừng -> preview -> export`

Phần mạnh nhất của codebase hiện tại là lớp utility dùng chung:
- markdown builder
- sanitize helpers
- curl builder
- zip exporter
- các helper xử lý IndexedDB chunk

Phần yếu nhất là contract giữa các runtime:
- Background gửi một bộ tên message
- Content lại lắng nghe một bộ tên khác
- Offscreen phát ra các lifecycle message mà Background không xử lý
- export về mặt utility khá đầy đủ nhưng vẫn bị chặn bởi lỗi ở upstream recording

---

## 2. Sai lệch product contract cần xử lý trước tiên

Trước khi bắt đầu release work, bạn cần chốt một nguồn sự thật duy nhất cho hành vi MVP.

Hiện tại đang có độ lệch giữa các tài liệu:

| Nguồn | Kỳ vọng hiện tại |
|---|---|
| `FEATURE.md` | start/stop record, lưu audio + log, sau khi stop có 4 tab chính, export `json` hoặc `md`, Note hiện chỉ cần UI |
| `README.md` | quay video màn hình, DOM steps, API errors, export `.zip` chứa video + Jira markdown + cURL files |
| `PLAN.md` | pipeline MV3 với offscreen recording, preview tab, JSZip export, cấu trúc `postman-curl/` |

Vì sao điều này quan trọng:
- Nếu `FEATURE.md` là release contract, thì hiện đang thiếu **audio capture** và **json export**.
- Nếu `README.md` / `PLAN.md` là release contract, thì hướng utility/export hiện tại là gần hơn, nhưng **luồng recording và capture vẫn chưa chạy end-to-end**.

**Khuyến nghị:** dùng `FEATURE.md` làm release contract vì bạn đã chỉ rõ đó là expectation hiện tại, sau đó mới cập nhật `README.md` / `PLAN.md` cho khớp với MVP đã chọn.

---

## 3. Kết luận cho các key feature

| Tính năng | Kết luận | Lý do |
|---|---|---|
| **Record** | **Chưa hoạt động** | Path tạo Offscreen đang sai, recording lifecycle chưa khép kín, và media capture hiện tại chưa khớp với expectation mới nhất. |
| **Capture event** | **Chưa hoạt động** | Background và Content không dùng cùng một message contract, và Content không hề forward captured events vào shared session state. |
| **Export** | **Mới hoạt động một phần** | Các utility export khá tốt và có test, nhưng dữ liệu thật từ user chưa đi tới export pipeline một cách ổn định, và output format vẫn lệch so với expectation đã mô tả. |

### Kết luận ngắn theo câu hỏi release

| Câu hỏi | Trả lời |
|---|---|
| Tester có thể bắt đầu một recording session thật một cách ổn định ở thời điểm hiện tại không? | **Không** |
| Extension có thể capture DOM actions và đưa vào preview cuối cùng một cách ổn định không? | **Không** |
| Extension có thể export ra một artifact có ý nghĩa từ một phiên chạy thật không? | **Chưa ổn định** |
| UI hiện tại có đủ sẵn sàng để tiếp tục sau khi fix logic không? | **Phần lớn là có** |

---

## 4. Những gì đã hoạt động

Những phần dưới đây là tiến triển thật, không phải placeholder:

1. **Preview app đã tồn tại và dùng được như một UI shell**
   - `src/preview/App.jsx`
   - `src/preview/main.jsx`
   - các tab `All`, `DOM`, `API Errors`, `Console`, `Export` đã có sẵn

2. **Background state persistence đã có**
   - `src/background/index.js:19-34`
   - dùng `chrome.storage.session` để sống sót qua việc service worker bị restart

3. **Ý định capture API error đã được implement**
   - `src/background/index.js:134-175`
   - attach debugger, enable `Network`, và lưu các request bị fail

4. **Logic offscreen recording đã tồn tại**
   - `src/offscreen/index.js:33-80`
   - đã có `MediaRecorder` + chunking + auto-stop timer

5. **Các utility export/security dùng chung là phần khỏe nhất của codebase**
   - `src/utils/sanitize.js`
   - `src/utils/curlBuilder.js`
   - `src/utils/markdownBuilder.js`
   - `src/utils/zipExporter.js`
   - `src/utils/idb.js`

6. **Project build sạch**
   - `npm run build` pass

7. **Các test cho utility đang pass**
   - 38 test pass cho sanitize / markdown / curl / zip export helpers

---

## 5. Audit chi tiết theo từng component MV3

### 5.1 Background Service Worker — `src/background/index.js`

### Những điểm tốt

- Giữ một recording state trung tâm trong `chrome.storage.session` (`src/background/index.js:19-34`)
- Xử lý click vào toolbar icon để start/stop (`src/background/index.js:38-57`)
- Attach `chrome.debugger` và enable network capture (`src/background/index.js:65-76`)
- Persist preview session vào `vcapSession` trước khi mở preview (`src/background/index.js:117-128`)

### Những điểm hỏng hoặc rủi ro

1. **Sai path của offscreen document**
   - Background tạo offscreen bằng `chrome.runtime.getURL('offscreen/offscreen.html')` (`src/background/index.js:222-229`)
   - Nhưng output sau build lại tạo ra `dist/src/offscreen/offscreen.html`, không phải `dist/offscreen/offscreen.html`
   - Đây là blocker runtime trực tiếp đối với recording

2. **Lệch message contract với Content Script**
   - Background gửi `RECORDING_STARTED` (`src/background/index.js:83`)
   - Content lại lắng nghe `START_RECORDING` (`src/content/index.js:5`)
   - Background gửi `RECORDING_STOPPED` (`src/background/index.js:109`)
   - Content lại lắng nghe `STOP_RECORDING` (`src/content/index.js:10`)
   - Kết quả: logic collect ở content không start/stop theo recording lifecycle thật

3. **Background chờ streamed events nhưng Content không bao giờ gửi**
   - Background xử lý `DOM_EVENT` (`src/background/index.js:210-212`)
   - Background xử lý `CONSOLE_ERROR` (`src/background/index.js:216-218`)
   - Nhưng **không có `chrome.runtime.sendMessage(...)` nào trong `src/content/*`**
   - Kết quả: `state.steps` và `state.consoleErrors` sẽ rỗng trong phần lớn trường hợp sử dụng thật

4. **Các lifecycle message từ Offscreen bị bỏ qua**
   - Offscreen gửi `CAPTURE_ERROR`, `CAPTURE_DONE`, và `CAPTURE_FAILED` (`src/offscreen/index.js:51`, `:59`, `:68`)
   - Message handler của Background chỉ hiểu `NEW_RECORDING`, `DOM_EVENT`, `NOTE_ADDED`, `CONSOLE_ERROR` (`src/background/index.js:184-219`)
   - Kết quả: các tín hiệu báo lỗi hoặc báo hoàn tất capture gần như bị drop

5. **Network data đang được lưu ở trạng thái chưa sanitize**
   - Background đang lưu raw `requestHeaders`, `requestBody`, và `responseBody` vào `apiErrors` (`src/background/index.js:138-170`)
   - Trong khi rule bảo mật yêu cầu sanitize trước khi lưu, hiển thị, hoặc export
   - Logic sanitize hiện mới chỉ được áp dụng muộn hơn ở `src/utils/curlBuilder.js:19-20`
   - Đây vừa là vấn đề bảo mật, vừa là rủi ro cho Chrome Web Store policy

### Kết luận

**Có nền tảng một phần, nhưng orchestration runtime đang hỏng**

---

### 5.2 Content Script — `src/content/*`

### Những điểm tốt

- Badge dùng Shadow DOM đã có qua `src/content/floatingUI.js`
- Cấu trúc event collector tương đối đơn giản và dễ đọc
- Hàm start/stop collecting được tách riêng trong `src/content/eventCollector.js`

### Những điểm hỏng hoặc chưa hoàn chỉnh

1. **Không bao giờ nhận được đúng start/stop message**
   - đang lắng nghe `START_RECORDING` / `STOP_RECORDING` (`src/content/index.js:5-16`)
   - nhưng Background lại gửi `RECORDING_STARTED` / `RECORDING_STOPPED`

2. **Event chỉ được giữ cục bộ**
   - `getStepsAndClear()` trả về các mảng cục bộ (`src/content/eventCollector.js:45-51`)
   - nhưng Background không bao giờ lấy kết quả này vì đang gửi sai stop message và cũng không consume một response tương ứng

3. **Không forward event lên Background**
   - không có lời gọi `chrome.runtime.sendMessage(...)` nào trong `src/content/*`
   - nên shared session state ở Background không nhận được dữ liệu DOM theo thời gian thực

4. **Độ bao phủ event thấp hơn expectation**
   - hiện chỉ lắng nghe `click`, `change`, `submit` (`src/content/eventCollector.js:23-25`)
   - expectation có nhắc tới click, scroll, input, navigation
   - `scroll`, `input`, và navigation tracking hiện chưa tồn tại

5. **Console capture hiện tại không phải page console capture đúng nghĩa**
   - code đang override `console.error` bên trong môi trường Content Script (`src/content/eventCollector.js:27-31`)
   - điều này không tương đương với việc bắt page errors của app đang test một cách đáng tin cậy
   - ở trạng thái hiện tại, nó gần với việc "bắt lỗi phát ra trong runtime của extension content" hơn là quan sát console thật của page

6. **Chưa có Note implementation**
   - điều này có thể chấp nhận được nếu `FEATURE.md` giữ Note ở trạng thái UI-only cho đợt release này
   - nhưng hiện chưa có note event flow thật

### Kết luận

**Chưa dùng được cho production**

---

### 5.3 Offscreen Document — `src/offscreen/*`

### Những điểm tốt

- `MediaRecorder` đã được implement (`src/offscreen/index.js:43-61`)
- video chunks được ghi vào IndexedDB qua `appendChunk()` (`src/offscreen/index.js:45-55`)
- auto-stop timer đã có (`src/offscreen/index.js:63`)
- có cân nhắc cleanup chunk và quota handling

### Những điểm hỏng hoặc lệch spec

1. **Rất có thể không được tạo thành công trong luồng thật**
   - vì Background đang trỏ sai path offscreen

2. **Capture hiện tại chưa khớp expectation mới nhất**
   - đang dùng `navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })` (`src/offscreen/index.js:41`)
   - trong `FEATURE.md`, start được mô tả là capture cả màn hình lẫn audio
   - implementation hiện tại đang tắt audio một cách rõ ràng

3. **Không dùng `tabId` để capture theo tab cụ thể**
   - Background có truyền `tabId` trong `START_CAPTURE` (`src/background/index.js:79`)
   - nhưng Offscreen bỏ qua giá trị này và chỉ mở display picker chung
   - điều này yếu hơn một luồng "capture đúng current tab" có kiểm soát

4. **Không có countdown UI**
   - timer đã có, nhưng chưa có overlay đếm ngược hiển thị ra ngoài
   - bản thân việc này chưa phải blocker, nhưng vẫn là phần thiếu so với roadmap

5. **Có phát tín hiệu lỗi/hoàn tất nhưng không ai consume**
   - `CAPTURE_ERROR`, `CAPTURE_DONE`, `CAPTURE_FAILED` đang được gửi đi
   - Background hiện không xử lý các message này

### Kết luận

**Mới implement được một phần, nhưng đang bị chặn bởi orchestration**

---

### 5.4 Preview Tab — `src/preview/*`

### Những điểm tốt

- Đây là phần trưởng thành nhất của sản phẩm hiện tại
- React UI shell khá sạch
- render được các view DOM/API/Console/Export
- nút export đã được nối
- có state chọn API error để export
- có thể load session data từ `chrome.storage.session` (`src/preview/main.jsx:32-34`)
- có mock data path để phát triển UI local (`src/preview/main.jsx:12-30`)

### Những điểm chưa hoàn chỉnh hoặc đang lệch

1. **Preview phụ thuộc vào upstream data nhưng upstream data thường không tới nơi**
   - nếu recording flow fail, preview vẫn mở nhưng session data sẽ rỗng hoặc thiếu

2. **Không có Note tab riêng**
   - các tab hiện tại là `All`, `DOM`, `API Errors`, `Console`, `Export` (`src/preview/App.jsx:6`)
   - `FEATURE.md` có nói Note có thể chưa implement, nhưng vẫn đang giữ một khái niệm Note

3. **Start Record từ preview có thể nhắm nhầm tab**
   - preview button gửi `NEW_RECORDING` (`src/preview/App.jsx:32-37`)
   - sau đó Background query active tab trong current window (`src/background/index.js:197-200`)
   - tùy timing, active tab lúc đó vẫn có thể là chính preview thay vì app đang được test

4. **Trải nghiệm export nhìn tốt nhưng chưa đáng tin cậy ở end-to-end**
   - vì dữ liệu recording và capture ở upstream chưa ổn định

### Kết luận

**UI shell tốt, nhưng data pipeline thật còn yếu**

---

### 5.5 Shared utilities — `src/utils/*`

### Những điểm tốt

- `sanitize.js` tốt và đã có test
- `curlBuilder.js` tốt và đã có test
- `markdownBuilder.js` tốt và đã có test
- `zipExporter.js` tốt ở vai trò utility và đã có test
- `idb.js` là một helper chunk persistence hợp lý

### Những điểm vẫn lệch spec

1. **Tên file export và cấu trúc output chưa khớp docs**
   - exporter hiện tại đang ghi:
     - `recording.webm`
     - `report.md`
     - `api-errors/error-1.sh`
   - xem `src/utils/zipExporter.js:27-33`
   - trong khi docs kỳ vọng:
     - `bug-record.webm`
     - `jira-ticket.md`
     - `postman-curl/[Time]_[API-Name].txt`
   - xem `README.md:75-77` và `PLAN.md:69-71`

2. **Chưa có json export path**
   - `FEATURE.md` nói rõ export có thể là `json` hoặc `md`
   - implementation hiện tại mới chỉ hỗ trợ markdown trong zip

3. **Sanitization xảy ra quá muộn**
   - an toàn đối với bước generate cURL
   - nhưng không an toàn đối với các bản sao network data đang được giữ trong memory/session state

### Kết luận

**Đây là phần khỏe nhất của codebase, nhưng vẫn chưa khớp hoàn toàn với product expectation**

---

## 6. Các root cause xuyên component

Đây là các nguyên nhân gốc giải thích cho phần lớn lỗi hiện tại:

1. **Message contract đã bị đổi ở một runtime nhưng không đổi đồng bộ ở các runtime còn lại**
   - điều này làm hỏng start/stop và event handoff

2. **Utilities được implement nhanh hơn orchestration**
   - preview/export nhìn hoàn chỉnh hơn pipeline capture thật

3. **Product contract đã bị drift**
   - `FEATURE.md` và `README.md` / `PLAN.md` không còn mô tả cùng một MVP

4. **Security rules mới chỉ được áp ở thời điểm export**
   - chưa được áp từ lúc capture/storage

5. **Codebase có unit coverage cho helper thuần khá tốt nhưng gần như không có runtime coverage**
   - vì vậy build/test vẫn pass trong khi core user flow đang fail

---

## 7. Các blocker cần gỡ trước khi release

Các hạng mục dưới đây cần được xử lý trước khi release:

| Mức ưu tiên | Blocker | Vì sao nó chặn release |
|---|---|---|
| P0 | Giải quyết độ lệch nguồn sự thật giữa `FEATURE.md` và `README.md` / `PLAN.md` | nếu không, bạn sẽ không thể định nghĩa "done" là gì |
| P0 | Sửa lệch message giữa Background <-> Content | DOM capture không thể hoạt động nếu chưa sửa điểm này |
| P0 | Sửa path offscreen document | recording rất có thể không start đúng nếu chưa sửa |
| P0 | Xử lý các offscreen lifecycle/failure message | record flow hiện không quan sát được và không recover được |
| P0 | Sanitize network data trước khi lưu/hiển thị/export | rủi ro về bảo mật và store policy |
| P1 | Mở rộng event capture để bao phủ đúng expectation | event log hiện quá thiếu |
| P1 | Chọn và implement chiến lược capture console error đúng nghĩa | cách hiện tại chưa đáng tin |
| P1 | Căn lại export format theo MVP contract đã chọn | output hiện vẫn lệch docs |
| P1 | Thêm local smoke test checklist cho mọi release candidate | hiện chưa có release gate đáng tin cậy |

---

## 8. Hướng dẫn test local trước khi đưa lên Chrome Store

Đây là cách đơn giản nhất để bạn test extension local trước khi publish.

### 8.1 Build và load extension dạng unpacked

Chạy ở project root:

```bash
npm install
npm run build
```

Sau đó trong Chrome:

1. Mở `chrome://extensions`
2. Bật **Developer mode**
3. Bấm **Load unpacked**
4. Chọn folder `dist/` của project
5. Pin extension để dễ click khi test

Sau mỗi lần sửa code:

1. chạy `npm run build`
2. quay lại `chrome://extensions`
3. bấm **Reload** trên card của extension VCAP

### 8.2 Cần inspect những gì khi test

1. **Log của service worker**
   - mở `chrome://extensions`
   - trên card VCAP, bấm link inspect của **Service worker**
   - đây là nơi bạn nên theo dõi các lỗi liên quan tới start/stop/debugger/offscreen

2. **Preview tab**
   - sau khi stop recording, preview nên tự mở
   - inspect nó như một tab bình thường nếu export hoặc rendering có vấn đề

3. **DevTools của target page**
   - dùng nó để xác nhận DOM actions có thực sự được capture không
   - nếu DOM steps cứ rỗng, nguyên nhân thường nằm ở wiring giữa Content <-> Background

### 8.3 Bộ local smoke test khuyến nghị

#### Smoke test A — Recording có start được không?

1. Load extension dạng unpacked
2. Mở một website bình thường hoặc app local/staging của bạn
3. Click icon action của extension
4. Hành vi khỏe mạnh kỳ vọng:
   - record flow bắt đầu
   - badge/UI xuất hiện
   - screen/tab picker xuất hiện nếu capture strategy yêu cầu

**Kết quả nhiều khả năng hiện tại:** bước này có thể fail vì Background đang trỏ sai offscreen path (`src/background/index.js:226`).

#### Smoke test B — DOM events có được capture không?

1. Bắt đầu recording
2. Click button
3. Gõ vào input
4. Scroll
5. Stop recording
6. Preview phải hiển thị được DOM items

**Kết quả nhiều khả năng hiện tại:** danh sách DOM sẽ rỗng vì:
- Background gửi `RECORDING_STARTED` / `RECORDING_STOPPED`
- Content lắng nghe `START_RECORDING` / `STOP_RECORDING`
- Content không bao giờ gửi `DOM_EVENT` ngược về

#### Smoke test C — API errors có được capture không?

1. Trong lúc recording, chủ động tạo ra một request fail (`4xx` hoặc `5xx`)
2. Stop recording
3. Mở tab `API Errors` trong preview để kiểm tra

**Kết quả nhiều khả năng hiện tại:** phần này có thể hoạt động được một phần nếu debugger attach thành công, nhưng security handling vẫn chưa hoàn chỉnh và session vẫn có thể rỗng nếu recording flow fail từ sớm.

#### Smoke test D — Export có tạo ra artifact dùng được không?

1. Từ preview, bấm **Export ZIP**
2. Mở file vừa được tải xuống
3. Kiểm tra xem nó có chứa:
   - media recording thật
   - markdown summary
   - các file export cho API error

**Kết quả nhiều khả năng hiện tại:** utility code hoạt động, nhưng export thường bị chặn vì thiếu recorded data thật. Ngay cả khi export được, filename/cấu trúc output cũng vẫn chưa khớp với expectation trong docs.

### 8.4 Mẹo debug local thực tế

Nếu bạn muốn có vòng lặp feedback nhanh khi fix logic:

1. luôn mở sẵn `chrome://extensions` và Service Worker inspector
2. test với một page đơn giản trước
3. dùng một API endpoint fail có chủ đích để bạn biết trạng thái thành công trông như thế nào
4. verify từng flow một:
   - start/stop
   - DOM capture
   - API capture
   - preview handoff
   - export

Đừng cố validate tất cả feature cùng lúc. Trong MV3, lỗi thường xuất hiện ở ranh giới giữa các runtime.

---

## 9. Kế hoạch release chi tiết

Đây là con đường ngắn nhất nhưng thực tế nhất để đưa MVP tới trạng thái có thể release.

### Phase 0 — Chốt MVP contract

Mục tiêu: quyết định rõ "release-ready" nghĩa là gì.

Những gì cần quyết định:
- artifact cuối cùng của bản release là **audio + logs**, hay **video + markdown + cURL zip**, hay cả hai?
- `json` export có phải yêu cầu bắt buộc của MVP không, hay MVP có thể chỉ là markdown/zip?
- Note có được chính thức giữ ở trạng thái UI-only cho release này không?
- screen capture là kiểu generic, hay bắt buộc phải capture đúng current tab?

Điều kiện hoàn tất:
- `FEATURE.md` trở thành nguồn sự thật
- `README.md` / `PLAN.md` được cập nhật sau để khớp với nguồn sự thật đó

### Phase 1 — Sửa recording lifecycle

Mục tiêu: làm cho một session thật có thể start và stop thành công.

Các việc cần làm:
- sửa offscreen path mismatch
- chuẩn hóa tên start/stop message giữa Background, Content, và Offscreen
- xử lý `CAPTURE_DONE`, `CAPTURE_FAILED`, `CAPTURE_ERROR`
- xác nhận preview chỉ mở sau khi một session hợp lệ đã được persist

Điều kiện hoàn tất:
- tester có thể start và stop một session local mà không bị fail âm thầm

### Phase 2 — Sửa event capture và session wiring

Mục tiêu: làm cho user activity thật xuất hiện trong preview.

Các việc cần làm:
- chọn một event transport model:
  - stream từng event lên Background ngay lập tức, hoặc
  - chỉ lấy một payload cuối cùng ở lúc stop
- nối Content để thật sự gửi DOM/console/note payloads
- hỗ trợ đúng danh sách event mà `FEATURE.md` kỳ vọng
- làm cho timestamp nhất quán giữa steps, API errors, và console data

Điều kiện hoàn tất:
- preview hiển thị được DOM actions thật từ một session thật

### Phase 3 — Sửa security và data handling

Mục tiêu: làm cho dữ liệu captured đủ an toàn để release.

Các việc cần làm:
- sanitize network data trước khi lưu vào session state
- redact request/response data trước khi render preview
- giữ cho cURL export luôn sanitized
- rà soát xem còn raw sensitive payload nào đang bị giữ trong storage không

Điều kiện hoàn tất:
- không còn raw auth/session/token/password data nào bị persist hoặc export

### Phase 4 — Căn chỉnh export theo MVP đã chọn

Mục tiêu: export ra thứ mà người dùng thật sự có thể tin cậy.

Các việc cần làm:
- căn tên file/cấu trúc folder theo contract đã chốt
- quyết định export cần `json`, `md`, hay `.zip`
- đảm bảo artifact tải xuống dùng dữ liệu session thật, không phụ thuộc giả định mock
- verify export vẫn chạy khi không chọn API errors nào

Điều kiện hoàn tất:
- output export khớp hoàn toàn với release contract đã chốt

### Phase 5 — Thêm release gate

Mục tiêu: ngăn tình trạng "UI nhìn xong rồi nhưng runtime vẫn hỏng" lặp lại.

Các việc cần làm:
- định nghĩa một manual smoke test checklist
- nếu khả thi, thêm ít nhất một lớp integration coverage tối thiểu cho core flow
- trước mỗi release candidate phải verify: build + một real session + một real export
- chuẩn bị privacy policy wording cho quyền `chrome.debugger`

Điều kiện hoàn tất:
- bạn có một checklist "pre-store local" có thể lặp lại được

---

## 10. Đánh giá cuối cùng về khả năng release

### Trạng thái hiện tại

**Chưa nên release.**

### Vì sao

Extension hiện tạo cảm giác gần release hơn thực tế vì preview UI và utility layer khá mạnh. Nhưng luồng runtime MV3 thật vẫn đang hỏng ở các khu vực cốt lõi:
- đường start recording
- event capture handoff
- offscreen lifecycle handling
- thời điểm áp dụng security cho captured network data
- độ khớp của export contract

### Tóm tắt trung thực nhất trong một câu

**Dự án hiện đã có UI shell mạnh và utility foundation tốt, nhưng runtime thực của extension vẫn chưa được nối đủ chặt để có thể ship.**
