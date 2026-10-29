// ==========================================================
// MENU TRỢ LỰC CHỦ QUÁN (ADMIN / MOD) - cập nhật cho v2.3
// Danh sách nút nhóm theo hệ thống: tài chính, chợ & kho, nhân sự, giao hàng & offline, tiến trình.
// Mọi lệnh đều đi qua đúng các hệ thống thật (chợ, nhân sự, vay vốn, đơn online) để dùng thử nhanh các tính năng mới.
// ==========================================================
import { GameUIModal } from "./modal.js?v=2.3.4";
import { STAFF_ROSTER } from "./hr.js?v=2.3.4";

const DEV_SECTIONS = [
  {
    title: "💰 Tài chính & Ngân hàng",
    items: [
      { id: "money_50m", icon: "💰", title: "+50.000k Tiền Vàng", sub: "+50 triệu vào két sắt" },
      { id: "money_500m", icon: "💎", title: "+500.000k Tiền Vàng", sub: "+500 triệu, tài chính vô hạn" },
      { id: "bank_100m", icon: "🏦", title: "+100.000k Vào Ngân Hàng", sub: "Gửi tiết kiệm sinh lãi" },
      { id: "credit_max", icon: "💳", title: "Tín Dụng 850 & Mở Chặn Vay", sub: "Hạn mức vay cao nhất, xóa nợ xấu" },
      { id: "clear_loan", icon: "🧾", title: "Xóa Khoản Vay Hiện Tại", sub: "Coi như đã tất toán, không phạt" },
      { id: "pay_debts", icon: "📑", title: "Xóa Nợ Hóa Đơn & Thuế", sub: "Về 0 nợ điện nước, lương, thuế tạm tính" },
      { id: "force_debt", icon: "🚨", title: "Thử Vỡ Nợ", sub: "Ví về 0 và nợ hóa đơn 400k để test phạt" }
    ]
  },
  {
    title: "🏪 Chợ nguyên liệu & Kho",
    items: [
      { id: "stock_full", icon: "📦", title: "Bơm Đầy Kho (+99)", sub: "Mì, topping, trà sữa và nguyên liệu phụ" },
      { id: "market_reroll", icon: "🔄", title: "Làm Mới Giá Chợ", sub: "Đổi giá hôm nay và đầy lại hàng chợ" },
      { id: "market_spike", icon: "📈", title: "Bão Giá +40%", sub: "Toàn chợ đắt lên để thử mua dè sẻn" },
      { id: "market_sale", icon: "🏷️", title: "Chợ Xả Hàng −25%", sub: "Giá rẻ để thử nhập sỉ số lượng lớn" },
      { id: "age_stock", icon: "🗑️", title: "Cho Hàng Cũ Hết Hạn", sub: "Mọi lô hàng sắp hỏng, thử đổ bỏ cuối ngày" }
    ]
  },
  {
    title: "👥 Nhân sự",
    items: [
      { id: "hire_all_staff", icon: "👥", title: "Thuê Toàn Bộ 11 Nhân Viên", sub: "Tay nghề 4★, vào làm chính thức" },
      { id: "morale_max", icon: "😄", title: "Tâm Trạng Cả Đội 100%", sub: "Mọi nhân viên đang hứng khởi" },
      { id: "morale_low", icon: "😞", title: "Cả Đội Chán Đời (12%)", sub: "Thử nhân viên nghỉ việc khi qua ngày / offline" },
      { id: "raise_all", icon: "💬", title: "Mọi Người Xin Tăng Lương", sub: "Hiện đề nghị tăng lương ở tab Nhân Viên" }
    ]
  },
  {
    title: "🛵 Giao hàng & Offline",
    items: [
      { id: "spawn_orders", icon: "🔔", title: "Bắn 3 Đơn Online", sub: "Chỉ khi đang mở bán, gồm cả đơn COD" },
      { id: "fast_orders", icon: "⚡", title: "Tua Nhanh Đơn Đang Làm", sub: "Món chín ngay, tài xế tới ngay" },
      { id: "offline_5h", icon: "🌙", title: "Giả Lập Vắng Mặt 5 Giờ", sub: "Chạy ca offline do nhân viên trông (từ Ngày 30)" }
    ]
  },
  {
    title: "⏱️ Tiến trình & Tiệm",
    items: [
      { id: "reputation_max", icon: "⭐", title: "Danh Tiếng 800⭐", sub: "Đủ điều kiện tuyển toàn bộ nhân sự" },
      { id: "fever_rush", icon: "🔥", title: "Bật Giờ Vàng FEVER RUSH", sub: "x1.5 doanh thu & bão khách" },
      { id: "max_all_upgrades", icon: "🛠️", title: "Max Toàn Bộ 12 Nâng Cấp", sub: "Nâng cấp tối đa cơ ngơi quán mì" },
      { id: "unlock_customers", icon: "👑", title: "Mở Khóa Full Khách Quen", sub: "Sưu tập đủ khách quen & VIP" },
      { id: "clean_tables", icon: "🧹", title: "Lau Sạch Tất Cả Bàn", sub: "Dọn bàn bẩn về trạng thái trống" },
      { id: "skip_day_10", icon: "⏭️", title: "Nhảy Tới Ngày 10", sub: "Vượt giai đoạn tân thủ" },
      { id: "skip_day_30", icon: "🚀", title: "Nhảy Tới Ngày 30", sub: "Mở khóa ca offline treo" },
      { id: "skip_day_50", icon: "🐉", title: "Nhảy Tới Ngày 50", sub: "Đỉnh cao Thần Long Ryu" }
    ]
  }
];

