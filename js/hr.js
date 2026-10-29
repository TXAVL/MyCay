// ==========================================================
// NHÂN SỰ THẬT (v2.3.0)
// - Tuyển dụng có phỏng vấn: mỗi ứng viên có tay nghề, mức lương đề nghị và tính cách riêng
// - Thử việc 2 ngày (70% lương) rồi mới ký chính thức
// - Nhân viên có tâm trạng: lương trễ, bị bỏ rơi thì chán việc, xin tăng lương, thậm chí nghỉ việc
// - Có thể thưởng nóng, sa thải (phải đền 2 ngày lương)
// ==========================================================
import { GameUIModal } from "./modal.js?v=2.3.4";

export const STAFF_ROSTER = [
  { key: "mochi", name: "Bé Mèo Mochi", role: "Tiếp tân", desc: "Chào đón khách nồng hậu & tăng +25% tiền tip", cost: 450, wage: 35, minDay: 2, minRep: 25, icon: "🐱" },
  { key: "usagi", name: "Thỏ Usagi", role: "Bưng bê niêu đất", desc: "Tự động bưng mì nóng hổi ra bàn khi nấu xong", cost: 850, wage: 45, minDay: 4, minRep: 50, icon: "🐰" },
  { key: "shiba", name: "Cún Shiba", role: "Tạp vụ dọn bàn", desc: "Tự động lau dọn bàn sạch bóng & nhặt tiền tip", cost: 1350, wage: 45, minDay: 6, minRep: 80, icon: "🐶" },
  { key: "kenji", name: "Gấu Kenji", role: "Đầu bếp ninh mì", desc: "Tự động nấu niêu đất khi khách gọi món", cost: 2200, wage: 65, minDay: 9, minRep: 120, icon: "🐼" },
  { key: "shiro", name: "Cáo Shiro", role: "Thu ngân", desc: "Tự động nhận đơn, đóng gói và giao đơn online cho tài xế", cost: 3200, wage: 60, minDay: 12, minRep: 165, icon: "🦊" },
  { key: "ducky", name: "Vịt Ducky", role: "Barista Pha Chế", desc: "Tự pha & kèm trà sữa, tăng +25% doanh thu nước", cost: 4500, wage: 60, minDay: 16, minRep: 220, icon: "🦆" },
  { key: "owl", name: "Cú Mèo Owl", role: "Trưởng Marketing", desc: "Bão khách ghé tiệm +35%, nổ đơn Online dày hơn & review 5 sao", cost: 5800, wage: 75, minDay: 21, minRep: 290, icon: "🦉" },
  { key: "fawn", name: "Nai Fawn", role: "Logistics & Quản Lý Kho", desc: "Nhập sỉ chiết khấu -15%, tự động restock & thưởng +15% đơn giao", cost: 7500, wage: 85, minDay: 27, minRep: 380, icon: "🦌" },
  { key: "torto", name: "Cụ Rùa Torto", role: "Kế Toán Trưởng", desc: "Đàm phán giảm 50% tiền thuê mặt bằng, giảm 30% thuế, +0,1%/ngày lãi tiết kiệm", cost: 9500, wage: 90, minDay: 33, minRep: 480, icon: "🐢" },
  { key: "tora", name: "Bạch Hổ Tora", role: "Vệ Sĩ & An Ninh", desc: "85% hóa giải khách giận dữ bỏ về, tăng +30 kiên nhẫn", cost: 12000, wage: 110, minDay: 40, minRep: 600, icon: "🐯" },
  { key: "ryu", name: "Thần Long Ryu", role: "Linh Vật May Mắn", desc: "Tự động kích hoạt Giờ Vàng FEVER & rơi mưa vàng ngẫu nhiên", cost: 18000, wage: 150, minDay: 50, minRep: 800, icon: "🐉" }
];

const TRAITS = {
  hardworking: { label: "Chăm chỉ", desc: "Làm nhanh hơn 10%", eff: 1.1, moraleDay: 0 },
  loyal: { label: "Trung thành", desc: "Ít chán việc, ít đòi tăng lương", eff: 1, moraleDay: 1.5, raiseEvery: 14 },
  slacker: { label: "Hay trễ nải", desc: "Làm chậm hơn 10%", eff: 0.9, moraleDay: 0 },
  greedy: { label: "Hay đòi lương", desc: "Thường xuyên xin tăng lương", eff: 1, moraleDay: -0.5, raiseEvery: 5 },
  steady: { label: "Điềm tĩnh", desc: "Không có điểm đặc biệt", eff: 1, moraleDay: 0 }
};
const TRAIT_KEYS = Object.keys(TRAITS);

