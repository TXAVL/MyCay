// Quản lý phiên bản game Tiệm Mỳ Cay
// Khai báo class txaversion theo đúng yêu cầu dự án

export class txaversion {
  constructor(version, versionCode, releaseDate, features = [], themeName = "") {
    this.version = version; // Ví dụ: "1.4.0"
    this.versionCode = versionCode; // Ví dụ: 140
    this.releaseDate = releaseDate;
    this.features = features; // Danh sách { title, desc, icon, badge }
    this.themeName = themeName || (features[0] ? features[0].title : "Bản Cập Nhật Mới");
  }

  // Khai báo phiên bản hiện tại của game (Bản 1.5.6 - Hỗ Trợ Chơi Offline 100% & Fix Safari iOS)
  static get CURRENT_VERSION() {
    return new txaversion(
      "1.5.6",
      156,
      "16/10/2026",
      [
        {
          title: "Chơi Game Ngoại Tuyến 100% (Offline PWA)",
          desc: "Tối ưu hóa Service Worker v1.5.6: Toàn bộ dữ liệu, âm thanh, hình ảnh và mã nguồn được tự động lưu vào bộ nhớ đệm sạch. Giờ đây bạn có thể tắt toàn bộ mạng Wifi/4G và mở game chơi bình thường mà không cần kết nối Internet!",
          icon: "📶",
          badge: "Offline 100% ⚡",
          badgeType: "hot"
        },
        {
          title: "Khắc phục triệt để lỗi Safari iOS",
          desc: "Xử lý triệt để lỗi 'Response served by service worker has redirections' trên trình duyệt Safari iPhone/iPad. Chuẩn hóa luồng phản hồi trực tiếp không chuyển hướng.",
          icon: "🍏",
          badge: "Safari Fix 🛠️",
          badgeType: "manage"
        }
      ],
      "Chơi Game Ngoại Tuyến 100% & Fix Safari iOS"
    );
  }

  // Lịch sử các phiên bản
  static get VERSION_HISTORY() {
    return [
      txaversion.CURRENT_VERSION,
      new txaversion("1.5.5", 155, "15/10/2026", [
        {
          title: "Chế Độ Giờ Vàng FEVER RUSH & Khách VIP Thần Tài",
          desc: "Khai mở tính năng FEVER RUSH cực đỉnh: Phục vụ chuỗi khách hoàn hảo để kích hoạt Giờ Vàng bùng nổ, gấp đôi (x2) doanh thu và đóng băng thời gian kiên nhẫn! Đón tiếp những vị khách VIP quý tộc (Mèo Thần Tài Maneki, Đại Gia Shiba, Cửu Vĩ VIP) mang lại tiền tip khổng lồ cho tiệm mì!",
          icon: "👑",
          badge: "VIP Mới 🔥",
          badgeType: "hot"
        },
        {
          title: "Tối ưu hóa & Sửa lỗi",
          desc: "Sửa một số lỗi tồn đọng và tối ưu hóa hiệu năng, cải thiện trải nghiệm chơi mượt mà hơn cho chủ tiệm.",
          icon: "🛠️",
          badge: "Sửa lỗi 🛠️",
          badgeType: "manage"
        }
      ], "Giờ Vàng FEVER RUSH & Khách VIP Thần Tài"),
      new txaversion("1.5.0", 150, "15/10/2026", [
        {
          title: "3 Nhân Viên Mới Toàn Năng (Ducky, Owl, Fawn)",
          desc: "Tuyển dụng Vịt Ducky (Barista pha chế tự động, +25% doanh thu nước), Cú Mèo Owl (Trưởng Marketing kéo bão khách +40%, đơn online 10s, x2 review 5 sao) và Nai Fawn (Quản lý kho chiết khấu sỉ -15%, tự động nhập kho khi cạn & thưởng +50% hoa hồng giao hàng)!",
          icon: "🧑‍🍳",
          badge: "Nhân viên mới 🌟",
          badgeType: "hot"
        },
        {
          title: "Menu Trà Sữa Chuẩn Vị & 5 Topping Boba",
          desc: "Mở rộng 6 loại trà sữa hot trend: Oolong nướng, Matcha Latte boba, Khoai môn béo, Sữa tươi trân châu đường đen, Cà phê muối boba, Trà trái cây nhiệt đới kèm 5 topping: Trân châu đen dẻo, 3Q trắng giòn, Pudding trứng tươi, Thạch dừa non và Kem cheese Macchiato!",
          icon: "🧋",
          badge: "Menu mới 🔥",
          badgeType: "hot"
        },
        {
          title: "2 Theme Độc Quyền: Boba Pastel & Midnight Boba",
          desc: "Biến hóa diện mạo tiệm với sắc hồng kem sữa Boba Pastel ngọt ngào hoặc không gian bar trà sữa đêm tím neon Midnight Boba thời thượng cùng hiệu ứng Glassmorphism hiện đại!",
          icon: "🎨",
          badge: "Theme mới ✨",
          badgeType: "visual"
        },
        {
          title: "8 Khách Hàng Anime Chibi Mới (Tổng 24 Khách)",
          desc: "Chào đón thêm 8 thực khách thú cưng sành điệu: Cú Tú Cú Đêm, Vịt Quỳnh Nghiện Boba, Nai Bambi, Sóc Nutty, Rái Cá Otto Chill, Cánh Cụt Pen, Mèo Mun Luna và Gấu Teddy Hảo Ngọt!",
          icon: "🐾",
          badge: "Khách mới 💖",
          badgeType: "star"
        },
        {
          title: "Âm Thanh Shaker Trà Sữa & Tự Động Hóa Quán",
          desc: "Hiệu ứng âm thanh lắc bình shaker rộn rã khi pha chế đồ uống, tích hợp tự động hóa trọn gói quầy nước và kho bãi không lo đứt hàng!",
          icon: "🎵",
          badge: "Âm thanh 🎶",
          badgeType: "manage"
        },
        {
          title: "Shipper Sống Động & Ép Màng Niêm Phong Thùng",
          desc: "Đội ngũ tài xế đối tác GrabFood, ShopeeFood, BeFood, Baemin với hồ sơ và câu thoại chân thực. Thêm tính năng ép màng nắp niêu & thùng xốp giữ nhiệt nhận thêm +15k tip!",
          icon: "🛵",
          badge: "Shipper 2.0 📦",
          badgeType: "hot"
        },
        {
          title: "Hệ Thống Đánh Giá 2.0 & Voucher Đền Trà Sữa",
          desc: "Biểu đồ phân bổ sao 1-5★, thanh bộ lọc danh mục (5★, 1-3★, Chưa trả lời, Đơn online). Tặng voucher 20% & đền bù ly trà sữa để hóa giải review 1★ thành 5★ xuất sắc!",
          icon: "⭐",
          badge: "Review 2.0 🌟",
          badgeType: "hot"
        }
      ]),
      new txaversion("1.4.0", 140, "14/10/2026", [
        {
          title: "Mã QR Rủ Bạn Bè & Tải Ảnh Sắc Nét",
          desc: "Mở Cài Đặt để lấy mã QR kèm Logo Tiệm Mỳ Cay ở chính giữa! Bạn bè có thể dùng Camera hoặc Zalo quét mã để chơi ngay. Có sẵn nút tải ảnh PNG sắc nét và báo rõ trạng thái tải!",
          icon: "📱",
          badge: "Tính năng mới 🔥",
          badgeType: "hot"
        },
        {
          title: "Chọn Cấp Độ Cay & Size Ngay Trong Khung Chọn Mì",
          desc: "Không cần phải chuyển tab hay cuộn xuống cuối! Giờ đây khi bấm vào Mì, thanh chọn Độ Cay (0 - 7) và Size Niêu (M / L) xuất hiện ngay phía trên để bạn thao tác thần tốc!",
          icon: "🌶️",
          badge: "Tiện lợi ⚡",
          badgeType: "manage"
        }
      ]),
      new txaversion("1.3.0", 130, "14/10/2026", [
        {
          title: "Bộ Sưu Tập 5 Giao Diện Theme Tuyệt Sắc",
          desc: "Thỏa sức biến hóa tiệm mì với 5 phong cách: Ấm Áp Cozy truyền thống, Phố Đêm Tokyo, Hoa Anh Đào Pastel, Lửa Cay và Trà Xanh Matcha!",
          icon: "🎨",
          badge: "Bản 1.3.0",
          badgeType: "hot"
        }
      ]),
      new txaversion("1.2.0", 120, "13/10/2026", [
        {
          title: "Sân Khấu Phố Xá & Khách Dạo Phố Tấp Nập",
          desc: "Dòng khách hoạt hình dạo bước trên vỉa hè trước quán, hít hà mùi nước dùng và ngắm nghía tiệm mì!",
          icon: "🏮",
          badge: "Bản 1.2.0",
          badgeType: "hot"
        }
      ])
    ];
  }

