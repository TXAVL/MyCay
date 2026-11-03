// ==========================================================
// ĐẶT NGUYÊN LIỆU ONLINE (issue #9 - tiệm làm người mua, như sàn "Sọp pi" trong ảnh demo)
// - Rẻ hơn mua tại chợ nhưng phải chờ giao: Hỏa tốc (~2 giờ, mất phí) hoặc Tiết kiệm (sáng hôm sau)
// - Mỗi đơn có mã đơn, mã vận đơn, bưu tá, dòng thời gian: đặt → người bán đóng gói → rời kho phân loại → giao tới tiệm
// - Có thể giao dập / thiếu hàng; mua bảo hiểm thì được hoàn tiền phần hỏng
// - Hàng tới mới vào kho và mới bắt đầu tính hạn dùng; nút "Mua lại" đặt lại đúng giỏ cũ
// ==========================================================
import { GameUIModal } from "./modal.js?v=2.5.0";
import { txaformat } from "./txaformat.js?v=2.5.0";
import { timelineHtml, driverCardHtml, makeWaybill } from "./shipping.js?v=2.5.0";

const ONLINE_DISCOUNT = 0.92; // giá đặt online rẻ hơn giá chợ 8%
const SHIP_METHODS = {
  express: { label: "Hỏa tốc 2H", fee: 15, realSeconds: 90, desc: "Giao trong khoảng 2 giờ (~90 giây thật)" },
  saving: { label: "Tiết kiệm", fee: 5, freeFrom: 150, desc: "Giao sáng hôm sau, miễn phí từ 150k" }
};
const INSURANCE_RATE = 0.02;
const DAMAGE_CHANCE = 0.08;
const MAX_QTY = 200;
const KEEP_ORDERS = 15;
const COURIERS = [
  { name: "Trần Minh Shipper", vehicle: "Honda Wave Alpha (59-P2 456.78)" },
  { name: "Lê Hoàng Bưu Tá", vehicle: "Yamaha Sirius (29-B1 882.10)" },
  { name: "Nguyễn Thu Giao Hàng", vehicle: "VinFast Evo 200 (51-G3 120.45)" },
  { name: "Phạm Quốc Express", vehicle: "Honda Future 125 (43-C1 667.29)" }
];

const round1 = v => Math.round(v * 10) / 10;
const money = v => txaformat.formatVND(v);

