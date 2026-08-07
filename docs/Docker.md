Cấu hình Dockerfile để sử dụng node 24 và cài đặt các gói cần thiết cho dự án như: rspack...

Dockerfile chạy một CMD tail -f /dev/null để giữ container chạy trong khi phát triển.

Sử dụng multi-stage build để giảm kích thước của image cuối cùng.

Cấu hình docker-compose.yaml để dễ dàng quản lý các dịch vụ và môi trường phát triển.

Không dùng npm bên ngoài, tất cả các lệnh node đều chạy bên trong container.
