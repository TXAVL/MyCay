// ==========================================================
// ĐÁNH GIÁ THỰC KHÁCH & PHÂN TÍCH PHẢN HỒI CHỦ TIỆM (TXAREVIEWS)
// - Chấm sao 1->5 theo điểm tổng hợp (tốc độ, giá, món kèm, nguyên liệu, tính cách khách...)
// - Ghép nội dung đánh giá từ đúng vấn đề khách gặp phải
// - Đọc hiểu lời chủ tiệm (xin lỗi, đền bù, đổ lỗi, cà khịa, văng tục...) để khách đáp lại đúng nội dung
// ==========================================================

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function hashString(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Tính cách cố định theo tên khách: quyết định độ khó tính & giọng văn
const PERSONAS = [
  { key: "genz", leniency: 4 },
  { key: "polite", leniency: 6 },
  { key: "sassy", leniency: -6 },
  { key: "picky", leniency: -10 },
  { key: "chill", leniency: 10 }
];

export function getPersona(name) {
  return PERSONAS[hashString(name) % PERSONAS.length];
}

export function starsFromScore(score) {
  if (score >= 88) return 5;
  if (score >= 72) return 4;
  if (score >= 55) return 3;
  if (score >= 38) return 2;
  return 1;
}

// Nhãn vấn đề -> cách khách gọi tên vấn đề trong câu
export const ISSUE_TEXT = {
  slow: "chờ lâu",
  very_slow: "chờ mòn mỏi",
  price: "giá chát",
  missing: "thiếu món kèm",
  lack: "vị không tròn",
  rejected: "bị từ chối phục vụ",
  walkout: "chờ tới mức bỏ về",
  spill: "đổ nước dùng",
  late: "giao trễ",
  cold: "mì nguội",
  packing: "đóng gói ẩu"
};

// Từ khóa cho thấy chủ tiệm nói đúng vào vấn đề khách phàn nàn
const ISSUE_KEYWORDS = {
  slow: /cham|lau|doi|cho (lau|doi)|nhanh|toc do|bep|ra mon|phuc vu/,
  very_slow: /cham|lau|doi|nhanh|toc do|bep|ra mon|phuc vu/,
  price: /gia|dat|tien|re|khuyen mai|giam|chat chem/,
  missing: /het|thieu|topping|do uong|nuoc|ly|mon kem|bu/,
  lack: /vi|nem|nuoc dung|nguyen lieu|chat luong|cong thuc|mi soi|nuoc ham/,
  rejected: /tu choi|het cho|khong phuc vu|khong nhan|het ban|het mon/,
  walkout: /cho lau|bo ve|doi|cham|qua tai|dong/,
  spill: /dong goi|ep mang|tran|do ra|hop|nap|niem phong/,
  late: /shipper|tai xe|giao|tre|ship|van chuyen/,
  cold: /nguoi|nong|giu nhiet/,
  packing: /dong goi|ep mang|hop|nap|thung|niem phong/
};

// ---------------- CHUẨN HÓA TIẾNG VIỆT (giữ bản đồ vị trí để trích dẫn đúng lời chủ tiệm) ----------------
function normalizeWithMap(raw) {
  const lower = String(raw || "").toLowerCase();
  let out = "";
  const map = [];
  for (let i = 0; i < lower.length; i++) {
    let c = lower[i];
    if (c === "đ") c = "d";
    else c = c.normalize("NFD").replace(/[̀-ͯ]/g, "");
    for (let k = 0; k < c.length; k++) {
      out += c[k];
      map.push(i);
    }
  }
  return { norm: out, map, lower };
}

// Trích nguyên vế câu chứa từ khóa (tách theo dấu câu và liên từ) để khách "nhắc lại" đúng lời chủ tiệm
const CLAUSE_SPLIT = /[.,!?;:\n]|\s(?:và|nhưng|nên|vì|còn|với lại|tuy nhiên)\s/giu;

function quoteFrom(raw, normInfo, match) {
  if (!match) return "";
  const start = normInfo.map[match.index];
  const end = normInfo.map[match.index + match[0].length - 1];
  if (start == null || end == null) return match[0];
  const text = String(raw);
  let s = 0;
  let e = text.length;
  CLAUSE_SPLIT.lastIndex = 0;
  let m;
  while ((m = CLAUSE_SPLIT.exec(text))) {
    const mEnd = m.index + m[0].length;
    if (mEnd <= start) s = mEnd;
    else if (m.index > end) {
      e = m.index;
      break;
    }
  }
  let clause = text.slice(s, e).trim().replace(/\s+/g, " ");
  if (clause.length > 55) {
    // Vế quá dài: lấy từ khóa kèm vài từ phía sau, cắt đúng ranh giới từ
    const tail = text.slice(start, e).trim().split(/\s+/);
    clause = tail.slice(0, 6).join(" ");
    if (tail.length > 6) clause += "…";
  }
  return clause.replace(/^(dạ|vâng|ừ|thì)\s+/i, "");
}

// Bộ từ khóa nhận diện ý định trong lời chủ tiệm (so trên chuỗi đã bỏ dấu)
const INTENTS = {
  apology: /\b(xin loi|sorry|so ri|xl|thanh that xin|ay nay|nhan loi|loi cua (tiem|quan|minh|em|chung toi)|that le|mong (ban|quy khach|anh|chi)? ?(thong cam|bo qua|luong thu)|luong thu)\b/,
  thanks: /\b(cam on|thank|thanks|tks|thanks you|cam ta|biet on|tri an)\b/,
  compensation: /\b(tang|den bu|bu (cho|lai|them)|voucher|giam gia|mien phi|free|khao|dai (ban|anh|chi|em)|hoan tien|tra lai tien|qua tang|coupon)\b/,
  promise: /\b(se (cai thien|khac phuc|rut kinh nghiem|chu y|sua|nhanh hon|co gang|nang cap|dieu chinh|lam tot)|rut kinh nghiem|cam ket|hua|chan chinh|nhac nho|khac phuc|cai thien|dieu chinh|lan sau (se|tiem se|quan se|minh se|em se))\b/,
  explain: /\b(dong khach|dong qua|qua tai|gio cao diem|thieu (nguoi|nhan vien|nhan su)|het hang|ket xe|troi mua|mua to|kep|bat ngo|su co|nhap hang|don dap|cao diem)\b/,
  blame: /\b(tai (ban|khach|ban than)|ban (tu )?goi|khach (kho tinh|khong biet|lam qua|kho chieu)|khong biet (an|thuong thuc)|ai bao|ai muon|ai khien|tu chiu|lan sau (dung|khoi|dung co) (den|ghe|an|quay lai)|khong an thi|di quan khac|an khong noi thi|thi dung an|ke ban)\b/,
  dismiss: /^(ok|oke|okela|uh|u|um|uk|uhm|vang|da|ke|tuy|thi sao|roi sao|chiu|ke di|sao cung duoc|ke ban|ok ban)[.!\s]*$|\b(ke ban|ke di|thi sao|roi sao|tuy ban|sao cung duoc|ai quan|mac ke|ke no)\b/,
  humor: /(haha|hihi|hehe|kkk|=\)\)|:\)\)|ahihi|hoho|lay loi|xin quy|quy goi|dai nhan)/,
  invite: /\b(ghe lai|quay lai|hen gap|lan sau ghe|cho (tiem|quan|minh|em) co hoi|gap lai|ghe tiem|ghe quan)\b/,
  polite: /\b(da|a|nha|nhe|quy khach|kinh|vui long)\b/,
  question: /\?|\b(duoc khong|the nao|sao a|o dau|khi nao|mon gi|bao gio)\b/
};

