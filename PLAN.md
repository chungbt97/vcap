# 🚀 Kế hoạch Phát triển: QA/Tester Debug Assistant (Chrome Extension MVP)

## 1. Tổng quan Sản phẩm (Product Overview)

Công cụ hỗ trợ QA/Tester ghi hình lỗi (tối đa 5 phút), tự động tracking các bước thao tác (DOM Events) và bắt lỗi API/Console ngầm. Kết quả xuất ra là một tệp `.zip` hoàn chỉnh chứa Video, file Markdown theo chuẩn format Jira, và các file text chứa lệnh cURL (đã được sanitize data bảo mật) để Dev import thẳng vào Postman.

- **Tính chất:** 100% Local Processing (Không lưu trữ qua server để đảm bảo an toàn thông tin và dễ pass Policy Chrome Store).
- **Tech Stack:** ReactJS, Vite, Tailwind CSS, Chrome Extension API (Manifest V3).
- **Thư viện hỗ trợ:** `jszip` (nén file), `floating-ui` / `framer-motion` (UI component).

## 2. Kiến trúc Hệ thống (Manifest V3 Architecture)

- **Background (Service Worker):** Quản lý trạng thái chung, điều phối API `chrome.debugger`, xử lý logic tải file.
- **Content Script:** Bắt sự kiện DOM (Click, Input), inject UI nổi (Floating Note) sử dụng Shadow DOM để tránh xung đột CSS.
- **Offscreen Document:** Một trang HTML ẩn dùng duy nhất để chạy `MediaRecorder` (Bắt buộc trong MV3 vì Service Worker không có quyền truy cập DOM/BOM).
- **Preview Tab:** Giao diện Dashboard nội bộ (e.g., `preview.html`) mở ra khi dừng quay để Tester review và chọn lọc dữ liệu.

---

## 3. Lộ trình Triển khai 7 Ngày (Action Plan)

### 🗓️ Ngày 1: Khởi tạo Kiến trúc & Offscreen Document

**Mục tiêu:** Dựng thành công bộ khung project chạy được luồng giao tiếp cơ bản.

- **Task 1:** Khởi tạo project React + Vite. Cấu hình Manifest V3 với các quyền: `activeTab`, `storage`, `downloads`, `debugger`, `offscreen`.
- **Task 2:** Setup `background.js` (Service Worker). Viết logic xử lý click vào icon extension để toggle trạng thái (Start/Stop).
- **Task 3:** Setup `offscreen.html` và `offscreen.js`. Viết luồng giao tiếp (Message Passing) giữa Background và Offscreen để kích hoạt quyền xin record màn hình/tab.

### 🗓️ Ngày 2: Floating UI & Hệ thống Annotation Note

**Mục tiêu:** Xây dựng nút chức năng kiểu Grammarly và bắt sự kiện người dùng.

- **Task 1:** Inject Content Script vào trang web hiện tại. Lắng nghe các event cơ bản: `click`, `input`, `navigation`. Lưu dữ liệu tạm vào mảng kèm timestamp (relative time).
- **Task 2:** Xây dựng UI component nổi (Floating Button) trên màn hình dùng Tailwind. **Bắt buộc bọc bằng Shadow DOM** để cách ly style.
- **Task 3:** Cài đặt phím tắt (Keyboard Shortcut) hoặc click vào Floating Button để hiện ô Textarea. Khi QA nhập note, ghi nhận nội dung + timestamp đồng bộ với video.

### 🗓️ Ngày 3: Core - Network Observer & Data Sanitization

**Mục tiêu:** Bắt API lỗi một cách im lặng (Observer) và làm sạch dữ liệu.

