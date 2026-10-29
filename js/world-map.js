// ==========================================================
// BẢN ĐỒ PHỐ ẨM THỰC PIXEL (WORLD MAP) - v2.0.0
// - Phố pixel rộng gấp 3 màn hình: kéo để đi dạo, chạm tòa nhà để đi tới & vào
// - Tiệm Mỳ Cay ở giữa phố; Chợ, Ngân Hàng, Việc Làm, Bưu Cục mở thẳng tab tương ứng
// - Người đi bộ, xe cộ, ngày/đêm theo giờ thực
// - Đoàn kiểm tra liên ngành: cảnh sát pixel đi tới tiệm, hội thoại kiểu RPG
// Mọi thứ vẽ bằng canvas theo đơn vị pixel logic (1 px logic = SCALE px thật)
// ==========================================================

const SCALE = 4; // cỡ gốc để chỉnh chữ; số px thật mỗi pixel logic nằm ở this.px (nguyên, theo màn hình thật)
const TARGET_VIEW_H = 300; // chiều cao khung nhìn mong muốn (px logic): quyết định cỡ 1 pixel trên màn hình
const WORLD_W = 480;
const EXT = 400; // vỉa hè, đường, cây kéo dài ra hai bên cho màn hình siêu rộng

// Chibi 8x12: h tóc/mũ, k vành mũ, y huy hiệu, s da, e mắt, r má, c áo, b cúc, p quần, f giày
const PERSON = [
  "..hhhh..",
  ".hhhhhh.",
  ".hssssh.",
  ".sesses.",
  ".rssssr.",
  "..ssss..",
  ".cccccc.",
  "sccbcccs",
  "s.cccc.s",
  ".pppppp."
];
const LEGS = [
  [".pp..pp.", ".ff..ff."],
  ["..pp.pp.", ".ff...ff"],
  [".pp.pp..", "ff...ff."]
];
const POLICE_HEAD = [
  "..hhhh..",
  ".hhhyhh.",
  "kkkkkkkk"
];

const POLICE_COLORS = { h: "#5b6b2e", k: "#2b2b22", y: "#f2c230", s: "#d9965f", e: "#1d1410", r: "#e07a6a", c: "#6f7f36", b: "#f2c230", p: "#5f6d2d", f: "#1d1410" };
const WALKER_COLORS = [
  { h: "#2d1d14", c: "#d9534f", p: "#34495e" },
  { h: "#6b3e1f", c: "#3d8bd9", p: "#2c2c2c" },
  { h: "#111111", c: "#f0a030", p: "#4a3b2a" },
  { h: "#8a5a2b", c: "#7a4fd0", p: "#2f3e4e" },
  { h: "#3a2a1a", c: "#2fa36b", p: "#5a3a2a" },
  { h: "#c9a24a", c: "#e46aa0", p: "#2c3e50" }
];

const BUILDINGS = [
  { id: "market", x: 58, w: 76, name: "CHỢ NGUYÊN LIỆU", wall: "#c98b4f", sign: "#2f6b3a", tab: "tab-kho", hint: "Nhập hàng, xem kho" },
  { id: "bank", x: 138, w: 66, name: "NGÂN HÀNG", wall: "#d8d2c0", sign: "#1f3f73", tab: "tab-bank", hint: "Gửi tiết kiệm, Sổ Đỏ" },
  { id: "shop", x: 208, w: 92, name: "TIỆM MỲ CAY", wall: "#e6d6b8", sign: "#7a1c18", tab: null, hint: "Vào tiệm bán hàng", main: true },
  { id: "jobs", x: 304, w: 66, name: "VIỆC LÀM", wall: "#b8c7d6", sign: "#5a3a7a", tab: "tab-staff", hint: "Thuê nhân viên" },
  { id: "post", x: 374, w: 66, name: "BƯU CỤC", wall: "#e7c46a", sign: "#b34a1a", tab: "tab-online", hint: "Đơn giao hàng online" }
];

function drawSprite(ctx, rows, colors, x, y, px = 1) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const col = colors[row[c]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x + c * px, y + r * px, px, px);
    }
  }
}

