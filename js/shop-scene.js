// ==========================================================
// KHUNG CẢNH TIỆM SỐNG ĐỘNG (LIVING SHOP SCENE) - v1.6.0
// Biến tiệm mì thành một "thế giới game" thực thụ:
// - Nội thất quán vẽ tay làm nền, ánh sáng đổi theo giờ trong ca bán
// - Khách chibi bước vào từ cửa, xếp hàng gọi món, ngồi bàn ăn rồi rời quán
// - Nhân viên đứng quầy, nồi bốc khói, xu vàng bay thẳng về ví
// - HUD cấp độ tiệm (Lv + XP) và màn hình LEVEL UP
// Toàn bộ tọa độ tính theo % khung ảnh nội thất 16:9 (assets/interior.jpg)
// ==========================================================

import { renderPixelInterior } from "./pixel-interior.js?v=2.3.3";
import { getPixelCharacterUrl } from "./pixel-sprites.js?v=2.3.3";

const DOOR = { x: 44.5, y: 58 };

// Chỗ đứng gọi món trước quầy bar (neo ở chân nhân vật)
const QUEUE_SPOTS = [
  { x: 9, y: 76 },
  { x: 22, y: 76 },
  { x: 35, y: 76 }
];

// Chỗ ngồi ở các bàn gỗ vẽ sẵn trong ảnh (tối đa 8 bàn theo nâng cấp)
const TABLE_SPOTS = [
  { x: 27, y: 83 },
  { x: 49, y: 70 },
  { x: 81, y: 81 },
  { x: 66, y: 59 },
  { x: 91, y: 62 },
  { x: 60, y: 97 },
  { x: 16, y: 87 },
  { x: 71, y: 85 }
];

// Khách đứng ngóng trước cửa khi quán đang chuẩn bị
const WAIT_SPOTS = [
  { x: 47, y: 66 },
  { x: 54.5, y: 64 }
];

// Nhân viên đứng sau quầy bếp (chủ tiệm luôn đứng ở bếp niêu chính)
// Đứng xen kẽ giữa các chỗ khách gọi món để không bị khách che mặt
const STAFF_SPOTS = [
  { x: 15.5, y: 55 },
  { x: 28.5, y: 55 },
  { x: 3.5, y: 55 },
  { x: 40.5, y: 55 },
  { x: 22, y: 54 }
];

const STAFF_ROSTER = [
  { key: "mochi", name: "Mochi", avatar: "assets/staff_mochi.png" },
  { key: "kenji", name: "Kenji", avatar: "assets/staff_kenji.png" },
  { key: "usagi", name: "Usagi", avatar: "assets/staff_usagi.png" },
  { key: "shiba", name: "Shiba", avatar: "assets/staff_shiba.png" },
  { key: "ducky", name: "Ducky", avatar: "assets/staff_ducky.png" },
  { key: "shiro", name: "Shiro", avatar: "assets/cust_fox.png" },
  { key: "owl", name: "Owl", avatar: "assets/staff_owl.png" },
  { key: "fawn", name: "Fawn", avatar: "assets/staff_fawn.png" },
  { key: "torto", name: "Torto", avatar: "assets/cust_bear.png" },
  { key: "tora", name: "Tora", avatar: "assets/cust_shiba.png" },
  { key: "ryu", name: "Ryu", avatar: "assets/cust_fox.png" }
];

const SHIRT_COLORS = {
  "assets/cust_cat.png": "#F4A261",
  "assets/cust_shiba.png": "#E76F51",
  "assets/cust_bear.png": "#8D6E63",
  "assets/cust_bunny.png": "#F497B6",
  "assets/cust_fox.png": "#5C9EAD",
  "assets/cust_panda.png": "#6D8BC5",
  "assets/cust_tiger.png": "#F2B134",
  "assets/cust_hamster.png": "#B48FD0"
};

const STAFF_LINES_OPEN = ["Có ngay ạ!", "Mì nóng đây~", "Xèo xèo 🔥", "Cảm ơn quý khách!", "Thêm topping nha?", "♪ ♫", "Bàn số mấy ạ?", "Trà sữa tới đây 🧋"];
const STAFF_LINES_PREP = ["Chuẩn bị mở quán nào!", "Lau bàn sạch bóng ✨", "Nước dùng thơm quá~", "Hôm nay đông khách nha!", "Nhập thêm mì chưa sếp?", "♪ ♫"];
const EAT_EMOTES = ["😋", "💕", "🤤", "✨", "🔥"];

const LEVEL_TITLES = ["Xe Đẩy Vỉa Hè", "Tiệm Tập Sự", "Quán Quen Phố Nhỏ", "Tiệm Được Yêu Thích", "Quán Nổi Tiếng", "Tiệm Hot Trend", "Thương Hiệu Mì Cay", "Huyền Thoại Phố Ẩm Thực"];

