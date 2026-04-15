# Hướng dẫn sử dụng VCAP

VCAP là extension Chrome phục vụ QA và debug lỗi. Extension ghi dữ liệu cục bộ trên máy, giúp bạn quay lại lỗi đang xảy ra, xem lại bằng chứng trong side panel và tải xuống một gói báo cáo để gửi cho dev hoặc PM.

Nếu bạn chỉ cần bản rút gọn cho tester, xem [Quick Start Cho Tester](./QUICK_START_VN.md).

## 1. VCAP ghi lại những gì

Trong một phiên ghi lỗi, VCAP có thể thu thập:

- Video của tab đang hoạt động
- Timeline thao tác DOM của người dùng
- Network request dùng cho debug API, bao gồm REST và GraphQL
- Console error và warning
- Screenshot chụp thủ công trong lúc đang thao tác
- Ghi chú nhanh do tester thêm ngay trên trang

Toàn bộ dữ liệu được xử lý cục bộ. Extension không có luồng upload backend mặc định.

## 2. Cài đặt extension vào Chrome

VCAP hiện được nạp dưới dạng unpacked extension trong môi trường dev/test.

Bạn có 2 trường hợp:

### Trường hợp A: Bạn đã có sẵn thư mục `dist`

Nếu `dist` đã được build sẵn và đúng phiên bản bạn muốn dùng, bạn không cần chạy `npm install` hay `npm run build`.

1. Mở Chrome và truy cập `chrome://extensions`.
2. Bật **Developer mode** ở góc trên bên phải.
3. Chọn **Load unpacked**.
4. Trỏ tới thư mục `dist` của dự án.
5. Ghim VCAP lên thanh công cụ để thao tác nhanh hơn.

### Trường hợp B: Bạn chưa có `dist` hoặc muốn tạo bản build mới

Lúc này mới cần cài dependency và build project:

```bash
npm install
npm run build
```

Sau đó:

1. Mở Chrome và truy cập `chrome://extensions`.
2. Bật **Developer mode** ở góc trên bên phải.
3. Chọn **Load unpacked**.
4. Trỏ tới thư mục `dist` của dự án.
5. Ghim VCAP lên thanh công cụ để thao tác nhanh hơn.

Nếu bạn vừa sửa source hoặc muốn cập nhật theo mã nguồn mới nhất, hãy build lại rồi nhấn **Reload** trên thẻ extension trong trang Extensions.

## 3. Luồng sử dụng chuẩn

### Bước 1: Mở popup và đặt tên phiên ghi

1. Mở trang web cần tái hiện lỗi.
2. Nhấn icon VCAP trên toolbar.
3. Nhập mã ticket hoặc tên phiên vào ô **Ticket Info** nếu cần.

Tên này sẽ được dùng để đặt tên file Markdown và file ZIP khi export.

### Bước 2: Bắt đầu ghi

1. Giữ hoặc bỏ chọn tùy chọn **5s countdown before recording** tùy nhu cầu.
2. Nhấn **Start Recording**.
3. Nếu countdown đang bật, popup sẽ đóng và VCAP bắt đầu ghi sau vài giây.

Trong lúc đang ghi, popup sẽ hiển thị:

- Trạng thái hiện tại của phiên ghi
- Tên tab đang được ghi
- Thời lượng đã ghi
- Số event đã thu thập
- Số screenshot đã chụp

### Bước 3: Tái hiện lỗi và thu thập bằng chứng

Khi bạn thao tác trên trang, VCAP sẽ tự động ghi lại event DOM, request mạng và console message liên quan.

Bạn có thể bổ sung bằng chứng thủ công theo hai cách:

- Nhấn biểu tượng camera trong popup để chụp screenshot
- Khi đang ghi, nhấp chuột phải trên trang để mở menu **Vcap Flash Action**

Menu chuột phải có hai hành động nhanh:

- **Add Note**: mở hộp thoại ghi chú nhanh để mô tả hiện tượng lỗi
- **Take a screenshot**: chụp màn hình ngay tại thời điểm hiện tại

### Bước 4: Dừng ghi

1. Mở lại popup.
2. Nhấn **Stop Recording**.

Sau khi dừng, phiên ghi được lưu lại trong bộ nhớ cục bộ của extension. Side panel không tự bật lên sau khi dừng, vì Chrome MV3 yêu cầu thao tác mở panel phải xuất phát từ user gesture.