export const SupplierMethods = {
  ensureSupply() {
    const eco = this.state.eco;
    if (!eco.supply || typeof eco.supply !== "object") eco.supply = { seq: 9100, orders: [] };
    if (!Array.isArray(eco.supply.orders)) eco.supply.orders = [];
    return eco.supply;
  },

  getOnlineSupplyPrice(item) {
    return round1(this.getMarketPrice(item) * ONLINE_DISCOUNT);
  },

  // ---------- Giỏ hàng & màn đặt hàng ----------
  openSupplyShop(prefill = null) {
    this.supplyCart = prefill ? Object.assign({}, prefill) : (this.supplyCart || {});
    this.supplyMethod = this.supplyMethod || "saving";
    this.supplyInsured = Boolean(this.supplyInsured);
    this.renderSupplyShop();
  },

  supplyCartAdd(itemId, delta) {
    const cart = this.supplyCart || (this.supplyCart = {});
    cart[itemId] = Math.max(0, Math.min(MAX_QTY, (cart[itemId] || 0) + delta));
    if (!cart[itemId]) delete cart[itemId];
    this.renderSupplyShop();
  },

  setSupplyMethod(m) {
    this.supplyMethod = m;
    this.renderSupplyShop();
  },

  toggleSupplyInsurance() {
    this.supplyInsured = !this.supplyInsured;
    this.renderSupplyShop();
  },

  getSupplyQuote() {
    const cart = this.supplyCart || {};
    const lines = Object.entries(cart).map(([id, qty]) => {
      const hit = this.findStockItem(id);
      if (!hit || qty <= 0) return null;
      const unit = round1(this.getOnlineSupplyPrice(hit.item) * this.getBulkDiscount(qty) * 100) / 100;
      return { id, name: hit.item.name, icon: hit.item.icon, qty, unit, total: round1(unit * qty) };
    }).filter(Boolean);
    const subtotal = round1(lines.reduce((s, l) => s + l.total, 0));
    const m = SHIP_METHODS[this.supplyMethod] || SHIP_METHODS.saving;
    const shipFee = m.freeFrom && subtotal >= m.freeFrom ? 0 : m.fee;
    const insurance = this.supplyInsured && subtotal > 0 ? Math.max(2, round1(subtotal * INSURANCE_RATE)) : 0;
    return { lines, subtotal, shipFee, insurance, total: round1(subtotal + shipFee + insurance) };
  },

  renderSupplyShop() {
    let overlay = document.getElementById("supply-shop-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "supply-shop-overlay";
      overlay.className = "kpi-overlay";
      document.body.appendChild(overlay);
    }
    const scrollTop = overlay.querySelector(".sup-list") ? overlay.querySelector(".sup-list").scrollTop : 0;
    const items = this.getStockEntries().filter(({ item }) => item.unlocked !== false);
    const cart = this.supplyCart || {};
    const q = this.getSupplyQuote();
    const method = this.supplyMethod || "saving";
    overlay.innerHTML = `
      <div class="kpi-card sup-card">
        <div class="sup-top">
          <div><b>🛒 Chợ Sỉ Online</b><div class="sup-sub">Rẻ hơn chợ 8%, giao tận tiệm · Ví tiệm: <b>${money(this.state.money)}</b></div></div>
          <button class="shp-btn" onclick="window.game.closeSupplyShop()">✕</button>
        </div>
        <div class="sup-list">
          ${items.map(({ item }) => {
            const qty = cart[item.id] || 0;
            return `
              <div class="sup-row ${qty ? "is-picked" : ""}">
                <span class="sup-icon">${item.icon}</span>
                <span class="sup-name">${item.name}<small>${money(this.getOnlineSupplyPrice(item))}/phần · kho còn ${item.stock}</small></span>
                <span class="sup-qty">
                  <button class="shp-btn" onclick="window.game.supplyCartAdd('${item.id}', -5)">−5</button>
                  <b>${qty}</b>
                  <button class="shp-btn" onclick="window.game.supplyCartAdd('${item.id}', 5)">+5</button>
                  <button class="shp-btn" onclick="window.game.supplyCartAdd('${item.id}', 20)">+20</button>
                </span>
              </div>`;
          }).join("")}
        </div>
        <div class="sup-ship">
          ${Object.entries(SHIP_METHODS).map(([id, m]) => `
            <button class="sup-method ${method === id ? "is-active" : ""}" onclick="window.game.setSupplyMethod('${id}')">
              <b>${id === "express" ? "🚀" : "🚚"} ${m.label}</b><small>${m.desc} · phí ${m.fee}k</small>
            </button>`).join("")}
        </div>
        <label class="sup-insure"><input type="checkbox" ${this.supplyInsured ? "checked" : ""} onchange="window.game.toggleSupplyInsurance()"> 🛡️ Bảo hiểm hàng hóa (${INSURANCE_RATE * 100}%): giao dập / thiếu được hoàn tiền phần hỏng</label>
        <div class="sup-sum">
          <span>Tiền hàng ${money(q.subtotal)} · Phí giao ${money(q.shipFee)}${q.insurance ? ` · Bảo hiểm ${money(q.insurance)}` : ""}</span>
          <b>Tổng: ${money(q.total)}</b>
        </div>
        <div class="kpi-actions">
          <button class="kpi-btn kpi-btn-pay" ${q.lines.length ? "" : "disabled"} onclick="window.game.placeSupplyOrder()">${q.lines.length ? `Đặt hàng (−${money(q.total)})` : "Chọn hàng vào giỏ trước"}</button>
        </div>
      </div>`;
    const list = overlay.querySelector(".sup-list");
    if (list) list.scrollTop = scrollTop;
  },

  closeSupplyShop() {
    const el = document.getElementById("supply-shop-overlay");
    if (el) el.remove();
  },

  placeSupplyOrder() {
    const q = this.getSupplyQuote();
    if (!q.lines.length) return;
    if (this.state.money < q.total) {
      GameUIModal.showToast(`Ví không đủ tiền! Đơn này cần ${money(q.total)}.`, "warning", "🪙");
      return;
    }
    const sup = this.ensureSupply();
    const method = this.supplyMethod || "saving";
    const m = SHIP_METHODS[method];
    this.state.money = round1(this.state.money - q.total);
    this.state.todaySupplySpent = (this.state.todaySupplySpent || 0) + q.total;
    const order = {
      id: ++sup.seq,
      waybill: makeWaybill("MCVN"),
      method,
      lines: q.lines,
      subtotal: q.subtotal,
      shipFee: q.shipFee,
      insurance: q.insurance,
      insured: q.insurance > 0,
      total: q.total,
      status: "ordered",
      placedAt: Date.now(),
      dueAt: method === "express" ? Date.now() + m.realSeconds * 1000 : null,
      dueDay: method === "saving" ? this.state.day + 1 : null,
      day: this.state.day,
      courier: COURIERS[Math.floor(Math.random() * COURIERS.length)],
      timeline: [],
      damaged: [],
      refund: 0,
      pod: null
    };
    this.logShip(order, "🛒", `Đơn hàng đã được đặt thành công (Ví tiệm). Gói ${m.label}: ${method === "express" ? "dự kiến giao trong 2 giờ" : "dự kiến giao sáng mai"}.`);
    sup.orders.unshift(order);
    if (sup.orders.length > KEEP_ORDERS) sup.orders.length = KEEP_ORDERS;
    this.supplyCart = {};
    this.closeSupplyShop();
    this.sound.playCoinChime();
    GameUIModal.showToast(`🛒 Đã đặt đơn #${order.id} (${m.label}). Theo dõi ở mục "Đơn nhập hàng" trong tab Kho.`, "success", "📦");
    this.saveGame();
    this.renderHeader();
    this.renderKhoTab();
  },

  // ---------- Tiến trình giao (hỏa tốc chạy theo thời gian thật, tiết kiệm tới sáng hôm sau) ----------
  tickSupplyOrders() {
    const sup = this.ensureSupply();
    let changed = false;
    sup.orders.forEach(o => {
      if (o.status === "delivered") return;
      if (o.method === "express") {
        const total = SHIP_METHODS.express.realSeconds * 1000;
        const progress = Math.min(1, (Date.now() - o.placedAt) / total);
        changed = this.advanceSupplyOrder(o, progress) || changed;
      }
    });
    if (changed) {
      this.saveGame();
      this.renderSupplyOrders();
    }
  },

  // Sang ngày mới: các đơn tiết kiệm của hôm trước tới tiệm
  deliverSavingOrders() {
    const sup = this.ensureSupply();
    let changed = false;
    sup.orders.forEach(o => {
      if (o.status !== "delivered" && o.method === "saving" && this.state.day >= o.dueDay) {
        changed = this.advanceSupplyOrder(o, 1) || changed;
      }
    });
    if (changed) this.saveGame();
  },

  advanceSupplyOrder(o, progress) {
    let changed = false;
    // Gói tiết kiệm chạy qua đêm: người bán đóng gói tối hôm trước, xe rời kho lúc rạng sáng
    const overnight = o.method === "saving";
    if (progress >= 0.15 && o.status === "ordered") {
      o.status = "packed";
      this.logShip(o, "📦", "Người bán đã xác nhận đơn & đóng gói chống sốc xong, đang bàn giao cho bưu cục.", "", overnight ? "21:30" : null);
      changed = true;
    }
    if (progress >= 0.45 && o.status === "packed") {
      o.status = "shipping";
      this.logShip(o, "🚚", `Đơn hàng đã rời Kho Phân Loại Tổng (SOC). Bưu tá ${o.courier.name} đang giao tới tiệm.`, "", overnight ? "05:40" : null);
      changed = true;
    }
    if (progress >= 1 && o.status === "shipping") {
      this.receiveSupplyOrder(o);
      changed = true;
    }
    return changed;
  },

  receiveSupplyOrder(o) {
    o.status = "delivered";
    // Đôi khi hàng bị dập / giao thiếu một phần
    if (Math.random() < DAMAGE_CHANCE && o.lines.length) {
      const line = o.lines[Math.floor(Math.random() * o.lines.length)];
      const lost = Math.max(1, Math.round(line.qty * (0.1 + Math.random() * 0.2)));
      o.damaged.push({ id: line.id, name: line.name, qty: lost, unit: line.unit });
    }
    const today = this.state.day;
    o.lines.forEach(line => {
      const hit = this.findStockItem(line.id);
      if (!hit) return;
      const bad = o.damaged.filter(d => d.id === line.id).reduce((s, d) => s + d.qty, 0);
      const good = Math.max(0, line.qty - bad);
      if (good <= 0) return;
      hit.item.stock += good;
      const batches = this.state.eco.batches[line.id] || (this.state.eco.batches[line.id] = []);
      batches.push({ qty: good, day: today, unit: line.unit });
    });
    let tail = "";
    if (o.damaged.length) {
      const lostValue = round1(o.damaged.reduce((s, d) => s + d.qty * d.unit, 0));
      const list = o.damaged.map(d => `${d.qty} ${d.name}`).join(", ");
      if (o.insured) {
        o.refund = lostValue;
        this.state.money = round1(this.state.money + lostValue);
        tail = ` Hàng bị dập ${list}, bảo hiểm hoàn ${money(lostValue)}.`;
      } else {
        tail = ` Hàng bị dập ${list} (không mua bảo hiểm nên mất ${money(lostValue)}).`;
      }
    }
    o.pod = {
      code: o.waybill,
      failed: false,
      color: "#EE4D2D",
      houseNo: 18,
      stamp: `Ngày ${today} ${this.getGameClock()}`,
      driver: o.courier.name,
      caption: `Bưu tá ${o.courier.name} đã giao thùng hàng tới quầy ${this.state.shopName || "Tiệm Mỳ Cay"}.`
    };
    this.logShip(o, "📸", `Giao hàng thành công tại ${this.state.shopName || "Tiệm Mỳ Cay"}! Bưu tá ${o.courier.name} đã tải lên ảnh POD xác nhận.${tail}`, o.damaged.length ? "warn" : "ok");
    this.sound.playDoorBell();
    GameUIModal.showToast(`📦 Đơn nhập hàng #${o.id} đã tới tiệm, hàng đã vào kho.${tail}`, o.damaged.length ? "warning" : "success", "🚚", 3500);
    this.renderHeader();
    this.renderKhoTab();
  },

  // Mua lại: mở giỏ hàng với đúng số lượng của đơn cũ, giá theo chợ hôm nay
  reorderSupply(id) {
    const o = this.ensureSupply().orders.find(x => x.id === Number(id));
    if (!o) return;
    const cart = {};
    o.lines.forEach(l => { if (this.findStockItem(l.id)) cart[l.id] = l.qty; });
    this.supplyMethod = o.method;
    this.supplyInsured = o.insured;
    this.openSupplyShop(cart);
  },

  showSupplyPod(id) {
    const o = this.ensureSupply().orders.find(x => x.id === Number(id));
    if (o && o.pod) this.showPod(o.pod);
  },

  callCourier(id) {
    const o = this.ensureSupply().orders.find(x => x.id === Number(id));
    if (!o || o.status === "delivered") return;
    const text = o.status === "shipping"
      ? `Bưu tá ${o.courier.name}: "Em đang trên đường, sắp tới tiệm rồi ạ!"`
      : `Bưu tá ${o.courier.name}: "Hàng còn ở kho, em lấy xong sẽ giao ngay ạ."`;
    this.logShip(o, "📞", `Gọi bưu tá: ${text}`);
    GameUIModal.showToast(`📞 ${text}`, "info", "📞");
    this.renderSupplyOrders();
  },

  // ---------- Danh sách "Đơn nhập hàng" trong tab Kho ----------
  renderSupplyOrders() {
    const el = document.getElementById("kho-supply-orders");
    if (!el) return;
    const orders = this.ensureSupply().orders;
    const statusText = {
      ordered: ["🕐 Chờ người bán xác nhận", "warn"],
      packed: ["📦 Đã đóng gói, chờ bưu cục lấy", "warn"],
      shipping: ["🚚 Đang giao tới tiệm", "warn"],
      delivered: ["✅ Giao hàng thành công & đã nhập kho", "ok"]
    };
    el.innerHTML = `
      <div class="category-header-wrap">
        <h3 class="category-heading">📦 Đơn Nhập Hàng Online</h3>
        <button class="shp-btn shp-btn-primary" onclick="window.game.openSupplyShop()">🛒 Đặt hàng online</button>
      </div>
      ${orders.length ? orders.map(o => {
        const [st, tone] = statusText[o.status] || statusText.ordered;
        const m = SHIP_METHODS[o.method] || SHIP_METHODS.saving;
        return `
          <div class="shp-card">
            <div class="shp-head">
              <b>Mã đơn: #SP${o.id}</b>
              <span class="shp-tag">${o.method === "express" ? "🚀" : "🚚"} ${m.label}</span>
              <span class="shp-day">Ngày ${o.day}</span>
            </div>
            <div class="shp-status is-${tone}">${st}</div>
            <div class="shp-meta">Mã vận đơn: <b>${o.waybill}</b> · Thanh toán: <b>Ví tiệm</b>${o.insured ? " · 🛡️ Có bảo hiểm" : ""}</div>
            <div class="shp-items">${o.lines.map(l => `<span>${l.icon} ${l.name} <b>x${l.qty}</b></span>`).join("")}</div>
            ${o.status === "ordered" ? "" : driverCardHtml(o.courier, {
              title: "Bưu tá",
              callAction: o.status === "delivered" ? "" : `window.game.callCourier(${o.id})`,
              podAction: o.pod ? `window.game.showSupplyPod(${o.id})` : ""
            })}
            ${timelineHtml(o.timeline)}
            <div class="shp-foot">
              <span>Thành tiền: <b class="shp-money">${money(o.total)}</b>${o.refund ? ` · hoàn ${money(o.refund)}` : ""}</span>
              <button class="shp-btn" onclick="window.game.reorderSupply(${o.id})">🛒 Mua lại</button>
            </div>
          </div>`;
      }).join("") : `<div class="dlv-empty">Chưa có đơn nhập hàng nào. Đặt online rẻ hơn mua tại chợ 8%, nhưng phải chờ giao.</div>`}`;
  }
};
