# 🍜 Tiệm Mỳ Cay (Phiên Bản 1.0)

> Trò chơi mô phỏng quản lý Tiệm Mỳ Cay, tương thích mượt mà từ điện thoại di động đến máy tính để bàn. Tối ưu sẵn sàng deploy 1-click lên **Cloudflare Workers** (`tmc.*.workers.dev`)!

---

## 🌟 Tính Năng Nổi Bật

### 1. 🍲 Màn Hình Loading Đầy Đủ
- Hoạt họa nồi mì cay niêu đất sôi sùng sục, bốc khói nghi ngút.
- Thanh tiến trình tải mượt mà từ 0% đến 100% kèm các mẹo/câu đùa tiệm mì anime ngộ nghĩnh.
- Nút bấm **"Mở Cửa Quán Ngay"** với hiệu ứng nảy nhịp nhàng sau khi nạp xong.

### 2. 🏮 Nhập Tên Quán & Bộ Lọc Kiểm Duyệt (Validation Tên)
- Lần đầu mở game sẽ yêu cầu người chơi đặt tên bảng hiệu cho tiệm mì.
- Bộ lọc thông minh ngăn chặn các từ ngữ thô tục, bậy bạ, phản cảm hoặc ký tự rác.
- **Cảnh báo đỏ sinh động** với hiệu ứng rung nhẹ (`anime-shake`), **tự động biến mất** hoặc chuyển sang trạng thái xanh hợp lệ ngay khi người chơi gõ tên tử tế và đúng quy định (từ 3 - 25 ký tự).

### 3. 📦 Class `txaversion` Quản Lý Phiên Bản Game
- Sử dụng class `txaversion` khai báo phiên bản (hiện tại là `v1.0.0`).
- Tự động phát hiện phiên bản mới so với dữ liệu đã lưu trong máy.
- Hiển thị cửa sổ modal **"Có Gì Mới Trong Bản Cập Nhật"** với các **Anime Cartoon Cards** sinh động, nhún nhảy bắt mắt.

### 4. ⭐ Hệ Thống Đánh Giá & Phản Hồi Thực Khách (Review System)
- Khách sau khi dùng bữa sẽ để lại đánh giá (số sao 1-5 ⭐, nhận xét món mì và độ cay).
- **Chủ quán phản hồi:**
  - Có các nút **Gợi ý trả lời nhanh** siêu ngọt ngào và hiếu khách.
  - Hoặc **tự gõ phản hồi thủ công** vào ô nhập văn bản theo ý thích.
- **Khách hàng feedback lại ngay lập tức**: Khi chủ quán nhấn gửi phản hồi, khách hàng sẽ gửi lại tin nhắn cảm ơn / khen ngợi tức thì, kèm tặng thêm tiền Tip 🪙 và cộng điểm Danh tiếng ⭐ cho quán.

### 5. 🛠️ Nâng Cấp Tiệm & 🐾 Thuê Nhân Viên
- **Nâng cấp cửa hàng**:
  - *Nồi Niêu Đất Giữ Nhiệt*: Tăng 25% tốc độ nấu mì chín.
  - *Thêm Bàn Gỗ Ấm Cúng*: Tăng số bàn đón khách (lên đến 6 bàn).
  - *Đèn Lồng Hoa Anh Đào Decor*: Thu hút khách ghé quán nhanh hơn.
  - *Bí Truyền Sốt Ớt 7 Cấp Độ*: Tăng giá bán mỗi tô mì.
  - *Hệ Thống Điều Hòa*: Khách kiên nhẫn chờ món lâu hơn.
- **Thuê nhân viên anime**:
  - *Bé Mèo Mochi (Tiếp Tân)*: Chào khách meo meo, tăng 25% tiền tip.
  - *Gấu Trúc Kenji (Phụ Bếp)*: Tự động chuẩn bị nguyên liệu nhanh x2.
  - *Cô Thỏ Usagi (Phục Vụ)*: Tự động dọn dẹp bàn ăn sạch bóng siêu tốc.
  - *Hồ Ly Shiro (Quản Lý)*: Thu hút khách VIP và tăng điểm uy tín.

### 6. ⚙️ Cài Đặt Game Hẳn Hoi
- Điều chỉnh âm lượng nhạc nền Lo-Fi ấm áp (tạo trực tiếp bằng Web Audio API, không lo thiếu file hay lỗi bản quyền).
- Tùy chỉnh âm lượng SFX tiếng xèo xèo, chuông cửa, tiền xu ting ting.
- Tùy chọn tốc độ trò chơi: 1x (Cozy), 1.5x (Nhanh), 2x (Siêu tốc).
- Bật / tắt hiệu ứng cánh hoa anh đào rơi.
- Xem lại lịch sử phiên bản `txaversion`.
- Xóa dữ liệu và chơi lại từ đầu an toàn.

---

## 🚀 Hướng Dẫn Deploy Lên Domain `*.workers.dev` (Cloudflare Workers)

Dự án đã được cấu hình sẵn **Cloudflare Workers Static Assets** qua 2 file [`wrangler.toml`](file:///c:/Users/admin/Desktop/MyCay/wrangler.toml) và [`worker.js`](file:///c:/Users/admin/Desktop/MyCay/worker.js). Game sẽ chạy trên domain ngắn gọn dạng:
```
https://tmc.<subdomain-cua-ban>.workers.dev
```

### Cách 1: Deploy bằng dòng lệnh qua Wrangler (Đơn giản nhất - 1 lệnh)

1. Mở PowerShell hoặc Terminal tại thư mục `MyCay`:
2. Đăng nhập vào tài khoản Cloudflare (chỉ cần làm 1 lần đầu):
   ```bash
   npx wrangler login
   ```
3. Chạy lệnh deploy:
   ```bash
   npx wrangler deploy
   ```
4. Wrangler sẽ tự động tải dự án lên mạng lưới Edge của Cloudflare và in ra đường link game của bạn trên màn hình:
   👉 **`https://tmc.<ten-tai-khoan>.workers.dev`**

---

### Cách 2: Tùy chỉnh tên domain theo ý muốn
Trong file [`wrangler.toml`](file:///c:/Users/admin/Desktop/MyCay/wrangler.toml), bạn có thể đổi dòng:
```toml
name = "tmc"
```
thành bất kỳ tên nào khác nếu cần. Mỗi khi chạy `npx wrangler deploy`, tên worker sẽ tương ứng với subdomain đầu tiên.

---

### Cách 3: Chạy thử trước bằng môi trường Workers local
Nếu muốn test mô phỏng y hệt môi trường Cloudflare Workers trên máy tính:
```bash
npx wrangler dev
```

---

## 📁 Cấu Trúc Dự Án

```
MyCay/
├── index.html          # Trang chính của game
├── manifest.json       # Web App Manifest (PWA)
├── _headers            # Tối ưu cache và security cho Cloudflare Pages
├── README.md           # Tài liệu hướng dẫn
├── styles/
│   └── main.css        # Giao diện Cozy Anime, Responsive, Glassmorphism
└── js/
    ├── app.js          # Khởi động, điều phối loading, popup đặt tên và version
    ├── game.js         # Logic tiệm mì, nấu mì 7 cấp độ, review, nhân viên
    ├── txaversion.js   # Class txaversion quản lý phiên bản 1.0 và anime cards
    ├── filter.js       # Bộ lọc kiểm duyệt tên quán, cảnh báo đỏ tự biến mất
    └── audio.js        # Bộ âm thanh Web Audio API Lo-Fi & SFX sống động
```
