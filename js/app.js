// ==========================================================
// FILE ĐIỀU PHỐI CHÍNH (APP.JS) - TIỆM TRÀ NHỎ
// Kết nối UI, Sự kiện, Tab Navigation và Logic Game
// ==========================================================

import { txaversion } from "./txaversion.js";
import { NameValidator } from "./filter.js";
import { SpicyNoodleGame } from "./game.js";
import { txatheme } from "./txatheme.js";
import { txacoachmark } from "./txacoachmark.js";
import { GameUIModal } from "./modal.js";

document.addEventListener("DOMContentLoaded", () => {
  // Khởi tạo Theme giao diện
  txatheme.init();

  // Khởi tạo Game Engine
  const game = new SpicyNoodleGame();
  window.game = game;

  // DOM Elements
  const loadingScreen = document.getElementById("loading-screen");
  const loadingProgressBar = document.getElementById("loading-progress-fill");
  const loadingPercent = document.getElementById("loading-percent");
  const loadingTip = document.getElementById("loading-tip-text");
  const btnStartPlay = document.getElementById("btn-start-play");

  const btnQuickTheme = document.getElementById("btn-quick-theme");
  const btnTriggerCoachmark = document.getElementById("btn-trigger-coachmark");
  const btnReplayCoachmark = document.getElementById("btn-replay-coachmark");
  const settingsThemeContainer = document.getElementById("settings-theme-container");

  const nameModal = document.getElementById("modal-name-prompt");
  const nameInput = document.getElementById("input-shop-name");
  const nameWarning = document.getElementById("name-warning-msg");
  const btnConfirmName = document.getElementById("btn-confirm-name");
  const btnTriggerRename = document.getElementById("btn-trigger-rename");
  const btnChalkboardRename = document.getElementById("btn-chalkboard-rename");
  const btnRenameFromSettings = document.getElementById("btn-rename-from-settings");

  const versionModal = document.getElementById("modal-version-update");
  const versionBody = document.getElementById("version-modal-content");
  const btnCloseVersion = document.getElementById("btn-close-version");
  const btnCloseVersionIcon = document.getElementById("btn-close-version-icon");
  const btnFooterChangelog = document.getElementById("btn-footer-changelog");
  const btnShowVersionSettings = document.getElementById("btn-show-version-settings");

  const settingsModal = document.getElementById("modal-settings");
  const btnOpenSettings = document.getElementById("btn-open-settings");
  const btnCloseSettings = document.getElementById("btn-close-settings");

  const btnPrimaryAction = document.getElementById("btn-primary-action");
  const btnBrewSupplies = document.getElementById("btn-brew-supplies");
  const btnDismissTutorial = document.getElementById("btn-dismiss-tutorial");

  const diningModal = document.getElementById("modal-dining-stage");
  const btnViewDining = document.getElementById("btn-view-dining");
  const btnCloseDining = document.getElementById("btn-close-dining");
  const btnFastForwardDay = document.getElementById("btn-fast-forward-day");
  const btnNextDay = document.getElementById("btn-next-day");
  const daySummaryModal = document.getElementById("modal-day-summary");

  // Mẹo hoạt hình khi tải trang
  const loadingTips = [
    "Đang ninh nước dùng xương hầm cùng thảo mộc thơm lừng...",
    "Bé Mèo Mochi đang lau dọn bàn ghế gỗ sồi sạch bóng...",
    "Đang chuẩn bị ớt hiểm 7 cấp độ cay nồng ấm bụng...",
    "Bật điệu nhạc Lo-Fi anime thư giãn cho tiệm mì cay ấm áp..."
  ];

  // 1. Quản lý Màn hình Loading
  let loadProgress = 0;
  let tipIndex = 0;

  const tipInterval = setInterval(() => {
    tipIndex = (tipIndex + 1) % loadingTips.length;
    if (loadingTip) loadingTip.textContent = loadingTips[tipIndex];
  }, 750);

  const loadInterval = setInterval(() => {
    loadProgress += Math.floor(Math.random() * 16) + 10;
    if (loadProgress >= 100) {
      loadProgress = 100;
      clearInterval(loadInterval);
      clearInterval(tipInterval);

      if (loadingProgressBar) loadingProgressBar.style.width = "100%";
      if (loadingPercent) loadingPercent.textContent = "100%";
      if (loadingTip) loadingTip.textContent = "Nồi trà thơm đã sẵn sàng đón thực khách! ✨";

      if (btnStartPlay) {
        btnStartPlay.style.display = "inline-flex";
      }
    } else {
      if (loadingProgressBar) loadingProgressBar.style.width = `${loadProgress}%`;
      if (loadingPercent) loadingPercent.textContent = `${loadProgress}%`;
    }
  }, 100);

  // Kiểm tra quy trình mở tiệm lần đầu & hướng dẫn tân thủ
  function checkFirstTimeFlow() {
    const isFirstNameSetup = !localStorage.getItem("mycay_first_name_set");
    if (isFirstNameSetup) {
      setTimeout(openNamePrompt, 400);
    } else if (txacoachmark.checkShouldShow()) {
      setTimeout(() => {
        new txacoachmark().start();
      }, 500);
    }
  }

  // Nhấn nút vào quán sau khi load xong
  if (btnStartPlay) {
    btnStartPlay.addEventListener("click", () => {
      game.sound.initContext();
      game.sound.startBgm();

      loadingScreen.classList.add("fade-out");
      setTimeout(() => {
        loadingScreen.style.display = "none";
        game.init();

        const verCheck = txaversion.checkNewVersion();
        if (verCheck.isNew) {
          setTimeout(showVersionModal, 500);
        } else {
          checkFirstTimeFlow();
        }
      }, 450);
    });
  }

  // 2. Chuyển đổi 8 Tab Điều Hướng Grid
  document.querySelectorAll(".nav-grid-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      game.switchTab(tabId);
    });
  });

  // 3. Đổi tên tiệm trà (Name Prompt)
  function openNamePrompt() {
    if (!nameModal) return;
    nameModal.style.display = "flex";
    if (nameInput) {
      nameInput.value = game.state.shopName || "Tiệm Mỳ Cay";
      nameInput.focus();
    }
    updateNameValidation(nameInput.value);
  }

  function updateNameValidation(val) {
    const check = NameValidator.validate(val);
    if (!check.isValid) {
      nameWarning.textContent = check.message;
      nameWarning.className = "name-warning-box warning-red visible";
      if (btnConfirmName) btnConfirmName.disabled = true;
    } else {
      nameWarning.textContent = check.message;
      nameWarning.className = "name-warning-box warning-green visible";
      if (btnConfirmName) btnConfirmName.disabled = false;
    }
  }

  if (nameInput) {
    nameInput.addEventListener("input", e => {
      const val = e.target.value;
      if (val.trim() === "") {
        nameWarning.className = "name-warning-box";
        nameWarning.textContent = "";
        if (btnConfirmName) btnConfirmName.disabled = true;
      } else {
        updateNameValidation(val);
      }
    });
  }

  if (btnConfirmName) {
    btnConfirmName.addEventListener("click", () => {
      const val = nameInput.value.trim();
      const check = NameValidator.validate(val);
      if (!check.isValid) {
        updateNameValidation(val);
        return;
      }

      game.state.shopName = val;
      game.saveGame();
      game.renderHeader();
      game.renderChalkboardBanner();
      game.sound.playCoinChime();
      nameModal.style.display = "none";
      localStorage.setItem("mycay_first_name_set", "true");

      GameUIModal.showToast(`Biển hiệu "${val}" đã được treo lên! Khai trương hồng phát! 🎉`, "success", "🏮");

      if (txacoachmark.checkShouldShow()) {
        setTimeout(() => {
          new txacoachmark().start();
        }, 400);
      }
    });
  }

  if (btnTriggerRename) btnTriggerRename.addEventListener("click", openNamePrompt);
  if (btnChalkboardRename) btnChalkboardRename.addEventListener("click", openNamePrompt);
  if (btnRenameFromSettings) {
    btnRenameFromSettings.addEventListener("click", () => {
      settingsModal.style.display = "none";
      openNamePrompt();
    });
  }

  // Đổi nhanh Theme Anime ở thanh Header
  if (btnQuickTheme) {
    btnQuickTheme.addEventListener("click", () => {
      const nextTheme = txatheme.cycleTheme();
      GameUIModal.showToast(`Đã đổi theme: ${nextTheme.name}`, "info", nextTheme.icon);
    });
  }

  // Nút mở Spotlight Coachmark từ Header
  if (btnTriggerCoachmark) {
    btnTriggerCoachmark.addEventListener("click", () => {
      game.sound.playButtonClick();
      new txacoachmark().start();
    });
  }

  // Nút xem lại Coachmark từ Cài đặt
  if (btnReplayCoachmark) {
    btnReplayCoachmark.addEventListener("click", () => {
      settingsModal.style.display = "none";
      game.sound.playButtonClick();
      setTimeout(() => {
        new txacoachmark().start();
      }, 200);
    });
  }

  // 4. Modal Phiên bản mới
  function showVersionModal() {
    if (!versionModal || !versionBody) return;
    versionBody.innerHTML = txaversion.renderChangelogCards();
    versionModal.style.display = "flex";
    game.sound.playReviewChime();
  }

  if (btnCloseVersion) {
    btnCloseVersion.addEventListener("click", () => {
      txaversion.markAsSeen();
      versionModal.style.display = "none";
      game.sound.playButtonClick();
      checkFirstTimeFlow();
    });
  }

  if (btnCloseVersionIcon) {
    btnCloseVersionIcon.addEventListener("click", () => {
      versionModal.style.display = "none";
      game.sound.playButtonClick();
      checkFirstTimeFlow();
    });
  }

  if (btnFooterChangelog) {
    btnFooterChangelog.addEventListener("click", showVersionModal);
  }

  if (btnShowVersionSettings) {
    btnShowVersionSettings.addEventListener("click", () => {
      settingsModal.style.display = "none";
      showVersionModal();
    });
  }

  // Khởi tạo danh sách Theme Options trong Modal Settings
  function initThemeOptions() {
    if (!settingsThemeContainer) return;
    settingsThemeContainer.innerHTML = txatheme.renderThemeOptionsHTML();
    settingsThemeContainer.querySelectorAll(".theme-card-option").forEach(card => {
      card.addEventListener("click", () => {
        const themeId = card.getAttribute("data-theme-id");
        txatheme.setTheme(themeId, true);
        const themeObj = txatheme.THEMES.find(t => t.id === themeId);
        if (themeObj) {
          GameUIModal.showToast(`Đã áp dụng theme: ${themeObj.name}`, "success", themeObj.icon);
        }
      });
    });
  }

  // 5. Cài đặt Game (Settings Modal)
  if (btnOpenSettings) {
    btnOpenSettings.addEventListener("click", () => {
      updateSettingsUI();
      initThemeOptions();
      settingsModal.style.display = "flex";
      game.sound.playButtonClick();
    });
  }

  if (btnCloseSettings) {
    btnCloseSettings.addEventListener("click", () => {
      settingsModal.style.display = "none";
      game.sound.playButtonClick();
    });
  }

  function updateSettingsUI() {
    const bgmToggle = document.getElementById("setting-bgm-toggle");
    const sfxToggle = document.getElementById("setting-sfx-toggle");
    const bgmVol = document.getElementById("setting-bgm-vol");
    const sfxVol = document.getElementById("setting-sfx-vol");
    const speedSelect = document.getElementById("setting-game-speed");
    const particlesToggle = document.getElementById("setting-particles-toggle");

    if (bgmToggle) bgmToggle.checked = game.sound.bgmEnabled;
    if (sfxToggle) sfxToggle.checked = game.sound.sfxEnabled;
    if (bgmVol) bgmVol.value = game.sound.bgmVolume * 100;
    if (sfxVol) sfxVol.value = game.sound.sfxVolume * 100;
    if (speedSelect) speedSelect.value = game.gameSpeed.toString();
    if (particlesToggle) particlesToggle.checked = game.particlesEnabled;
  }

  const bgmToggle = document.getElementById("setting-bgm-toggle");
  if (bgmToggle) {
    bgmToggle.addEventListener("change", e => game.sound.toggleBgm(e.target.checked));
  }

  const sfxToggle = document.getElementById("setting-sfx-toggle");
  if (sfxToggle) {
    sfxToggle.addEventListener("change", e => game.sound.toggleSfx(e.target.checked));
  }

  const bgmVol = document.getElementById("setting-bgm-vol");
  if (bgmVol) {
    bgmVol.addEventListener("input", e => game.sound.setBgmVolume(e.target.value / 100));
  }

  const sfxVol = document.getElementById("setting-sfx-vol");
  if (sfxVol) {
    sfxVol.addEventListener("input", e => game.sound.setSfxVolume(e.target.value / 100));
  }

  const speedSelect = document.getElementById("setting-game-speed");
  if (speedSelect) {
    speedSelect.addEventListener("change", e => {
      game.gameSpeed = parseFloat(e.target.value) || 1;
    });
  }

  const particlesToggle = document.getElementById("setting-particles-toggle");
  if (particlesToggle) {
    particlesToggle.addEventListener("change", e => {
      game.particlesEnabled = e.target.checked;
      const container = document.getElementById("sakura-particles");
      if (container) container.style.display = e.target.checked ? "block" : "none";
    });
  }

  const btnResetData = document.getElementById("btn-reset-game-data");
  if (btnResetData) {
    btnResetData.addEventListener("click", () => {
      settingsModal.style.display = "none";
      game.resetGame();
    });
  }

  // 6. Tutorial dismiss
  if (btnDismissTutorial) {
    btnDismissTutorial.addEventListener("click", () => {
      game.state.tutorialDismissed = true;
      game.saveGame();
      const box = document.getElementById("tutorial-tooltip-kho");
      if (box) box.style.display = "none";
      const glowBtn = document.querySelector(".btn-stepper.highlight-glow");
      if (glowBtn) glowBtn.classList.remove("highlight-glow");
    });
  }

  // 7. Nấu & nhận nguyên liệu
  if (btnBrewSupplies) {
    btnBrewSupplies.addEventListener("click", () => {
      game.brewSupplies();
    });
  }

  // 8. Nút Mở cửa ngày (Primary Action)
  if (btnPrimaryAction) {
    btnPrimaryAction.addEventListener("click", () => {
      game.startOpenDay();
    });
  }

  // 9. Xem quán ăn trực tiếp
  // 9. Xem quán ăn trực tiếp
  const btnOpenViewDining = document.getElementById("btn-open-view-dining");

  if (btnViewDining) {
    btnViewDining.addEventListener("click", () => {
      if (diningModal) {
        diningModal.style.display = "flex";
        game.renderDiningStage();
      }
    });
  }

  if (btnOpenViewDining) {
    btnOpenViewDining.addEventListener("click", () => {
      if (diningModal) {
        diningModal.style.display = "flex";
        game.renderDiningStage();
      }
    });
  }

  if (btnCloseDining) {
    btnCloseDining.addEventListener("click", () => {
      if (diningModal) diningModal.style.display = "none";
    });
  }

  if (btnFastForwardDay) {
    btnFastForwardDay.addEventListener("click", () => {
      game.fastForwardDay();
    });
  }

  if (btnNextDay) {
    btnNextDay.addEventListener("click", () => {
      if (daySummaryModal) daySummaryModal.style.display = "none";
      game.renderAll();
    });
  }

  // 10. Tạm dừng ca bán & Đổ niêu làm lại
  const btnPauseOpen = document.getElementById("btn-pause-open");
  const btnHeaderPause = document.getElementById("btn-header-pause");
  const btnClearPot = document.getElementById("btn-clear-pot");

  if (btnPauseOpen) {
    btnPauseOpen.addEventListener("click", () => game.pauseShift());
  }
  if (btnHeaderPause) {
    btnHeaderPause.addEventListener("click", () => game.pauseShift());
  }
  if (btnClearPot) {
    btnClearPot.addEventListener("click", () => game.clearCurrentPot());
  }

  // 11. Giao niêu mì cho Shipper trong ca bán trực tiếp
  const btnOpenHandover = document.getElementById("btn-open-handover");
  if (btnOpenHandover) {
    btnOpenHandover.addEventListener("click", () => {
      game.handoverToShipper(false);
    });
  }

  // 12. Hồ sơ Chủ Tiệm Mì Cay
  const btnOwnerProfile = document.getElementById("btn-owner-profile");
  const btnCloseOwner = document.getElementById("btn-close-owner");
  const btnSaveOwner = document.getElementById("btn-save-owner-profile");
  const ownerModal = document.getElementById("modal-owner-profile");

  if (btnOwnerProfile) {
    btnOwnerProfile.addEventListener("click", () => {
      game.showOwnerProfileModal();
    });
  }

  if (btnCloseOwner) {
    btnCloseOwner.addEventListener("click", () => {
      if (ownerModal) ownerModal.style.display = "none";
    });
  }

  if (btnSaveOwner) {
    btnSaveOwner.addEventListener("click", () => {
      game.saveOwnerProfile();
    });
  }

  // Lắng nghe chọn hình tượng đại diện chủ tiệm
  document.querySelectorAll(".owner-avatar-opt").forEach(opt => {
    opt.addEventListener("click", () => {
      const avatar = opt.getAttribute("data-avatar");
      const name = opt.getAttribute("data-name");
      game.selectOwnerAvatar(avatar, name);
    });
  });

  // Cánh hoa anh đào
  createSakuraParticles();

  function createSakuraParticles() {
    const container = document.getElementById("sakura-particles");
    if (!container) return;

    for (let i = 0; i < 14; i++) {
      const petal = document.createElement("div");
      petal.className = "sakura-petal";
      petal.style.left = `${Math.random() * 100}%`;
      petal.style.animationDuration = `${6 + Math.random() * 6}s`;
      petal.style.animationDelay = `${Math.random() * 5}s`;
      petal.style.opacity = (0.25 + Math.random() * 0.4).toFixed(2);
      petal.style.transform = `scale(${0.6 + Math.random() * 0.6})`;
      container.appendChild(petal);
    }
  }

  // Phím tắt bàn phím tiện lợi trên Desktop (Keyboard Shortcuts)
  window.addEventListener("keydown", (e) => {
    // Không nhận phím tắt nếu đang gõ chữ trong ô input / textarea
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    if (game.state.dayPhase === "open") {
      if (e.key === "1") {
        e.preventDefault();
        window.game.serveToSlot(0);
      } else if (e.key === "2") {
        e.preventDefault();
        window.game.serveToSlot(1);
      } else if (e.key === "3") {
        e.preventDefault();
        window.game.serveToSlot(2);
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        window.game.handoverToShipper();
      } else if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        window.game.clearCurrentPot();
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (game.isPaused) game.resumeShift();
        else game.pauseShift();
      }
    }
  });
});
