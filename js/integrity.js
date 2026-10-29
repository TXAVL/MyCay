// ==========================================================
// ĐOÀN KIỂM TRA LIÊN NGÀNH - PHÁT HIỆN GIAN LẬN (v1.9.1, cảnh sát pixel từ v2.0.0)
// Chữ ký bản lưu + dấu hiệu bất thường -> điểm nghi vấn.
// Có nghi vấn thì mỗi lần sang ngày mới chỉ có xác suất RẤT THẤP bị kiểm tra,
// nên người chơi tử tế gần như không bao giờ gặp.
// ==========================================================

const SAVE_KEY = "mycay_save_data";
const SIG_KEY = "mycay_save_sig";
const FLAG_KEY = "mycay_audit_flags";
const SALT = "mycay|tiem-my-cay|v1";

// Xác suất bị kiểm tra mỗi lần sang ngày mới theo điểm nghi vấn (cố ý rất thấp)
const AUDIT_CHANCE = [0, 0.03, 0.06, 0.12];

function hashText(text) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const s = SALT + text;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = (Math.imul(h2 + c, 2246822519) ^ (h2 >>> 13)) >>> 0;
  }
  return h1.toString(36) + "-" + h2.toString(36);
}

export const GameIntegrity = {
  // Ghi chữ ký ngay sau khi ghi bản lưu (game lưu / khôi phục sao lưu)
  sign(rawJson) {
    try {
      localStorage.setItem(SIG_KEY, hashText(rawJson));
    } catch (e) {}
  },

  // Bản lưu có bị sửa tay ngoài game không? (chưa có chữ ký = bản cũ, tin tưởng)
  isSaveTampered(rawJson) {
    try {
      const sig = localStorage.getItem(SIG_KEY);
      if (!sig || !rawJson) return false;
      return sig !== hashText(rawJson);
    } catch (e) {
      return false;
    }
  },

  getFlags() {
    try {
      const f = JSON.parse(localStorage.getItem(FLAG_KEY) || "{}");
      return f && typeof f === "object" ? f : {};
    } catch (e) {
      return {};
    }
  },

  // Mỗi loại dấu hiệu chỉ tính một lần
  addFlag(name) {
    try {
      const f = this.getFlags();
      if (f[name]) return;
      f[name] = Date.now();
      localStorage.setItem(FLAG_KEY, JSON.stringify(f));
    } catch (e) {}
  },

  clearFlags() {
    try {
      localStorage.removeItem(FLAG_KEY);
      localStorage.removeItem(SIG_KEY);
    } catch (e) {}
  },

  // Dấu hiệu chỉ số bất khả thi trong state vừa nạp
  scanState(state) {
    if (!state) return;
    const num = v => typeof v === "number" && Number.isFinite(v);
    const day = num(state.day) ? state.day : 1;
    const loan = state.eco && state.eco.loan && num(state.eco.loan.balance) ? state.eco.loan.balance : 0;
    const money = (num(state.money) ? state.money : 0) - loan; // tiền vay hợp lệ không bị coi là bất thường
    const total = state.stats && num(state.stats.totalRevenue) ? state.stats.totalRevenue : 0;
    const savings = state.bank && num(state.bank.savings) ? state.bank.savings : 0;

    if (!num(state.money) || state.money < 0 || !num(state.reputation) || state.reputation > 1000) {
      this.addFlag("impossible_value");
    }
    // Tiền trong tay + ngân hàng vượt xa mọi mức doanh thu có thể kiếm được ở số ngày đã chơi
    if (money + savings > 50000 + day * 4000) this.addFlag("money_too_high");
    // Doanh thu lũy kế đã ghi mà tiền lại lớn hơn hẳn: dấu hiệu sửa tiền
    if (total > 0 && money > total * 3 + 5000) this.addFlag("money_vs_revenue");
    // Tồn kho phi thực tế
    const groups = [state.noodles, state.toppings, state.drinks];
    for (const g of groups) {
      if (!g) continue;
      for (const k in g) {
        if (g[k] && g[k].stock > 5000) { this.addFlag("stock_too_high"); return; }
      }
    }
  },

  // Điểm nghi vấn hiện tại
  score() {
    return Math.min(AUDIT_CHANCE.length - 1, Object.keys(this.getFlags()).length);
  },

  // Gọi khi sang ngày mới: true nếu Đoàn kiểm tra xuất hiện
  rollAudit() {
    const chance = AUDIT_CHANCE[this.score()] || 0;
    return chance > 0 && Math.random() < chance;
  }
};

if (typeof window !== "undefined") window.GameIntegrity = GameIntegrity;
