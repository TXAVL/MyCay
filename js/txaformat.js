// ==========================================================
// BỘ ĐỊNH DẠNG SỐ & TIỀN TỆ GAME TIỆM MỲ CAY (txaformat)
// Chuẩn quy tắc game:
// - Dưới 1000k: Giữ nguyên "XXXk 🪙" (ví dụ: 45k, 250k, 999k)
// - Từ 1000k trở lên: Tự động đổi sang M (ví dụ: 1000k -> 1M, 1250k -> 1.25M, 10000k -> 10M)
// - Từ 1000M trở lên: Tự động đổi sang B (ví dụ: 1000M -> 1B, 2500M -> 2.5B)
// ==========================================================

export class txaformat {
  /**
   * Định dạng tiền tệ đầy đủ kèm icon xu (ví dụ: "250k 🪙", "1.25M 🪙", "3.5B 🪙")
   * @param {number} amount - Số tiền (đơn vị nghìn đồng k)
   * @param {string} unit - Biểu tượng tiền tệ (mặc định "🪙")
   * @returns {string}
   */
  static formatMoney(amount, unit = "🪙") {
    if (amount === undefined || amount === null || isNaN(amount)) return `0k ${unit}`;
    const formatted = txaformat.formatShort(amount);
    return unit ? `${formatted} ${unit}` : formatted;
  }

  /**
   * Định dạng tiền tệ ngắn gọn không kèm icon (ví dụ: "250k", "1M", "1.25M", "2.5B")
   * @param {number} amount - Số tiền (đơn vị nghìn đồng k)
   * @returns {string}
   */
  static formatShort(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return "0k";
    const num = Number(amount);

    // Dưới 1000k: Hiển thị k (ví dụ: 45k, 250k, 999k)
    if (num < 1000) {
      return `${Math.round(num).toLocaleString("en-US")}k`;
    }

    // Từ 1,000k đến dưới 1,000,000k (tương đương 1 triệu đến dưới 1 tỷ): Hiển thị M
    if (num < 1000000) {
      const millions = num / 1000;
      let mStr;
      if (millions < 10) {
        // Ví dụ: 1.25M, 1.5M, 9.8M
        mStr = millions.toFixed(2).replace(/\.?0+$/, "");
      } else if (millions < 100) {
        // Ví dụ: 12.5M, 45.8M
        mStr = millions.toFixed(1).replace(/\.?0+$/, "");
      } else {
        // Ví dụ: 150M, 999M
        mStr = Math.round(millions).toString();
      }
      return `${mStr}M`;
    }

    // Từ 1,000,000k trở lên (tương đương 1 tỷ trở lên): Hiển thị B
    const billions = num / 1000000;
    let bStr;
    if (billions < 10) {
      bStr = billions.toFixed(2).replace(/\.?0+$/, "");
    } else {
      bStr = billions.toFixed(1).replace(/\.?0+$/, "");
    }
    return `${bStr}B`;
  }

  /**
   * Định dạng tiền tệ hiển thị chuẩn VNĐ trong game (ví dụ: 400 -> "400.000đ", 253.5 -> "253.500đ")
   * @param {number} amountInK - Số tiền (đơn vị k = 1.000đ)
   * @returns {string}
   */
  static formatVND(amountInK) {
    if (amountInK === undefined || amountInK === null || isNaN(amountInK)) return "0đ";
    const vnd = Math.round(Number(amountInK) * 1000);
    return `${vnd.toLocaleString("vi-VN")}đ`;
  }

  /**
   * Định dạng số lượng vật phẩm hoặc chỉ số (ví dụ: 125, 1.2k, 15k, 1.5M)
   * @param {number} count 
   * @returns {string}
   */
  static formatNumber(count) {
    if (!count || isNaN(count)) return "0";
    const num = Number(count);
    if (num < 1000) return num.toLocaleString("en-US");
    if (num < 1000000) {
      return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    }
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  /**
   * Chuyển ngược lại chuỗi đã format thành số (nếu cần tính toán)
   * @param {string} str 
   * @returns {number}
   */
  static parseToNumber(str) {
    if (typeof str === "number") return str;
    if (!str) return 0;
    const clean = str.replace(/[^0-9.kKmMbB]/g, "").trim();
    if (clean.endsWith("k") || clean.endsWith("K")) {
      return parseFloat(clean) || 0;
    }
    if (clean.endsWith("m") || clean.endsWith("M")) {
      return (parseFloat(clean) || 0) * 1000;
    }
    if (clean.endsWith("b") || clean.endsWith("B")) {
      return (parseFloat(clean) || 0) * 1000000;
    }
    return parseFloat(clean) || 0;
  }
}

// Đăng ký toàn cục vào window để các modal hoặc hàm inline gọi trực tiếp
if (typeof window !== "undefined") {
  window.txaformat = txaformat;
}