// Vẽ một người pixel (neo ở chân giữa). frame: 0 đứng, 1/2 bước chân. blink: nhắm mắt
export function drawPerson(ctx, x, y, colors, { frame = 0, px = 1, police = false, blink = false } = {}) {
  const full = Object.assign({ s: "#e8b48a", e: "#1d1410", r: "#f09080", b: colors.c, f: "#1d1410", k: colors.h, y: colors.h }, colors);
  if (blink) full.e = full.s;
  const body = police ? POLICE_HEAD.concat(PERSON.slice(2)) : PERSON;
  const rows = body.concat(LEGS[frame % 3]);
  drawSprite(ctx, rows, full, Math.round(x - 4 * px), Math.round(y - rows.length * px), px);
}

export class WorldMap {
  constructor(game) {
    this.game = game;
    this.root = null;
    this.canvas = null;
    this.ctx = null;
    this.visible = false;
    this.viewW = 160;
    this.camX = WORLD_W / 2 - this.viewW / 2;
    this.viewH = 260;
    this.walkers = [];
    this.cars = [];
    this.player = { x: 254, target: null, onArrive: null, dir: 1 };
    this.police = null;
    this.t = 0;
    this.raf = null;
    this.skyline = this.makeSkyline();
  }

  makeSkyline() {
    const list = [];
    let x = -EXT;
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    while (x < WORLD_W + EXT) {
      const w = 14 + Math.floor(rnd() * 18);
      list.push({ x, w, h: 40 + Math.floor(rnd() * 45), tone: rnd() > 0.5 ? "#4d6a8f" : "#3e5878", lit: seed });
      x += w + 2;
    }
    return list;
  }

  mount() {
    if (this.root) return;
    const root = document.createElement("div");
    root.id = "world-map";
    root.className = "world-map";
    root.innerHTML = `
      <canvas class="world-map-canvas"></canvas>
      <div class="world-map-topbar">
        <span class="wm-chip" id="wm-day">📍 Phố Ẩm Thực</span>
        <span class="wm-chip" id="wm-money"></span>
      </div>
      <div class="wm-owner-card" id="wm-owner"></div>
      <div class="world-map-hint pixel-box" id="wm-hint">Kéo để dạo phố · Chạm vào <b>tiệm của bạn</b> để vào bán hàng</div>
      <button class="wm-enter-btn" id="wm-enter">🍜 Vào Tiệm</button>
    `;
    document.body.appendChild(root);
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    root.querySelector("#wm-enter").addEventListener("click", () => this.goTo(BUILDINGS.find(b => b.main)));
    this.applyLayout(root);
    this.bindInput();
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }

  // Bố cục cốt lõi đặt thẳng bằng inline style để không phụ thuộc CSS cache cũ:
  // các thanh phủ luôn nằm giữa, rộng tối đa 520-560px và không bao giờ tràn khỏi màn hình
  applyLayout(root) {
    Object.assign(root.style, { position: "fixed", inset: "0", overflow: "hidden", maxWidth: "100vw" });
    const center = (el, maxW) => {
      if (!el) return;
      Object.assign(el.style, {
        left: "50%", right: "auto", margin: "0", transform: "translateX(-50%)",
        width: `min(${maxW}px, calc(100% - 24px))`, boxSizing: "border-box",
      });
    };
    center(root.querySelector(".world-map-topbar"), 520);
    center(root.querySelector("#wm-owner"), 560);
    center(root.querySelector("#wm-hint"), 520);
  }

  resize() {
    if (!this.canvas) return;
    // Windows hay chạy tỉ lệ 125%/150%: tính theo pixel vật lý để mỗi pixel logic luôn là số nguyên pixel thật,
    // nếu không canvas bị co giãn lẻ làm hình bị giãn / răng cưa không đều
    const dpr = window.devicePixelRatio || 1;
    const cw = document.documentElement.clientWidth || window.innerWidth;
    const devW = Math.round(cw * dpr);
    const devH = Math.round(window.innerHeight * dpr);
    this.px = Math.min(8, Math.max(2, Math.floor(devH / TARGET_VIEW_H)));
    this.cssPx = this.px / dpr;
    // Chiều rộng logic tối đa 700: vỉa hè, đường, cây đã kéo dài sẵn hai bên cho màn hình siêu rộng
    this.viewW = Math.min(700, Math.ceil(devW / this.px));
    this.viewH = Math.max(200, Math.ceil(devH / this.px));
    this.canvas.width = this.viewW * this.px;
    this.canvas.height = this.viewH * this.px;
    this.canvas.style.width = `${(this.canvas.width / dpr).toFixed(3)}px`;
    this.canvas.style.height = `${(this.canvas.height / dpr).toFixed(3)}px`;
    this.camX = this.clampCam(this.camX);
    this.ctx.imageSmoothingEnabled = false;
  }

