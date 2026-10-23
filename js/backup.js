// ==========================================================
// SAO LƯU & KHÔI PHỤC DỮ LIỆU GAME (TXABACKUP)
// File .json được MÃ HÓA (AES-GCM) + KÝ SỐ (HMAC-SHA256) để chống sửa file rồi nạp lại.
// Bất kỳ thay đổi nào (dù chỉ 1 ký tự) trong file đều khiến chữ ký sai -> chặn khôi phục.
// ==========================================================

import { GameIntegrity } from "./integrity.js?v=1.9.1";

const SAVE_KEY = "mycay_save_data";
const BACKUP_FORMAT = "TMC-BACKUP";
const GAME_NAME = "Tiệm Mỳ Cay";
const BACKUP_VERSION = 2;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PBKDF2_ROUNDS = 120000;

// Khóa bí mật được ghép rời rạc để không nằm nguyên văn trong mã nguồn
const SECRET_PARTS = [
  [84, 77, 67, 35, 98, 107, 112],
  [64, 77, 121, 67, 97, 121, 33],
  [50, 48, 50, 54, 47, 116, 120, 97],
  [45, 115, 105, 103, 110, 126, 118, 49]
];
const secretBytes = () => new Uint8Array(SECRET_PARTS.flat());

const textEnc = new TextEncoder();
const textDec = new TextDecoder();

