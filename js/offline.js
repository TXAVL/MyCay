// ==========================================================
// CA BÁN OFFLINE DO NHÂN VIÊN TRÔNG TIỆM (v2.3.0)
// Khi chủ tiệm vắng mặt (đóng trình duyệt hoặc ẩn tab từ 3 phút), chính các nhân viên đã thuê mở cửa bán thay.
// - Không có nhân viên thì không ai mở cửa
// - Công suất theo từng người: đầu bếp Kenji là then chốt, tay nghề & tâm trạng ảnh hưởng tốc độ
// - Làm thêm giờ được trả lương theo giờ, thiếu tiền thì ghi nợ và nhân viên chán thêm
// - Mỗi giờ trông tiệm một mình, tâm trạng tụt dần; chán đời quá sẽ nghỉ việc ngay giữa ca
// - Doanh thu offline cũng chịu thuế, điện nước, hao kho như ca thường
// ==========================================================
import { txaformat } from "./txaformat.js?v=2.3.4";
import { STAFF_ROSTER } from "./hr.js?v=2.3.4";

export const OFFLINE_UNLOCK_DAY = 30; // từ Ngày 30 mới mở được ca treo offline
export const OFFLINE_DAILY_CAP_MIN = 480; // tối đa 8 giờ bán offline mỗi ngày thực tế
export const OFFLINE_MIN_MINUTES = 3;
const OFFLINE_EFFICIENCY = 0.6;
export const BOWL_SUPPLIES = ["mi_soi", "nuoc_ham", "nieu_dat"];
export const DRINK_SUPPLIES = ["tra_den", "sua_tuoi_nguyenkem"];

// Số tô/giờ mỗi nhân viên góp thêm khi đang trông tiệm
const ROLE_RATE = { kenji: 10, usagi: 5, mochi: 3, ryu: 3, shiba: 2, shiro: 2, tora: 1 };
const MORALE_QUIT = 10;

const esc = str => String(str == null ? "" : str).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const round1 = v => Math.round(v * 10) / 10;
const rosterOf = key => STAFF_ROSTER.find(s => s.key === key);

export function emptyOfflineResult(extra = {}) {
  return Object.assign({
    capacity: 0, openMinutes: 0, bowls: 0, drinks: 0, revenue: 0, tips: 0, utilities: 0, wages: 0, tax: 0, netProfit: 0,
    soldNoodles: {}, soldDrinks: {}, stopReason: "", crew: [], quits: [], noStaff: false
  }, extra);
}

