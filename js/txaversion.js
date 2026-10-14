// Quản lý phiên bản game Tiệm Mỳ Cay
// Khai báo class txaversion theo đúng yêu cầu dự án

export class txaversion {
  constructor(version, versionCode, releaseDate, features = []) {
    this.version = version; // Ví dụ: "1.4.0"
    this.versionCode = versionCode; // Ví dụ: 140
    this.releaseDate = releaseDate;
    this.features = features; // Danh sách { title, desc, icon, badge }
  }

  // Khai báo phiên bản hiện tại của game (Bản 1.4.0 - Mã QR Chơi Cùng Bạn Bè & Cân Bằng Độ Khó)
  static get CURRENT_VERSION() {
    return new txaversion("1.4.0", 140, "14/10/2026", [
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
      },
      {
        title: "Cân Bằng Kinh Doanh & Thử Thách Mới",
        desc: "Nâng cấp và thuê nhân viên giờ đây cần tích lũy vốn và mở khóa theo từng Ngày kinh doanh! Từ Ngày 2, quán bắt đầu tính chi phí mặt bằng & điện nước vận hành thực tế!",
        icon: "📈",
        badge: "Thử thách 🪙",
        badgeType: "star"
      },
      {
        title: "Gọn Gàng Quầy Bếp & Nhân Viên",
        desc: "Khắc phục triệt để lỗi tràn ngang khi thuê nhiều nhân viên! Các thẻ nhân viên Mèo Mochi, Gấu Kenji, Thỏ Usagi tự động co giãn và xuống dòng thẩm mỹ 100% không còn ô cuộn ngang thừa!",
        icon: "🐾",
        badge: "Gọn gàng ✨",
        badgeType: "visual"
      },
      {
        title: "Căn Chuẩn Spotlight Tân Thủ txacoachmark",
        desc: "Sửa hoàn toàn lỗi spotlight hướng dẫn trôi nổi giữa không trung! Khung viền vàng nổi bật giờ đây bám sát chuẩn xác từng nút chức năng và quầy quản lý của quán!",
        icon: "🧭",
        badge: "Tối ưu 🌟",
        badgeType: "visual"
      }
    ]);
  }

  // Lịch sử các phiên bản
  static get VERSION_HISTORY() {
    return [
      txaversion.CURRENT_VERSION,
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
        <div class="version-banner-icon">🍜</div>
        <div class="version-banner-info">
          <div class="version-pill-tag">BẢN NÂNG CẤP MỚI v${current.version}</div>
          <h3 class="version-heading">Mã QR Bạn Bè & Cân Bằng Kinh Doanh</h3>
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
