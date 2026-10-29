// ==========================================================
// CHỢ NGUYÊN LIỆU THẬT (v2.3.0)
// - Giá chợ đổi mỗi ngày, có biến cố (mưa bão, khuyến mãi...) và số lượng chợ bán ra có hạn
// - Nhập sỉ số lượng lớn được giảm giá
// - Mỗi lô hàng có hạn dùng riêng: để quá hạn sẽ bị hỏng và phải đổ bỏ (tủ đông kéo dài hạn dùng)
// - Chỉ trả lại hàng trong ngày mua, hàng đã qua đêm chợ không nhận lại
// Các hàm bên dưới được gắn vào prototype của SpicyNoodleGame trong game.js
// ==========================================================
import { GameUIModal } from "./modal.js?v=2.3.0";
import { txaformat } from "./txaformat.js?v=2.3.0";

// Hạn dùng (ngày, tính cả ngày mua). null = không hỏng (niêu đất)
const SHELF_LIFE = {
  mi_soi: 4, nuoc_ham: 2, sot_ot: 10, nieu_dat: null, tra_den: 14, sua_tuoi_nguyenkem: 3, duong_den_dailoan: 30,
  bo: 2, xucxich: 4, kimchi: 5, tom: 2, muc: 2, trung: 4, nam: 3, phomai: 4,
  top_boba_black: 3, top_boba_white: 3, top_pudding: 2, top_coconut: 4, top_cheese_foam: 2,
  nuocsam: 2, tradao: 2, tra_traicay: 2
};
const DEFAULT_SHELF_LIFE = 3;

// Số phần chợ bán tối đa mỗi ngày cho mỗi mặt hàng
const SUPPLY_PER_DAY = { supplies: 150, noodles: 60, toppings: 60, drinks: 60 };

const GROUPS = {
  seafood: ["my_haisan", "tom", "muc", "my_baongu"],
  meat: ["my_bo", "bo", "xucxich", "my_thapcam"],
  veg: ["kimchi", "nam", "my_kimchi", "my_nam", "my_tomyum"],
  dairy: ["sua_tuoi_nguyenkem", "suatuoi", "top_cheese_foam", "phomai", "top_pudding"],
  tea: ["tra_den", "trasua", "tradao", "trasua_oolong", "trasua_matcha", "trasua_taro", "tra_traicay", "nuocsam"],
  dry: ["mi_soi", "nuoc_ham", "sot_ot", "duong_den_dailoan", "top_boba_black", "top_boba_white"]
};