- **Task 1:** Khi Start Record, Background script gọi API `chrome.debugger.attach()` vào tab hiện hành. Kích hoạt `Network.enable`.
- **Task 2:** Lắng nghe sự kiện request/response qua CDP (Chrome DevTools Protocol). Map requestId để khớp Payload gửi đi với Status Code trả về. Nếu HTTP Status >= 400, tự động lấy Response Body.
- **Task 3:** Viết hàm `sanitizeData()`. Xóa bỏ các thông tin nhạy cảm ở Headers (`Authorization`, `Cookie`) và Body (ẩn value của `password`, `token`).
- **Task 4:** Viết hàm parser chuyển đổi Object API lỗi thành chuỗi lệnh `cURL` an toàn.

### 🗓️ Ngày 4: Engine Ghi hình & Auto-stop 5 Phút

**Mục tiêu:** Ghi video mượt mà và giới hạn tài nguyên RAM.

- **Task 1:** Kích hoạt `MediaRecorder` bên trong Offscreen Document. Lấy stream bằng `chrome.tabCapture` hoặc `mediaDevices.getDisplayMedia`.
- **Task 2:** Code logic đồng bộ thời gian (T0). Đẩy dữ liệu video chunks (Blob) vào `IndexedDB` liên tục để tránh tràn bộ nhớ nếu người dùng thao tác nặng.
- **Task 3:** Code logic Timeout. Đặt timer chính xác 300,000ms (5 phút). Tạo một UI Countdown nhỏ (VD: `04:59`) bám góc màn hình. Hết 5 phút tự động trigger luồng Stop Recording.

### 🗓️ Ngày 5: Preview & Selection Dashboard

**Mục tiêu:** Xây dựng màn hình review cho Tester.

- **Task 1:** Luồng Stop: Gỡ `chrome.debugger`, dừng `MediaRecorder`, gom toàn bộ mảng dữ liệu (Steps, Notes, Logs, cURL) lại và mở tab mới `preview.html`.
- **Task 2:** Render Panel bên trái: Generate chuỗi Markdown chứa cấu trúc (Thời gian - Bước thao tác - Note) và log Console (nếu có).
- **Task 3:** Render Panel bên phải: Hiển thị danh sách các API lỗi dạng Checklist (Checkbox). Tester click vào để xem trước mã lỗi, response, và quyết định tick chọn API nào sẽ đi kèm vào file Export.

### 🗓️ Ngày 6: Đóng gói JSZip & Export Pipeline

**Mục tiêu:** Hoàn thiện quá trình trích xuất file chỉ với 1 click.

- **Task 1:** Tích hợp `jszip`. Xử lý luồng bất đồng bộ để lôi Video Blob từ `IndexedDB` lên.
- **Task 2:** Build cấu trúc thư mục ảo:
    - `/bug-record.webm` (File video)
    - `/jira-ticket.md` (File text Markdown)
    - `/postman-curl/` (Folder chứa các file `[Time]_[API-Name].txt` dựa trên checkbox Tester đã chọn).
- **Task 3:** Nén thành file `.zip` và gọi API `chrome.downloads` để tải về máy local.

### 🗓️ Ngày 7: Testing, Clean Code & Prepare Publish

**Mục tiêu:** Đảm bảo độ mượt và chuẩn bị thủ tục pháp lý Store.

- **Task 1:** Dogfooding (Test nội bộ). Cầm tool đi record thử trên các trang có luồng đăng nhập, các dashboard gọi nhiều API phức tạp để đảm bảo UI không vỡ, logic không crash.
- **Task 2:** Kiểm tra copy/paste Markdown trực tiếp vào Jira để xem bảng có render chuẩn không. Test import file text cURL vào Postman.
- **Task 3:** Clean logs. Chuẩn bị ảnh mô tả extension.
- **Task 4:** Viết trang **Privacy Policy** ngắn gọn (Host tạm trên Notion Public hoặc Github Pages) nhấn mạnh: *"Extension sử dụng chrome.debugger để bắt lỗi cục bộ, không ghi đè script, tự động sanitize data nhạy cảm và 100% xử lý tại máy tính người dùng (Local-first)"*. Đóng gói `.zip` để đẩy lên Chrome Web Store.