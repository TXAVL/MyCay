// Quản lý phiên bản game Tiệm Mỳ Cay
// Khai báo class txaversion theo đúng yêu cầu dự án

export class txaversion {
  constructor(version, versionCode, releaseDate, features = []) {
    this.version = version; // Ví dụ: "1.0.0"
    this.versionCode = versionCode; // Ví dụ: 100
    this.releaseDate = releaseDate;
    this.features = features; // Danh sách { title, desc, icon, badge }
  }

  // Khai báo phiên bản hiện tại của game (Bản 1.2.0 - Đại Tiệc Mì Cay & Quán Ăn Tấp Nập)
  static get CURRENT_VERSION() {
    return new txaversion("1.2.0", 120, "13/10/2026", [
      {
        title: "Sân Khấu Phố Xá & Khách Dạo Phố Tấp Nập",
        desc: "Dòng khách hoạt hình (Mèo Linh, Shiba Duy, Gấu Nâu, Thỏ Chiaki) dạo bước trên vỉa hè trước quán, hít hà mùi nước dùng và ngắm nghía tiệm mì!",
        icon: "🏮",
        badge: "Cực Hot 🔥",
        badgeType: "hot"
      },
      {
        title: "Khu Bàn Ăn Trực Diện & Khách Ăn Mì Xì Xèo",
        desc: "Không còn giấu trong pop-up! Thực khách ngồi ăn xì xèo ngay trên màn hình chính, hơi nóng bốc lên nghi ngút, xuýt xoa cay bốc khói, ăn xong thả tim và để lại tiền tip!",
        icon: "🍜",
        badge: "Trực quan ✨",
        badgeType: "visual"
      },
      {
        title: "Đánh Giá Sao Động 1–5 Sao & Khách Phản Hồi",
        desc: "Điểm sao và review tính toán theo chất lượng niêu mì và thời gian chờ. Phục vụ nhanh nhận 5 sao, để khách chờ quá lâu nhận 1 sao giận dữ!",
        icon: "⭐",
        badge: "Chân thực 🌟",
        badgeType: "star"
      },
      {
        title: "Chủ Quán Nhập Phản Hồi & Khách Tương Tác Lại",
        desc: "Chủ quán tự do nhập phản hồi hoặc chọn mẫu nhanh. Khách hòa giải tăng +1⭐ khi chủ quán xin lỗi chân thành, hoặc gửi thêm tiền tip khi khen ngợi!",
        icon: "💬",
        badge: "Tương tác 💖",
        badgeType: "chat"
      },
      {
        title: "Lưu Lượng Khách Phụ Thuộc Vào Điểm Sao",
        desc: "Độ nổi tiếng càng cao khách càng vào quán nườm nượp tấp nập, điểm thấp quán sẽ vắng khách để nhắc nhở nâng cao tay nghề!",
        icon: "🔥",
        badge: "Cơ chế mới 📈",
        badgeType: "manage"
      }
    ]);
  }

  // Lịch sử các phiên bản
  static get VERSION_HISTORY() {
    return [
      txaversion.CURRENT_VERSION
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
          <h3 class="version-heading">Đại Tiệc Mì Cay & Quán Ăn Tấp Nập</h3>
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