export class ShopScene {
  constructor(game) {
    this.game = game;
    this.actors = new Map();
    this.uid = 0;
    this.syncQueued = false;
    this.firstSync = true;
    this.lastBowls = null;
    this.staffSig = "";
    this.staffEls = [];
    this.dirtyEls = new Map();
    this.lastCoinSound = 0;
    this.root = null;
  }

  // ---------- KHỞI TẠO DOM ----------
  mount(container) {
    if (!container) return;
    this.root = container;
    container.innerHTML = `
      <div class="sc-viewport" id="sc-viewport">
        <div class="sc-stage" id="sc-stage">
          <img class="sc-bg" src="${renderPixelInterior()}" alt="Nội thất tiệm mì" draggable="false" />
          <div class="sc-glow"><i style="left:4.5%;top:11%"></i><i style="left:11%;top:13%"></i><i style="left:41.5%;top:20%"></i><i style="left:46%;top:21%"></i><i style="left:63.5%;top:5%"></i><i style="left:91.5%;top:6%"></i></div>
          <div class="sc-shop-sign" id="sc-shop-sign"><span id="sc-shop-sign-text">Tiệm Mỳ Cay</span></div>
          <div class="sc-door-sign is-closed" id="sc-door-sign">ĐÓNG</div>
          <div class="sc-steam"><i style="left:13%;top:47%"></i><i style="left:14.5%;top:46%"></i><i style="left:19.8%;top:46%"></i><i style="left:21%;top:45%"></i></div>
          <div class="sc-layer" id="sc-staff-layer"></div>
          <div class="sc-layer" id="sc-actor-layer"></div>
          <div class="sc-tint"></div>
        </div>
        <div class="sc-chip sc-chip-left" id="sc-chip-time">☀️ Buổi sáng</div>
        <div class="sc-chip sc-chip-right" id="sc-chip-crowd">🪑 Quán đang chuẩn bị</div>
        <div class="sc-prep-overlay" id="sc-prep-overlay">
          <button class="sc-open-cta" data-act="open" type="button">
            <span class="sc-open-cta-icon">🚪</span>
            <span class="sc-open-cta-text"><b id="sc-open-cta-label">MỞ CỬA</b><small id="sc-open-cta-sub">Ngày 1 · Đón khách thôi!</small></span>
          </button>
        </div>
        <div class="sc-ticker"><span id="sc-ticker-text">🏮 Tiệm mới khai trương! Hãy mở cửa đón những vị khách đầu tiên ✨</span></div>
        <div class="sc-banner" id="sc-banner"></div>
      </div>
    `;

    this.stage = container.querySelector("#sc-stage");
    this.viewport = container.querySelector("#sc-viewport");
    this.staffLayer = container.querySelector("#sc-staff-layer");
    this.actorLayer = container.querySelector("#sc-actor-layer");
    this.signText = container.querySelector("#sc-shop-sign-text");
    this.doorSign = container.querySelector("#sc-door-sign");
    this.chipTime = container.querySelector("#sc-chip-time");
    this.chipCrowd = container.querySelector("#sc-chip-crowd");
    this.prepOverlay = container.querySelector("#sc-prep-overlay");
    this.ctaLabel = container.querySelector("#sc-open-cta-label");
    this.ctaSub = container.querySelector("#sc-open-cta-sub");
    this.tickerText = container.querySelector("#sc-ticker-text");
    this.banner = container.querySelector("#sc-banner");

    container.addEventListener("click", (e) => this.handleClick(e));

    // Cảnh vỉa hè cũ đã được thay bằng khung cảnh này -> dừng vòng lặp người đi bộ chạy ngầm
    if (this.game.pedestrianInterval) {
      clearInterval(this.game.pedestrianInterval);
      this.game.pedestrianInterval = null;
    }

    // Nhân viên thỉnh thoảng nói chuyện cho quán có hồn
    this.chatterTimer = setInterval(() => this.staffChatter(), 5200);
    // Khách đang ăn thỉnh thoảng thả cảm xúc
    this.emoteTimer = setInterval(() => this.diningEmote(), 3800);

    this.requestSync();
  }

  // Gom nhiều lần render trong cùng 1 khung hình thành 1 lần đồng bộ
  requestSync() {
    if (this.syncQueued || !this.root) return;
    this.syncQueued = true;
    requestAnimationFrame(() => {
      this.syncQueued = false;
      try {
        this.sync();
      } catch (err) {
        console.error("[ShopScene] Lỗi đồng bộ khung cảnh:", err);
      }
    });
  }

