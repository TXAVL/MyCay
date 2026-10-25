// ==========================================================
// PIXEL SPRITES ENGINE (v2.0.0)
// Bộ tạo nhân vật & đồ vật Pixel Art cho Tiệm Mỳ Cay
// Thay thế toàn bộ hình chibi tròn bằng Pixel Art đồng bộ 100% với bản đồ phố
// ==========================================================

const COLOR_MAP = {
  // Common
  ".": "transparent",
  "0": "#1d1410", // Viền đen/nâu đậm
  "w": "#ffffff", // Trắng
  "k": "#2b2b2b", // Đen nhạt
  "p": "#f598b0", // Hồng má / mũi
  "e": "#1d1410", // Mắt
  "g": "#f2c230", // Vàng gold
  "r": "#d9442e", // Đỏ ớt
  
  // Mèo (Cat)
  "c1": "#f5eed8", // Lông kem
  "c2": "#e8b87a", // Cam nhạt
  "c3": "#f598a0", // Tai trong hồng
  
  // Shiba
  "s1": "#d98638", // Lông cam shiba
  "s2": "#f8ebd2", // Mõm trắng
  
  // Gấu (Bear)
  "b1": "#7a4a25", // Lông nâu
  "b2": "#bc8250", // Mõm nâu sáng
  
  // Thỏ (Bunny)
  "u1": "#ffffff", // Lông trắng
  "u2": "#f7a8b8", // Tai hồng
  
  // Cáo (Fox)
  "f1": "#e06322", // Lông cam cáo
  "f2": "#ffffff", // Má trắng
  
  // Gấu Trúc (Panda)
  "p1": "#ffffff", // Mặt trắng
  "p2": "#282828", // Tai & quầng mắt đen
  
  // Hổ (Tiger)
  "t1": "#ea8e24", // Lông cam hổ
  "t2": "#3a2012", // Vằn đen
  
  // Hamster
  "h1": "#dca574", // Lông vàng cát
  "h2": "#fff2de", // Má phúng phính
  
  // Vịt (Ducky)
  "d1": "#f5d438", // Lông vàng
  "d2": "#e8651a", // Mỏ cam
  
  // Cú (Owl)
  "o1": "#755639", // Lông nâu cú
  "o2": "#f2e4b8", // Bụng sáng
  
  // Quần áo / Tạp dề
  "ap": "#4a2e1b", // Tạp dề nâu
  "ch": "#ffffff", // Mũ bếp trưởng
};

// Bản đồ điểm ảnh 14x12 cho từng khuôn mặt động vật
const HEAD_SPRITES = {
  cat: [
    "..00.....00...",
    ".0c20...0c20..",
    ".0c3c200c2c30.",
    "0c1c1c1c1c1c10",
    "0c1e1c1c1e1c10",
    "0c111cpc111c10",
    "0c1c1c1c1c1c10",
    ".0c1c1c1c1c10.",
    "..000000000..."
  ],
  shiba: [
    "..00.....00...",
    ".0s10...0s10..",
    ".0s1s100s1s10.",
    "0s1s1s1s1s1s10",
    "0s1e1s2s2e1s10",
    "0s2s2s20s2s2s20",
    ".0s2s2s2s2s20.",
    "..000000000..."
  ],
  bear: [
    ".000.....000..",
    "0b1b10..0b1b10",
    "0b1b1b00b1b1b0",
    "0b1b1b1b1b1b10",
    "0b1e1b2b2e1b10",
    "0b1b2b20b2b2b10",
    ".0b1b2b2b2b10.",
    "..000000000..."
  ],
  bunny: [
    ".00.......00..",
    ".0u20...0u20..",
    ".0u20...0u20..",
    ".0u10...0u10..",
    "0u1u1u1u1u1u10",
    "0u1e1p1p1e1u10",
    "0u1u1u1pu1u1u10",
    ".0u1u1u1u1u10.",
    "..000000000..."
  ],
  fox: [
    "..00.....00...",
    ".0f10...0f10..",
    ".00f1000f100..",
    "0f1f1f1f1f1f10",
    "0f1e1f1f1e1f10",
    "0f2f2f20f2f2f20",
    ".0f2f20f2f20..",
    "..000...000..."
  ],
  panda: [
    ".000.....000..",
    "0p2p20..0p2p20",
    "0p2p20000p2p20",
    "0p1p1p1p1p1p10",
    "0p2p2p1p1p2p20",
    "0p2e1p1p1e2p20",
    "0p1p1p10p1p1p10",
    ".0p1p1p1p1p10.",
    "..000000000..."
  ],
  tiger: [
    "..00.....00...",
    ".0t10...0t10..",
    "0t1t2t10t1t2t10",
    "0t1t2t1t1t2t10",
    "0t1e1t1t1e1t10",
    "0t2t1t10t1t1t20",
    ".0t1t1p1t1t10.",
    "..000000000..."
  ],
  hamster: [
    "..00.....00...",
    ".0h10...0h10..",
    "0h1h1h00h1h1h0",
    "0h1h1h1h1h1h10",
    "0h1e1h1h1e1h10",
    "0h2h2h2ph2h2h20",
    ".0h2h2h2h2h20.",
    "..000000000..."
  ],
  duck: [
    "....0000......",
    "...0d1d10.....",
    "..0d1d1d10....",
    "..0d1e1d10....",
    ".0d2d2d2d20...",
    ".0d2d2d2d20...",
    "..0d1d1d10....",
    "...000000....."
  ],
  owl: [
    "..00.....00...",
    ".0o10...0o10..",
    "0o1o10000o1o10",
    "00000000000000",
    "0ge1g000ge1g00",
    "0o1o1o10o1o1o10",
    ".0o1o2o2o2o10.",
    "..000000000..."
  ]
};

