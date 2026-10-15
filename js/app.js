// ==========================================================
// FILE ĐIỀU PHỐI CHÍNH (APP.JS) - TIỆM TRÀ NHỎ
// Kết nối UI, Sự kiện, Tab Navigation và Logic Game
// ==========================================================

import { txaversion } from "./txaversion.js?v=1.5.5";
import { NameValidator } from "./filter.js?v=1.5.5";
import { SpicyNoodleGame } from "./game.js?v=1.5.5";
import { txatheme } from "./txatheme.js?v=1.5.5";
import { txacoachmark } from "./txacoachmark.js?v=1.5.5";
import { txaqr } from "./txaqr.js?v=1.5.5";
import { GameUIModal } from "./modal.js?v=1.5.5";
import { realtimeStats } from "./realtime-stats.js?v=1.5.5";

document.addEventListener("DOMContentLoaded", () => {
  // Khởi tạo Theme giao diện
  txatheme.init();

  // Khởi tạo Thống Kê Realtime Online & Lượt Truy Cập Thực Tế (Chống spam)
  realtimeStats.init();

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

  // Mẹo hoạt hình và các trạng thái khi tải trang
  const loadingStages = [
    { text: "Đang ninh nước dùng xương hầm cùng thảo mộc thơm lừng... 🍲", targetPct: 22 },
    { text: "Bé Mèo Mochi đang lau dọn bàn ghế gỗ sồi sạch bóng... 🪑", targetPct: 45 },
    { text: "Đang chuẩn bị ớt hiểm 7 cấp độ cay nồng ấm bụng... 🌶️", targetPct: 68 },
    { text: "Bật điều hòa Daikin mát rượi và giai điệu Lo-Fi anime thư giãn... ❄️🎵", targetPct: 88 },
    { text: "Kích hoạt Giờ Vàng FEVER RUSH & sẵn sàng đón khách VIP... 👑✨", targetPct: 100 }
  ];

  // 1. Quản lý Màn hình Loading mượt mà hiển thị đủ toàn bộ trạng thái
  let currentStageIdx = 0;
  let loadProgress = 0;
  if (loadingTip) loadingTip.textContent = loadingStages[0].text;

  const loadInterval = setInterval(() => {
    const currentStage = loadingStages[currentStageIdx];

    if (loadProgress < currentStage.targetPct) {
      loadProgress += 1;
      if (loadingProgressBar) loadingProgressBar.style.width = `${loadProgress}%`;
      if (loadingPercent) loadingPercent.textContent = `${loadProgress}%`;
    }

    if (loadProgress >= currentStage.targetPct) {
      if (currentStageIdx < loadingStages.length - 1) {
        currentStageIdx++;
        if (loadingTip) loadingTip.textContent = loadingStages[currentStageIdx].text;
      } else {
        clearInterval(loadInterval);
        if (loadingProgressBar) loadingProgressBar.style.width = "100%";
        if (loadingPercent) loadingPercent.textContent = "100%";
        if (loadingTip) loadingTip.textContent = "Tiệm mì cay đã sẵn sàng mở cửa đón thực khách! 🍜✨";

        if (btnStartPlay) {
          btnStartPlay.style.display = "inline-flex";
        }
      }
    }
  }, 38);

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

  // 6. Modal Mã QR Chơi Cùng Bạn Bè (txaqr)
  const modalQrShare = document.getElementById("modal-qr-share");
  const btnOpenQrModal = document.getElementById("btn-open-qr-modal");
  const btnCloseQrModal = document.getElementById("btn-close-qr-modal");
  const qrCanvas = document.getElementById("qr-code-canvas");
  const qrUrlInput = document.getElementById("qr-share-url-input");
  const btnCopyQrUrl = document.getElementById("btn-copy-qr-url");
  const btnDownloadQr = document.getElementById("btn-download-qr");
  const qrDownloadStatus = document.getElementById("qr-download-status");

  function openQrModal() {
    if (!modalQrShare || !qrCanvas) return;
    if (settingsModal) settingsModal.style.display = "none";
    modalQrShare.style.display = "flex";
    if (game.sound) game.sound.playReviewChime();

    let shareUrl = window.location.href;
    if (window.location.protocol === "file:" || !window.location.origin || window.location.origin === "null") {
      shareUrl = "https://tmc.txasoftdev.workers.dev/";
    } else {
      shareUrl = window.location.origin + window.location.pathname;
    }

    if (qrUrlInput) qrUrlInput.value = shareUrl;
    if (qrDownloadStatus) {
      qrDownloadStatus.textContent = "";
      qrDownloadStatus.className = "qr-status-feedback";
    }

    // Render mã QR độc lập với logo ở giữa
    txaqr.renderToCanvas(qrCanvas, shareUrl, "assets/logo.png");
  }

  if (btnOpenQrModal) {
    btnOpenQrModal.addEventListener("click", openQrModal);
  }

  if (btnCloseQrModal) {
    btnCloseQrModal.addEventListener("click", () => {
      modalQrShare.style.display = "none";
      if (game.sound) game.sound.playButtonClick();
    });
  }

  if (modalQrShare) {
    modalQrShare.addEventListener("click", (e) => {
      if (e.target === modalQrShare) {
        modalQrShare.style.display = "none";
      }
    });
  }

  if (btnCopyQrUrl) {
    btnCopyQrUrl.addEventListener("click", async () => {
      const shareUrl = qrUrlInput ? qrUrlInput.value : window.location.href;
      try {
        await navigator.clipboard.writeText(shareUrl);
        GameUIModal.showToast("Đã sao chép link game vào bộ nhớ tạm!", "success", "📋");
      } catch (err) {
        if (qrUrlInput) {
          qrUrlInput.select();
          document.execCommand("copy");
          GameUIModal.showToast("Đã sao chép link game!", "success", "📋");
        }
      }
    });
  }

  if (btnDownloadQr) {
    btnDownloadQr.addEventListener("click", () => {
      if (game.sound) game.sound.playButtonClick();
      const res = txaqr.downloadQR(qrCanvas, "tiem-my-cay-qr.png");
      if (qrDownloadStatus) {
        qrDownloadStatus.textContent = res.message;
        qrDownloadStatus.className = res.success ? "qr-status-feedback success" : "qr-status-feedback error";
      }
      GameUIModal.showToast(res.message, res.success ? "success" : "warning", res.success ? "📥" : "⚠️");
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

  // ==========================================================
  // 13. PWA OFFLINE SUPPORT & CÀI ĐẶT ỨNG DỤNG (SERVICE WORKER)
  // ==========================================================
  let deferredPrompt = null;
  const btnHeaderInstall = document.getElementById("btn-header-install");
  const btnInstallPwa = document.getElementById("btn-install-pwa");
  const pwaInstallDesc = document.getElementById("pwa-install-status-text");
  const btnInstallBadge = document.getElementById("btn-install-pwa-badge");
  const headerOfflineBadge = document.getElementById("header-offline-badge");

  // Kiểm tra trạng thái mạng Online / Offline
  function updateNetworkStatus() {
    const isOnline = navigator.onLine;
    if (headerOfflineBadge) {
      headerOfflineBadge.style.display = isOnline ? "none" : "inline-flex";
    }
  }
  window.addEventListener("online", () => {
    updateNetworkStatus();
    GameUIModal.showToast("🟢 Đã có kết nối Internet trở lại!", "success", "📶");
  });
  window.addEventListener("offline", () => {
    updateNetworkStatus();
    GameUIModal.showToast("📡 Đang chơi Chế Độ Offline (Không Mạng) - Dữ liệu vẫn lưu an toàn trên máy!", "info", "🍜");
  });
  updateNetworkStatus();

  // Kiểm tra xem người dùng đã cài đặt App hay đang chạy Standalone PWA chưa
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isStandalone) {
    if (pwaInstallDesc) pwaInstallDesc.textContent = "Bạn đã cài đặt Tiệm Mỳ Cay vào màn hình chính rồi!";
    if (btnInstallBadge) btnInstallBadge.textContent = "Đã Cài Đặt ✓";
    if (btnHeaderInstall) btnHeaderInstall.style.display = "none";
  }

  // Bắt sự kiện beforeinstallprompt từ trình duyệt (Chrome, Edge, Android...)
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnHeaderInstall && !isStandalone) {
      btnHeaderInstall.style.display = "inline-flex";
    }
    if (pwaInstallDesc && !isStandalone) {
      pwaInstallDesc.textContent = "Nhấn để cài App lên màn hình chính, chơi Offline không cần mạng!";
    }
  });

  // Xử lý khi bấm nút Cài đặt App
  async function triggerPwaInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        GameUIModal.showToast("Đang cài đặt Tiệm Mỳ Cay vào màn hình chính...", "success", "📲");
      }
      deferredPrompt = null;
      if (btnHeaderInstall) btnHeaderInstall.style.display = "none";
    } else {
      // Hướng dẫn cài đặt thủ công nếu trình duyệt không hỗ trợ beforeinstallprompt trực tiếp (ví dụ iOS Safari)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        GameUIModal.alert({
          title: "📲 Cài App Trên iPhone / iPad",
          message: "Để chơi Offline trên iOS: Bấm nút <strong>Chia sẻ (Share) 📤</strong> ở thanh dưới Safari, sau đó chọn <strong>'Thêm vào Màn hình chính' (Add to Home Screen) ➕</strong>!",
          icon: "📱"
        });
      } else {
        GameUIModal.alert({
          title: "📲 Cài App Chơi Offline",
          message: "Game đã sẵn sàng chơi Offline! Bạn có thể chọn menu 'Cài đặt ứng dụng' (Install App) hoặc 'Thêm vào màn hình chính' trên menu trình duyệt để mở game nhanh không cần mạng.",
          icon: "✨"
        });
      }
    }
  }

  if (btnHeaderInstall) {
    btnHeaderInstall.addEventListener("click", triggerPwaInstall);
  }
  if (btnInstallPwa) {
    btnInstallPwa.addEventListener("click", triggerPwaInstall);
  }

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    if (btnHeaderInstall) btnHeaderInstall.style.display = "none";
    if (btnInstallBadge) btnInstallBadge.textContent = "Đã Cài Đặt ✓";
    if (pwaInstallDesc) pwaInstallDesc.textContent = "Đã cài đặt Tiệm Mỳ Cay thành công!";
    GameUIModal.showToast("🎉 Đã cài đặt Tiệm Mỳ Cay thành công! Bây giờ bạn có thể mở chơi bất cứ lúc nào kể cả khi tắt mạng!", "success", "🏆");
  });

  // Đăng ký Service Worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker đã đăng ký thành công:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Đăng ký Service Worker thất bại:", err);
        });
    });
  }

  // ==========================================================
  // 14. HỆ THỐNG TOOLTIP TÙY CHỈNH COZY (GLOBAL COZY TOOLTIP)
  // Tự động chuyển đổi toàn bộ thẻ có title="..." thành tooltip Anime xịn sò
  // ==========================================================
  function initCozyCustomTooltip() {
    let tooltipEl = document.getElementById("cozy-custom-tooltip");
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.id = "cozy-custom-tooltip";
      tooltipEl.className = "cozy-custom-tooltip";
      tooltipEl.setAttribute("role", "tooltip");
      tooltipEl.setAttribute("aria-hidden", "true");
      tooltipEl.innerHTML = `<span class="cozy-tooltip-text"></span><div class="cozy-tooltip-arrow"></div>`;
      document.body.appendChild(tooltipEl);
    }

    const textEl = tooltipEl.querySelector(".cozy-tooltip-text");
    const arrowEl = tooltipEl.querySelector(".cozy-tooltip-arrow");
    let activeTarget = null;
    let hideTimer = null;

    function showTooltip(target) {
      if (!target) return;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }

      // Nếu phần tử có title, chuyển sang data-cozy-tooltip và xóa title để chặn tooltip mặc định của trình duyệt
      if (target.hasAttribute("title")) {
        const titleStr = target.getAttribute("title").trim();
        if (titleStr) {
          target.setAttribute("data-cozy-tooltip", titleStr);
        }
        target.removeAttribute("title");
      }

      const content = target.getAttribute("data-cozy-tooltip");
      if (!content || !content.trim()) {
        hideTooltip();
        return;
      }

      activeTarget = target;
      textEl.textContent = content.trim();

      // Đặt tạm để đo kích thước
      tooltipEl.style.left = "-9999px";
      tooltipEl.style.top = "-9999px";
      tooltipEl.classList.add("is-visible");

      requestAnimationFrame(() => {
        if (activeTarget !== target) return;
        const rect = target.getBoundingClientRect();
        const tipRect = tooltipEl.getBoundingClientRect();

        // Tính vị trí X (ngang)
        let left = rect.left + (rect.width / 2) - (tipRect.width / 2);
        left = Math.max(8, Math.min(window.innerWidth - tipRect.width - 8, left));

        // Tính vị trí Y (dọc)
        let top = rect.top - tipRect.height - 8;
        let placement = "placement-top";

        // Nếu sát mép trên màn hình quá thì đẩy xuống phía dưới phần tử
        if (top < 6) {
          top = rect.bottom + 8;
          placement = "placement-bottom";
        }

        tooltipEl.className = `cozy-custom-tooltip is-visible ${placement}`;
        tooltipEl.style.left = `${Math.round(left)}px`;
        tooltipEl.style.top = `${Math.round(top)}px`;

        // Định vị mũi tên trỏ chuẩn vào tâm phần tử
        if (arrowEl) {
          const arrowOffset = Math.max(6, Math.min(tipRect.width - 13, rect.left + (rect.width / 2) - left - 3.5));
          arrowEl.style.left = `${Math.round(arrowOffset)}px`;
        }
      });
    }

    function hideTooltip() {
      activeTarget = null;
      if (tooltipEl) {
        tooltipEl.classList.remove("is-visible");
      }
    }

    // Lắng nghe sự kiện rê chuột qua Event Delegation trên document
    document.addEventListener("mouseover", (e) => {
      const target = e.target.closest("[title], [data-cozy-tooltip]");
      if (target) {
        showTooltip(target);
      }
    }, true);

    document.addEventListener("mouseout", (e) => {
      const target = e.target.closest("[title], [data-cozy-tooltip]");
      if (target && target === activeTarget) {
        hideTooltip();
      }
    }, true);

    // Khi click hoặc cuộn chuột thì ẩn tooltip đi
    document.addEventListener("click", () => hideTooltip(), true);
    window.addEventListener("scroll", () => hideTooltip(), { passive: true });
  }

  initCozyCustomTooltip();
});