  // ---------- ĐỒNG BỘ TRẠNG THÁI GAME -> KHUNG CẢNH ----------
  sync() {
    const g = this.game;
    if (!g || !g.state) return;
    const isOpen = g.state.dayPhase === "open";
    const instant = this.firstSync;

    this.root.classList.toggle("is-open", isOpen);
    this.root.classList.toggle("is-prep", !isOpen);
    this.root.classList.toggle("is-cooking", isOpen && Boolean(g.currentPot && g.currentPot.noodleId));
    this.root.classList.toggle("is-fever", Boolean(g.isFeverActive));

    this.syncSigns(isOpen);
    this.syncLighting(isOpen);
    this.syncStaff(isOpen);
    this.syncWaiters(isOpen);

    // Khách vừa được phục vụ hay bỏ về? (dựa trên số tô bán ra tăng lên)
    const bowlsNow = (g.state.todayBowlsSold || 0) + (g.state.todayDrinksSold || 0);
    const justServed = this.lastBowls !== null && bowlsNow > this.lastBowls;
    this.lastBowls = bowlsNow;

    // 1) Khách xếp hàng gọi món
    const seenQueue = new Set();
    const slots = isOpen && Array.isArray(g.orderSlots) ? g.orderSlots : [];
    slots.forEach((slot, idx) => {
      if (!slot || !slot.customer) return;
      if (!slot.__sid) {
        Object.defineProperty(slot, "__sid", { value: ++this.uid, enumerable: false });
      }
      const key = `q${slot.__sid}`;
      seenQueue.add(key);
      let actor = this.actors.get(key);
      const spot = QUEUE_SPOTS[idx] || QUEUE_SPOTS[0];
      if (!actor) {
        actor = this.createActor(key, slot.customer);
        this.placeActor(actor, instant ? spot : DOOR);
        if (!instant) {
          actor.el.classList.add("is-entering");
          this.moveActor(actor, spot);
        }
      } else if (actor.spotIdx !== idx) {
        this.moveActor(actor, spot);
      }
      actor.spotIdx = idx;
      actor.role = "queue";
      this.renderQueueBubble(actor, slot, idx);
    });

    // Khách rời khỏi hàng chờ trong lượt đồng bộ này
    const leavers = [];
    this.actors.forEach((actor, key) => {
      if (key.startsWith("q") && !seenQueue.has(key) && !actor.leaving) leavers.push(actor);
    });

    // 2) Khách ngồi ăn tại bàn
    const tables = Array.isArray(g.state.tables) ? g.state.tables : [];
    const liveTableKeys = new Set();
    tables.forEach((t, i) => {
      const spot = TABLE_SPOTS[i % TABLE_SPOTS.length];
      const key = `t${t.id}`;
      if (t.status === "eating" && t.customer) {
        liveTableKeys.add(key);
        if (!this.actors.has(key)) {
          const leaverIdx = leavers.findIndex(a => a.customer && a.customer.name === t.customer.name);
          if (leaverIdx >= 0 && !instant) {
            // Khách vừa nhận món ở quầy -> cầm tô đi về bàn ngồi
            const actor = leavers.splice(leaverIdx, 1)[0];
            this.actors.delete(actor.key);
            actor.key = key;
            this.actors.set(key, actor);
            this.toDiner(actor, t.id);
            this.showEmote(actor, "😋");
            this.moveActor(actor, spot, () => {
              actor.el.classList.add("seated");
              this.setActorSeated(actor, true);
            });
          } else {
            const actor = this.createActor(key, t.customer);
            this.toDiner(actor, t.id);
            if (instant) {
              this.placeActor(actor, spot);
              actor.el.classList.add("seated");
              this.setActorSeated(actor, true);
            } else {
              this.placeActor(actor, DOOR);
              this.moveActor(actor, spot, () => {
                actor.el.classList.add("seated");
                this.setActorSeated(actor, true);
              });
            }
          }
        }
      }
      this.syncDirtyMarker(t, spot);
    });

    // Khách ăn xong -> đứng dậy đi về
    this.actors.forEach((actor, key) => {
      if (key.startsWith("t") && !liveTableKeys.has(key) && !actor.leaving) {
        actor.el.classList.remove("seated");
        this.setActorSeated(actor, false);
        this.showEmote(actor, "💕");
        this.leaveActor(actor);
      }
    });

    // Khách còn lại trong danh sách rời hàng: mang về (đã phục vụ) hoặc giận dỗi bỏ đi
    leavers.forEach(actor => {
      this.hideBubble(actor);
      this.showEmote(actor, justServed ? "🥡" : "💢");
      this.leaveActor(actor);
    });

    this.syncChips(isOpen, tables);
    this.updateHud();
    this.firstSync = false;
  }

