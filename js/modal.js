// Hệ thống Thông báo Toast và Modal tùy chỉnh hoàn toàn trong game
// Thay thế 100% window.alert, window.confirm và window.prompt bằng UI hoạt hình Anime Cozy!

export class GameUIModal {
  static init() {
    // Tạo container cho toast nếu chưa có
    if (!document.getElementById("game-toast-container")) {
      const toastContainer = document.createElement("div");
      toastContainer.id = "game-toast-container";
      toastContainer.className = "game-toast-container";
      document.body.appendChild(toastContainer);
    }
  }

  /**
   * Hiển thị thông báo Toast góc màn hình với icon và âm thanh
   * @param {string} message - Nội dung thông báo
   * @param {'info' | 'success' | 'warning' | 'error' | 'coin'} type - Loại thông báo
   * @param {string} icon - Icon biểu tượng (🍜, 🪙, ⭐, 💖, ⚠️...)
   * @param {number} duration - Thời gian hiển thị (ms)
   */
  static showToast(message, type = "info", icon = "✨", duration = 3200) {
    this.init();
    const container = document.getElementById("game-toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `game-toast toast-${type} anime-toast-slide-in`;
    toast.innerHTML = `
      <div class="toast-icon-wrap">${icon}</div>
      <div class="toast-msg-text">${message}</div>
    `;

    container.appendChild(toast);

    // Kêu gọi âm thanh tương ứng nếu có
    if (window.game && window.game.sound) {
      if (type === "coin" || type === "success") {
        window.game.sound.playCoinChime();
      } else {
        window.game.sound.playButtonClick();
      }
    }

    // Tự động gỡ bỏ sau thời gian duration
    setTimeout(() => {
      toast.classList.remove("anime-toast-slide-in");
      toast.classList.add("anime-toast-slide-out");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 350);
    }, duration);
  }

  /**
   * Hiển thị Modal Thông báo (Thay thế alert())
   * @param {object} options
   * @param {string} options.title - Tiêu đề
   * @param {string} options.message - Nội dung
   * @param {string} options.icon - Biểu tượng (🍲, 🎁, ⭐...)
   * @param {string} options.btnText - Chữ nút đóng
   * @param {Function} options.onClose - Callback khi đóng
   */
  static alert({ title = "Thông Báo", message = "", icon = "🍜", btnText = "Đã Hiểu 💖", onClose = null }) {
    const existing = document.getElementById("custom-alert-dialog");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "custom-alert-dialog";
    overlay.className = "modal-overlay custom-dialog-overlay";
    overlay.style.display = "flex";

    overlay.innerHTML = `
      <div class="modal-dialog custom-dialog-box anime-bounce-in">
        <div class="custom-dialog-header">
          <div class="custom-dialog-icon">${icon}</div>
          <h3 class="custom-dialog-title">${title}</h3>
        </div>
        <div class="custom-dialog-body">
          <p>${message}</p>
        </div>
        <div class="custom-dialog-footer">
          <button class="btn-dialog-confirm" id="btn-custom-alert-ok">${btnText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    if (window.game && window.game.sound) {
      window.game.sound.playReviewChime();
    }

    const okBtn = overlay.querySelector("#btn-custom-alert-ok");
    okBtn.addEventListener("click", () => {
      overlay.classList.add("fade-out");
      if (window.game && window.game.sound) window.game.sound.playButtonClick();
      setTimeout(() => {
        overlay.remove();
        if (onClose) onClose();
      }, 200);
    });
  }

  /**
   * Hiển thị Modal Xác nhận (Thay thế confirm())
   * @param {object} options
   * @param {string} options.title - Tiêu đề
   * @param {string} options.message - Nội dung
   * @param {string} options.icon - Biểu tượng
   * @param {string} options.confirmText - Nút Đồng ý
   * @param {string} options.cancelText - Nút Hủy
   * @param {Function} options.onConfirm - Callback khi bấm đồng ý
   * @param {Function} options.onCancel - Callback khi bấm hủy
   */
  static confirm({
    title = "Xác Nhận",
    message = "Bạn có chắc chắn muốn thực hiện hành động này không?",
    icon = "❓",
    confirmText = "Đồng Ý ✨",
    cancelText = "Hủy Bỏ",
    onConfirm = null,
    onCancel = null
  }) {
    const existing = document.getElementById("custom-confirm-dialog");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "custom-confirm-dialog";
    overlay.className = "modal-overlay custom-dialog-overlay";
    overlay.style.display = "flex";

    overlay.innerHTML = `
      <div class="modal-dialog custom-dialog-box anime-bounce-in">
        <div class="custom-dialog-header">
          <div class="custom-dialog-icon">${icon}</div>
          <h3 class="custom-dialog-title">${title}</h3>
        </div>
        <div class="custom-dialog-body">
          <p>${message}</p>
        </div>
        <div class="custom-dialog-footer dual-btn-footer">
          <button class="btn-dialog-cancel" id="btn-custom-confirm-cancel">${cancelText}</button>
          <button class="btn-dialog-confirm" id="btn-custom-confirm-yes">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    if (window.game && window.game.sound) {
      window.game.sound.playButtonClick();
    }

    const cancelBtn = overlay.querySelector("#btn-custom-confirm-cancel");
    const confirmBtn = overlay.querySelector("#btn-custom-confirm-yes");

    cancelBtn.addEventListener("click", () => {
      overlay.remove();
      if (window.game && window.game.sound) window.game.sound.playButtonClick();
      if (onCancel) onCancel();
    });

    confirmBtn.addEventListener("click", () => {
      overlay.remove();
      if (window.game && window.game.sound) window.game.sound.playCoinChime();
      if (onConfirm) onConfirm();
    });
  }

  /**
   * Hiệu ứng tiền xu / tim bay lên từ vị trí phần tử (Floating Number FX)
   */
  static spawnFloatingFx(element, text, isPositive = true) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const fx = document.createElement("div");
    fx.className = `floating-score-fx ${isPositive ? "fx-green" : "fx-red"}`;
    fx.textContent = text;
    fx.style.left = `${rect.left + rect.width / 2 + (Math.random() * 20 - 10)}px`;
    fx.style.top = `${rect.top + 10}px`;
    document.body.appendChild(fx);

    setTimeout(() => {
      if (fx.parentNode) fx.parentNode.removeChild(fx);
    }, 1200);
  }
}