// Từ ngữ thô tục / xưng hô hỗn (so trên chuỗi chữ thường còn dấu để tránh nhầm "cho" với "chó")
const RUDE_ACCENT = /(^|[^\p{L}])(mày|tao|đéo|đ[ée]o|chó|ngu|cút|câm mồm|im mồm|láo|hãm|xéo|biến đi|thằng|con mẹ|mẹ mày|bố mày|vãi|đĩ|lồn|buồi|cặc)(?=$|[^\p{L}])/u;
const RUDE_PLAIN = /\b(dm|dmm|dcm|dkm|vcl|vkl|vl|clm|cmm|dit|du ma|deo|vai lon|cc)\b/;

export function analyzeOwnerReply(text, review, history = []) {
  const raw = String(text || "").trim();
  const info = normalizeWithMap(raw);
  const norm = info.norm;
  const intents = {};
  const quotes = {};

  Object.entries(INTENTS).forEach(([key, re]) => {
    const m = norm.match(re);
    if (m) {
      intents[key] = true;
      quotes[key] = quoteFrom(raw, info, m);
    }
  });

  const rudeAccent = info.lower.match(RUDE_ACCENT);
  const rudePlain = norm.match(RUDE_PLAIN);
  if (rudeAccent || rudePlain) {
    intents.rude = true;
    quotes.rude = rudeAccent ? rudeAccent[2] : quoteFrom(raw, info, rudePlain);
  }

  const words = norm.split(/\s+/).filter(Boolean);
  const letters = raw.replace(/[^\p{L}]/gu, "");
  const shouting = letters.length >= 8 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
  const short = words.length > 0 && words.length < 4;
  const copyPaste = raw.length > 0 && history.some(h => h && h.trim().toLowerCase() === raw.toLowerCase());

  const issues = (review && review.issues && review.issues.length) ? review.issues : inferIssues(review && review.comment);
  const addressed = issues.filter(iss => ISSUE_KEYWORDS[iss] && ISSUE_KEYWORDS[iss].test(norm));

  const nameParts = String((review && review.customerName) || "").toLowerCase().split(/\s+/).filter(w => w.length >= 3);
  const mentionsName = nameParts.some(w => info.lower.includes(w));

  return { raw, norm, words: words.length, intents, quotes, shouting, short, copyPaste, issues, addressed, mentionsName };
}

