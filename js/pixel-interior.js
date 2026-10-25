// ==========================================================
// NỘI THẤT TIỆM PIXEL (v2.0.0)
// Vẽ lại nội thất tiệm theo phong cách pixel giống bản đồ phố,
// giữ nguyên bố cục ảnh cũ (quầy bếp bên trái, cửa rèm ở giữa, sàn tatami bên phải)
// để mọi tọa độ khách/nhân viên/bàn trong shop-scene.js vẫn khớp.
// ==========================================================

const W = 192; // 16:9
const H = 108;
const UP = 5; // phóng to khi xuất ảnh để trình duyệt không làm nhòe

// Vị trí bàn (%) - trùng TABLE_SPOTS trong shop-scene.js; bàn vẽ ngay trên chỗ khách ngồi
const TABLES = [
  { x: 27, y: 83 }, { x: 49, y: 70 }, { x: 81, y: 81 }, { x: 66, y: 59 },
  { x: 91, y: 62 }, { x: 60, y: 97 }, { x: 16, y: 87 }, { x: 71, y: 85 }
];

function px(pctX) { return Math.round((pctX / 100) * W); }
function py(pctY) { return Math.round((pctY / 100) * H); }

export function renderPixelInterior() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  const r = (color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

  // ---- Tường ----
  r("#c98d55", 0, 0, W, py(52));            // vách gỗ khu bếp
  for (let x = 0; x < px(48); x += 6) r("#b97d48", x, 0, 1, py(52));
  r("#efe0c2", px(50), 0, W - px(50), py(50)); // tường vôi khu tatami
  r("#8a5a2b", px(50), py(36), W - px(50), py(14)); // ốp gỗ chân tường
  for (let x = px(50); x < W; x += 5) r("#7a4d24", x, py(36), 1, py(14));
  r("#6b4220", 0, py(8), W, 2);               // xà ngang
  r("#6b4220", px(48), 0, 4, py(52));          // cột giữa
  r("#6b4220", px(72), 0, 4, py(76));          // cột phải

  // ---- Đèn lồng (trùng vị trí .sc-glow) ----
  [[4.5, 11, "#f3e6b0"], [11, 13, "#f3e6b0"], [41.5, 20, "#e0442e"], [46, 21, "#e0442e"]].forEach(([lx, ly, col]) => {
    const x = px(lx) - 3, y = py(ly) - 5;
    r("#3a2412", x + 2, y - 3, 2, 3);
    r(col, x, y, 6, 9);
    r("rgba(0,0,0,0.18)", x, y + 3, 6, 1);
    r("#3a2412", x + 1, y + 9, 4, 1);
  });
  [[63.5, 5], [91.5, 6]].forEach(([lx, ly]) => r("#f6d27a", px(lx) - 5, py(ly) - 2, 10, 3));
  // Dây đèn nháy
  for (let x = px(62); x < W; x += 4) r(x % 8 ? "#f6d27a" : "#e07a3a", x, py(17) + ((x / 4) % 2), 1, 1);

  // ---- Bảng hiệu & menu khu bếp ----
  r("#3a2412", px(17), py(2), px(18), py(12));
  r("#f3e6c4", px(17) + 1, py(2) + 1, px(18) - 2, py(12) - 2);
  r("#2c3a2a", px(3), py(30), px(14), py(14));   // bảng phấn menu
  r("#8a5a2b", px(3) - 1, py(30) - 1, px(14) + 2, 1);
  for (let i = 0; i < 4; i++) r("#e8e3c8", px(4), py(33) + i * 3, px(9) - i * 4, 1);
  // Kệ hũ gia vị
  r("#7a4d24", px(19), py(28), px(12), 1);
  r("#7a4d24", px(19), py(38), px(12), 1);
  ["#d9442e", "#e0b040", "#5aa04a", "#e8e8e8", "#d9442e"].forEach((col, i) => {
    r(col, px(19) + 1 + i * 4, py(25), 3, py(3));
    r(col, px(20) + i * 4, py(35), 3, py(3));
  });
  // Máy hút mùi
  r("#9aa3ab", px(4), py(22), px(17), 4);
  r("#7d868e", px(6), py(26), px(13), 1);

  // ---- Bếp & quầy bar ----
  r("#555b61", px(1), py(44), px(30), py(6));     // bếp inox
  r("#2d2d2d", px(11), py(47), px(12), 2);
  r("#b5522e", px(12), py(43), 6, 4);             // niêu đất bốc khói
  r("#b5522e", px(18), py(43), 6, 4);
  r("#8a5a2b", 0, py(52), px(47), py(4));         // mặt quầy
  r("#6b4220", 0, py(56), px(47), py(10));        // thân quầy
  for (let x = 2; x < px(47); x += 7) r("#5a3618", x, py(57), 1, py(9));
  // Ghế quầy
  for (let x = px(6); x < px(46); x += px(8)) {
    r("#7a4d24", x, py(64), 5, 2);
    r("#5a3618", x + 1, py(66), 1, 5);
    r("#5a3618", x + 3, py(66), 1, 5);
  }
  // Mèo thần tài trên quầy
  r("#f3f0e6", px(27), py(49), 4, 3);
  r("#d9442e", px(28), py(51), 2, 1);

  // ---- Cửa ra vào có rèm noren (DOOR 44.5%, 58%) ----
  r("#3a2412", px(41), py(26), px(7), py(32));
  r("#2b3560", px(41) + 1, py(28), px(7) - 2, py(16));
  r("#f3e6c4", px(43), py(34), 4, 3);
  r("#4a3a30", px(44.5), py(28), 1, py(16));

  // ---- Sàn ----
  r("#8a6038", 0, py(66), W, H - py(66));
  for (let y = py(66); y < H; y += 4) r("#7a5230", 0, y, W, 1);
  for (let y = py(66), row = 0; y < H; y += 4, row++) {
    for (let x = (row % 3) * 9; x < W; x += 27) r("#6e4828", x, y, 1, 4);
  }
  // Sàn tatami nâng (khu bên phải)
  r("#b9b56a", px(50), py(50), W - px(50), py(16));
  for (let x = px(50); x < W; x += 16) r("#9d9a55", x, py(50), 1, py(16));
  r("#6b4220", px(50), py(66) - 2, W - px(50), 2);

  // ---- Bàn ăn ----
  TABLES.forEach(t => {
    const cx = px(t.x), top = py(t.y) - 11;
    r("rgba(0,0,0,0.18)", cx - 11, top + 9, 22, 2);
    r("#a8743f", cx - 10, top, 20, 5);
    r("#c08a52", cx - 10, top, 20, 1);
    r("#7a4d24", cx - 9, top + 5, 2, 5);
    r("#7a4d24", cx + 7, top + 5, 2, 5);
    // khay gia vị + ống đũa gỗ nhỏ xinh
    r("#7a4d24", cx - 7, top - 2, 2, 3); // ống đũa
    r("#d9442e", cx - 4, top - 1, 2, 2); // lọ ớt
    r("#e0b040", cx - 1, top - 1, 2, 2); // lọ tiêu
  });

  // ---- Đồ trang trí khu tatami ----
  r("#3b4a7a", px(86), py(14), px(13), py(12)); // rèm noren xanh
  for (let x = px(86); x < px(99); x += 4) r("#2b3560", x, py(22), 1, py(4));
  r("#2a2a2a", px(76), py(30), px(8), py(5));   // biển OPEN
  r("#f6e3a8", px(77), py(32), px(6), 1);
  r("#7a4d24", px(62), py(25), px(10), 1);       // kệ chai
  ["#3a5a2a", "#5a3a2a", "#3a5a2a"].forEach((col, i) => r(col, px(63) + i * 4, py(20), 2, py(5)));
  r("#f6d27a", px(61), py(44), 3, 5);            // đèn giấy
  r("#f6d27a", px(83), py(44), 3, 5);

  // Xuất ảnh phóng to theo số nguyên để giữ cạnh pixel sắc nét
  const out = document.createElement("canvas");
  out.width = W * UP;
  out.height = H * UP;
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = false;
  octx.drawImage(c, 0, 0, W * UP, H * UP);
  return out.toDataURL("image/png");
}
