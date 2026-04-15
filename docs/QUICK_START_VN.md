# VCAP Quick Start Cho Tester

Tài liệu này là bản rút gọn để tester dùng VCAP ngay trong vài phút. Nếu cần đầy đủ hơn, xem [Hướng dẫn sử dụng](./USAGE_VN.md).

## 1. Cài nhanh vào Chrome

Bạn có 2 trường hợp:

### Trường hợp A: Đã có sẵn thư mục `dist`

Bạn không cần chạy `npm install` hay `npm run build`.

1. Mở `chrome://extensions`
2. Bật **Developer mode**
3. Chọn **Load unpacked**
4. Chọn thư mục `dist`
5. Ghim icon VCAP lên toolbar

### Trường hợp B: Chưa có `dist` hoặc `dist` đã cũ

Khi đó mới cần build lại:

```bash
npm install
npm run build
```

Sau đó:

1. Mở `chrome://extensions`
2. Bật **Developer mode**
3. Chọn **Load unpacked**
4. Chọn thư mục `dist`
5. Nếu extension đã được nạp từ trước, bấm **Reload** để cập nhật bản build mới

## 2. Luồng dùng nhanh

1. Mở trang cần tái hiện lỗi.
2. Nhấn icon VCAP.
3. Điền **Ticket Info** nếu muốn đặt tên file export.
4. Giữ hoặc tắt tùy chọn **5s countdown before recording**.
5. Nhấn **Start Recording**.
6. Tái hiện lỗi trên trang.
7. Nếu cần, nhấn icon camera để chụp screenshot.
8. Nếu cần note nhanh, nhấp chuột phải trên trang rồi chọn **Vcap Flash Action** > **Add Note**.
9. Khi xong, mở lại popup và nhấn **Stop Recording**.
10. Nhấn **Open Full Panel** để review dữ liệu.
11. Chọn request hoặc console message cần giữ lại.
12. Nhấn **ZIP** trong side panel để tải báo cáo.

## 3. VCAP sẽ lấy gì

- Video tab đang ghi, tối đa 5 phút
- Event DOM
- Network request REST và GraphQL
- Console error và warning
- Screenshot thủ công
- Quick note do tester thêm

## 4. Cần nhớ

- Dữ liệu được xử lý cục bộ trên máy.
- Side panel không tự mở sau khi dừng ghi. Bạn phải bấm **Open Full Panel**.
- Nút **Export Markdown** trong popup hiện vẫn tải ZIP của phiên hiện tại.
- Có thể export lại nhiều lần. Dữ liệu chỉ bị xóa khi bắt đầu phiên ghi mới.

## 5. Khi gặp lỗi

### Không start được recording

Kiểm tra:

- Bạn không đứng trên trang kiểu `chrome://...`
- DevTools hoặc Lighthouse không đang chiếm debugger của tab
- Nếu vừa sửa source, hãy build lại và reload extension

### Không export được

Thường là do phiên chưa có video hoặc chưa có dữ liệu. Hãy ghi lại một phiên mới rồi export lại.

### Không thấy panel tự bật

Đó là hành vi đúng của bản hiện tại. Mở popup rồi bấm **Open Full Panel**.