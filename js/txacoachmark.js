// ==========================================================
// HƯỚNG DẪN TƯƠNG TÁC COACHMARK (TXACOACHMARK)
// Hệ thống hướng dẫn người mới chơi phong cách Anime Cozy
// Tự động spotlight làm nổi bật từng vị trí quan trọng của tiệm mì:
// 1. Tên tiệm & Vốn khởi nghiệp
// 2. Bảng đen Menu & Món đặc biệt Hot Combo
// 3. 8 Tab quản lý tiệm mì & kho hàng
// 4. Nồi ninh nước dùng xương 7 cấp độ
// 5. Nút mở cửa đón khách tấp nập
// ==========================================================

export class txacoachmark {
  constructor(steps = [], options = {}) {
    this.steps = steps.length > 0 ? steps : txacoachmark.DEFAULT_STEPS;
    this.options = {
      storageKey: "mycay_coachmark_seen",
      onFinish: null,
      onSkip: null,
      ...options
    };

    this.currentStep = 0;
    this.isActive = false;
    this.rafId = null;

    // DOM references
    this.overlayEl = null;
    this.spotlightEl = null;
    this.cardEl = null;

    // Bind event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  /**
   * Danh sách các bước hướng dẫn chuẩn của Tiệm Mỳ Cay theo thứ tự từ trên xuống dưới
   */
  static get DEFAULT_STEPS() {
    return [
      {
        target: ".shop-name-block",
        title: "🏮 Tên Quán & Vốn Khởi Nghiệp",
        desc: "Chào mừng Bếp Trưởng! Đây là tên tiệm mì và số vốn 400.000đ khởi nghiệp. Bạn có thể bấm vào cây bút ✏️ để đổi tên quán bất cứ khi nào nhé!",
        mascotQuote: "Meo meo! Bếp Trưởng ơi, quán mới khai trương thơm nức mũi cả góc phố nè! 🐾",
        placement: "bottom"
      },
      {
        target: "#chalkboard-banner",
        title: "📋 Menu Hôm Nay & Hot Combo",
        desc: "Bảng phấn hiển thị thực đơn và Món Đặc Biệt Hôm Nay. Phục vụ đúng đơn này sẽ nhận tiền tip x1.5 và cộng thêm Bonus Tiền!",
        mascotQuote: "Phục vụ đúng đơn Món Đặc Biệt sẽ nhận thêm một khoản tiền bonus siêu khủng luôn đó nha! 🌟🔥",
        placement: "bottom"
      },
      {
        target: ".game-nav-grid",
        title: "🏪 8 Khu Vực Quản Lý & Kho Hàng",
        desc: "Bấm vào các tab để mua nguyên liệu dự trữ, mở rộng bàn ghế gỗ, nâng cấp bếp niêu đất, và thuê nhân viên Mèo Mochi, Thỏ Usagi bưng bê phụ quán!",
        mascotQuote: "Thuê bé Mochi đón khách sẽ giúp tăng tới 25% tiền tip mỗi tô mì luôn đấy! 🐱",
        placement: "top"
      },
      {
        target: "#btn-brew-supplies",
        title: "🍲 Ninh Nước Dùng Xương Hầm",
        desc: "Mỗi sáng mở quán, việc đầu tiên là nhấn nút này để ninh một nồi nước dùng 7 cấp độ thơm lừng và chuẩn bị sẵn mì sợi tươi ngon!",
        mascotQuote: "Nước hầm xương 12 tiếng cùng thảo mộc bí truyền, khách ăn là mê tít! ✨",
        placement: "top"
      },
      {
        target: "#btn-quick-open-day",
        title: "✨ Mở Cửa Phục Vụ Thực Khách!",
        desc: "Khi đã có đủ nước dùng và chuẩn bị chu đáo, nhấn 'Mở Cửa Bán Hàng' để đón những vị thực khách đầu tiên vào ăn mì xì xèo nhé!",
        mascotQuote: "Chúc Bếp Trưởng buôn may bán đắt, khách vào nườm nượp thả tim 5 sao nha! 🎉🍜",
        placement: "top"
      }
    ];
  }

  /**
   * Kiểm tra xem người chơi đã xem hướng dẫn chưa
   */
  static checkShouldShow() {
    return localStorage.getItem("mycay_coachmark_seen") !== "true";
  }

  /**
   * Đánh dấu đã hoàn thành hướng dẫn
   */
  static markAsSeen() {
    localStorage.setItem("mycay_coachmark_seen", "true");
  }

  /**
   * Xóa đánh dấu (dùng khi reset dữ liệu game)
   */
  static resetSeen() {
    localStorage.removeItem("mycay_coachmark_seen");
  }

  /**
   * Bắt đầu tour hướng dẫn
   */
  start(startIndex = 0) {
    if (this.isActive) return;
    // Đang đứng ngoài bản đồ phố thì giao diện tiệm bị che, spotlight sẽ trỏ sai chỗ: không bắt đầu
    if (window.worldMap && window.worldMap.visible) return;
    this.isActive = true;
    this.currentStep = startIndex;

    this.createDOM();
    this.bindEvents();
    this.renderStep(this.currentStep);

    if (window.game && window.game.sound) {
      window.game.sound.playReviewChime();
    }
  }

  /**
   * Tạo các phần tử DOM cho overlay và spotlight
   */
  createDOM() {
    this.destroyDOM();

    // Container chính
    this.overlayEl = document.createElement("div");
    this.overlayEl.id = "txa-coachmark-overlay";
    this.overlayEl.className = "txa-coachmark-overlay anime-fade-in";

    // Khung spotlight làm nổi bật phần tử
    this.spotlightEl = document.createElement("div");
    this.spotlightEl.id = "txa-coachmark-spotlight";
    this.spotlightEl.className = "txa-coachmark-spotlight";

    // Card nội dung hướng dẫn
    this.cardEl = document.createElement("div");
    this.cardEl.id = "txa-coachmark-card";
    this.cardEl.className = "txa-coachmark-card anime-pop-in";

    this.overlayEl.appendChild(this.spotlightEl);
    this.overlayEl.appendChild(this.cardEl);
    document.body.appendChild(this.overlayEl);
  }

  /**
   * Hiển thị bước hiện tại
   */
  renderStep(index) {
    if (index < 0 || index >= this.steps.length) {
      this.finish();
      return;
    }

    this.currentStep = index;
    const step = this.steps[index];
    const isFirst = index === 0;
    const isLast = index === this.steps.length - 1;

    // Đảm bảo ở chế độ Chuẩn bị và mở đúng tab Kho nếu target là nút kho/mở cửa
    if (window.game) {
      if (step.target.includes("btn-brew") || step.target.includes("quick-open")) {
        if (window.game.switchTab) window.game.switchTab("tab-kho");
      }
    }

    let targetEl = document.querySelector(step.target);

    // Nếu target không tồn tại, mở lại tab Kho
    if (!targetEl && window.game && window.game.switchTab) {
      window.game.switchTab("tab-kho");
      targetEl = document.querySelector(step.target);
    }

    // Cuộn tức thì đến phần tử để lấy tọa độ chuẩn xác tuyệt đối
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
    }

    // Render HTML nội dung thẻ Mascot Coachmark
    this.cardEl.innerHTML = `
      <div class="txa-coachmark-mascot-row">
        <div class="txa-coachmark-avatar-wrap">
          <img src="assets/cust_cat.png" alt="Mèo Mochi Hướng Dẫn" class="txa-coachmark-avatar-img" onerror="this.src='assets/cust_cat.png'" />
          <span class="txa-coachmark-mascot-badge">✨</span>
        </div>
        <div class="txa-coachmark-speech-bubble">
          ${step.mascotQuote}
        </div>
      </div>

      <div class="txa-coachmark-content">
        <div class="txa-coachmark-step-badge">
          <span>Bước ${index + 1} / ${this.steps.length}</span>
          <div class="txa-coachmark-dots">
            ${this.steps.map((_, i) => `<span class="txa-coachmark-dot ${i === index ? "active" : ""}"></span>`).join("")}
          </div>
        </div>

        <h3 class="txa-coachmark-title">${step.title}</h3>
        <p class="txa-coachmark-desc">${step.desc}</p>
      </div>

      <div class="txa-coachmark-actions">
        <button id="btn-txa-coach-skip" class="txa-coachmark-btn-skip">
          ✕ Bỏ qua
        </button>
        <div class="txa-coachmark-nav-group">
          ${!isFirst ? `<button id="btn-txa-coach-prev" class="txa-coachmark-btn-prev">❮ Quay lại</button>` : ""}
          <button id="btn-txa-coach-next" class="txa-coachmark-btn-next ${isLast ? "btn-final" : ""}">
            ${isLast ? "🎉 Bắt đầu nấu mì!" : "Tiếp theo ❯"}
          </button>
        </div>
      </div>
    `;

    // Cập nhật vị trí spotlight và card ngay lập tức & kiểm tra lại sau 1 tick
    requestAnimationFrame(() => {
      this.updatePosition(targetEl, step.placement);
      setTimeout(() => {
        const recheckTarget = document.querySelector(step.target);
        this.updatePosition(recheckTarget, step.placement);
      }, 50);
    });

    // Gắn sự kiện cho các nút trong card
    const btnNext = document.getElementById("btn-txa-coach-next");
    const btnPrev = document.getElementById("btn-txa-coach-prev");
    const btnSkip = document.getElementById("btn-txa-coach-skip");

    if (btnNext) {
      btnNext.addEventListener("click", () => {
        if (window.game && window.game.sound) window.game.sound.playButtonClick();
        if (isLast) {
          this.finish();
        } else {
          this.next();
        }
      });
    }

    if (btnPrev) {
      btnPrev.addEventListener("click", () => {
        if (window.game && window.game.sound) window.game.sound.playButtonClick();
        this.prev();
      });
    }

    if (btnSkip) {
      btnSkip.addEventListener("click", () => {
        if (window.game && window.game.sound) window.game.sound.playButtonClick();
        this.skip();
      });
    }
  }