const PROBATION_DAYS = 2;
const PROBATION_WAGE = 0.7;
const MAX_REROLLS = 2;

const stars = n => "★".repeat(n) + "☆".repeat(5 - n);
const rosterOf = key => STAFF_ROSTER.find(s => s.key === key);

function rollSkill() {
  const r = Math.random();
  if (r < 0.1) return 1;
  if (r < 0.35) return 2;
  if (r < 0.7) return 3;
  if (r < 0.9) return 4;
  return 5;
}

export const HrMethods = {
  // Hồ sơ nhân viên: bản lưu cũ chưa có hồ sơ thì tạo mặc định (tay nghề 3, lương chuẩn, vào làm chính thức)
  ensureStaffInfo(key) {
    const eco = this.state.eco;
    if (!eco.staffInfo[key]) {
      eco.staffInfo[key] = { hiredDay: this.state.day, skill: 3, wageMult: 1, trait: "steady", probation: 0, morale: 70, unpaid: 0, nextRaiseDay: this.state.day + 10, raise: null, bonusDay: 0 };
    }
    return eco.staffInfo[key];
  },

  getStaffWage(key) {
    const r = rosterOf(key);
    if (!r) return 0;
    const info = this.ensureStaffInfo(key);
    return Math.round(r.wage * info.wageMult * (info.probation > 0 ? PROBATION_WAGE : 1));
  },

  computePayroll() {
    const items = [];
    let total = 0;
    STAFF_ROSTER.forEach(r => {
      if (!this.state.staff[r.key]) return;
      const wage = this.getStaffWage(r.key);
      items.push({ key: r.key, name: r.name, wage });
      total += wage;
    });
    return { items, total };
  },

  // Hiệu suất trung bình của đội ngũ: dùng để tăng/giảm tốc độ làm việc tự động
  getStaffEfficiency() {
    const keys = STAFF_ROSTER.map(r => r.key).filter(k => this.state.staff[k]);
    if (!keys.length) return 1;
    const sum = keys.reduce((s, k) => {
      const info = this.ensureStaffInfo(k);
      const base = 0.7 + info.skill * 0.1;
      const trait = (TRAITS[info.trait] || TRAITS.steady).eff;
      const mood = info.morale < 35 ? 0.8 : (info.morale >= 80 ? 1.05 : 1);
      return s + base * trait * mood;
    }, 0);
    return Math.max(0.6, sum / keys.length);
  },

  makeCandidate(key) {
    const r = rosterOf(key);
    const skill = rollSkill();
    const wageMult = Math.round((0.7 + skill * 0.1 + (Math.random() - 0.5) * 0.1) * 100) / 100;
    const trait = TRAIT_KEYS[Math.floor(Math.random() * TRAIT_KEYS.length)];
    // Phí tuyển dụng nhỉnh hơn nếu ứng viên giỏi
    const fee = Math.round(r.cost * (0.85 + skill * 0.05));
    return { key, skill, wageMult, trait, fee, wage: Math.round(r.wage * wageMult) };
  },

  hireStaff(key, cost, minDay = 1, minRep = 0) {
    const r = rosterOf(key);
    if (!r) return;
    if (this.state.staff[key]) return;
    if (this.state.day < minDay) {
      GameUIModal.showToast(`Nhân viên này chỉ nhận hồ sơ từ Ngày ${minDay}!`, "warning", "📅");
      return;
    }
    if ((this.state.reputation || 0) < minRep) {
      GameUIModal.showToast(`Tiệm cần đạt tối thiểu ${minRep}⭐ Danh tiếng (hiện có: ${this.state.reputation || 30}⭐)! Hãy phục vụ khách 5★ và vào Tab 4 trả lời đánh giá để cày điểm nhé!`, "warning", "⭐", 3500);
      return;
    }
    this.hrRerolls = { key, left: MAX_REROLLS };
    this.openInterview(this.makeCandidate(key));
  },

  openInterview(c) {
    const r = rosterOf(c.key);
    const t = TRAITS[c.trait];
    const rerolls = this.hrRerolls && this.hrRerolls.key === c.key ? this.hrRerolls.left : 0;
    this.pendingCandidate = c;
    GameUIModal.confirm({
      title: `Phỏng vấn ${r.name}`,
      icon: r.icon,
      message: `
        <div class="hr-interview">
          <div><b>Vị trí:</b> ${r.role}</div>
          <div><b>Tay nghề:</b> <span class="hr-stars">${stars(c.skill)}</span></div>
          <div><b>Lương đề nghị:</b> ${c.wage}k/ngày (chuẩn ${r.wage}k)</div>
          <div><b>Tính cách:</b> ${t.label} · ${t.desc}</div>
          <div><b>Phí tuyển dụng:</b> ${c.fee}k · thử việc ${PROBATION_DAYS} ngày hưởng ${Math.round(PROBATION_WAGE * 100)}% lương</div>
          ${rerolls > 0 ? `<button class="hr-btn" onclick="window.game.rerollCandidate()">🔄 Xem ứng viên khác (còn ${rerolls} lần)</button>` : `<div class="hr-note">Hôm nay đã hết ứng viên khác cho vị trí này.</div>`}
        </div>`,
      confirmText: `Nhận việc (−${c.fee}k)`,
      cancelText: "Để sau",
      onConfirm: () => this.confirmHire(c)
    });
  },

  rerollCandidate() {
    if (!this.pendingCandidate || !this.hrRerolls || this.hrRerolls.left <= 0) return;
    this.hrRerolls.left -= 1;
    GameUIModal.closeDialogs();
    this.openInterview(this.makeCandidate(this.pendingCandidate.key));
  },

  confirmHire(c) {
    const r = rosterOf(c.key);
    if (this.state.staff[c.key]) return;
    if (this.state.money < c.fee) {
      GameUIModal.showToast(`Cần ${c.fee}k để nhận ${r.name} về tiệm!`, "warning", "🪙");
      return;
    }
    this.state.money -= c.fee;
    this.state.staff[c.key] = true;
    this.state.eco.staffInfo[c.key] = {
      hiredDay: this.state.day, skill: c.skill, wageMult: c.wageMult, trait: c.trait,
      probation: PROBATION_DAYS, morale: 75, unpaid: 0,
      nextRaiseDay: this.state.day + (TRAITS[c.trait].raiseEvery || 9) + Math.floor(Math.random() * 3),
      raise: null, bonusDay: 0
    };
    this.sound.playCoinChime();
    GameUIModal.showToast(`${r.icon} ${r.name} bắt đầu thử việc ${PROBATION_DAYS} ngày (${c.wage}k/ngày × ${Math.round(PROBATION_WAGE * 100)}%).`, "success", "🐾");
    this.saveGame();
    this.renderHeader();
    this.renderStaffTab();
    this.renderStaffKitchenBar();
  },

  giveStaffBonus(key) {
    const r = rosterOf(key);
    const info = this.ensureStaffInfo(key);
    if (info.bonusDay === this.state.day) {
      GameUIModal.showToast(`${r.name} đã được thưởng hôm nay rồi!`, "info", "🎁");
      return;
    }
    const cost = Math.max(20, Math.round(this.getStaffWage(key) * 0.6));
    if (this.state.money < cost) {
      GameUIModal.showToast(`Cần ${cost}k tiền thưởng nóng!`, "warning", "🪙");
      return;
    }
    this.state.money -= cost;
    info.bonusDay = this.state.day;
    info.morale = Math.min(100, info.morale + 18);
    this.sound.playCoinChime();
    GameUIModal.showToast(`🎁 Đã thưởng ${r.name} ${cost}k, tâm trạng tăng lên!`, "success", r.icon);
    this.saveGame();
    this.renderHeader();
    this.renderStaffTab();
  },

  answerRaise(key, accept) {
    const r = rosterOf(key);
    const info = this.ensureStaffInfo(key);
    if (!info.raise) return;
    const pct = info.raise;
    info.raise = null;
    const every = (TRAITS[info.trait] || TRAITS.steady).raiseEvery || 10;
    if (accept) {
      info.wageMult = Math.round(info.wageMult * (1 + pct / 100) * 100) / 100;
      info.morale = Math.min(100, info.morale + 15);
      info.nextRaiseDay = this.state.day + every + 4;
      GameUIModal.showToast(`💸 Đã tăng lương ${r.name} thêm ${pct}% (giờ ${this.getStaffWage(key)}k/ngày).`, "success", r.icon);
    } else {
      info.morale = Math.max(0, info.morale - 22);
      info.nextRaiseDay = this.state.day + Math.max(4, Math.round(every / 2));
      GameUIModal.showToast(`😒 ${r.name} không vui vì bị từ chối tăng lương.`, "warning", r.icon);
    }
    this.saveGame();
    this.renderStaffTab();
  },

  fireStaff(key) {
    const r = rosterOf(key);
    const severance = this.getStaffWage(key) * 2;
    GameUIModal.confirm({
      title: `Cho ${r.name} nghỉ việc?`,
      icon: "📄",
      message: `Theo luật lao động, tiệm phải đền bù <b>${severance}k</b> (2 ngày lương). ${r.name} sẽ rời tiệm và mất toàn bộ năng lực hỗ trợ.`,
      confirmText: `Sa thải (−${severance}k)`,
      cancelText: "Giữ lại",
      onConfirm: () => {
        if (this.state.money < severance) {
          GameUIModal.showToast(`Không đủ ${severance}k để đền bù hợp đồng!`, "warning", "🪙");
          return;
        }
        this.state.money -= severance;
        this.removeStaff(key);
        GameUIModal.showToast(`Đã cho ${r.name} nghỉ việc.`, "info", r.icon);
        this.saveGame();
        this.renderHeader();
        this.renderStaffTab();
        this.renderStaffKitchenBar();
      }
    });
  },

  removeStaff(key) {
    this.state.staff[key] = false;
    delete this.state.eco.staffInfo[key];
  },

  // Cuối ngày: cập nhật tâm trạng, thử việc, đề nghị tăng lương, nghỉ việc. paidRatio = tỉ lệ lương trả đủ (0..1)
  hrSettleDay(paidRatio) {
    const notes = [];
    const day = this.state.day;
    STAFF_ROSTER.forEach(r => {
      if (!this.state.staff[r.key]) return;
      const info = this.ensureStaffInfo(r.key);
      const trait = TRAITS[info.trait] || TRAITS.steady;

      info.morale += -2 + trait.moraleDay + (paidRatio >= 1 ? 3 : -18);
      info.unpaid = paidRatio >= 1 ? 0 : info.unpaid + 1;
      if (info.raise) info.morale -= 5; // đề nghị tăng lương bị phớt lờ
      if (this.state.reputation < 30) info.morale -= 2;
      info.morale = Math.max(0, Math.min(100, Math.round(info.morale)));

      if (info.unpaid >= 2 || info.morale <= 10) {
        this.removeStaff(r.key);
        this.state.reputation = Math.max(5, this.state.reputation - 3);
        notes.push(`🚪 ${r.name} đã nghỉ việc ${info.unpaid >= 2 ? "vì bị nợ lương" : "vì quá chán nản"} (−3 ⭐ uy tín).`);
        return;
      }
      if (info.probation > 0) {
        info.probation -= 1;
        if (info.probation === 0) {
          if (info.morale < 35) {
            this.removeStaff(r.key);
            notes.push(`🚪 ${r.name} không qua thử việc và xin rút lui.`);
            return;
          }
          notes.push(`✅ ${r.name} đã qua thử việc, ký hợp đồng chính thức (lương đầy đủ ${this.getStaffWage(r.key)}k/ngày).`);
        }
      }
      if (!info.raise && info.probation === 0 && day >= info.nextRaiseDay) {
        info.raise = 8 + Math.floor(Math.random() * 8);
        notes.push(`💬 ${r.name} xin tăng lương ${info.raise}%. Vào tab Nhân Viên để trả lời.`);
      }
      if (info.morale < 30) notes.push(`🥺 ${r.name} đang rất chán việc (tâm trạng ${info.morale}%). Hãy thưởng nóng hoặc trả lương đúng hạn!`);
    });
    this.state.eco.hrNotes = notes;
    return notes;
  },

  renderStaffTab() {
    const listEl = document.getElementById("staff-list");
    if (!listEl) return;

    const bannerWrap = document.getElementById("staff-reputation-banner-wrap");
    if (bannerWrap) {
      const payroll = this.computePayroll();
      const eff = Math.round(this.getStaffEfficiency() * 100);
      const notes = this.state.eco.hrNotes || [];
      bannerWrap.innerHTML = `
        <div class="staff-rep-banner" onclick="window.game.openReputationGuide()" title="Bấm để xem bí kíp cày điểm Danh Tiếng">
          <div class="staff-rep-banner-left">
            <span class="staff-rep-banner-icon">⭐</span>
            <div>
              <div class="staff-rep-banner-title">Danh Tiếng Quán: <b style="color: var(--cp-text-warn);">${this.state.reputation || 30} ⭐</b></div>
              <div class="staff-rep-banner-sub">Cần đủ điểm để nhận hồ sơ ứng viên. Bấm xem mẹo cày điểm! 💡</div>
            </div>
          </div>
          <button class="btn-rep-guide-action" type="button">Cách Cày ⭐</button>
        </div>
        ${payroll.items.length ? `<div class="hr-summary">👥 Quỹ lương: <b>${payroll.total}k/ngày</b> · Hiệu suất đội ngũ: <b>${eff}%</b> · Lương trả trễ 2 ngày là nhân viên nghỉ việc</div>` : ""}
        ${notes.length ? `<div class="hr-notes">${notes.map(n => `<div>${n}</div>`).join("")}</div>` : ""}
      `;
    }

    listEl.innerHTML = STAFF_ROSTER.map(st => {
      const isHired = !!this.state.staff[st.key];
      const isDayUnlocked = this.state.day >= st.minDay;
      const isRepUnlocked = (this.state.reputation || 0) >= st.minRep;
      const isUnlocked = isDayUnlocked && isRepUnlocked;
      let hrBlock = "";
      if (isHired) {
        const info = this.ensureStaffInfo(st.key);
        const t = TRAITS[info.trait] || TRAITS.steady;
        const wage = this.getStaffWage(st.key);
        hrBlock = `
          <div class="hr-meta">
            <span class="hr-stars" title="Tay nghề">${stars(info.skill)}</span>
            <span>${t.label}</span>
            <span>Lương ${wage}k${info.probation > 0 ? ` (thử việc còn ${info.probation} ngày)` : ""}</span>
          </div>
          <div class="hr-mood" title="Tâm trạng ${info.morale}%"><i class="${info.morale < 35 ? "is-low" : ""}" style="width:${info.morale}%"></i></div>
          ${info.raise ? `
            <div class="hr-raise">💬 Xin tăng lương ${info.raise}%
              <button class="hr-btn" onclick="window.game.answerRaise('${st.key}', true)">Đồng ý</button>
              <button class="hr-btn hr-btn-ghost" onclick="window.game.answerRaise('${st.key}', false)">Từ chối</button>
            </div>` : ""}`;
      }
      return `
        <div class="staff-card">
          <div class="staff-card-info">
            <div class="staff-card-head">
              <span class="staff-card-title">${st.icon} ${st.name} (${st.role})</span>
              <span class="staff-card-wage">Lương chuẩn: ${st.wage}k/ngày</span>
            </div>
            <span class="staff-card-desc">${st.desc}</span>
            <div class="staff-card-reqs">
              <span class="req-pill ${isDayUnlocked ? "req-met" : "req-unmet"}">📅 Ngày ${st.minDay}+</span>
              <span class="req-pill ${isRepUnlocked ? "req-met" : "req-unmet"}">⭐ ${st.minRep} Danh tiếng</span>
            </div>
            ${hrBlock}
          </div>
          <div class="hr-actions">
            ${isHired ? `
              <span class="staff-badge-working">✨ Đang làm việc</span>
              <button class="hr-btn" onclick="window.game.giveStaffBonus('${st.key}')" title="Thưởng nóng tăng tâm trạng">🎁 Thưởng</button>
              <button class="hr-btn hr-btn-ghost" onclick="window.game.fireStaff('${st.key}')">Sa thải</button>
            ` : (!isUnlocked
              ? `<span class="staff-lock-badge" onclick="window.game.openReputationGuide()" style="cursor: pointer;" title="Bấm xem cách cày điểm">🔒 Ngày ${st.minDay} · ${st.minRep}⭐</span>`
              : `<button class="btn-menu-action btn-buy-lock" onclick="window.game.hireStaff('${st.key}', ${st.cost}, ${st.minDay}, ${st.minRep})">
                   <span class="btn-price-top">${st.cost}k</span>
                   <span class="btn-action-sub">Phỏng Vấn</span>
                 </button>`)}
          </div>
        </div>`;
    }).join("");
  }
};
