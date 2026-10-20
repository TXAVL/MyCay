// ==========================================================
// SAO LƯU & KHÔI PHỤC DỮ LIỆU GAME (TXABACKUP)
// File .json được MÃ HÓA (AES-GCM) + KÝ SỐ (HMAC-SHA256) để chống sửa file rồi nạp lại.
// Bất kỳ thay đổi nào (dù chỉ 1 ký tự) trong file đều khiến chữ ký sai -> chặn khôi phục.
// ==========================================================

const SAVE_KEY = "mycay_save_data";
const BACKUP_FORMAT = "TMC-BACKUP";
const BACKUP_VERSION = 1;
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
    ownerName: String(state.ownerName || ""),
    day: Number(state.day) || 1,
    money: Number(state.money) || 0,
    reputation: Number(state.reputation) || 0
  };
}

// Chuỗi chuẩn hóa để ký: thứ tự trường cố định, đổi thứ tự/thêm bớt khóa đều làm sai chữ ký
function canonicalString(file) {
  const p = file.preview || {};
  return [
    file.format, file.v, file.gameVersion, file.createdAt,
    p.shopName, p.ownerName, p.day, p.money, p.reputation,
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
  if (!isNum(state.reputation) || state.reputation < 0 || state.reputation > 100) problems.push("Điểm uy tín không hợp lệ");
  ["noodles", "toppings", "drinks", "supplies", "upgrades", "staff", "stats"].forEach(k => {
    if (state[k] != null && (typeof state[k] !== "object" || Array.isArray(state[k]))) problems.push(`Mục "${k}" sai cấu trúc`);
  });
  if (state.reviews != null && !Array.isArray(state.reviews)) problems.push("Danh sách đánh giá sai cấu trúc");
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

    // 3. Tải trực tiếp về thư mục Tải xuống
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
    const preparing = this.showOverlay({ tone: "info", icon: "🔐", title: "Đang Tạo File Sao Lưu...", html: "<p>Đang mã hóa và ký số dữ liệu tiệm, vui lòng đợi giây lát.</p>", buttons: [] });
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
      this.showErrorScreen({ title: "Sao Lưu Thất Bại", message: "Không thể tạo file sao lưu. Vui lòng thử lại." });
      return;
    }
    preparing.close();
    this.showDownloadReady(file, blob, filename);
  }

  static showDownloadReady(file, blob, filename) {
    const useShare = this.prefersShareSheet() && this.canShareFile(new File([blob], filename, { type: "application/json" }));
    this.showOverlay({
      tone: "info",
      icon: "💾",
      title: "File Sao Lưu Đã Sẵn Sàng",
      html: `
        ${this.previewTable(file.preview, file.createdAt)}
        <p class="tmc-bk-hint">📄 <b>${escapeHtml(filename)}</b> (${Math.max(1, Math.round(blob.size / 1024))} KB)</p>
        <p class="tmc-bk-hint">${useShare ? "Bấm nút bên dưới rồi chọn <b>“Lưu vào Tệp”</b> để cất file." : "Bấm nút bên dưới để tải file về máy."}</p>
      `,
      buttons: [
        { text: "Để Sau" },
        { text: useShare ? "📤 Lưu Vào Tệp" : "⬇️ Tải File Về", primary: true, onClick: () => this.runSave(file, blob, filename) }
      ]
    });
  }

  static runSave(file, blob, filename) {
    this.saveFile(blob, filename).then(result => {
      if (result === "cancelled") {
        this.showDownloadReady(file, blob, filename);
        return;
      }
      const where = {
        saved: "File đã được lưu vào vị trí bạn chọn.",
        shared: "File đã được chuyển tới ứng dụng bạn chọn (ví dụ: Tệp).",
        downloaded: "File đã được tải về thư mục <b>Tải xuống (Downloads)</b> của trình duyệt."
      }[result];
      this.showOverlay({
        tone: "success",
        icon: "✅",
        title: "Đã Sao Lưu Thành Công!",
        html: `
          <p>${where}</p>
          <p class="tmc-bk-hint">📄 ${escapeHtml(filename)}</p>
          <p class="tmc-bk-hint">🔒 File đã được <b>mã hóa & ký số</b>. Hãy giữ nguyên file, <b>không mở ra chỉnh sửa</b> — nếu bị sửa, game sẽ từ chối khôi phục.</p>
        `,
        buttons: result === "downloaded"
          ? [{ text: "Tải Lại", onClick: () => this.runSave(file, blob, filename) }, { text: "Tuyệt Vời 💖", primary: true }]
          : [{ text: "Tuyệt Vời 💖", primary: true }]
      });
    }).catch(e => {
      console.error("Lỗi lưu file sao lưu:", e);
      this.showErrorScreen({ title: "Không Thể Lưu File", message: "Trình duyệt đã chặn việc lưu file. Hãy thử mở game bằng Chrome/Safari (không dùng trình duyệt trong Zalo/Facebook) rồi sao lưu lại." });
    });
  }

  // ---------------- XÁC MINH FILE SAO LƯU ----------------
  static async verifyBackup(rawText) {
    const checks = [];
    const pass = label => checks.push({ ok: true, label });
    const fail = (kind, label, message) => {
      checks.push({ ok: false, label });
      throw new VerifyError(kind, message, checks);
    };

    let file;
    try {
      file = JSON.parse(rawText);
    } catch (e) {
      fail("format", "Đọc cấu trúc JSON", "File không phải JSON hợp lệ hoặc đã bị hỏng nội dung.");
    }
    pass("Đọc cấu trúc JSON");

    if (!file || typeof file !== "object" || file.format !== BACKUP_FORMAT) {
      fail("format", "Nhận diện file sao lưu Tiệm Mỳ Cay", "Đây không phải file sao lưu của Tiệm Mỳ Cay.");
    }
    if (typeof file.v !== "number" || file.v > BACKUP_VERSION) {
      fail("unsupported", "Phiên bản định dạng sao lưu", "File sao lưu được tạo từ phiên bản game mới hơn. Hãy cập nhật game rồi thử lại.");
    }
    const required = ["gameVersion", "createdAt", "salt", "iv", "data", "sig"];
    if (required.some(k => typeof file[k] !== "string") || !file.preview || typeof file.preview !== "object") {
      fail("tampered", "Đầy đủ các trường bắt buộc", "File sao lưu bị thiếu hoặc sai trường dữ liệu — có dấu hiệu đã bị chỉnh sửa.");
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
      fail("tampered", "Xác minh chữ ký số (HMAC-SHA256)", "Chữ ký số không khớp — file đã bị chỉnh sửa sau khi xuất.");
    }
    pass("Xác minh chữ ký số (HMAC-SHA256)");

    let inner;
    try {
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, cipher);
      inner = JSON.parse(textDec.decode(plain));
    } catch (e) {
      fail("tampered", "Giải mã dữ liệu (AES-256-GCM)", "Không thể giải mã — dữ liệu đã bị can thiệp.");
    }
    pass("Giải mã dữ liệu (AES-256-GCM)");

    const state = inner && inner.state;
    const hash = state ? await sha256B64(JSON.stringify(state)) : "";
    if (!state || hash !== inner.stateHash) {
      fail("tampered", "Đối chiếu mã băm SHA-256", "Mã băm dữ liệu không khớp — dữ liệu game đã bị sửa.");
    }
    const expected = buildPreview(state);
    const p = file.preview;
    if (["shopName", "ownerName", "day", "money", "reputation"].some(k => p[k] !== expected[k])) {
      fail("tampered", "Đối chiếu thông tin hiển thị", "Thông tin xem trước không khớp với dữ liệu thật — file đã bị sửa.");
    }
    pass("Đối chiếu mã băm & thông tin hiển thị");

    const problems = validateState(state);
    if (problems.length) {
      fail("invalid", "Kiểm tra hợp lệ dữ liệu game", `Dữ liệu game bất thường: ${problems.join(", ")}.`);
    }
    pass("Kiểm tra hợp lệ dữ liệu game");

    return { state, preview: expected, createdAt: file.createdAt, gameVersion: file.gameVersion, checks };
  }

  // ---------------- NHẬP FILE & KHÔI PHỤC ----------------
  static pickAndRestore() {
    if (!this.isSupported()) {
      this.showErrorScreen({ title: "Trình duyệt không hỗ trợ", message: "Trình duyệt này không hỗ trợ giải mã an toàn (Web Crypto). Hãy dùng trình duyệt bản mới qua HTTPS." });
      return;
    }
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

  static confirmRestore(result) {
    const hasSave = this.hasLocalSave();
    this.showOverlay({
      tone: "info",
      icon: "📦",
      title: "File Hợp Lệ — Khôi Phục?",
      html: `
        ${this.checksList(result.checks)}
        ${this.previewTable(result.preview, result.createdAt)}
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
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
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
  static previewTable(p, createdAt) {
    const date = createdAt ? new Date(createdAt) : null;
    const dateText = date && !isNaN(date) ? date.toLocaleString("vi-VN") : "—";
    return `
      <div class="tmc-bk-preview">
        <div><span>🏪 Tên tiệm</span><b>${escapeHtml(p.shopName)}</b></div>
        ${p.ownerName ? `<div><span>👤 Chủ tiệm</span><b>${escapeHtml(p.ownerName)}</b></div>` : ""}
        <div><span>📅 Ngày kinh doanh</span><b>Ngày ${escapeHtml(p.day)}</b></div>
        <div><span>🪙 Tiền</span><b>${escapeHtml(Math.round(p.money).toLocaleString("vi-VN"))}k</b></div>
        <div><span>⭐ Uy tín</span><b>${escapeHtml(Math.round(p.reputation))}</b></div>
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
      title: "PHÁT HIỆN FILE SAO LƯU BỊ CHỈNH SỬA",
      blocking: true,
      html: `
        <p class="tmc-bk-lead"><b>Khôi phục thất bại.</b> ${escapeHtml(err.message)}</p>
        ${this.checksList(err.checks)}
        <p>File sao lưu được mã hóa và ký số khi xuất. Mọi thay đổi nội dung — tiền, ngày, nguyên liệu, thông tin tiệm hay bất kỳ ký tự nào — đều bị phát hiện.</p>
        <p class="tmc-bk-warn">🛡️ Dữ liệu game hiện tại của bạn <b>không bị thay đổi</b>. Hãy dùng đúng file gốc đã xuất từ game.</p>
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

  static showOverlay({ tone = "info", icon = "💾", title = "", html = "", buttons = [], blocking = false }) {
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
        ${buttons.length ? `<div class="tmc-bk-actions"></div>` : ""}
      </div>
    `;
    const close = () => overlay.remove();
    const actions = overlay.querySelector(".tmc-bk-actions");
    buttons.forEach(b => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `tmc-bk-btn${b.primary ? " primary" : ""}${b.danger ? " danger" : ""}`;
      btn.textContent = b.text;
      btn.addEventListener("click", () => {
        if (window.game && window.game.sound) window.game.sound.playButtonClick();
        close();
        if (b.onClick) b.onClick();
      });
      actions.appendChild(btn);
    });
    document.body.appendChild(overlay);
    if (tone === "danger" && window.game && window.game.sound && window.game.sound.playButtonClick) {
      window.game.sound.playButtonClick();
    }
    return { close };
  }
}
