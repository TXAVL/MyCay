// ==========================================================
// TÀI CHÍNH THẬT (v2.3.0): NGÂN HÀNG, VAY VỐN, THUẾ & CHI PHÍ CỐ ĐỊNH
// - Lãi tiết kiệm thực tế (không còn "in tiền"), gửi kỳ hạn tự chọn số tiền, rút trước hạn bị mất lãi
// - Vay vốn có lãi, trả góp mỗi ngày, điểm tín dụng, phạt trả trễ, nợ xấu bị ngân hàng trích sổ
// - Hóa đơn theo thực tế: thuê mặt bằng, điện, nước, gas, lương; thiếu tiền thì ghi nợ chịu phí chậm trả
// - Thuế khoán 2% doanh thu (miễn 5 ngày khai trương), nộp mỗi 7 ngày
// ==========================================================
import { GameUIModal } from "./modal.js?v=2.3.3";
import { txaformat } from "./txaformat.js?v=2.3.3";

const SAVINGS_RATES = { flexi: 0.002, term3: 0.005, term7: 0.008 }; // %/ngày
const TAX_RATE = 0.02;
const TAX_FREE_DAYS = 5;
const TAX_PERIOD = 7;
const DEBT_LATE_FEE = 0.02;
const LOAN_PLANS = [
  { id: "loan7", name: "Vay Quay Vòng 7 Ngày", days: 7, rate: 0.010, icon: "🔄" },
  { id: "loan14", name: "Vay Mở Rộng 14 Ngày", days: 14, rate: 0.009, icon: "🏗️" }
];
const LOAN_FEE = 0.01; // phí giải ngân
const LOAN_EARLY_FEE = 0.02; // phí tất toán sớm
const MIN_CREDIT = 300;
const MAX_CREDIT = 850;

const round1 = v => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const money = v => txaformat.formatVND(v);

export function createEcoState() {
  return {
    market: { day: 0, factors: {}, supply: {}, event: null },
    batches: {},
    staffInfo: {},
    hrNotes: [],
    loan: null,
    credit: 600,
    blockedLoanUntil: 0,
    billDebt: 0,
    debtDays: 0,
    tax: { accrued: 0 },
    lastBills: null
  };
}

export function mergeEco(saved) {
  const base = createEcoState();
  if (!saved || typeof saved !== "object") return base;
  const out = Object.assign(base, saved);
  out.market = Object.assign(createEcoState().market, saved.market || {});
  out.tax = Object.assign({ accrued: 0 }, saved.tax || {});
  out.batches = saved.batches && typeof saved.batches === "object" ? saved.batches : {};
  out.staffInfo = saved.staffInfo && typeof saved.staffInfo === "object" ? saved.staffInfo : {};
  out.hrNotes = Array.isArray(saved.hrNotes) ? saved.hrNotes : [];
  out.credit = clamp(Number(saved.credit) || 600, MIN_CREDIT, MAX_CREDIT);
  return out;
}

