// ==========================================================
// HỆ THỐNG BẢO MẬT & PHÒNG HỘ AN NINH TIỆM MỲ CAY (SECURITY SHIELD)
// Chặn F12, DevTools, Debugger Trap, Mã Hóa Nhận Diện Thiết Bị & Khóa 15 Phút
// ==========================================================

const SUPABASE_SEC_URL = "https://camnragrlqzmcxtgvukj.supabase.co";
const SUPABASE_SEC_KEY = "sb_publishable_nWBCfr-d5ZSuk5e5ULrpZQ_zVFp_nUh";

class SecurityShield {
  constructor() {
    this.deviceId = null;
    this.isLocked = false;
    this.remainingSeconds = 0;
    this.lockTimerInterval = null;
    this.strikeCount = 0;
    this.isChecking = false;
    this.supabaseClient = null;
  }

  // 1. Tạo dấu vân tay phần cứng duy nhất (Hardware Fingerprint)
  // Không phụ thuộc vào cookie/localStorage; xóa storage vẫn tạo ra cùng 1 ID máy
  generateHardwareFingerprint() {
    const specs = [];

    // Màn hình & Hiển thị
    specs.push(`${window.screen.width}x${window.screen.height}`);
    specs.push(window.screen.colorDepth || 24);
    specs.push(window.devicePixelRatio || 1);

    // Phần cứng máy (CPU, RAM, Nền tảng)
    specs.push(navigator.hardwareConcurrency || 4);
    specs.push(navigator.deviceMemory || 8);
    specs.push(navigator.platform || "unknown");
    specs.push(navigator.language || "vi");
    try {
      specs.push(Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh");
    } catch (e) {
      specs.push("GMT+7");
    }

    // Canvas 2D Rendering Engine Fingerprint
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

    // WebGL GPU Renderer Fingerprint
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

    // Hash chuỗi thông số phần cứng thành mã ID ngắn gọn
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

  // 2. Hệ thống lưu trữ nhiều tầng (Evercookie-style): IndexedDB + LocalStorage + SessionStorage
  async getLocalLock() {
    // Tầng 1: LocalStorage
    try {
      const raw = localStorage.getItem("mycay_sec_lock");
      if (raw) {
        const parsed = JSON.parse(raw);
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
        if (parsed.lockedUntil && parsed.lockedUntil > Date.now()) {
          return Math.ceil((parsed.lockedUntil - Date.now()) / 1000);
        }
      }
    } catch (e) {}

    // Tầng 3: IndexedDB
    try {
      const idbSeconds = await this.readFromIndexedDB();
      if (idbSeconds > 0) return idbSeconds;
    } catch (e) {}

    return 0;
  }

  async saveLocalLock(seconds) {
    const lockedUntil = Date.now() + seconds * 1000;
    const payload = JSON.stringify({ lockedUntil, deviceId: this.deviceId });

    try { localStorage.setItem("mycay_sec_lock", payload); } catch (e) {}
    try { sessionStorage.setItem("mycay_sec_lock", payload); } catch (e) {}
    try { await this.saveToIndexedDB(lockedUntil); } catch (e) {}
  }

  clearLocalLock() {
    try { localStorage.removeItem("mycay_sec_lock"); } catch (e) {}
    try { sessionStorage.removeItem("mycay_sec_lock"); } catch (e) {}
    try { localStorage.removeItem("mycay_sec_strikes"); } catch (e) {}
    try { this.clearIndexedDB(); } catch (e) {}
  }

  // Thao tác với IndexedDB độc lập
  openIDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return resolve(null);
      const req = indexedDB.open("mycay_security_vault", 1);
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
    if (!db) return 0;
    return new Promise(resolve => {
      try {
        const tx = db.transaction("locks", "readonly");
        const store = tx.objectStore("locks");
        const req = store.get(this.deviceId);
        req.onsuccess = () => {
          if (req.result && req.result.lockedUntil > Date.now()) {
            resolve(Math.ceil((req.result.lockedUntil - Date.now()) / 1000));
          } else {
            resolve(0);
          }
        };
        req.onerror = () => resolve(0);
      } catch (e) {
        resolve(0);
      }
    });
  }

  async saveToIndexedDB(lockedUntil) {
    const db = await this.openIDB();
    if (!db) return;
    try {
      const tx = db.transaction("locks", "readwrite");
      const store = tx.objectStore("locks");
      store.put({ id: this.deviceId, lockedUntil });
    } catch (e) {}
  }

  async clearIndexedDB() {
    const db = await this.openIDB();
    if (!db) return;
    try {
      const tx = db.transaction("locks", "readwrite");
      const store = tx.objectStore("locks");
      store.delete(this.deviceId);
    } catch (e) {}
  }

  // 3. Khởi tạo Supabase client phụ trách bảo mật
  getSupabaseClient() {
    if (this.supabaseClient) return this.supabaseClient;
    if (typeof window.supabase !== "undefined" && typeof window.supabase.createClient === "function") {
      this.supabaseClient = window.supabase.createClient(SUPABASE_SEC_URL, SUPABASE_SEC_KEY);
      return this.supabaseClient;
    }
    return null;
  }

  // 4. Kiểm tra trạng thái khóa từ Supabase (Đính theo mã phần cứng thiết bị)
  async checkCloudLock() {
    const client = this.getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client.rpc("check_device_lock", {
        p_device_id: this.deviceId
      });

      if (!error && data) {
        return data; // { is_locked: boolean, remaining_seconds: number, strikes: number }
      }
    } catch (e) {}
    return null;
  }

