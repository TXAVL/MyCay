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

    for (const badWord of NameValidator.BAD_WORDS) {
      // Tìm theo từ đứng độc lập hoặc cụm từ
      const regex = new RegExp(`(^|\\s)${badWord}(\\s|$)`, "i");
      if (regex.test(normalized) || normalized.includes(badWord)) {
        return {
          isValid: false,
          message: "Tên quán chứa từ ngữ chưa phù hợp. Hãy chọn một cái tên ấm cúng, dễ thương hơn nhé!"
        };
      }
    }

    // Tên hợp lệ
    return {
      isValid: true,
      message: "Tên quán thật dễ thương và ấm cúng! ✨"
    };
  }
}