// Đánh giá cũ chưa có nhãn vấn đề -> đoán từ nội dung bình luận
export function inferIssues(comment) {
  const n = normalizeWithMap(comment || "").norm;
  const out = [];
  if (/bo ve|bo di/.test(n)) out.push("walkout");
  if (/tu choi|xua tay|khong (them )?tiep|duoi kheo/.test(n)) out.push("rejected");
  if (/cho (qua )?lau|doi (lau|mon moi)|cham|giuc/.test(n)) out.push("slow");
  if (/gia|chat chem|dat do|xot/.test(n)) out.push("price");
  if (/het|thieu/.test(n) && /goi kem|topping|do uong/.test(n)) out.push("missing");
  if (/la mieng|thieu .*(mi soi|nuoc ham|nieu)|vi khong tron/.test(n)) out.push("lack");
  if (/tran|do ra|buc nap|uot/.test(n)) out.push("spill");
  if (/tre|giao lau|shipper/.test(n) && /tre|lau|quang/.test(n)) out.push("late");
  if (/nguoi/.test(n)) out.push("cold");
  return out;
}

// ---------------- CHẤM SAO & VIẾT ĐÁNH GIÁ ----------------
const OPENERS = {
  5: ["Mê thật sự!", "10 điểm không có nhưng!", "Quán ruột từ nay nha!", "Đỉnh nóc kịch trần luôn á!", "Ăn xong muốn quay lại liền!"],
  4: ["Nhìn chung ổn áp nha.", "Khá hài lòng nè.", "Ăn ngon, có chút xíu chưa ưng.", "Trải nghiệm tốt, gần 5 sao rồi."],
  3: ["Tạm được thôi.", "Bình thường, không quá ấn tượng.", "Ăn được nhưng chưa tới.", "Nửa ưng nửa không."],
  2: ["Hơi thất vọng.", "Không như kỳ vọng luôn.", "Lần này chưa ổn rồi quán ơi.", "Buồn ghê."],
  1: ["Thất vọng tràn trề.", "Trải nghiệm tệ thật sự.", "Không bao giờ quay lại.", "Quá tệ!"]
};

