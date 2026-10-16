// ==========================================================
// HỆ THỐNG BẢO MẬT & PHÒNG HỘ AN NINH TIỆM MỲ CAY (SECURITY SHIELD)
// Chặn F12, DevTools, Debugger Trap, Mã Hóa Nhận Diện Thiết Bị & Khóa Vĩnh Viễn Khi Tái Phạm
// Hỗ Trợ Chế Độ Admin Developer (Bật F12 Để Soi Lỗi & Gỡ Khóa Khẩn Cấp)
// ==========================================================

const SUPABASE_SEC_URL = "https://camnragrlqzmcxtgvukj.supabase.co";
const SUPABASE_SEC_KEY = "sb_publishable_nWBCfr-d5ZSuk5e5ULrpZQ_zVFp_nUh";

// Mã bí mật dành riêng cho Admin để mở F12 & Unban thiết bị
const ADMIN_MASTER_KEY = "TXA_DEV_ADMIN_2026";

class SecurityShield {
  constructor() {
    this.deviceId = null;
    this.isLocked = false;
    this.isPermanentBan = false;
    this.isAdminDevMode = false;
    this.lockCount = 0;
    this.remainingSeconds = 0;
    this.lockTimerInterval = null;
    this.strikeCount = 0;
    this.isChecking = false;
    this.supabaseClient = null;
  }

  // Nhận diện thiết bị di động (Mobile / Tablet) để tránh false-positive
  isMobileOrTablet() {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isMacTouch = navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
    const isSmallTouchScreen = typeof window !== "undefined" && window.innerWidth <= 820 && (navigator.maxTouchPoints || 0) > 0;
    return isMobileUa || isMacTouch || isSmallTouchScreen;
  }

  // 1. Tạo dấu vân tay phần cứng duy nhất (Hardware Fingerprint)
  // Không phụ thuộc vào cookie/localStorage hay trình duyệt cụ thể
  // Đổi từ Chrome sang Firefox, Edge, Brave trên cùng một máy vẫn cho ra cùng 1 ID phần cứng!
  generateHardwareFingerprint() {
    const specs = [];

    // Màn hình & Hiển thị phần cứng
    specs.push(`${window.screen.width}x${window.screen.height}`);
    specs.push(window.screen.colorDepth || 24);
    specs.push(window.devicePixelRatio || 1);

    // Phần cứng máy tính (Số nhân CPU, RAM, Nền tảng OS)
    specs.push(navigator.hardwareConcurrency || 4);
    specs.push(navigator.deviceMemory || 8);
    specs.push(navigator.platform || "unknown");
    specs.push(navigator.language || "vi");
    try {
      specs.push(Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh");
    } catch (e) {
      specs.push("GMT+7");
    }

    // Canvas 2D Engine Fingerprint (kết xuất font và viền đặc thù của OS & GPU)
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 220;
      canvas.height = 50;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px 'Nunito', 'Segoe UI', sans-serif";
        ctx.fillStyle = "#FF4500";
        ctx.fillRect(8, 8, 50, 25);
        ctx.fillStyle = "#00CED1";
        ctx.fillText("TiệmMỳCay🍜🔒🌶️✨", 12, 12);
        ctx.strokeStyle = "#8A2BE2";
        ctx.beginPath();
        ctx.arc(80, 25, 15, 0, Math.PI * 2);
        ctx.stroke();
        specs.push(canvas.toDataURL());
      }
    } catch (e) {}