  syncSigns(isOpen) {
    const g = this.game;
    const name = g.state.shopName || "Tiệm Mỳ Cay";
    if (this.signText && this.signText.textContent !== name) {
      this.signText.textContent = name;
      this.signText.parentElement.style.setProperty("--len", Math.max(6, name.length));
    }
    if (this.doorSign) {
      this.doorSign.textContent = isOpen ? "MỞ CỬA" : "ĐÓNG";
      this.doorSign.classList.toggle("is-closed", !isOpen);
    }
    if (this.ctaLabel) this.ctaLabel.textContent = `MỞ CỬA NGÀY ${g.state.day}`;
    if (this.ctaSub) {
      const bo = g.state.noodles && g.state.noodles.my_bo ? g.state.noodles.my_bo.stock : 0;
      this.ctaSub.textContent = bo > 0 ? "Khách đang chờ ngoài cửa!" : "⚠️ Cần nhập Mì Bò Mỹ trong Kho";
    }

    const tickerSrc = document.getElementById(isOpen ? "open-crowd-headline-text" : "prep-crowd-status-text");
    if (tickerSrc && this.tickerText && this.tickerText.textContent !== tickerSrc.textContent) {
      this.tickerText.textContent = tickerSrc.textContent;
    }
  }

  syncLighting(isOpen) {
    const g = this.game;
    let t = 0;
    if (isOpen && g.dayDuration > 0) {
      t = Math.min(1, Math.max(0, 1 - (g.dayRemaining || 0) / g.dayDuration));
    }
    let phase = "morning";
    let label = "☀️ Buổi sáng";
    if (t >= 0.85) { phase = "night"; label = "🌙 Tối muộn"; }
    else if (t >= 0.62) { phase = "sunset"; label = "🌇 Hoàng hôn"; }
    else if (t >= 0.3) { phase = "noon"; label = "🌤️ Giờ trưa"; }
    if (!isOpen) label = `☀️ Ngày ${g.state.day} · Chuẩn bị`;
    if (this.stage.dataset.phase !== phase) this.stage.dataset.phase = phase;
    if (this.chipTime && this.chipTime.textContent !== label) this.chipTime.textContent = label;
  }

  syncChips(isOpen, tables) {
    if (!this.chipCrowd) return;
    const eating = tables.filter(t => t.status === "eating").length;
    const dirty = tables.filter(t => t.status === "dirty").length;
    const waiting = (this.game.orderSlots || []).filter(Boolean).length;
    let text;
    if (!isOpen) {
      text = `🪑 ${tables.length} bàn sẵn sàng`;
    } else {
      text = `🧾 ${waiting} chờ · 🍜 ${eating} ăn${dirty ? ` · 🧹 ${dirty}` : ""}`;
    }
    if (this.chipCrowd.textContent !== text) this.chipCrowd.textContent = text;
  }

  // ---------- NHÂN VIÊN SAU QUẦY ----------
  syncStaff(isOpen) {
    const g = this.game;
    const staffState = g.state.staff || {};
    const crew = [{ key: "owner", name: g.state.ownerName || "Bếp Trưởng", avatar: g.state.ownerAvatar || "assets/cust_cat.png" }]
      .concat(STAFF_ROSTER.filter(s => staffState[s.key]));
    const sig = crew.map(c => c.key + c.avatar).join("|");

    if (sig !== this.staffSig) {
      this.staffSig = sig;
      this.staffLayer.innerHTML = "";
      this.staffEls = [];
      const visible = crew.slice(0, STAFF_SPOTS.length);
      visible.forEach((member, i) => {
        const spot = STAFF_SPOTS[i];
        const el = document.createElement("div");
        el.className = `sc-actor sc-staff ${member.key === "owner" ? "is-owner" : ""}`;
        el.style.left = `${spot.x}%`;
        el.style.top = `${spot.y}%`;
        el.style.zIndex = String(Math.round(spot.y * 10));
        el.style.setProperty("--bob-delay", `${(i * 0.37).toFixed(2)}s`);
        el.title = member.name;
        const pixelImg = getPixelCharacterUrl(member.avatar, {
          isOwner: member.key === "owner",
          isStaff: true,
          shirtColor: "#5a3a24",
          scale: 3
        });
        el.innerHTML = `
          <div class="sc-bubble sc-talk" hidden></div>
          <div class="sc-pixel-char-wrap">
            <img class="sc-pixel-char" src="${pixelImg}" alt="${member.name}" draggable="false" />
          </div>
        `;
        this.staffLayer.appendChild(el);
        this.staffEls.push({ el, member });
      });
      if (crew.length > visible.length) {
        const more = document.createElement("div");
        more.className = "sc-staff-more";
        more.style.left = `${STAFF_SPOTS[STAFF_SPOTS.length - 1].x + 4}%`;
        more.style.top = `${STAFF_SPOTS[0].y - 14}%`;
        more.textContent = `+${crew.length - visible.length}`;
        more.title = crew.slice(visible.length).map(c => c.name).join(", ");
        this.staffLayer.appendChild(more);
      }
    }

    // Chủ tiệm báo đang nấu món gì
    const owner = this.staffEls.find(s => s.member.key === "owner");
    if (owner) {
      const pot = g.currentPot || {};
      const talk = owner.el.querySelector(".sc-talk");
      if (isOpen && pot.noodleId && g.state.noodles[pot.noodleId]) {
        const icon = g.state.noodles[pot.noodleId].icon || "🍜";
        const html = `<span class="sc-b-main">${icon}</span><span class="sc-b-fire">🔥</span>`;
        if (talk.dataset.cook !== pot.noodleId) {
          talk.dataset.cook = pot.noodleId;
          talk.innerHTML = html;
        }
        talk.hidden = false;
        talk.classList.add("is-cooking-bubble");
      } else if (talk.classList.contains("is-cooking-bubble")) {
        talk.hidden = true;
        talk.dataset.cook = "";
        talk.classList.remove("is-cooking-bubble");
      }
    }
  }