const CLOSERS = {
  5: ["Chắc chắn rủ hội bạn ghé tiếp! 💖", "Ủng hộ quán dài dài nha! ⭐", "Recommend mạnh cho mọi người! 🔥", "Yêu quán! 🥰"],
  4: ["Lần sau ghé tiếp. 👍", "Cố thêm chút là 5 sao liền! ✨", "Vẫn sẽ quay lại nha. 🍜"],
  3: ["Mong quán cải thiện. 🙂", "Chắc sẽ thử lại một lần nữa.", "Cần cố gắng hơn nha quán."],
  2: ["Chắc phải cân nhắc trước khi quay lại. 😕", "Quán xem lại giùm nha. 👎", "Lần này hụt hẫng ghê."],
  1: ["1 sao cho bài học này. 🚫", "Cảnh báo mọi người luôn! 😤", "Phí tiền phí thời gian. 💢"]
};

function serviceLine(patienceRatio, noodle) {
  if (patienceRatio >= 0.7) return pick([`Lên món nhanh, niêu ${noodle} còn sôi xì xèo.`, "Phục vụ nhanh như chớp.", "Ngồi chưa ấm chỗ đã có mì."]);
  if (patienceRatio >= 0.5) return pick(["Chờ một chút nhưng chấp nhận được.", "Ra món hơi chậm xíu.", "Quán đông nên đợi một lúc."]);
  if (patienceRatio >= 0.3) return pick(["Chờ khá lâu mới có mì.", "Đợi lâu, lướt hết mấy cái TikTok luôn.", "Ra món chậm, sốt ruột ghê."]);
  return pick(["Chờ mòn mỏi, đói lả cả người.", "Đợi lâu tới mức muốn hủy món.", "Giục mấy lần mới có mì."]);
}

function foodLine(stars, noodle, spicy, likesSpicy) {
  if (stars >= 4) {
    const lines = [`${noodle} cấp ${spicy} nước dùng đậm đà, sợi mì dai.`, `Nước hầm ngọt xương, ${noodle} vừa miệng.`, `Cấp ${spicy} cay chuẩn gu, ăn cuốn ghê.`];
    if (spicy >= 6 && likesSpicy) lines.push(`Cấp ${spicy} cay xé lưỡi mà đã ghê, đúng gu ăn cay của mình! 🔥`);
    return pick(lines);
  }
  if (stars === 3) return pick([`${noodle} ăn ổn, chưa có gì đặc sắc.`, "Vị mì tạm được.", `Cấp ${spicy} ăn được, nước dùng hơi nhạt.`]);
  return pick([`${noodle} bưng ra kém hấp dẫn.`, "Nước dùng không còn nóng nữa.", "Ăn không thấy ngon như lời đồn."]);
}

// Chấm sao khách ăn tại quán; trả về sao, nội dung, nhãn vấn đề
export function rateDineIn(ctx) {
  const persona = getPersona(ctx.customerName);
  const issues = [];
  let score = 74 + persona.leniency;

  const p = ctx.patienceRatio;
  if (p >= 0.7) score += 16;
  else if (p >= 0.5) score += 4;
  else if (p >= 0.3) { score -= 10; issues.push("slow"); }
  else if (p >= 0.15) { score -= 22; issues.push("slow"); }
  else { score -= 34; issues.push("very_slow"); }

  if (ctx.priceRatio > 1.35) { score -= 22; issues.push("price"); }
  else if (ctx.priceRatio > 1.15) { score -= 9; issues.push("price"); }
  else if (ctx.priceRatio <= 0.85) score += 8;

  if (ctx.missingItem) { score -= 14; issues.push("missing"); }
  if (ctx.lackSupplies) { score -= 18; issues.push("lack"); }
  if (ctx.isSpecialCombo) score += 14;
  if (ctx.spicy >= 6 && ctx.likesSpicy) score += 6;
  if (ctx.owl) score += 7;
  if (ctx.isVip) score -= 5;
  score += Math.min(6, Math.max(0, (ctx.decorScore || 1) - 1) * 2);
  score += Math.round((Math.random() - 0.5) * 16);

  const stars = starsFromScore(score);
  const parts = [pick(OPENERS[stars])];
  parts.push(foodLine(stars, ctx.noodleName, ctx.spicy, ctx.likesSpicy));
  parts.push(serviceLine(p, ctx.noodleName));
  if (issues.includes("price")) {
    parts.push(ctx.priceRatio > 1.35
      ? pick([`Tô ${ctx.bowlPrice}k mà chát quá, xót ví ghê. 💸`, `${ctx.bowlPrice}k một tô là hơi bị chặt chém rồi.`])
      : pick([`Giá ${ctx.bowlPrice}k hơi cao so với mặt bằng chung.`, "Giá nhỉnh hơn mấy quán khác chút."]));
  } else if (ctx.priceRatio <= 0.85) {
    parts.push(pick([`Giá có ${ctx.bowlPrice}k, quá hời! 💰`, "Giá sinh viên mà chất lượng ngon."]));
  }
  if (ctx.missingItem) parts.push(`Gọi kèm ${ctx.missingName || "món phụ"} mà quán báo hết, tiếc ghê.`);
  if (ctx.lackSupplies) parts.push(`Hình như quán thiếu ${String(ctx.lackName || "nguyên liệu").toLowerCase()} nên vị không tròn như mọi khi.`);
  if (ctx.isSpecialCombo) parts.push("Món đặc biệt hôm nay đáng tiền thật sự! 🌟");
  if (ctx.owl && stars >= 4) parts.push("Thấy quán viral trên mạng nên ghé, không phí công! 🦉");
  parts.push(pick(CLOSERS[stars]));

  return { stars, comment: parts.join(" "), issues, persona: persona.key };
}

