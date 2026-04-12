1. Hiện tại DOM có vẻ như bị reset mỗi khi chuyển tab. (Thường xuyên không tracking được gì)
    - Tôi đăng ký ở tab 1 sau đó được redirect sang tab 2 bằng SPA để điền thông tin => Sau khi thành công thì redirect về list thì không có thao tác gì cả

2. Khi tôi mở panel ra thì DOM tracking đúng hoàn toàn. Nhưng khi tôi ấn download thì lại nhận được dom tracking md của ticket trước. 
    - Steps: End record => Click ZIP => File tải về là jira-ticket.md (sai)
    - Expect: Dom khi click ZIP phải như trong DOM_PANEL

3. Console vì sẽ có nhiều error của các bên thứ 3 hoặc ở lib. Trong Console nên cũng có checkbox như là trong tab network để có thể select. 

4. Export thì đang export tất cả các API trong khi chỉ đc export những API được checked ở tab Network
5. Nếu export xong tôi click vào export 1 lần nữa thì không tải được. Tôi muốn trước khi người dùng start a new recording thì vẫn có thể tải lại latest record.
6. Các button không nên border quá nhiều. 
7. Follow theo INSPIRED_DESIGN.md để consistancy lại giao diện 
8. Tôi muốn dễ dàng thay đổi tên của App, desciption, Icon... nên tạo env hoặc rule gì đó để dễ thay đổi trong tương lai