  /**
   * Định vị spotlight bao quanh target và thẻ hướng dẫn chính xác
   */
  updatePosition(targetEl, preferredPlacement = "bottom") {
    if (!this.overlayEl || !this.spotlightEl || !this.cardEl) return;

    if (!targetEl) {
      // Trường hợp không tìm thấy target: căn giữa màn hình
      this.spotlightEl.style.display = "none";
      this.cardEl.style.top = "50%";
      this.cardEl.style.left = "50%";
      this.cardEl.style.transform = "translate(-50%, -50%)";
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      this.spotlightEl.style.display = "none";
      this.cardEl.style.top = "50%";
      this.cardEl.style.left = "50%";
      this.cardEl.style.transform = "translate(-50%, -50%)";
      return;
    }

    this.spotlightEl.style.display = "block";
    const pad = 8;

    // Vị trí và kích thước của spotlight
    const spotTop = Math.max(0, rect.top - pad);
    const spotLeft = Math.max(0, rect.left - pad);
    const spotWidth = rect.width + pad * 2;
    const spotHeight = rect.height + pad * 2;

    this.spotlightEl.style.top = `${spotTop}px`;
    this.spotlightEl.style.left = `${spotLeft}px`;
    this.spotlightEl.style.width = `${spotWidth}px`;
    this.spotlightEl.style.height = `${spotHeight}px`;

    // Tính toán vị trí card sao cho không tràn màn hình
    const cardRect = this.cardEl.getBoundingClientRect();
    const cardWidth = cardRect.width || 360;
    const cardHeight = cardRect.height || 220;
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    let cardLeft = rect.left + rect.width / 2 - cardWidth / 2;
    // Giữ lề hai bên ít nhất 16px
    cardLeft = Math.max(16, Math.min(cardLeft, viewWidth - cardWidth - 16));

    let cardTop;
    const spaceBelow = viewHeight - (spotTop + spotHeight);
    const spaceAbove = spotTop;

    if (preferredPlacement === "top" && spaceAbove > cardHeight + 20) {
      cardTop = spotTop - cardHeight - 16;
    } else if (spaceBelow > cardHeight + 20) {
      cardTop = spotTop + spotHeight + 16;
    } else if (spaceAbove > cardHeight + 20) {
      cardTop = spotTop - cardHeight - 16;
    } else {
      // Không đủ chỗ trên/dưới (mục tiêu cao): đặt card ngay bên cạnh nếu còn chỗ, tránh che mục tiêu
      const spaceRight = viewWidth - (spotLeft + spotWidth);
      const spaceLeftSide = spotLeft;
      if (spaceRight > cardWidth + 32) {
        cardLeft = spotLeft + spotWidth + 16;
      } else if (spaceLeftSide > cardWidth + 32) {
        cardLeft = spotLeft - cardWidth - 16;
      }
      cardTop = Math.max(16, Math.min(spotTop, viewHeight - cardHeight - 16));
      if (cardLeft < spotLeft + spotWidth && cardLeft + cardWidth > spotLeft) {
        cardTop = Math.max(16, (viewHeight - cardHeight) / 2); // vẫn không tránh được: căn giữa như cũ
      }
    }

    this.cardEl.style.top = `${cardTop}px`;
    this.cardEl.style.left = `${cardLeft}px`;
    this.cardEl.style.transform = "none";
  }

