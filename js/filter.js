// Bộ lọc kiểm duyệt và xác thực tên tiệm mì cay
// Đảm bảo tên lịch sự, dễ thương, không chứa từ ngữ thô tục, xúc phạm

export class NameValidator {
  // Danh sách từ khóa cấm/nhạy cảm (tiếng Việt & biến thể)
  static BAD_WORDS = [
    "đm", "dm", "dcm", "đcm", "cl", "vcl", "vcc", "vl", "vkl",
    "đéo", "deo", "đụ", "du", "buồi", "buoi", "cặc", "cac",
    "lồn", "lon", "loz", "chó", "cho chet", "óc chó", "oc cho",
    "mẹ mày", "me may", "bố mày", "bo may", "súc vật", "suc vat",
    "ngu", "khốn nạn", "khon nan", "dâm", "dam", "sex", "porn",
    "fuck", "bitch", "shit", "ass", "dick", "pussy", "bastard",
    "chết", "chet", "tự tử", "tu tu", "giết", "giet", "ma túy", "ma tuy"
  ];

  // Từ cấm phải đứng độc lập; chỉ từ dài (>= 4 ký tự) mới so cả chuỗi con
  // để "Nguyễn" không bị bắt nhầm vì chứa "ngu"
  static hasBadWord(normalized) {
    return NameValidator.BAD_WORDS.some(badWord => {
      const regex = new RegExp(`(^|\\s)${badWord}(\\s|$)`, "i");
      return regex.test(normalized) || (badWord.length >= 4 && normalized.includes(badWord));
    });
  }

  // Họ tên chủ tiệm: 2-30 ký tự, chỉ chữ cái & khoảng trắng
  static validatePersonName(rawName) {
    const trimmed = String(rawName || "").replace(/\s+/g, " ").trim();
    if (trimmed.length < 2) return { isValid: false, message: "Vui lòng nhập họ tên chủ tiệm." };
    if (trimmed.length > 30) return { isValid: false, message: "Họ tên tối đa 30 ký tự." };
    if (!/^[\p{L}\s]+$/u.test(trimmed)) return { isValid: false, message: "Họ tên chỉ gồm chữ cái và khoảng trắng." };
    if (NameValidator.hasBadWord(trimmed.toLowerCase())) return { isValid: false, message: "Họ tên chứa từ ngữ chưa phù hợp." };
    return { isValid: true, message: "" };
  }

  /**
   * Kiểm tra tính hợp lệ của tên quán
   * @param {string} rawName 
   * @returns {{ isValid: boolean, message: string }}
   */
  static validate(rawName) {
    if (!rawName) {
      return {
        isValid: false,
        message: "Vui lòng nhập tên cho tiệm mì cay của bạn nha!"
      };
    }

    const trimmed = rawName.trim();

    if (trimmed.length < 3) {
      return {
        isValid: false,
        message: "Tên tiệm mì cần dài tối thiểu 3 ký tự nhé!"
      };
    }

    if (trimmed.length > 25) {
      return {
        isValid: false,
        message: "Tên tiệm mì không nên dài quá 25 ký tự để bảng hiệu hiển thị đẹp nhất!"
      };
    }

    // Kiểm tra ký tự đặc biệt lộn xộn (chỉ cho phép chữ, số, khoảng trắng và icon dễ thương)
    const validCharRegex = /^[\p{L}\p{N}\s🍜🌶️🍥✨❤️🏠]+$/u;
    if (!validCharRegex.test(trimmed)) {
      return {
        isValid: false,
        message: "Tên quán chỉ nên dùng chữ cái, chữ số và khoảng trắng thôi nè!"
      };
    }

    // Chuẩn hóa chuỗi để so sánh từ cấm
    const normalized = trimmed
      .toLowerCase()
      .replace(/[\s\-_.]+/g, " ");

    if (NameValidator.hasBadWord(normalized)) {
      return {
        isValid: false,
        message: "Tên quán chứa từ ngữ chưa phù hợp. Hãy chọn một cái tên ấm cúng, dễ thương hơn nhé!"
      };
    }

    // Tên hợp lệ
    return {
      isValid: true,
      message: "Tên quán thật dễ thương và ấm cúng! ✨"
    };
  }
}