// Chấm sao đơn online
export function rateOnline(ctx) {
  const persona = getPersona(ctx.customerName);
  const issues = [];
  let score = 76 + persona.leniency;
  if (ctx.isPacked) score += 12;
  else {
    score -= 4;
    if (Math.random() < 0.3) { score -= 24; issues.push("spill"); }
    else if (Math.random() < 0.25) { score -= 10; issues.push("packing"); }
  }
  if (Math.random() < 0.2) { score -= 14; issues.push("late"); }
  if (Math.random() < (ctx.isPacked ? 0.05 : 0.2)) { score -= 10; issues.push("cold"); }
  if (ctx.owl) score += 6;
  score += Math.round((Math.random() - 0.5) * 16);

  const stars = starsFromScore(score);
  const parts = [pick(OPENERS[stars])];
  if (issues.includes("spill")) parts.push("Không ép màng nắp nên nước dùng đổ lênh láng ra túi. 😩");
  if (issues.includes("packing")) parts.push("Đóng gói hơi ẩu, hộp móp méo.");
  if (issues.includes("late")) parts.push(`${ctx.shipperName || "Shipper"} giao trễ, chờ dài cổ.`);
  if (issues.includes("cold")) parts.push("Mở ra mì nguội mất rồi.");
  if (!issues.length) {
    parts.push(ctx.isPacked
      ? pick([`Ép màng niêu kỹ, mở ra vẫn còn bốc khói. 🍲`, `Đặt qua ${ctx.app} mà ngon y như ăn tại quán.`])
      : pick([`Giao qua ${ctx.app} nhanh, mì còn ấm.`, "Đồ ăn tới nơi vẫn ổn."]));
  }
  if (stars >= 4) parts.push(pick([`${ctx.shipperName || "Shipper"} lịch sự, giao tận cửa.`, "Nước dùng đậm đà, topping đầy đặn."]));
  parts.push(pick(CLOSERS[stars]));
  return { stars, comment: parts.join(" "), issues, persona: persona.key };
}

// ---------------- KHÁCH HỒI ĐÁP THEO NỘI DUNG CHỦ TIỆM VIẾT ----------------
function issueWord(issues) {
  return ISSUE_TEXT[issues[0]] || "trải nghiệm hôm đó";
}