  // 5. Gửi lệnh khóa thiết bị lên Supabase (15 phút = 900 giây)
  async lockOnCloud(seconds = 900) {
    const client = this.getSupabaseClient();
    if (!client) return;

    try {
      await client.rpc("lock_device_security", {
        p_device_id: this.deviceId,
        p_duration_seconds: seconds
      });
    } catch (e) {}
  }

  // 6. Chặn các phím tắt và chuột phải (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, v.v.)
  setupKeyboardAndMouseBlockers() {
    window.addEventListener("keydown", (e) => {
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

    // Chặn chuột phải (Context Menu)
    window.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showTemporaryWarning("Tiệm Mỳ Cay: Chuột phải đã được vô hiệu hóa để bảo vệ an toàn! 🍜");
      return false;
    }, true);
  }

  // 7. Vòng lặp phát hiện DevTools đang mở (Timing & Window Resize & Debugger Trap)
  setupDevToolsDetector() {
    let strikes = parseInt(localStorage.getItem("mycay_sec_strikes") || "0", 10);
    this.strikeCount = isNaN(strikes) ? 0 : strikes;

    // A. Kiểm tra kích thước cửa sổ chênh lệch (Docked DevTools)
    const checkWindowSize = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      // Nếu chênh lệch quá 165px (trừ khi là thanh cuộn thông thường)
      if (widthDiff > 165 || heightDiff > 165) {
        this.handleViolationAttempt("DevTools Docked Detection");
      }
    };

    // B. Kiểm tra Debugger Timing Trap
    const runDebuggerTrap = () => {
      if (this.isLocked) return;
      const start = performance.now();
      // Nếu DevTools mở, lệnh debugger sẽ dừng hoặc làm chậm đáng kể luồng thực thi
      /* eslint-disable no-debugger */
      debugger;
      /* eslint-enable no-debugger */
      const duration = performance.now() - start;
      if (duration > 120) {
        this.handleViolationAttempt("Debugger Halt Detected");
      }
    };