const MARKET_EVENTS = [
  { text: "🌧️ Mưa bão kéo dài: hải sản và rau củ khan hàng, giá tăng", ids: [...GROUPS.seafood, ...GROUPS.veg], mult: 1.35 },
  { text: "📈 Giá thịt bò tăng do thiếu nguồn cung", ids: GROUPS.meat, mult: 1.3 },
  { text: "🎉 Chợ đầu mối khuyến mãi: mì sợi, nước hầm, sốt ớt giảm giá", ids: GROUPS.dry, mult: 0.8 },
  { text: "🥛 Nông trại giao dư sữa: sữa & phô mai rẻ hơn", ids: GROUPS.dairy, mult: 0.8 },
  { text: "🍵 Vụ trà mới về: các loại trà giảm giá", ids: GROUPS.tea, mult: 0.85 },
  { text: "🚛 Kẹt xe chở hàng: toàn chợ tăng nhẹ", ids: null, mult: 1.12 }
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round1 = v => Math.round(v * 10) / 10;

export const MarketMethods = {
  getStockEntries() {
    const st = this.state;
    const out = [];
    [["supplies", st.supplies], ["noodles", st.noodles], ["toppings", st.toppings], ["drinks", st.drinks]].forEach(([type, group]) => {
      Object.values(group || {}).forEach(item => out.push({ type, item }));
    });
    return out;
  },

  findStockItem(itemId) {
    return this.getStockEntries().find(e => e.item.id === itemId) || null;
  },

  // Hạn dùng của mặt hàng (ngày). Tủ đông nâng cấp kéo dài thêm +25% mỗi cấp
  getShelfLife(item) {
    const base = Object.prototype.hasOwnProperty.call(SHELF_LIFE, item.id) ? SHELF_LIFE[item.id] : DEFAULT_SHELF_LIFE;
    if (base === null) return null;
    const lv = this.state.upgrades.freezerStorage || 1;
    return Math.max(base, Math.round(base * (1 + 0.25 * (lv - 1))));
  },

  // Cập nhật giá chợ & lượng hàng chợ có mỗi khi sang ngày mới
  ensureMarket() {
    const eco = this.state.eco;
    const m = eco.market;
    if (m.day === this.state.day && m.factors && Object.keys(m.factors).length) return m;

    const prev = m.factors || {};
    const factors = {};
    const supply = {};
    const event = this.state.day > 1 && Math.random() < 0.18 ? MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)] : null;

    this.getStockEntries().forEach(({ type, item }) => {
      // Giá dao động quanh mức chuẩn, kéo dần về chuẩn thay vì nhảy loạn
      const drift = 1 + ((prev[item.id] || 1) - 1) * 0.5 + (Math.random() - 0.5) * 0.3;
      let f = clamp(drift, 0.8, 1.45);
      if (event && (!event.ids || event.ids.includes(item.id))) f = clamp(f * event.mult, 0.7, 1.8);
      factors[item.id] = Math.round(f * 100) / 100;
      supply[item.id] = SUPPLY_PER_DAY[type];
    });

    eco.market = { day: this.state.day, factors, supply, event: event ? event.text : null };
    return eco.market;
  },

  // Giá nhập 1 phần hôm nay (đã gồm chiết khấu sỉ của Nai Fawn)
  getMarketPrice(item) {
    const m = this.ensureMarket();
    const f = m.factors[item.id] || 1;
    const fawn = this.state.staff.fawn ? 0.85 : 1;
    return round1(item.unitCost * f * fawn);
  },

  // Giảm giá khi nhập số lượng lớn trong 1 lần mua
  getBulkDiscount(qty) {
    if (qty >= 20) return 0.9;
    if (qty >= 10) return 0.95;
    return 1;
  },

  // Đối chiếu các lô hàng với số tồn thực tế (hàng bị dùng thì trừ lô cũ nhất trước)
  reconcileBatches() {
    const eco = this.state.eco;
    const today = this.state.day;
    this.getStockEntries().forEach(({ item }) => {
      const list = eco.batches[item.id] || (eco.batches[item.id] = []);
      const stock = Math.max(0, Math.floor(item.stock || 0));
      const total = list.reduce((s, b) => s + b.qty, 0);
      if (stock < total) {
        let drop = total - stock;
        while (drop > 0 && list.length) {
          const b = list[0];
          const d = Math.min(b.qty, drop);
          b.qty -= d;
          drop -= d;
          if (b.qty <= 0) list.shift();
        }
      } else if (stock > total) {
        // Hàng không rõ nguồn gốc (tồn từ phiên cũ, thưởng...) được coi là mới nhập hôm nay
        const last = list[list.length - 1];
        const add = stock - total;
        if (last && last.day === today && Math.abs(last.unit - item.unitCost) < 0.01) last.qty += add;
        else list.push({ qty: add, day: today, unit: item.unitCost });
      }
    });
  },

  // Còn dùng được bao nhiêu ngày (tính cả hôm nay) cho lô cũ nhất của mặt hàng
  getShelfInfo(item) {
    const life = this.getShelfLife(item);
    if (life === null) return { text: "Không hỏng", cls: "ok", daysLeft: null };
    const list = (this.state.eco.batches[item.id] || []).filter(b => b.qty > 0);
    if (!list.length) return { text: `Hạn dùng ${life} ngày`, cls: "ok", daysLeft: null };
    const oldest = list[0];
    const daysLeft = life - (this.state.day - oldest.day);
    if (daysLeft <= 1) return { text: `⚠️ ${oldest.qty} phần hết hạn cuối hôm nay`, cls: "danger", daysLeft };
    if (daysLeft <= 2) return { text: `Lô cũ còn ${daysLeft} ngày`, cls: "warn", daysLeft };
    return { text: `Lô cũ còn ${daysLeft} ngày`, cls: "ok", daysLeft };
  },

  // Cuối ngày: đổ bỏ các lô đã hết hạn. Trả về tổng giá vốn bị hỏng
  spoilExpiredStock() {
    this.reconcileBatches();
    const eco = this.state.eco;
    const today = this.state.day;
    let cost = 0;
    const wasted = [];
    this.getStockEntries().forEach(({ item }) => {
      const life = this.getShelfLife(item);
      if (life === null) return;
      const list = eco.batches[item.id] || [];
      const keep = [];
      list.forEach(b => {
        if (today - b.day >= life - 1 && b.qty > 0) {
          item.stock = Math.max(0, (item.stock || 0) - b.qty);
          cost += b.qty * (b.unit || item.unitCost);
          wasted.push(`${b.qty} ${item.name}`);
        } else if (b.qty > 0) {
          keep.push(b);
        }
      });
      eco.batches[item.id] = keep;
    });
    this.state.todayWasteCost = round1(cost);
    this.state.todayWasteList = wasted;
    return { cost: round1(cost), wasted };
  },

  marketBuy(itemId, amount) {
    const hit = this.findStockItem(itemId);
    if (!hit) return false;
    const item = hit.item;
    if (item.unlocked === false) {
      GameUIModal.showToast(`Món "${item.name}" chưa được mở khóa trong Menu! Hãy qua tab Menu mở khóa trước khi nhập hàng nhé!`, "warning", "🔒");
      return false;
    }
    const m = this.ensureMarket();
    this.reconcileBatches();
    const left = m.supply[item.id] || 0;
    if (left <= 0) {
      GameUIModal.showToast(`Chợ đã bán hết ${item.name} hôm nay, mai ghé lại nhé!`, "warning", "🏪");
      return false;
    }
    const qty = Math.min(amount, left);
    const unit = round1(this.getMarketPrice(item) * this.getBulkDiscount(qty) * 100) / 100;
    const cost = round1(unit * qty);
    if (this.state.money < cost) {
      GameUIModal.showToast(`Không đủ tiền! Mua ${qty} ${item.name} cần ${txaformat.formatVND(cost)}.`, "warning", "🪙");
      return false;
    }
    this.state.money -= cost;
    item.stock += qty;
    m.supply[item.id] = left - qty;
    const list = this.state.eco.batches[item.id] || (this.state.eco.batches[item.id] = []);
    list.push({ qty, day: this.state.day, unit });
    this.state.todaySupplySpent = (this.state.todaySupplySpent || 0) + cost;
    this.sound.playCoinChime();

    const notes = [];
    if (qty < amount) notes.push(`chợ chỉ còn ${qty} phần`);
    if (this.getBulkDiscount(qty) < 1) notes.push(`sỉ −${Math.round((1 - this.getBulkDiscount(qty)) * 100)}%`);
    if (this.state.staff.fawn) notes.push("🦌 Fawn −15%");
    GameUIModal.showToast(`Đã mua +${qty} ${item.name} (−${txaformat.formatVND(cost)}${notes.length ? ` · ${notes.join(", ")}` : ""})`, "success", item.icon);

    if (itemId === "mi_soi" && !this.state.tutorialDismissed) this.state.tutorialDismissed = true;
    return true;
  },

  // Chợ chỉ nhận lại hàng mua trong ngày (hoàn 80% giá đã trả)
  marketReturn(itemId, qty) {
    const hit = this.findStockItem(itemId);
    if (!hit) return false;
    const item = hit.item;
    this.reconcileBatches();
    const list = this.state.eco.batches[item.id] || [];
    const today = this.state.day;
    const freshQty = list.filter(b => b.day === today).reduce((s, b) => s + b.qty, 0);
    if (item.stock < qty) {
      GameUIModal.showToast(`Trong kho chỉ còn ${item.stock} phần thôi!`, "warning", "⚠️");
      return false;
    }
    if (freshQty < qty) {
      GameUIModal.showToast(`Chợ chỉ nhận lại hàng mới mua hôm nay (còn ${freshQty} phần). Hàng đã qua đêm không trả được!`, "warning", "🏪");
      return false;
    }
    let need = qty;
    let refund = 0;
    for (let i = list.length - 1; i >= 0 && need > 0; i--) {
      const b = list[i];
      if (b.day !== today) continue;
      const d = Math.min(b.qty, need);
      b.qty -= d;
      need -= d;
      refund += d * (b.unit || item.unitCost) * 0.8;
      if (b.qty <= 0) list.splice(i, 1);
    }
    refund = round1(refund);
    item.stock -= qty;
    this.state.money += refund;
    this.state.todaySupplySpent = Math.max(0, (this.state.todaySupplySpent || 0) - refund);
    const m = this.ensureMarket();
    m.supply[item.id] = (m.supply[item.id] || 0) + qty;
    this.sound.playButtonClick();
    GameUIModal.showToast(`Đã trả lại chợ ${qty} ${item.name} (+${txaformat.formatVND(refund)})`, "info", "↩️");
    return true;
  },

  adjustStock(itemId, amount) {
    const ok = amount > 0 ? this.marketBuy(itemId, amount) : this.marketReturn(itemId, Math.abs(amount));
    if (!ok) {
      this.renderKhoTab();
      return;
    }
    this.saveGame();
    this.renderHeader();
    this.renderKhoTab();
    this.renderBottomActionBar();
  },

  renderMarketBanner() {
    const el = document.getElementById("kho-market-banner");
    if (!el) return;
    const m = this.ensureMarket();
    const expiring = this.getStockEntries()
      .filter(({ item }) => item.stock > 0 && this.getShelfInfo(item).cls === "danger")
      .map(({ item }) => `${item.icon} ${item.name}`);
    el.innerHTML = `
      <div class="storage-banner-icon-box">🏪</div>
      <div class="storage-banner-body">
        <div class="storage-banner-title">
          <span>Chợ Nguyên Liệu · Ngày ${this.state.day}</span>
          <span class="storage-banner-pill">${m.event ? "Biến động giá" : "Giá ổn định"}</span>
        </div>
        <div class="storage-banner-desc">
          ${m.event ? `<strong>${m.event}.</strong> ` : ""}Giá đổi mỗi ngày, chợ chỉ bán số lượng có hạn, nhập sỉ từ 10 phần giảm 5%, từ 20 phần giảm 10%.
          Hàng tươi có hạn dùng riêng, để quá hạn là phải đổ bỏ (nâng cấp Tủ đông để kéo dài).
          ${expiring.length ? `<br><strong class="mk-danger">⚠️ Sắp hỏng hôm nay: ${expiring.join(", ")}. Dùng gấp hoặc chịu mất!</strong>` : ""}
        </div>
      </div>`;
  },

  renderKhoTab() {
    const noodleList = document.getElementById("kho-noodle-list");
    const topList = document.getElementById("kho-topping-list");
    const tutorialBox = document.getElementById("tutorial-tooltip-kho");
    if (tutorialBox) tutorialBox.style.display = this.state.tutorialDismissed ? "none" : "flex";

    const m = this.ensureMarket();
    this.reconcileBatches();
    this.renderMarketBanner();

    const spentEl = document.getElementById("kho-subtotal-spent");
    const walletEl = document.getElementById("kho-subtotal-wallet");
    if (spentEl) spentEl.textContent = txaformat.formatVND(this.state.todaySupplySpent || 0);
    if (walletEl) walletEl.textContent = txaformat.formatVND(this.state.money);

    const renderCard = item => {
      const isLocked = item.unlocked === false;
      const isOutOfStock = (item.stock || 0) <= 0;
      const isTutorialTarget = !this.state.tutorialDismissed && item.id === "mi_soi";
      const price = this.getMarketPrice(item);
      const baseRef = round1(item.unitCost * (this.state.staff.fawn ? 0.85 : 1));
      const pct = baseRef > 0 ? Math.round((price / baseRef - 1) * 100) : 0;
      const trend = pct === 0 ? "" : `<span class="mk-trend ${pct > 0 ? "up" : "down"}">${pct > 0 ? "▲" : "▼"}${Math.abs(pct)}%</span>`;
      const supplyLeft = m.supply[item.id] || 0;
      const shelf = this.getShelfInfo(item);

      let badgeHtml;
      if (isLocked) badgeHtml = `<span class="kho-badge locked-badge">🔒 CHƯA MỞ MENU</span>`;
      else if (isOutOfStock) badgeHtml = `<span class="kho-badge out-of-stock">⚠️ HẾT HÀNG</span>`;
      else badgeHtml = `<span class="kho-badge in-stock">Còn ${item.stock} phần</span>`;

      return `
        <div class="kho-card ${isLocked ? "card-locked" : ""} ${isOutOfStock && !isLocked ? "card-out-of-stock" : ""}" data-item-id="${item.id}">
          <div class="kho-card-badge-wrap">${badgeHtml}</div>
          <div class="kho-card-icon-box">
            <span class="kho-card-icon">${item.icon}</span>
            ${isLocked ? `<span class="card-lock-overlay-icon">🔒</span>` : ""}
          </div>
          <div class="kho-card-info">
            <h4 class="kho-card-name" title="${item.name}">${item.name}</h4>
            <div class="kho-card-price ${isLocked ? "text-muted" : ""}">
              ${isLocked ? `Chưa mở bán` : `${txaformat.formatVND(price)} <span class="unit-text">/phần</span> ${trend}`}
            </div>
            ${isLocked ? "" : `
              <span class="kho-card-shelf-life mk-life is-${shelf.cls}">${shelf.cls === "ok" && shelf.daysLeft === null && shelf.text === "Không hỏng" ? "♾️ " : "⏳ "}${shelf.text}</span>
              <span class="mk-supply ${supplyLeft <= 0 ? "is-empty" : ""}">🏪 Chợ còn ${supplyLeft}</span>`}
          </div>
          ${isLocked ? `
            <div class="kho-locked-action-wrap">
              ${item.stock > 0 ? `
                <div class="kho-locked-refund-row">
                  <span class="locked-stock-note">Còn ${item.stock}</span>
                  <button class="btn-stepper-action btn-minus" onclick="window.game.adjustStock('${item.id}', -1)" title="Trả lại chợ (chỉ hàng mua hôm nay)">−</button>
                </div>` : ""}
              <button class="btn-goto-menu-unlock" onclick="window.game.switchTab('tab-menu')" title="Chuyển tới Tab Menu để mở khóa món này">🔓 Mở Trong Menu</button>
            </div>
          ` : `
            <div class="kho-stepper-control">
              <button class="btn-stepper-action btn-minus ${isOutOfStock ? "disabled" : ""}" ${isOutOfStock ? "disabled" : ""} onclick="window.game.adjustStock('${item.id}', -1)" title="Trả lại 1 phần (chỉ hàng mua hôm nay)">−</button>
              <div class="kho-stepper-stock-val">${item.stock}</div>
              <button class="btn-stepper-action btn-plus ${isTutorialTarget ? "highlight-glow" : ""}" onclick="window.game.adjustStock('${item.id}', 1)" title="Mua thêm 1 phần">+</button>
            </div>
            <div class="kho-quick-chips">
              <button class="btn-chip-qty" onclick="window.game.adjustStock('${item.id}', 5)" title="Mua +5 phần">+5</button>
              <button class="btn-chip-qty" onclick="window.game.adjustStock('${item.id}', 10)" title="Mua +10 phần (sỉ −5%)">+10</button>
              <button class="btn-chip-qty" onclick="window.game.adjustStock('${item.id}', 20)" title="Mua +20 phần (sỉ −10%)">+20</button>
            </div>
          `}
        </div>`;
    };

    if (noodleList) noodleList.innerHTML = [...Object.values(this.state.supplies), ...Object.values(this.state.noodles)].map(renderCard).join("");
    if (topList) topList.innerHTML = Object.values(this.state.toppings).map(renderCard).join("");
  }
};
