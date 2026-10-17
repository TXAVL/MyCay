# 🍜 Tiệm Mỳ Cay

[![Phiên Bản](https://img.shields.io/badge/Phi%C3%AAn%20B%E1%BA%A3n-v1.6.0-F59E0B?logo=github)](https://github.com/TXAVL/MyCay)
[![Phát Hành](https://img.shields.io/badge/Ph%C3%A1t%20H%C3%A0nh-17%2F10%2F2026-blue)](https://github.com/TXAVL/MyCay)
[![Nền Tảng](https://img.shields.io/badge/N%E1%BB%81n%20T%E1%BA%A3ng-Web%20%7C%20PWA%20Offline-2ECC71)](https://github.com/TXAVL/MyCay)
[![Chế Độ Chơi](https://img.shields.io/badge/Ch%E1%BA%BF%20%C4%90%E1%BB%99-Cozy%20Anime%20Simulation-purple)](https://github.com/TXAVL/MyCay)

---

## 🌟 Tính Năng Nổi Bật

### 0. 🎮 Giao Diện Chuẩn Game Tiệm Nhỏ
- **Khung cảnh tiệm sống động**: khách chibi bước vào từ cửa, xếp hàng ở quầy gọi món, cầm tô về bàn ngồi ăn rồi ra về; đầu bếp & nhân viên đứng quầy trò chuyện, nồi niêu bốc khói, ánh sáng đổi từ sáng sớm → hoàng hôn → đêm theo giờ ca bán.
- **Chạm khách để chơi**: chạm khách lần 1 để nấu đúng món (bong bóng chuyển xanh ✓), chạm lần 2 để bưng ra; chạm bàn bẩn 🧹 để dọn nhận tip.
- **HUD game**: ví xu vàng, sao đánh giá, đồng hồ ca bán, avatar có vòng XP và **Cấp độ tiệm (Lv)** kèm màn hình *LÊN CẤP!* pháo giấy.
- **Xu vàng bay về ví** mỗi khi có tiền vào, **dock nút tròn** cố định đáy màn hình, nút bấm 3D lún khi chạm, màn hình chờ với mặt tiền quán vẽ tay.

### 1. 🍲 Màn Hình Loading Đầy Đủ
- Hoạt họa nồi mì cay niêu đất sôi sùng sục, bốc khói nghi ngút.
- Thanh tiến trình tải mượt mà từ 0% đến 100% kèm các mẹo/câu đùa tiệm mì anime ngộ nghĩnh.
- Nút bấm **"Mở Cửa Quán Ngay"** với hiệu ứng nảy nhịp nhàng sau khi nạp xong.

### 2. 🏮 Nhập Tên Quán & Bộ Lọc Kiểm Duyệt (Validation Tên)
- Lần đầu mở game sẽ yêu cầu người chơi đặt tên bảng hiệu cho tiệm mì.
- Bộ lọc thông minh ngăn chặn các từ ngữ thô tục, bậy bạ, phản cảm hoặc ký tự rác.
- **Cảnh báo đỏ sinh động** với hiệu ứng rung nhẹ (`anime-shake`), **tự động biến mất** hoặc chuyển sang trạng thái xanh hợp lệ ngay khi người chơi gõ tên tử tế và đúng quy định (từ 3 - 25 ký tự).

### 3. ⭐ Hệ Thống Đánh Giá & Phản Hồi Thực Khách (Review System)
- Khách sau khi dùng bữa sẽ để lại đánh giá (số sao 1-5 ⭐, nhận xét món mì và độ cay).
- **Chủ quán phản hồi:**
  - Có các nút **Gợi ý trả lời nhanh** siêu ngọt ngào và hiếu khách.
  - Hoặc **tự gõ phản hồi thủ công** vào ô nhập văn bản theo ý thích.
- **Khách hàng feedback lại ngay lập tức**: Khi chủ quán nhấn gửi phản hồi, khách hàng sẽ gửi lại tin nhắn cảm ơn / khen ngợi tức thì, kèm tặng thêm tiền Tip 🪙 và cộng điểm Danh tiếng ⭐ cho quán.

### 4. 🛠️ Nâng Cấp Tiệm & 🐾 Thuê Nhân Viên
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

### 5. ⚙️ Cài Đặt Game Đầy Đủ
- Điều chỉnh âm lượng nhạc nền Lo-Fi ấm áp (tạo trực tiếp bằng Web Audio API, không lo thiếu file hay lỗi bản quyền).
- Tùy chỉnh âm lượng SFX tiếng xèo xèo, chuông cửa, tiền xu ting ting.
- Tùy chọn tốc độ trò chơi: 1x (Cozy), 1.5x (Nhanh), 2x (Siêu tốc).
- Bật / tắt hiệu ứng cánh hoa anh đào rơi.
- Xem lại lịch sử các bản cập nhật.
- Xóa dữ liệu và chơi lại từ đầu an toàn.

---

## 🎮 Hướng Dẫn Trải Nghiệm

- **Chơi trực tiếp**: Mở trực tiếp trên mọi trình duyệt di động hoặc máy tính để bàn.
- **Cài đặt như App (PWA Offline)**: Chọn **"Thêm vào Màn hình chính" (Add to Home Screen)** trên trình duyệt để chơi toàn màn hình không viền và tiếp tục quản lý tiệm ngay cả khi không có kết nối mạng!

---

## 📁 Cấu Trúc Dự Án

```
MyCay/
├── index.html          # Trang chính của game
├── manifest.json       # Web App Manifest (PWA)
├── _headers            # Tối ưu cache và security cho Cloudflare Pages
├── README.md           # Tài liệu hướng dẫn
├── styles/
│   ├── main.css        # Giao diện Cozy Anime, Responsive, Glassmorphism
│   └── game-skin.css   # Lớp giao diện game: HUD, khung cảnh tiệm, dock, nút 3D
└── js/
    ├── app.js          # Khởi động, điều phối loading, popup đặt tên và version
    ├── game.js         # Logic tiệm mì, nấu mì 7 cấp độ, review, nhân viên
    ├── shop-scene.js   # Khung cảnh tiệm sống động: khách chibi, nhân viên, xu bay, cấp độ tiệm
    ├── txaversion.js   # Quản lý phiên bản game và thông báo cập nhật mới
    ├── filter.js       # Bộ lọc kiểm duyệt tên quán, cảnh báo đỏ tự biến mất
    └── audio.js        # Bộ âm thanh Web Audio API Lo-Fi & SFX sống động
```
