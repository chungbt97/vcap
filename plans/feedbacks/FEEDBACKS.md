Sau khi thử sử dụng thì có 1 vài lỗi và 1 vài điểm cần phải enhance như sau

## Lỗi 1
Executing inline script violates the following Content Security Policy directive 'script-src 'self' 'wasm-unsafe-eval' 'inline-speculation-rules' http://localhost:* http://127.0.0.1:* chrome-extension://607529a2-7b62-4023-8811-5ab997768d78/'. Either the 'unsafe-inline' keyword, a hash ('sha256-N8dOl95Kv46szMPjWFSovisu8P+jPGaX4Yyd1EDp2JE='), or a nonce ('nonce-...') is required to enable inline execution. The action has been blocked.
Context
https://uat-admin.sdax.co/login
Stack Trace
src/content/index.js:15 (N)

Lỗi trên được tìm thấy trong chrome://extensions/?errors=mmlmndgpjenbohjcbjiokkobnacccdjn

## Lỗi 2
Không thể mở được extension 
chrome-extension://mmlmndgpjenbohjcbjiokkobnacccdjn/src/preview/index.html
Your file couldn’t be accessed
It may have been moved, edited, or deleted.
ERR_FILE_NOT_FOUND

## Lỗi 3
Không tracking được event click cũng như console.log. Mặc dù đã tracking đc networking error API

## Lỗi 4
Khi recording xong thì không thể record lại lần nữa. Click vào icon không có gì xảy ra

## Enhancement
Ở tab All thì liệt kê tất cả
DOM 
    - nên loại bỏ event scroll vì event này nếu cho vào sẽ có rất nhiều
    - DOM khi click vào element ví dụ như kiểu button hay link. Thì đừng liệt kê DOM kèm theo class mà hãy là tên tab và text bên trong.
API Errors 
    - nên đổi thành Network API vì đôi khi người dùng muốn nhìn thấy cả những API thành công nữa
    - Tại tab network này nên có thêm 1 filter để lọc theo status code (Success, Error) 1 ô input để lọc theo đầu API. Vì 1 website có thể call đến nhiều service thì người dùng có thể lọc để select dễ hơn

## Big change
1. GIAI ĐOẠN 1: POPUP TRẠNG THÁI CHỜ (INITIAL POPUP)
Mục tiêu: Khởi tạo phiên test nhanh và định danh ticket.

Giao diện & Thành phần:
Ticket Input (Mới): Một ô input[type="text"] nằm phía trên nút Start.

Placeholder: "Ticket ID / Session Name (e.g. BUG-123)".

Logic: Tên này sẽ được lưu vào chrome.storage.local để dùng làm tiền tố (prefix) cho tên file ZIP và file Markdown khi export.

Nút Start Recording: Nút chính màu xanh (Primary Blue).

Action: Khi Click, bắt đầu quay video qua Offscreen Document và bắt đầu tracking sự kiện và đóng popup (tham khảo ảnh extension_popup.png)

Nút Open Full Panel: Nút phụ nằm dưới cùng.

Action: Kích hoạt chrome.sidePanel.open().

Recent Sessions: Danh sách 3-5 phiên test gần nhất để QA xem nhanh lại kết quả cũ.

2. GIAI ĐOẠN 2: SIDE PANEL (LUỒNG LÀM VIỆC CHÍNH)
Mục tiêu: Hiển thị dữ liệu song song với website đang test mà không cần chuyển tab.

Cơ chế hiển thị:
Sử dụng API chrome.sidePanel (Manifest V3) thay vì mở Tab mới.

Panel sẽ bám dính ở cạnh phải trình duyệt, chiếm khoảng 25-30% chiều rộng màn hình.

Cấu trúc Tab (Đã đồng bộ giao diện):
Chính là giao diện chính bây giờ của chúng ta (current_ui.png)

3. CÁC ĐIỂM "CORRECT" & LOGIC CẦN LƯU Ý CHO TEAM DEV
Sự đồng bộ dữ liệu (Data Handshake):

Dữ liệu nhập từ Popup (Ticket Name) phải được background.js bắt và đồng bộ sang Side Panel ngay lập tức. User không được phép phải nhập lại tên ticket khi đã mở Panel.

Trạng thái thu nhỏ (Mini-Overlay):

Nếu user đang quay video mà đóng Popup, cần có một chỉ báo (indicator) nhỏ hoặc Badge ở icon extension để user biết hệ thống vẫn đang record.

Tính năng Side Panel:

Phải xử lý trường hợp user chuyển sang tab trình duyệt khác: Side Panel có nên tự động cập nhật theo Tab mới hay giữ nguyên phiên cũ? (Khuyến nghị: Giữ nguyên phiên cho đến khi user nhấn Stop).

Đặt tên file (Naming Convention):

Định dạng chuẩn: {Ticket_Name}_{Date}_{Time}.zip.

4. TECH-NOTES CHO DEV
API: chrome.sidePanel.setOptions({ path: 'panel.html', enabled: true }).

Storage: Dùng chrome.storage.onChanged để lắng nghe sự thay đổi của tên Ticket hoặc trạng thái Record giữa Popup và Side Panel.

UI: Sử dụng Shadow DOM cho phần Floating UI (nếu có) để không bị CSS của website trang chủ "ghi đè".