  // Lúc chuẩn bị: vài vị khách đứng ngóng trước cửa chờ quán mở
  syncWaiters(isOpen) {
    const templates = (this.game.customerTemplates || []).filter(c => !c.isVip);
    WAIT_SPOTS.forEach((spot, i) => {
      const key = `w${i}`;
      const actor = this.actors.get(key);
      if (!isOpen && !actor && templates.length) {
        const cust = templates[Math.floor(Math.random() * templates.length)];
        const waiter = this.createActor(key, cust);
        waiter.role = "waiter";
        this.placeActor(waiter, spot);
        const bubble = waiter.el.querySelector(".sc-bubble");
        bubble.classList.add("sc-think");
        bubble.innerHTML = `<span class="sc-b-main">${i === 0 ? "🍜" : "🧋"}</span><span class="sc-b-spicy">?</span>`;
        bubble.hidden = false;
      } else if (isOpen && actor && !actor.leaving) {
        actor.leaving = true;
        actor.el.classList.add("is-exiting");
        setTimeout(() => {
          actor.el.remove();
          if (this.actors.get(key) === actor) this.actors.delete(key);
        }, 420);
      }
    });
  }

  staffChatter() {
    if (!this.staffEls.length || document.hidden) return;
    const isOpen = this.game.state.dayPhase === "open";
    const pool = this.staffEls.filter(s => {
      const talk = s.el.querySelector(".sc-talk");
      return talk && talk.hidden;
    });
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const lines = isOpen ? STAFF_LINES_OPEN : STAFF_LINES_PREP;
    const talk = pick.el.querySelector(".sc-talk");
    talk.textContent = lines[Math.floor(Math.random() * lines.length)];
    talk.hidden = false;
    talk.classList.add("is-line");
    setTimeout(() => {
      if (talk.classList.contains("is-line")) {
        talk.hidden = true;
        talk.classList.remove("is-line");
      }
    }, 2600);
  }

  diningEmote() {
    if (document.hidden) return;
    const diners = [...this.actors.values()].filter(a => a.role === "diner" && !a.leaving);
    if (!diners.length) return;
    const pick = diners[Math.floor(Math.random() * diners.length)];
    this.showEmote(pick, EAT_EMOTES[Math.floor(Math.random() * EAT_EMOTES.length)]);
  }

  // ---------- NHÂN VẬT KHÁCH ----------
  createActor(key, customer) {
    const el = document.createElement("div");
    el.className = `sc-actor sc-customer ${customer.isVip ? "is-vip" : ""}`;
    const shirt = customer.isVip ? "#E9B840" : (SHIRT_COLORS[customer.avatar] || "#E59A7A");
    el.style.setProperty("--shirt", shirt);
    el.style.setProperty("--bob-delay", `${(Math.random() * 0.6).toFixed(2)}s`);
    const pixelImg = getPixelCharacterUrl(customer.avatar, {
      isVip: customer.isVip,
      shirtColor: shirt,
      isSeated: false,
      scale: 3
    });
    el.innerHTML = `
      <div class="sc-bubble" hidden></div>
      <div class="sc-pixel-char-wrap">
        <img class="sc-pixel-char" src="${pixelImg}" alt="${customer.name}" draggable="false" />
      </div>
      <span class="sc-emote"></span>
      <span class="sc-shadow"></span>
    `;
    el.title = customer.name;
    this.actorLayer.appendChild(el);
    const actor = { key, el, customer, x: DOOR.x, y: DOOR.y, spotIdx: null, role: "queue", leaving: false, bubbleSig: "" };
    el.dataset.key = key;
    this.actors.set(key, actor);
    return actor;
  }