    setInterval(checkWindowSize, 1200);
    setInterval(runDebuggerTrap, 2000);
  }

  // 8. Xử lý khi phát hiện hành vi vi phạm (Càng cố tình càng khóa sâu)
  handleViolationAttempt(reason) {
    if (this.isLocked) return;

    this.strikeCount++;
    try {
      localStorage.setItem("mycay_sec_strikes", this.strikeCount.toString());
    } catch (e) {}

    console.clear();

    if (this.strikeCount === 1) {
      this.showTemporaryWarning("⚠️ Cảnh báo: Vui lòng đóng DevTools / F12 để tiếp tục chơi! (Lần 1/3)");
      setTimeout(() => {
        // Tự động tải lại trang nếu cố tình
        window.location.reload();
      }, 900);
    } else if (this.strikeCount === 2) {
      this.showTemporaryWarning("🚨 Cảnh báo nghiêm khắc: Tiếp tục mở DevTools sẽ khóa thiết bị 15 phút! (Lần 2/3)");
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } else {
      // Lần 3 trở đi: KHÓA NGAY 15 PHÚT (900 GIÂY)
      this.trigger15MinLockout(900, reason);
    }
  }

  // 9. Kích hoạt khóa 15 phút
  async trigger15MinLockout(seconds = 900, reason = "devtools_repeated_violation") {
    this.isLocked = true;
    this.remainingSeconds = seconds;

    // Lưu đa tầng: LocalStorage + SessionStorage + IndexedDB
    await this.saveLocalLock(seconds);

    // Gửi khóa lên Supabase theo mã phần cứng
    await this.lockOnCloud(seconds);

    // Hiển thị modal khóa chuẩn Cozy Anime
    this.renderLockoutModal();
    this.startLockCountdown();
  }

  // 10. Hiển thị thông báo cảnh báo tạm thời
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

  // 11. Render Modal Khóa 15 Phút chuẩn phong cách Cozy Anime
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
        <div class="sec-lockout-mascot">🔒😿</div>
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
          <div class="sec-countdown-label">THỜI GIAN KHÓA CÒN LẠI</div>
          <div id="sec-countdown-clock" class="sec-countdown-clock">15:00</div>
          <div class="sec-progress-bar-wrap">
            <div id="sec-progress-bar-fill" class="sec-progress-bar-fill" style="width: 100%;"></div>
          </div>
        </div>

        <p class="sec-lockout-note">
          💡 <em>Hệ thống đồng bộ khóa theo mã phần cứng từ máy chủ đám mây. Kể cả xóa cookie, local storage hoặc tải lại trang thì đồng hồ đếm ngược vẫn sẽ tiếp tục duy trì cho tới khi hết hạn.</em>
        </p>
      </div>
    `;

    modal.style.display = "flex";
    document.body.classList.add("is-device-locked");

    // Dừng âm thanh nền nếu có
    try {
      if (window.game && window.game.sound) {
        window.game.sound.stopBgm();
      }
    } catch (e) {}
  }

  // 12. Bắt đầu đếm ngược từng giây
  startLockCountdown() {
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

  // 13. Mở khóa khi đếm ngược xong
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
          <button id="btn-sec-reload" class="btn-modal-primary" style="margin-top: 14px; background: #10B981;">
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

  // 14. Quy trình khởi động kiểm tra ngay khi mở trang
  async init() {
    this.deviceId = this.generateHardwareFingerprint();
    window.mycay_device_id = this.deviceId;

    // A. Kiểm tra ngay tầng lưu trữ cục bộ (Evercookie)
    const localSec = await this.getLocalLock();
    if (localSec > 0) {
      this.isLocked = true;
      this.remainingSeconds = localSec;
      this.renderLockoutModal();
      this.startLockCountdown();
    }

    // B. Kiểm tra tầng máy chủ Supabase theo mã phần cứng
    this.checkCloudLock().then(cloudStatus => {
      if (cloudStatus && cloudStatus.is_locked && cloudStatus.remaining_seconds > 0) {
        this.isLocked = true;
        this.remainingSeconds = cloudStatus.remaining_seconds;
        this.saveLocalLock(cloudStatus.remaining_seconds);
        this.renderLockoutModal();
        this.startLockCountdown();
      }
    });

    // C. Bật hệ thống phòng hộ phím bấm & DevTools
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