export const OfflineMethods = {
  getHiredStaffKeys() {
    return STAFF_ROSTER.map(r => r.key).filter(k => this.state.staff[k]);
  },

  // Mô phỏng từng giờ vắng mặt: nhân viên bán hàng, mệt dần, có người có thể nghỉ việc giữa chừng
  simulateOfflineSales(minutes) {
    const st = this.state;
    const startKeys = this.getHiredStaffKeys();
    if (!startKeys.length) return emptyOfflineResult({ noStaff: true, stopReason: "Tiệm không có nhân viên nên không ai mở cửa" });

    const crew = startKeys.map(key => {
      const r = rosterOf(key);
      return { key, name: r.name, icon: r.icon, moraleBefore: Math.round(this.ensureStaffInfo(key).morale), moraleAfter: 0, quit: false };
    });
    const quits = [];
    const tables = (st.upgrades && st.upgrades.tableCount) || 3;
    const repFactor = 0.8 + Math.min(1000, Math.max(0, st.reputation || 0)) / 2000;

    const menuNoodles = Object.values(st.noodles).filter(n => n.unlocked && n.inMenu);
    const menuDrinks = Object.values(st.drinks).filter(d => d.unlocked && d.inMenu);
    const supplyOk = ids => ids.every(id => !st.supplies[id] || st.supplies[id].stock > 0);

    const soldNoodles = {};
    const soldDrinks = {};
    let bowls = 0;
    let drinks = 0;
    let revenue = 0;
    let drinkAcc = 0;
    let carry = 0;
    let capacity = 0;
    let openMinutes = 0;
    let wages = 0;
    let stopReason = "";

    let remaining = minutes;
    let hour = 0;
    while (remaining > 0 && !stopReason) {
      const m = Math.min(60, remaining);
      remaining -= m;
      hour += 1;

      const active = this.getHiredStaffKeys();
      if (!active.length) {
        stopReason = "Toàn bộ nhân viên đã nghỉ việc";
        break;
      }
      const hasCook = Boolean(st.staff.kenji);
      const rate = (6 + tables * 2 + active.reduce((s, k) => s + (ROLE_RATE[k] || 0), 0)) * (hasCook ? 1 : 0.4) * (st.staff.owl ? 1.2 : 1);
      carry += rate * OFFLINE_EFFICIENCY * repFactor * this.getStaffEfficiency() * (m / 60);
      const cap = Math.floor(carry);
      carry -= cap;
      capacity += cap;
      const drinkRate = st.staff.ducky ? 0.5 : 0.35;

      let soldThisSlice = 0;
      for (let i = 0; i < cap; i++) {
        const noodle = menuNoodles.filter(n => n.stock > 0).sort((x, y) => y.stock - x.stock)[0];
        if (!noodle) { stopReason = "Hết mì trong kho"; break; }
        if (!supplyOk(BOWL_SUPPLIES)) {
          const lack = BOWL_SUPPLIES.map(id => st.supplies[id]).find(sup => sup && sup.stock <= 0);
          stopReason = `Hết ${lack ? lack.name : "nguyên liệu phụ"}`;
          break;
        }
        noodle.stock -= 1;
        BOWL_SUPPLIES.forEach(id => { if (st.supplies[id]) st.supplies[id].stock -= 1; });
        revenue += noodle.price || noodle.basePrice || 0;
        soldNoodles[noodle.name] = (soldNoodles[noodle.name] || 0) + 1;
        bowls += 1;
        soldThisSlice += 1;

        drinkAcc += drinkRate;
        if (drinkAcc >= 1) {
          drinkAcc -= 1;
          const drink = menuDrinks.filter(d => d.stock > 0).sort((x, y) => y.stock - x.stock)[0];
          if (drink && supplyOk(DRINK_SUPPLIES)) {
            drink.stock -= 1;
            DRINK_SUPPLIES.forEach(id => { if (st.supplies[id]) st.supplies[id].stock -= 1; });
            revenue += drink.price || drink.basePrice || 0;
            soldDrinks[drink.name] = (soldDrinks[drink.name] || 0) + 1;
            drinks += 1;
          }
        }
      }

      // Quán chỉ mở cửa phần giờ thực sự bán hàng (đóng sớm vì hết hàng thì không mất phần hạn mức còn lại)
      const openFraction = stopReason && cap > 0 ? soldThisSlice / cap : 1;
      const workedMinutes = m * openFraction;
      openMinutes += workedMinutes;

      // Lương làm thêm giờ: 1/8 lương ngày cho mỗi giờ làm
      active.forEach(k => { wages += (this.getStaffWage(k) / 8) * (workedMinutes / 60); });

      // Mệt dần: càng đông khách trên đầu người càng mệt. Chán đời quá thì nghỉ việc ngay giữa ca
      const perPerson = soldThisSlice / active.length / (m / 60);
      active.forEach(k => {
        const info = this.ensureStaffInfo(k);
        const drop = (1.2 + Math.max(0, perPerson - 6) * 0.15) * (workedMinutes / 60);
        info.morale = round1(Math.max(0, info.morale - drop));
        if (info.morale <= MORALE_QUIT) {
          const c = crew.find(x => x.key === k);
          c.quit = true;
          c.moraleAfter = Math.round(info.morale);
          quits.push({ name: c.name, icon: c.icon, hour });
          this.removeStaff(k);
          st.reputation = Math.max(5, st.reputation - 3);
        }
      });
    }

    crew.forEach(c => {
      if (!c.quit) c.moraleAfter = Math.round(this.ensureStaffInfo(c.key).morale);
    });

    const tips = Math.round(revenue * 0.06 * (st.staff.mochi ? 1.35 : 1));
    const utilities = bowls > 0 ? Math.round(this.getDailyRentCost() * (openMinutes / OFFLINE_DAILY_CAP_MIN)) : 0;
    return emptyOfflineResult({
      capacity, openMinutes: Math.ceil(openMinutes), bowls, drinks, revenue, tips, utilities, wages: Math.round(wages),
      soldNoodles, soldDrinks, stopReason, crew, quits
    });
  },

  // Ghi kết quả offline vào ví: thu doanh thu, trả điện nước & lương làm thêm, tính thuế
  applyOfflineResult(r) {
    const st = this.state;
    const eco = st.eco;
    const gross = r.revenue + r.tips;
    st.money += gross;
    const due = r.utilities + r.wages;
    const paid = Math.min(st.money, due);
    st.money = round1(st.money - paid);
    const unpaid = round1(due - paid);
    if (unpaid > 0) {
      eco.billDebt = round1(eco.billDebt + unpaid);
      this.getHiredStaffKeys().forEach(k => {
        const info = this.ensureStaffInfo(k);
        info.morale = Math.max(0, info.morale - 8);
      });
    }
    r.tax = this.accrueTax(gross);
    r.unpaid = unpaid;
    r.netProfit = round1(gross - due);

    st.stats.totalRevenue = (st.stats.totalRevenue || 0) + Math.max(0, r.netProfit);
    st.stats.bowlsServed = (st.stats.bowlsServed || 0) + r.bowls;
    st.stats.drinksServed = (st.stats.drinksServed || 0) + r.drinks;
    st.stats.tipsEarned = (st.stats.tipsEarned || 0) + r.tips;
    return r;
  },

  showOfflineRevenueModal(r) {
    const existing = document.getElementById("offline-revenue-modal");
    if (existing) existing.remove();

    const vnd = v => txaformat.formatVND(v);
    const capText = this.formatOfflineDuration(OFFLINE_DAILY_CAP_MIN);
    const itemList = Object.entries(Object.assign({}, r.soldNoodles, r.soldDrinks))
      .map(([name, qty]) => `<div class="offline-report-row"><span class="offline-row-label">• ${esc(name)}</span><span class="offline-row-value">x${qty}</span></div>`)
      .join("");

    let notice = "";
    if (r.noStaff) {
      notice = "Tiệm không có nhân viên nên không ai mở cửa.";
    } else if (r.minutes === 0) {
      notice = `Đã dùng hết ${capText} bán offline hôm nay. Nhân viên đã tan ca, quán đóng cửa tới ngày mai.`;
    } else if (r.bowls === 0) {
      notice = `Quán không bán được tô nào: ${esc(r.stopReason || "kho trống")}. Hãy nhập thêm hàng trước khi rời tiệm!`;
    } else if (r.stopReason) {
      notice = `Quán phải đóng sớm vì ${esc(r.stopReason.toLowerCase())}. Nhập thêm hàng để lần sau bán được lâu hơn!`;
    } else if (r.minutes < r.elapsedMinutes) {
      notice = `Bạn vắng ${this.formatOfflineDuration(r.elapsedMinutes)}, nhưng mỗi ngày chỉ được tính tối đa ${capText} bán offline.`;
    }
    if (!r.noStaff && !this.state.staff.kenji && r.bowls > 0) {
      notice += `${notice ? " " : ""}Không có đầu bếp Gấu Kenji nên nhân viên nấu chậm, doanh thu thấp hơn nhiều.`;
    }

    const crewHtml = (r.crew || []).map(c => {
      const delta = c.moraleAfter - c.moraleBefore;
      return `<div class="offline-report-row">
        <span class="offline-row-label">${c.icon} ${esc(c.name)}${c.quit ? " · đã nghỉ việc" : ""}</span>
        <span class="offline-row-value ${c.quit || c.moraleAfter < 30 ? "text-red" : ""}">Tâm trạng ${c.moraleBefore}% → ${c.moraleAfter}% (${delta >= 0 ? "+" : ""}${delta})</span>
      </div>`;
    }).join("");
    const quitHtml = (r.quits || []).map(q => `<div class="offline-report-notice">🚪 ${q.icon} ${esc(q.name)} chán đời, nghỉ việc ngay giữa ca (giờ thứ ${q.hour} khi bạn vắng mặt). Tiệm mất 3 ⭐ uy tín.</div>`).join("");

    const overlay = document.createElement("div");
    overlay.id = "offline-revenue-modal";
    overlay.className = "offline-report-overlay";
    overlay.innerHTML = `
      <div class="offline-report-card anime-bounce-in">
        <div class="offline-report-header">
          <div class="offline-manager-avatars">${(r.crew || []).slice(0, 4).map(c => c.icon).join(" ") || "🍜"}</div>
          <h2 class="offline-report-title">BÁO CÁO CA OFFLINE</h2>
          <div class="offline-report-sub">${r.noStaff ? "Không ai trông tiệm khi bạn vắng." : "Nhân viên đã thay bạn trông tiệm trong lúc vắng mặt."}</div>
        </div>

        <div class="offline-report-table-box">
          <div class="offline-report-row">
            <span class="offline-row-label">⏱️ Thời gian vắng mặt:</span>
            <span class="offline-row-value">${this.formatOfflineDuration(r.elapsedMinutes)}</span>
          </div>
          <div class="offline-report-row">
            <span class="offline-row-label">🏪 Thời gian quán mở bán:</span>
            <span class="offline-row-value">${this.formatOfflineDuration(r.openMinutes || 0)}</span>
          </div>
          <div class="offline-report-row">
            <span class="offline-row-label">🗓️ Đã dùng hôm nay:</span>
            <span class="offline-row-value">${this.formatOfflineDuration(r.usedToday)} / ${capText}</span>
          </div>
          <div class="offline-row-divider"></div>
          ${crewHtml}
          ${crewHtml ? '<div class="offline-row-divider"></div>' : ""}
          <div class="offline-report-row">
            <span class="offline-row-label">🍜 Tô mì đã bán:</span>
            <span class="offline-row-value">${r.bowls} tô</span>
          </div>
          <div class="offline-report-row">
            <span class="offline-row-label">🧋 Ly nước đã bán:</span>
            <span class="offline-row-value">${r.drinks} ly</span>
          </div>
          ${itemList}
          <div class="offline-row-divider"></div>
          <div class="offline-report-row">
            <span class="offline-row-label">🟢 Doanh thu bán hàng:</span>
            <span class="offline-row-value text-green">+${vnd(r.revenue)}</span>
          </div>
          <div class="offline-report-row">
            <span class="offline-row-label">💖 Tiền boa thực khách:</span>
            <span class="offline-row-value text-green">+${vnd(r.tips)}</span>
          </div>
          <div class="offline-report-row">
            <span class="offline-row-label">🔴 Lương làm thêm giờ:</span>
            <span class="offline-row-value ${r.wages ? "text-red" : ""}">-${vnd(r.wages)}</span>
          </div>
          <div class="offline-report-row">
            <span class="offline-row-label">🔴 Mặt bằng, điện nước, gas:</span>
            <span class="offline-row-value ${r.utilities ? "text-red" : ""}">-${vnd(r.utilities)}</span>
          </div>
          ${r.tax > 0 ? `<div class="offline-report-row">
            <span class="offline-row-label">🧾 Thuế tạm tính (nộp theo kỳ):</span>
            <span class="offline-row-value">${vnd(r.tax)}</span>
          </div>` : ""}
        </div>

        ${r.unpaid > 0 ? `<div class="offline-report-notice">🚨 Ví không đủ trả ${vnd(r.unpaid)} chi phí, đã ghi nợ hóa đơn và nhân viên bắt đầu bực mình.</div>` : ""}
        ${quitHtml}
        ${notice ? `<div class="offline-report-notice">⚠️ ${notice}</div>` : ""}

        <div class="offline-green-card">
          <div class="offline-green-badge">${r.netProfit > 0 ? "✅ ĐÃ CỘNG VÀO KÉT QUÁN" : "KHÔNG CÓ LỢI NHUẬN"}</div>
          <div class="offline-green-amount">${r.netProfit >= 0 ? "+" : "-"}${vnd(Math.abs(r.netProfit))}</div>
          <div class="offline-green-sub">Nguyên liệu đã bán được trừ trực tiếp trong kho.</div>
        </div>

        <button class="btn-offline-confirm" id="btn-close-offline-report">Đã Hiểu 💖</button>
      </div>
    `;

    document.body.appendChild(overlay);
    if (this.sound && r.netProfit > 0) this.sound.playCoinChime();

    const btnClose = overlay.querySelector("#btn-close-offline-report");
    if (btnClose) {
      btnClose.onclick = () => {
        overlay.classList.add("fade-out");
        setTimeout(() => overlay.remove(), 250);
        this.renderAll();
      };
    }
  }
};
