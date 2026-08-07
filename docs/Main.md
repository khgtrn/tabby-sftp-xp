# Dự án thư viện plugin cho Tabby.sh với mục địch chính là Edit file trực tiếp như trên local.

## Mục tiêu
- Quản lý file local + remote SFTP
- Edit file như đang làm việc local
- Tích hợp hoàn toàn trong Tabby
- Không phụ thuộc ứng dụng ngoài
- Hỗ trợ plugin architecture của Tabby

## Công nghệ
- Angular 15.x
- Electron
- TypeScript 6.x
- Rspack
- NodeJS 24.x

## Quy tắc code
- Tuân thủ quy tắc code của Tabby
- Sử dụng cú pháp TypeScript 6.x, các cú pháp mới nếu có thể, không dùng cú pháp cũ
- Format đúng theo `.editorconfig` của dự án

## Mô tả
- Là thư viện có thể cài được vào Tabby, đảm bảo tuân thủ đúng yêu cầu với plugin của tabby
- Sử dụng angular cùng với tabby, hiện đang là v15
-  Dùng sức mạnh của TypeScript 6 + Node 24 + rspack để compile (biên dịch) mã nguồn, rồi đẩy phần chạy thực tế cho app Tabby lo.
- Có thêm 1 tab cấu hình cho plugin này trong  cài đặt: cấu hình màu, icon, ... sau này có tính năng khác thì bổ sung thêm sau
- Chèn thêm nút SFTP vào màn hình ssh (và thêm nút SFTP vào dialog thả xuống chọn profile để connect)
- Click vào nút thi mở một tab mới, gồm 2 vùng chính: local và remote, các thư mục khi mở Phía trên hiển thị đường dẫn, có thể edit trực tiếp đường dẫn và nhấn enter để go to đến thư mục. Có nút backward, forward, về thư mục cha, làm mới, về home, filter file và đường dẫn, nút bookmark
- Click nút bookmark hiện các đường dẫn đã lưu, có thể thêm, sửa, xoá ngay trên dialog đó
- Click phải vào vùng trống thì sẽ có: tạo thư mục, tạo file, refresh (làm mới tất cả thư mục cha đang hiển thị)
- Click vào thư mục: rename, delete (click vào delete sẽ hỏi xac nhận trước), new sub folder, new file bên trong, edit permission, properties, copy, cut, refresh (chỉ làm mới thư mục này, và thư mục con), copy path
- Click vào file: edit, rename, delete (xác nhận trước khi xoá), edit permission, properties, cut, copy, copy path
- Khi edit file, sử dụng monaco editor để tối giản nhưng vẫn dễ nhìn, hoạt động mươt mà. Không mở trực tiếp được thì tự động tải về thư mục tạm của plugin này trên local, khi nhấn lưu thì upload lại file đó lên để tạo cho user cảm giác edit trực tiếp.