  // Kiểm tra xem có phiên bản mới so với bản lưu trước đó không
  static checkNewVersion() {
    const savedVersion = localStorage.getItem("mycay_seen_version");
    const current = txaversion.CURRENT_VERSION.version;

    if (!savedVersion || savedVersion !== current) {
      return {
        isNew: true,
        lastVersion: savedVersion || "Chưa có",
        currentVersion: txaversion.CURRENT_VERSION
      };
    }
    return {
      isNew: false,
      currentVersion: txaversion.CURRENT_VERSION
    };
  }

  // Đánh dấu đã xem phiên bản hiện tại
  static markAsSeen() {
    localStorage.setItem("mycay_seen_version", txaversion.CURRENT_VERSION.version);
  }

  // Sinh HTML cho modal thông báo phiên bản mới với các card hoạt hình sinh động
  static renderChangelogCards() {
    const current = txaversion.CURRENT_VERSION;
    return `
      <div class="version-banner">
        <div class="version-banner-icon">${current.features[0]?.icon || '👑'}</div>
        <div class="version-banner-info">
          <div class="version-pill-tag">BẢN NÂNG CẤP MỚI v${current.version}</div>
          <h3 class="version-heading">${current.themeName || current.features[0]?.title || 'Giờ Vàng FEVER RUSH & Khách VIP Thần Tài'}</h3>
          <span class="version-date">📅 Phát hành: ${current.releaseDate} · Bản chính thức</span>
        </div>
      </div>
      <div class="version-cards-container">
        ${current.features
          .map(
            (item, index) => `
          <div class="version-card anime-bounce-in" style="animation-delay: ${index * 0.08}s">
            <div class="card-icon-wrap">
              <span class="card-icon-circle">${item.icon}</span>
            </div>
            <div class="card-content">
              <div class="card-top-row">
                <h4 class="card-title">${item.title}</h4>
                <span class="card-badge badge-${item.badgeType || 'hot'}">${item.badge}</span>
              </div>
              <p class="card-desc">${item.desc}</p>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }
}