    // WebGL GPU Renderer Fingerprint (Card màn hình vật lý thực tế của máy)
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          specs.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "");
          specs.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "");
        }
      }
    } catch (e) {}

    // Hash chuỗi thông số phần cứng thành mã ID ngắn gọn cố định
    const raw = specs.join("###");
    let h1 = 0xdeadbeef;
    let h2 = 0x41c64e6d;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hex = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).toUpperCase();
    return "MC-DEV-" + hex.substring(0, 8);
  }

  // 2. Chế độ Admin Developer (Bật F12, Xem lỗi, Gỡ khóa khẩn cấp)
  checkAdminDevMode() {
    // A. Kiểm tra session đã xác thực trước đó
    try {
      if (sessionStorage.getItem("mycay_admin_dev_mode") === "true") {
        this.enableAdminDevMode(false);
        return true;
      }
    } catch (e) {}

    // B. Kiểm tra tham số bí mật trên URL: ?dev_key=TXA_DEV_ADMIN_2026 hoặc #dev_key=...
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, "?"));
      const token = urlParams.get("dev_key") || hashParams.get("dev_key");

      if (token === ADMIN_MASTER_KEY) {
        // Tự động xóa token khỏi thanh URL để giữ kín
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        this.enableAdminDevMode(true);
        return true;
      }
    } catch (e) {}

    return false;
  }

  // Kích hoạt quyền Admin Developer
  async enableAdminDevMode(showToast = true) {
    this.isAdminDevMode = true;
    this.isLocked = false;
    this.isPermanentBan = false;
    this.strikeCount = 0;

    try {
      sessionStorage.setItem("mycay_admin_dev_mode", "true");
      localStorage.removeItem("mycay_sec_lock");
      sessionStorage.removeItem("mycay_sec_lock");
      localStorage.removeItem("mycay_sec_strikes");
      await this.clearIndexedDB();
    } catch (e) {}

    // Gọi lệnh giải phóng khóa thiết bị này trên Supabase nếu đang bị khóa
    if (this.deviceId) {
      const client = this.getSupabaseClient();
      if (client) {
        try {
          await client.rpc("admin_unlock_device", {
            p_device_id: this.deviceId,
            p_admin_key: ADMIN_MASTER_KEY
          });
        } catch (e) {}
      }
    }

    // Tắt modal khóa nếu đang mở
    const modal = document.getElementById("modal-security-lockout");
    if (modal) {
      modal.style.display = "none";
    }
    document.body.classList.remove("is-device-locked");

    // Hiển thị huy hiệu Admin Dev Mode ở góc dưới
    this.renderAdminDevBadge();

    if (showToast) {
      this.showTemporaryWarning("🛠️ ADMIN DEV MODE ĐÃ BẬT: F12 & DevTools đã được mở khóa!");
    }
  }

  // Hiển thị huy hiệu Admin ở góc màn hình
  renderAdminDevBadge() {
    let badge = document.getElementById("sec-admin-dev-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "sec-admin-dev-badge";
      badge.className = "sec-admin-dev-badge";
      badge.innerHTML = `🛠️ ADMIN DEV (F12 ON) <button id="btn-sec-exit-admin" title="Thoát chế độ Admin">✕</button>`;
      document.body.appendChild(badge);

      const btnExit = document.getElementById("btn-sec-exit-admin");
      if (btnExit) {
        btnExit.addEventListener("click", () => {
          sessionStorage.removeItem("mycay_admin_dev_mode");
          window.location.reload();
        });
      }
    }
  }

  // Mở hộp thoại xác thực Admin bằng Master Key
  promptAdminAuth() {
    const key = window.prompt("🔑 [XÁC THỰC ADMIN TIỆM MỲ CAY]\nNhập Master Key của Admin để kích hoạt DevTools hoặc mở khóa thiết bị:");
    if (key === ADMIN_MASTER_KEY) {
      this.enableAdminDevMode(true);
    } else if (key !== null) {
      alert("❌ Sai mã Admin Master Key! Quyền truy cập bị từ chối.");
    }
  }

  // 3. Hệ thống lưu trữ nhiều tầng (Evercookie-style): IndexedDB + LocalStorage + SessionStorage
  async getLocalLock() {
    if (this.isAdminDevMode) return 0;

    // Tầng 1: LocalStorage
    try {
      const raw = localStorage.getItem("mycay_sec_lock");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.isPermanentBan) {
          this.isPermanentBan = true;
          this.lockCount = 2;
          return 999999999;
        }
        if (parsed.lockCount) {
          this.lockCount = Math.max(this.lockCount, parsed.lockCount);
        }
        if (parsed.lockedUntil && parsed.lockedUntil > Date.now()) {
          return Math.ceil((parsed.lockedUntil - Date.now()) / 1000);
        }
      }
    } catch (e) {}

    // Tầng 2: SessionStorage
    try {
      const raw = sessionStorage.getItem("mycay_sec_lock");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.isPermanentBan) {
          this.isPermanentBan = true;
          this.lockCount = 2;
          return 999999999;
        }
        if (parsed.lockCount) {
          this.lockCount = Math.max(this.lockCount, parsed.lockCount);
        }
        if (parsed.lockedUntil && parsed.lockedUntil > Date.now()) {
          return Math.ceil((parsed.lockedUntil - Date.now()) / 1000);
        }
      }
    } catch (e) {}

    // Tầng 3: IndexedDB
    try {
      const idbData = await this.readFromIndexedDB();
      if (idbData) {
        if (idbData.isPermanentBan) {
          this.isPermanentBan = true;
          this.lockCount = 2;
          return 999999999;
        }
        if (idbData.lockCount) {
          this.lockCount = Math.max(this.lockCount, idbData.lockCount);
        }
        if (idbData.lockedUntil && idbData.lockedUntil > Date.now()) {
          return Math.ceil((idbData.lockedUntil - Date.now()) / 1000);
        }
      }
    } catch (e) {}

    return 0;
  }

  async saveLocalLock(seconds, isPermanent = false) {
    if (this.isAdminDevMode) return;

    const lockedUntil = isPermanent ? 9999999999999 : Date.now() + seconds * 1000;
    const payload = JSON.stringify({ 
      lockedUntil, 
      deviceId: this.deviceId,
      isPermanentBan: isPermanent,
      lockCount: this.lockCount
    });

    try { localStorage.setItem("mycay_sec_lock", payload); } catch (e) {}
    try { sessionStorage.setItem("mycay_sec_lock", payload); } catch (e) {}
    try { await this.saveToIndexedDB(lockedUntil, isPermanent); } catch (e) {}
  }

  clearLocalLock() {
    if (this.isPermanentBan && !this.isAdminDevMode) return;

    try { localStorage.removeItem("mycay_sec_lock"); } catch (e) {}
    try { sessionStorage.removeItem("mycay_sec_lock"); } catch (e) {}
    try { localStorage.removeItem("mycay_sec_strikes"); } catch (e) {}
    try { this.clearIndexedDB(); } catch (e) {}
  }

  // Thao tác với IndexedDB độc lập
  openIDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return resolve(null);
      const req = indexedDB.open("mycay_security_vault", 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("locks")) {
          db.createObjectStore("locks", { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }

  async readFromIndexedDB() {
    const db = await this.openIDB();
    if (!db) return null;
    return new Promise(resolve => {
      try {
        const tx = db.transaction("locks", "readonly");
        const store = tx.objectStore("locks");
        const req = store.get(this.deviceId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  async saveToIndexedDB(lockedUntil, isPermanent = false) {
    const db = await this.openIDB();
    if (!db) return;
    try {
      const tx = db.transaction("locks", "readwrite");
      const store = tx.objectStore("locks");
      store.put({ 
        id: this.deviceId, 
        lockedUntil, 
        isPermanentBan: isPermanent,
        lockCount: this.lockCount
      });
    } catch (e) {}
  }

  async clearIndexedDB() {
    if (this.isPermanentBan && !this.isAdminDevMode) return;
    const db = await this.openIDB();
    if (!db) return;
    try {
      const tx = db.transaction("locks", "readwrite");
      const store = tx.objectStore("locks");
      store.delete(this.deviceId);
    } catch (e) {}
  }

  // 4. Khởi tạo Supabase client phụ trách bảo mật
  getSupabaseClient() {
    if (this.supabaseClient) return this.supabaseClient;
    if (typeof window.supabase !== "undefined" && typeof window.supabase.createClient === "function") {
      this.supabaseClient = window.supabase.createClient(SUPABASE_SEC_URL, SUPABASE_SEC_KEY);
      return this.supabaseClient;
    }
    return null;
  }

  // 5. Kiểm tra trạng thái khóa từ Supabase (Đính theo mã phần cứng thiết bị)
  async checkCloudLock() {
    if (this.isAdminDevMode) return null;
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;

    const client = this.getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client.rpc("check_device_lock", {
        p_device_id: this.deviceId
      });

      if (!error && data) {
        return data; // { is_locked, is_permanent_ban, remaining_seconds, lock_count, strikes }
      }
    } catch (e) {}
    return null;
  }

  // 6. Gửi lệnh khóa thiết bị lên Supabase (15 phút hoặc Vĩnh Viễn)
  async lockOnCloud(seconds = 900, isPermanent = false) {
    if (this.isAdminDevMode) return;

    const client = this.getSupabaseClient();
    if (!client) return;

    try {
      await client.rpc("lock_device_security", {
        p_device_id: this.deviceId,
        p_duration_seconds: seconds,
        p_is_permanent: isPermanent
      });
    } catch (e) {}
  }

  // 7. Chặn các phím tắt và chuột phải (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, v.v.)
  setupKeyboardAndMouseBlockers() {
    window.addEventListener("keydown", (e) => {
      // Phím tắt mở cửa bí mật Admin: Ctrl + Shift + Alt + D
      if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === "D" || e.key === "d" || e.keyCode === 68)) {
        e.preventDefault();
        e.stopPropagation();
        this.promptAdminAuth();
        return false;
      }

      // NẾU LÀ ADMIN DEV MODE THÌ BỎ QUA HOÀN TOÀN VIỆC CHẶN PHÍM TẮT!
      if (this.isAdminDevMode) return;

      // F12
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        this.handleViolationAttempt("F12 Shortcut");
        return false;
      }

      // Ctrl + Shift + I (DevTools)
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.keyCode === 73)) {
        e.preventDefault();
        e.stopPropagation();
        this.handleViolationAttempt("Ctrl+Shift+I");
        return false;
      }

      // Ctrl + Shift + J (Console)
      if (e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j" || e.keyCode === 74)) {
        e.preventDefault();
        e.stopPropagation();
        this.handleViolationAttempt("Ctrl+Shift+J");
        return false;
      }

      // Ctrl + Shift + C (Element Inspector)
      if (e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c" || e.keyCode === 67)) {
        e.preventDefault();
        e.stopPropagation();
        this.handleViolationAttempt("Ctrl+Shift+C");
        return false;
      }

      // Ctrl + U (View Page Source)
      if (e.ctrlKey && (e.key === "u" || e.key === "U" || e.keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        this.handleViolationAttempt("Ctrl+U View Source");
        return false;
      }

      // Mac Cmd + Option + I / J / C
      if (e.metaKey && e.altKey && ["i", "I", "j", "J", "c", "C"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        this.handleViolationAttempt("Mac DevTools Shortcut");
        return false;
      }
    }, true);

    // Chặn chuột phải (Context Menu) - Cho phép nếu là Admin
    window.addEventListener("contextmenu", (e) => {
      if (this.isAdminDevMode) return;

      e.preventDefault();
      e.stopPropagation();
      this.showTemporaryWarning("Tiệm Mỳ Cay: Chuột phải đã được vô hiệu hóa để bảo vệ an toàn! 🍜");
      return false;
    }, true);
  }

  // 8. Vòng lặp phát hiện DevTools đang mở (Timing & Window Resize & Debugger Trap)
  setupDevToolsDetector() {
    let strikes = parseInt(localStorage.getItem("mycay_sec_strikes") || "0", 10);
    this.strikeCount = isNaN(strikes) ? 0 : strikes;

    // A. Kiểm tra kích thước cửa sổ chênh lệch (Docked DevTools - CHỈ ÁP DỤNG TRÊN DESKTOP)
    const checkWindowSize = () => {
      if (this.isAdminDevMode) return; // BYPASS CHO ADMIN
      if (this.isMobileOrTablet()) return; // BỎ QUA MOBILE/TABLET (Thanh địa chỉ URL tự nhiên gây chênh lệch kích thước)

      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > 180 || heightDiff > 180) {
        this.handleViolationAttempt("DevTools Docked Detection");
      }
    };

    // B. Kiểm tra Debugger Timing Trap (CHỈ ÁP DỤNG TRÊN DESKTOP)
    const runDebuggerTrap = () => {
      if (this.isAdminDevMode || this.isLocked || this.isPermanentBan) return; // BYPASS CHO ADMIN
      if (this.isMobileOrTablet()) return; // Bỏ qua mobile (tránh giật lag CPU hoặc ngắt luồng tải trang)

      const start = performance.now();
      /* eslint-disable no-debugger */
      debugger;
      /* eslint-enable no-debugger */
      const duration = performance.now() - start;
      if (duration > 150) {
        this.handleViolationAttempt("Debugger Halt Detected");
      }
    };

    setInterval(checkWindowSize, 1500);
    setInterval(runDebuggerTrap, 2500);
  }

  // 9. Xử lý khi phát hiện hành vi vi phạm (TÁI PHẠM LẦN 2 = BAN VĨNH VIỄN)
  handleViolationAttempt(reason) {
    if (this.isAdminDevMode || this.isMobileOrTablet()) return; // BYPASS CHO ADMIN & MOBILE

    if (this.isPermanentBan) {
      this.renderPermanentBanModal();
      return;
    }
    if (this.isLocked) return;

    // KIỂM TRA TÁI PHẠM: Nếu thiết bị đã từng bị khóa 15 phút trước đó (lockCount >= 1)
    if (this.lockCount >= 1) {
      this.triggerPermanentBan(reason);
      return;
    }

    // Nếu chưa từng bị khóa (Chu kỳ vi phạm đầu tiên)
    this.strikeCount++;
    try {
      localStorage.setItem("mycay_sec_strikes", this.strikeCount.toString());
    } catch (e) {}

    console.clear();

    if (this.strikeCount === 1) {
      this.showTemporaryWarning("⚠️ Cảnh báo: Vui lòng đóng DevTools / F12 để tiếp tục chơi! (Lần 1/3)");
      setTimeout(() => {
        window.location.reload();
      }, 900);
    } else if (this.strikeCount === 2) {
      this.showTemporaryWarning("🚨 Cảnh báo nghiêm khắc: Tiếp tục mở DevTools sẽ khóa thiết bị 15 phút! (Lần 2/3)");
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } else {
      // Lần 3 trong chu kỳ đầu: KHÓA 15 PHÚT
      this.trigger15MinLockout(900, reason);
    }
  }

  // 10. Kích hoạt khóa 15 phút (Lần 1)
  async trigger15MinLockout(seconds = 900, reason = "devtools_violation_strike_3") {
    if (this.isAdminDevMode) return;

    this.isLocked = true;
    this.lockCount = 1;
    this.remainingSeconds = seconds;

    await this.saveLocalLock(seconds, false);
    await this.lockOnCloud(seconds, false);

    this.renderLockoutModal();
    this.startLockCountdown();
  }

  // 11. KÍCH HOẠT BAN VĨNH VIỄN KHI TÁI PHẠM LẦN 2
  async triggerPermanentBan(reason = "repeat_violation_perm_ban") {
    if (this.isAdminDevMode) return;

    this.isLocked = true;
    this.isPermanentBan = true;
    this.lockCount = 2;

    await this.saveLocalLock(999999999, true);
    await this.lockOnCloud(0, true);

    this.renderPermanentBanModal();
  }

  // 12. Hiển thị thông báo cảnh báo tạm thời
  showTemporaryWarning(text) {
    let banner = document.getElementById("sec-warning-toast");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "sec-warning-toast";
      banner.className = "sec-warning-toast";
      document.body.appendChild(banner);
    }
    banner.textContent = text;
    banner.classList.add("show");
    setTimeout(() => {
      banner.classList.remove("show");
    }, 2800);
  }

  // 13. Cài đặt bẫy gỡ khóa khẩn cấp dành cho Admin (Click 3 lần vào mascot)
  setupEmergencyUnlockTrigger() {
    let clickCount = 0;
    let clickTimer = null;
    const mascot = document.querySelector(".sec-lockout-mascot");
    if (mascot) {
      mascot.style.cursor = "pointer";
      mascot.title = "Nhấp 3 lần để mở khóa xác thực Admin";
      mascot.addEventListener("click", () => {
        clickCount++;
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => { clickCount = 0; }, 700);

        if (clickCount >= 3) {
          clickCount = 0;
          this.promptAdminAuth();
        }
      });
    }
  }

  // 14. Render Modal Khóa 15 Phút (Lần đầu vi phạm)
  renderLockoutModal() {
    let modal = document.getElementById("modal-security-lockout");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "modal-security-lockout";
      modal.className = "modal-security-lockout";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="sec-lockout-backdrop"></div>
      <div class="sec-lockout-card">
        <div class="sec-lockout-mascot" title="Chạm 3 lần để mở khóa Admin">🔒😿</div>
        <h2 class="sec-lockout-title">Tiệm Mỳ Tạm Phong Tỏa An Ninh!</h2>
        <p class="sec-lockout-desc">
          Hệ thống phát hiện hành vi cố tình mở công cụ lập trình <strong>(F12 / DevTools)</strong> trái phép.
          Để bảo vệ dữ liệu và tính công bằng, thiết bị của bạn đã bị tạm dừng quyền truy cập.
        </p>

        <!-- Mã thiết bị phần cứng -->
        <div class="sec-device-tag">
          <span>Mã thiết bị phần cứng:</span>
          <strong>${this.deviceId}</strong>
        </div>

        <!-- Đồng hồ đếm ngược Anime sống động -->
        <div class="sec-countdown-box">
          <div class="sec-countdown-label">THỜI GIAN KHÓA CÒN LẠI (LẦN 1)</div>
          <div id="sec-countdown-clock" class="sec-countdown-clock">15:00</div>
          <div class="sec-progress-bar-wrap">
            <div id="sec-progress-bar-fill" class="sec-progress-bar-fill" style="width: 100%;"></div>
          </div>
        </div>

        <p class="sec-lockout-note" style="color: #DC2626; font-weight: 800; margin-bottom: 6px;">
          ⚠️ CẢNH BÁO QUAN TRỌNG: Đây là lần khóa thứ nhất. Nếu TÁI PHẠM LẦN 2 sau khi hết hạn, thiết bị của bạn sẽ bị CẤM VĨNH VIỄN theo mã phần cứng, không thể mở khóa kể cả đổi sang trình duyệt khác!
        </p>

        <p class="sec-lockout-note">
          💡 <em>Hệ thống đồng bộ khóa theo mã phần cứng từ máy chủ đám mây. Kể cả xóa cookie, local storage hoặc tải lại trang thì đồng hồ đếm ngược vẫn sẽ tiếp tục duy trì cho tới khi hết hạn.</em>
        </p>
      </div>
    `;

    modal.style.display = "flex";
    document.body.classList.add("is-device-locked");

    this.setupEmergencyUnlockTrigger();

    try {
      if (window.game && window.game.sound) {
        window.game.sound.stopBgm();
      }
    } catch (e) {}
  }

  // 15. RENDER MODAL CẤM VĨNH VIỄN (KHI TÁI PHẠM LẦN 2)
  renderPermanentBanModal() {
    let modal = document.getElementById("modal-security-lockout");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "modal-security-lockout";
      modal.className = "modal-security-lockout";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="sec-lockout-backdrop" style="background: rgba(10, 4, 2, 0.96);"></div>
      <div class="sec-lockout-card sec-perm-card">
        <div class="sec-lockout-mascot" title="Chạm 3 lần để mở khóa Admin">⛔☠️</div>
        <h2 class="sec-lockout-title sec-perm-title">THIẾT BỊ ĐÃ BỊ CẤM VĨNH VIỄN!</h2>
        <p class="sec-lockout-desc">
          Hệ thống phát hiện hành vi <strong>TÁI PHẠM NGHIÊM TRỌNG</strong> (Lần thứ 2 cố tình mở công cụ lập trình F12 / DevTools).
          Quyền truy cập của thiết bị này đã bị hủy bỏ vô thời hạn.
        </p>

        <!-- Mã thiết bị phần cứng bị cấm -->
        <div class="sec-device-tag">
          <span>Mã phần cứng máy bị cấm:</span>
          <strong>${this.deviceId}</strong>
        </div>

        <!-- Khối thông báo cấm vĩnh viễn -->
        <div class="sec-perm-box">
          <div class="sec-perm-badge">PERMANENT HARDWARE BAN</div>
          <div class="sec-perm-status-text">TRẠNG THÁI: KHÓA PHẦN CỨNG VĨNH VIỄN</div>
        </div>

        <p class="sec-lockout-note" style="color: #FCA5A5; font-size: 11.5px; line-height: 1.5; margin-bottom: 8px;">
          🛑 <strong>Lưu ý về liên kết phần cứng:</strong> Lệnh cấm được liên kết trực tiếp với Dấu vân tay phần cứng máy tính (GPU Renderer, Canvas Engine, Màn hình, CPU Cores).
          Do đó, <strong>việc đổi sang trình duyệt khác (Chrome, Firefox, Edge, Safari, Brave...), xóa cookie, xóa cache hay mở tab ẩn danh đều KHÔNG CÓ TÁC DỤNG</strong>.
        </p>

        <p class="sec-lockout-note" style="color: #D1D5DB; font-size: 11px;">
          💻 Bạn chỉ có thể tiếp tục chơi nếu truy cập từ một <strong>thiết bị phần cứng máy tính hoặc điện thoại hoàn toàn mới</strong>.
        </p>
      </div>
    `;

    modal.style.display = "flex";
    document.body.classList.add("is-device-locked");

    this.setupEmergencyUnlockTrigger();

    try {
      if (window.game && window.game.sound) {
        window.game.sound.stopBgm();
      }
    } catch (e) {}
  }

  // 16. Bắt đầu đếm ngược từng giây (Chỉ dành cho khóa 15 phút lần đầu)
  startLockCountdown() {
    if (this.isPermanentBan || this.isAdminDevMode) return;
    if (this.lockTimerInterval) clearInterval(this.lockTimerInterval);

    const initialSeconds = this.remainingSeconds || 900;

    const updateDisplay = () => {
      const clockEl = document.getElementById("sec-countdown-clock");
      const barEl = document.getElementById("sec-progress-bar-fill");

      if (this.remainingSeconds <= 0) {
        clearInterval(this.lockTimerInterval);
        this.unlockDevice();
        return;
      }

      const m = Math.floor(this.remainingSeconds / 60);
      const s = this.remainingSeconds % 60;
      const timeStr = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

      if (clockEl) clockEl.textContent = timeStr;
      if (barEl) {
        const pct = Math.max(0, Math.min(100, (this.remainingSeconds / initialSeconds) * 100));
        barEl.style.width = `${pct}%`;
      }

      this.remainingSeconds--;
    };

    updateDisplay();
    this.lockTimerInterval = setInterval(updateDisplay, 1000);
  }

  // 17. Mở khóa khi đếm ngược xong (Lần 1)
  unlockDevice() {
    this.isLocked = false;
    this.strikeCount = 0;
    this.clearLocalLock();

    const modal = document.getElementById("modal-security-lockout");
    if (modal) {
      modal.innerHTML = `
        <div class="sec-lockout-backdrop"></div>
        <div class="sec-lockout-card sec-unlocked">
          <div class="sec-lockout-mascot">🍜✨</div>
          <h2 class="sec-lockout-title" style="color: #10B981;">Đã Hết Thời Gian Khóa!</h2>
          <p class="sec-lockout-desc">
            Tiệm mỳ cay đã mở cửa chào đón bạn trở lại. Chúc bạn có những phút giây giải trí vui vẻ và ấm cúng!
          </p>
          <p class="sec-lockout-note" style="color: #DC2626; font-weight: 800; margin-bottom: 12px;">
            ⚠️ Nhắc nhở: Thiết bị của bạn đang trong danh sách theo dõi đặc biệt. Nếu mở lại DevTools lần nữa, thiết bị sẽ bị CẤM VĨNH VIỄN!
          </p>
          <button id="btn-sec-reload" class="btn-modal-primary" style="margin-top: 6px; background: #10B981;">
            🍜 Mở Cửa Vào Tiệm Lại Ngay!
          </button>
        </div>
      `;

      const btn = document.getElementById("btn-sec-reload");
      if (btn) {
        btn.addEventListener("click", () => {
          window.location.reload();
        });
      }
    }
  }

  // 18. Quy trình khởi động kiểm tra ngay khi mở trang
  async init() {
    this.deviceId = this.generateHardwareFingerprint();
    window.mycay_device_id = this.deviceId;

    // 0. ƯU TIÊN KIỂM TRA QUYỀN ADMIN TRƯỚC HẾT
    if (this.checkAdminDevMode()) {
      // Admin đã bật dev mode: Bỏ qua kiểm tra khóa và không chạy bẫy DevTools
      this.setupKeyboardAndMouseBlockers();
      return;
    }

    // MIỄN TRỪ HOÀN TOÀN CHO MOBILE & TABLET:
    // Trình duyệt di động không có phím F12 hay Docked DevTools, tự động giải phóng bất kỳ cờ khóa nhầm nào
    if (this.isMobileOrTablet()) {
      try {
        this.isLocked = false;
        this.isPermanentBan = false;
        localStorage.removeItem("mycay_sec_lock");
        sessionStorage.removeItem("mycay_sec_lock");
        localStorage.removeItem("mycay_sec_strikes");
        await this.clearIndexedDB();
      } catch (e) {}
      return;
    }

    // A. Kiểm tra ngay tầng lưu trữ cục bộ (Evercookie) - Dành riêng cho Desktop
    const localSec = await this.getLocalLock();
    if (this.isPermanentBan) {
      this.isLocked = true;
      this.renderPermanentBanModal();
      return;
    } else if (localSec > 0) {
      this.isLocked = true;
      this.remainingSeconds = localSec;
      this.renderLockoutModal();
      this.startLockCountdown();
    }

    // B. Kiểm tra tầng máy chủ Supabase theo mã phần cứng
    this.checkCloudLock().then(cloudStatus => {
      if (!cloudStatus || this.isAdminDevMode) return;

      if (cloudStatus.is_permanent_ban) {
        this.isLocked = true;
        this.isPermanentBan = true;
        this.lockCount = 2;
        this.saveLocalLock(999999999, true);
        this.renderPermanentBanModal();
        return;
      }

      if (cloudStatus.is_locked && cloudStatus.remaining_seconds > 0) {
        this.isLocked = true;
        this.remainingSeconds = cloudStatus.remaining_seconds;
        this.lockCount = cloudStatus.lock_count || 1;
        this.saveLocalLock(cloudStatus.remaining_seconds, false);
        this.renderLockoutModal();
        this.startLockCountdown();
      } else {
        this.lockCount = Math.max(this.lockCount, cloudStatus.lock_count || 0);
      }
    });

    // C. Bật hệ thống phòng hộ phím bấm & DevTools (Dành cho người chơi thông thường)
    this.setupKeyboardAndMouseBlockers();
    this.setupDevToolsDetector();
  }
}

// Khởi chạy ngay lập tức khi file script được nạp
window.securityShield = new SecurityShield();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => window.securityShield.init());
} else {
  window.securityShield.init();
}
