# Hướng dẫn sử dụng

Tài liệu này hướng dẫn cách cài đặt (import) extension VCAP vào trình duyệt và cách sử dụng cho các quy trình kiểm thử (QA).

## 1. Cài đặt (Import vào Chrome)

Vì VCAP là phiên bản phát triển, bạn cần tải nó dưới dạng extension "unpacked":

1.  **Chuẩn bị bản build**:
    ```bash
    npm install
    npm run build
    ```
2.  **Mở trình quản lý Extension**: Trên trình duyệt Chrome, truy cập vào `chrome://extensions`.
3.  **Bật Chế độ nhà phát triển (Developer Mode)**: Gạt công tắc ở góc trên bên phải trang web.
4.  **Tải Extension đã giải nén**: Nhấp vào nút **Load unpacked** (Tải tiện ích đã giải nén).
5.  **Chọn Thư mục**: Tìm đến thư mục dự án VCAP và chọn thư mục `dist`.
6.  **Xác nhận**: Bạn sẽ thấy thẻ extension VCAP xuất hiện trong danh sách. Hãy ghim nó vào thanh công cụ để truy cập nhanh.

---

## 2. Cách sử dụng

Làm theo các bước sau để ghi lại và xuất báo cáo lỗi:

### Bước 1: Bắt đầu ghi
- Nhấp vào biểu tượng VCAP trên thanh công cụ trình duyệt.
- (Tùy chọn) Nhập **Ticket Name** hoặc ID để dễ dàng nhận diện báo cáo sau này.
- Nhấp vào nút **Start Recording**. Biểu tượng sẽ thay đổi để cho biết trạng thái đang ghi.

### Bước 2: Ghi lại bằng chứng
- Thực hiện các thao tác trên trang web mà bạn muốn ghi lại.
- VCAP sẽ tự động ghi lại:
    - Video tab đang hoạt động
    - Console logs (lỗi, cảnh báo)
    - Các yêu cầu mạng (Network requests/responses)
    - Các thay đổi DOM (dòng thời gian tương tác)
- Nếu bạn cần chụp lại một khoảnh khắc cụ thể, hãy nhấp vào biểu tượng **Screenshot** trong popup.

### Bước 3: Xem lại phiên làm việc
- Sau khi hoàn tất, nhấp vào **Stop Recording** trong popup.
- **Side Panel** sẽ tự động mở ra, hiển thị tóm tắt của phiên làm việc.
- Bạn có thể duyệt qua các tab **Timeline**, **Console**, và **Network** để kiểm tra dữ liệu đã ghi.

### Bước 4: Xuất báo cáo
- Chuyển đến tab **Network** trong side panel.
- Chọn bất kỳ yêu cầu API quan trọng nào bạn muốn đưa vào dưới dạng tệp cURL.
- Nhấp vào nút **Export ZIP**.
- Một tệp ZIP sẽ được tải xuống bao gồm video, báo cáo markdown cho JIRA/GitHub, ảnh chụp màn hình và các tệp cURL.