  get baseY() {
    return Math.round(this.viewH * 0.52);
  }

  bindInput() {
    let down = null;
    this.canvas.addEventListener("pointerdown", e => {
      down = { x: e.clientX, y: e.clientY, cam: this.camX, moved: false };
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener("pointermove", e => {
      if (!down || this.police) return;
      const dx = e.clientX - down.x;
      if (Math.abs(dx) > 6) down.moved = true;
      if (down.moved) {
        this.camX = this.clampCam(down.cam - dx / this.cssPx);
        this.followPlayer = false;
      }
    });
    this.canvas.addEventListener("pointerup", e => {
      if (!down) return;
      const wasTap = !down.moved;
      down = null;
      if (!wasTap || this.police) return;
      const rect = this.canvas.getBoundingClientRect();
      const lx = ((e.clientX - rect.left) / rect.width) * this.viewW + this.camX;
      const ly = ((e.clientY - rect.top) / rect.height) * this.viewH;
      const b = BUILDINGS.find(bd => lx >= bd.x && lx <= bd.x + bd.w && ly <= this.baseY + 4 && ly >= this.baseY - 90);
      if (b) this.goTo(b);
      else if (ly > this.baseY) this.walkTo(lx);
    });
  }

  clampCam(x) {
    // Màn hình rộng hơn cả con phố: đặt phố vào giữa
    if (this.viewW >= WORLD_W) return (WORLD_W - this.viewW) / 2;
    return Math.max(0, Math.min(WORLD_W - this.viewW, x));
  }

  walkTo(x, onArrive = null) {
    this.player.target = Math.max(6, Math.min(WORLD_W - 6, x));
    this.player.onArrive = onArrive;
    this.followPlayer = true;
  }

  goTo(b) {
    if (!b) return;
    this.setHint(`🚶 Đang tới <b>${b.main ? this.shopTitle() : b.name}</b> · ${b.hint}`);
    this.walkTo(b.x + b.w / 2, () => this.enterBuilding(b));
  }

  enterBuilding(b) {
    if (this.game.sound && this.game.sound.playButtonClick) this.game.sound.playButtonClick();
    this.hide();
    if (b.tab) {
      const btn = document.querySelector(`.nav-grid-btn[data-tab="${b.tab}"]`);
      if (btn) setTimeout(() => btn.click(), 250);
    }
  }

  setHint(html) {
    const el = this.root && this.root.querySelector("#wm-hint");
    if (el) el.innerHTML = html;
  }

  shopTitle() {
    return String((this.game.state && this.game.state.shopName) || "Tiệm Mỳ Cay").toUpperCase();
  }

  show() {
    this.mount();
    // Ra khỏi tiệm: đứng ngay trước cửa tiệm
    const shop = BUILDINGS.find(b => b.main);
    this.player.x = shop.x + shop.w / 2;
    this.player.target = null;
    this.camX = this.clampCam(this.player.x - this.viewW / 2);
    this.followPlayer = true;
    this.root.classList.remove("wm-hidden");
    this.visible = true;
    this.setHint(`Kéo để dạo phố · Chạm vào <b>${this.shopTitle()}</b> để vào bán hàng`);
    this.updateChips();
    if (!this.raf) this.loop();
  }

  hide() {
    if (!this.root) return;
    this.root.classList.add("wm-hidden");
    this.visible = false;
    // Báo cho các phần khác (VD: hướng dẫn tân thủ) biết người chơi đã vào trong tiệm
    document.dispatchEvent(new CustomEvent("mycay:enter-shop"));
  }

  updateChips() {
    const st = this.game.state || {};
    const day = this.root.querySelector("#wm-day");
    const money = this.root.querySelector("#wm-money");
    if (day) day.textContent = `📍 Phố Ẩm Thực · Ngày ${st.day || 1}`;
    const ownerEl = this.root.querySelector("#wm-owner");
    if (ownerEl) {
      const shop = st.shopName || "Tiệm Mỳ Cay";
      ownerEl.textContent = st.ownerFullName ? `🏮 ${shop} · Chủ tiệm: ${st.ownerFullName}` : `🏮 ${shop}`;
    }
    if (money) money.textContent = `💰 ${Math.floor(st.money || 0).toLocaleString("vi-VN")}k`;
  }

  loop() {
    this.raf = requestAnimationFrame(() => this.loop());
    if (!this.visible) return;
    this.t++;
    this.update();
    this.draw();
    if (this.t % 30 === 0) this.updateChips();
  }

  update() {
    const p = this.player;
    if (p.target != null) {
      const d = p.target - p.x;
      p.dir = d >= 0 ? 1 : -1;
      if (Math.abs(d) < 0.8) {
        p.x = p.target;
        p.target = null;
        const cb = p.onArrive;
        p.onArrive = null;
        if (cb) cb();
      } else {
        p.x += Math.sign(d) * 0.9;
      }
    }
    if (this.followPlayer) this.camX += (this.clampCam(p.x - this.viewW / 2) - this.camX) * 0.12;

    if (this.walkers.length < 12 && Math.random() < 0.02) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.walkers.push({ x: dir > 0 ? -EXT / 2 : WORLD_W + EXT / 2, dir, speed: 0.25 + Math.random() * 0.25, lane: Math.random() * 10, colors: WALKER_COLORS[Math.floor(Math.random() * WALKER_COLORS.length)] });
    }
    this.walkers.forEach(w => (w.x += w.dir * w.speed));
    this.walkers = this.walkers.filter(w => w.x > -EXT && w.x < WORLD_W + EXT);

    if (this.cars.length < 6 && Math.random() < 0.012) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const palette = ["#d94a3a", "#f2c230", "#3d8bd9", "#e9e9e9", "#2fa36b"];
      this.cars.push({ x: dir > 0 ? -EXT / 2 : WORLD_W + EXT / 2, dir, speed: 0.9 + Math.random() * 0.8, color: palette[Math.floor(Math.random() * palette.length)], bus: Math.random() < 0.2 });
    }
    this.cars.forEach(c => (c.x += c.dir * c.speed));
    this.cars = this.cars.filter(c => c.x > -EXT && c.x < WORLD_W + EXT);

    if (this.police) this.updatePolice();
  }

