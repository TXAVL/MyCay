// ==========================================================
// BỘ QUẢN LÝ GIAO DIỆN & THEME ĐA SẮC (TXATHEME)
// Hỗ trợ 5 bảng màu Anime Cozy đỉnh cao:
// 1. cozy: Tiệm Ấm Áp (Gỗ Caramel & Giấy Kem)
// 2. tokyo-night: Đêm Tokyo (Dark Cyber Lồng Đèn Huyền Ảo)
// 3. sakura: Hoa Anh Đào (Pastel Pink Mộng Mơ)
// 4. spicy-fire: Lửa Cay 7 Cấp (Đỏ Cam Rực Lửa Niêu Đất)
// 5. matcha: Trà Xanh Matcha (Zen Tĩnh Lặng & Rừng Trúc)
// ==========================================================

export class txatheme {
  static THEMES = [
    {
      id: "cozy",
      name: "Ấm Áp Cozy",
      icon: "🏮",
      desc: "Tông gỗ caramel, giấy kem Nhật Bản ấm cúng thân quen",
      themeColor: "#F6F0E6",
      previewColors: ["#FAF6F0", "#9E6720", "#C44569"]
    },
    {
      id: "tokyo-night",
      name: "Phố Đêm Tokyo",
      icon: "🌙",
      desc: "Chế độ tối Dark Mode huyền ảo, ánh đèn lồng neon lung linh",
      themeColor: "#181926",
      previewColors: ["#181926", "#222436", "#f7768e"]
    },
    {
      id: "sakura",
      name: "Hoa Anh Đào",
      icon: "🌸",
      desc: "Sắc hồng phấn sakura mộng mơ, ngọt ngào và lãng mạn",
      themeColor: "#FFF5F7",
      previewColors: ["#FFF5F7", "#F7DDE3", "#E84393"]
    },
    {
      id: "spicy-fire",
      name: "Lửa Cay Habanero",
      icon: "🌶️",
      desc: "Rực lửa ớt hiểm 7 cấp độ, than hồng niêu đất bốc khói",
      themeColor: "#1F1514",
      previewColors: ["#1F1514", "#66332C", "#FF4757"]
    },
    {
      id: "matcha",
      name: "Trà Xanh Matcha",
      icon: "🍵",
      desc: "Sắc xanh matcha thanh khiết, thư thái cùng tre trúc thanh tao",
      themeColor: "#F4F7F2",
      previewColors: ["#F4F7F2", "#B5C8AB", "#2E7D32"]
    },
    {
      id: "boba-pastel",
      name: "Boba Pastel",
      icon: "🧋",
      desc: "Hồng dâu & kem sữa pastel ngọt ngào, đậm chất tiệm trà sữa boba",
      themeColor: "#FFF0F5",
      previewColors: ["#FFF0F5", "#F8B4D9", "#D81B60"]
    },
    {
      id: "midnight-boba",
      name: "Midnight Boba",
      icon: "🥤",
      desc: "Quán trà sữa đêm tím Cyber neon, boba phát sáng huyền ảo",
      themeColor: "#140D26",
      previewColors: ["#140D26", "#2D1B69", "#E040FB"]
    }
  ];

  static STORAGE_KEY = "mycay_theme";

  /**
   * Khởi tạo theme khi nạp trang
   */
  static init() {
    const currentTheme = txatheme.getTheme();
    txatheme.applyTheme(currentTheme, false);
  }

  /**
   * Lấy id theme đang chọn
   * @returns {string}
   */
  static getTheme() {
    return localStorage.getItem(txatheme.STORAGE_KEY) || "cozy";
  }

  /**
   * Áp dụng theme vào document và lưu cấu hình
   * @param {string} themeId
   * @param {boolean} playSound
   */
  static setTheme(themeId, playSound = true) {
    const valid = txatheme.THEMES.some(t => t.id === themeId);
    const selected = valid ? themeId : "cozy";

    localStorage.setItem(txatheme.STORAGE_KEY, selected);
    txatheme.applyTheme(selected, playSound);
  }

  /**
   * Cập nhật DOM thuộc tính data-theme và meta theme-color
   * @param {string} themeId 
   * @param {boolean} playSound 
   */
  static applyTheme(themeId, playSound = false) {
    document.documentElement.setAttribute("data-theme", themeId);
    document.body.setAttribute("data-theme", themeId);

    const themeData = txatheme.THEMES.find(t => t.id === themeId) || txatheme.THEMES[0];

    // Cập nhật thẻ meta theme-color trên thiết bị di động
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme && themeData.themeColor) {
      metaTheme.setAttribute("content", themeData.themeColor);
    }

    // Cập nhật nhãn icon trên nút Header nhanh nếu có
    const quickThemeIcon = document.getElementById("header-theme-icon");
    if (quickThemeIcon) {
      quickThemeIcon.textContent = themeData.icon;
    }

    // Cập nhật trạng thái active trong bảng chọn Settings nếu mở
    document.querySelectorAll(".theme-card-option").forEach(card => {
      if (card.getAttribute("data-theme-id") === themeId) {
        card.classList.add("active");
      } else {
        card.classList.remove("active");
      }
    });

    // Phát âm thanh leng keng nếu có Game SoundManager
    if (playSound && window.game && window.game.sound) {
      window.game.sound.playButtonClick();
    }
  }

  /**
   * Đổi nhanh sang theme kế tiếp (dùng cho nút header)
   */
  static cycleTheme() {
    const current = txatheme.getTheme();
    const currentIndex = txatheme.THEMES.findIndex(t => t.id === current);
    const nextIndex = (currentIndex + 1) % txatheme.THEMES.length;
    const nextTheme = txatheme.THEMES[nextIndex];
    txatheme.setTheme(nextTheme.id, true);
    return nextTheme;
  }

  /**
   * Render danh sách các theme dạng card chọn lựa cho Settings Modal
   * @returns {string} HTML markup
   */
  static renderThemeOptionsHTML() {
    const currentTheme = txatheme.getTheme();

    return `
      <div class="theme-options-grid">
        ${txatheme.THEMES.map(t => {
          const isActive = t.id === currentTheme;
          return `
            <div class="theme-card-option ${isActive ? "active" : ""}" data-theme-id="${t.id}">
              <div class="theme-card-header">
                <span class="theme-card-icon">${t.icon}</span>
                <span class="theme-card-name">${t.name}</span>
                <span class="theme-card-check">✓</span>
              </div>
              <p class="theme-card-desc">${t.desc}</p>
              <div class="theme-color-palette">
                ${t.previewColors.map(c => `<span class="theme-color-swatch" style="background-color: ${c};"></span>`).join("")}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }
}