function styleWrap(persona, text, tone) {
  const tails = {
    genz: { good: [" nha 🫶", " á 🥹", " ✨"], bad: [" 🙄", " xỉu 😑", " khum ổn đâu 😤"], mid: [" nha", " á", ""] },
    polite: { good: [" ạ 😊", " ạ 💖", ". Cảm ơn quán ạ."], bad: [" ạ.", ". Mong quán xem lại ạ.", " ạ 😕"], mid: [" ạ.", ".", " nhé."] },
    sassy: { good: [" 💅", " đó, lần này tha 😌", ""], bad: [" 💅", " 🙃", ", đừng để em nói nhiều 😏"], mid: [" 💅", "", " đó"] },
    picky: { good: [". Giữ phong độ.", ". Ok.", " 👍"], bad: [". Không chấp nhận được.", ". Thất vọng.", " 👎"], mid: [".", ". Để xem lần sau.", ""] },
    chill: { good: [" hehe 🍜", " 😄", " nè 💖"], bad: [" 😅", " đó 😶", "..."], mid: [" 😄", "", " nè"] }
  };
  const t = tails[persona] || tails.genz;
  const base = text.replace(/[.!…]+$/, "");
  // Câu đã kết bằng trợ từ thì chỉ thêm biểu cảm, không lặp "nha nha", "ạ ạ"
  const endsWithParticle = /(nha|nhé|nhe|á|ạ|đó|nè|ha|luôn|rồi|quán)$/i.test(base);
  let tail = pick(t[tone]);
  if (endsWithParticle) tail = tail.replace(/^[\s,.]*(nha|nhé|á|ạ|đó|nè|hehe)?\s*/i, " ").trimEnd();
  return (base + tail).replace(/\s+$/, "") + (/[\p{Extended_Pictographic}.!?…]$/u.test(base + tail) ? "" : ".");
}

// Tính điểm hài lòng của khách với lời phản hồi
function scoreReply(a, stars) {
  const i = a.intents;
  let s = 0;
  const complaint = stars <= 3;
  if (complaint) {
    if (i.apology) s += 3;
    if (i.compensation) s += 3;
    if (i.promise) s += 2;
    if (a.addressed.length) s += 3;
    if (i.explain) s += (i.apology ? 1 : -1);
    if (i.thanks && !i.apology && !i.promise && !a.addressed.length) s -= 2;
    if (i.humor) s += (i.apology ? 1 : (stars <= 1 ? -2 : 0));
  } else {
    if (i.thanks) s += 2;
    if (i.compensation) s += 1;
    if (stars === 4 && (i.promise || a.addressed.length)) s += 2;
    if (i.humor) s += 1;
  }
  if (i.polite) s += 1;
  if (i.invite) s += 1;
  if (a.mentionsName) s += 1;
  if (a.words >= 12) s += 1;
  if (i.blame) s -= 6;
  if (i.dismiss) s -= 3;
  if (i.rude) s -= 7;
  if (a.shouting) s -= 2;
  if (a.short) s -= 1;
  if (a.copyPaste) s -= 2;
  return s;
}

function tierOf(score) {
  if (score >= 6) return "delighted";
  if (score >= 3) return "pleased";
  if (score >= -1) return "neutral";
  if (score >= -4) return "annoyed";
  return "furious";
}

