// Quản lý phiên bản game Tiệm Mỳ Cay
// Khai báo class txaversion theo đúng yêu cầu dự án

export class txaversion {
  constructor(version, versionCode, releaseDate, features = []) {
    this.version = version; // Ví dụ: "1.3.0"
    this.versionCode = versionCode; // Ví dụ: 130
    this.releaseDate = releaseDate;
    this.features = features; // Danh sách { title, desc, icon, badge }
  }

  // Khai báo phiên bản hiện tại của game (Bản 1.3.0 - Đại Tiệc Đa Sắc Theme & Hướng Dẫn txacoachmark)
  static get CURRENT_VERSION() {
    return new txaversion("1.3.0", 130, "14/10/2026", [
      {
        title: "Bộ Sưu Tập 5 Giao Diện Theme Tuyệt Sắc",
        desc: "Thỏa sức biến hóa tiệm mì với 5 phong cách: Ấm Áp Cozy truyền thống, Phố Đêm Tokyo (Dark Mode huyền ảo), Hoa Anh Đào Pastel ngọt ngào, Lửa Cay Habanero rực cháy và Trà Xanh Matcha thanh tịnh!",
        icon: "🎨",
        badge: "Đại Tiệc Mới 🔥",
        badgeType: "hot"
      },
      {
        title: "Hệ Thống Hướng Dẫn Spotlight txacoachmark",
        desc: "Bé Mèo Mochi trực tiếp dắt tay Bếp Trưởng qua từng góc quán: cách ninh nước dùng 7 cấp, xem menu bảng đen, quản lý 8 khu vực và bấm mở cửa đón khách!",
        icon: "🧭",
        badge: "Độc quyền 🌟",
        badgeType: "visual"
      },
      {
        title: "Nghi Thức Khai Trương & Đặt Tên Quán",
        desc: "Quy trình khai trương chuẩn chỉ! Ngay sau khi đọc tin mới, Bếp Trưởng sẽ được mời đặt tên tiệm mỳ để khắc lên biển hiệu gỗ trước khi chính thức vào bếp!",
        icon: "🏮",
        badge: "Khai trương 🎉",
        badgeType: "star"
      },
      {
        title: "Nút Đổi Theme Nhanh & Bảng Màu Trực Quan",
        desc: "Bấm nút 🎨 trên thanh Header để chuyển nhanh theme tức thì, hoặc mở Cài Đặt để chiêm ngưỡng các bảng màu xem trước cực kỳ mượt mà!",
        icon: "⚡",
        badge: "Tiện lợi ✨",
        badgeType: "manage"
      }
    ]);
  }

  // Lịch sử các phiên bản
  static get VERSION_HISTORY() {
    return [
      txaversion.CURRENT_VERSION,
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
        <div class="version-banner-icon">🏮</div>
        <div class="version-banner-info">
          <div class="version-pill-tag">BẢN NÂNG CẤP MỚI v${current.version}</div>
          <h3 class="version-heading">Đại Tiệc Đa Sắc Theme & txacoachmark</h3>
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