export const FinanceMethods = {
  // ---------- Chi phí cố định ----------
  getRentCost(day = this.state.day) {
    if (this.state.ownedFlagship || day === 1) return 0;
    let rent = Math.min(140, 20 + (day - 1) * 9);
    if (this.state.staff.torto) rent = Math.round(rent * 0.5);
    return rent;
  },

  // Điện, nước, gas phụ thuộc lượng khách thực tế và trang thiết bị đang chạy
  computeUtilities(bowls = 0, drinks = 0) {
    const up = this.state.upgrades;
    const electric = Math.round(6 + (up.acCooling || 1) * 2 + (up.dualStove ? 2 : 0) + (up.airPurifier ? 2 : 0) + (up.zenGarden ? 2 : 0) + (up.decorScore || 1) + bowls * 0.3);
    const water = Math.round(3 + bowls * 0.4 + drinks * 0.2);
    const gas = Math.round(3 + bowls * 0.5 + ((up.stoveSpeed || 1) - 1));
    return { electric, water, gas, total: electric + water + gas };
  },

  // Dùng cho ước tính doanh thu offline
  getDailyRentCost() {
    return this.getRentCost() + this.computeUtilities(20, 8).total;
  },

  // Cộng dồn thuế khoán tạm tính cho một khoản doanh thu (ca thường hoặc ca offline)
  accrueTax(sales) {
    if (this.state.day <= TAX_FREE_DAYS) return 0;
    const tax = round1(sales * TAX_RATE * (this.state.staff.torto ? 0.7 : 1));
    this.state.eco.tax.accrued = round1(this.state.eco.tax.accrued + tax);
    return tax;
  },

  getNextTaxDay() {
    return Math.ceil(this.state.day / TAX_PERIOD) * TAX_PERIOD;
  },

  // ---------- Điểm tín dụng & vay vốn ----------
  adjustCredit(delta) {
    const eco = this.state.eco;
    eco.credit = clamp(Math.round(eco.credit + delta), MIN_CREDIT, MAX_CREDIT);
  },

  getCreditLabel() {
    const c = this.state.eco.credit;
    if (c >= 750) return { text: "Xuất sắc", cls: "good" };
    if (c >= 650) return { text: "Tốt", cls: "good" };
    if (c >= 550) return { text: "Khá", cls: "mid" };
    if (c >= 450) return { text: "Trung bình", cls: "mid" };
    return { text: "Rủi ro cao", cls: "bad" };
  },

  getLoanLimit() {
    const st = this.state;
    if (st.day < 3 || st.eco.credit < 450) return 0;
    const base = 300 + st.day * 100 + (st.stats.totalRevenue || 0) * 0.1;
    const factor = clamp((st.eco.credit - 450) / 250, 0.2, 1.3);
    return Math.min(20000, Math.round((base * factor) / 50) * 50);
  },

  getLoanInstallment(loan = this.state.eco.loan) {
    if (!loan) return null;
    const interest = round1(loan.balance * loan.rate);
    const overdue = loan.daysLeft <= 0;
    const principalPart = (loan.daysLeft <= 1 || overdue) ? loan.balance : Math.min(loan.balance, round1(loan.principal / loan.termDays));
    return { interest, principalPart, total: round1(principalPart + interest) };
  },

  takeLoan(planId, amount) {
    const st = this.state;
    const eco = st.eco;
    const plan = LOAN_PLANS.find(p => p.id === planId);
    if (!plan) return;
    if (st.dayPhase === "open") {
      GameUIModal.showToast("Quán đang bận ca bán, hãy làm thủ tục vay sau giờ đóng cửa!", "info", "⏱️");
      return;
    }
    if (eco.loan) {
      GameUIModal.showToast("Bạn đang có một khoản vay chưa tất toán!", "warning", "🏧");
      return;
    }
    if (st.day < eco.blockedLoanUntil) {
      GameUIModal.showToast(`Hồ sơ bị chặn vay vì nợ xấu, thử lại từ Ngày ${eco.blockedLoanUntil}.`, "warning", "🚫");
      return;
    }
    const limit = this.getLoanLimit();
    const amt = Math.min(limit, Math.round(Number(amount) / 50) * 50);
    if (amt < 100) {
      GameUIModal.showToast("Hạn mức vay hiện tại quá thấp. Hãy kinh doanh thêm và giữ điểm tín dụng tốt!", "warning", "🏧");
      return;
    }
    const daily = round1(amt / plan.days);
    const firstInterest = round1(amt * plan.rate);
    const totalInterest = round1((amt * plan.rate * (plan.days + 1)) / 2);
    const fee = Math.round(amt * LOAN_FEE);
    GameUIModal.confirm({
      title: plan.name,
      icon: plan.icon,
      message: `Vay <b>${money(amt)}</b>, lãi ${(plan.rate * 100).toFixed(1)}%/ngày trên dư nợ, trả góp ${plan.days} ngày.<br>
        Phí giải ngân ${money(fee)} · thực nhận <b>${money(amt - fee)}</b><br>
        Mỗi đêm ngân hàng tự trừ khoảng <b>${money(daily + firstInterest)}</b> (giảm dần), tổng lãi dự kiến ~${money(totalInterest)}.<br>
        Trả trễ bị phạt 5%, trễ 3 lần ngân hàng trích thẳng sổ tiết kiệm và bị chặn vay 10 ngày.`,
      confirmText: "Ký hợp đồng vay",
      cancelText: "Thôi",
      onConfirm: () => {
        if (eco.loan) return;
        st.money += amt - fee;
        eco.loan = { planId, planName: plan.name, principal: amt, balance: amt, rate: plan.rate, termDays: plan.days, daysLeft: plan.days, missed: 0, startDay: st.day };
        this.addBankHistory("loan", amt - fee, `${plan.name}: nhận ${money(amt)} (phí ${money(fee)})`);
        this.sound.playCoinChime();
        GameUIModal.showToast(`🏧 Đã giải ngân ${money(amt - fee)}. Nhớ giữ đủ tiền để ngân hàng trừ nợ mỗi đêm!`, "success", "💳");
        this.saveGame();
        this.renderHeader();
        this.renderBankTab();
      }
    });
  },

  repayLoanEarly() {
    const st = this.state;
    const eco = st.eco;
    const loan = eco.loan;
    if (!loan) return;
    if (st.dayPhase === "open") {
      GameUIModal.showToast("Hãy tất toán sau giờ đóng cửa quán nhé!", "info", "⏱️");
      return;
    }
    const fee = round1(loan.balance * LOAN_EARLY_FEE);
    const total = round1(loan.balance + fee);
    if (st.money < total) {
      GameUIModal.showToast(`Cần ${money(total)} (dư nợ + phí tất toán sớm ${money(fee)}) để trả hết nợ!`, "warning", "🪙");
      return;
    }
    st.money = round1(st.money - total);
    eco.loan = null;
    this.adjustCredit(15);
    this.addBankHistory("loan_pay", total, `Tất toán sớm khoản vay (phí ${money(fee)})`);
    this.sound.playCoinChime();
    GameUIModal.showToast("✅ Đã tất toán khoản vay, điểm tín dụng tăng!", "success", "🏦");
    this.saveGame();
    this.renderHeader();
    this.renderBankTab();
  },

  // Ngân hàng tự trừ nợ mỗi cuối ngày: ví trước, thiếu thì trích sổ tiết kiệm
  collectLoanInstallment(bills) {
    const st = this.state;
    const eco = st.eco;
    const loan = eco.loan;
    if (!loan) return;
    const inst = this.getLoanInstallment(loan);
    bills.loanDue = inst.total;

    let need = inst.total;
    let paid = 0;
    const fromWallet = Math.min(st.money, need);
    st.money = round1(st.money - fromWallet);
    paid += fromWallet;
    need -= fromWallet;
    if (need > 0.05 && st.bank.savings > 0) {
      const fromSavings = Math.min(st.bank.savings, need);
      st.bank.savings = round1(st.bank.savings - fromSavings);
      paid += fromSavings;
      need -= fromSavings;
      this.addBankHistory("seize", fromSavings, "Ngân hàng trích sổ tiết kiệm để trừ nợ vay");
    }

    const interestPaid = Math.min(paid, inst.interest);
    const principalPaid = round1(paid - interestPaid);
    loan.balance = round1(Math.max(0, loan.balance - principalPaid));
    loan.daysLeft -= 1;
    bills.loanPaid = round1(paid);
    bills.loanInterest = round1(interestPaid);

    if (need <= 0.05) {
      this.adjustCredit(5);
      this.addBankHistory("loan_pay", paid, `Trả góp tự động (lãi ${money(interestPaid)})`);
      if (loan.balance <= 0.05) {
        eco.loan = null;
        this.adjustCredit(30);
        GameUIModal.showToast("🎉 Đã trả hết khoản vay đúng hạn! Điểm tín dụng tăng mạnh.", "success", "🏦", 3500);
      }
      return;
    }

    // Trả thiếu: bị phạt, tụt điểm tín dụng
    loan.missed += 1;
    const penalty = round1((inst.total - paid) * 0.05);
    loan.balance = round1(loan.balance + (inst.interest - interestPaid) + penalty);
    bills.lateFee = round1((bills.lateFee || 0) + penalty);
    this.adjustCredit(-35);
    this.addBankHistory("loan_pay", paid, `Trả thiếu kỳ nợ (thiếu ${money(need)}, phạt ${money(penalty)})`);
    if (loan.missed >= 3 && st.day >= eco.blockedLoanUntil) {
      eco.blockedLoanUntil = st.day + 10;
      this.adjustCredit(-100);
      st.reputation = Math.max(5, st.reputation - 5);
      GameUIModal.showToast("🚨 Nợ xấu! Ngân hàng chặn vay 10 ngày và nhắc nợ ầm ĩ trước tiệm (−5 ⭐).", "warning", "🏦", 4500);
    }
  },

  // ---------- Tiết kiệm ----------
  getSavingsRate(planId = "flexi") {
    return (SAVINGS_RATES[planId] || SAVINGS_RATES.flexi) + (this.state.staff.torto ? 0.001 : 0);
  },

  accrueSavingsInterest() {
    const bank = this.state.bank;
    let total = 0;
    if (bank.savings > 0) {
      const i = round1(bank.savings * this.getSavingsRate("flexi"));
      if (i > 0) {
        bank.savings = round1(bank.savings + i);
        bank.totalInterestEarned = round1((bank.totalInterestEarned || 0) + i);
        total += i;
        this.addBankHistory("interest", i, `Lãi tiết kiệm linh hoạt (+${(this.getSavingsRate("flexi") * 100).toFixed(1)}%/ngày)`);
      }
    }
    if (bank.termDepositAmount > 0 && bank.termDaysRemaining > 0) {
      bank.termDaysRemaining -= 1;
      if (bank.termDaysRemaining <= 0) {
        const plan = bank.activePlan === "term7" ? "term7" : "term3";
        const days = plan === "term7" ? 7 : 3;
        const interest = round1(bank.termDepositAmount * this.getSavingsRate(plan) * days);
        const payout = round1(bank.termDepositAmount + interest);
        bank.savings = round1(bank.savings + payout);
        bank.totalInterestEarned = round1((bank.totalInterestEarned || 0) + interest);
        total += interest;
        this.addBankHistory("term_payout", payout, `Tất toán kỳ hạn ${days} ngày (gốc + lãi ${money(interest)})`);
        bank.termDepositAmount = 0;
        bank.activePlan = "flexi";
      }
    }
    return round1(total);
  },

  getBankDepositLimit() {
    const fiveStarCount = (this.state.reviews || []).filter(r => r.stars === 5).length;
    return 50000 + fiveStarCount * 1000;
  },

  promptTermDeposit(planId, termDays, amount) {
    const bank = this.state.bank;
    if (this.state.dayPhase === "open") {
      GameUIModal.showToast("Hãy mở sổ kỳ hạn sau giờ đóng cửa quán nhé!", "info", "⏱️");
      return;
    }
    if (bank.termDepositAmount > 0 && bank.termDaysRemaining > 0) {
      GameUIModal.showToast(`Bạn đang có một sổ kỳ hạn chạy (${bank.termDaysRemaining} ngày nữa đáo hạn)!`, "warning", "🔒");
      return;
    }
    const available = Math.floor(bank.savings || 0);
    const amt = amount === "all" ? available : Math.min(available, Number(amount));
    if (amt < 50) {
      GameUIModal.showToast("Cần tối thiểu 50k trong sổ tiết kiệm để mở sổ kỳ hạn!", "warning", "⚠️");
      return;
    }
    const rate = this.getSavingsRate(planId);
    const interest = round1(amt * rate * termDays);
    GameUIModal.confirm({
      title: `Sổ kỳ hạn ${termDays} ngày`,
      icon: "🔒",
      message: `Khóa <b>${money(amt)}</b> trong ${termDays} ngày, lãi ${(rate * 100).toFixed(1)}%/ngày, dự kiến nhận <b>${money(interest)}</b> khi đáo hạn.<br>Rút trước hạn sẽ mất phần lớn lãi.`,
      confirmText: "Mở sổ",
      cancelText: "Thôi",
      onConfirm: () => {
        if ((bank.savings || 0) < amt) return;
        bank.savings = round1(bank.savings - amt);
        bank.termDepositAmount = amt;
        bank.termDaysRemaining = termDays;
        bank.activePlan = planId;
        this.addBankHistory("deposit", amt, `Mở sổ kỳ hạn ${termDays} ngày (khóa ${money(amt)})`);
        this.sound.playCoinChime();
        this.saveGame();
        this.renderBankTab();
      }
    });
  },

  breakTermDeposit() {
    const bank = this.state.bank;
    if (!(bank.termDepositAmount > 0)) return;
    if (this.state.dayPhase === "open") {
      GameUIModal.showToast("Hãy làm thủ tục sau giờ đóng cửa quán nhé!", "info", "⏱️");
      return;
    }
    const total = bank.activePlan === "term7" ? 7 : 3;
    const elapsed = total - bank.termDaysRemaining;
    const interest = round1(bank.termDepositAmount * SAVINGS_RATES.flexi * elapsed);
    GameUIModal.confirm({
      title: "Rút trước hạn?",
      icon: "⚠️",
      message: `Rút trước hạn chỉ được tính lãi không kỳ hạn: nhận lại <b>${money(bank.termDepositAmount + interest)}</b> (lãi ${money(interest)}).`,
      confirmText: "Rút trước hạn",
      cancelText: "Giữ sổ",
      onConfirm: () => {
        bank.savings = round1(bank.savings + bank.termDepositAmount + interest);
        bank.totalInterestEarned = round1((bank.totalInterestEarned || 0) + interest);
        this.addBankHistory("withdraw", bank.termDepositAmount + interest, "Rút sổ kỳ hạn trước hạn");
        bank.termDepositAmount = 0;
        bank.termDaysRemaining = 0;
        bank.activePlan = "flexi";
        this.saveGame();
        this.renderBankTab();
      }
    });
  },

  selectBankPlan(planId) {
    if (planId === "flexi") {
      this.state.bank.activePlan = "flexi";
      this.saveGame();
      this.renderBankTab();
    }
  },

  // ---------- Chốt sổ cuối ngày ----------
  settleDayFinance() {
    const st = this.state;
    const eco = st.eco;
    const day = st.day;
    const bowls = st.todayBowlsSold || 0;
    const drinks = st.todayDrinksSold || 0;
    const bills = {
      day, rent: 0, electric: 0, water: 0, gas: 0, wages: 0, wagesPaid: 0, taxToday: 0, taxDue: 0, taxPaid: 0,
      lateFee: 0, debtPaid: 0, loanDue: 0, loanPaid: 0, loanInterest: 0, bankInterest: 0, waste: 0, unpaid: 0, staffNames: []
    };
    const pay = amount => {
      const p = Math.max(0, Math.min(st.money, amount));
      st.money = round1(st.money - p);
      return round1(p);
    };

    // Hàng hết hạn bị đổ bỏ
    bills.waste = this.spoilExpiredStock().cost;

    // Thuế khoán tạm tính theo doanh thu hôm nay
    bills.taxToday = this.accrueTax(st.todayEarnings || 0);

    // Lãi tiết kiệm đêm nay
    bills.bankInterest = this.accrueSavingsInterest();

    // Nợ hóa đơn cũ: tính phí chậm trả rồi trả trước tiên
    if (eco.billDebt > 0) {
      const fee = round1(eco.billDebt * DEBT_LATE_FEE);
      eco.billDebt = round1(eco.billDebt + fee);
      bills.lateFee += fee;
      bills.debtPaid = pay(eco.billDebt);
      eco.billDebt = round1(eco.billDebt - bills.debtPaid);
    }

    // Tiền thuê, điện, nước, gas
    const u = this.computeUtilities(bowls, drinks);
    bills.rent = this.getRentCost();
    bills.electric = u.electric;
    bills.water = u.water;
    bills.gas = u.gas;
    const essentials = bills.rent + u.total;
    const essentialsPaid = pay(essentials);
    eco.billDebt = round1(eco.billDebt + (essentials - essentialsPaid));

    // Lương nhân viên
    const payroll = this.computePayroll();
    bills.wages = payroll.total;
    bills.staffNames = payroll.items.map(i => i.name);
    bills.wagesPaid = pay(payroll.total);
    eco.billDebt = round1(eco.billDebt + (payroll.total - bills.wagesPaid));
    const paidRatio = payroll.total > 0 ? bills.wagesPaid / payroll.total : 1;

    // Ngân hàng tự trừ nợ vay
    this.collectLoanInstallment(bills);

    // Kỳ nộp thuế (mỗi 7 ngày)
    if (day % TAX_PERIOD === 0 && eco.tax.accrued > 0) {
      bills.taxDue = eco.tax.accrued;
      bills.taxPaid = pay(bills.taxDue);
      const unpaid = round1(bills.taxDue - bills.taxPaid);
      if (unpaid > 0) {
        eco.billDebt = round1(eco.billDebt + unpaid * 1.1); // nộp chậm bị phạt 10%
        this.adjustCredit(-25);
      }
      eco.tax.accrued = 0;
    }

    // Còn nợ hóa đơn: uy tín & tín dụng tụt
    bills.unpaid = eco.billDebt;
    if (eco.billDebt > 0) {
      eco.debtDays += 1;
      this.adjustCredit(-20);
      if (eco.debtDays >= 2) {
        st.reputation = Math.max(5, st.reputation - 3);
        GameUIModal.showToast(`📉 Tiệm đang nợ ${money(eco.billDebt)} tiền hóa đơn đã ${eco.debtDays} ngày, chủ nợ làm ầm khiến uy tín giảm (−3 ⭐)!`, "warning", "🧾", 4500);
      }
    } else {
      eco.debtDays = 0;
    }

    // Nhân sự cập nhật tâm trạng sau khi trả lương
    bills.hrNotes = this.hrSettleDay(paidRatio);

    st.todayBankInterest = bills.bankInterest;
    st.todayRentCost = bills.rent;
    st.todayStaffWages = bills.wages;
    st.todayExpenses = round1(bills.rent + u.total + bills.wages + bills.taxToday + bills.loanInterest + bills.lateFee);
    eco.lastBills = bills;
    return bills;
  },

  // Phần "Chi phí vận hành" trong hóa đơn kết toán
  buildExpenseReceiptHtml() {
    const b = this.state.eco.lastBills;
    if (!b) return "";
    const row = (label, val, cls = "receipt-val-red") => `<div class="receipt-row"><span>${label}</span><strong class="${cls}">${val}</strong></div>`;
    const free = (label, text) => `<div class="receipt-row"><span>${label}</span><span class="receipt-val-free">${text}</span></div>`;
    let h = `<div class="receipt-section-title">CHI PHÍ VẬN HÀNH</div>`;
    if (this.state.ownedFlagship) h += free("🏛️ Thuê mặt bằng:", "0đ (Sổ Đỏ Flagship 📜)");
    else if (b.rent > 0) h += row(`🏠 Thuê mặt bằng${this.state.staff.torto ? " (Torto −50% 🐢)" : ""}:`, `-${money(b.rent)}`);
    else h += free("🏠 Thuê mặt bằng:", "Miễn phí khai trương ✨");
    h += row("💡 Tiền điện:", `-${money(b.electric)}`);
    h += row("🚰 Tiền nước:", `-${money(b.water)}`);
    h += row("🔥 Gas bếp:", `-${money(b.gas)}`);
    if (b.wages > 0) {
      h += row(`👥 Lương nhân viên (${b.staffNames.length} bạn):`, `-${money(b.wages)}`);
      h += `<div class="receipt-sub-staff">${b.staffNames.join(", ")}</div>`;
    } else {
      h += free("👥 Lương nhân viên:", "Tự quản (chưa thuê) 🐾");
    }
    if (b.taxToday > 0) h += row("🧾 Thuế khoán tạm tính (nộp ngày " + this.getNextTaxDay() + "):", `-${money(b.taxToday)}`);
    else h += free("🧾 Thuế khoán:", this.state.day <= TAX_FREE_DAYS ? `Miễn ${TAX_FREE_DAYS} ngày khai trương` : "Chưa phát sinh");
    if (b.taxPaid > 0) h += row(`📮 Nộp thuế kỳ này (${money(b.taxDue)}):`, `-${money(b.taxPaid)}`);
    if (b.loanDue > 0) h += row("🏧 Trả góp khoản vay:", `-${money(b.loanPaid)}${b.loanPaid < b.loanDue - 0.05 ? ` (thiếu ${money(b.loanDue - b.loanPaid)})` : ""}`);
    if (b.debtPaid > 0) h += row("📑 Trả nợ hóa đơn cũ:", `-${money(b.debtPaid)}`);
    if (b.lateFee > 0) h += row("⚠️ Phí chậm trả & phạt:", `-${money(b.lateFee)}`);
    if (b.waste > 0) h += row("🗑️ Hàng hỏng phải đổ bỏ (giá vốn):", `-${money(b.waste)}`);
    if (b.unpaid > 0) h += `<div class="receipt-sub-staff" style="color:var(--cp-text-bad);font-weight:800;">🚨 Còn nợ hóa đơn ${money(b.unpaid)}, phí chậm trả ${DEBT_LATE_FEE * 100}%/ngày!</div>`;
    if (b.hrNotes && b.hrNotes.length) h += `<div class="receipt-sub-staff">${b.hrNotes.join("<br>")}</div>`;
    return h;
  },

  // ---------- Giao diện ngân hàng ----------
  renderBankTab() {
    const bankSection = document.getElementById("tab-bank");
    if (!bankSection) return;
    const st = this.state;
    const bank = st.bank;

    const $ = id => document.getElementById(id);
    if ($("bank-savings-display")) $("bank-savings-display").textContent = money(bank.savings || 0);
    if ($("bank-current-wallet")) $("bank-current-wallet").textContent = `Ví: ${money(st.money || 0)}`;
    if ($("bank-card-owner")) $("bank-card-owner").textContent = `CHỦ SỔ: ${(st.ownerName || "Bếp Trưởng Mèo").toUpperCase()}`;
    if ($("bank-total-earned")) $("bank-total-earned").textContent = `Tổng lãi nhận: +${money(bank.totalInterestEarned || 0)} 🪙`;
    if ($("bank-max-deposit-limit-text")) $("bank-max-deposit-limit-text").textContent = money(this.getBankDepositLimit());

    const flexiRate = (this.getSavingsRate("flexi") * 100).toFixed(1);
    if ($("bank-interest-sub")) {
      $("bank-interest-sub").innerHTML = `📈 Lãi tiết kiệm: <strong class="text-green">+${flexiRate}%/ngày</strong> (cộng mỗi đêm)`;
    }

    const flagship = $("flagship-real-estate-container");
    if (flagship) {
      const owned = Boolean(st.ownedFlagship);
      flagship.innerHTML = `
        <div class="flagship-estate-card">
          <div class="flagship-estate-sub">🏢 BẤT ĐỘNG SẢN & MẶT BẰNG FLAGSHIP</div>
          <div class="flagship-estate-title"><span>Mặt Bằng Trụ Sở Anime Flagship</span></div>
          ${owned ? `
            <div class="flagship-status-pill"><span>✅ ĐÃ SỞ HỮU SỔ ĐỎ CHÍNH CHỦ</span></div>
            <div class="flagship-estate-desc">🎉 Bạn đã mua đứt tòa nhà trụ sở nên <b>không còn trả tiền thuê mặt bằng</b>. Điện, nước, gas và thuế vẫn phải đóng như mọi quán.</div>
          ` : `
            <div class="flagship-status-pill pending"><span>⏳ ĐANG THUÊ HÀNG NGÀY</span></div>
            <div class="flagship-estate-desc">Mua đứt mặt bằng đắc địa để <b>không phải trả tiền thuê mỗi ngày</b> nữa (điện, nước, gas, thuế vẫn đóng bình thường).</div>
            <button class="btn-buy-flagship" onclick="window.game.buyFlagshipRealEstate()">🏛️ Mua Đứt Mặt Bằng (${money(50000)})</button>
          `}
        </div>`;
    }

    this.renderLoanSection();
    this.renderFinanceSection();

    const plansEl = $("bank-plans-container");
    if (plansEl) {
      const currentPlan = bank.activePlan || "flexi";
      const hasTerm = bank.termDepositAmount > 0 && bank.termDaysRemaining > 0;
      const plans = [
        { id: "flexi", icon: "🌱", name: "Tiết Kiệm Linh Hoạt (Không Kỳ Hạn)", desc: "Nạp rút bất kỳ lúc nào, lãi cộng mỗi đêm trên toàn bộ số dư.", termDays: 0 },
        { id: "term3", icon: "🚀", name: "Kỳ Hạn 3 Ngày", desc: "Khóa một phần tiền gửi 3 ngày để hưởng lãi cao hơn. Rút trước hạn chỉ còn lãi linh hoạt.", termDays: 3 },
        { id: "term7", icon: "👑", name: "Kỳ Hạn 7 Ngày", desc: "Lãi cao nhất cho khoản tiền nhàn rỗi, nhưng khóa 7 ngày.", termDays: 7 }
      ];
      plansEl.innerHTML = plans.map(p => {
        const rate = (this.getSavingsRate(p.id) * 100).toFixed(1);
        const isActive = p.id === "flexi" ? !hasTerm : (hasTerm && currentPlan === p.id);
        let action = "";
        let status = "";
        if (p.id === "flexi") {
          status = `<span class="bank-plan-status-text ${isActive ? "text-green" : ""}">${isActive ? "● Đang áp dụng cho số dư tự do" : "Không khóa vốn"}</span>`;
        } else if (isActive) {
          status = `<span class="bank-plan-status-text text-green">🔒 Đang khóa ${money(bank.termDepositAmount)} (còn ${bank.termDaysRemaining} ngày)</span>`;
          action = `<button class="btn-select-plan" onclick="window.game.breakTermDeposit()">Rút trước hạn</button>`;
        } else {
          status = `<span class="bank-plan-status-text">Khóa tối thiểu 50k</span>`;
          action = hasTerm ? `<button class="btn-select-plan is-current" disabled>Đang có sổ khác</button>` : `
            <span class="bank-term-btns">
              <button class="btn-select-plan" onclick="window.game.promptTermDeposit('${p.id}', ${p.termDays}, 100)">100k</button>
              <button class="btn-select-plan" onclick="window.game.promptTermDeposit('${p.id}', ${p.termDays}, 500)">500k</button>
              <button class="btn-select-plan" onclick="window.game.promptTermDeposit('${p.id}', ${p.termDays}, 'all')">Hết sổ</button>
            </span>`;
        }
        return `
          <div class="bank-plan-card ${isActive ? "active-plan" : ""}">
            <div class="bank-plan-top">
              <div class="bank-plan-name-wrap"><span class="bank-plan-icon">${p.icon}</span><span class="bank-plan-name">${p.name}</span></div>
              <span class="bank-plan-rate-badge">${rate}%/ngày${st.staff.torto ? " 🐢" : ""}</span>
            </div>
            <div class="bank-plan-desc">${p.desc}</div>
            <div class="bank-plan-action-row">${status}${action}</div>
          </div>`;
      }).join("");
    }

    const historyList = $("bank-history-list");
    if (historyList) {
      const history = bank.history || [];
      if (!history.length) {
        historyList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 12px;">Chưa có giao dịch nào. Hãy gửi tiền tiết kiệm hoặc vay vốn để mở rộng quán!</div>`;
      } else {
        const meta = {
          deposit: ["📥", "text-green", "+"], withdraw: ["📤", "text-red", "-"], interest: ["📈", "text-green", "+"],
          term_payout: ["🎉", "text-green", "+"], loan: ["🏧", "text-green", "+"], loan_pay: ["💳", "text-red", "-"], seize: ["⚠️", "text-red", "-"]
        };
        historyList.innerHTML = history.slice(0, 15).map(h => {
          const [icon, cls, sign] = meta[h.type] || ["💰", "text-green", "+"];
          return `
            <div class="bank-history-row">
              <div class="bank-history-left">
                <span>${icon}</span><span class="bank-history-day">Ngày ${h.day || 1}</span><span class="bank-history-title">${h.desc || "Giao dịch"}</span>
              </div>
              <span class="bank-history-val ${cls}">${sign}${money(h.amount || 0)}</span>
            </div>`;
        }).join("");
      }
    }
  },

  renderLoanSection() {
    const el = document.getElementById("bank-loan-container");
    if (!el) return;
    const st = this.state;
    const eco = st.eco;
    const credit = eco.credit;
    const label = this.getCreditLabel();
    const pct = Math.round(((credit - MIN_CREDIT) / (MAX_CREDIT - MIN_CREDIT)) * 100);
    let body;
    if (eco.loan) {
      const l = eco.loan;
      const inst = this.getLoanInstallment(l);
      const overdue = l.daysLeft <= 0;
      body = `
        <div class="loan-active">
          <div class="loan-row"><span>${l.planName}</span><b>Dư nợ ${money(l.balance)}</b></div>
          <div class="loan-row"><span>Gốc vay ${money(l.principal)} · lãi ${(l.rate * 100).toFixed(1)}%/ngày</span><span>${overdue ? "<b class='mk-danger'>QUÁ HẠN</b>" : `Còn ${l.daysLeft} kỳ`}</span></div>
          <div class="loan-row"><span>Đêm nay ngân hàng trừ khoảng</span><b>${money(inst.total)}</b></div>
          ${l.missed > 0 ? `<div class="loan-warn">⚠️ Đã trả thiếu ${l.missed} lần. Trễ 3 lần bị trích sổ tiết kiệm & chặn vay.</div>` : ""}
          <button class="hr-btn" onclick="window.game.repayLoanEarly()">Tất toán sớm (phí 2%)</button>
        </div>`;
    } else if (st.day < eco.blockedLoanUntil) {
      body = `<div class="loan-warn">🚫 Hồ sơ đang bị chặn vay vì nợ xấu. Thử lại từ Ngày ${eco.blockedLoanUntil}.</div>`;
    } else {
      const limit = this.getLoanLimit();
      if (limit < 100) {
        body = `<div class="loan-note">${st.day < 3 ? "Cần kinh doanh tối thiểu 3 ngày để ngân hàng xét hồ sơ vay." : "Điểm tín dụng quá thấp để vay. Hãy trả hóa đơn đúng hạn."}</div>`;
      } else {
        const half = Math.max(100, Math.round(limit / 2 / 50) * 50);
        body = `
          <div class="loan-note">Hạn mức vay hiện tại: <b>${money(limit)}</b> (tăng theo số ngày, doanh thu & điểm tín dụng). Phí giải ngân ${LOAN_FEE * 100}%.</div>
          ${LOAN_PLANS.map(p => `
            <div class="loan-offer">
              <div><b>${p.icon} ${p.name}</b><div class="loan-sub">Lãi ${(p.rate * 100).toFixed(1)}%/ngày · trả góp ${p.days} ngày</div></div>
              <span class="bank-term-btns">
                <button class="btn-select-plan" onclick="window.game.takeLoan('${p.id}', ${half})">${money(half)}</button>
                ${half !== limit ? `<button class="btn-select-plan" onclick="window.game.takeLoan('${p.id}', ${limit})">${money(limit)}</button>` : ""}
              </span>
            </div>`).join("")}`;
      }
    }
    el.innerHTML = `
      <div class="bank-section-box">
        <div class="bank-section-title"><span>🏧 Vay Vốn Kinh Doanh</span><span class="bank-wallet-pill">Tín dụng: ${credit} (${label.text})</span></div>
        <div class="credit-bar"><i class="is-${label.cls}" style="width:${pct}%"></i></div>
        ${body}
      </div>`;
  },

  renderFinanceSection() {
    const el = document.getElementById("bank-finance-container");
    if (!el) return;
    const st = this.state;
    const eco = st.eco;
    const u = this.computeUtilities(20, 8);
    const payroll = this.computePayroll();
    const nextTax = this.getNextTaxDay();
    const b = eco.lastBills;
    el.innerHTML = `
      <div class="bank-section-box">
        <div class="bank-section-title"><span>🧾 Thuế & Chi Phí Cố Định</span><span class="bank-wallet-pill">Nợ hóa đơn: ${money(eco.billDebt)}</span></div>
        <div class="fin-grid">
          <div class="fin-row"><span>🏠 Thuê mặt bằng</span><b>${st.ownedFlagship ? "0đ (sổ đỏ)" : `${money(this.getRentCost())}/ngày`}</b></div>
          <div class="fin-row"><span>💡🚰🔥 Điện nước gas (ước tính)</span><b>~${money(u.total)}/ngày</b></div>
          <div class="fin-row"><span>👥 Quỹ lương</span><b>${money(payroll.total)}/ngày</b></div>
          <div class="fin-row"><span>🧾 Thuế khoán ${TAX_RATE * 100}% doanh thu${st.staff.torto ? " (Torto −30%)" : ""}</span><b>${st.day <= TAX_FREE_DAYS ? `Miễn đến hết Ngày ${TAX_FREE_DAYS}` : `Tạm tính ${money(eco.tax.accrued)}`}</b></div>
          <div class="fin-row"><span>📮 Kỳ nộp thuế tiếp theo</span><b>Cuối Ngày ${nextTax} (còn ${nextTax - st.day} ngày)</b></div>
        </div>
        ${eco.billDebt > 0 ? `<div class="loan-warn">🚨 Đang nợ ${money(eco.billDebt)}. Mỗi đêm bị tính phí chậm trả ${DEBT_LATE_FEE * 100}%, nợ 2 ngày liền là mất uy tín.</div>` : ""}
        ${b ? `<div class="loan-sub">Hóa đơn gần nhất (Ngày ${b.day}): thuê ${money(b.rent)}, điện ${money(b.electric)}, nước ${money(b.water)}, gas ${money(b.gas)}, lương ${money(b.wages)}.</div>` : ""}
      </div>`;
  }
};