// Trả về câu khách hồi đáp + tác động (sao, danh tiếng, tip) + nhãn phân tích hiển thị cho người chơi
export function composeCustomerResponse(analysis, review) {
  const a = analysis;
  const i = a.intents;
  const q = a.quotes;
  const stars = review.stars || 5;
  const persona = review.persona || getPersona(review.customerName).key;
  const score = scoreReply(a, stars);
  const tier = tierOf(score);
  const issue = issueWord(a.issues);
  const lines = [];

  // 1. Phản ứng với điểm nổi bật nhất trong lời chủ tiệm (ưu tiên điều tiêu cực trước)
  if (i.rude) {
    lines.push(pick([
      `"${q.rude}"? Bán hàng mà nói chuyện với khách vậy hả? Chụp màn hình lại rồi đó.`,
      `Quán dùng chữ "${q.rude}" với khách luôn hả trời. Không biết ai là khách ai là chủ nữa.`,
      `Đọc tới chữ "${q.rude}" là đủ hiểu cái nết của quán rồi.`
    ]));
  } else if (i.blame) {
    lines.push(pick([
      `Quán bảo "${q.blame}" là đổ lỗi cho khách hả? Em ${issue} là thật mà.`,
      `"${q.blame}"? Khách bỏ tiền ra ăn chứ có phải xin đâu.`,
      `Không nhận lỗi mà còn quay sang trách khách "${q.blame}", hay ghê.`
    ]));
  } else if (i.dismiss) {
    lines.push(pick([
      `Một câu "${q.dismiss}" là xong hả quán? Vậy em cũng kệ quán luôn.`,
      `"${q.dismiss}"... trả lời cho có vậy thì thôi khỏi trả lời.`,
      `Em góp ý nghiêm túc mà nhận lại "${q.dismiss}", buồn ghê.`
    ]));
  } else if (stars <= 3) {
    if (i.apology && a.addressed.length) {
      lines.push(pick([
        `Thấy quán nhận đúng vụ ${issue} là em nguôi nhiều rồi.`,
        `Quán hiểu đúng chuyện ${issue} của em, vậy là được.`
      ]));
    } else if (i.apology) {
      lines.push(pick([
        `Xin lỗi thì em nhận, mà quán chưa nói gì tới vụ ${issue} hết á.`,
        `Ok quán xin lỗi, nhưng chuyện ${issue} thì tính sao?`
      ]));
    } else if (i.thanks && !a.addressed.length) {
      lines.push(pick([
        `Em chê ${issue} mà quán "${q.thanks}"? Đọc kỹ review giùm em.`,
        `"${q.thanks}" gì trời, em đang phàn nàn ${issue} mà. Rep như bot vậy.`
      ]));
    } else if (i.explain) {
      lines.push(pick([
        `"${q.explain}" thì em hiểu, nhưng nghe giống bao biện hơn là nhận lỗi.`,
        `Lý do "${q.explain}" thì quán nào chả có, khách cần một câu xin lỗi thôi.`
      ]));
    } else if (a.addressed.length) {
      lines.push(`Ít ra quán có để ý chuyện ${issue}.`);
    } else {
      lines.push(pick([
        `Em phàn nàn ${issue} mà quán trả lời lạc đề quá.`,
        `Quán đọc review chưa vậy? Em nói chuyện ${issue} mà.`
      ]));
    }
    if (i.explain && i.apology) lines.push(`"${q.explain}" thì em thông cảm, buôn bán mà.`);
  } else {
    if (i.apology && stars === 5) lines.push("Ủa em khen mà sao quán xin lỗi vậy 😂 Mà thôi dễ thương ghê.");
    else if (stars === 4 && (i.promise || a.addressed.length)) lines.push("Quán chịu lắng nghe góp ý nhỏ vậy là 5 sao trong lòng em rồi.");
    else if (i.thanks) lines.push(pick(["Dạ không có chi, đồ ăn quán ngon thật mà!", "Cảm ơn gì đâu, ngon thì khen thôi!", "Quán khách sáo quá nè!"]));
    else lines.push(pick(["Đọc phản hồi của quán thấy vui ghê!", "Quán rep có tâm ghê!"]));
  }

  // 2. Chi tiết phụ: đền bù, hứa hẹn, gọi tên, hài hước, câu hỏi
  if (i.compensation && !i.rude && !i.blame) {
    lines.push(pick([
      `Quán hứa "${q.compensation}" đó nha, lần sau em ghé đòi thiệt luôn.`,
      `"${q.compensation}" hả? Ok em ghi nhận, nhớ giữ lời nha quán.`
    ]));
  }
  if (i.promise && stars <= 3 && !i.rude && !i.blame) {
    lines.push(pick([
      `"${q.promise}" — câu này em nhớ đó, lần sau mà vẫn ${issue} là em review tiếp.`,
      `Quán nói "${q.promise}" thì em chờ xem thay đổi thật nha.`
    ]));
  }
  if (a.mentionsName && tier !== "furious") lines.push(pick(["Quán còn nhớ tên em nữa, cưng xỉu 🥹", "Được gọi tên thấy thân thiết ghê."]));
  if (i.humor && !i.rude) {
    lines.push(stars <= 1 && !i.apology
      ? "Em đang bực mà quán còn giỡn được, hết nói 😑"
      : pick(["Haha quán lầy ghê, cười xỉu.", "Chủ quán hài thật sự 🤣"]));
  }
  if (i.question && !i.rude) {
    lines.push(review.foodAttached
      ? `Em gọi ${review.foodAttached} hôm ${review.date || "đó"} á.`
      : `Em ăn hôm ${review.date || "đó"} á quán.`);
  }
  if (a.copyPaste) lines.push("Câu này quán rep y chang cho người khác rồi, copy paste dữ vậy 😅");
  if (a.shouting) lines.push("Sao viết hoa hết vậy, đang quát khách hả?");
  if (a.short && !i.rude && !i.dismiss) lines.push(`Rep có ${a.words} chữ, chắc quán bận lắm ha.`);
  if (i.invite && (tier === "delighted" || tier === "pleased")) lines.push(pick(["Chắc chắn em ghé lại!", "Cuối tuần rủ hội bạn qua luôn!"]));

  // Giữ câu trả lời gọn: ý chính + tối đa 2 ý phụ
  if (lines.length > 3) lines.splice(3);

  // 3. Kết luận theo mức độ hài lòng
  const closers = {
    delighted: stars <= 3 ? ["Em sửa review lên cho quán nè.", "Xử lý vậy là chuyên nghiệp, em nâng sao liền."] : ["Ủng hộ quán dài dài!", "Quán ruột luôn rồi!"],
    pleased: stars <= 3 ? ["Em cho quán thêm cơ hội.", "Thôi em bớt giận rồi."] : ["Lần sau ghé tiếp nha.", "Giữ phong độ nha quán."],
    neutral: stars <= 3 ? ["Để lần sau em xem sao.", "Ừm, em ghi nhận."] : ["Ok quán.", "Ừm, cảm ơn quán."],
    annoyed: ["Trả lời vậy em thấy chưa ổn.", "Em hơi thất vọng với cách rep này."],
    furious: ["1 sao không bàn cãi.", "Bóc phốt luôn cho mọi người biết."]
  };
  lines.push(pick(closers[tier]));

  const tone = tier === "delighted" || tier === "pleased" ? "good" : (tier === "neutral" ? "mid" : "bad");
  const last = lines.length - 1;
  lines[last] = styleWrap(persona, lines[last], tone);

  // Tác động lên đánh giá
  let starDelta = 0;
  let rep = 0;
  let tip = 0;
  if (stars <= 3) {
    if (tier === "delighted") { starDelta = 2; rep = 5; }
    else if (tier === "pleased") { starDelta = 1; rep = 3; }
    else if (tier === "neutral") rep = 1;
    else if (tier === "annoyed") rep = -2;
    else { starDelta = -1; rep = -6; }
  } else {
    if (tier === "delighted") { rep = 4; tip = 8; }
    else if (tier === "pleased") { rep = 3; tip = 5; }
    else if (tier === "neutral") rep = 1;
    else if (tier === "annoyed") rep = -1;
    else { starDelta = -1; rep = -6; }
  }

  // Nhãn cho người chơi thấy khách đã "đọc hiểu" phản hồi như thế nào
  const tags = [];
  if (i.apology) tags.push("Xin lỗi");
  if (a.addressed.length) tags.push(`Đúng vấn đề: ${a.addressed.map(x => ISSUE_TEXT[x]).join(", ")}`);
  else if (stars <= 3 && a.issues.length) tags.push(`Chưa nói tới: ${issue}`);
  if (i.compensation) tags.push("Đền bù");
  if (i.promise) tags.push("Hứa cải thiện");
  if (i.explain) tags.push("Giải thích");
  if (i.thanks) tags.push("Cảm ơn");
  if (i.humor) tags.push("Hài hước");
  if (i.invite) tags.push("Mời quay lại");
  if (a.mentionsName) tags.push("Gọi tên khách");
  if (i.blame) tags.push("Đổ lỗi khách");
  if (i.dismiss) tags.push("Trả lời cho có");
  if (i.rude) tags.push("Thô lỗ");
  if (a.shouting) tags.push("Viết hoa quát tháo");
  if (a.copyPaste) tags.push("Copy paste");
  if (a.short) tags.push("Quá ngắn");

  return { text: lines.join(" "), tier, score, starDelta, rep, tip, tags, compensationCost: (i.compensation && !i.rude && !i.blame) ? 10 : 0 };
}