export const DevMenuMethods = {
  renderDevBuffMenu() {
    const body = document.getElementById("dev-buff-body");
    if (!body) return;
    body.innerHTML = `
      <div class="dev-buff-notice">⚡ <em>Lưu ý: Các lệnh trợ lực có hiệu lực ngay và đi qua đúng hệ thống thật của game (chợ, nhân sự, vay vốn, đơn online).</em></div>
      ${DEV_SECTIONS.map(sec => `
        <div class="dev-buff-section-title">${sec.title}</div>
        <div class="dev-buff-grid">
          ${sec.items.map(it => `
            <button class="btn-buff-action" onclick="window.game.devBuff('${it.id}')">
              <span class="buff-btn-icon">${it.icon}</span>
              <div class="buff-btn-content">
                <span class="buff-btn-title">${it.title}</span>
                <span class="buff-btn-sub">${it.sub}</span>
              </div>
            </button>`).join("")}
        </div>`).join("")}`;
  },

  openSecretBuffModal() {
    const modal = document.getElementById("modal-dev-buff");
    if (!modal) return;
    this.renderDevBuffMenu();
    modal.style.display = "flex";
    this.sound.playCoinChime();
    GameUIModal.showToast("👑 Đã mở Bảng Trợ Lực Hệ Thống dành riêng cho Chủ Quán!", "success", "✨");
  },

  devBuff(type) {
    const st = this.state;
    const eco = st.eco;
    const toast = (msg, kind = "success", icon = "✨") => GameUIModal.showToast(msg, kind, icon);

    switch (type) {
      // ----- Tài chính -----
      case "money_50m":
        st.money += 50000;
        st.stats.totalRevenue = (st.stats.totalRevenue || 0) + 50000;
        toast("💰 Đã buff +50.000k (50 triệu VNĐ) vào két sắt!");
        break;
      case "money_500m":
        st.money += 500000;
        st.stats.totalRevenue = (st.stats.totalRevenue || 0) + 500000;
        toast("💎 Đã buff +500.000k (500 triệu VNĐ) tài chính vô hạn!");
        break;
      case "bank_100m":
        st.bank.savings = (st.bank.savings || 0) + 100000;
        this.addBankHistory("deposit", 100000, "👑 Buff Trợ Lực Chủ Quán (+100 triệu VNĐ)");
        toast("🏦 Đã buff +100.000k vào Ngân Hàng Tiết Kiệm!");
        break;
      case "credit_max":
        eco.credit = 850;
        eco.blockedLoanUntil = 0;
        if (eco.loan) eco.loan.missed = 0;
        toast("💳 Điểm tín dụng 850, hồ sơ vay đã được mở chặn!");
        break;
      case "clear_loan":
        if (!eco.loan) { toast("Hiện không có khoản vay nào.", "info", "🧾"); break; }
        eco.loan = null;
        toast("🧾 Đã xóa khoản vay hiện tại.");
        break;
      case "pay_debts":
        eco.billDebt = 0;
        eco.debtDays = 0;
        eco.tax.accrued = 0;
        toast("📑 Đã xóa sạch nợ hóa đơn và thuế tạm tính.");
        break;
      case "force_debt":
        st.money = 0;
        eco.billDebt = 400;
        eco.debtDays = 1;
        toast("🚨 Ví về 0 và nợ hóa đơn 400k. Kết thúc ngày để xem phí chậm trả!", "warning", "🧾");
        break;

      // ----- Chợ & kho -----
      case "stock_full":
        ["noodles", "toppings", "drinks", "supplies"].forEach(group => {
          for (const k in st[group]) st[group][k].stock = Math.max(99, (st[group][k].stock || 0) + 99);
        });
        toast("📦 Kho hàng đã được bơm đầy +99 mì, topping, trà sữa & nguyên liệu phụ!", "success", "📦");
        break;
      case "market_reroll":
        eco.market.day = 0;
        eco.market.factors = {};
        this.ensureMarket();
        toast(`🔄 Đã làm mới chợ${eco.market.event ? `: ${eco.market.event}` : " (giá ổn định)"}.`, "info", "🏪");
        break;
      case "market_spike":
        this.ensureMarket();
        Object.keys(eco.market.factors).forEach(id => { eco.market.factors[id] = Math.min(1.8, Math.round(eco.market.factors[id] * 1.4 * 100) / 100); });
        eco.market.event = "📈 Bão giá: toàn chợ tăng mạnh";
        toast("📈 Giá chợ hôm nay tăng ~40%!", "warning", "🏪");
        break;
      case "market_sale":
        this.ensureMarket();
        Object.keys(eco.market.factors).forEach(id => { eco.market.factors[id] = Math.max(0.7, Math.round(eco.market.factors[id] * 0.75 * 100) / 100); });
        eco.market.event = "🏷️ Chợ xả hàng: toàn chợ giảm giá";
        toast("🏷️ Giá chợ hôm nay giảm ~25%!", "success", "🏪");
        break;
      case "age_stock":
        this.reconcileBatches();
        Object.keys(eco.batches).forEach(id => eco.batches[id].forEach(b => { b.day = st.day - 10; }));
        toast("🗑️ Mọi lô hàng đã quá cũ. Kết thúc ngày để thấy hàng hỏng bị đổ bỏ!", "warning", "🗑️");
        break;

      // ----- Nhân sự -----
      case "hire_all_staff":
        STAFF_ROSTER.forEach(r => {
          st.staff[r.key] = true;
          const info = this.ensureStaffInfo(r.key);
          info.skill = 4;
          info.probation = 0;
          info.morale = 90;
          info.unpaid = 0;
        });
        toast("👥 Đã chiêu mộ toàn bộ 11 nhân viên (tay nghề 4★, vào làm chính thức)!", "success", "🐾");
        break;
      case "morale_max":
        STAFF_ROSTER.forEach(r => { if (st.staff[r.key]) this.ensureStaffInfo(r.key).morale = 100; });
        toast("😄 Cả đội đang hứng khởi tối đa!");
        break;
      case "morale_low":
        STAFF_ROSTER.forEach(r => { if (st.staff[r.key]) this.ensureStaffInfo(r.key).morale = 12; });
        toast("😞 Cả đội đang chán đời (12%). Qua đêm hoặc vắng mặt là có người nghỉ việc!", "warning", "🥺");
        break;
      case "raise_all":
        STAFF_ROSTER.forEach(r => {
          if (!st.staff[r.key]) return;
          const info = this.ensureStaffInfo(r.key);
          info.probation = 0;
          info.raise = 10;
        });
        toast("💬 Mọi nhân viên đang xin tăng lương 10%, xem ở tab Nhân Viên.", "info", "💬");
        break;

      // ----- Giao hàng & offline -----
      case "spawn_orders": {
        if (st.dayPhase !== "open") { toast("Cần mở cửa bán hàng thì mới có đơn online!", "info", "🛵"); break; }
        let n = 0;
        for (let i = 0; i < 60 && n < 3; i++) {
          const before = st.onlineOrders.length;
          this.spawnOnlineOrder();
          if (st.onlineOrders.length > before) n++;
        }
        toast(`🔔 Đã bắn ${n} đơn online mới.`, "info", "🛵");
        break;
      }
      case "fast_orders":
        st.onlineOrders.forEach(o => {
          if (o.stage !== "active") return;
          o.cookLeft = Math.min(o.cookLeft, 1);
          o.etaLeft = Math.min(o.etaLeft, 1);
        });
        toast("⚡ Đơn đang làm sẽ chín và tài xế tới sau 1 giây.", "info", "🛵");
        break;
      case "offline_5h": {
        if (st.dayPhase !== "prep") { toast("Hãy kết thúc ca bán trước khi giả lập vắng mặt!", "info", "🌙"); break; }
        if (!this.getHiredStaffKeys().length) { toast("Cần có ít nhất một nhân viên để trông tiệm hộ!", "warning", "🌙"); break; }
        if (st.day < 30) { toast("Ca offline treo mở từ Ngày 30. Hãy nhảy tới Ngày 30 trước.", "warning", "🌙"); break; }
        const off = this.ensureOfflineState();
        off.capDate = "";
        off.minutesUsedToday = 0;
        st.lastActiveTime = Date.now() - 5 * 60 * 60 * 1000;
        this.checkOfflineEarnings();
        break;
      }

      // ----- Tiến trình -----
      case "reputation_max":
        st.reputation = 800;
        toast("⭐ Danh Tiếng 800⭐, đủ điều kiện tuyển toàn bộ nhân sự!", "success", "👑");
        break;
      case "fever_rush":
        this.feverPoints = 100;
        this.triggerFeverRush();
        toast("🔥 Đã kích hoạt Giờ Vàng FEVER RUSH ngay lập tức!", "success", "🔥");
        break;
      case "max_all_upgrades":
        Object.assign(st.upgrades, {
          tableCount: 8, stoveSpeed: 6, chiliSecret: 5, acCooling: 5, decorScore: 6, freezerStorage: 5,
          lofiAcoustic: 4, autoSealer: 5, dualStove: 5, airPurifier: 5, zenGarden: 5, shichimiSpice: 5
        });
        this.initTables();
        while (st.tables.length < 8) {
          st.tables.push({ id: st.tables.length + 1, status: "empty", customer: null, order: null, patience: 100, maxPatience: 100 });
        }
        toast("🛠️ Đã nâng cấp Max toàn bộ 12 trang thiết bị quán!", "success", "🌟");
        break;
      case "unlock_customers":
        this.customerTemplates.forEach(c => this.unlockCustomer(c, false));
        toast("👑 Đã mở khóa đủ toàn bộ khách quen & VIP trong Bộ sưu tập!", "success", "🎉");
        break;
      case "clean_tables":
        st.tables.forEach(t => { t.status = "empty"; t.customer = null; t.order = null; });
        toast("✨ Đã lau dọn sạch bóng toàn bộ bàn ghế trong tiệm!", "success", "🧹");
        break;
      case "skip_day_10":
      case "skip_day_30":
      case "skip_day_50": {
        st.day = Number(type.split("_")[2]);
        toast(`⏭️ Đã tua nhanh thời gian tới Ngày ${st.day}!`, "info", "📅");
        break;
      }
    }

    this.sound.playCoinChime();
    this.saveGame();
    this.renderAll();
    if (st.dayPhase === "open") {
      this.renderOpenMode();
      this.renderDiningStage();
      this.renderStaffKitchenBar();
    }
  }
};