// Nhận diện loài từ chuỗi avatar
export function detectAnimal(avatarUrl = "") {
  const str = String(avatarUrl).toLowerCase();
  if (str.includes("shiba")) return "shiba";
  if (str.includes("bear") || str.includes("torto")) return "bear";
  if (str.includes("bunny") || str.includes("usagi")) return "bunny";
  if (str.includes("fox") || str.includes("kenji") || str.includes("shiro") || str.includes("ryu")) return "fox";
  if (str.includes("panda")) return "panda";
  if (str.includes("tiger") || str.includes("tora")) return "tiger";
  if (str.includes("hamster")) return "hamster";
  if (str.includes("duck")) return "duck";
  if (str.includes("owl")) return "owl";
  return "cat"; // Mặc định là Mèo Mochi
}

// Bộ nhớ đệm sprite để vẽ cực nhanh
const spriteCache = new Map();

/**
 * Tạo canvas dataURL cho nhân vật pixel hoàn chỉnh
 * @param {string} avatarUrl 
 * @param {object} opts { isOwner, isStaff, isVip, isSeated, shirtColor, scale }
 */
export function getPixelCharacterUrl(avatarUrl, opts = {}) {
  const animal = detectAnimal(avatarUrl);
  const isOwner = Boolean(opts.isOwner);
  const isStaff = Boolean(opts.isStaff);
  const isVip = Boolean(opts.isVip);
  const isSeated = Boolean(opts.isSeated);
  const shirt = opts.shirtColor || (isVip ? "#e9b840" : "#d9654a");
  const scale = opts.scale || 3;

  const cacheKey = `${animal}|${isOwner}|${isStaff}|${isVip}|${isSeated}|${shirt}|${scale}`;
  if (spriteCache.has(cacheKey)) {
    return spriteCache.get(cacheKey);
  }

  // Khung vẽ pixel logic: 20 x 28
  const PW = 20;
  const PH = 28;
  const canvas = document.createElement("canvas");
  canvas.width = PW * scale;
  canvas.height = PH * scale;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const drawPx = (color, x, y, w = 1, h = 1) => {
    if (!color || color === "transparent") return;
    ctx.fillStyle = color;
    ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
  };

  // 1. Mũ Bếp Trưởng (nếu là Chủ Tiệm)
  let headOffsetY = 7;
  if (isOwner) {
    headOffsetY = 9;
    // Mũ vải trắng bồng bềnh
    drawPx("#3a2412", 6, 1, 8, 1);
    drawPx("#ffffff", 5, 2, 10, 4);
    drawPx("#e8e3d8", 6, 2, 8, 1);
    drawPx("#ffffff", 7, 0, 6, 2);
    drawPx("#d0c8b8", 6, 5, 8, 2);
    drawPx("#3a2412", 5, 7, 10, 1);
    drawPx("#e0442e", 6, 6, 8, 1); // Viền đỏ khăn đầu
  } else if (isVip) {
    // Vương miện vàng VIP 👑
    drawPx("#f2c230", 7, 3, 6, 3);
    drawPx("#3a2412", 7, 2, 1, 1);
    drawPx("#3a2412", 9, 1, 2, 1);
    drawPx("#3a2412", 12, 2, 1, 1);
    drawPx("#d9442e", 9, 4, 2, 1); // Ngọc ruby đỏ
  }

  // 2. Vẽ Đầu (Head Sprite)
  const headRows = HEAD_SPRITES[animal] || HEAD_SPRITES.cat;
  const headStartX = Math.round((PW - headRows[0].length) / 2);
  
  for (let r = 0; r < headRows.length; r++) {
    const row = headRows[r];
    for (let c = 0; c < row.length; c++) {
      const code = row[c];
      if (code === ".") continue;
      let color = COLOR_MAP[code];
      if (!color) {
        // Mã ghép 2 ký tự (c1, s1, b1, ...)
        const code2 = row.substr(c, 2);
        if (COLOR_MAP[code2]) {
          color = COLOR_MAP[code2];
          c++;
        }
      }
      drawPx(color, headStartX + c, headOffsetY + r);
    }
  }

  // 3. Thân áo & Chân (Torso & Legs)
  const torsoY = headOffsetY + headRows.length - 1;

  if (isSeated) {
    // TƯ THẾ NGỒI ĂN BÀN
    // Áo thân
    drawPx("#3a2412", 6, torsoY, 8, 1);
    drawPx(isStaff ? "#6b4226" : shirt, 6, torsoY + 1, 8, 5);
    if (isStaff) {
      drawPx("#e8e3c8", 8, torsoY + 1, 4, 5); // Tạp dề trắng
      drawPx("#3a2412", 8, torsoY + 3, 4, 1);
    }
    // Tay đặt trên bàn
    drawPx("#3a2412", 5, torsoY + 3, 2, 3);
    drawPx("#3a2412", 13, torsoY + 3, 2, 3);
    drawPx("#f5eed8", 4, torsoY + 4, 2, 2);
    drawPx("#f5eed8", 14, torsoY + 4, 2, 2);

    // Tô mì đất nung trước mặt trên bàn
    drawPx("rgba(0,0,0,0.25)", 5, torsoY + 7, 10, 2); // Bóng tô
    drawPx("#2a1a10", 6, torsoY + 5, 8, 3); // Niêu đất đen
    drawPx("#d9442e", 7, torsoY + 5, 6, 1); // Nước dùng cay đỏ
    drawPx("#f6d27a", 8, torsoY + 5, 4, 1); // Sợi mì vàng
    drawPx("#5aa04a", 7, torsoY + 5, 1, 1); // Hành lá xanh
    drawPx("#ffffff", 11, torsoY + 5, 1, 1); // Trứng luộc

    // Hơi khói bốc lên từ tô mì
    drawPx("rgba(255,255,255,0.7)", 8, torsoY + 3, 1, 1);
    drawPx("rgba(255,255,255,0.5)", 9, torsoY + 2, 1, 1);
    drawPx("rgba(255,255,255,0.7)", 11, torsoY + 3, 1, 1);
  } else {
    // TƯ THẾ ĐỨNG / ĐI BỘ
    // Thân áo
    drawPx("#3a2412", 6, torsoY, 8, 1);
    drawPx(isStaff ? "#5a3a24" : shirt, 6, torsoY + 1, 8, 5);
    if (isStaff) {
      drawPx("#f3ebd8", 7, torsoY + 1, 6, 5); // Tạp dề nhân viên
      drawPx("#3a2412", 8, torsoY + 3, 4, 2); // Túi tạp dề
    } else {
      // Cổ áo / Cúc áo
      drawPx("#ffffff", 9, torsoY + 1, 2, 2);
      drawPx("#3a2412", 10, torsoY + 3, 1, 1);
    }
    // Tay
    drawPx("#3a2412", 5, torsoY + 1, 1, 4);
    drawPx("#3a2412", 14, torsoY + 1, 1, 4);
    drawPx("#f5eed8", 5, torsoY + 4, 1, 2);
    drawPx("#f5eed8", 14, torsoY + 4, 1, 2);

    // Quần & Giày
    const legsY = torsoY + 6;
    drawPx("#2c3e50", 7, legsY, 2, 3);
    drawPx("#2c3e50", 11, legsY, 2, 3);
    drawPx("#1d1410", 6, legsY + 3, 3, 1);
    drawPx("#1d1410", 11, legsY + 3, 3, 1);

    // Bóng đổ dưới chân
    drawPx("rgba(0,0,0,0.25)", 5, legsY + 4, 10, 1);
  }

  const url = canvas.toDataURL("image/png");
  spriteCache.set(cacheKey, url);
  return url;
}

/**
 * Trả về thẻ HTML của nhân vật Pixel sắc nét cho shop-scene.js
 */
export function createPixelActorMarkup(customer, { isOwner = false, isStaff = false, isSeated = false } = {}) {
  const shirt = customer.isVip ? "#e9b840" : (customer.shirt || "#d9654a");
  const avatarUrl = customer.avatar || "assets/cust_cat.png";
  const pixelImg = getPixelCharacterUrl(avatarUrl, {
    isOwner,
    isStaff,
    isVip: customer.isVip,
    isSeated,
    shirtColor: shirt,
    scale: 3
  });

  return `
    <div class="sc-pixel-char-wrap ${isSeated ? 'is-seated' : ''}">
      <img class="sc-pixel-char" src="${pixelImg}" alt="${customer.name || ''}" draggable="false" />
    </div>
  `;
}

if (typeof window !== "undefined") {
  window.getPixelCharacterUrl = getPixelCharacterUrl;
  window.detectAnimal = detectAnimal;
}