function bytesToB64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function b64ToBytes(b64) {
  if (typeof b64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw new Error("bad_b64");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

async function sha256B64(text) {
  const digest = await crypto.subtle.digest("SHA-256", textEnc.encode(text));
  return bytesToB64(new Uint8Array(digest));
}

// Sinh 2 khóa riêng biệt (mã hóa + ký) từ khóa bí mật và muối ngẫu nhiên của từng file
async function deriveKeys(salt) {
  const base = await crypto.subtle.importKey("raw", secretBytes(), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ROUNDS, hash: "SHA-256" },
    base,
    512
  ));
  const aesKey = await crypto.subtle.importKey("raw", bits.slice(0, 32), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  const hmacKey = await crypto.subtle.importKey("raw", bits.slice(32, 64), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return { aesKey, hmacKey };
}

function buildPreview(state) {
  return {
    shopName: String(state.shopName || "Tiệm Mỳ Cay"),
    day: Number(state.day) || 1
  };
}

// Chuỗi chuẩn hóa để ký: thứ tự trường cố định, đổi thứ tự/thêm bớt khóa đều làm sai chữ ký
function canonicalString(file) {
  const p = file.preview || {};
  if (file.v === 1) {
    return [
      file.format, file.v, file.gameVersion, file.createdAt,
      p.shopName, p.ownerName, p.day, p.money, p.reputation,
      file.salt, file.iv, file.data
    ].map(v => String(v)).join("|");
  }
  return [
    file.format, file.v, file.game, file.gameVersion, file.createdAt,
    p.shopName, p.day,
    file.salt, file.iv, file.data
  ].map(v => String(v)).join("|");
}

// Kiểm tra độ hợp lệ của dữ liệu game sau khi giải mã
function validateState(state) {
  const problems = [];
  if (!state || typeof state !== "object" || Array.isArray(state)) return ["Dữ liệu game không phải object hợp lệ"];
  const isNum = v => typeof v === "number" && Number.isFinite(v);
  if (!isNum(state.money) || state.money < -1e7 || state.money > 1e13) problems.push("Số tiền không hợp lệ");
  if (!isNum(state.day) || state.day < 1 || state.day > 1e6) problems.push("Số ngày không hợp lệ");
  if (!isNum(state.reputation) || state.reputation < 0 || state.reputation > 1e6) problems.push("Điểm uy tín không hợp lệ");
  ["noodles", "toppings", "drinks", "supplies", "upgrades", "staff", "stats"].forEach(k => {
    if (state[k] != null && (typeof state[k] !== "object" || Array.isArray(state[k]))) problems.push(`Mục "${k}" sai cấu trúc`);
  });
  if (state.reviews != null && !Array.isArray(state.reviews)) problems.push("Danh sách đánh giá sai cấu trúc");
  if (state.ownerAvatar != null && typeof state.ownerAvatar !== "string") problems.push("Ảnh đại diện chủ quán không hợp lệ");
  if (state.ownerName != null && typeof state.ownerName !== "string") problems.push("Tên chủ quán không hợp lệ");
  return problems;
}

class VerifyError extends Error {
  constructor(kind, message, checks) {
    super(message);
    this.kind = kind; // "format" | "tampered" | "unsupported" | "invalid"
    this.checks = checks;
  }
}

export class GameBackup {
  static isSupported() {
    return typeof crypto !== "undefined" && !!crypto.subtle && typeof TextEncoder !== "undefined";
  }

  static hasLocalSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch (e) {
      return false;
    }
  }

  // ---------------- XUẤT FILE SAO LƯU ----------------
  static async createBackup(state, gameVersion) {
    const cleanState = JSON.parse(JSON.stringify(state));
    const stateJson = JSON.stringify(cleanState);
    const inner = JSON.stringify({
      state: cleanState,
      stateHash: await sha256B64(stateJson)
    });

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const { aesKey, hmacKey } = await deriveKeys(salt);
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, textEnc.encode(inner)));

    const file = {
      format: BACKUP_FORMAT,
      game: GAME_NAME,
      v: BACKUP_VERSION,
      gameVersion: String(gameVersion || ""),
      createdAt: new Date().toISOString(),
      preview: buildPreview(cleanState),
      salt: bytesToB64(salt),
      iv: bytesToB64(iv),
      data: bytesToB64(cipher)
    };
    const sig = await crypto.subtle.sign("HMAC", hmacKey, textEnc.encode(canonicalString(file)));
    file.sig = bytesToB64(new Uint8Array(sig));
    file.notice = "File sao lưu đã được mã hóa và ký số. Mọi chỉnh sửa sẽ khiến game từ chối khôi phục.";
    return file;
  }

  // Nhận diện trình duyệt trong ứng dụng (Facebook, Messenger, Zalo...) chặn tải file
  static isInAppBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || "";
    return /FBAN|FBAV|FB_IAB|FB4A|FBIOS|Messenger|Instagram|Zalo|Line|MicroMessenger|TikTok|musical_ly|BytedanceWebview/i.test(ua);
  }

  static getInAppName() {
    const ua = navigator.userAgent || "";
    if (/FBAN|FBAV|FB4A|FBIOS/i.test(ua)) return "Facebook";
    if (/Messenger|FB_IAB/i.test(ua)) return "Messenger";
    if (/Instagram/i.test(ua)) return "Instagram";
    if (/Zalo/i.test(ua)) return "Zalo";
    if (/TikTok|musical_ly|Bytedance/i.test(ua)) return "TikTok";
    return "Trình duyệt trong ứng dụng";
  }

  // Sao chép chuỗi văn bản vào bộ nhớ tạm (hỗ trợ cả Clipboard API & fallback execCommand)
  static async copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        // Fallback phía dưới
      }
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      ta.setAttribute("readonly", "");
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  // iPhone/iPad và bản cài như app (PWA) chặn tải file kiểu thẻ <a download> -> dùng bảng Chia sẻ / Lưu vào Tệp
  static prefersShareSheet() {
    const ua = navigator.userAgent || "";
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1);
    const isStandalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
    return isIOS || isStandalone || !("download" in HTMLAnchorElement.prototype);
  }

  static canShareFile(file) {
    try {
      return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
    } catch (e) {
      return false;
    }
  }

  // Phải được gọi trực tiếp trong sự kiện bấm nút để trình duyệt cho phép tải/lưu file
  static async saveFile(blob, filename) {
    const file = new File([blob], filename, { type: "application/json" });
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

    // 1. Máy tính (Chrome/Edge): mở hộp thoại "Lưu file" để chọn nơi lưu
    if (typeof window.showSaveFilePicker === "function" && !isMobile) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "File sao lưu Tiệm Mỳ Cay", accept: { "application/json": [".json"] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return "saved";
      } catch (e) {
        if (e && e.name === "AbortError") return "cancelled";
        // Bị chặn (iframe, quyền...) -> chuyển sang cách tải thông thường
      }
    }

    // 2. iPhone / bản cài app: bảng Chia sẻ -> "Lưu vào Tệp"
    if (this.prefersShareSheet() && this.canShareFile(file)) {
      try {
        await navigator.share({ files: [file], title: "Sao lưu Tiệm Mỳ Cay" });
        return "shared";
      } catch (e) {
        if (e && e.name === "AbortError") return "cancelled";
      }
    }

    // 3. Tải trực tiếp qua trình duyệt (vị trí lưu do trình duyệt/thiết bị quyết định)
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 30000);
    return "downloaded";
  }

  static async exportToFile(game, gameVersion) {
    if (!this.isSupported()) {
      this.showErrorScreen({ title: "Trình duyệt không hỗ trợ", message: "Trình duyệt này không hỗ trợ mã hóa an toàn (Web Crypto). Hãy dùng Chrome, Edge, Safari hoặc Firefox bản mới qua HTTPS." });
      return;
    }
    const preparing = this.showOverlay({ tone: "info", icon: "🔐", title: "Đang Tạo Dữ Liệu Sao Lưu...", html: "<p>Đang mã hóa và ký số dữ liệu tiệm, vui lòng đợi giây lát.</p>", buttons: [] });
    let file, blob, filename;
    try {
      game.saveGame();
      file = await this.createBackup(game.state, gameVersion);
      blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
      const d = new Date();
      const pad = n => String(n).padStart(2, "0");
      const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
      const safeName = String(file.preview.shopName)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
        .replace(/[^A-Za-z0-9]+/g, "") || "TiemMyCay";
      filename = `TMC_SaoLuu_${safeName}_Ngay${file.preview.day}_${stamp}.json`;
    } catch (e) {
      preparing.close();
      console.error("Lỗi sao lưu:", e);
      this.showErrorScreen({ title: "Sao Lưu Thất Bại", message: "Không thể tạo dữ liệu sao lưu. Vui lòng thử lại." });
      return;
    }
    preparing.close();
    this.showDownloadReady(file, blob, filename, game.state);
  }

  static showDownloadReady(file, blob, filename, state = null) {
    const inApp = this.isInAppBrowser();
    const appName = this.getInAppName();
    const codeString = JSON.stringify(file);
    const useShare = this.prefersShareSheet() && this.canShareFile(new File([blob], filename, { type: "application/json" }));

    if (inApp) {
      // Tối ưu đặc biệt khi mở bằng Facebook, Messenger, Zalo...
      this.showOverlay({
        tone: "info",
        icon: "📱",
        title: "Sao Lưu Dữ Liệu Tiệm",
        html: `
          ${this.previewTable(file.preview, file.createdAt, state)}
          <div class="tmc-bk-inapp-box">
            <div class="tmc-bk-inapp-badge">⚠️ Mở bằng ${escapeHtml(appName)}</div>
            <p class="tmc-bk-inapp-desc">
              Trình duyệt của <b>${escapeHtml(appName)} chặn tải file</b> về máy.
              <br>Hãy chọn <b>“Sao Chép Mã Sao Lưu”</b> để dán vào Ghi chú / Tin nhắn, hoặc mở bằng Chrome / Safari để tải file.
            </p>
          </div>
        `,
        actionsClass: "column",
        buttons: [
          {
            text: "📋 Sao Chép Mã Sao Lưu (Khuyên Dùng)",
            primary: true,
            onClick: () => this.showCopyBackupCode(file, codeString, state)
          },
          {
            text: "⬇️ Vẫn Thử Tải File .JSON",
            secondary: true,
            onClick: () => this.runSave(file, blob, filename)
          },
          {
            text: "🌐 Hướng Dẫn Mở Chrome / Safari",
            secondary: true,
            onClick: () => this.showOpenExternalGuide()
          },
          { text: "Để Sau" }
        ]
      });
      return;
    }

    // Trình duyệt tiêu chuẩn (Chrome, Safari, Edge, Firefox...)
    this.showOverlay({
      tone: "info",
      icon: "💾",
      title: "File Sao Lưu Đã Sẵn Sàng",
      html: `
        ${this.previewTable(file.preview, file.createdAt, state)}
        <p class="tmc-bk-hint">📄 <b>${escapeHtml(filename)}</b> (${Math.max(1, Math.round(blob.size / 1024))} KB)</p>
        <p class="tmc-bk-hint">${useShare ? "Bấm nút bên dưới rồi chọn <b>“Lưu vào Tệp”</b> để cất file." : "Bấm nút bên dưới để tải file về máy."}</p>
      `,
      actionsClass: "column",
      buttons: [
        {
          text: useShare ? "📤 Lưu Vào Tệp" : "⬇️ Tải File Về Máy",
          primary: true,
          onClick: () => this.runSave(file, blob, filename)
        },
        {
          text: "📋 Hoặc Sao Chép Mã Sao Lưu (Văn Bản)",
          secondary: true,
          onClick: () => this.showCopyBackupCode(file, codeString, state)
        },
        { text: "Để Sau" }
      ]
    });
  }

  // Màn hình hiển thị & sao chép Mã Sao Lưu (dạng văn bản an toàn)
  static async showCopyBackupCode(file, codeString, state = null) {
    const copied = await this.copyToClipboard(codeString);
    const preview = file.preview || {};
    const s = state || preview;

    const overlayObj = this.showOverlay({
      tone: "success",
      icon: "📋",
      title: "Mã Sao Lưu Dữ Liệu",
      html: `
        <div class="tmc-bk-preview-compact">
          <span>🏪 <b>${escapeHtml(preview.shopName || "Tiệm Mỳ Cay")}</b> (Ngày ${escapeHtml(preview.day || 1)})</span>
          ${s.money != null ? `<span>🪙 <b>${escapeHtml(Math.round(s.money || 0).toLocaleString("vi-VN"))}k</b></span>` : ""}
        </div>

        <div class="tmc-bk-copy-status ${copied ? "is-copied" : "need-manual"}">
          ${copied
            ? "✅ <b>Đã tự động sao chép mã vào bộ nhớ tạm!</b>"
            : "⚠️ <b>Hãy bôi đen và sao chép mã bên dưới:</b>"}
        </div>

        <div class="tmc-bk-code-wrapper">
          <textarea id="tmc-bk-code-textarea" class="tmc-bk-textarea" readonly rows="4" spellcheck="false">${escapeHtml(codeString)}</textarea>
          <div class="tmc-bk-code-tools">
            <button type="button" class="tmc-bk-mini-btn" id="tmc-btn-recopy">📋 Sao Chép Lại</button>
            ${canShareText ? `<button type="button" class="tmc-bk-mini-btn" id="tmc-btn-share-code">📤 Chia Sẻ Mã</button>` : ""}
          </div>
        </div>

        <div class="tmc-bk-guide">
          <div class="tmc-bk-guide-title">📌 Hướng dẫn sử dụng mã:</div>
          <p>1. Dán mã này vào <b>Ghi chú</b> trên máy, hoặc gửi vào <b>tin nhắn Messenger/Zalo</b> cho chính mình để cất giữ.</p>
          <p>2. Khi mở game trên <b>Chrome / Safari</b> hoặc máy khác: Bấm <b>Khôi Phục</b> ➔ chọn <b>Dán Mã Sao Lưu</b> là xong ngay!</p>
        </div>
      `,
      actionsClass: "column",
      buttons: [
        {
          text: "🌐 Cách Mở Bằng Chrome / Safari",
          secondary: true,
          onClick: () => this.showOpenExternalGuide()
        },
        { text: "Tuyệt Vời 💖", primary: true }
      ]
    });

    const overlay = overlayObj.overlay;
    const textarea = overlay.querySelector("#tmc-bk-code-textarea");
    if (textarea) {
      textarea.addEventListener("focus", () => textarea.select());
      textarea.addEventListener("click", () => textarea.select());
    }

    const recopyBtn = overlay.querySelector("#tmc-btn-recopy");
    if (recopyBtn) {
      recopyBtn.addEventListener("click", async () => {
        const ok = await this.copyToClipboard(codeString);
        recopyBtn.textContent = ok ? "✅ Đã Chép!" : "❌ Lỗi Chép";
        setTimeout(() => { recopyBtn.textContent = "📋 Sao Chép Lại"; }, 2000);
      });
    }

    const shareBtn = overlay.querySelector("#tmc-btn-share-code");
    if (shareBtn && canShareText) {
      shareBtn.addEventListener("click", async () => {
        try {
          await navigator.share({
            title: `Mã Sao Lưu Tiệm Mỳ Cay - ${preview.shopName || "Tiệm"} (Ngày ${preview.day || 1})`,
            text: codeString
          });
        } catch (e) {
          if (e && e.name !== "AbortError") {
            console.warn("Không thể chia sẻ mã:", e);
          }
        }
      });
    }
  }

  // Hướng dẫn mở game bằng trình duyệt hệ thống (Chrome/Safari) từ Facebook/Messenger
  static showOpenExternalGuide() {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    const appName = this.getInAppName();
    const gameUrl = location.href.split("#")[0];

    const overlayObj = this.showOverlay({
      tone: "info",
      icon: "🌐",
      title: "Chơi Trên Trình Duyệt Ngoài",
      html: `
        <p class="tmc-bk-lead">Mở bằng Chrome hoặc Safari giúp tải file sao lưu mượt mà và không lo mất tiến trình khi thoát ứng dụng ${escapeHtml(appName)}.</p>
        <div class="tmc-bk-steps">
          <div class="tmc-bk-step">
            <div class="step-num">1</div>
            <div class="step-desc">Bấm vào biểu tượng <b>ba chấm (⋯)</b> ở góc trên cùng bên phải màn hình ${escapeHtml(appName)}.</div>
          </div>
          <div class="tmc-bk-step">
            <div class="step-num">2</div>
            <div class="step-desc">Chọn <b>${isIOS ? "“Mở trong Safari” (hoặc Trình duyệt mặc định)" : "“Mở bằng trình duyệt hệ thống” (Chrome)"}</b>.</div>
          </div>
          <div class="tmc-bk-step">
            <div class="step-num">3</div>
            <div class="step-desc">Vào game ở trình duyệt mới, chọn <b>Khôi Phục</b> và dán <b>Mã Sao Lưu</b> để tiếp tục chơi!</div>
          </div>
        </div>
        <div class="tmc-bk-copy-url-box">
          <button type="button" class="tmc-bk-btn secondary" id="tmc-btn-copy-game-url" style="width: 100%;">
            🔗 Sao Chép Link Game
          </button>
        </div>
      `,
      buttons: [
        { text: "Đã Hiểu ✨", primary: true }
      ]
    });

    const copyUrlBtn = overlayObj.overlay.querySelector("#tmc-btn-copy-game-url");
    if (copyUrlBtn) {
      copyUrlBtn.addEventListener("click", async () => {
        const ok = await this.copyToClipboard(gameUrl);
        copyUrlBtn.textContent = ok ? "✅ Đã Sao Chép Link Game!" : "❌ Lỗi sao chép";
        setTimeout(() => { copyUrlBtn.textContent = "🔗 Sao Chép Link Game"; }, 2500);
      });
    }
  }

  static runSave(file, blob, filename) {
    this.saveFile(blob, filename).then(result => {
      if (result === "cancelled") {
        this.showDownloadReady(file, blob, filename);
        return;
      }
      const inApp = this.isInAppBrowser();
      const where = {
        saved: "File đã được lưu vào vị trí bạn chọn.",
        shared: "File đã được chuyển tới ứng dụng bạn chọn (ví dụ: Tệp).",
        downloaded: "Trình duyệt đã gửi lệnh tải file về máy."
      }[result];

      this.showOverlay({
        tone: "success",
        icon: "✅",
        title: "Đã Lưu Dữ Liệu!",
        html: `
          <p>${where}</p>
          <p class="tmc-bk-hint">📄 ${escapeHtml(filename)}</p>
          <p class="tmc-bk-hint">🔒 Dữ liệu đã được <b>mã hóa & ký số</b> an toàn.</p>
          ${inApp ? `
            <div class="tmc-bk-warn inapp" style="margin-top: 10px;">
              ⚠️ Nếu bạn đang ở trong Facebook/Messenger mà không thấy file xuất hiện trong máy, hãy bấm <b>Sao Chép Mã Sao Lưu</b> để cất giữ chắc chắn!
            </div>
          ` : ""}
        `,
        actionsClass: inApp ? "column" : "",
        buttons: inApp
          ? [
              { text: "📋 Sao Chép Mã Sao Lưu Ngay", primary: true, onClick: () => this.showCopyBackupCode(file, JSON.stringify(file)) },
              { text: "Xong ✨", secondary: true }
            ]
          : (result === "downloaded"
              ? [{ text: "Tải Lại", onClick: () => this.runSave(file, blob, filename) }, { text: "Tuyệt Vời 💖", primary: true }]
              : [{ text: "Tuyệt Vời 💖", primary: true }])
      });
    }).catch(e => {
      console.error("Lỗi lưu file sao lưu:", e);
      const inApp = this.isInAppBrowser();
      const appName = this.getInAppName();
      this.showOverlay({
        tone: "danger",
        icon: "⚠️",
        title: "Không Thể Lưu File",
        html: `
          <p>${inApp ? `Trình duyệt <b>${escapeHtml(appName)}</b> đã chặn tải file về thiết bị.` : "Trình duyệt đã chặn việc tải hoặc lưu file."}</p>
          <div class="tmc-bk-warn inapp">
            🛡️ <b>Đừng lo!</b> Dữ liệu tiệm chưa bị mất. Bạn hoàn toàn có thể <b>Sao Chép Mã Sao Lưu</b> dạng văn bản để cất giữ và khôi phục bất cứ lúc nào!
          </div>
        `,
        actionsClass: "column",
        buttons: [
          { text: "📋 Sao Chép Mã Sao Lưu Ngay", primary: true, onClick: () => this.showCopyBackupCode(file, JSON.stringify(file)) },
          { text: "🌐 Hướng Dẫn Mở Chrome/Safari", secondary: true, onClick: () => this.showOpenExternalGuide() },
          { text: "Để Sau" }
        ]
      });
    });
  }

  // ---------------- XÁC MINH DỮ LIỆU SAO LƯU ----------------
  static async verifyBackup(rawText) {
    const checks = [];
    const pass = label => checks.push({ ok: true, label });
    const fail = (kind, label, message) => {
      checks.push({ ok: false, label });
      throw new VerifyError(kind, message, checks);
    };

    let file;
    let cleanText = String(rawText || "").trim();
    // Bỏ cú pháp markdown code block nếu người dùng copy kèm ```json ... ```
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    try {
      file = JSON.parse(cleanText);
    } catch (e) {
      // Hỗ trợ trích xuất khối JSON {...} nếu người dùng vô tình dán kèm chữ xung quanh
      const jsonMatch = cleanText.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        try {
          file = JSON.parse(jsonMatch[1]);
        } catch (e2) {}
      }
      if (!file) {
        fail("format", "Đọc cấu trúc JSON", "Dữ liệu không phải mã JSON hợp lệ hoặc đã bị thiếu/hỏng nội dung.");
      }
    }
    pass("Đọc cấu trúc JSON");

    if (!file || typeof file !== "object" || file.format !== BACKUP_FORMAT || (file.v >= 2 && file.game !== GAME_NAME)) {
      fail("format", "Nhận diện file sao lưu Tiệm Mỳ Cay", "Đây không phải dữ liệu sao lưu của Tiệm Mỳ Cay.");
    }
    if (typeof file.v !== "number" || file.v > BACKUP_VERSION) {
      fail("unsupported", "Phiên bản định dạng sao lưu", "Dữ liệu sao lưu được tạo từ phiên bản game mới hơn. Hãy cập nhật game rồi thử lại.");
    }
    const required = ["gameVersion", "createdAt", "salt", "iv", "data", "sig"];
    if (required.some(k => typeof file[k] !== "string") || !file.preview || typeof file.preview !== "object") {
      fail("tampered", "Đầy đủ các trường bắt buộc", "Dữ liệu sao lưu bị thiếu hoặc sai trường dữ liệu — có dấu hiệu đã bị chỉnh sửa.");
    }
    pass("Nhận diện file sao lưu Tiệm Mỳ Cay");

    let salt, iv, cipher, sig;
    try {
      salt = b64ToBytes(file.salt);
      iv = b64ToBytes(file.iv);
      cipher = b64ToBytes(file.data);
      sig = b64ToBytes(file.sig);
      if (salt.length !== 16 || iv.length !== 12 || sig.length !== 32) throw new Error("bad_len");
    } catch (e) {
      fail("tampered", "Kiểm tra mã hóa nhị phân", "Dữ liệu mã hóa trong file đã bị thay đổi.");
    }

    const { aesKey, hmacKey } = await deriveKeys(salt);
    const sigOk = await crypto.subtle.verify("HMAC", hmacKey, sig, textEnc.encode(canonicalString(file)));
    if (!sigOk) {
      fail("tampered", "Xác minh chữ ký số", "Chữ ký số không khớp — file đã bị chỉnh sửa sau khi xuất.");
    }
    pass("Xác minh chữ ký số");

    let inner;
    try {
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, cipher);
      inner = JSON.parse(textDec.decode(plain));
    } catch (e) {
      fail("tampered", "Giải mã dữ liệu", "Không thể giải mã — dữ liệu đã bị can thiệp.");
    }
    pass("Giải mã dữ liệu");

    const state = inner && inner.state;
    const hash = state ? await sha256B64(JSON.stringify(state)) : "";
    if (!state || hash !== inner.stateHash) {
      fail("tampered", "Đối chiếu dữ liệu", "Mã băm dữ liệu không khớp — dữ liệu game đã bị sửa.");
    }
    const p = file.preview || {};
    if (file.v === 1) {
      const expectedV1 = {
        shopName: String(state.shopName || "Tiệm Mỳ Cay"),
        ownerName: String(state.ownerName || ""),
        day: Number(state.day) || 1,
        money: Number(state.money) || 0,
        reputation: Number(state.reputation) || 0
      };
      if (["shopName", "ownerName", "day", "money", "reputation"].some(k => p[k] !== expectedV1[k])) {
        fail("tampered", "Đối chiếu thông tin hiển thị", "Thông tin xem trước không khớp với dữ liệu thật — file đã bị sửa.");
      }
    } else {
      const expectedV2 = buildPreview(state);
      if (["shopName", "day"].some(k => p[k] !== expectedV2[k])) {
        fail("tampered", "Đối chiếu thông tin hiển thị", "Thông tin xem trước không khớp với dữ liệu thật — file đã bị sửa.");
      }
    }
    pass("Đối chiếu dữ liệu");

    const problems = validateState(state);
    if (problems.length) {
      fail("invalid", "Kiểm tra hợp lệ dữ liệu game", `Dữ liệu game bất thường: ${problems.join(", ")}.`);
    }
    pass("Kiểm tra hợp lệ dữ liệu game");

    return { state, preview: buildPreview(state), createdAt: file.createdAt, gameVersion: file.gameVersion, checks };
  }

  // ---------------- KHÔI PHỤC TIẾN TRÌNH ----------------
  // Menu lựa chọn: Tải file .json hoặc Dán mã sao lưu văn bản
  static showRestoreModal() {
    if (!this.isSupported()) {
      this.showErrorScreen({
        title: "Trình duyệt không hỗ trợ",
        message: "Trình duyệt này không hỗ trợ giải mã an toàn (Web Crypto). Hãy dùng Chrome, Edge, Safari hoặc Firefox bản mới qua HTTPS."
      });
      return;
    }

    const inApp = this.isInAppBrowser();
    const appName = this.getInAppName();

    this.showOverlay({
      tone: "info",
      icon: "📦",
      title: "Khôi Phục Bản Lưu Tiệm",
      html: `
        <p class="tmc-bk-lead">Chọn phương thức bạn muốn nạp lại tiến trình game:</p>
        <div class="tmc-bk-restore-options">
          <button type="button" class="tmc-bk-option-card ${inApp ? "" : "highlight"}" id="tmc-opt-restore-file">
            <span class="opt-icon">📁</span>
            <div class="opt-info">
              <b>Tải Lên File .json</b>
              <small>Dùng khi bạn đã tải file .json về thiết bị</small>
            </div>
          </button>
          <button type="button" class="tmc-bk-option-card ${inApp ? "highlight" : ""}" id="tmc-opt-restore-code">
            <span class="opt-icon">📋</span>
            <div class="opt-info">
              <b>Dán Mã Sao Lưu (Văn Bản)</b>
              <small>Khuyên dùng cho ${escapeHtml(appName)}, Ghi chú, Zalo</small>
            </div>
          </button>
        </div>
        ${inApp ? `
          <p class="tmc-bk-hint" style="margin-top: 10px;">
            💡 Đang mở trong ${escapeHtml(appName)}: Hãy chọn <b>Dán Mã Sao Lưu</b> để khôi phục nhanh nhất!
          </p>
        ` : ""}
      `,
      buttons: [
        { text: "Đóng" }
      ]
    });

    const overlay = document.getElementById("tmc-backup-overlay");
    if (!overlay) return;

    const fileOpt = overlay.querySelector("#tmc-opt-restore-file");
    if (fileOpt) {
      fileOpt.addEventListener("click", () => {
        if (window.game && window.game.sound) window.game.sound.playButtonClick();
        overlay.remove();
        this.pickFileAndRestore();
      });
    }

    const codeOpt = overlay.querySelector("#tmc-opt-restore-code");
    if (codeOpt) {
      codeOpt.addEventListener("click", () => {
        if (window.game && window.game.sound) window.game.sound.playButtonClick();
        overlay.remove();
        this.showPasteRestoreModal();
      });
    }
  }

  // Phương thức gọi tương thích ngược
  static pickAndRestore() {
    return this.showRestoreModal();
  }

  // Cách 1: Chọn file .json truyền thống
  static pickFileAndRestore() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    input.addEventListener("change", async () => {
      const f = input.files && input.files[0];
      input.remove();
      if (!f) return;
      if (f.size > MAX_FILE_BYTES) {
        this.showErrorScreen({ title: "File Quá Lớn", message: "File sao lưu không được vượt quá 5MB." });
        return;
      }
      const loading = this.showOverlay({ tone: "info", icon: "🔍", title: "Đang Xác Minh File...", html: "<p>Đang kiểm tra chữ ký số và giải mã dữ liệu, vui lòng đợi giây lát.</p>", buttons: [] });
      try {
        const text = await f.text();
        const result = await this.verifyBackup(text);
        loading.close();
        this.confirmRestore(result);
      } catch (e) {
        loading.close();
        if (e instanceof VerifyError) {
          console.warn("[Backup] Từ chối khôi phục:", e.kind, e.message);
          if (e.kind === "tampered" || e.kind === "invalid") this.showTamperScreen(e);
          else this.showErrorScreen({ title: "Không Thể Khôi Phục", message: e.message, checks: e.checks });
        } else {
          console.error("Lỗi khôi phục:", e);
          this.showErrorScreen({ title: "Không Thể Khôi Phục", message: "Đã xảy ra lỗi khi đọc file. Vui lòng thử lại." });
        }
      }
    });
    document.body.appendChild(input);
    input.click();
  }

  // Cách 2: Dán mã sao lưu (cho người dùng Facebook, Messenger, Zalo, Ghi chú)
  static showPasteRestoreModal() {
    const overlayObj = this.showOverlay({
      tone: "info",
      icon: "📋",
      title: "Dán Mã Sao Lưu",
      html: `
        <p>Dán chuỗi mã sao lưu bạn đã lưu từ Facebook, Messenger, Ghi chú hoặc tin nhắn vào bên dưới:</p>
        <div class="tmc-bk-input-group">
          <textarea id="tmc-paste-textarea" class="tmc-bk-textarea input" rows="5" placeholder="Dán mã sao lưu (chứa TMC-BACKUP) vào đây..." spellcheck="false"></textarea>
          <div class="tmc-bk-paste-tools">
            <button type="button" class="tmc-bk-mini-btn" id="tmc-btn-clipboard-paste">📋 Dán Từ Bộ Nhớ Tạm</button>
            <button type="button" class="tmc-bk-mini-btn" id="tmc-btn-clear-paste">Xóa</button>
          </div>
        </div>
        <p class="tmc-bk-hint">🔒 Dữ liệu sẽ được giải mã và kiểm tra chữ ký số tự động.</p>
        <div id="tmc-paste-error" class="tmc-bk-error-msg" style="display: none;"></div>
      `,
      actionsClass: "column",
      buttons: [
        {
          text: "🔍 Xác Minh & Khôi Phục Ngay",
          primary: true,
          closeModal: false,
          onClick: () => this.handlePasteRestoreSubmit(overlayObj)
        },
        {
          text: "⬅️ Quay Lại",
          onClick: () => this.showRestoreModal()
        }
      ]
    });

    const overlay = overlayObj.overlay;
    const textarea = overlay.querySelector("#tmc-paste-textarea");
    const pasteBtn = overlay.querySelector("#tmc-btn-clipboard-paste");
    const clearBtn = overlay.querySelector("#tmc-btn-clear-paste");
    const errBox = overlay.querySelector("#tmc-paste-error");

    if (textarea) textarea.focus();

    if (pasteBtn && textarea) {
      pasteBtn.addEventListener("click", async () => {
        if (navigator.clipboard && navigator.clipboard.readText) {
          try {
            const text = await navigator.clipboard.readText();
            if (text) {
              textarea.value = text;
              if (errBox) errBox.style.display = "none";
              return;
            }
          } catch (e) {
            // Có thể bị chặn quyền đọc clipboard
          }
        }
        alert("Vui lòng nhấn giữ ngón tay vào ô nhập rồi chọn 'Dán' (Paste).");
      });
    }

    if (clearBtn && textarea) {
      clearBtn.addEventListener("click", () => {
        textarea.value = "";
        if (errBox) errBox.style.display = "none";
        textarea.focus();
      });
    }
  }

  static async handlePasteRestoreSubmit(overlayObj) {
    const overlay = overlayObj.overlay;
    const textarea = overlay.querySelector("#tmc-paste-textarea");
    const errBox = overlay.querySelector("#tmc-paste-error");
    if (!textarea) return;

    let text = textarea.value.trim();
    if (!text) {
      if (errBox) {
        errBox.textContent = "Vui lòng dán mã sao lưu vào ô phía trên.";
        errBox.style.display = "block";
      }
      return;
    }

    // Làm sạch chuỗi: bỏ markdown code block nếu người dùng copy từ chat/ghi chú
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    overlayObj.close();
    const loading = this.showOverlay({
      tone: "info",
      icon: "🔍",
      title: "Đang Xác Minh Mã Sao Lưu...",
      html: "<p>Đang kiểm tra chữ ký số và giải mã dữ liệu tiệm, vui lòng đợi giây lát.</p>",
      buttons: []
    });

    try {
      const result = await this.verifyBackup(text);
      loading.close();
      this.confirmRestore(result);
    } catch (e) {
      loading.close();
      if (e instanceof VerifyError) {
        console.warn("[Backup] Từ chối khôi phục:", e.kind, e.message);
        if (e.kind === "tampered" || e.kind === "invalid") this.showTamperScreen(e);
        else this.showErrorScreen({ title: "Không Thể Khôi Phục", message: e.message, checks: e.checks });
      } else {
        console.error("Lỗi khôi phục:", e);
        this.showErrorScreen({
          title: "Không Thể Khôi Phục",
          message: "Mã sao lưu không đúng định dạng hoặc đã bị thiếu/sai ký tự. Vui lòng kiểm tra và sao chép lại toàn bộ mã."
        });
      }
    }
  }

  static confirmRestore(result) {
    const hasSave = this.hasLocalSave();
    this.showOverlay({
      tone: "info",
      icon: "📦",
      title: "Dữ Liệu Hợp Lệ — Khôi Phục?",
      html: `
        ${this.previewTable(result.preview, result.createdAt, result.state)}
        ${hasSave ? `<p class="tmc-bk-warn">⚠️ Tiến trình hiện tại trên máy này sẽ bị <b>thay thế hoàn toàn</b> bằng bản sao lưu.</p>` : ""}
      `,
      buttons: [
        { text: "Hủy Bỏ" },
        { text: "Khôi Phục Ngay ✨", primary: true, onClick: () => this.applyRestore(result.state) }
      ]
    });
  }

  static applyRestore(state) {
    try {
      // Chặn mọi lần tự lưu của game đang chạy ghi đè lên bản vừa khôi phục
      window.__mycayRestoring = true;
      // Không tính doanh thu offline cho khoảng thời gian từ lúc sao lưu tới lúc khôi phục,
      // và giữ hạn mức offline đã dùng hôm nay trên máy này (chống khôi phục lặp lại để nhận thưởng)
      let current = null;
      try {
        current = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      } catch (e) {}
      state.lastActiveTime = Math.max(Date.now(), Number(current && current.lastActiveTime) || 0);
      const curOff = current && current.offline;
      if (curOff && curOff.capDate) {
        state.offline = Object.assign({}, state.offline || {});
        if (state.offline.capDate !== curOff.capDate || (state.offline.minutesUsedToday || 0) < (curOff.minutesUsedToday || 0)) {
          state.offline.capDate = curOff.capDate;
          state.offline.minutesUsedToday = curOff.minutesUsedToday || 0;
        }
      }
      const rawRestored = JSON.stringify(state);
      localStorage.setItem(SAVE_KEY, rawRestored);
      GameIntegrity.sign(rawRestored);
      localStorage.setItem("mycay_first_name_set", "true");
      localStorage.setItem("mycay_coachmark_seen", "true");
    } catch (e) {
      window.__mycayRestoring = false;
      this.showErrorScreen({ title: "Không Thể Khôi Phục", message: "Bộ nhớ trình duyệt bị đầy hoặc bị chặn." });
      return;
    }
    this.showOverlay({
      tone: "success",
      icon: "🎉",
      title: "Khôi Phục Thành Công!",
      html: "<p>Đang mở lại tiệm với dữ liệu đã khôi phục...</p>",
      buttons: []
    });
    setTimeout(() => location.reload(), 1200);
  }

  // ---------------- GIAO DIỆN ----------------
  static previewTable(p, createdAt, state = null) {
    const s = state || p || {};
    const date = createdAt ? new Date(createdAt) : null;
    const dateText = date && !isNaN(date) ? date.toLocaleString("vi-VN") : "—";
    const shop = s.shopName || (p && p.shopName) || "Tiệm Mỳ Cay";
    const day = s.day != null ? s.day : (p && p.day);
    const ownerName = s.ownerName || (p && p.ownerName);
    const money = s.money != null ? s.money : (p && p.money);
    const rep = s.reputation != null ? s.reputation : (p && p.reputation);
    const avatar = s.ownerAvatar || "assets/cust_cat.png";

    return `
      <div class="tmc-bk-preview">
        <div style="display:flex;align-items:center;gap:10px;grid-column:1/-1;margin-bottom:4px;">
          <img src="${escapeHtml(avatar)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #D97706;background:#FFF;" onerror="this.src='assets/cust_cat.png'" />
          <div>
            <div style="font-weight:800;font-size:14px;color:var(--text-title);">🏪 ${escapeHtml(shop)}</div>
            ${ownerName ? `<div style="font-size:12px;color:var(--text-muted);">👤 Chủ tiệm: <b>${escapeHtml(ownerName)}</b></div>` : ""}
          </div>
        </div>
        <div><span>📅 Ngày kinh doanh</span><b>Ngày ${escapeHtml(day || 1)}</b></div>
        ${money != null ? `<div><span>🪙 Tiền</span><b>${escapeHtml(Math.round(money).toLocaleString("vi-VN"))}k</b></div>` : ""}
        ${rep != null ? `<div><span>⭐ Uy tín</span><b>${escapeHtml(Math.round(rep))}</b></div>` : ""}
        <div><span>🕒 Thời điểm sao lưu</span><b>${escapeHtml(dateText)}</b></div>
      </div>
    `;
  }

  static checksList(checks) {
    return `<ul class="tmc-bk-checks">${checks.map(c =>
      `<li class="${c.ok ? "ok" : "fail"}">${c.ok ? "✅" : "❌"} ${escapeHtml(c.label)}</li>`
    ).join("")}</ul>`;
  }

  static showTamperScreen(err) {
    this.showOverlay({
      tone: "danger",
      icon: "⛔",
      title: "PHÁT HIỆN DỮ LIỆU BỊ CHỈNH SỬA",
      blocking: true,
      html: `
        <p class="tmc-bk-lead"><b>Khôi phục thất bại.</b> ${escapeHtml(err.message)}</p>
        ${this.checksList(err.checks)}
        <p>Dữ liệu sao lưu được mã hóa và ký số khi xuất. Mọi thay đổi nội dung — tiền, ngày, nguyên liệu, thông tin tiệm hay bất kỳ ký tự nào — đều bị phát hiện.</p>
        <p class="tmc-bk-warn">🛡️ Dữ liệu game hiện tại của bạn <b>không bị thay đổi</b>. Hãy dùng đúng mã hoặc file gốc đã xuất từ game.</p>
      `,
      buttons: [{ text: "Đã Hiểu", danger: true }]
    });
  }

  static showErrorScreen({ title, message, checks }) {
    this.showOverlay({
      tone: "danger",
      icon: "⚠️",
      title,
      html: `<p>${escapeHtml(message)}</p>${checks ? this.checksList(checks) : ""}`,
      buttons: [{ text: "Đóng", danger: true }]
    });
  }

  static showOverlay({ tone = "info", icon = "💾", title = "", html = "", buttons = [], blocking = false, actionsClass = "" }) {
    const old = document.getElementById("tmc-backup-overlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "tmc-backup-overlay";
    overlay.className = `tmc-bk-overlay tone-${tone}${blocking ? " is-blocking" : ""}`;
    overlay.setAttribute("role", "alertdialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="tmc-bk-box anime-bounce-in">
        <div class="tmc-bk-icon">${icon}</div>
        <h3 class="tmc-bk-title">${escapeHtml(title)}</h3>
        <div class="tmc-bk-body">${html}</div>
        ${buttons.length ? `<div class="tmc-bk-actions${actionsClass ? " " + actionsClass : ""}"></div>` : ""}
      </div>
    `;
    const close = () => overlay.remove();
    const actions = overlay.querySelector(".tmc-bk-actions");
    buttons.forEach(b => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `tmc-bk-btn${b.primary ? " primary" : ""}${b.danger ? " danger" : ""}${b.secondary ? " secondary" : ""}`;
      btn.textContent = b.text;
      btn.addEventListener("click", () => {
        if (window.game && window.game.sound) window.game.sound.playButtonClick();
        if (b.closeModal !== false) close();
        if (b.onClick) b.onClick();
      });
      actions.appendChild(btn);
    });
    document.body.appendChild(overlay);
    if (tone === "danger" && window.game && window.game.sound && window.game.sound.playButtonClick) {
      window.game.sound.playButtonClick();
    }
    return { close, overlay };
  }
}