  setActorSeated(actor, isSeated) {
    if (!actor || !actor.customer) return;
    const shirt = actor.customer.isVip ? "#E9B840" : (SHIRT_COLORS[actor.customer.avatar] || "#E59A7A");
    const imgUrl = getPixelCharacterUrl(actor.customer.avatar, {
      isVip: actor.customer.isVip,
      shirtColor: shirt,
      isSeated,
      scale: 3
    });
    const charImg = actor.el.querySelector(".sc-pixel-char");
    if (charImg && charImg.src !== imgUrl) charImg.src = imgUrl;
  }

  toDiner(actor, tableId) {
    actor.role = "diner";
    actor.tableId = tableId;
    actor.spotIdx = null;
    this.hideBubble(actor);
    actor.el.classList.add("is-diner");
  }

  placeActor(actor, pos) {
    actor.x = pos.x;
    actor.y = pos.y;
    actor.el.style.transitionDuration = "0ms";
    actor.el.style.left = `${pos.x}%`;
    actor.el.style.top = `${pos.y}%`;
    actor.el.style.zIndex = String(Math.round(pos.y * 10));
  }

  moveActor(actor, pos, onArrive) {
    const dx = pos.x - actor.x;
    const dy = pos.y - actor.y;
    const dist = Math.hypot(dx, dy * 1.6);
    const duration = Math.max(380, Math.round(dist * 34));
    const el = actor.el;
    el.classList.add("walking");
    el.classList.toggle("face-left", dx < -0.5);
    el.style.transitionDuration = `${duration}ms`;
    // Ép trình duyệt ghi nhận vị trí cũ trước khi đổi để transition chạy mượt
    void el.offsetWidth;
    el.style.left = `${pos.x}%`;
    el.style.top = `${pos.y}%`;
    el.style.zIndex = String(Math.round(Math.max(pos.y, actor.y) * 10));
    actor.x = pos.x;
    actor.y = pos.y;
    clearTimeout(actor.arriveTimer);
    actor.arriveTimer = setTimeout(() => {
      el.classList.remove("walking", "is-entering", "face-left");
      el.style.zIndex = String(Math.round(pos.y * 10));
      if (typeof onArrive === "function") onArrive();
    }, duration);
  }

  leaveActor(actor) {
    actor.leaving = true;
    actor.role = "leaving";
    delete actor.el.dataset.act;
    this.moveActor(actor, DOOR, () => {
      actor.el.classList.add("is-exiting");
      setTimeout(() => {
        actor.el.remove();
        if (this.actors.get(actor.key) === actor) this.actors.delete(actor.key);
      }, 420);
    });
  }

  renderQueueBubble(actor, slot, idx) {
    const g = this.game;
    const bubble = actor.el.querySelector(".sc-bubble");
    if (!bubble) return;
    const order = slot.order || {};
    const noodle = g.state.noodles[order.noodleId];
    const top = order.toppingId ? g.state.toppings[order.toppingId] : null;
    const drink = order.drinkId ? g.state.drinks[order.drinkId] : null;
    // Dùng chung luật so khớp của game (gồm size, topping, đồ uống, món hết hàng được bưng thiếu)
    const isMatch = typeof g.isPotMatchingOrder === "function" && g.isPotMatchingOrder(order);
    const isSpecial = Boolean(slot.isSpecialCombo);
    const sig = [order.noodleId, order.toppingId, order.drinkId, order.spicyLevel, order.size, isMatch].join("|");

    if (actor.bubbleSig !== sig) {
      actor.bubbleSig = sig;
      bubble.innerHTML = `
        <span class="sc-b-main">${noodle ? noodle.icon : "🍜"}</span>
        ${top ? `<span class="sc-b-top">${top.icon}</span>` : ""}
        ${drink ? `<span class="sc-b-top">${drink.icon}</span>` : ""}
        <span class="sc-b-spicy">🌶${order.spicyLevel || 0}</span>
        ${order.size === "L" ? '<span class="sc-b-size">L</span>' : ""}
        ${isMatch ? '<span class="sc-b-ready">✓</span>' : ""}
      `;
    }

    const pct = Math.max(0, Math.min(100, (slot.patience / (slot.maxPatience || 100)) * 100));
    bubble.style.setProperty("--p", pct.toFixed(1));
    bubble.hidden = false;
    bubble.classList.toggle("is-match", isMatch);
    bubble.classList.toggle("is-special", isSpecial);
    bubble.classList.toggle("is-low", pct < 30);
    actor.el.dataset.act = "queue";
    actor.el.dataset.slot = String(idx);
    actor.el.classList.toggle("is-impatient", pct < 30);
  }

