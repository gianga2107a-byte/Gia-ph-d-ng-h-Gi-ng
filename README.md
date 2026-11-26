# Gia Phả Nhà Mình — mã nguồn

Ứng dụng web tĩnh, không cần cài thư viện và không có máy chủ/backend. Các hồ sơ gia đình được lưu trong `localStorage` của trình duyệt đang sử dụng.

## Chạy trên máy tính

Mở terminal trong thư mục chứa các tệp rồi chạy:

```bash
python3 -m http.server 3000
```

Mở `http://localhost:3000` trong trình duyệt. Dùng máy chủ tĩnh thay vì mở `index.html` trực tiếp để các đường dẫn và lưu trữ trình duyệt hoạt động nhất quán.

## Tệp trong gói

- `index.html` — cấu trúc trang và điều hướng.
- `styles.css` — giao diện desktop và di động.
- `app.js` — quản lý hồ sơ, quan hệ, cây gia phả, tìm kiếm, lưu cục bộ và sao lưu/khôi phục JSON.
- `manus-routes.json` — khai báo tuyến trang gốc cho Preview/hosting tĩnh.
- `TODO.md` — danh sách chức năng đã triển khai.

## Build tĩnh

Tạo thư mục xuất bản bằng lệnh:

```bash
mkdir -p dist && cp index.html app.js styles.css manus-routes.json dist/
```

Thư mục `dist` có thể được phục vụ như một website tĩnh.

## Lưu ý dữ liệu

Dữ liệu không tự đồng bộ giữa các trình duyệt hoặc thiết bị. Dùng nút **Sao lưu** để tải JSON; nút **Khôi phục** sẽ thay thế dữ liệu đang có sau khi xác nhận. Hãy giữ tệp sao lưu ở nơi an toàn.