  next() {
    this.renderStep(this.currentStep + 1);
  }

  prev() {
    this.renderStep(this.currentStep - 1);
  }

  finish() {
    txacoachmark.markAsSeen();
    this.close();
    if (this.options.onFinish) this.options.onFinish();
    if (window.game && window.game.sound) {
      window.game.sound.playCoinChime();
    }
  }

  skip() {
    txacoachmark.markAsSeen();
    this.close();
    if (this.options.onSkip) this.options.onSkip();
  }

  close() {
    this.isActive = false;
    this.unbindEvents();
    if (this.overlayEl) {
      this.overlayEl.classList.add("fade-out");
      setTimeout(() => {
        this.destroyDOM();
      }, 300);
    }
  }

  destroyDOM() {
    if (this.overlayEl && this.overlayEl.parentNode) {
      this.overlayEl.parentNode.removeChild(this.overlayEl);
    }
    this.overlayEl = null;
    this.spotlightEl = null;
    this.cardEl = null;
  }

  bindEvents() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("resize", this.handleResize);

    const scrollBody = document.getElementById("game-scroll-body");
    if (scrollBody) {
      scrollBody.addEventListener("scroll", this.handleResize, { passive: true });
    }
    window.addEventListener("scroll", this.handleResize, { passive: true, capture: true });
  }

  unbindEvents() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("resize", this.handleResize);

    const scrollBody = document.getElementById("game-scroll-body");
    if (scrollBody) {
      scrollBody.removeEventListener("scroll", this.handleResize);
    }
    window.removeEventListener("scroll", this.handleResize, true);
  }

  handleKeyDown(e) {
    if (!this.isActive) return;
    if (e.key === "Escape") {
      this.skip();
    } else if (e.key === "ArrowRight") {
      this.next();
    } else if (e.key === "ArrowLeft") {
      this.prev();
    }
  }

  handleResize() {
    if (!this.isActive) return;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      const step = this.steps[this.currentStep];
      if (step) {
        const targetEl = document.querySelector(step.target);
        this.updatePosition(targetEl, step.placement);
      }
    });
  }
}