  hideBubble(actor) {
    const bubble = actor.el.querySelector(".sc-bubble");
    if (bubble) bubble.hidden = true;
    actor.el.classList.remove("is-impatient");
    delete actor.el.dataset.act;
    delete actor.el.dataset.slot;
    if (actor.role === "diner") {
      actor.el.dataset.act = "eat";
      actor.el.dataset.table = String(actor.tableId);
    }
  }

  showEmote(actor, emoji) {
    const emote = actor.el.querySelector(".sc-emote");
    if (!emote) return;
    emote.textContent = emoji;
    emote.classList.remove("pop");
    void emote.offsetWidth;
    emote.classList.add("pop");
  }

  syncDirtyMarker(table, spot) {
    const existing = this.dirtyEls.get(table.id);
    if (table.status === "dirty") {
      if (!existing) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "sc-dirty";
        el.dataset.act = "clean";
        el.dataset.table = String(table.id);
        el.style.left = `${spot.x}%`;
        el.style.top = `${spot.y}%`;
        el.style.zIndex = String(Math.round(spot.y * 10) - 1);
        el.innerHTML = `<span class="sc-dirty-bowl">🥣</span><span class="sc-dirty-tag">🧹 Dọn</span>`;
        el.title = `Dọn bàn #${table.id} nhận tip`;
        this.actorLayer.appendChild(el);
        this.dirtyEls.set(table.id, el);
      }
    } else if (existing) {
      existing.classList.add("is-cleaned");
      this.dirtyEls.delete(table.id);
      setTimeout(() => existing.remove(), 450);
    }
  }

  // ---------- TƯƠNG TÁC CHẠM ----------
  handleClick(e) {
    const g = this.game;
    const target = e.target.closest("[data-act]");
    if (!target || !this.root.contains(target)) return;
    const act = target.dataset.act;
    const rect = target.getBoundingClientRect();

    if (act === "open") {
      g.startOpenDay();
      return;
    }

    // Hiệu ứng tiền/chữ nổi sẽ bật ra ngay tại nhân vật được chạm trong khung cảnh
    window.__mycayFxAnchor = rect;
    try {
      if (act === "queue") {
        const idx = parseInt(target.dataset.slot, 10);
        const slot = g.orderSlots && g.orderSlots[idx];
        if (!slot) return;
        const bubble = target.querySelector(".sc-bubble");
        if (bubble && bubble.classList.contains("is-match")) {
          g.serveToSlot(idx);
        } else {
          g.quickCookForSlot(idx);
        }
      } else if (act === "eat") {
        g.interactEatingTable(parseInt(target.dataset.table, 10));
      } else if (act === "clean") {
        g.cleanTable(parseInt(target.dataset.table, 10));
      }
    } finally {
      window.__mycayFxAnchor = null;
    }
  }

  // ---------- XU VÀNG BAY VỀ VÍ ----------
  flyCoins(fromRect, text) {
    const target = document.getElementById("hud-coin-pill") || document.getElementById("display-money");
    if (!target || !fromRect || document.hidden) return;
    const amount = parseInt(String(text).replace(/[^\d]/g, ""), 10) || 5;
    const count = Math.max(3, Math.min(9, Math.round(Math.log2(amount + 1) * 1.4)));
    const to = target.getBoundingClientRect();
    const sx = fromRect.left + fromRect.width / 2;
    const sy = fromRect.top + Math.min(fromRect.height / 2, 40);
    const tx = to.left + 16;
    const ty = to.top + to.height / 2;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    for (let i = 0; i < count; i++) {
      const coin = document.createElement("span");
      coin.className = "fx-coin";
      coin.style.left = `${sx}px`;
      coin.style.top = `${sy}px`;
      document.body.appendChild(coin);
      const angle = Math.random() * Math.PI * 2;
      const spread = 26 + Math.random() * 34;
      const bx = Math.cos(angle) * spread;
      const by = Math.sin(angle) * spread - 30;
      const duration = reduce ? 300 : 820 + i * 55;
      const anim = coin.animate([
        { transform: "translate(-50%, -50%) scale(0.4)", opacity: 0 },
        { transform: `translate(calc(-50% + ${bx}px), calc(-50% + ${by}px)) scale(1.1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(calc(-50% + ${tx - sx}px), calc(-50% + ${ty - sy}px)) scale(0.7)`, opacity: 0.95 }
      ], { duration, easing: "cubic-bezier(.55,.05,.6,1)", fill: "forwards" });
      anim.onfinish = () => {
        coin.remove();
        if (i === count - 1) this.bumpWallet();
      };
    }
  }

  bumpWallet() {
    const pill = document.getElementById("hud-coin-pill");
    if (pill) {
      pill.classList.remove("is-bumped");
      void pill.offsetWidth;
      pill.classList.add("is-bumped");
    }
    const now = Date.now();
    if (now - this.lastCoinSound > 350 && this.game.sound && typeof this.game.sound.playCoinChime === "function") {
      this.lastCoinSound = now;
      this.game.sound.playCoinChime();
    }
  }

  // ---------- THÔNG BÁO LỚN TRÊN KHUNG CẢNH ----------
  announce(kind) {
    if (!this.banner) return;
    const g = this.game;
    const html = kind === "open"
      ? `<b>🏮 MỞ CỬA!</b><small>Ngày ${g.state.day} · Chúc buôn may bán đắt</small>`
      : `<b>🌙 ĐÓNG CỬA</b><small>Hết ca bán Ngày ${g.state.day}</small>`;
    this.banner.innerHTML = html;
    this.banner.className = `sc-banner show ${kind === "open" ? "is-open" : "is-close"}`;
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.banner.className = "sc-banner";
    }, 2200);
  }

  // ---------- HUD CẤP ĐỘ TIỆM ----------
  static levelInfo(stats, extra = 0) {
    const s = stats || {};
    const xp = Math.floor((s.bowlsServed || 0) * 10 + (s.drinksServed || 0) * 4 + (s.vipServed || 0) * 15 + (s.specialBowlsServed || 0) * 6 + extra * 8 + (s.bonusXp || 0));
    const totalFor = (lv) => 60 * (lv - 1) + 20 * (lv - 1) * (lv - 2);
    let level = 1;
    while (xp >= totalFor(level + 1) && level < 99) level++;
    const cur = totalFor(level);
    const next = totalFor(level + 1);
    return { level, xp, into: xp - cur, need: next - cur, pct: Math.min(100, ((xp - cur) / (next - cur)) * 100) };
  }

  updateHud() {
    const g = this.game;
    const info = ShopScene.levelInfo(g.state.stats, g.state.deliveredOnlineCount || 0);
    const badge = document.getElementById("hud-level-num");
    const ring = document.getElementById("btn-owner-profile");
    const xpFill = document.getElementById("hud-xp-fill");
    const xpText = document.getElementById("hud-xp-text");
    const title = document.getElementById("hud-level-title");
    if (badge) badge.textContent = String(info.level);
    if (ring) ring.style.setProperty("--xp", info.pct.toFixed(1));
    if (xpFill) xpFill.style.width = `${info.pct.toFixed(1)}%`;
    if (xpText) xpText.textContent = `${info.into}/${info.need} XP`;
    if (title) title.textContent = LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, info.level - 1)];

    let stored = null;
    try {
      stored = parseInt(localStorage.getItem("mycay_hud_level") || "", 10);
    } catch (e) {}
    if (!Number.isNaN(stored) && stored !== null && info.level > stored) {
      this.showLevelUp(info.level);
    }
    if (stored !== info.level) {
      try {
        localStorage.setItem("mycay_hud_level", String(info.level));
      } catch (e) {}
    }
  }

  showLevelUp(level) {
    const old = document.getElementById("fx-levelup");
    if (old) old.remove();
    const el = document.createElement("div");
    el.id = "fx-levelup";
    el.className = "fx-levelup";
    const title = LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, level - 1)];
    el.innerHTML = `
      <div class="fx-levelup-rays"></div>
      <div class="fx-levelup-card">
        <div class="fx-levelup-ribbon">LÊN CẤP!</div>
        <div class="fx-levelup-num">Lv ${level}</div>
        <div class="fx-levelup-title">${title}</div>
      </div>
    `;
    el.addEventListener("click", () => el.remove());
    document.body.appendChild(el);
    for (let i = 0; i < 26; i++) {
      const c = document.createElement("i");
      c.className = "fx-confetti";
      c.style.left = `${Math.random() * 100}%`;
      c.style.setProperty("--hue", String(Math.floor(Math.random() * 360)));
      c.style.animationDelay = `${(Math.random() * 0.5).toFixed(2)}s`;
      c.style.animationDuration = `${(1.6 + Math.random() * 1.2).toFixed(2)}s`;
      el.appendChild(c);
    }
    if (this.game.sound && typeof this.game.sound.playUpgradeSound === "function") {
      this.game.sound.playUpgradeSound();
    }
    setTimeout(() => el.classList.add("is-leaving"), 2600);
    setTimeout(() => el.remove(), 3100);
  }
}
