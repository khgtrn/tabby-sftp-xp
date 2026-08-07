# tabby-sftp-xp

Plugin cho [Tabby](https://tabby.sh) cho phép quản lý và edit file local + remote (qua SFTP)
trực tiếp trong Tabby, không cần ứng dụng ngoài. Xem chi tiết trong [docs/Main.md](docs/Main.md)
và [docs/Function.md](docs/Function.md).

## Yêu cầu

- Docker + Docker Compose. **Không cần cài Node.js/npm trên máy host** — mọi lệnh node/npm
  đều chạy bên trong container (xem [docs/Docker.md](docs/Docker.md)).

## Bắt đầu

```bash
# Build & start dev container (giữ container chạy nền bằng `tail -f /dev/null`)
docker compose up -d --build

# Cài / cập nhật dependencies (chạy bên trong container)
docker compose exec tabby_sftp_xp npm install

# Type-check
docker compose exec tabby_sftp_xp npm run typecheck

# Build plugin (rspack) -> ./dist/index.js
docker compose exec tabby_sftp_xp npm run build

# Build & rebuild liên tục khi sửa code
docker compose exec tabby_sftp_xp npm run watch

# Dừng container
docker compose down
```

Sau khi build, copy (hoặc symlink) thư mục dự án vào thư mục plugin của Tabby, hoặc chạy Tabby
với biến môi trường `TABBY_PLUGINS=/path/to/tabby-sftp-xp` để load plugin trong lúc phát triển.

### Chạy Tabby portable trên Windows từ WSL

Không tạo `mklink` bên trong `data\plugins\node_modules`: thư mục này do Plugin Manager quản lý
và link không có trong lockfile có thể bị xoá. Sau khi đóng hẳn Tabby, chạy
`start-tabby-dev.cmd`; script đặt `TABBY_PLUGINS` trỏ thẳng tới project WSL rồi mở Tabby ở chế
độ debug.

Mở PowerShell trên Windows và chạy:

```powershell
& "\\wsl.localhost\Ubuntu-26.04\root\github\tabby-sftp-xp\start-tabby-dev.cmd"
```

Script hiện sử dụng project trong WSL tại đường dẫn trên và khởi động Tabby portable từ
`D:\Software\tabby-portable-x64\Tabby.exe`. Nếu project, distro WSL hoặc Tabby nằm ở vị trí
khác, hãy cập nhật các đường dẫn tương ứng trong `start-tabby-dev.cmd` trước khi chạy.

## Cấu trúc

```
src/
  bookmarks/     # Bookmark model + persistence (~/.config/tabby-sftp/bookmarks.json)
  core/          # Config provider, shared paths
  editor/        # Download/upload cache cho Monaco Editor
  filesystem/    # IFileSystem, LocalFsService, TransferService (copy/cut), Clipboard
  sftp/          # Kết nối SFTP độc lập (ssh2)
  tabby-plugin/  # Toolbar button + context menu tích hợp vào Tabby
  ui/            # Angular components: dual-pane explorer, dialogs, settings tab
  plugin.module.ts, index.ts  # Entry point của plugin (theo chuẩn Tabby)
```

## Build

Build dùng [rspack](https://rspack.dev) (xem `rspack.config.js`), biên dịch `src/index.ts`
thành `dist/index.js` (UMD), giữ các dependency của Tabby (`@angular/*`, `tabby-*`,
`@ng-bootstrap/*`, `rxjs`) là `externals` — do host Tabby app cung cấp, không bundle vào.
`ssh2` được khai báo trong `dependencies` (không bundle, vì có native addon) nên sẽ được cài
cùng khi plugin được cài đặt.

## Giấy phép

Dự án được phát hành theo giấy phép [MIT](LICENSE).