  isNight() {
    const h = new Date().getHours();
    return h >= 18 || h < 6;
  }

  draw() {
    const ctx = this.ctx;
    const H = this.viewH;
    const base = this.baseY;
    const night = this.isNight();
    ctx.setTransform(this.px, 0, 0, this.px, 0, 0);

    const sky = ctx.createLinearGradient(0, 0, 0, base);
    sky.addColorStop(0, night ? "#141b33" : "#7fb7e6");
    sky.addColorStop(1, night ? "#2b3560" : "#cfe6f5");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.viewW, base);

    // Mây / sao
    ctx.fillStyle = night ? "#f3f0c8" : "#ffffff";
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 97 + this.t * 0.03) % (this.viewW + 40)) - 20;
      if (night) ctx.fillRect(Math.round((i * 53) % this.viewW), 6 + ((i * 17) % 30), 1, 1);
      else ctx.fillRect(Math.round(cx), 10 + ((i * 13) % 25), 14, 3);
    }

    // Tòa nhà nền (parallax 0.5)
    const off = this.camX * 0.5;
    this.skyline.forEach(s => {
      const x = Math.round(s.x - off);
      if (x > this.viewW || x + s.w < 0) return;
      ctx.fillStyle = night ? "#22304d" : s.tone;
      ctx.fillRect(x, base - s.h, s.w, s.h);
      for (let wy = base - s.h + 4; wy < base - 6; wy += 5) {
        for (let wx = x + 2; wx < x + s.w - 2; wx += 4) {
          const lit = ((wx * 7 + wy * 3 + s.lit) % 5) === 0;
          ctx.fillStyle = lit ? (night ? "#f2d26a" : "#e8e3a0") : night ? "#1a2238" : "#355070";
          ctx.fillRect(wx, wy, 2, 2);
        }
      }
    });

    ctx.save();
    ctx.translate(-Math.round(this.camX), 0);

    // Vỉa hè gạch
    ctx.fillStyle = "#8f8a84";
    ctx.fillRect(-EXT, base, WORLD_W + EXT * 2, 34);
    ctx.fillStyle = "#7d7873";
    for (let y = base; y < base + 34; y += 8) ctx.fillRect(-EXT, y, WORLD_W + EXT * 2, 1);
    for (let y = base, row = 0; y < base + 34; y += 8, row++) {
      for (let x = (row % 2) * 6 - EXT; x < WORLD_W + EXT; x += 12) ctx.fillRect(x, y, 1, 8);
    }
    // Lòng đường
    ctx.fillStyle = "#4a4a50";
    ctx.fillRect(-EXT, base + 34, WORLD_W + EXT * 2, 34);
    ctx.fillStyle = "#e8e3c8";
    for (let x = -EXT; x < WORLD_W + EXT; x += 16) ctx.fillRect(x, base + 50, 8, 1);
    // Vỉa hè dưới + quảng trường
    ctx.fillStyle = "#9a958e";
    ctx.fillRect(-EXT, base + 68, WORLD_W + EXT * 2, H - base - 68);
    ctx.fillStyle = "#88837d";
    for (let y = base + 76; y < H; y += 10) ctx.fillRect(-EXT, y, WORLD_W + EXT * 2, 1);

    this.drawParks(base);
    BUILDINGS.forEach(b => this.drawBuilding(b, base, night));

    // Xe cộ
    this.cars.forEach(c => this.drawCar(c, c.dir > 0 ? base + 60 : base + 46));

    // Người đi bộ + chủ tiệm + cảnh sát (sắp theo chiều sâu)
    const actors = this.walkers.map(w => ({ y: base + 14 + w.lane, draw: y => drawPerson(ctx, w.x, y, w.colors, { frame: 1 + (Math.floor(this.t / 10) % 2) }) }));
    const p = this.player;
    const owner = { h: "#2d1d14", c: "#ffffff", p: "#7a1c18", b: "#d94a3a" };
    actors.push({ y: base + 22, draw: y => {
      drawPerson(ctx, p.x, y, owner, { frame: p.target != null ? 1 + (Math.floor(this.t / 8) % 2) : 0 });
      // Mũ đầu bếp
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.round(p.x) - 3, y - 15, 6, 3);
    } });
    if (this.police) {
      const po = this.police;
      actors.push({ y: base + 24, draw: y => drawPerson(ctx, po.x, y, POLICE_COLORS, { police: true, frame: po.walking ? 1 + (Math.floor(this.t / 8) % 2) : 0 }) });
    }
    actors.sort((a, b) => a.y - b.y).forEach(a => a.draw(a.y));

    ctx.restore();
  }

  drawParks(base) {
    const ctx = this.ctx;
    [[-EXT, EXT + 56], [442, EXT + 38]].forEach(([x, w]) => {
      ctx.fillStyle = "#5c9e4a";
      ctx.fillRect(x, base - 6, w, 6);
      for (let tx = x + 8; tx < x + w - 4; tx += 20) {
        ctx.fillStyle = "#6b4a2b";
        ctx.fillRect(tx + 3, base - 22, 3, 18);
        ctx.fillStyle = "#3f8a3a";
        ctx.fillRect(tx - 3, base - 38, 15, 12);
        ctx.fillRect(tx - 1, base - 42, 11, 4);
        ctx.fillStyle = "#4fa548";
        ctx.fillRect(tx - 1, base - 36, 6, 4);
      }
    });
    // Ghế đá
    ctx.fillStyle = "#7a5a3a";
    ctx.fillRect(20, base + 6, 14, 2);
    ctx.fillRect(21, base + 8, 2, 3);
    ctx.fillRect(31, base + 8, 2, 3);
  }

  drawBuilding(b, base, night) {
    const ctx = this.ctx;
    const top = base - (b.main ? 88 : 74);
    const x = b.x;
    const w = b.w;
    // Tường các tầng trên
    ctx.fillStyle = b.wall;
    ctx.fillRect(x, top, w, base - top);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(x, top, w, 3);
    ctx.fillRect(x + w - 2, top, 2, base - top);
    // Mái
    ctx.fillStyle = b.main ? "#6b2a1a" : "#5a4a3a";
    ctx.fillRect(x - 2, top - 3, w + 4, 4);
    // Cửa sổ tầng trên
    for (let wy = top + 7; wy < base - 46; wy += 13) {
      for (let wx = x + 5; wx < x + w - 10; wx += 15) {
        ctx.fillStyle = "#3b4a5a";
        ctx.fillRect(wx, wy, 10, 8);
        ctx.fillStyle = night ? "#f2d26a" : "#8fb8d8";
        ctx.fillRect(wx + 1, wy + 1, 8, 6);
        ctx.fillStyle = "#3b4a5a";
        ctx.fillRect(wx + 5, wy + 1, 1, 6);
        if (b.main) {
          ctx.fillStyle = "#5c9e4a";
          ctx.fillRect(wx + 2, wy + 8, 6, 2);
        }
      }
    }
    // Bảng hiệu
    const signY = base - 44;
    ctx.fillStyle = "#c9a24a";
    ctx.fillRect(x + 3, signY - 1, w - 6, 13);
    ctx.fillStyle = b.sign;
    ctx.fillRect(x + 4, signY, w - 8, 11);
    const title = b.main ? this.shopTitle() : b.name;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#f6e3a8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const k = this.px / SCALE;
    let size = Math.round(26 * k);
    ctx.font = `bold ${size}px "Courier New", monospace`;
    const maxW = (w - 12) * this.px;
    while (ctx.measureText(title).width > maxW && size > Math.round(12 * k)) {
      size -= 2;
      ctx.font = `bold ${size}px "Courier New", monospace`;
    }
    ctx.fillText(title, (x + w / 2 - this.camX) * this.px, (signY + 5.5) * this.px);
    ctx.restore();

    // Mặt tiền tầng trệt
    const shopTop = base - 30;
    ctx.fillStyle = "#3a2a22";
    ctx.fillRect(x + 4, shopTop, w - 8, 30);
    ctx.fillStyle = night ? "#5a4020" : "#2a201c";
    ctx.fillRect(x + 6, shopTop + 2, w - 12, 28);
    // Song cửa kéo
    ctx.fillStyle = "#4a3a30";
    for (let gx = x + 6; gx < x + w - 6; gx += Math.floor((w - 12) / 5)) ctx.fillRect(gx, shopTop + 2, 1, 28);
    // Kệ hàng
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(x + 8, shopTop + 13, w - 16, 2);
    const goods = { shop: ["#d94a3a", "#e0b040", "#5aa04a", "#e8e8e8"], market: ["#5aa04a", "#d94a3a", "#e0b040", "#c97a3a"], bank: ["#e0b040"], jobs: ["#7a4fd0", "#3d8bd9"], post: ["#c97a3a", "#e8d8b0"] }[b.id];
    for (let i = 0, gx = x + 10; gx < x + w - 12; gx += 7, i++) {
      ctx.fillStyle = goods[i % goods.length];
      ctx.fillRect(gx, shopTop + 10, 5, 3);
    }
    // Đèn lồng tiệm mì
    if (b.main) {
      const sway = Math.round(Math.sin(this.t / 20));
      [x + 10, x + w - 14].forEach(lx => {
        ctx.fillStyle = "#e0b040";
        ctx.fillRect(lx + 1 + sway, shopTop + 3, 2, 1);
        ctx.fillStyle = "#d9442e";
        ctx.fillRect(lx + sway, shopTop + 4, 4, 6);
        ctx.fillStyle = "#f2c230";
        ctx.fillRect(lx + sway, shopTop + 6, 4, 1);
      });
      // Biển trạng thái
      const open = this.game.state && this.game.state.dayPhase === "open";
      ctx.fillStyle = open ? "#2fa36b" : "#a3281d";
      ctx.fillRect(x + w / 2 - 8, shopTop + 18, 16, 6);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.round(13 * this.px / SCALE)}px "Courier New", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(open ? "OPEN" : "CLOSED", (x + w / 2 - this.camX) * this.px, (shopTop + 21) * this.px);
      ctx.restore();
      // Mũi tên nhấp nháy gợi ý chạm vào
      if (Math.floor(this.t / 25) % 2 === 0 && !this.police) {
        ctx.fillStyle = "#f2c230";
        const ax = Math.round(x + w / 2);
        const ay = top - 12;
        ctx.fillRect(ax - 3, ay, 7, 2);
        ctx.fillRect(ax - 2, ay + 2, 5, 2);
        ctx.fillRect(ax - 1, ay + 4, 3, 2);
      }
    }
  }

  drawCar(c, y) {
    const ctx = this.ctx;
    const len = c.bus ? 30 : 18;
    const x = Math.round(c.x - len / 2);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x + 1, y + 1, len, 2);
    ctx.fillStyle = c.bus ? "#f2a530" : c.color;
    ctx.fillRect(x, y - (c.bus ? 12 : 6), len, c.bus ? 12 : 6);
    if (!c.bus) ctx.fillRect(x + 4, y - 10, len - 8, 4);
    ctx.fillStyle = "#9fd0f0";
    if (c.bus) for (let wx = x + 2; wx < x + len - 3; wx += 5) ctx.fillRect(wx, y - 10, 3, 4);
    else ctx.fillRect(x + 5, y - 9, len - 10, 3);
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(x + 2, y, 4, 2);
    ctx.fillRect(x + len - 6, y, 4, 2);
  }

  // ===================== ĐOÀN KIỂM TRA LIÊN NGÀNH =====================
  // lines: [{ text }], last: { title, text } -> onDone()
  playInspection(lines, last, onDone) {
    this.show();
    this.followPlayer = false;
    const shop = BUILDINGS.find(b => b.main);
    this.player.x = shop.x + shop.w / 2 - 10;
    this.camX = this.clampCam(shop.x + shop.w / 2 - this.viewW / 2);
    this.police = { x: this.camX + this.viewW + 10, target: shop.x + shop.w / 2 + 6, walking: true, arrived: false };
    this.setHint("🚨 Có người đang tiến về phía tiệm...");
    if (this.game.sound && this.game.sound.playReviewChime) this.game.sound.playReviewChime();
    this.inspection = { lines, last, onDone, idx: 0 };
  }

  updatePolice() {
    const po = this.police;
    if (!po.walking) return;
    po.x += po.target > po.x ? 0.7 : -0.7;
    if (Math.abs(po.target - po.x) < 1) {
      po.x = po.target;
      po.walking = false;
      this.player.dir = 1;
      this.openInspectionDialog();
    }
  }

  openInspectionDialog() {
    const ov = document.createElement("div");
    ov.className = "inspection-stage";
    ov.id = "inspection-overlay";
    ov.innerHTML = `
      <canvas class="inspection-officer" width="96" height="140"></canvas>
      <div class="rpg-dialog pixel-box">
        <canvas class="rpg-portrait" width="64" height="64"></canvas>
        <div class="rpg-body">
          <div class="rpg-name">Đoàn kiểm tra liên ngành</div>
          <div class="rpg-text"></div>
        </div>
        <span class="rpg-next">▼</span>
      </div>`;
    this.root.appendChild(ov);
    this.setHint("");
    const big = ov.querySelector(".inspection-officer").getContext("2d");
    const face = ov.querySelector(".rpg-portrait").getContext("2d");
    const textEl = ov.querySelector(".rpg-text");
    const ins = this.inspection;
    let typing = null;
    let frame = 0;
    // Cảnh sát lớn: bước vào rồi đứng thở, chớp mắt
    const anim = () => {
      if (!ov.isConnected) return;
      frame++;
      big.clearRect(0, 0, 96, 140);
      const bob = Math.floor(frame / 30) % 2;
      const blink = frame % 150 > 142;
      drawPerson(big, 48, 136 - bob * 2, POLICE_COLORS, { police: true, px: 8, blink, frame: 0 });
      face.fillStyle = "#f3e6c4";
      face.fillRect(0, 0, 64, 64);
      drawSprite(face, POLICE_HEAD.concat(PERSON.slice(2, 8)), Object.assign({}, POLICE_COLORS, blink ? { e: POLICE_COLORS.s } : {}), 4, 8 - bob, 7);
      requestAnimationFrame(anim);
    };
    anim();

    const typeLine = text => {
      clearInterval(typing);
      let i = 0;
      textEl.textContent = "";
      typing = setInterval(() => {
        i++;
        textEl.textContent = text.slice(0, i);
        if (i >= text.length) {
          clearInterval(typing);
          typing = null;
        }
      }, 28);
    };
    const showFinal = () => {
      ov.innerHTML = `<div class="rpg-final pixel-box"><h3>${ins.last.title}</h3><p>${ins.last.text}</p><span class="rpg-next">▼</span></div>`;
      ov.onclick = () => {
        ov.remove();
        this.police = null;
        this.inspection = null;
        if (ins.onDone) ins.onDone();
      };
    };
    typeLine(ins.lines[0]);
    ov.onclick = () => {
      if (typing) {
        clearInterval(typing);
        typing = null;
        textEl.textContent = ins.lines[ins.idx];
        return;
      }
      ins.idx++;
      if (ins.idx < ins.lines.length) typeLine(ins.lines[ins.idx]);
      else showFinal();
    };
  }
}