### Bước 5: Mở side panel để xem lại dữ liệu

Trong popup, nhấn **Open Full Panel** để mở giao diện review đầy đủ.

Tại đây bạn sẽ thấy các tab chính:

- **All**: tổng hợp mọi loại dữ liệu
- **DOM**: timeline thao tác người dùng
- **Network**: request REST và GraphQL
- **Console**: error và warning
- **Export**: khu vực xem trước và tải báo cáo

## 4. Cách review dữ liệu trước khi export

### Network

Tab **Network** cho phép:

- Lọc theo `All`, `REST`, `GraphQL`, `Query`, `Mutation`, `Error`
- Tìm theo URL hoặc tên operation GraphQL
- Chọn hoặc bỏ chọn từng request
- Dùng **Select All** để chọn hàng loạt

Những request được chọn sẽ được đưa vào báo cáo Markdown và thư mục cURL khi export.

### Console

Tab **Console** cho phép:

- Lọc `All`, `Errors`, `Warnings`
- Tìm theo nội dung message
- Chọn hoặc bỏ chọn từng dòng log
- Dùng **Select All** để chọn hàng loạt

### Markdown Preview

VCAP có phần **Markdown Preview** để xem trước nội dung báo cáo. Nội dung này cập nhật theo thời gian thực khi bạn chọn hoặc bỏ chọn request và console message.

Bạn có thể sao chép trực tiếp phần Markdown nếu muốn dán nhanh vào Jira.

## 5. Export báo cáo

Bạn có thể export theo hai nơi:

- Từ popup qua nút **Export Markdown**
- Từ side panel qua nút **ZIP**

Cả hai cách đều tạo file ZIP của phiên ghi hiện tại, miễn là phiên đó có dữ liệu và có video đã được capture.

Gói ZIP thường bao gồm:

- File video `.webm`
- File Markdown đặt theo ticket name, ví dụ `ABC-123.md`
- Thư mục `screenshots/` nếu có ảnh chụp
- Thư mục `postman-curl/` cho các request đã chọn

Tên file ZIP có dạng:

- `{TicketName}_{YYYYMMDD}_{HHMMSS}.zip`
- Nếu không có ticket name: `vcap_{YYYYMMDD}_{HHMMSS}.zip`

## 6. Phiên gần nhất

Popup luôn hiển thị mục **Latest Session** để bạn mở lại phiên gần nhất trong side panel. Tính năng này hữu ích khi bạn vừa dừng ghi và muốn kiểm tra lại mà không cần bắt đầu phiên mới.

Lưu ý: dữ liệu video và screenshot chỉ bị xóa khi bạn bắt đầu một phiên ghi mới, không bị xóa ngay sau khi export. Điều đó cho phép bạn export lại cùng một phiên nhiều lần.

## 7. Lưu ý và giới hạn

- VCAP chỉ ghi tab đang được chọn để bắt đầu phiên.
- Nếu bạn chuyển sang tab khác trong lúc ghi, popup sẽ báo rằng phiên đang chạy ở tab khác.
- Một số trang đặc biệt của trình duyệt hoặc trang đang bị công cụ khác chiếm debugger có thể không ghi được đầy đủ.
- Nếu Chrome DevTools hoặc Lighthouse đang attach debugger vào tab đó, VCAP có thể không bắt đầu ghi network được.
- Dự án được thiết kế theo hướng local-first, phù hợp cho môi trường QA nội bộ và xử lý dữ liệu nhạy cảm.

## 8. Xử lý lỗi thường gặp

### Nhấn Start nhưng không ghi

Kiểm tra lại các điểm sau:

- Bạn đang đứng trên một tab web thông thường, không phải trang nội bộ kiểu `chrome://...`
- Không có DevTools, Lighthouse hoặc công cụ khác đang chiếm Chrome debugger
- Bạn đã build lại extension và reload bản unpacked mới nhất

### Export không thành công

Nguyên nhân thường gặp là phiên hiện tại chưa có video hoặc chưa có dữ liệu. Hãy thử:

1. Bắt đầu một phiên mới
2. Thao tác lại trên trang để tạo dữ liệu
3. Dừng ghi rồi export lại

### Không thấy side panel tự mở sau khi dừng ghi

Đây là hành vi đúng của bản hiện tại. Hãy mở popup và nhấn **Open Full Panel**.
