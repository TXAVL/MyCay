// ==========================================================
// TIỆM MỲ CAY - SPICY NOODLE RESTAURANT SIMULATION ENGINE
// Giao diện tinh tế chuẩn Cozy Anime · Thống kê doanh thu chính xác 100%
// Có đầy đủ chế độ Nấu Mì Tương Tác chuẩn 100% screenshot thực tế
// ==========================================================

import { txaversion } from "./txaversion.js?v=2.3.0";
import { txaformat } from "./txaformat.js?v=2.3.0";
import { NameValidator } from "./filter.js?v=2.3.0";
import { SoundManager } from "./audio.js?v=2.3.0";
import { GameUIModal } from "./modal.js?v=2.3.0";
import { rollDailyQuests, dailyChestReward, ACHIEVEMENTS, achievementStatus } from "./quests.js?v=2.3.0";
import { GameIntegrity } from "./integrity.js?v=2.3.0";
import { MarketMethods } from "./market.js?v=2.3.0";
import { HrMethods } from "./hr.js?v=2.3.0";
import { FinanceMethods, createEcoState, mergeEco } from "./finance.js?v=2.3.0";
import { OfflineMethods, emptyOfflineResult, OFFLINE_UNLOCK_DAY, OFFLINE_DAILY_CAP_MIN, OFFLINE_MIN_MINUTES, BOWL_SUPPLIES, DRINK_SUPPLIES } from "./offline.js?v=2.3.0";
import { rateDineIn, rateOnline, analyzeOwnerReply, composeCustomerResponse, inferIssues, getPersona, ISSUE_TEXT } from "./reviews.js?v=2.3.0";

// Hằng số kinh tế dùng chung (v1.7.0): mọi chỗ hiển thị & tính tiền đều đọc từ đây để không lệch nhau
const FEVER_MULT = 1.5; // Giờ Vàng FEVER RUSH nhân doanh thu
const FEVER_SECONDS = 15;
const SIZE_L_SURCHARGE = 7; // Phụ thu niêu size L (k)
const MAX_REVIEWS = 60; // Giữ 60 đánh giá gần nhất: sao trung bình phản ánh phong độ hiện tại & save nhẹ
// Nguyên liệu phụ tiêu hao mỗi phần bán ra (thiếu thì vẫn bán được nhưng món kém ngon: -giá, -sao)

// Giao hàng online: mỗi app thu phí nền tảng khác nhau, giá trên app cao hơn giá tại quán
const DELIVERY_APPS = {
  GrabFood: { commission: 0.2, cls: "app-grab" },
  ShopeeFood: { commission: 0.18, cls: "app-shopee" },
  BeFood: { commission: 0.15, cls: "app-befood" },
  Baemin: { commission: 0.17, cls: "app-baemin" }
};
const DELIVERY_MENU_MARKUP = 1.12;
const DELIVERY_COD_SHARE = 0.3; // Tỉ lệ đơn trả tiền mặt khi nhận hàng (COD)
const DELIVERY_COD_FEE_DISCOUNT = 0.05; // Đơn COD không qua cổng thanh toán nên phí nền tảng thấp hơn 5 điểm %
const DELIVERY_BOM_CHANCE = 0.15; // Khách COD bom hàng (không nhận / không nghe máy)
const DELIVERY_BOM_CONFIRMED = 0.03; // Tỉ lệ bom khi quán đã gọi xác nhận trước
const DELIVERY_SEAL_SEGMENTS = 24; // Số đoạn viền miệng niêu phải miết qua khi ép màng thủ công
const DELIVERY_OFFER_SECONDS = 15; // Thời gian quán được nhận / từ chối đơn mới
const DELIVERY_DRIVER_PATIENCE = 30; // Tài xế chờ tại quán tối đa bao lâu khi món chưa xong
const DELIVERY_PACK_ITEMS = [
  { key: "seal", icon: "🔒", label: "Ép màng niêu", needCooked: true },
  { key: "bag", icon: "🛍️", label: "Túi giữ nhiệt" },
  { key: "cutlery", icon: "🥢", label: "Đũa · ống hút · sốt" },
  { key: "tem", icon: "🏷️", label: "Tem + bill" }
];
// Ghi chú của khách (null = không dặn gì)
const DELIVERY_NOTES = [
  null, null, null,
  { text: "Không cần đũa muỗng, mình có sẵn rồi", noCutlery: true },
  { text: "Nhớ kèm thêm sốt ớt và ống hút giúp mình", needCutlery: true },
  { text: "Ít cay thôi nhé, mình ăn dở cay" },
  { text: "Đóng gói cẩn thận, nhà mình ở xa đó quán ơi" },
  { text: "Tới cổng gọi mình xuống lấy nha" }
];

export class SpicyNoodleGame {
  constructor() {
    this.sound = new SoundManager();
    this.gameSpeed = 1;
    this.particlesEnabled = true;

    // Trạng thái cửa hàng mỳ cay
    this.state = {
      shopName: "Tiệm Mỳ Cay",
      ownerAvatar: "assets/cust_cat.png",
      ownerName: "Bếp Trưởng Mèo Linh", // Tên nhân vật avatar
      ownerFullName: "", // Họ tên thật của chủ tiệm (người chơi nhập)
      day: 1,
      dayPhase: "prep", // "prep" (Chuẩn bị) | "open" (Đang mở cửa bán)
      money: 400, // Đơn vị k = 1.000đ (400k = 400.000đ)
      reputation: 30, // Điểm uy tín ⭐
      lastActiveTime: Date.now(), // Thời điểm hoạt động cuối cùng để tính doanh thu offline
      offline: {
        minutesUsedToday: 0,
        capDate: "", // Ngày thực tế (YYYY-MM-DD) đang tính trần 8 giờ
        totalOfflineProfit: 0,
        totalOfflineBowls: 0,
        totalShifts: 0,
        lastReport: null,
        history: []
      },
      ownedFlagship: false, // Bất động sản Trụ sở Flagship (Sổ đỏ vĩnh viễn miễn phí mặt bằng 0đ/ngày)
      todayEarnings: 0,
      todayBowlsSold: 0,
      todayDrinksSold: 0,
      todaySpicy7Sold: 0,
      todayTips: 0,
      todaySpecialBonus: 0,
      todaySpecialBowlsSold: 0,
      hasBrewedToday: false, // Đã ninh nước dùng & chuẩn bị mỳ chưa
      tutorialDismissed: false,

      // Danh sách các món Mì Cay
      noodles: {
        my_bo: { id: "my_bo", name: "Mì cay Bò Mỹ", icon: "🥩", price: 40, basePrice: 40, unitCost: 12.0, unlockCost: 0, unlocked: true, inMenu: true, stock: 10 },
        my_haisan: { id: "my_haisan", name: "Mì cay Hải Sản", icon: "🦐", price: 45, basePrice: 45, unitCost: 15.0, unlockCost: 0, unlocked: true, inMenu: true, stock: 8 },
        my_thapcam: { id: "my_thapcam", name: "Mì cay Thập Cẩm", icon: "🍲", price: 50, basePrice: 50, unitCost: 18.0, unlockCost: 150, unlocked: false, inMenu: false, stock: 0 },
        my_kimchi: { id: "my_kimchi", name: "Mì cay Kim Chi Xúc Xích", icon: "🥬", price: 38, basePrice: 38, unitCost: 10.0, unlockCost: 150, unlocked: false, inMenu: false, stock: 0 },
        my_tomyum: { id: "my_tomyum", name: "Mì cay Tomyum Thái", icon: "🌶️", price: 48, basePrice: 48, unitCost: 16.0, unlockCost: 250, unlocked: false, inMenu: false, stock: 0 },
        my_nam: { id: "my_nam", name: "Mì cay Lẩu Nấm", icon: "🍄", price: 42, basePrice: 42, unitCost: 12.0, unlockCost: 300, unlocked: false, inMenu: false, stock: 0 },
        my_baongu: { id: "my_baongu", name: "Mì cay Hoàng Gia Bào Ngu", icon: "👑", price: 65, basePrice: 65, unitCost: 25.0, unlockCost: 400, unlocked: false, inMenu: false, stock: 0 }
      },

      // Topping nhúng niêu đất
      toppings: {
        bo: { id: "bo", name: "Bò Mềm", shortName: "Bò mềm", icon: "🥩", price: 15, basePrice: 15, unitCost: 5.0, unlockCost: 0, unlocked: true, inMenu: true, stock: 15 },
        xucxich: { id: "xucxich", name: "Xúc Xích", shortName: "Xúc xích", icon: "🌭", price: 10, basePrice: 10, unitCost: 3.0, unlockCost: 0, unlocked: true, inMenu: true, stock: 12 },
        kimchi: { id: "kimchi", name: "Kim Chi", shortName: "Kim chi", icon: "🥬", price: 10, basePrice: 10, unitCost: 2.5, unlockCost: 0, unlocked: true, inMenu: true, stock: 15 },
        tom: { id: "tom", name: "Tôm Sú", shortName: "Tôm sú", icon: "🦐", price: 25, basePrice: 25, unitCost: 8.0, unlockCost: 180, unlocked: false, inMenu: false, stock: 0 },
        muc: { id: "muc", name: "Mực Ống", shortName: "Mực ống", icon: "🦑", price: 25, basePrice: 25, unitCost: 8.0, unlockCost: 220, unlocked: false, inMenu: false, stock: 0 },
        trung: { id: "trung", name: "Trứng Lòng Đào", shortName: "Trứng", icon: "🥚", price: 12, basePrice: 12, unitCost: 3.5, unlockCost: 120, unlocked: false, inMenu: false, stock: 0 },
        nam: { id: "nam", name: "Nấm Kim Châm", shortName: "Nấm kim", icon: "🍄", price: 10, basePrice: 10, unitCost: 2.5, unlockCost: 90, unlocked: false, inMenu: false, stock: 0 },
        phomai: { id: "phomai", name: "Phô Mai Kéo Sợi", shortName: "Phô mai", icon: "🧀", price: 20, basePrice: 20, unitCost: 6.0, unlockCost: 250, unlocked: false, inMenu: false, stock: 0 },
        top_boba_black: { id: "top_boba_black", name: "Trân Châu Đen Dẻo", shortName: "Boba đen", icon: "🧋", price: 12, basePrice: 12, unitCost: 3.0, unlockCost: 80, unlocked: true, inMenu: true, stock: 15 },
        top_boba_white: { id: "top_boba_white", name: "Trân Châu Trắng 3Q", shortName: "3Q giòn", icon: "⚪", price: 15, basePrice: 15, unitCost: 4.0, unlockCost: 140, unlocked: false, inMenu: false, stock: 0 },
        top_pudding: { id: "top_pudding", name: "Pudding Trứng Tươi", shortName: "Pudding", icon: "🍮", price: 15, basePrice: 15, unitCost: 4.5, unlockCost: 160, unlocked: false, inMenu: false, stock: 0 },
        top_coconut: { id: "top_coconut", name: "Thạch Dừa Giòn Non", shortName: "Thạch dừa", icon: "🥥", price: 12, basePrice: 12, unitCost: 3.5, unlockCost: 110, unlocked: false, inMenu: false, stock: 0 },
        top_cheese_foam: { id: "top_cheese_foam", name: "Kem Cheese Macchiato", shortName: "Kem cheese", icon: "🧀", price: 18, basePrice: 18, unitCost: 5.5, unlockCost: 230, unlocked: false, inMenu: false, stock: 0 }
      },

      // Quầy đồ uống trà sữa & giải khát
      drinks: {
        trasua: { id: "trasua", name: "Trà Sữa Trân Châu", icon: "🧋", price: 25, basePrice: 25, unitCost: 5.0, unlockCost: 0, unlocked: true, inMenu: true, stock: 15 },
        tradao: { id: "tradao", name: "Trà Đào Cam Sả", icon: "🍑", price: 22, basePrice: 22, unitCost: 4.5, unlockCost: 150, unlocked: false, inMenu: false, stock: 0 },
        suatuoi: { id: "suatuoi", name: "Sữa Tươi Lắc Phô Mai", icon: "🥛", price: 28, basePrice: 28, unitCost: 6.0, unlockCost: 220, unlocked: false, inMenu: false, stock: 0 },
        nuocsam: { id: "nuocsam", name: "Nước Sâm Bí Đao", icon: "🌿", price: 15, basePrice: 15, unitCost: 3.0, unlockCost: 100, unlocked: false, inMenu: false, stock: 0 },
        trasua_oolong: { id: "trasua_oolong", name: "Trà Sữa Oolong Nướng", icon: "🧋", price: 32, basePrice: 32, unitCost: 8.0, unlockCost: 180, unlocked: false, inMenu: false, stock: 0 },
        trasua_matcha: { id: "trasua_matcha", name: "Matcha Latte Boba", icon: "🍵", price: 36, basePrice: 36, unitCost: 10.0, unlockCost: 220, unlocked: false, inMenu: false, stock: 0 },
        trasua_taro: { id: "trasua_taro", name: "Trà Sữa Khoai Môn Hoàng Kim", icon: "🍠", price: 35, basePrice: 35, unitCost: 9.0, unlockCost: 250, unlocked: false, inMenu: false, stock: 0 },
        trasua_brownsugar: { id: "trasua_brownsugar", name: "Sữa Tươi Trân Châu Đường Đen", icon: "🥤", price: 40, basePrice: 40, unitCost: 12.0, unlockCost: 320, unlocked: false, inMenu: false, stock: 0 },
        trasua_saltedcoffee: { id: "trasua_saltedcoffee", name: "Cà Phê Muối Boba Macchiato", icon: "☕", price: 38, basePrice: 38, unitCost: 11.0, unlockCost: 280, unlocked: false, inMenu: false, stock: 0 },
        tra_traicay: { id: "tra_traicay", name: "Trà Hoa Quả Nhiệt Đới Boba", icon: "🍹", price: 34, basePrice: 34, unitCost: 9.0, unlockCost: 200, unlocked: false, inMenu: false, stock: 0 }
      },

      // Nguyên liệu phụ trong kho
      supplies: {
        mi_soi: { id: "mi_soi", name: "Mì Sợi Hàn Quốc", icon: "🍜", unitCost: 4.5, stock: 20 },
        nuoc_ham: { id: "nuoc_ham", name: "Nước Hầm Xương", icon: "🍲", unitCost: 5.0, stock: 18 },
        sot_ot: { id: "sot_ot", name: "Sốt Ớt Hiểm 7 Cấp", icon: "🌶️", unitCost: 3.0, stock: 25 },
        nieu_dat: { id: "nieu_dat", name: "Niêu Đất Nung", icon: "🏺", unitCost: 2.0, stock: 30 },
        tra_den: { id: "tra_den", name: "Trà Đen & Oolong Thượng Hạng", icon: "🍃", unitCost: 3.5, stock: 25 },
        sua_tuoi_nguyenkem: { id: "sua_tuoi_nguyenkem", name: "Sữa Tươi Thanh Trùng", icon: "🥛", unitCost: 4.0, stock: 25 },
        duong_den_dailoan: { id: "duong_den_dailoan", name: "Đường Đen Đài Loan & Boba", icon: "🍯", unitCost: 3.0, stock: 30 }
      },

      // Món đặc biệt hôm nay
      specialCombo: {
        noodleId: "my_haisan",
        spicyLevel: 3,
        toppingId: "phomai",
        streak: 0
      },

      // Bàn ghế quán mỳ
      tables: [],

      // Nâng cấp trang thiết bị (12 trang bị chiều sâu)
      upgrades: {
        potCount: 1, // Số bếp niêu đất nấu cùng lúc
        stoveSpeed: 1, // Tốc độ bếp
        tableCount: 3, // Bàn gỗ sồi
        decorScore: 1, // Điểm decor đèn lồng
        chiliSecret: 1, // Sốt ớt bí truyền tăng giá bán
        acCooling: 1, // Điều hòa Daikin tăng kiên nhẫn
        freezerStorage: 1, // Tủ đông trữ lượng kho
        lofiAcoustic: 1, // Loa lofi thư giãn
        autoSealer: 0, // Máy ép màng tự động (+20k/đơn online)
        dualStove: 0, // Bếp niêu đôi (+40% tốc độ nấu)
        airPurifier: 0, // Quạt hút mùi ion khói cay (+35% ăn nhanh)
        zenGarden: 0, // Hồ cá Koi Zen (+50% khách VIP)
        shichimiSpice: 0 // Gia vị 7 vị Shichimi (+25% giá mì cay)
      },

      // Nhân viên tiệm (11 nhân viên toàn năng chuẩn Anime)
      staff: {
        mochi: false, // Mèo tiếp tân đón khách & tăng tip (+35%)
        kenji: false, // Gấu Panda đầu bếp ninh mì tự động
        usagi: false, // Thỏ Usagi bưng bê tự động
        shiba: false, // Cún Shiba tạp vụ dọn bàn & nhặt tip ngẫu nhiên
        shiro: false, // Cáo Shiro thu ngân tự động giao Shipper
        ducky: false, // Vịt Ducky Barista pha chế trà sữa tự động & buff 25% doanh thu nước
        owl: false,   // Cú Mèo Owl Marketing bão khách +40%, đơn online 10s & x2 review 5 sao
        fawn: false,  // Nai Fawn Logistics sỉ chiết khấu -15% & tự động restock kho thông minh
        torto: false, // Cụ Rùa Torto Kế toán trưởng: giảm 50% tiền thuê, giảm 30% thuế, +0,1% lãi tiết kiệm
        tora: false,  // Bạch Hổ Tora Vệ sĩ & an ninh: 85% dỗ dành khách giận dữ ở lại (+30 kiên nhẫn)
        ryu: false    // Thần Long Ryu Linh vật tối thượng: liên tục nạp FEVER & rơi mưa tiền vàng
      },

      // Đơn hàng Online
      onlineOrders: [],
      deliveredOnlineCount: 0,
      // Kinh tế thật (v2.3.0): giá chợ, hạn dùng, hồ sơ nhân viên, khoản vay, thuế, nợ hóa đơn
      eco: createEcoState(),
      codPending: 0, // Tiền mặt COD tài xế đã thu hộ, chờ đối soát cuối ca (k)

      // Đánh giá thực khách
      reviews: [],

      // Khách hàng đã mở khóa trong Bộ sưu tập
      unlockedCustomers: {},

      // Thống kê chính xác toàn diện
      stats: {
        bowlsServed: 0,
        drinksServed: 0,
        spicyMasterServed: 0, // Cấp 6-7 bốc hỏa
        vipServed: 0,
        tipsEarned: 0,
        specialBowlsServed: 0,
        specialBonusEarned: 0,
        totalRevenue: 400,
        bestStreak: 0, // Chuỗi phục vụ liên tiếp dài nhất từng đạt
        fiveStarReviews: 0, // Số đánh giá 5 sao lũy kế (không bị cắt theo MAX_REVIEWS)
        onlineDelivered: 0,
        onlineAccepted: 0, // Số đơn online đã nhận / từ chối / bỏ lỡ: quyết định tỉ lệ nhận đơn
        onlineRejected: 0,
        onlineMissed: 0,
        onlineCancelled: 0,
        onlineLate: 0,
        onlineBombed: 0, // Số đơn COD bị khách bom
        onlineCommissionPaid: 0, // Tổng phí nền tảng đã trả cho các app giao đồ ăn (k)
        questsDone: 0,
        bonusXp: 0 // XP thưởng từ nhiệm vụ / thành tựu (cộng vào cấp độ tiệm)
      },

      // Nhiệm vụ hằng ngày (v1.7.0): 3 nhiệm vụ đổi mới mỗi ngày
      quests: { day: 0, list: [] },
      // Thành tựu đã nhận thưởng: { [id]: true }
      achievements: {},

      // Hệ thống Ngân Hàng Tiết Kiệm (Boba Savings Bank)
      bank: {
        savings: 0, // Tiền gửi tiết kiệm sinh lãi (đơn vị k)
        totalInterestEarned: 0, // Tổng lãi đã nhận lũy kế
        activePlan: "flexi", // Gói tiết kiệm: "flexi" | "term3" | "term7"
        termDepositAmount: 0, // Tiền đang gửi kỳ hạn
        termDaysRemaining: 0, // Ngày còn lại của kỳ hạn
        history: [] // Nhật ký giao dịch
      }
    };

    // Khách hàng thân quen của Tiệm Mì Cay (16 nhân vật phong phú chuẩn Anime Quán Ăn)
    this.customerTemplates = [
      {
        id: "cat_linh",
        name: "Bé Mèo Linh",
        avatar: "assets/cust_cat.png",
        bio: "Sinh viên năm 2 mê chụp ảnh sống ảo, ăn cấp 1-2 và nghiện ngập phô mai kéo sợi.",
        preferredSpicy: [1, 2],
        tipMultiplier: 1.25,
        patience: 48
      },
      {
        id: "shiba_duy",
        name: "Cún Shiba Duy IT",
        avatar: "assets/cust_shiba.png",
        bio: "Coder OT chạy deadline thâu đêm, cần tô mì cấp 3-4 kèm trà sữa boba giải tỏa stress.",
        preferredSpicy: [3, 4],
        tipMultiplier: 1.4,
        patience: 42
      },
      {
        id: "bear_gym",
        name: "Gấu Nâu Đại Gia",
        avatar: "assets/cust_bear.png",
        bio: "Dân gymer mê thử thách niêu mì cấp 6-7 bốc hỏa, ăn khỏe và luôn tip cực phóng khoáng.",
        preferredSpicy: [6, 7],
        tipMultiplier: 2.5,
        patience: 38
      },
      {
        id: "bunny_chiaki",
        name: "Thỏ Con Chiaki",
        avatar: "assets/cust_bunny.png",
        bio: "Du khách Tokyo nhẹ nhàng, mê không gian ấm cúng và thích ăn mì nấm thanh đạm.",
        preferredSpicy: [1, 2],
        tipMultiplier: 1.5,
        patience: 55
      },
      {
        id: "fox_kaito",
        name: "Cáo Kaito Công Sở",
        avatar: "assets/cust_fox.png",
        bio: "Chuyên viên văn phòng thanh lịch, tranh thủ giờ nghỉ trưa ăn tô mì bò Mỹ cấp 2.",
        preferredSpicy: [2, 3],
        tipMultiplier: 1.35,
        patience: 45
      },
      {
        id: "panda_po",
        name: "Gấu Trúc Panda Streamer",
        avatar: "assets/cust_panda.png",
        bio: "Streamer cày rank đêm đói lả, thích niêu mì hải sản cấp 4 xì xèo đã mắt đã miệng.",
        preferredSpicy: [3, 4, 5],
        tipMultiplier: 1.6,
        patience: 40
      },
      {
        id: "tiger_dung",
        name: "Hổ Con Dũng Sĩ",
        avatar: "assets/cust_tiger.png",
        bio: "Học sinh cấp 3 năng động, hay rủ bạn bè thi đua tài ăn cay cấp 5-6 toát mồ hôi.",
        preferredSpicy: [4, 5, 6],
        tipMultiplier: 1.3,
        patience: 35
      },
      {
        id: "hamster_mimi",
        name: "Hamster Mimi Bé Bỏng",
        avatar: "assets/cust_hamster.png",
        bio: "Bé hạt tiêu chỉ ăn được cấp 0-1 nhưng siêu mê trà sữa trân châu và xúc xích rán.",
        preferredSpicy: [0, 1],
        tipMultiplier: 1.2,
        patience: 50
      },
      {
        id: "cat_nga",
        name: "Mèo Nga Food Reviewer",
        avatar: "assets/cust_cat.png",
        bio: "KOL TikTok triệu view đi review quán ăn, soi kỹ từng sợi mì và độ ngọt của nước hầm.",
        preferredSpicy: [2, 3, 4],
        tipMultiplier: 1.8,
        patience: 36
      },
      {
        id: "shiba_tai",
        name: "Bác Tài Shiba Shipper",
        avatar: "assets/cust_shiba.png",
        bio: "Bác tài xế công nghệ chạy xe cả ngày, ghé quán ăn bữa trưa nóng hổi ấm bụng no lâu.",
        preferredSpicy: [2, 3],
        tipMultiplier: 1.2,
        patience: 44
      },
      {
        id: "fox_yuki",
        name: "Nàng Cáo Yuki Designer",
        avatar: "assets/cust_fox.png",
        bio: "Graphic Designer mê nghệ thuật, say đắm hương vị mì tomyum chua cay đậm đà.",
        preferredSpicy: [2, 3],
        tipMultiplier: 1.45,
        patience: 46
      },
      {
        id: "bear_bac",
        name: "Bác Gấu Tổ Trưởng",
        avatar: "assets/cust_bear.png",
        bio: "Hàng xóm thân thiện trong khu phố, hay ghé ủng hộ và khen ngợi chủ tiệm trẻ tuổi.",
        preferredSpicy: [1, 2],
        tipMultiplier: 1.3,
        patience: 60
      },
      {
        id: "bunny_mai",
        name: "Thỏ Mai Sinh Viên Y",
        avatar: "assets/cust_bunny.png",
        bio: "Sinh viên y khoa trực đêm mệt mỏi, cần tô mì kim chi xúc xích tiếp thêm năng lượng.",
        preferredSpicy: [1, 2, 3],
        tipMultiplier: 1.3,
        patience: 48
      },
      {
        id: "tiger_hung",
        name: "HLV Thể Hình Tiger Hùng",
        avatar: "assets/cust_tiger.png",
        bio: "Huấn luyện viên thể hình ăn khỏe, luôn gọi tô size L thêm ngập tràn bò mềm và trứng.",
        preferredSpicy: [3, 4, 5],
        tipMultiplier: 2.0,
        patience: 42
      },
      {
        id: "panda_bao",
        name: "Cậu Bé Panda Gen Z",
        avatar: "assets/cust_panda.png",
        bio: "Gen Z cuồng ẩm thực Hàn Quốc, ăn cay sành sỏi và luôn gọi thêm sữa tươi phô mai lắc.",
        preferredSpicy: [2, 3, 4],
        tipMultiplier: 1.5,
        patience: 40
      },
      {
        id: "hamster_bo",
        name: "Bé Bo Mê Phô Mai",
        avatar: "assets/cust_hamster.png",
        bio: "Khách nhí đáng yêu đi cùng bố mẹ, thích niêu mì ngọt nước hầm xương ngập phô mai.",
        preferredSpicy: [0, 1],
        tipMultiplier: 1.35,
        patience: 55
      },
      {
        id: "owl_tu",
        name: "Cú Mèo Tú Cú Đêm",
        avatar: "assets/staff_owl.png",
        bio: "Cú đêm mê uống trà sữa đậm vị Oolong lúc 2 giờ sáng, vừa chạy deadline vừa nhâm nhi.",
        preferredSpicy: [0, 1, 2],
        tipMultiplier: 1.65,
        patience: 52
      },
      {
        id: "duck_quynh",
        name: "Vịt Quỳnh Sành Trà",
        avatar: "assets/staff_ducky.png",
        bio: "Tín đồ trà sữa chính hiệu, mỗi ngày đều thẩm 2 ly boba full topping kem cheese béo ngậy.",
        preferredSpicy: [0, 1],
        tipMultiplier: 1.5,
        patience: 46
      },
      {
        id: "fawn_bambi",
        name: "Nai Con Bambi",
        avatar: "assets/staff_fawn.png",
        bio: "Bé nai nhút nhát nhưng say đắm trà hoa quả nhiệt đới tươi mát thanh nhiệt.",
        preferredSpicy: [0, 1],
        tipMultiplier: 1.45,
        patience: 60
      },
      {
        id: "squirrel_nutty",
        name: "Sóc Hạt Dẻ Nutty",
        avatar: "assets/cust_hamster.png",
        bio: "Chú sóc nhanh nhẹn thích nhai trân châu 3Q giòn sần sật và topping béo bùi.",
        preferredSpicy: [1, 2],
        tipMultiplier: 1.35,
        patience: 40
      },
      {
        id: "otter_otto",
        name: "Rái Cá Otto Chill Chill",
        avatar: "assets/cust_shiba.png",
        bio: "Chuyên gia chill bờ sông, cầm ly sữa tươi trân châu đường đen ngắm hoàng hôn cực nghệ.",
        preferredSpicy: [1, 2, 3],
        tipMultiplier: 1.6,
        patience: 48
      },
      {
        id: "penguin_pen",
        name: "Cánh Cụt Pen Đam Mê Đá",
        avatar: "assets/cust_panda.png",
        bio: "Đến từ xứ lạnh Nam Cực, luôn gọi ly trà sữa đá mát lạnh tê đầu lưỡi sảng khoái.",
        preferredSpicy: [0, 1],
        tipMultiplier: 1.4,
        patience: 52
      },
      {
        id: "cat_luna",
        name: "Mèo Mun Luna Huyền Bí",
        avatar: "assets/cust_cat.png",
        bio: "Quý cô mèo bí ẩn, sành điệu chỉ uống Matcha Latte boba đậm vị Nhật Bản.",
        preferredSpicy: [2, 3],
        tipMultiplier: 1.75,
        patience: 44
      },
      {
        id: "bear_teddy",
        name: "Gấu Bông Teddy Hảo Ngọt",
        avatar: "assets/cust_bear.png",
        bio: "Chú gấu bự hảo ngọt số một, gọi ly trà sữa size L 150% đường nhân đôi trân châu đen.",
        preferredSpicy: [0, 1, 2],
        tipMultiplier: 2.2,
        patience: 50
      },
      // ==========================================================
      // KHÁCH VIP THẦN TÀI HOÀNG GIA (VIP UPDATE 1.5.5)
      // ==========================================================
      {
        id: "cust_maneki",
        name: "Mèo Thần Tài Maneki Neko",
        avatar: "assets/cust_cat.png",
        bio: "Thần tài phú quý mang vận may triệu đô, tip vàng rủng rỉnh và thích mì tôm hùm hải sản!",
        preferredSpicy: [1, 2, 3],
        tipMultiplier: 3.8,
        patience: 65,
        isVip: true
      },
      {
        id: "cust_shiba_vip",
        name: "Đại Gia Cún Shiba VIP",
        avatar: "assets/cust_shiba.png",
        bio: "Chủ tịch tập đoàn công nghệ siêu giàu, thưởng nóng cọc tiền cho tô mì chuẩn vị!",
        preferredSpicy: [3, 4, 5],
        tipMultiplier: 3.5,
        patience: 55,
        isVip: true
      },
      {
        id: "cust_fox_vip",
        name: "Bạch Cáo Cửu Vĩ VIP",
        avatar: "assets/cust_fox.png",
        bio: "Quý tộc cửu vĩ hồ quyền quý, thưởng thêm vàng bạc châu báu khi được phục vụ chu đáo!",
        preferredSpicy: [2, 3, 4],
        tipMultiplier: 3.6,
        patience: 60,
        isVip: true
      }
    ];

    // Hàng đợi đơn hàng ở chế độ mở bán (3 Slots chuẩn ảnh)
    this.orderSlots = [null, null, null];

    // Niêu đất đang nấu hiện tại ở Workstation trung tâm
    this.currentPot = {
      size: "M", // "M" | "L"
      spicyLevel: 0,
      noodleId: null,
      toppings: [],
      drinkId: null
    };

    // Chế độ Giờ Vàng FEVER RUSH (Tính năng VIP v1.5.5)
    this.feverPoints = 0; // 0 -> 100 điểm
    this.isFeverActive = false;
    this.feverRemainingSeconds = 0;

    // Thời gian ngày (2 phút = 120s - nhịp độ nhanh & quản lý chuẩn mực)
    this.dayDuration = 120;
    this.dayRemaining = 120;
    this.isPaused = false;
    this.dayTimerInterval = null;
    this.customerInterval = null;
    this.onlineOrderInterval = null;
    this.staffAutomationInterval = null;
    this.onlineHistory = []; // Nhật ký đơn online gần nhất (chỉ trong phiên chơi)
    this.onlineRenderSig = "";
    this.onlineSeq = 100 + Math.floor(Math.random() * 600);
    this.mobileOpenTab = "cockpit"; // "cockpit" (Bếp nấu 0-cuộn) | "dining" (Sảnh ăn 3 bàn)
    this.cookingDockTab = "quick"; // "quick" | "noodle" | "topping" | "spicy" | "drink"
    this.reviewFilter = "all"; // "all" | "star5" | "bad" | "unreplied" | "online"

    // Đội ngũ Shipper đối tác phong phú & sống động (GrabFood, ShopeeFood, BeFood, Baemin)
    this.shipperTemplates = [
      {
        name: "Bác Tài Shiba",
        avatar: "assets/cust_shiba.png",
        vehicle: "Honda Wave • 59-X1 888.88",
        quote: "Quán đóng gói niêu kỹ ghê, khách khen nước hầm nóng hổi suốt!"
      },
      {
        name: "Shipper Mèo Miu",
        avatar: "assets/cust_cat.png",
        vehicle: "Yamaha Grande • 29-B1 666.99",
        quote: "Đơn này khách dặn ép màng chống tràn cẩn thận nha chủ tiệm ơi!"
      },
      {
        name: "Tài Xế Gấu Bự",
        avatar: "assets/cust_bear.png",
        vehicle: "SH Mode 150 • 43-C1 999.77",
        quote: "Thùng giữ nhiệt của tui bao ấm nóng 100%, bảo đảm mì còn bốc khói!"
      },
      {
        name: "Shipper Cáo Kaito",
        avatar: "assets/cust_fox.png",
        vehicle: "Vespa Sprint • 60-F2 777.66",
        quote: "Giao hỏa tốc 15 phút, khách nhận niêu mì khen nức nở tiệm chu đáo!"
      }
    ];
  }

  init() {
    this.loadGame();
    this.ensureDailyQuests();
    this.initTables();
    this.renderAll();
    this.initPedestrianSimulation();
    this.initOfflineTracking();
  }

  // Khởi tạo mô phỏng dòng người đi bộ và khách hàng tấp nập dạo phố
  initPedestrianSimulation() {
    if (this.pedestrianInterval) clearInterval(this.pedestrianInterval);

    const pedestrians = [
      { name: "Bé Mèo Linh", avatar: "assets/cust_cat.png", quotes: ["Mùi mì bò hầm thơm nức mũi! 🤤", "Lát mở quán nhớ ăn cấp 2!", "Quán này decor cưng xỉu! 💖"] },
      { name: "Cún Shiba Duy", avatar: "assets/cust_shiba.png", quotes: ["Đang chạy deadline đói bụng quá! 💻", "Mì cay cấp 4 giải tỏa stress số một!", "Bao giờ mở bán ta, chờ nãy giờ 🍜"] },
      { name: "Gấu Nâu Đại Gia", avatar: "assets/cust_bear.png", quotes: ["Hôm nay quyết thử Mì Cay Cấp 7 bốc hỏa! 🔥", "Nước hầm niêu đất ở đây đỉnh thật sự!", "Ăn tô size L cho đã cái nư! 🌶️"] },
      { name: "Thỏ Con Chiaki", avatar: "assets/cust_bunny.png", quotes: ["Trời lành lạnh ăn niêu đất là ấm bụng liền! ❄️", "Nghe đồn quán có bé Mèo Mochi siêu cưng! 🐱", "Quán này review 5 sao trên mạng nè! ⭐"] },
      { name: "Cáo Kaito Công Sở", avatar: "assets/cust_fox.png", quotes: ["Vừa hết giờ làm là phi sang ngay! 👔", "Tô mì cay kèm ly trà đào giải nhiệt đỉnh!", "Mùi thơm bay khắp cả con phố! ✨"] },
      { name: "Gấu Trúc Panda", avatar: "assets/cust_panda.png", quotes: ["Đang đói hoa cả mắt, làm tô hải sản thôi! 🎧", "Livestream khoe tô mì cay cấp 4 mới được!", "Bếp nấu xì xèo nghe thích tai ghê! 🍲"] },
      { name: "Hổ Con Dũng Sĩ", avatar: "assets/cust_tiger.png", quotes: ["Ai dám solo ăn cay cấp 6 với tui không?! 🚩", "Tan học là phải ghé làm bát mì cay liền!", "Topping ngập tràn nhìn thèm quá! 🌭"] },
      { name: "Hamster Mimi", avatar: "assets/cust_hamster.png", quotes: ["Em thích trà sữa trân châu ở đây lắm nè! 🧋", "Niêu mì bốc khói nghi ngút nhìn mê quá!", "Cho em thêm phô mai kéo sợi nha tiệm ơi! 🧀"] }
    ];

    const spawnPedestrian = () => {
      const container = document.getElementById("pedestrians-walking-track");
      if (!container) return;

      const pData = pedestrians[Math.floor(Math.random() * pedestrians.length)];
      const quote = pData.quotes[Math.floor(Math.random() * pData.quotes.length)];
      const fromLeft = Math.random() > 0.5;

      const pedEl = document.createElement("div");
      pedEl.className = "pedestrian-walker";
      pedEl.style.left = fromLeft ? "-60px" : "105%";

      pedEl.innerHTML = `
        <div class="pedestrian-bubble">${quote}</div>
        <img src="${pData.avatar}" class="pedestrian-avatar-img" alt="${pData.name}" onerror="this.src='assets/cust_cat.png'" />
      `;

      container.appendChild(pedEl);

      const duration = 6500 + Math.random() * 2500;
      let start = null;
      const initialPos = fromLeft ? -60 : (container.clientWidth || 380);
      const endPos = fromLeft ? (container.clientWidth || 380) + 60 : -80;

      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const currentPos = initialPos + (endPos - initialPos) * progress;
        pedEl.style.transform = `translateX(${currentPos}px) scaleX(${fromLeft ? 1 : -1})`;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          pedEl.remove();
        }
      };

      requestAnimationFrame(step);
    };

    // Tạo ngay 1 khách đi ngang
    setTimeout(spawnPedestrian, 600);
    // Vòng lặp định kỳ cứ 4.5 giây lại có người đi qua
    this.pedestrianInterval = setInterval(spawnPedestrian, 4500);
  }

  initTables() {
    if (!this.state.tables || this.state.tables.length === 0) {
      this.state.tables = [];
      const count = this.state.upgrades.tableCount || 3;
      for (let i = 1; i <= count; i++) {
        this.state.tables.push({
          id: i,
          status: "empty", // "empty" | "waiting" | "eating" | "dirty"
          customer: null,
          order: null,
          patience: 100,
          maxPatience: 100
        });
      }
    }
  }

  saveGame() {
    // Đang khôi phục bản sao lưu -> không ghi đè dữ liệu vừa nạp trước khi tải lại trang
    if (window.__mycayRestoring) return;
    try {
      // Mốc hoạt động chỉ tiến, không lùi (chống chỉnh đồng hồ để nhận doanh thu offline nhiều lần)
      this.state.lastActiveTime = Math.max(Number(this.state.lastActiveTime) || 0, Date.now());
      const raw = JSON.stringify(this.state);
      localStorage.setItem("mycay_save_data", raw);
      GameIntegrity.sign(raw);
    } catch (e) {
      console.warn("Không lưu được game:", e);
    }
  }

  // Thêm đánh giá mới: giữ MAX_REVIEWS bài gần nhất, đếm 5 sao lũy kế cho thành tựu & nhiệm vụ
  addReview(review) {
    this.state.reviews.unshift(review);
    if (this.state.reviews.length > MAX_REVIEWS) this.state.reviews.length = MAX_REVIEWS;
    if (review.stars === 5) {
      this.state.stats.fiveStarReviews = (this.state.stats.fiveStarReviews || 0) + 1;
      this.trackProgress("review5");
    }
    this.updateReviewBadge();
  }

  // ==========================================================
  // NHIỆM VỤ HẰNG NGÀY & THÀNH TỰU (v1.7.0)
  // ==========================================================
  ensureDailyQuests() {
    const q = this.state.quests;
    if (!q || q.day !== this.state.day || !Array.isArray(q.list) || q.list.length === 0) {
      this.state.quests = rollDailyQuests(this, this.state.day);
    }
    return this.state.quests;
  }

  // Cộng tiến độ nhiệm vụ theo sự kiện trong ca bán
  trackProgress(event, data = {}) {
    const quests = this.ensureDailyQuests();
    const inc = {};
    if (event === "serve") {
      inc.bowls = 1;
      inc.earn = data.earned || 0;
      if (data.isVip) inc.vip = 1;
      if (data.isSpecial) inc.special = 1;
      if (data.isSpeedy) inc.speedy = 1;
      if (data.withDrink) inc.drinks = 1;
      if (data.spicy >= 5) inc.spicy = 1;
    } else if (event === "online") {
      inc.online = 1;
      inc.earn = data.earned || 0;
    } else if (event === "fever") {
      inc.fever = 1;
    } else if (event === "review5") {
      inc.fiveStar = 1;
    }

    quests.list.forEach(quest => {
      if (quest.claimed || quest.progress >= quest.target) return;
      if (quest.metric === "streak") {
        if (event === "streak") quest.progress = Math.max(quest.progress, this.serveStreak || 0);
      } else if (inc[quest.metric]) {
        quest.progress += inc[quest.metric];
      }
      if (quest.progress >= quest.target) {
        quest.progress = quest.target;
        this.state.stats.questsDone = (this.state.stats.questsDone || 0) + 1;
        GameUIModal.showToast(`🎯 Hoàn thành nhiệm vụ: ${quest.title}! Vào tab Nhiệm vụ nhận thưởng nhé.`, "success", quest.icon);
      }
    });

    this.updateQuestBadges();
  }

  grantReward(reward, label) {
    const money = reward.money || 0;
    const xp = reward.xp || 0;
    this.state.money += money;
    this.state.stats.bonusXp = (this.state.stats.bonusXp || 0) + xp;
    this.sound.playCoinChime();
    GameUIModal.showToast(`${label}: +${txaformat.formatVND(money)} & +${xp} XP!`, "success", "🎁");
  }

  claimQuest(idx) {
    const quests = this.ensureDailyQuests();
    const quest = quests.list[idx];
    if (!quest || quest.claimed || quest.progress < quest.target) return;
    quest.claimed = true;
    this.grantReward(quest.reward, `Thưởng nhiệm vụ ${quest.icon}`);
    this.afterRewardClaimed();
  }

  claimQuestChest() {
    const quests = this.ensureDailyQuests();
    if (quests.chestClaimed || !quests.list.every(q => q.claimed)) return;
    quests.chestClaimed = true;
    this.grantReward(dailyChestReward(this.state.day), "🎁 Rương Thưởng Ngày");
    this.afterRewardClaimed();
  }

  claimAchievement(id) {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach || !achievementStatus(this, ach).ready) return;
    this.state.achievements[id] = true;
    this.grantReward(ach.reward, `🏆 ${ach.name} bậc ${ach.tier}`);
    this.afterRewardClaimed();
  }

  afterRewardClaimed() {
    this.saveGame();
    this.renderHeader();
    this.renderQuestsTab();
    this.updateQuestBadges();
  }

  // Nhận tự động phần thưởng nhiệm vụ đã xong nhưng quên bấm nhận trước khi sang ngày mới
  autoClaimPendingQuests() {
    const quests = this.state.quests;
    if (!quests || !Array.isArray(quests.list) || quests.day !== this.state.day) return 0;
    let money = 0;
    let xp = 0;
    quests.list.forEach(q => {
      if (!q.claimed && q.progress >= q.target) {
        q.claimed = true;
        money += q.reward.money || 0;
        xp += q.reward.xp || 0;
      }
    });
    if (!quests.chestClaimed && quests.list.length > 0 && quests.list.every(q => q.claimed)) {
      quests.chestClaimed = true;
      const chest = dailyChestReward(this.state.day);
      money += chest.money;
      xp += chest.xp;
    }
    this.state.money += money;
    this.state.stats.bonusXp = (this.state.stats.bonusXp || 0) + xp;
    return money;
  }

  countClaimable() {
    const quests = this.ensureDailyQuests();
    let n = quests.list.filter(q => !q.claimed && q.progress >= q.target).length;
    if (!quests.chestClaimed && quests.list.length > 0 && quests.list.every(q => q.claimed)) n += 1;
    n += ACHIEVEMENTS.filter(a => achievementStatus(this, a).ready).length;
    return n;
  }

  updateQuestBadges() {
    const quests = this.ensureDailyQuests();
    const claimable = this.countClaimable();
    const navBtn = document.querySelector('.nav-grid-btn[data-tab="tab-quests"]');
    if (navBtn) {
      let dot = navBtn.querySelector(".nav-badge-dot");
      if (claimable > 0) {
        if (!dot) {
          dot = document.createElement("span");
          dot.className = "nav-badge-dot";
          navBtn.appendChild(dot);
        }
        dot.textContent = claimable > 9 ? "9+" : String(claimable);
      } else if (dot) {
        dot.remove();
      }
    }

    const chip = document.getElementById("kt-quest");
    if (chip) {
      const done = quests.list.filter(q => q.progress >= q.target).length;
      const text = `🎯 ${done}/${quests.list.length}`;
      if (chip.textContent !== text) chip.textContent = text;
      chip.classList.toggle("is-done", done === quests.list.length && quests.list.length > 0);
    }
  }

  // Bấm chip 🎯 trong bếp: xem nhanh tiến độ mà không phải rời ca bán
  showQuestTracker() {
    const quests = this.ensureDailyQuests();
    const lines = quests.list.map(q => `${q.progress >= q.target ? "✅" : q.icon} ${q.title} (${q.progress}/${q.target})`).join(" · ");
    GameUIModal.showToast(lines || "Chưa có nhiệm vụ hôm nay", "info", "🎯", 4200);
  }

  renderQuestsTab() {
    const listEl = document.getElementById("quest-daily-list");
    const achEl = document.getElementById("quest-achievement-list");
    const chestEl = document.getElementById("quest-chest-box");
    if (!listEl || !achEl) return;

    const quests = this.ensureDailyQuests();
    const dayEl = document.getElementById("quest-day-label");
    if (dayEl) dayEl.textContent = `Ngày ${this.state.day}`;

    listEl.innerHTML = quests.list.map((q, idx) => {
      const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
      const isDone = q.progress >= q.target;
      const btn = q.claimed
        ? '<button class="quest-claim-btn is-claimed" disabled>✓ Đã nhận</button>'
        : (isDone
          ? `<button class="quest-claim-btn is-ready" onclick="window.game.claimQuest(${idx})">Nhận 🎁</button>`
          : `<span class="quest-claim-btn is-locked">${q.progress}/${q.target}</span>`);
      return `
        <div class="quest-card ${isDone ? "is-done" : ""} ${q.claimed ? "is-claimed" : ""}">
          <div class="quest-icon">${q.icon}</div>
          <div class="quest-body">
            <div class="quest-title">${q.title}</div>
            <div class="quest-bar"><i style="width:${pct}%"></i></div>
            <div class="quest-reward">🪙 +${txaformat.formatVND(q.reward.money)} · ✨ +${q.reward.xp} XP</div>
          </div>
          ${btn}
        </div>
      `;
    }).join("");

    if (chestEl) {
      const claimedCount = quests.list.filter(q => q.claimed).length;
      const chest = dailyChestReward(this.state.day);
      const canOpen = !quests.chestClaimed && claimedCount === quests.list.length && quests.list.length > 0;
      chestEl.className = `quest-chest ${canOpen ? "is-ready" : ""} ${quests.chestClaimed ? "is-opened" : ""}`;
      chestEl.innerHTML = `
        <span class="quest-chest-icon">${quests.chestClaimed ? "📭" : "🎁"}</span>
        <span class="quest-chest-text">
          <b>Rương Thưởng Ngày</b>
          <small>${quests.chestClaimed ? "Đã mở hôm nay · Quay lại vào ngày mai!" : `Nhận đủ 3 nhiệm vụ (${claimedCount}/3) · +${txaformat.formatVND(chest.money)} & +${chest.xp} XP`}</small>
        </span>
        ${canOpen ? '<button class="quest-claim-btn is-ready" onclick="window.game.claimQuestChest()">Mở 🎉</button>' : ""}
      `;
    }

    // Mỗi nhóm thành tựu chỉ hiện bậc đang theo đuổi (hoặc bậc cuối nếu đã xong hết)
    const groups = {};
    ACHIEVEMENTS.forEach(a => {
      (groups[a.key] = groups[a.key] || []).push(a);
    });
    const unlockedTotal = ACHIEVEMENTS.filter(a => this.state.achievements[a.id]).length;
    const countEl = document.getElementById("quest-ach-count");
    if (countEl) countEl.textContent = `${unlockedTotal}/${ACHIEVEMENTS.length} bậc`;

    achEl.innerHTML = Object.values(groups).map(tiersList => {
      const current = tiersList.find(a => !this.state.achievements[a.id]) || tiersList[tiersList.length - 1];
      const st = achievementStatus(this, current);
      const allDone = tiersList.every(a => this.state.achievements[a.id]);
      const pct = Math.min(100, Math.round((st.value / current.target) * 100));
      const stars = tiersList.map(a => `<i class="${this.state.achievements[a.id] ? "on" : ""}"></i>`).join("");
      const btn = allDone
        ? '<span class="quest-claim-btn is-claimed">🏆 Max</span>'
        : (st.ready
          ? `<button class="quest-claim-btn is-ready" onclick="window.game.claimAchievement('${current.id}')">Nhận 🏆</button>`
          : `<span class="quest-claim-btn is-locked">+${current.reward.money}k</span>`);
      return `
        <div class="ach-card ${st.ready ? "is-ready" : ""} ${allDone ? "is-max" : ""}">
          <div class="ach-icon">${current.icon}</div>
          <div class="quest-body">
            <div class="quest-title">${current.name} <span class="ach-tiers">${stars}</span></div>
            <div class="quest-bar is-ach"><i style="width:${allDone ? 100 : pct}%"></i></div>
            <div class="quest-reward">${Math.min(st.value, current.target).toLocaleString("vi-VN")}/${current.target.toLocaleString("vi-VN")} ${current.unit}</div>
          </div>
          ${btn}
        </div>
      `;
    }).join("");

    this.updateQuestBadges();
  }

  loadGame() {
    const saved = localStorage.getItem("mycay_save_data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Chữ ký không khớp = bản lưu bị sửa tay ngoài game
        if (GameIntegrity.isSaveTampered(saved)) GameIntegrity.addFlag("save_edited");
        GameIntegrity.scanState(parsed);
        // Deep merge noodles, toppings, drinks, supplies, upgrades, staff, stats
        if (parsed.noodles) {
          for (const k in this.state.noodles) {
            if (parsed.noodles[k]) {
              Object.assign(this.state.noodles[k], parsed.noodles[k]);
            }
          }
        }
        if (parsed.toppings) {
          for (const k in this.state.toppings) {
            if (parsed.toppings[k]) {
              Object.assign(this.state.toppings[k], parsed.toppings[k]);
            }
          }
        }
        if (parsed.drinks) {
          for (const k in this.state.drinks) {
            if (parsed.drinks[k]) {
              Object.assign(this.state.drinks[k], parsed.drinks[k]);
            }
          }
        }
        if (parsed.supplies) {
          for (const k in this.state.supplies) {
            if (parsed.supplies[k]) {
              Object.assign(this.state.supplies[k], parsed.supplies[k]);
            }
          }
        }
        if (parsed.upgrades) Object.assign(this.state.upgrades, parsed.upgrades);
        if (parsed.staff) Object.assign(this.state.staff, parsed.staff);
        if (parsed.stats) Object.assign(this.state.stats, parsed.stats);
        // Đảm bảo tổng doanh thu lũy kế qua các ngày luôn được theo dõi chính xác
        if (typeof this.state.stats.totalRevenue !== "number" || this.state.stats.totalRevenue <= 0) {
          const estimatedEarnings = Math.max(0, (this.state.day - 1) * 350);
          this.state.stats.totalRevenue = Math.max(this.state.money || 400, 400 + estimatedEarnings);
        }
        if (this.state.money > this.state.stats.totalRevenue) {
          this.state.stats.totalRevenue = this.state.money;
        }
        if (parsed.specialCombo) Object.assign(this.state.specialCombo, parsed.specialCombo);
        // v1.7.0: trước đây Ngày & trạng thái ninh nước dùng không được nạp lại -> tải lại trang là quay về Ngày 1
        if (Number.isFinite(parsed.day) && parsed.day >= 1) this.state.day = Math.floor(parsed.day);
        if (typeof parsed.hasBrewedToday === "boolean") this.state.hasBrewedToday = parsed.hasBrewedToday;
        if (Number.isFinite(parsed.deliveredOnlineCount)) this.state.deliveredOnlineCount = parsed.deliveredOnlineCount;
        if (Number.isFinite(parsed.codPending)) this.state.codPending = parsed.codPending;
        if (parsed.quests && typeof parsed.quests === "object") this.state.quests = parsed.quests;
        if (parsed.achievements && typeof parsed.achievements === "object") this.state.achievements = parsed.achievements;
        if (typeof parsed.money === "number") this.state.money = parsed.money;
        if (typeof parsed.reputation === "number") this.state.reputation = parsed.reputation;
        if (typeof parsed.lastActiveTime === "number") this.state.lastActiveTime = parsed.lastActiveTime;
        if (parsed.offline && typeof parsed.offline === "object") this.state.offline = parsed.offline;
        if (typeof parsed.ownedFlagship === "boolean") this.state.ownedFlagship = parsed.ownedFlagship;
        if (Array.isArray(parsed.reviews)) {
          this.state.reviews = parsed.reviews.slice(0, MAX_REVIEWS);
        }
        if (parsed.unlockedCustomers && typeof parsed.unlockedCustomers === "object") {
          this.state.unlockedCustomers = parsed.unlockedCustomers;
        }
        if (parsed.shopName) this.state.shopName = parsed.shopName;
        if (parsed.ownerAvatar) this.state.ownerAvatar = parsed.ownerAvatar;
        if (parsed.ownerName) this.state.ownerName = parsed.ownerName;
        if (typeof parsed.ownerFullName === "string") this.state.ownerFullName = parsed.ownerFullName;
        if (parsed.tutorialDismissed) this.state.tutorialDismissed = parsed.tutorialDismissed;
        if (parsed.eco && typeof parsed.eco === "object") this.state.eco = mergeEco(parsed.eco);
        if (parsed.bank && typeof parsed.bank === "object") {
          this.state.bank = Object.assign({
            savings: 0,
            totalInterestEarned: 0,
            activePlan: "flexi",
            termDepositAmount: 0,
            termDaysRemaining: 0,
            history: []
          }, parsed.bank);
        }
      } catch (e) {
        console.error("Lỗi nạp game:", e);
      }
    }

    if (!this.state.bank) {
      this.state.bank = {
        savings: 0,
        totalInterestEarned: 0,
        activePlan: "flexi",
        termDepositAmount: 0,
        termDaysRemaining: 0,
        history: []
      };
    }

    // Đảm bảo luôn có basePrice thị trường chuẩn cho toàn bộ món ăn & đồ uống
    for (const k in this.state.noodles) {
      if (!this.state.noodles[k].basePrice) this.state.noodles[k].basePrice = this.state.noodles[k].price || 40;
    }
    for (const k in this.state.toppings) {
      if (!this.state.toppings[k].basePrice) this.state.toppings[k].basePrice = this.state.toppings[k].price || 15;
    }
    for (const k in this.state.drinks) {
      if (!this.state.drinks[k].basePrice) this.state.drinks[k].basePrice = this.state.drinks[k].price || 25;
    }

    // Luôn đảm bảo khi nạp trang web, tiệm mỳ bắt đầu ở chế độ chuẩn bị an toàn
    this.state.dayPhase = "prep";
    if (!this.state.shopName) this.state.shopName = "Tiệm Mỳ Cay";
    if (!Array.isArray(this.state.reviews)) this.state.reviews = [];

    // Kiểm tra & trao thưởng doanh thu offline khi người chơi quay lại tiệm
    this.checkOfflineEarnings();
  }

  // Mở modal hướng dẫn chi tiết cách cày điểm Danh Tiếng
  openReputationGuide() {
    GameUIModal.alert({
      title: "BÍ KÍP CÀY ĐIỂM DANH TIẾNG ⭐",
      icon: "👑",
      message: `
        <div style="text-align: left; font-size: 12.5px; line-height: 1.5; color: var(--text-main); display: flex; flex-direction: column; gap: 8px;">
          <div style="background: rgba(245, 158, 11, 0.12); padding: 8px 10px; border-radius: 8px; border-left: 3px solid #F59E0B;">
            <b>⭐ Điểm hiện tại:</b> <span style="font-weight: 800; color: #D97706; font-size: 14px;">${this.state.reputation || 30} ⭐ Danh tiếng</span>
          </div>
          <div><b>1. 🍜 Phục vụ nhanh & đúng món:</b> Khách hài lòng chấm 4★ - 5★ cộng ngay <b>+1 đến +3 ⭐</b> Danh tiếng mỗi tô! (Khách chờ lâu bỏ về bị trừ -4 ⭐).</div>
          <div><b>2. 💌 Phản hồi Sổ Tay Đánh Giá (Tab 4):</b> Chủ tiệm gửi phản hồi tử tế hoặc đền voucher xoa dịu khách sẽ được cộng ngay <b>+2 đến +4 ⭐</b> Danh tiếng!</div>
          <div><b>3. 🎯 Hoàn thành Nhiệm Vụ Hằng Ngày (Tab 8):</b> Mỗi nhiệm vụ hoàn thành đem lại XP và rương danh tiếng.</div>
          <div><b>4. 🏮 Nâng cấp Đèn Lồng Đỏ (Tab 4):</b> Nâng điểm decor kéo khách đông đúc và nâng tầm uy tín quán khắp khu phố.</div>
        </div>
      `,
      btnText: "Đã Hiểu 💖"
    });
  }

  // ==========================================================
  // DOANH THU OFFLINE (MỞ KHÓA TỪ NGÀY 30)
  // Nhân viên bán hàng thật khi người chơi vắng mặt: dùng đúng menu, giá bán & tồn kho,
  // trừ nguyên liệu phụ, giới hạn 8 giờ mỗi ngày thực tế và bỏ qua khi đồng hồ máy bị chỉnh lùi.
  // ==========================================================
  ensureOfflineState() {
    this.state.offline = Object.assign({
      minutesUsedToday: 0,
      capDate: "",
      totalOfflineProfit: 0,
      totalOfflineBowls: 0,
      totalShifts: 0,
      lastReport: null,
      history: []
    }, this.state.offline || {});
    if (!Array.isArray(this.state.offline.history)) this.state.offline.history = [];
    return this.state.offline;
  }

  localDateKey(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  checkOfflineEarnings() {
    const now = Date.now();
    const off = this.ensureOfflineState();
    const last = Number(this.state.lastActiveTime) || 0;

    // Đồng hồ máy đang lùi so với lần hoạt động cuối (từng tua giờ lên trước) -> giữ nguyên mốc,
    // phải chờ thời gian thật vượt qua mốc đó mới được tính tiếp
    if (last && now < last) {
      console.warn("[Offline] Đồng hồ thiết bị lùi so với lần chơi trước, tạm dừng doanh thu offline.");
      return null;
    }
    this.state.lastActiveTime = now;

    // Chưa tới Ngày 30 hoặc không có nhân viên nào thì không ai mở cửa hộ, không cần báo cáo
    if (!last || !this.state.day || this.state.day < OFFLINE_UNLOCK_DAY || !this.getHiredStaffKeys().length) return null;

    const elapsedMinutes = Math.floor((now - last) / 60000);
    if (elapsedMinutes < OFFLINE_MIN_MINUTES) return null;

    const today = this.localDateKey(now);
    if (off.capDate !== today) {
      off.capDate = today;
      off.minutesUsedToday = 0;
    }
    const remaining = Math.max(0, OFFLINE_DAILY_CAP_MIN - off.minutesUsedToday);
    const minutes = Math.min(elapsedMinutes, remaining);

    const result = minutes > 0 ? this.simulateOfflineSales(minutes) : emptyOfflineResult();

    // Chỉ trừ hạn mức cho thời gian quán thực sự mở bán (đóng sớm vì hết hàng thì không mất phần còn lại)
    off.minutesUsedToday += result.openMinutes || 0;
    this.applyOfflineResult(result);
    off.totalOfflineProfit += result.netProfit;
    off.totalOfflineBowls += result.bowls;
    if (result.bowls > 0) off.totalShifts += 1;

    const report = Object.assign({ at: now, elapsedMinutes, minutes, usedToday: off.minutesUsedToday }, result);
    off.lastReport = report;
    off.history.unshift({ at: now, minutes: result.openMinutes || 0, bowls: result.bowls, netProfit: result.netProfit });
    if (off.history.length > 10) off.history.length = 10;

    // Lưu ngay để tải lại trang không nhận thưởng thêm lần nữa
    this.saveGame();
    setTimeout(() => this.showOfflineRevenueModal(report), 800);
    return report;
  }

  // Theo dõi thời điểm hoạt động: ẩn tab lâu rồi quay lại cũng được tính doanh thu offline
  initOfflineTracking() {
    if (this.offlineTrackingReady) return;
    this.offlineTrackingReady = true;

    setInterval(() => {
      if (document.visibilityState === "visible") this.saveGame();
    }, 30000);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.saveGame();
      } else if (this.state.dayPhase === "prep") {
        if (this.checkOfflineEarnings()) this.renderAll();
      } else {
        // Đang trong ca bán: game vẫn chạy nền nên chỉ cập nhật mốc thời gian
        this.saveGame();
      }
    });
    window.addEventListener("pagehide", () => this.saveGame());
  }

  formatOfflineDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
  }

  resetGame() {
    GameUIModal.confirm({
      title: "Xóa Dữ Liệu & Chơi Lại?",
      message: "Bạn có chắc muốn đặt lại toàn bộ tiệm mỳ để xây dựng cơ ngơi từ đầu không?",
      icon: "🍜",
      confirmText: "Đồng Ý Xóa",
      cancelText: "Giữ Lại",
      onConfirm: () => {
        localStorage.removeItem("mycay_save_data");
        localStorage.removeItem("mycay_seen_version");
        localStorage.removeItem("mycay_coachmark_seen");
        localStorage.removeItem("mycay_first_name_set");
        location.reload();
      }
    });
  }

  // ==========================================================
  // RENDER TOÀN BỘ GIAO DIỆN
  // ==========================================================
  renderAll() {
    this.renderHeader();
    const prepView = document.getElementById("view-prep-mode");
    const openView = document.getElementById("view-open-mode");

    if (this.state.dayPhase === "prep") {
      if (prepView) prepView.style.display = "block";
      if (openView) openView.style.display = "none";
    } else {
      if (prepView) prepView.style.display = "none";
      if (openView) openView.style.display = "block";
      this.renderOpenMode();
    }

    // Luôn render đầy đủ nội dung các tab để DOM không bao giờ bị rỗng
    this.renderChalkboardBanner();
    this.renderSpecialCard();
    this.renderKhoTab();
    this.renderMenuTab();
    this.renderPriceTab();
    this.renderUpgradesTab();
    this.renderStaffTab();
    this.renderOnlineTab();
    this.renderCollectionTab();
    this.renderSummaryTab();
    this.renderReviewsTab();
    this.renderBankTab();
    this.renderQuestsTab();

    this.renderBottomActionBar();
    this.renderDiningStage();
    this.renderDaikinAC();
  }

  // 1. Header Top (Thống kê chính xác chuẩn ảnh)
  renderHeader() {
    const nameEl = document.getElementById("display-shop-name");
    const badgeNameEl = document.getElementById("badge-chalk-name");
    const daySubEl = document.getElementById("display-day-status");
    const timerEl = document.getElementById("display-day-timer");
    const moneyEl = document.getElementById("display-money");
    const starsEl = document.getElementById("display-stars");
    const reviewsEl = document.getElementById("display-reviews-count");
    const headerPauseBtn = document.getElementById("btn-header-pause");

    const ownerAvatarEl = document.getElementById("header-owner-avatar");
    if (ownerAvatarEl) {
      if (document.documentElement.classList.contains("pixel-ui") && window.getPixelCharacterUrl) {
        ownerAvatarEl.src = window.getPixelCharacterUrl(this.state.ownerAvatar || "assets/cust_cat.png", { isOwner: true, scale: 3 });
      } else {
        ownerAvatarEl.src = this.state.ownerAvatar || "assets/cust_cat.png";
      }
    }

    if (nameEl) nameEl.textContent = this.state.shopName || "Tiệm Mỳ Cay";
    if (badgeNameEl) badgeNameEl.textContent = "✏️ Đổi Tên Tiệm";

    const isPrep = this.state.dayPhase === "prep";
    if (daySubEl) {
      daySubEl.textContent = `Ngày ${this.state.day} · ${isPrep ? "Chuẩn bị" : "Đang bán"}`;
    }

    if (headerPauseBtn) {
      headerPauseBtn.style.display = isPrep ? "none" : "flex";
    }

    const cockpitClockDigits = document.getElementById("cockpit-clock-digits");
    const cockpitClockPill = document.getElementById("cockpit-shift-timer-pill");
    const isUrgent = !isPrep && this.dayRemaining <= 45;

    if (timerEl) {
      if (isPrep) {
        timerEl.className = "header-time-title";
        timerEl.textContent = `⏱️ ${Math.floor(this.dayDuration / 60)}:${String(this.dayDuration % 60).padStart(2, "0")}`;
      } else {
        const m = Math.floor(this.dayRemaining / 60);
        const s = this.dayRemaining % 60;
        const timeStr = `${m}:${s < 10 ? "0" : ""}${s}`;
        timerEl.className = `header-time-title in-shift ${isUrgent ? "time-warning" : ""}`;
        timerEl.textContent = `⏱️ ${timeStr}`;
      }
    }

    if (cockpitClockDigits) {
      const m = Math.floor(this.dayRemaining / 60);
      const s = this.dayRemaining % 60;
      cockpitClockDigits.textContent = `${m}:${s < 10 ? "0" : ""}${s}`;
    }
    if (cockpitClockPill) {
      cockpitClockPill.classList.toggle("time-warning", isUrgent);
    }

    // Tiền hiển thị chính xác định dạng VNĐ chuẩn ảnh: 400.000đ, 253.500đ
    if (moneyEl) {
      if (typeof this.lastDisplayedMoney === "number" && this.state.money > this.lastDisplayedMoney) {
        moneyEl.classList.remove("money-counter-pulse");
        void moneyEl.offsetWidth;
        moneyEl.classList.add("money-counter-pulse");
      }
      this.lastDisplayedMoney = this.state.money;
      moneyEl.textContent = txaformat.formatVND(this.state.money);
    }

    // Điểm Danh Tiếng uy tín của tiệm ⭐
    const repEl = document.getElementById("display-reputation");
    if (repEl) {
      repEl.textContent = `${this.state.reputation || 30} ⭐`;
    }

    // Tính điểm đánh giá sao chuẩn xác từ reviews
    const hasReviews = this.state.reviews && this.state.reviews.length > 0;
    if (hasReviews) {
      const totalStars = this.state.reviews.reduce((sum, r) => sum + (r.stars || 5), 0);
      const avgExact = totalStars / this.state.reviews.length;
      const avgStars = Math.round(avgExact);
      const starString = "★".repeat(Math.min(5, Math.max(1, avgStars))) + "☆".repeat(Math.max(0, 5 - avgStars));
      // Hiện cả điểm số thật (vd 4.3) cạnh dãy sao để người chơi biết chính xác
      if (starsEl) starsEl.innerHTML = `<b class="hud-star-num">${avgExact.toFixed(1)}</b>${starString}`;
      if (reviewsEl) reviewsEl.textContent = `${this.state.reviews.length} đánh giá`;
    } else {
      if (starsEl) starsEl.innerHTML = '<b class="hud-star-num">5.0</b>★★★★★';
      if (reviewsEl) reviewsEl.textContent = "Khai trương";
    }

    // Cập nhật số lượng khách đang ngồi ăn trực tiếp tại các bàn
    const eatingCount = (this.state.tables || []).filter(t => t.status === "eating").length;
    const diningLiveText = document.getElementById("prep-dining-status-text") || document.getElementById("dining-live-status-text");
    if (diningLiveText) {
      diningLiveText.textContent = eatingCount > 0 ? `Đang có ${eatingCount} khách ngồi ăn xì xèo 🍜` : "Bàn ghế sạch bóng sẵn sàng đón khách ✨";
    }
    const openDiningCount = document.getElementById("open-dining-count");
    if (openDiningCount) {
      openDiningCount.textContent = eatingCount > 0 ? `· ${eatingCount}` : "";
    }

    if (!isPrep) this.renderKitchenPanel();

    // Đồng bộ khung cảnh tiệm sống động (ánh sáng theo giờ, cấp độ tiệm)
    if (this.scene) this.scene.requestSync();
  }

  // 2. Bảng đen Chalkboard "📋 Menu hôm nay"
  renderChalkboardBanner() {
    const listEl = document.getElementById("chalkboard-menu-list");
    const topWrap = document.getElementById("chalkboard-toppings-wrap");

    if (listEl) {
      const activeNoodles = Object.values(this.state.noodles).filter(n => n.unlocked && n.inMenu);
      if (activeNoodles.length === 0) {
        listEl.innerHTML = `<span style="font-size: 13px; color: #BBB;">Chưa chọn món nào vào menu</span>`;
      } else {
        listEl.innerHTML = activeNoodles.slice(0, 2).map(noodle => `
          <div class="chalk-menu-item">
            <span class="chalk-item-name">${noodle.name}</span>
            <span class="chalk-item-price">${txaformat.formatVND(noodle.price)}</span>
          </div>
        `).join("");
      }
    }

    if (topWrap) {
      const activeTops = Object.values(this.state.toppings).filter(t => t.unlocked && t.inMenu);
      topWrap.innerHTML = activeTops.slice(0, 3).map(t => `
        <span class="chalk-topping-pill">${t.shortName} +${txaformat.formatVND(t.price)}</span>
      `).join("");
    }
  }

  // Đổi mới hoặc làm mới Món Đặc Biệt Hôm Nay theo các nguyên liệu đã mở khóa
  rollDailySpecialCombo(keepStreak = true) {
    const unlockedNoodles = Object.values(this.state.noodles).filter(n => n.unlocked);
    const chosenNoodle = unlockedNoodles.length > 0
      ? unlockedNoodles[Math.floor(Math.random() * unlockedNoodles.length)]
      : (this.state.noodles.my_bo || { id: "my_bo", name: "Mì cay Bò Mỹ" });

    const unlockedTops = Object.values(this.state.toppings).filter(t => t.unlocked);
    const chosenTop = unlockedTops.length > 0
      ? unlockedTops[Math.floor(Math.random() * unlockedTops.length)]
      : (this.state.toppings.bo || { id: "bo", name: "Bò Mềm" });

    // Cấp độ cay ngẫu nhiên từ 1 đến 5 (hợp khẩu vị đa số thực khách)
    const spicyLevel = Math.floor(Math.random() * 5) + 1;
    const currentStreak = keepStreak && this.state.specialCombo ? (this.state.specialCombo.streak || 0) : 0;

    this.state.specialCombo = {
      noodleId: chosenNoodle.id,
      spicyLevel: spicyLevel,
      toppingId: chosenTop.id,
      streak: currentStreak
    };
  }

  // Kiểm tra đơn của khách có trùng với Món Đặc Biệt Hôm Nay ở bảng chuẩn bị
  isSpecialComboOrder(order) {
    if (!order || !this.state.specialCombo) return false;
    const spec = this.state.specialCombo;
    const isNoodleMatch = order.noodleId === spec.noodleId;
    const isSpicyMatch = Number(order.spicyLevel) === Number(spec.spicyLevel);
    const isToppingMatch = spec.toppingId ? (order.toppingId === spec.toppingId) : true;
    return Boolean(isNoodleMatch && isSpicyMatch && isToppingMatch);
  }

  // Kiểm tra niêu đất đang nấu có khớp với Món Đặc Biệt Hôm Nay
  isSpecialComboPot(pot) {
    if (!pot || !this.state.specialCombo || !pot.noodleId) return false;
    const spec = this.state.specialCombo;
    const isNoodleMatch = pot.noodleId === spec.noodleId;
    const isSpicyMatch = Number(pot.spicyLevel) === Number(spec.spicyLevel);
    const isToppingMatch = spec.toppingId ? (Array.isArray(pot.toppings) && pot.toppings.includes(spec.toppingId)) : true;
    return Boolean(isNoodleMatch && isSpicyMatch && isToppingMatch);
  }

  // 3. Thẻ món đặc biệt hôm nay (ở Bảng Chuẩn Bị Ngày)
  renderSpecialCard() {
    const comboEl = document.getElementById("display-special-combo");
    const streakEl = document.getElementById("display-special-streak");

    // Nếu món trong combo hiện tại chưa được mở khóa, tự động làm mới sang món hợp lệ
    const currentNoodle = this.state.noodles[this.state.specialCombo?.noodleId];
    const currentTop = this.state.toppings[this.state.specialCombo?.toppingId];
    if (!currentNoodle || !currentNoodle.unlocked || !currentTop || !currentTop.unlocked) {
      this.rollDailySpecialCombo(true);
    }

    if (comboEl) {
      const noodle = this.state.noodles[this.state.specialCombo.noodleId] || this.state.noodles.my_bo || { name: "Mì cay Bò Mỹ" };
      const top = this.state.toppings[this.state.specialCombo.toppingId] || this.state.toppings.bo || { name: "Bò Mềm" };
      comboEl.textContent = `${noodle.name} · Cấp ${this.state.specialCombo.spicyLevel} · Thêm ${top.name}`;
    }

    if (streakEl) {
      streakEl.textContent = `Điểm danh ${this.state.specialCombo.streak || 0} ngày`;
    }
  }

  // 4. Tab 1: Kho (Nguyên liệu dạng Card Grid & Stepper Tối Ưu)
  brewSupplies() {
    this.state.hasBrewedToday = true;
    const stoveLv = this.state.upgrades.stoveSpeed || 1;
    const bonusStock = 2 + (stoveLv - 1);

    if (this.state.noodles.my_bo) {
      this.state.noodles.my_bo.stock += bonusStock;
    }
    if (this.state.toppings.bo) {
      this.state.toppings.bo.stock += bonusStock;
    }

    this.sound.playCookingSizzle();
    GameUIModal.showToast(`🔥 Bếp gas cấp ${stoveLv} đã ninh nước dùng xương & chuẩn bị thêm +${bonusStock} phần Mì cay Bò!`, "success", "🍲");
    this.saveGame();
    this.renderHeader();
    this.renderKhoTab();
    this.renderBottomActionBar();
  }

  // 5. Tab 2: Menu
  renderMenuTab() {
    const noodleList = document.getElementById("menu-noodle-list");
    const topList = document.getElementById("menu-topping-list");
    const drinkList = document.getElementById("menu-drink-list");

    if (noodleList) {
      noodleList.innerHTML = Object.values(this.state.noodles).map(noodle => {
        let statusBadge = "";
        let actionBtn = "";

        if (noodle.unlocked) {
          if (noodle.inMenu) {
            statusBadge = `<span class="item-status status-selling">Đang bán</span>`;
            actionBtn = `<button class="btn-menu-action" onclick="window.game.toggleMenuItem('noodle', '${noodle.id}')">✓ Bỏ khỏi menu</button>`;
          } else {
            statusBadge = `<span class="item-status status-locked">Tạm ngưng</span>`;
            actionBtn = `<button class="btn-menu-action" onclick="window.game.toggleMenuItem('noodle', '${noodle.id}')">+ Thêm vào menu</button>`;
          }
        } else {
          statusBadge = `<span class="item-status status-locked">Chưa mở khoá</span>`;
          actionBtn = `
            <button class="btn-menu-action btn-buy-lock" onclick="window.game.unlockItem('noodle', '${noodle.id}')">
              <span class="btn-price-top">${txaformat.formatVND(noodle.unlockCost)}</span>
              <span class="btn-action-sub">Mở Khóa</span>
            </button>
          `;
        }

        return `
          <div class="item-row">
            <div class="item-row-left">
              <div class="item-icon">${noodle.icon}</div>
              <div class="item-details">
                <span class="item-name">${noodle.name}</span>
                ${statusBadge}
              </div>
            </div>
            <div class="item-row-right">
              ${actionBtn}
            </div>
          </div>
        `;
      }).join("");
    }

    if (topList) {
      topList.innerHTML = Object.values(this.state.toppings).map(top => {
        let statusBadge = "";
        let actionBtn = "";

        if (top.unlocked) {
          if (top.inMenu) {
            statusBadge = `<span class="item-status status-selling">Đang bán</span>`;
            actionBtn = `<button class="btn-menu-action" onclick="window.game.toggleMenuItem('top', '${top.id}')">✓ Bỏ khỏi menu</button>`;
          } else {
            statusBadge = `<span class="item-status status-locked">Tạm ngưng</span>`;
            actionBtn = `<button class="btn-menu-action" onclick="window.game.toggleMenuItem('top', '${top.id}')">+ Thêm vào menu</button>`;
          }
        } else {
          statusBadge = `<span class="item-status status-locked">Chưa mở khoá</span>`;
          actionBtn = `
            <button class="btn-menu-action btn-buy-lock" onclick="window.game.unlockItem('top', '${top.id}')">
              <span class="btn-price-top">${txaformat.formatVND(top.unlockCost)}</span>
              <span class="btn-action-sub">Mở Khóa</span>
            </button>
          `;
        }

        return `
          <div class="item-row">
            <div class="item-row-left">
              <div class="item-icon">${top.icon}</div>
              <div class="item-details">
                <span class="item-name">${top.name}</span>
                ${statusBadge}
              </div>
            </div>
            <div class="item-row-right">
              ${actionBtn}
            </div>
          </div>
        `;
      }).join("");
    }

    if (drinkList) {
      drinkList.innerHTML = Object.values(this.state.drinks).map(drink => {
        let statusBadge = "";
        let actionBtn = "";

        if (drink.unlocked) {
          if (drink.inMenu) {
            statusBadge = `<span class="item-status status-selling">Đang bán</span>`;
            actionBtn = `<button class="btn-menu-action" onclick="window.game.toggleMenuItem('drink', '${drink.id}')">✓ Bỏ khỏi menu</button>`;
          } else {
            statusBadge = `<span class="item-status status-locked">Tạm ngưng</span>`;
            actionBtn = `<button class="btn-menu-action" onclick="window.game.toggleMenuItem('drink', '${drink.id}')">+ Thêm vào menu</button>`;
          }
        } else {
          statusBadge = `<span class="item-status status-locked">Chưa mở khoá</span>`;
          actionBtn = `
            <button class="btn-menu-action btn-buy-lock" onclick="window.game.unlockItem('drink', '${drink.id}')">
              <span class="btn-price-top">${txaformat.formatVND(drink.unlockCost)}</span>
              <span class="btn-action-sub">Mở Khóa</span>
            </button>
          `;
        }

        return `
          <div class="item-row">
            <div class="item-row-left">
              <div class="item-icon">${drink.icon}</div>
              <div class="item-details">
                <span class="item-name">${drink.name}</span>
                ${statusBadge}
              </div>
            </div>
            <div class="item-row-right">
              ${actionBtn}
            </div>
          </div>
        `;
      }).join("");
    }
  }

  toggleMenuItem(type, itemId) {
    let item = null;
    if (type === "noodle") item = this.state.noodles[itemId];
    else if (type === "top") item = this.state.toppings[itemId];
    else if (type === "drink") item = this.state.drinks[itemId];

    if (!item) return;

    item.inMenu = !item.inMenu;
    this.sound.playButtonClick();
    GameUIModal.showToast(item.inMenu ? `Đã thêm ${item.name} vào Menu!` : `Đã bỏ ${item.name} khỏi Menu!`, "info", item.icon);
    this.saveGame();
    this.renderChalkboardBanner();
    this.renderMenuTab();
  }

  unlockItem(type, itemId) {
    let item = null;
    if (type === "noodle") item = this.state.noodles[itemId];
    else if (type === "top") item = this.state.toppings[itemId];
    else if (type === "drink") item = this.state.drinks[itemId];

    if (!item) return;

    if (this.state.money < item.unlockCost) {
      GameUIModal.showToast(`Bạn cần ${txaformat.formatVND(item.unlockCost)} để mở khóa ${item.name}!`, "warning", "🪙");
      return;
    }

    this.state.money -= item.unlockCost;
    item.unlocked = true;
    item.inMenu = true;
    item.stock = 10;
    this.sound.playCoinChime();
    GameUIModal.showToast(`Chúc mừng! Đã mở khóa ${item.name}!`, "success", "🎉");
    this.saveGame();
    this.renderHeader();
    this.renderChalkboardBanner();
    this.renderMenuTab();
    this.renderKhoTab();
  }

  // Helper: Tính tỷ lệ giá bán trung bình so với giá thị trường
  getAveragePriceRatio() {
    const activeNoodles = Object.values(this.state.noodles).filter(n => n.unlocked && n.inMenu);
    if (activeNoodles.length === 0) return 1.0;
    const totalRatio = activeNoodles.reduce((sum, n) => {
      const base = n.basePrice || 40;
      return sum + (n.price / base);
    }, 0);
    return totalRatio / activeNoodles.length;
  }

  // 6. Tab 3: Giá bán (Bảng Thiết Lập Giá Bán Thực Tế Của Quán)
  renderPriceTab() {
    const listEl = document.getElementById("price-settings-list");
    if (!listEl) return;

    const allSelling = [
      ...Object.values(this.state.noodles).filter(n => n.unlocked),
      ...Object.values(this.state.toppings).filter(t => t.unlocked),
      ...Object.values(this.state.drinks).filter(d => d.unlocked)
    ];

    listEl.innerHTML = allSelling.map(item => {
      const base = item.basePrice || (item.unitCost ? Math.round(item.unitCost * 2.5) : 30);
      const ratio = item.price / base;
      let badgeClass = "badge-fair";
      let badgeText = "Giá vừa phải · Chuẩn thị trường ⭐⭐⭐⭐";

      if (ratio <= 0.85) {
        badgeClass = "badge-cheap";
        badgeText = "Khách khen rẻ (+25% khách) ⭐⭐⭐⭐⭐";
      } else if (ratio <= 1.15) {
        badgeClass = "badge-fair";
        badgeText = "Giá vừa phải · Chuẩn thị trường ⭐⭐⭐⭐";
      } else if (ratio <= 1.35) {
        badgeClass = "badge-expensive";
        badgeText = "Hơi đắt đỏ · Khách dễ cáu ⭐⭐⭐";
      } else {
        badgeClass = "badge-overpriced";
        badgeText = "Quá đắt! (-35% khách, dễ bốc hỏa) ⚠️";
      }

      const profit = (item.price - item.unitCost).toFixed(1);

      return `
        <div class="price-card">
          <div class="price-card-info">
            <div class="price-card-head">
              <span class="price-card-title">${item.icon} ${item.name}</span>
              <span class="price-stock-tag">Kho: <strong>${item.stock || 0}</strong></span>
            </div>
            <span class="price-card-desc">Vốn: <strong>${txaformat.formatVND(item.unitCost)}</strong> · Chuẩn thị trường: <strong>${txaformat.formatVND(base)}</strong> · Lãi dự kiến: <strong style="color: #258A6D;">+${txaformat.formatVND(profit)} / phần</strong></span>
            <span class="price-indicator-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="price-card-controls">
            <button class="btn-stepper btn-stepper-jump" onclick="window.game.adjustPrice('${item.id}', -5)" title="Giảm nhanh 5.000đ">−5k</button>
            <button class="btn-stepper" onclick="window.game.adjustPrice('${item.id}', -1)" title="Giảm 1.000đ">−1k</button>
            <div class="price-active-display">
              <span class="price-active-label">Giá niêm yết:</span>
              <strong class="price-active-amount">${txaformat.formatVND(item.price)}</strong>
            </div>
            <button class="btn-stepper" onclick="window.game.adjustPrice('${item.id}', 1)" title="Tăng 1.000đ">+1k</button>
            <button class="btn-stepper btn-stepper-jump" onclick="window.game.adjustPrice('${item.id}', 5)" title="Tăng nhanh 5.000đ">+5k</button>
          </div>
        </div>
      `;
    }).join("");
  }

  adjustPrice(itemId, delta) {
    const item = this.state.noodles[itemId] || this.state.toppings[itemId] || this.state.drinks[itemId];
    if (!item) return;

    const minPrice = Math.max(1, Math.ceil(item.unitCost || 1));
    item.price = Math.max(minPrice, item.price + delta);
    this.sound.playButtonClick();
    this.saveGame();
    this.renderPriceTab();
    this.renderChalkboardBanner();
    this.renderOrderQueue();
    this.renderKhoTab();
  }

  // 7. Tab 4: Nâng cấp (Độ Sâu Tiến Trình Mở Dài Hạn Đến Ngày 55+)
  renderUpgradesTab() {
    const listEl = document.getElementById("upgrades-list");
    if (!listEl) return;

    const upgradesConfig = [
      { key: "tableCount", name: "Thêm Bàn Ghế Gỗ Sồi", desc: "Tăng số lượng bàn đón khách cùng lúc", baseCost: 320, scale: 1.65, max: 8, startLv: 3, icon: "🪑", minDays: [1, 2, 4, 7, 11, 15, 20, 26] },
      { key: "stoveSpeed", name: "Bếp Niêu Đất Cao Cấp", desc: "Tăng tốc độ ninh mỳ và giảm thời gian nấu song song", baseCost: 400, scale: 1.7, max: 6, startLv: 1, icon: "🔥", minDays: [1, 3, 6, 10, 15, 22] },
      { key: "chiliSecret", name: "Sốt Ớt Hiểm Bí Truyền", desc: "Gia vị cay nồng độc quyền tăng 12% giá bán mỗi cấp", baseCost: 450, scale: 1.75, max: 5, startLv: 1, icon: "🌶️", minDays: [1, 3, 7, 13, 19] },
      { key: "acCooling", name: "Điều Hòa Daikin Mát Rượi", desc: "Giải nhiệt ăn cay, tăng 25% độ kiên nhẫn của khách", baseCost: 350, scale: 1.65, max: 5, startLv: 1, icon: "❄️", minDays: [1, 3, 8, 14, 20] },
      { key: "decorScore", name: "Đèn Lồng Đỏ Tokyo - Seoul", desc: "Tăng danh tiếng và kéo khách ghé tiệm nườm nượp", baseCost: 420, scale: 1.7, max: 6, startLv: 1, icon: "🏮", minDays: [1, 4, 8, 13, 18, 25] },
      { key: "freezerStorage", name: "Tủ Đông Sanaky Bảo Quản", desc: "Tăng trữ lượng kho sỉ, giảm tối đa hao hụt nước dùng", baseCost: 360, scale: 1.6, max: 5, startLv: 1, icon: "🧊", minDays: [1, 5, 9, 14, 21] },
      { key: "lofiAcoustic", name: "Dàn Loa Lo-Fi Cafe Acoustic", desc: "Nhạc du dương thư giãn, giảm 20% cáu gắt khi quán đông", baseCost: 380, scale: 1.65, max: 4, startLv: 1, icon: "📻", minDays: [1, 6, 11, 17] },
      { key: "autoSealer", name: "Máy Ép Màng Nắp Tự Động", desc: "Tự động đóng gói đơn Online & tặng thêm +20k/đơn hỏa tốc", baseCost: 550, scale: 1.6, max: 5, startLv: 0, icon: "⚡", minDays: [1, 8, 14, 21, 29] },
      { key: "dualStove", name: "Bếp Niêu Đôi Song Song", desc: "Tăng tốc độ ninh mỳ tổng thể +40% và giảm thời gian nấu", baseCost: 650, scale: 1.7, max: 5, startLv: 0, icon: "🍲", minDays: [1, 12, 18, 26, 35] },
      { key: "airPurifier", name: "Quạt Hút Mùi Ion Khói Cay", desc: "Khách ăn nhanh hơn +35%, mau chóng giải phóng bàn trống", baseCost: 500, scale: 1.65, max: 5, startLv: 0, icon: "🌀", minDays: [1, 15, 22, 30, 38] },
      { key: "zenGarden", name: "Hồ Cá Koi Zen Quán Mỳ", desc: "Tăng +50% tỉ lệ khách VIP Thần Tài ghé thăm tiệm", baseCost: 750, scale: 1.75, max: 5, startLv: 0, icon: "🎏", minDays: [1, 20, 28, 37, 48] },
      { key: "shichimiSpice", name: "Gia Vị 7 Vị Shichimi Thượng Hạng", desc: "Mì từ cấp 3 trở lên được cộng thêm +15% giá bán mỗi cấp", baseCost: 700, scale: 1.7, max: 5, startLv: 0, icon: "🍱", minDays: [1, 25, 34, 44, 55] }
    ];

    listEl.innerHTML = upgradesConfig.map(up => {
      const currentLv = (this.state.upgrades[up.key] !== undefined) ? this.state.upgrades[up.key] : (up.startLv || 0);
      const isMax = currentLv >= up.max;
      const costIndex = Math.max(0, currentLv - (up.startLv || 0));
      const cost = Math.round(up.baseCost * Math.pow(up.scale || 1.65, costIndex));
      const nextMinDay = (up.minDays && up.minDays[currentLv]) ? up.minDays[currentLv] : 1;
      const isDayUnlocked = this.state.day >= nextMinDay;

      return `
        <div class="upgrade-card">
          <div class="upgrade-card-info">
            <span class="upgrade-card-title">${up.icon} ${up.name} (Cấp ${currentLv}/${up.max})</span>
            <span class="upgrade-card-desc">${up.desc}</span>
            <div class="upgrade-lv-progress-bar">
              <div class="upgrade-lv-progress-fill" style="width: ${(currentLv / up.max) * 100}%;"></div>
            </div>
          </div>
          <div>
            ${isMax ? `<span class="upgrade-badge-max">⭐ Tối đa</span>` : (
              !isDayUnlocked ? `<span class="staff-lock-badge">🔒 Mở Ngày ${nextMinDay}</span>` : `
              <button class="btn-menu-action btn-buy-lock" onclick="window.game.buyUpgrade('${up.key}', ${cost}, ${nextMinDay})">
                <span class="btn-price-top">${cost}k</span>
                <span class="btn-action-sub">Lên Cấp ${currentLv + 1}</span>
              </button>
            `)}
          </div>
        </div>
      `;
    }).join("");
  }

  buyUpgrade(key, cost, nextMinDay = 1) {
    if (this.state.day < nextMinDay) {
      GameUIModal.showToast(`Trang bị cấp độ này chỉ mở khóa từ Ngày ${nextMinDay}!`, "warning", "📅");
      return;
    }
    if (this.state.money < cost) {
      GameUIModal.showToast(`Cần ${cost}k để nâng cấp!`, "warning", "🪙");
      return;
    }

    this.state.money -= cost;
    this.state.upgrades[key] = (this.state.upgrades[key] || 0) + 1;
    const newLv = this.state.upgrades[key];

    if (key === "tableCount") {
      this.initTables();
      this.state.tables.push({
        id: this.state.tables.length + 1,
        status: "empty",
        customer: null,
        order: null,
        patience: 100,
        maxPatience: 100
      });
      GameUIModal.showToast(`🪑 Đã mở thêm bàn ghế gỗ sồi #${this.state.tables.length}! Sẵn sàng đón thêm khách!`, "success", "🪑");
    } else if (key === "acCooling") {
      const tempText = newLv >= 3 ? "16°C Turbo Max" : "20°C Inverter";
      this.state.acTemp = this.getBaseDaikinTemp();
      this.state.acTurboActive = false;
      this.state.acTurboSeconds = 0;
      GameUIModal.showToast(`❄️ Đã nâng cấp Điều Hòa Daikin lên Cấp ${newLv} (${tempText})! Cả tiệm mát lạnh sâu, khách kiên nhẫn hơn +${newLv * 25}%!`, "success", "❄️");
      this.renderDaikinAC();
      this.renderDiningStage();
    } else if (key === "autoSealer") {
      GameUIModal.showToast(`⚡ Máy Ép Màng Nắp Tự Động Cấp ${newLv} đã hoạt động! Tự động đóng gói & tăng +20k/đơn online!`, "success", "⚡");
    } else if (key === "dualStove") {
      GameUIModal.showToast(`🍲 Bếp Niêu Đôi Song Song Cấp ${newLv} đã hoàn tất! Tốc độ nấu mỳ tăng vọt +40%!`, "success", "🔥");
    } else if (key === "airPurifier") {
      GameUIModal.showToast(`🌀 Quạt Hút Mùi Ion Khói Cay Cấp ${newLv} đã bật! Khách ăn nhanh hơn +35%, mau trống bàn!`, "success", "💨");
    } else if (key === "zenGarden") {
      GameUIModal.showToast(`🎏 Hồ Cá Koi Zen Quán Mỳ Cấp ${newLv} đã khánh thành! Tỉ lệ khách VIP Thần Tài tăng +50%!`, "success", "🎏");
    } else if (key === "shichimiSpice") {
      GameUIModal.showToast(`🍱 Gia Vị 7 Vị Shichimi Cấp ${newLv} đã chuẩn bị! Mì cấp >= 3 tăng thêm +${newLv * 15}% giá bán!`, "success", "🍱");
    } else {
      if (this.sound && typeof this.sound.playUpgradeSound === "function") {
        this.sound.playUpgradeSound();
      } else {
        this.sound.playCoinChime();
      }
      GameUIModal.showToast("Nâng cấp thành công cơ ngơi tiệm mì!", "success", "🛠️");
    }

    this.saveGame();
    this.renderHeader();
    this.renderUpgradesTab();
  }

  // 8. Tab 5: Nhân viên (Lộ Trình Tuyển Dụng Dài Hạn Gắn Liền Với Danh Tiếng ⭐ & Ngày)
  // Helper: Mở khóa khách hàng trong Bộ sưu tập (từ từ khi gặp hoặc khi phục vụ)
  unlockCustomer(cust, isServed = false) {
    if (!cust || !cust.id) return;
    if (!this.state.unlockedCustomers) this.state.unlockedCustomers = {};
    const cid = cust.id;
    if (!this.state.unlockedCustomers[cid]) {
      this.state.unlockedCustomers[cid] = {
        id: cust.id,
        name: cust.name,
        avatar: cust.avatar,
        isVip: Boolean(cust.isVip),
        firstMetDay: this.state.day || 1,
        servedCount: isServed ? 1 : 0,
        seen: true
      };
    } else {
      if (isServed) {
        this.state.unlockedCustomers[cid].servedCount = (this.state.unlockedCustomers[cid].servedCount || 0) + 1;
      }
    }
  }

  // 10. Tab 7: Bộ sưu tập (Mở khóa dần Thực khách & Huy hiệu thành tích)
  renderCollectionTab() {
    const custGrid = document.getElementById("collection-customers-grid");
    const badgeGrid = document.getElementById("collection-badges-grid");

    const unlockedMap = this.state.unlockedCustomers || {};
    const totalCustomers = this.customerTemplates.length;
    const unlockedCustomerCount = this.customerTemplates.filter(c => unlockedMap[c.id]).length;
    const customerPct = totalCustomers > 0 ? Math.round((unlockedCustomerCount / totalCustomers) * 100) : 0;

    if (custGrid) {
      const headerHtml = `
        <div class="collection-progress-header" style="grid-column: 1 / -1;">
          <div class="collection-progress-meta">
            <span>🐾 Hồ Sơ Thực Khách Đã Khám Phá:</span>
            <span style="color: #F59E0B; font-weight: 800;">${unlockedCustomerCount} / ${totalCustomers} vị khách (${customerPct}%)</span>
          </div>
          <div class="collection-progress-bar-track">
            <div class="collection-progress-bar-fill" style="width: ${customerPct}%;"></div>
          </div>
        </div>
      `;

      const cardsHtml = this.customerTemplates.map(c => {
        const custData = unlockedMap[c.id];
        const isUnlocked = Boolean(custData);

        if (isUnlocked) {
          const isVip = Boolean(c.isVip);
          const servedCount = custData.servedCount || 0;
          return `
            <div class="collection-card is-unlocked-card ${isVip ? 'is-vip-card' : ''}">
              <img src="${c.avatar}" alt="${c.name}" class="collection-avatar" onerror="this.src='assets/cust_cat.png'" />
              <span class="collection-name">${isVip ? '👑 ' : ''}${c.name}</span>
              <span class="collection-bio">${c.bio}</span>
              <div class="collection-sub-meta">
                <span>🐾 Đã phục vụ: <strong>${servedCount} lần</strong></span> · 
                <span>🌶️ Cấp ${c.preferredSpicy ? c.preferredSpicy.join("-") : "1"}</span>
              </div>
              <span class="collection-status-pill ${isVip ? 'pill-vip' : 'pill-met'}">
                ${isVip ? '👑 Khách VIP Thần Tài' : '✨ Khách Quen Tiệm'}
              </span>
            </div>
          `;
        } else {
          return `
            <div class="collection-card is-locked-card">
              <div class="collection-avatar is-locked-avatar">❓</div>
              <span class="collection-name" style="color: var(--text-muted);">??? (Chưa gặp)</span>
              <span class="collection-bio">Vị khách bí ẩn chưa từng ghé tiệm. Hãy mở cửa đón thêm thực khách để mở khóa hồ sơ nhé!</span>
              <div class="collection-sub-meta" style="opacity: 0.7;">
                <span>🔒 Chưa khám phá</span>
              </div>
              <span class="collection-status-pill pill-locked">🔒 Chưa Khám Phá</span>
            </div>
          `;
        }
      }).join("");

      custGrid.innerHTML = headerHtml + cardsHtml;
    }

    if (badgeGrid) {
      const stats = this.state.stats || {};
      const bowlsServed = stats.bowlsServed || 0;
      const spicyMasterServed = stats.spicyMasterServed || 0;
      const drinksServed = stats.drinksServed || 0;
      const tipsEarned = stats.tipsEarned || 0;
      const vipServed = stats.vipServed || 0;
      const totalRev = typeof stats.totalRevenue === "number" && stats.totalRevenue > 0
        ? stats.totalRevenue
        : (this.state.money || 400);
      const reputation = this.state.reputation || 0;
      const day = this.state.day || 1;

      const badges = [
        {
          id: "grand_open",
          icon: "🏮",
          name: "Khai Trương Tiệm Mì",
          desc: "Mở cửa đón thực khách ngày đầu tiên",
          current: (day > 1 || bowlsServed > 0 || this.state.dayPhase === "open") ? 1 : 0,
          target: 1,
          unit: "lần",
          isUnlocked: Boolean(day > 1 || bowlsServed > 0 || this.state.dayPhase === "open")
        },
        {
          id: "first_bowl",
          icon: "🍜",
          name: "Bát Mì Đầu Tiên",
          desc: "Phục vụ thành công 1 tô mì cay nóng hổi",
          current: Math.min(1, bowlsServed),
          target: 1,
          unit: "tô",
          isUnlocked: bowlsServed >= 1
        },
        {
          id: "spicy_level_7",
          icon: "🔥",
          name: "Bậc Thầy Cấp 7",
          desc: "Phục vụ 5 tô mì cấp 6-7 bốc hỏa cho thực khách can đảm",
          current: Math.min(5, spicyMasterServed),
          target: 5,
          unit: "tô",
          isUnlocked: spicyMasterServed >= 5
        },
        {
          id: "noodle_king",
          icon: "🍲",
          name: "Vua Niêu Đất",
          desc: "Bán tích lũy vượt mốc 25 tô mì cay",
          current: Math.min(25, bowlsServed),
          target: 25,
          unit: "tô",
          isUnlocked: bowlsServed >= 25
        },
        {
          id: "boba_master",
          icon: "🧋",
          name: "Tiệm Trà Sữa Boba",
          desc: "Pha chế và phục vụ 10 ly trà sữa / nước giải cay",
          current: Math.min(10, drinksServed),
          target: 10,
          unit: "ly",
          isUnlocked: drinksServed >= 10
        },
        {
          id: "tip_collector",
          icon: "💖",
          name: "Được Lòng Thực Khách",
          desc: "Tích lũy 50.000đ tiền tip từ thực khách hài lòng",
          current: Math.min(50, Math.floor(tipsEarned)),
          target: 50,
          unit: "k",
          isUnlocked: tipsEarned >= 50
        },
        {
          id: "vip_guest",
          icon: "👑",
          name: "Khách VIP Thần Tài",
          desc: "Đón tiếp thành công ít nhất 1 vị khách VIP Thần Tài",
          current: Math.min(1, vipServed),
          target: 1,
          unit: "khách",
          isUnlocked: vipServed >= 1
        },
        {
          id: "reputation_star",
          icon: "⭐",
          name: "Thương Hiệu Nổi Tiếng",
          desc: "Đạt từ 50 điểm Danh tiếng uy tín trở lên",
          current: Math.min(50, reputation),
          target: 50,
          unit: "sao",
          isUnlocked: reputation >= 50
        },
        {
          id: "social_star",
          icon: "🐾",
          name: "Bạn Của Muôn Loài",
          desc: "Gặp gỡ và mở khóa ít nhất 5 thực khách trong Bộ sưu tập",
          current: Math.min(5, unlockedCustomerCount),
          target: 5,
          unit: "vị khách",
          isUnlocked: unlockedCustomerCount >= 5
        },
        {
          id: "millionaire",
          icon: "💰",
          name: "Chủ Tiệm Triệu Phú",
          desc: "Tích lũy tổng doanh thu đạt 1.000.000đ",
          current: Math.min(1000, Math.round(totalRev)),
          target: 1000,
          unit: "k",
          isUnlocked: totalRev >= 1000
        }
      ];

      const unlockedBadgesCount = badges.filter(b => b.isUnlocked).length;
      const badgePct = Math.round((unlockedBadgesCount / badges.length) * 100);

      const headerHtml = `
        <div class="collection-progress-header" style="grid-column: 1 / -1;">
          <div class="collection-progress-meta">
            <span>🏆 Huy Hiệu Đã Đạt:</span>
            <span style="color: #F59E0B; font-weight: 800;">${unlockedBadgesCount} / ${badges.length} (${badgePct}%)</span>
          </div>
          <div class="collection-progress-bar-track">
            <div class="collection-progress-bar-fill" style="width: ${badgePct}%;"></div>
          </div>
        </div>
      `;

      const cardsHtml = badges.map(b => {
        const pct = Math.min(100, Math.round((b.current / b.target) * 100));
        return `
          <div class="badge-card ${b.isUnlocked ? 'is-badge-unlocked' : 'is-badge-locked'}">
            <div class="badge-icon-wrap">${b.icon}</div>
            <span class="badge-name">${b.name}</span>
            <span class="badge-desc">${b.desc}</span>
            
            <div class="badge-progress-wrap">
              <div class="badge-progress-track">
                <div class="badge-progress-fill" style="width: ${pct}%;"></div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                <span class="badge-progress-label">${b.current}/${b.target} ${b.unit}</span>
                ${b.isUnlocked
                  ? '<span class="badge-tag-achieved">✅ ĐÃ ĐẠT</span>'
                  : `<span class="badge-tag-locked">🔒 ${pct}%</span>`
                }
              </div>
            </div>
          </div>
        `;
      }).join("");

      badgeGrid.innerHTML = headerHtml + cardsHtml;
    }
  }

  // 11. Tab 8: Tổng kết & Thống kê
  renderSummaryTab() {
    const sumTotalMoney = document.getElementById("sum-total-money");
    const sumWalletMoney = document.getElementById("sum-wallet-money");
    const sumBowls = document.getElementById("sum-bowls-sold");
    const sumDrinks = document.getElementById("sum-drinks-sold");
    const sumSpicy7 = document.getElementById("sum-spicy7-sold");
    const sumTips = document.getElementById("sum-tips-earned");
    const sumRep = document.getElementById("sum-reputation");

    // Đảm bảo tổng doanh thu lũy kế qua tất cả các ngày luôn được theo dõi chính xác
    const totalRev = typeof this.state.stats.totalRevenue === "number" && this.state.stats.totalRevenue > 0
      ? this.state.stats.totalRevenue
      : Math.max(this.state.money || 400, (this.state.day - 1) * 350 + (this.state.money || 400));

    if (sumTotalMoney) sumTotalMoney.textContent = txaformat.formatVND(totalRev);
    if (sumWalletMoney) sumWalletMoney.textContent = txaformat.formatVND(this.state.money);
    if (sumBowls) sumBowls.textContent = `${this.state.stats.bowlsServed || 0} tô 🍜`;
    if (sumDrinks) sumDrinks.textContent = `${this.state.stats.drinksServed || 0} ly 🧋`;
    if (sumSpicy7) sumSpicy7.textContent = `${this.state.stats.spicyMasterServed || 0} tô 🔥`;
    if (sumTips) sumTips.textContent = `${txaformat.formatVND(this.state.stats.tipsEarned || 0)} 💖`;
    if (sumRep) sumRep.textContent = `${this.state.reputation || 30} ⭐`;
  }

  // Tab Đánh Giá riêng: tổng quan sao, bộ lọc, đánh giá & phản hồi qua lại với khách
  renderReviewsTab() {
    this.updateReviewBadge();
    const reviewsList = document.getElementById("reviews-list");
    const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

    if (reviewsList) {
      if (this.state.reviews.length === 0) {
        reviewsList.innerHTML = `
          <div style="text-align: center; padding: 28px 16px; color: var(--text-muted); background: var(--bg-card); border-radius: 14px; border: 1.5px dashed var(--border-card);">
            <div style="font-size: 36px; margin-bottom: 8px;">🏮</div>
            <div style="font-weight: 800; font-size: 14px; color: var(--text-title); margin-bottom: 4px;">Tiệm Chưa Có Đánh Giá Nào</div>
            <div style="font-size: 12px; line-height: 1.4;">Quán mới khai trương chưa đón khách ăn mì! Hãy mở cửa và phục vụ những niêu mì cay nóng hổi đầu tiên để nhận đánh giá và tiền tip nhé!</div>
          </div>
        `;
      } else {
        // Tính toán tổng quan sao uy tín
        const totalReviews = this.state.reviews.length;
        const totalStars = this.state.reviews.reduce((acc, r) => acc + (r.stars || 5), 0);
        const avgRating = (totalStars / totalReviews).toFixed(1);
        const roundStars = Math.round(totalStars / totalReviews);
        const starsDisplay = "★".repeat(Math.min(5, Math.max(1, roundStars))) + "☆".repeat(Math.max(0, 5 - roundStars));

        let statusTitle = "🏮 Quán Hoạt Động Bình Thường & Ổn Định";
        let statusDesc = "Lượng khách ghé quán đều đặn. Hãy duy trì tốc độ và chăm chút chất lượng niêu mì!";
        if (avgRating >= 4.5) {
          statusTitle = "🔥 Tiệm Mì Đang Cực Kỳ Nổi Tiếng (Đông Khách Tấp Nập!)";
          statusDesc = "⭐ Điểm sao cao giúp quán nổi tiếng khắp khu phố! Khách kéo đến nườm nượp (+35% tốc độ khách ghé)!";
        } else if (avgRating < 3.2) {
          statusTitle = "⚠️ Tiệm Đang Bị Chê Bai (Lượng Khách Giảm Mạnh!)";
          statusDesc = "Khách phàn nàn vì chờ lâu hoặc phục vụ chưa tốt. Hãy gõ phản hồi xin lỗi chân thành bên dưới để gỡ lại sao nhé!";
        }

        const headerHtml = `
          <div class="reviews-rating-header">
            <div class="rating-score-box">
              <span class="rating-big-num">${avgRating}</span>
              <span class="rating-stars-large">${starsDisplay}</span>
              <span class="rating-total-count">${totalReviews} đánh giá</span>
            </div>
            <div class="rating-impact-box">
              <span class="rating-impact-title">${statusTitle}</span>
              <span class="rating-impact-desc">${statusDesc}</span>
            </div>
          </div>
        `;

        // Thống kê phân bổ sao chi tiết (Star Distribution 1-5 sao)
        const count5 = this.state.reviews.filter(r => (r.stars || 5) === 5).length;
        const count4 = this.state.reviews.filter(r => (r.stars || 5) === 4).length;
        const count3 = this.state.reviews.filter(r => (r.stars || 5) === 3).length;
        const count2 = this.state.reviews.filter(r => (r.stars || 5) === 2).length;
        const count1 = this.state.reviews.filter(r => (r.stars || 5) === 1).length;

        const pct5 = totalReviews ? Math.round((count5 / totalReviews) * 100) : 0;
        const pct4 = totalReviews ? Math.round((count4 / totalReviews) * 100) : 0;
        const pct3 = totalReviews ? Math.round((count3 / totalReviews) * 100) : 0;
        const pct2 = totalReviews ? Math.round((count2 / totalReviews) * 100) : 0;
        const pct1 = totalReviews ? Math.round((count1 / totalReviews) * 100) : 0;

        const countBad = count3 + count2 + count1;
        const countUnreplied = this.state.reviews.filter(r => !r.replied).length;
        const countOnline = this.state.reviews.filter(r => r.isOnline).length;

        const distributionHtml = `
          <div class="rating-dist-panel">
            <div class="rating-dist-row">
              <span style="width: 32px;">5 ★</span>
              <div class="rating-dist-track"><div class="rating-dist-fill" style="width: ${pct5}%;"></div></div>
              <span style="width: 55px; text-align: right;">${pct5}% (${count5})</span>
            </div>
            <div class="rating-dist-row">
              <span style="width: 32px;">4 ★</span>
              <div class="rating-dist-track"><div class="rating-dist-fill" style="width: ${pct4}%;"></div></div>
              <span style="width: 55px; text-align: right;">${pct4}% (${count4})</span>
            </div>
            <div class="rating-dist-row">
              <span style="width: 32px;">3 ★</span>
              <div class="rating-dist-track"><div class="rating-dist-fill" style="width: ${pct3}%;"></div></div>
              <span style="width: 55px; text-align: right;">${pct3}% (${count3})</span>
            </div>
            <div class="rating-dist-row">
              <span style="width: 32px;">2 ★</span>
              <div class="rating-dist-track"><div class="rating-dist-fill" style="width: ${pct2}%;"></div></div>
              <span style="width: 55px; text-align: right;">${pct2}% (${count2})</span>
            </div>
            <div class="rating-dist-row">
              <span style="width: 32px;">1 ★</span>
              <div class="rating-dist-track"><div class="rating-dist-fill" style="width: ${pct1}%;"></div></div>
              <span style="width: 55px; text-align: right;">${pct1}% (${count1})</span>
            </div>
          </div>
        `;

        const curFilter = this.reviewFilter || "all";
        const filtersHtml = `
          <div class="review-filters-bar">
            <button class="review-filter-pill ${curFilter === 'all' ? 'active' : ''}" onclick="window.game.setReviewFilter('all')">
              Tất cả (${totalReviews})
            </button>
            <button class="review-filter-pill ${curFilter === 'star5' ? 'active' : ''}" onclick="window.game.setReviewFilter('star5')">
              5★ Xuất sắc (${count5})
            </button>
            <button class="review-filter-pill ${curFilter === 'bad' ? 'active' : ''}" onclick="window.game.setReviewFilter('bad')">
              1-3★ Cần cứu (${countBad})
            </button>
            <button class="review-filter-pill ${curFilter === 'unreplied' ? 'active' : ''}" onclick="window.game.setReviewFilter('unreplied')">
              Chưa trả lời 💌 (${countUnreplied})
            </button>
            <button class="review-filter-pill ${curFilter === 'online' ? 'active' : ''}" onclick="window.game.setReviewFilter('online')">
              Đơn Online 🛵 (${countOnline})
            </button>
          </div>
        `;

        // Lọc danh sách đánh giá theo filter đang chọn
        let indexedReviews = this.state.reviews.map((r, originalIdx) => ({ r, originalIdx }));
        if (curFilter === "star5") {
          indexedReviews = indexedReviews.filter(item => (item.r.stars || 5) === 5);
        } else if (curFilter === "bad") {
          indexedReviews = indexedReviews.filter(item => (item.r.stars || 5) <= 3);
        } else if (curFilter === "unreplied") {
          indexedReviews = indexedReviews.filter(item => !item.r.replied);
        } else if (curFilter === "online") {
          indexedReviews = indexedReviews.filter(item => item.r.isOnline);
        }

        const listHtml = indexedReviews.length === 0 ? `
          <div style="text-align: center; padding: 24px 0; color: var(--text-muted); font-size: 13px;">
            Không có đánh giá nào phù hợp với bộ lọc "${curFilter}".
          </div>
        ` : indexedReviews.slice(0, 20).map(({ r, originalIdx }) => {
          const starCount = Math.max(1, Math.min(5, r.stars || 5));
          const starStr = "★".repeat(starCount) + "☆".repeat(5 - starCount);
          const tagClass = `star-${starCount}`;
          const starTagText = starCount === 5 ? "5★ Xuất sắc" : (starCount === 4 ? "4★ Hài lòng" : (starCount === 3 ? "3★ Tạm ổn" : (starCount === 2 ? "2★ Thất vọng" : "1★ Rất tệ")));
          const custAvatar = r.customerAvatar || "assets/cust_cat.png";

          const appClass = r.app === 'ShopeeFood' ? 'app-shopee' : (r.app === 'BeFood' ? 'app-befood' : (r.app === 'Baemin' ? 'app-baemin' : 'app-grab'));

          return `
            <div class="review-item-card">
              <div class="review-card-head">
                <div class="review-customer-identity">
                  <img src="${esc(custAvatar)}" alt="${esc(r.customerName)}" class="review-cust-avatar" onerror="this.src='assets/cust_cat.png'" />
                  <div>
                    <div class="review-customer-name">
                      ${esc(r.customerName)}
                      ${r.foodieBadge ? `<span class="foodie-badge">🏅 ${r.foodieBadge}</span>` : ''}
                      ${r.isOnline ? `<span class="shipper-app-badge ${appClass}">🛵 ${r.app || 'Online'}</span>` : ''}
                    </div>
                    <div class="review-date-badge">${r.date || 'Hôm nay'}${r.shipperName ? ` • Tài xế: ${r.shipperName}` : ''}</div>
                  </div>
                </div>
                <div class="review-stars-wrap">
                  <span class="review-stars">${starStr}</span>
                  <span class="review-star-tag ${tagClass}">${starTagText}</span>
                </div>
              </div>

              ${r.foodAttached ? `<div class="food-attached-tag">🍜 ${r.foodAttached}</div>` : ''}
              ${r.isPacked ? `<div class="food-attached-tag">📦 Đã ép màng nắp & niêm phong thùng giữ nhiệt</div>` : ''}

              <div class="review-comment">"${esc(r.comment)}"</div>

              ${r.replied ? `
                <div class="owner-reply-bubble">
                  <div class="owner-reply-title">🧑‍🍳 Chủ tiệm (${esc(this.state.ownerName || 'Bếp Trưởng')}):</div>
                  <div>"${esc(r.ownerReply || '')}"</div>
                </div>
                ${r.replyTags && r.replyTags.length ? `
                  <div class="reply-analysis-row">
                    <span class="reply-analysis-label">🔍 Khách nhận ra:</span>
                    ${r.replyTags.map(t => `<span class="reply-analysis-tag ${/Thô lỗ|Đổ lỗi|cho có|Copy|quát|ngắn|Chưa nói/.test(t) ? "is-bad" : ""}">${esc(t)}</span>`).join("")}
                  </div>
                ` : ''}
                ${r.customerFeedback ? `
                  <div class="customer-comeback-bubble tier-${esc(r.replyTier || 'neutral')}">
                    <div class="customer-comeback-title">💬 ${esc(r.customerName)} hồi đáp:</div>
                    <div>"${esc(String(r.customerFeedback).replace(/^(Phản hồi lại:\s*)?Khách (phản hồi|cảm động|thả reaction|thả tim):\s*['"]?/, '').replace(/^['"]|['"]$/g, ''))}"</div>
                    ${r.replyEffect ? `
                      <div class="reply-effect-row">
                        ${r.replyEffect.starDelta ? `<span class="${r.replyEffect.starDelta > 0 ? "fx-up" : "fx-down"}">${r.replyEffect.starDelta > 0 ? "+" : ""}${r.replyEffect.starDelta}★</span>` : ""}
                        ${r.replyEffect.rep ? `<span class="${r.replyEffect.rep > 0 ? "fx-up" : "fx-down"}">${r.replyEffect.rep > 0 ? "+" : ""}${r.replyEffect.rep} danh tiếng</span>` : ""}
                        ${r.replyEffect.tip ? `<span class="fx-up">+${r.replyEffect.tip}k tip</span>` : ""}
                        ${r.replyEffect.cost ? `<span class="fx-down">-${r.replyEffect.cost}k đền bù</span>` : ""}
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
              ` : `
                <div class="review-reply-form">
                  <div class="reply-input-row">
                    <input type="text" id="reply-input-${originalIdx}" class="review-reply-input" maxlength="300" placeholder="Gõ lời phản hồi gửi ${esc(r.customerName)}..." onkeydown="if(event.key==='Enter'){window.game.submitCustomReply(${originalIdx})}" />
                    <button class="btn-send-reply" onclick="window.game.submitCustomReply(${originalIdx})">Gửi 💌</button>
                    ${starCount <= 3 ? `
                      <button class="btn-voucher-apology" onclick="window.game.sendVoucherApology(${originalIdx})" title="Gửi tặng voucher 20% và ly trà sữa bù đắp để gỡ điểm đánh giá lên 5 sao!">
                        🎁 Đền Trà Sữa & Voucher (-15k)
                      </button>
                    ` : ''}
                  </div>
                  <div class="reply-quick-chips">
                    <div style="font-size: 10px; font-weight: 800; color: #7F8C8D; width: 100%; margin-bottom: 3px;">
                      💡 Gợi ý (bấm để điền rồi sửa tùy ý). Khách sẽ đọc kỹ từng chữ bạn viết!
                    </div>
                    ${this.getReviewReplyCategories(starCount, esc(r.customerName)).map(tpl => `
                      <span class="reply-chip" onclick="window.game.fillQuickReplyCategory(${originalIdx}, '${tpl.key}')" title="Bấm để random câu ngẫu nhiên thuộc mục: ${tpl.label}">
                        ${tpl.label} 🎲
                      </span>
                    `).join("")}
                  </div>
                </div>
              `}
            </div>
          `;
        }).join("");

        reviewsList.innerHTML = headerHtml + distributionHtml + filtersHtml + listHtml;
      }
    }
  }

  // ==========================================================
  // HỆ THỐNG NGÂN HÀNG TIẾT KIỆM (BOBA SAVINGS BANK)
  // ==========================================================
  buyFlagshipRealEstate() {
    if (this.state.ownedFlagship) {
      GameUIModal.showToast("🏛️ Bạn đã sở hữu Sổ Đỏ Vĩnh Viễn của Mặt Bằng Flagship này rồi!", "info", "📜");
      return;
    }

    const price = 50000; // 50.000k = 50 triệu VNĐ
    if ((this.state.money || 0) < price) {
      GameUIModal.showToast(`Bạn chưa đủ tiền mặt! Cần ${txaformat.formatVND(price)} (hiện có ${txaformat.formatVND(this.state.money || 0)}) để mua đứt mặt bằng!`, "warning", "💸", 3500);
      return;
    }

    this.state.money -= price;
    this.state.ownedFlagship = true;
    this.sound.playUpgradeFanfare();
    GameUIModal.showToast("🎉 CHÚC MỪNG! BẠN ĐÃ MUA ĐỨT MẶT BẰNG & NHẬN SỔ ĐỎ FLAGSHIP VĨNH VIỄN! MIỄN PHÍ TIỀN THUÊ TRỌN ĐỜI!", "success", "🏛️", 5000);
    this.saveGame();
    this.renderHeader();
    this.renderBankTab();
  }

  depositToBank(amount) {
    if (this.state.dayPhase === "open") {
      GameUIModal.showToast("Quán đang trong ca bán bận rộn! Hãy gửi tiền sau giờ đóng cửa nhé!", "info", "⏱️");
      return;
    }

    const maxLimit = this.getBankDepositLimit();
    const currentSavings = this.state.bank.savings || 0;
    if (currentSavings >= maxLimit) {
      GameUIModal.showToast(`🛡️ Sổ tiết kiệm đã chạm trần hạn mức ${txaformat.formatVND(maxLimit)}! Hãy phục vụ thêm khách 5★ để mở rộng hạn mức!`, "warning", "⚠️", 3500);
      return;
    }

    let val = 0;
    if (amount === "all") {
      val = Math.floor(this.state.money || 0);
    } else {
      val = Number(amount);
    }

    if (val <= 0 || this.state.money < val) {
      GameUIModal.showToast("Ví tiền mặt của bạn không đủ để gửi tiết kiệm số tiền này!", "warning", "⚠️");
      return;
    }

    if (currentSavings + val > maxLimit) {
      val = maxLimit - currentSavings;
      GameUIModal.showToast(`🛡️ Đã điều chỉnh tiền gửi về hạn mức tối đa cho phép: ${txaformat.formatVND(val)} (Trần: ${txaformat.formatVND(maxLimit)})`, "info", "🏦", 3000);
    }

    this.state.money -= val;
    this.state.bank.savings = (this.state.bank.savings || 0) + val;
    this.addBankHistory("deposit", val, "Gửi tiết kiệm tiền mặt");

    this.sound.playCoinChime();
    GameUIModal.showToast(`Đã gửi thành công +${txaformat.formatVND(val)} vào sổ tiết kiệm!`, "success", "🏦");
    this.saveGame();
    this.renderHeader();
    this.renderBankTab();
  }

  withdrawFromBank(amount) {
    if (this.state.dayPhase === "open") {
      GameUIModal.showToast("Quán đang trong ca bán bận rộn! Hãy rút tiền sau giờ đóng cửa nhé!", "info", "⏱️");
      return;
    }

    const currentSavings = this.state.bank.savings || 0;
    let val = 0;
    if (amount === "all") {
      val = Math.floor(currentSavings);
    } else {
      val = Number(amount);
    }

    if (val <= 0 || currentSavings < val) {
      GameUIModal.showToast("Số dư trong sổ tiết kiệm của bạn không đủ để rút số tiền này!", "warning", "⚠️");
      return;
    }

    this.state.bank.savings -= val;
    this.state.money = (this.state.money || 0) + val;
    this.addBankHistory("withdraw", val, "Rút tiền về ví");

    this.sound.playCoinChime();
    GameUIModal.showToast(`Đã rút thành công +${txaformat.formatVND(val)} về ví tiền mặt!`, "success", "💵");
    this.saveGame();
    this.renderHeader();
    this.renderBankTab();
  }

  addBankHistory(type, amount, desc) {
    if (!this.state.bank) return;
    if (!Array.isArray(this.state.bank.history)) this.state.bank.history = [];
    this.state.bank.history.unshift({
      day: this.state.day || 1,
      type,
      amount,
      desc,
      timestamp: Date.now()
    });
    if (this.state.bank.history.length > 25) {
      this.state.bank.history = this.state.bank.history.slice(0, 25);
    }
  }

  // Chấm đỏ trên nút tab Đánh Giá: số đánh giá chưa trả lời
  updateReviewBadge() {
    const navBtn = document.querySelector('.nav-grid-btn[data-tab="tab-reviews"]');
    if (!navBtn) return;
    const count = (this.state.reviews || []).filter(r => !r.replied).length;
    let dot = navBtn.querySelector(".nav-badge-dot");
    if (count > 0) {
      if (!dot) {
        dot = document.createElement("span");
        dot.className = "nav-badge-dot";
        navBtn.appendChild(dot);
      }
      dot.textContent = count > 9 ? "9+" : String(count);
    } else if (dot) {
      dot.remove();
    }
  }

  setReviewFilter(filterKey) {
    this.reviewFilter = filterKey;
    this.renderReviewsTab();
  }

  sendVoucherApology(idx) {
    const rev = this.state.reviews[idx];
    if (!rev) return;

    if (this.state.money < 15) {
      GameUIModal.showToast("Bạn không đủ 15k trong ví để tặng voucher và đền bù cho khách!", "warning", "💸");
      return;
    }

    this.state.money -= 15;
    const voucherOld = rev.stars || 1;
    rev.stars = Math.min(5, voucherOld + 2);
    if (rev.stars === 5 && voucherOld < 5) this.state.stats.fiveStarReviews = (this.state.stats.fiveStarReviews || 0) + 1;
    rev.replied = true;
    rev.rescuedWithVoucher = true;
    rev.ownerReply = "Dạ Bếp Trưởng chân thành xin lỗi bạn nhiều! Tiệm xin phép gửi tặng bạn Voucher giảm giá 20% và đền bù 1 ly Trà Sữa Trân Châu full topping mát lạnh vào lần sau nhé! Mong bạn luôn vui vẻ và thứ lỗi cho quán ạ! 🧋💖";
    rev.customerFeedback = rev.stars === 5
      ? "Ôi quán chu đáo quá, có cả voucher lẫn trà sữa đền bù! Em xóa hết ấm ức, nâng lên 5 sao luôn 🥰"
      : `Quán có lòng đền bù vậy thì em nâng lên ${rev.stars} sao. Lần sau làm tốt hơn là em cho 5 sao liền nha 😊`;
    rev.replyTags = ["Xin lỗi", "Đền bù thật (-15k)"];
    rev.replyEffect = { starDelta: rev.stars - voucherOld, rep: 3, tip: 0, cost: 15 };

    this.state.reputation = Math.min(1000, (this.state.reputation || 30) + 3);

    if (this.sound) {
      this.sound.playCoinChime();
      this.sound.playReviewChime();
    }

    GameUIModal.showToast(`🎁 Đã tặng Voucher 20% & đền ly trà sữa (-15k)! Khách nâng ${voucherOld}★ → ${rev.stars}★ (+3 ⭐ Uy tín)!`, "success", "✨");
    this.saveGame();
    this.renderHeader();
    this.renderReviewsTab();
  }

  // Danh mục phân loại các nút gợi ý phản hồi
  getReviewReplyCategories(stars, custName = "bạn") {
    const pool = this.getReviewReplyPool(stars, custName);
    return Object.keys(pool).map(key => ({
      key: key,
      label: pool[key].label
    }));
  }

  // Kho dữ liệu các câu trả lời phong phú theo từng mục để random ngẫu nhiên khi bấm
  getReviewReplyPool(stars, custName = "bạn") {
    if (stars <= 3) {
      return {
        apology_tea: {
          label: "🧋 Xin lỗi & Tặng trà sữa",
          texts: [
            `Dạ tiệm xin lỗi ${custName} nhiều nha! Lần sau ghé tiệm sẽ bù tặng bạn 1 phần trà sữa trân châu mát lạnh ạ! 🧋`,
            `Chân thành xin lỗi ${custName} vì trải nghiệm chưa trọn vẹn! Tiệm xin gửi tặng bạn 1 ly trà sữa siêu to khổng lồ vào lần tới nhé! 🧋💖`,
            `Dạ tiệm áy náy quá ạ! ${custName} đừng buồn tiệm nha, lần sau ghé quán đãi bạn trà sữa miễn phí liền ạ! 🧋✨`,
            `Tiệm xin lỗi ${custName} thật nhiều! Cho tiệm cơ hội chuộc lỗi bằng một ly trà sữa ngọt lịm mát lạnh vào lần sau nha! 🧋🥰`
          ]
        },
        speed: {
          label: "⚡ Hứa cải thiện tốc độ",
          texts: [
            `Tiệm chân thành ghi nhận góp ý và đã chấn chỉnh ngay tốc độ nấu mì của bếp để phục vụ ${custName} nhanh hơn ạ! ⚡`,
            `Dạ tiệm đã nâng cấp thêm bếp nấu và nhắc nhở nhân viên ra món cấp tốc để ${custName} không phải đợi lâu nữa ạ! 🍲⚡`,
            `Cảm ơn ${custName} đã kiên nhẫn góp ý! Bếp trưởng cam kết lần tới bạn ghé mì sẽ lên bàn nóng hổi chỉ trong tích tắc! ⏱️✨`,
            `Tiệm đang tối ưu lại toàn bộ quy trình bếp nấu, lần sau ${custName} ghé chắc chắn sẽ được phục vụ nhanh như chớp nha! ⚡💨`
          ]
        },
        funny: {
          label: "😆 Rep hài hước lầy lội",
          texts: [
            `Dạ bếp trưởng mải mê canh niêu đất sôi xì xèo nên lỡ chậm tí xíu, mong ${custName} đáng yêu bỏ qua cho tiệm nha haha! 😆💖`,
            `Ahihi ${custName} ơi đừng giận mà tội nghiệp tiệm! Giận mau già đó nha, lần tới ghé tiệm biểu diễn múa mì đền bù nè! 🍜😆`,
            `Oan cho tiệm quá ${custName} ơi, tại niêu mì thơm quá làm đầu bếp đứng ngửi mê mẩn á! Lần sau tiệm xin chừa ạ haha! 🤣🍲`,
            `Dạ em xin quỳ gối tạ lỗi với đại nhân ${custName}! Xin đại nhân bớt giận, lần tới ghé em xin hầu hạ chu đáo tận bàn ạ! 🙇‍♂️😆`
          ]
        },
        overload: {
          label: "🍲 Giờ cao điểm thông cảm",
          texts: [
            `Dạ hôm nay vào giờ cao điểm quán bị quá tải đơn nên để ${custName} phải chờ, tiệm vô cùng áy náy và mong bạn thông cảm ạ! 🍲🙏`,
            `Lúc ${custName} ghé quán đông nghẹt kín bàn nên phục vụ chưa được chu đáo, mong bạn lượng thứ cho tiệm nha! 🙏✨`,
            `Giờ cao điểm khách dồn dập làm bếp hơi lúng túng, tiệm thành thật xin lỗi ${custName} vì sự bất tiện này ạ! 🍲🍂`,
            `Dạ đơn đặt dồn dập khiến tiệm trở tay không kịp, cảm ơn ${custName} đã kiên nhẫn và rất mong bạn thông cảm giúp tiệm ạ! 💖🙏`
          ]
        },
        topping: {
          label: "🥩 Đền bù Topping Bò Mỹ",
          texts: [
            `Dạ sơ suất của tiệm làm ${custName} phiền lòng! Lần tới ghé bảo chủ quán bù tặng ngay 1 đĩa Bò Mỹ tươi ngon nha! 🥩✨`,
            `Để bù đắp cho ${custName}, lần tới ghé tiệm xin phép tặng thêm bạn gấp đôi topping thịt bò ăn cho đã miệng ạ! 🥩🍲`,
            `Tiệm gửi tặng ${custName} một phần topping phô mai / bò mềm vào lần sau để làm hòa nha, bạn đừng giận tiệm nữa nhé! 🧀🥩`,
            `Lần tới ghé nhớ ới chủ quán để nhận ngay đĩa topping đặc biệt đền bù cho ${custName} nhé, mãi yêu bạn! 🥩💖`
          ]
        },
        spicy_adjust: {
          label: "🌶️ Điều chỉnh độ cay chuẩn gu",
          texts: [
            `Dạ nếu cấp độ cay này hơi gắt, lần tới ${custName} ghé tiệm sẽ nấu riêng một niêu đậm đà vừa vặn chuẩn gu bạn luôn ạ! 🌶️🍲`,
            `Tiệm có đủ cấp từ 0 đến 7 nè, lần tới ${custName} nhớ dặn bếp hạ bớt ớt hiểm xuống để ăn ngon miệng nhất nha! 🌶️✨`,
            `Dạ lần tới ghé tiệm sẽ nêm nếm nước dùng ngọt thanh dịu nhẹ hơn đúng theo ý ${custName} luôn ạ! 🍲💖`,
            `Ớt hiểm hôm nay cay nồng quá làm ${custName} vất vả rồi! Lần sau tiệm sẽ điều chỉnh độ cay êm ái hơn nha! 🌶️😋`
          ]
        }
      };
    } else {
      return {
        thanks: {
          label: "💖 Cảm ơn nồng nhiệt",
          texts: [
            `Cảm ơn ${custName} yêu quý nhiều nha! Chúc bạn luôn vui vẻ, tràn đầy năng lượng và ngon miệng mỗi ngày! 💖✨`,
            `Đọc review của ${custName} mà cả tiệm vui cả ngày luôn á! Cảm ơn bạn đã yêu thích hương vị mì cay của quán nha! 💖🍲`,
            `Cảm ơn ${custName} triệu tim! Sự ủng hộ nhiệt tình của bạn là niềm hạnh phúc lớn nhất của tiệm mì nè! 💖🎉`,
            `Tiệm cảm ơn ${custName} nhiều lắm! Chúc bạn luôn có những bữa ăn xì xèo ấm áp và ngon miệng nha! 💖🥰`
          ]
        },
        see_you: {
          label: "🍜 Hẹn gặp lại cùng hội bạn",
          texts: [
            `Cảm ơn ${custName} đã ủng hộ tiệm! Hẹn sớm gặp lại bạn và hội bạn thân ghé xì xèo mì cay trong ca bán tới nhé! 🍜🎉`,
            `Cuối tuần rủ ngay cạ cứng qua tiệm làm nồi lẩu mì cay nóng hổi tiếp nha ${custName} ơi! Hẹn gặp lại bạn nè! 🍜✨`,
            `Tiệm luôn sẵn sàng niêu đất nóng hổi chờ đón ${custName} ghé lại bất cứ lúc nào nha! 🍜💖`,
            `Hẹn gặp lại ${custName} vào một ngày gần nhất nha, quán sẽ chuẩn bị chỗ ngồi view đẹp nhất cho bạn nè! 🪑🍜`
          ]
        },
        spicy_challenge: {
          label: "🔥 Rủ thử cấp cay 6-7",
          texts: [
            `Nghe ${custName} khen ngon mà tiệm ấm lòng ghê! Lần tới ghé thử thách niêu mì cấp 6-7 bốc khói xem sao nha! 🔥🌶️`,
            `Ẩn số cấp 7 đang chờ cao thủ như ${custName} tới chinh phục đó! Lần sau ghé làm một niêu bốc lửa xem sao nhé! 🔥👑`,
            `Ăn cay đỉnh thế này lần sau ghé phải nâng cấp độ lên thôi ${custName} ơi, tiệm đợi bạn phá kỷ lục nè! 🔥🍲`,
            `Khách ăn cay cừ khôi quá chừng! Lần tới nhớ thử cấp độ bốc hỏa của quán xem có làm khó được ${custName} không nha! 🌶️🔥`
          ]
        },
        vip: {
          label: "👑 Tri ân Khách VIP ruột",
          texts: [
            `Những lời khen của ${custName} là động lực to lớn nhất của quán! Tiệm xin phép ghi nhận bạn là Khách VIP ruột của tiệm ạ! 👑🌟`,
            `Vinh danh ${custName} - vị khách quý 10 điểm không có nhưng của tiệm mì cay! Cảm ơn bạn rất nhiều! 👑✨`,
            `Khách ruột VIP có khác, đánh giá có tâm xỉu luôn! Tiệm trân trọng và biết ơn ${custName} nhiều lắm ạ! 👑💖`,
            `Chủ quán đã lưu tên ${custName} vào danh sách Thượng khách VIP rồi nhé, ghé ăn là luôn được ưu tiên nha! 👑🎉`
          ]
        },
        drink: {
          label: "🍑 Mời thêm Trà Đào Cam Sả",
          texts: [
            `Khách dễ thương quá chừng luôn á! Lần tới ghé nhớ gọi thêm ly Trà đào cam sả thanh mát uống giải nhiệt cùng mì cay nha! 🍑🧋`,
            `Ăn mì cay đậm đà mà làm thêm ngụm Trà sữa trân châu hoặc Trà đào là combo chuẩn bài luôn đó ${custName} ơi! 🧋✨`,
            `Lần tới ghé tiệm nhớ thử món Sữa tươi lắc phô mai mát lạnh uống kèm mì cay nha ${custName}, ngon mê ly luôn á! 🥛🧀`,
            `Menu nước giải cay của tiệm đang có nhiều món mới thơm ngon lắm, lần sau ${custName} ghé thử nha! 🍑🥤`
          ]
        },
        sweet: {
          label: "🥰 Thả tim siêu ngọt ngào",
          texts: [
            `Yêu thương ${custName} nhiều nhiều! Tiệm sẽ luôn giữ vững hương vị ngọt xương đậm đà này để đón bạn ghé ăn hoài hoài nhé! 🥰🍲`,
            `U là trời chủ quán đọc xong muốn tan chảy con tim luôn á! Cảm ơn ${custName} dễ thương ngập tràn nha! 🥰💖`,
            `Bếp trưởng gửi ngàn nụ hôn và lời cảm ơn chân thành nhất đến ${custName} nè, yêu bạn nhiều lắm! 🥰✨`,
            `Khách gì mà vừa xinh lại vừa đáng yêu thế này! Cảm ơn ${custName} đã gửi tặng tiệm những lời ấm áp nha! 🥰🍲`
          ]
        }
      };
    }
  }

  // Tự động chọn ngẫu nhiên một câu văn khác biệt thuộc danh mục khi người chơi bấm nút
  fillQuickReplyCategory(idx, categoryKey) {
    const rev = this.state.reviews[idx];
    if (!rev) return;

    const input = document.getElementById(`reply-input-${idx}`);
    if (!input) return;

    const custName = rev.customerName || "bạn";
    const stars = rev.stars || 5;
    const pool = this.getReviewReplyPool(stars, custName);
    const categoryData = pool[categoryKey];

    if (!categoryData || !categoryData.texts || categoryData.texts.length === 0) return;

    const currentVal = input.value.trim();
    // Lọc các câu khác câu đang hiển thị để mỗi lần bấm luôn ra một câu ngẫu nhiên mới
    let candidates = categoryData.texts.filter(t => t !== currentVal);
    if (candidates.length === 0) candidates = categoryData.texts;

    const randomText = candidates[Math.floor(Math.random() * candidates.length)];
    input.value = randomText;
    input.focus();

    // Hiệu ứng nháy sáng nhẹ để người chơi nhận biết câu mới vừa được random điền vào
    input.classList.remove("reply-input-pulse");
    void input.offsetWidth; // Trigger reflow
    input.classList.add("reply-input-pulse");
  }

  fillQuickReply(idx, text) {
    const input = document.getElementById(`reply-input-${idx}`);
    if (input) {
      input.value = text;
      input.focus();
    }
  }

  submitCustomReply(idx) {
    const rev = this.state.reviews[idx];
    if (!rev || rev.replied) return;

    const input = document.getElementById(`reply-input-${idx}`);
    const replyText = input ? input.value.trim() : "";
    if (!replyText) {
      GameUIModal.showToast("Hãy gõ lời phản hồi trước khi gửi cho khách nhé!", "info", "✍️");
      if (input) input.focus();
      return;
    }
    if (replyText.length > 300) {
      GameUIModal.showToast("Phản hồi tối đa 300 ký tự thôi nha!", "warning", "✂️");
      return;
    }

    if (!rev.issues) rev.issues = inferIssues(rev.comment);
    if (!rev.persona) rev.persona = getPersona(rev.customerName).key;

    // Khách đọc hiểu lời chủ tiệm: xin lỗi, đền bù, đổ lỗi, cà khịa, copy paste... rồi đáp lại đúng nội dung
    const history = this.state.reviews.filter(r => r !== rev && r.ownerReply).map(r => r.ownerReply);
    const analysis = analyzeOwnerReply(replyText, rev, history);
    const res = composeCustomerResponse(analysis, rev);

    rev.replied = true;
    rev.ownerReply = replyText;
    rev.customerFeedback = res.text;
    rev.replyTags = res.tags;
    rev.replyTier = res.tier;

    const oldStars = rev.stars || 5;
    rev.stars = Math.max(1, Math.min(5, oldStars + res.starDelta));
    if (rev.stars === 5 && oldStars < 5) {
      this.state.stats.fiveStarReviews = (this.state.stats.fiveStarReviews || 0) + 1;
    }
    this.state.reputation = Math.max(5, Math.min(1000, (this.state.reputation || 30) + res.rep));

    // Hứa đền bù thì tiệm phải chi thật
    const cost = Math.min(res.compensationCost, Math.max(0, this.state.money));
    if (cost > 0) this.state.money -= cost;
    if (res.tip > 0) {
      this.state.money += res.tip;
      this.state.todayTips += res.tip;
      this.state.stats.tipsEarned += res.tip;
      this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + res.tip;
    }
    rev.replyEffect = { starDelta: rev.stars - oldStars, rep: res.rep, tip: res.tip, cost };

    const bits = [];
    if (rev.stars !== oldStars) bits.push(`${oldStars}★ → ${rev.stars}★`);
    if (res.rep) bits.push(`${res.rep > 0 ? "+" : ""}${res.rep} ⭐ danh tiếng`);
    if (res.tip) bits.push(`+${res.tip}k tip`);
    if (cost) bits.push(`-${cost}k đền bù`);
    const toastByTier = {
      delighted: ["Khách rất hài lòng với phản hồi!", "success", "💖"],
      pleased: ["Khách hài lòng với phản hồi.", "success", "😊"],
      neutral: ["Khách đã đọc phản hồi.", "info", "💌"],
      annoyed: ["Khách chưa ưng cách trả lời...", "warning", "😕"],
      furious: ["Khách nổi giận vì phản hồi của tiệm!", "warning", "💥"]
    }[res.tier];
    GameUIModal.showToast(`${toastByTier[0]}${bits.length ? ` (${bits.join(" · ")})` : ""}`, toastByTier[1], toastByTier[2], 3200);

    this.sound.playReviewChime();
    this.saveGame();
    this.renderHeader();
    this.renderReviewsTab();
  }

  // ==========================================================
  // CHẾ ĐỘ MỞ CỬA BÁN MÌ CAY (OPEN COOKING MODE)
  // CHUẨN 100% SCREENSHOT MỚI
  // ==========================================================
  renderOpenMode() {
    this.renderKitchenPanel();
    this.renderStaffKitchenBar();
    this.renderActiveBuffsIndicator();
    this.updateFeverUI();
    this.renderOrderQueue();
    this.renderPotWorkstation();
    this.renderCookingSteps();
    this.renderDiningStage();
    this.renderDaikinAC();
  }

  // ==========================================================
  // HỆ THỐNG GIỜ VÀNG FEVER RUSH (VIP FEATURE v1.5.5)
  // ==========================================================
  addFeverPoints(pts) {
    if (this.isFeverActive) return; // Đang trong giờ vàng thì giữ nguyên
    this.feverPoints = Math.min(100, (this.feverPoints || 0) + pts);
    this.updateFeverUI();

    if (this.feverPoints >= 100) {
      this.triggerFeverRush();
    }
  }

  updateFeverUI() {
    const feverBar = document.getElementById("cockpit-fever-bar");
    const fillEl = document.getElementById("fever-fill");
    const statusText = document.getElementById("fever-status-text");
    const multBadge = document.getElementById("fever-mult-badge");
    const iconEl = document.getElementById("fever-fire-icon");
    const labelEl = document.getElementById("fever-label");

    if (!fillEl || !statusText || !multBadge) return;

    if (this.isFeverActive) {
      if (feverBar) feverBar.classList.add("is-fever-blazing");
      const pct = Math.max(0, Math.min(100, (this.feverRemainingSeconds / FEVER_SECONDS) * 100));
      fillEl.style.width = `${pct}%`;
      fillEl.className = "fever-fill blazing-fever";
      statusText.textContent = `${this.feverRemainingSeconds}s`;
      multBadge.textContent = `🔥 x${FEVER_MULT} DOANH THU`;
      multBadge.className = "fever-mult-badge badge-fever-active";
      if (iconEl) iconEl.textContent = "👑";
      if (labelEl) labelEl.textContent = "BÙNG NỔ!";
    } else {
      if (feverBar) feverBar.classList.remove("is-fever-blazing");
      fillEl.style.width = `${this.feverPoints || 0}%`;
      fillEl.className = "fever-fill";
      statusText.textContent = `${this.feverPoints || 0}/100`;
      multBadge.textContent = "x1 THƯỜNG";
      multBadge.className = "fever-mult-badge";
      if (iconEl) iconEl.textContent = "🔥";
      if (labelEl) labelEl.textContent = "GIỜ VÀNG";
    }
  }

  triggerFeverRush() {
    this.isFeverActive = true;
    this.feverRemainingSeconds = FEVER_SECONDS;
    this.feverPoints = 100;

    if (this.sound && typeof this.sound.playFeverSound === "function") {
      this.sound.playFeverSound();
    }

    const openLayout = document.getElementById("view-open-mode");
    if (openLayout) {
      openLayout.classList.add("is-fever-mode");
      // Hiệu ứng tia sáng vàng bùng nổ
      for (let i = 0; i < 12; i++) {
        const star = document.createElement("div");
        star.className = "fever-gold-sparkle";
        star.textContent = ["👑", "✨", "💰", "🌟", "🔥"][i % 5];
        star.style.left = `${10 + Math.random() * 80}%`;
        star.style.top = `${15 + Math.random() * 60}%`;
        star.style.animationDelay = `${i * 0.07}s`;
        openLayout.appendChild(star);
        setTimeout(() => star.remove(), 2000);
      }
    }

    // Tăng kiên nhẫn cho tất cả khách trên khay lên tối đa
    this.orderSlots.forEach(slot => {
      if (slot) slot.patience = slot.maxPatience;
    });
    this.renderOrderQueue();

    this.updateFeverUI();
    GameUIModal.showToast(`👑🔥 BÙNG NỔ GIỜ VÀNG FEVER RUSH (${FEVER_SECONDS}s)! Doanh thu x${FEVER_MULT} & đóng băng kiên nhẫn khách!`, "success", "👑");
    this.trackProgress("fever");
  }

  endFeverRush() {
    this.isFeverActive = false;
    this.feverRemainingSeconds = 0;
    this.feverPoints = 0;

    const openLayout = document.getElementById("view-open-mode");
    if (openLayout) {
      openLayout.classList.remove("is-fever-mode");
    }

    this.updateFeverUI();
    GameUIModal.showToast("✨ Giờ Vàng Fever Rush đã kết thúc! Tích điểm tiếp để bùng nổ lần nữa nhé!", "info", "🏮");
  }

  handleFeverBarClick() {
    if (this.isFeverActive) {
      GameUIModal.showToast(`🔥 Giờ Vàng đang bùng nổ! Còn ${this.feverRemainingSeconds}s với x${FEVER_MULT} Doanh Thu và khách kiên nhẫn vô hạn!`, "info", "👑");
    } else {
      GameUIModal.showToast(`🔥 Đang tích lũy: ${this.feverPoints || 0}/100 Điểm. Phục vụ đơn (bưng nhanh được nhiều điểm hơn) để kích hoạt Giờ Vàng x${FEVER_MULT} Doanh Thu!`, "info", "⚡");
    }
  }

  // Render các buff nâng cấp đang kích hoạt trong ca bán
  renderActiveBuffsIndicator() {
    const el = document.getElementById("active-buffs-indicator");
    if (!el) return;

    const up = this.state.upgrades;
    const buffs = [];

    if (up.decorScore > 1) {
      buffs.push(`<span class="buff-tag buff-decor">🏮 Decor Cấp ${up.decorScore}</span>`);
    }
    if (up.acCooling > 1) {
      buffs.push(`<span class="buff-tag buff-ac">❄️ Daikin 22°C Cấp ${up.acCooling}</span>`);
    }
    if (up.chiliSecret > 1) {
      buffs.push(`<span class="buff-tag buff-chili">🌶️ Sốt Bí Truyền +${(up.chiliSecret - 1) * 15}% giá</span>`);
    }
    if (up.stoveSpeed > 1) {
      buffs.push(`<span class="buff-tag">🔥 Bếp Gas Cấp ${up.stoveSpeed}</span>`);
    }
    if (up.tableCount > 3) {
      buffs.push(`<span class="buff-tag">🪑 ${up.tableCount} Bàn Sồi</span>`);
    }

    el.innerHTML = buffs.join("");
  }

  // Render Dải Quầy Bếp & Nhân Viên Làm Việc Thực Tế (Active Kitchen Staff Bar)
  renderStaffKitchenBar() {
    const staffBar = document.getElementById("active-staff-kitchen-bar");
    if (!staffBar) return;

    const staff = this.state.staff;
    const workers = [
      {
        name: this.state.ownerName || "Bếp Trưởng",
        role: "Bếp chính",
        avatar: this.state.ownerAvatar || "assets/cust_cat.png",
        active: true
      },
      {
        name: "Mochi",
        role: "Tiếp tân (+25%)",
        avatar: "assets/staff_mochi.png",
        active: !!staff.mochi
      },
      {
        name: "Kenji",
        role: "Tự nấu mì",
        avatar: "assets/staff_kenji.png",
        active: !!staff.kenji
      },
      {
        name: "Usagi",
        role: "Tự bưng bê",
        avatar: "assets/staff_usagi.png",
        active: !!staff.usagi
      },
      {
        name: "Shiba",
        role: "Tạp vụ dọn",
        avatar: "assets/staff_shiba.png",
        active: !!staff.shiba
      },
      {
        name: "Shiro",
        role: "Thu ngân",
        avatar: "assets/cust_fox.png",
        active: !!staff.shiro
      },
      {
        name: "Ducky",
        role: "Barista Trà Sữa",
        avatar: "assets/staff_ducky.png",
        active: !!staff.ducky,
        className: "role-barista"
      },
      {
        name: "Owl",
        role: "Marketing Cú Đêm",
        avatar: "assets/staff_owl.png",
        active: !!staff.owl,
        className: "role-marketing"
      },
      {
        name: "Fawn",
        role: "Logistics Kho",
        avatar: "assets/staff_fawn.png",
        active: !!staff.fawn,
        className: "role-logistics"
      },
      {
        name: "Torto",
        role: "Kế toán trưởng (-50% phí)",
        avatar: "assets/cust_bear.png",
        active: !!staff.torto,
        className: "role-finance"
      },
      {
        name: "Tora",
        role: "Vệ sĩ hòa giải",
        avatar: "assets/cust_shiba.png",
        active: !!staff.tora,
        className: "role-security"
      },
      {
        name: "Ryu",
        role: "Thần Long FEVER",
        avatar: "assets/cust_fox.png",
        active: !!staff.ryu,
        className: "role-dragon"
      }
    ];

    const activeWorkers = workers.filter(w => w.active);

    staffBar.innerHTML = activeWorkers.map(w => `
      <div class="kitchen-worker-pill ${w.className || ''}" title="${w.name}: ${w.role}">
        <img src="${w.avatar}" alt="${w.name}" class="worker-avatar" onerror="this.src='assets/cust_cat.png'" />
        <span class="worker-name">${w.name}</span>
        <span class="worker-role">${w.role}</span>
      </div>
    `).join("");

    if (activeWorkers.length <= 1) {
      staffBar.innerHTML += `
        <div class="kitchen-worker-pill" style="opacity: 0.8; font-size: 11px; cursor: pointer; flex-basis: 100%; white-space: normal;" onclick="window.game.switchTab('tab-staff');">
          <span>💡 Vào Tab "Nhân viên" thuê Gấu Kenji & Thỏ Usagi để tự động nấu và bưng mỳ!</span>
        </div>
      `;
    }
  }

  // Món trong đơn đã hết sạch kho -> được phép bưng thiếu món đó (khách thông cảm nhưng không trả tiền phần thiếu)
  isItemSoldOut(type, id) {
    const item = this.state[type] ? this.state[type][id] : null;
    return !item || item.stock <= 0;
  }

  // Lý do niêu hiện tại chưa đúng đơn (null = bưng được). Dùng chung cho người chơi, Usagi, ticket và phím tắt
  getOrderMismatch(order, pot = this.currentPot) {
    if (!order || !pot || !pot.noodleId) return "Bạn chưa chọn mì vào niêu đất để nấu!";
    if (pot.noodleId !== order.noodleId) {
      return `Khách muốn ${order.noodleName}, niêu hiện tại là ${this.state.noodles[pot.noodleId]?.name || "món khác"}!`;
    }
    if (order.size && pot.size !== order.size) {
      return `Khách gọi niêu Size ${order.size}, niêu trên bếp đang là Size ${pot.size}!`;
    }
    if (pot.spicyLevel !== order.spicyLevel) {
      return `Khách muốn cay Cấp ${order.spicyLevel}, niêu trên bếp đang là Cấp ${pot.spicyLevel}!`;
    }
    if (order.toppingId && !pot.toppings.includes(order.toppingId) && !this.isItemSoldOut("toppings", order.toppingId)) {
      return `Khách muốn thêm ${order.toppingName || "topping"}, niêu hiện tại chưa có!`;
    }
    if (order.drinkId && pot.drinkId !== order.drinkId && !this.isItemSoldOut("drinks", order.drinkId)) {
      return `Khách gọi kèm ${order.drinkName || "đồ uống"}, khay chưa có ly này!`;
    }
    return null;
  }

  // Niêu đang nấu có khớp đúng đơn khách gọi không (mì, size, cấp cay, topping, đồ uống)
  isPotMatchingOrder(order) {
    return Boolean(this.currentPot.noodleId) && !this.getOrderMismatch(order);
  }

  // Hóa đơn 1 đơn tại quán: chỉ tính những món khách gọi & thực sự được bưng ra.
  // priceRatio chỉ so giá người chơi tự đặt với giá thị trường (không tính buff nâng cấp),
  // để nâng cấp Sốt Ớt / Shichimi không còn bị khách chê "chặt chém".
  calcOrderBill(order, { missingTopping = false, missingDrink = false } = {}) {
    const st = this.state;
    const noodle = st.noodles[order.noodleId];
    const top = order.toppingId && !missingTopping ? st.toppings[order.toppingId] : null;
    const drink = order.drinkId && !missingDrink ? st.drinks[order.drinkId] : null;
    const sizeFee = order.size === "L" ? SIZE_L_SURCHARGE : 0;

    const setFood = (noodle ? noodle.price : 40) + sizeFee + (top ? top.price : 0);
    const marketFood = (noodle ? (noodle.basePrice || noodle.price) : 40) + sizeFee + (top ? (top.basePrice || top.price) : 0);

    let food = setFood;
    const chiliLv = st.upgrades.chiliSecret || 1;
    if (chiliLv > 1) food *= 1 + (chiliLv - 1) * 0.12;
    const shichimiLv = st.upgrades.shichimiSpice || 0;
    if (shichimiLv > 0 && order.spicyLevel >= 3) food *= 1 + shichimiLv * 0.15;
    food = Math.round(food);

    const drinkPrice = drink ? drink.price : 0;
    const duckyBonus = drink && st.staff.ducky ? Math.round(drinkPrice * 0.25) : 0;
    const setTotal = setFood + drinkPrice;
    const marketTotal = marketFood + (drink ? (drink.basePrice || drink.price) : 0);

    return {
      noodle, top, drink, food, drinkPrice, duckyBonus,
      total: food + drinkPrice + duckyBonus,
      priceRatio: marketTotal > 0 ? setTotal / marketTotal : 1
    };
  }

  // Trừ nguyên liệu phụ trong kho cho 1 phần bán ra, trả về tên các thứ đã thiếu
  consumeSupplies(ids) {
    const missing = [];
    ids.forEach(id => {
      const sup = this.state.supplies[id];
      if (!sup) return;
      if (sup.stock > 0) sup.stock -= 1;
      else missing.push(sup.name);
    });
    return missing;
  }

  getSuppliesForOrder(order, withDrink) {
    const ids = [...BOWL_SUPPLIES];
    if (order.spicyLevel > 0) ids.push("sot_ot");
    if (withDrink) ids.push(...DRINK_SUPPLIES);
    if (order.toppingId && order.toppingId.startsWith("top_")) ids.push("duong_den_dailoan");
    return ids;
  }

  // Render 3 Phiếu Order Treo Trên Thanh Ray Bếp
  // Chỉ dựng lại phiếu khi đơn thay đổi; mỗi giây chỉ cập nhật thanh kiên nhẫn để không nuốt mất cú chạm của người chơi
  renderOrderQueue() {
    const queueGrid = document.getElementById("order-queue-grid");
    if (!queueGrid) return;

    if (!this.ticketSigs || queueGrid.children.length !== this.orderSlots.length) {
      this.ticketSigs = [];
      queueGrid.innerHTML = this.orderSlots.map(() => "<div></div>").join("");
    }

    this.orderSlots.forEach((slot, idx) => {
      const view = this.getOrderTicketView(slot, idx);
      let card = queueGrid.children[idx];
      if (this.ticketSigs[idx] !== view.sig) {
        this.ticketSigs[idx] = view.sig;
        const holder = document.createElement("div");
        holder.innerHTML = view.html.trim();
        const fresh = holder.firstElementChild;
        card.replaceWith(fresh);
        card = fresh;
      }
      if (slot) this.updateOrderTicketPatience(card, slot);
    });

    if (this.scene) this.scene.requestSync();
  }

  getOrderTicketView(slot, idx) {
    if (!slot) {
      return {
        sig: "empty",
        html: `
          <div class="order-slot-card slot-empty kt-ticket kt-ticket-empty">
            <span class="kt-clip"></span>
            <span class="kt-empty-icon">🪑</span>
            <span class="kt-empty-label">Phiếu #${idx + 1}</span>
            <span class="kt-empty-sub">Chờ khách ghé...</span>
          </div>
        `
      };
    }

    const cust = slot.customer;
    const order = slot.order;
    const isMatch = this.isPotMatchingOrder(order);
    const isSpecialCombo = Boolean(slot.isSpecialCombo || this.isSpecialComboOrder(order));
    const isVipCust = Boolean(cust.isVip);
    const noodleItem = this.state.noodles[order.noodleId];
    const topItem = order.toppingId ? this.state.toppings[order.toppingId] : null;
    const drinkItem = order.drinkId ? this.state.drinks[order.drinkId] : null;
    const orderCurrentPrice = this.calcOrderBill(order).total;
    const isNoodleOutOfStock = !noodleItem || noodleItem.stock <= 0;
    const isTopSoldOut = Boolean(topItem && topItem.stock <= 0);
    const isDrinkSoldOut = Boolean(drinkItem && drinkItem.stock <= 0);
    const dishName = (order.noodleName || "Mì cay").replace(/^Mì cay\s+/i, "");

    let ribbon = "";
    if (isVipCust) ribbon = '<div class="kt-tk-ribbon is-vip">👑 VIP Thần Tài · Tip vàng</div>';
    else if (isSpecialCombo) ribbon = '<div class="kt-tk-ribbon is-special">✨ Món đặc biệt +Bonus</div>';
    else if (slot.isSpecial) ribbon = '<div class="kt-tk-ribbon">⭐ Món tâm đắc</div>';

    const sig = [cust.name, order.noodleId, order.size, order.spicyLevel, order.toppingId, order.drinkId, isMatch, isSpecialCombo, isVipCust, slot.isSpecial, isNoodleOutOfStock, isTopSoldOut, isDrinkSoldOut, orderCurrentPrice].join("|");

    return {
      sig,
      html: `
        <div id="order-slot-${idx}" class="order-slot-card kt-ticket ${isVipCust ? 'is-vip-customer-card' : ''} ${isSpecialCombo ? 'is-special-combo-slot' : ''} ${isMatch ? 'is-matching-dish' : ''}">
          <span class="kt-clip"></span>
          <div class="kt-tk-head">
            <span class="kt-tk-avatar">
              <img src="${cust.avatar}" alt="" onerror="this.src='assets/cust_cat.png'" />
              ${isVipCust ? '<span class="kt-tk-crown">👑</span>' : ''}
            </span>
            <span class="kt-tk-who">
              <b class="kt-tk-name" title="${cust.name}">${cust.name}</b>
              <small class="kt-tk-mood"></small>
            </span>
            <button class="kt-tk-reject" onclick="window.game.rejectSlot(${idx})" title="Từ chối khách" aria-label="Từ chối khách">✕</button>
          </div>
          ${ribbon}
          <button class="kt-tk-dish" onclick="window.game.quickCookForSlot(${idx})" title="Chạm để nấu nhanh đúng đơn này">
            <span class="kt-tk-dish-icon">${noodleItem ? noodleItem.icon : "🍜"}</span>
            <span class="kt-tk-dish-name">${dishName}</span>
          </button>
          <div class="kt-tk-chips">
            <span class="kt-chip">Size ${order.size}</span>
            <span class="kt-chip is-spicy">🌶️ ${order.spicyLevel}</span>
            ${topItem ? `<span class="kt-chip is-top ${isTopSoldOut ? "is-soldout" : ""}">+${topItem.icon} ${topItem.shortName || topItem.name}</span>` : ""}
            ${drinkItem ? `<span class="kt-chip is-drink ${isDrinkSoldOut ? "is-soldout" : ""}" title="${drinkItem.name}">+${drinkItem.icon} Nước</span>` : ""}
          </div>
          <div class="kt-tk-price" title="Hóa đơn dự kiến (đã gồm nâng cấp tăng giá)">🏷️ ${txaformat.formatVND(orderCurrentPrice)}</div>
          ${isNoodleOutOfStock ? '<div class="kt-tk-warn">⚠️ Hết mì trong kho</div>' : ((isTopSoldOut || isDrinkSoldOut) ? '<div class="kt-tk-warn is-soft">ℹ️ Hết món kèm · bưng thiếu được</div>' : "")}
          <div class="order-patience-track"><div class="order-patience-fill"></div></div>
          <div class="order-actions-row">
            <button class="btn-quick-cook" onclick="window.game.quickCookForSlot(${idx})" title="Tự động chuẩn bị niêu đất đúng đơn khách này">⚡ Nấu</button>
            <button class="btn-serve-slot ${isMatch ? 'is-matching' : ''} ${isSpecialCombo ? 'is-special-combo-btn' : ''}" onclick="window.game.serveToSlot(${idx})" title="Bưng món cho khách (phím ${idx + 1})">🛎️ Bưng</button>
          </div>
        </div>
      `
    };
  }

  updateOrderTicketPatience(card, slot) {
    const pct = Math.max(0, Math.min(100, (slot.patience / slot.maxPatience) * 100));
    const patienceClass = pct < 25 ? "patience-danger" : (pct < 55 ? "patience-warning" : "");
    const fill = card.querySelector(".order-patience-fill");
    if (fill) {
      fill.style.width = `${pct}%`;
      fill.className = `order-patience-fill ${patienceClass}`;
    }
    const mood = card.querySelector(".kt-tk-mood");
    const moodText = this.isFeverActive ? `🔥 Giờ vàng x${FEVER_MULT}` : (pct > 55 ? "😊 Đang đợi món" : (pct > 25 ? "🤤 Sốt ruột" : "💦 Sắp về"));
    if (mood && mood.textContent !== moodText) mood.textContent = moodText;
    card.classList.toggle("is-impatient", pct < 25);
  }

  // ==========================================================
  // BẢNG ĐIỀU KHIỂN BẾP: CHUỖI PHỤC VỤ, THỐNG KÊ HÔM NAY, MÓN ĐẶC BIỆT, PHỤ BẾP
  // ==========================================================
  bumpServeStreak() {
    this.serveStreak = (this.serveStreak || 0) + 1;
    this.bestServeStreak = Math.max(this.bestServeStreak || 0, this.serveStreak);
    // Mốc chuỗi đã hiện ngay trong toast bưng món ("⛓️ Chuỗi +x%"), không bắn thêm toast để khỏi đè nhau
    this.state.stats.bestStreak = Math.max(this.state.stats.bestStreak || 0, this.serveStreak);
    this.trackProgress("streak");
    this.renderKitchenPanel(true);
  }

  resetServeStreak() {
    this.serveStreak = 0;
    this.renderKitchenPanel();
  }

  renderKitchenPanel(popStreak = false) {
    const streakEl = document.getElementById("kt-streak");
    if (streakEl) {
      const streak = this.serveStreak || 0;
      const text = `🔥 Chuỗi x${streak}`;
      if (streakEl.textContent !== text) streakEl.textContent = text;
      streakEl.classList.toggle("is-hot", streak >= 5);
      streakEl.classList.toggle("is-zero", streak === 0);
      if (popStreak) {
        streakEl.classList.remove("pop");
        void streakEl.offsetWidth;
        streakEl.classList.add("pop");
      }
    }

    const todayEl = document.getElementById("kt-today");
    if (todayEl) {
      const text = `🍜 ${this.state.todayBowlsSold || 0} · 🧋 ${this.state.todayDrinksSold || 0} · 💰 +${txaformat.formatVND(this.state.todayEarnings || 0)}`;
      if (todayEl.textContent !== text) todayEl.textContent = text;
    }

    const specialEl = document.getElementById("kt-special-chip");
    const combo = this.state.specialCombo;
    if (specialEl && combo) {
      const sig = `${combo.noodleId}|${combo.spicyLevel}|${combo.toppingId}`;
      if (specialEl.dataset.sig !== sig) {
        specialEl.dataset.sig = sig;
        const noodle = this.state.noodles[combo.noodleId];
        const top = this.state.toppings[combo.toppingId];
        const dish = noodle ? `${noodle.icon} ${noodle.name.replace(/^Mì cay\s+/i, "")}` : "";
        specialEl.innerHTML = `<span class="kt-special-label">🌟 Đặc biệt hôm nay</span><span class="kt-special-dish">${dish} · 🌶️ ${combo.spicyLevel}${top ? ` · +${top.icon} ${top.shortName || top.name}` : ""}</span>`;
      }
    }

    this.renderKitchenHelpers();
  }

  // Phụ bếp đã thuê đứng cạnh bếp niêu (Kenji nấu, Ducky pha trà, Usagi bưng, Shiba dọn)
  renderKitchenHelpers() {
    const wrap = document.getElementById("kt-helpers");
    if (!wrap) return;
    const staff = this.state.staff || {};
    const helpers = [
      { key: "kenji", name: "Kenji", role: "Tự nấu", avatar: "assets/staff_kenji.png" },
      { key: "ducky", name: "Ducky", role: "Pha trà", avatar: "assets/staff_ducky.png" },
      { key: "usagi", name: "Usagi", role: "Bưng bê", avatar: "assets/staff_usagi.png" },
      { key: "shiba", name: "Shiba", role: "Dọn bàn", avatar: "assets/staff_shiba.png" }
    ].filter(h => staff[h.key]);
    const sig = helpers.map(h => h.key).join(",") || "none";
    if (wrap.dataset.sig === sig) return;
    wrap.dataset.sig = sig;
    wrap.innerHTML = helpers.length
      ? helpers.map(h => `<span class="kt-helper" title="${h.name}: ${h.role}"><img src="${h.avatar}" alt="${h.name}" onerror="this.src='assets/cust_cat.png'" /><b>${h.role}</b></span>`).join("")
      : '<span class="kt-helper-hint">💡 Thuê Kenji & Usagi để bếp tự chạy</span>';
  }

  // Render Khu Vực Niêu Đất Nấu Mì (Workstation Trung Tâm Sôi Sùng Sục)
  renderPotWorkstation() {
    const potEl = document.getElementById("korean-clay-pot");
    const soupLake = document.getElementById("pot-soup-lake");
    const noodlesLayer = document.getElementById("pot-noodles-layer");
    const toppingsLayer = document.getElementById("pot-toppings-layer");
    const titleEl = document.getElementById("pot-title-status");
    const subEl = document.getElementById("pot-sub-status");
    const cookingBadge = document.getElementById("pot-cooking-badge");
    const spicyIndicator = document.getElementById("pot-spicy-indicator");
    const summaryPills = document.getElementById("pot-summary-pills");
    const drinkPreview = document.getElementById("pot-drink-preview");
    const gasBurner = document.getElementById("pot-gas-burner");

    if (!titleEl || !subEl) return;

    const pot = this.currentPot;

    // Cập nhật size niêu đất và hiệu ứng bốc lửa khi cấp cay 6-7
    const steamEl = document.getElementById("pot-steam-particles");
    if (potEl) {
      const isBlazing = Boolean(pot.noodleId && pot.spicyLevel >= 6);
      potEl.className = `korean-clay-pot size-${pot.size.toLowerCase()} ${isBlazing ? "is-spicy-blaze" : ""}`;
    }

    if (!pot.noodleId) {
      if (steamEl) steamEl.style.display = "none";
      titleEl.textContent = pot.size === "L" ? "Niêu Lớn (Đang Trống)" : "Niêu Vừa (Đang Trống)";
      subEl.textContent = "Chạm chọn Mì & Nước Dùng bên dưới để bắt đầu nấu";
      if (soupLake) {
        soupLake.style.height = "16%";
        soupLake.style.background = "linear-gradient(180deg, #3E2723 0%, #24130A 100%)";
      }
      if (noodlesLayer) noodlesLayer.textContent = "";
      if (toppingsLayer) toppingsLayer.innerHTML = "";
      if (cookingBadge) {
        cookingBadge.textContent = "🥣 Chờ Chọn Món";
        cookingBadge.style.background = "#F5EBE0";
        cookingBadge.style.color = "#7D5A44";
      }
      if (spicyIndicator) {
        spicyIndicator.textContent = `Cấp ${pot.spicyLevel}`;
      }
      if (summaryPills) summaryPills.innerHTML = "";
      if (drinkPreview) drinkPreview.textContent = "";
      if (gasBurner) gasBurner.style.opacity = "0.35";
    } else {
      if (steamEl) {
        steamEl.style.display = "flex";
        if (pot.spicyLevel >= 6) {
          steamEl.innerHTML = `<span class="steam-wisp steam-1">🔥</span><span class="steam-wisp steam-2">🌶️</span><span class="steam-wisp steam-3">♨️</span>`;
        } else {
          steamEl.innerHTML = `<span class="steam-wisp steam-1">♨️</span><span class="steam-wisp steam-2">♨️</span>`;
        }
      }
      const noodle = this.state.noodles[pot.noodleId];
      const noodleName = noodle ? noodle.name : "Mì cay";
      titleEl.textContent = `${noodleName} (Cấp ${pot.spicyLevel})`;

      const tops = pot.toppings.map(id => this.state.toppings[id] ? this.state.toppings[id].name : "").filter(Boolean);
      const topStr = tops.length > 0 ? ` · Thêm: ${tops.join(", ")}` : " · Chưa thêm topping";
      subEl.textContent = `Size ${pot.size}${topStr}`;

      if (gasBurner) gasBurner.style.opacity = "1";

      // Nước dùng đổi màu sôi sùng sục theo cấp độ cay
      if (soupLake) {
        soupLake.style.height = "76%";
        const spicyGradients = [
          "linear-gradient(180deg, #FAD390 0%, #F6B93B 100%)", // Cấp 0: xương hầm vàng óng
          "linear-gradient(180deg, #FA983A 0%, #E55039 100%)", // Cấp 1
          "linear-gradient(180deg, #F1793A 0%, #EB4D4B 100%)", // Cấp 2
          "linear-gradient(180deg, #EB2F06 0%, #C44569 100%)", // Cấp 3: cay vừa
          "linear-gradient(180deg, #D63031 0%, #B71540 100%)", // Cấp 4
          "linear-gradient(180deg, #B71540 0%, #880E4F 100%)", // Cấp 5
          "linear-gradient(180deg, #880E4F 0%, #580000 100%)", // Cấp 6
          "linear-gradient(180deg, #580000 0%, #200000 100%)"  // Cấp 7: bốc hỏa
        ];
        soupLake.style.background = spicyGradients[Math.min(7, Math.max(0, pot.spicyLevel))];
      }

      if (noodlesLayer) noodlesLayer.textContent = "🍜";

      // Topping thả vào mặt niêu đất
      if (toppingsLayer) {
        toppingsLayer.innerHTML = pot.toppings.map(id => {
          const t = this.state.toppings[id];
          return t ? `<span>${t.icon}</span>` : "";
        }).join(" ");
      }

      if (cookingBadge) {
        cookingBadge.textContent = "🔥 Đang Sôi Xì Xèo";
        cookingBadge.style.background = "#EAF5EE";
        cookingBadge.style.color = "#227554";
      }

      if (spicyIndicator) {
        spicyIndicator.textContent = `Cấp ${pot.spicyLevel} 🌶️`;
      }

      if (summaryPills) {
        summaryPills.innerHTML = [
          `<span class="pot-pill-tag">🍜 ${noodleName}</span>`,
          `<span class="pot-pill-tag">Niêu ${pot.size}</span>`,
          `<span class="pot-pill-tag" style="color:#D32F2F;">🌶️ Cấp ${pot.spicyLevel}</span>`,
          ...pot.toppings.map(id => `<span class="pot-pill-tag">${this.state.toppings[id] ? this.state.toppings[id].name : ""}</span>`)
        ].join("");
      }

      if (drinkPreview) {
        drinkPreview.textContent = pot.drinkId && this.state.drinks[pot.drinkId] ? `+ ${this.state.drinks[pot.drinkId].icon} ${this.state.drinks[pot.drinkId].name}` : "";
      }
    }

    const stickyLabel = document.getElementById("sticky-pot-label");
    if (stickyLabel) {
      if (!pot.noodleId) {
        stickyLabel.textContent = `Niêu ${pot.size} · Cấp ${pot.spicyLevel} · Chưa chọn mì`;
      } else {
        const noodle = this.state.noodles[pot.noodleId];
        const noodleName = noodle ? noodle.name : "Mì cay";
        stickyLabel.textContent = `Niêu ${pot.size} · Cấp ${pot.spicyLevel} 🌶️ · ${noodleName}`;
      }
    }

    // Cập nhật nút mini-size trên bảng niêu đất
    const miniM = document.getElementById("mini-size-m");
    const miniL = document.getElementById("mini-size-l");
    if (miniM && miniL) {
      miniM.classList.toggle("active", pot.size === "M");
      miniL.classList.toggle("active", pot.size === "L");
    }

    // Cập nhật nút Bưng Khớp Đơn (chuông 🛎️ rung khi niêu đã khớp đơn) và trạng thái bếp
    const hasMatch = this.orderSlots.some(slot => slot && this.isPotMatchingOrder(slot.order));
    const directServeBtn = document.getElementById("btn-direct-serve");
    if (directServeBtn) directServeBtn.classList.toggle("is-ready", hasMatch);
    const potCard = document.querySelector(".pot-workstation-card");
    if (potCard) {
      potCard.classList.toggle("is-ready", hasMatch);
      potCard.classList.toggle("is-cooking", Boolean(pot.noodleId));
    }
  }

  // Chuyển Tab Mở Bán Trên Mobile (Bếp Nấu Siêu Tốc vs Sảnh Bàn Ăn)
  switchMobileOpenTab(tab) {
    this.mobileOpenTab = tab;
    const cockpitBtn = document.getElementById("btn-tab-cockpit");
    const diningBtn = document.getElementById("btn-tab-dining");
    const openLayout = document.getElementById("open-mode-responsive-layout");
    if (cockpitBtn && diningBtn && openLayout) {
      cockpitBtn.classList.toggle("active", tab === "cockpit");
      diningBtn.classList.toggle("active", tab === "dining");
      openLayout.setAttribute("data-mobile-tab", tab);
    }
    this.sound.playButtonClick();
  }

  // Chuyển Tab Dock Chọn Nguyên Liệu (Zero-Scroll Dock)
  switchCookingDockTab(tab) {
    this.cookingDockTab = tab;
    const tabs = ["quick", "noodle", "topping", "spicy", "drink"];
    tabs.forEach(t => {
      const btn = document.getElementById(`dock-tab-${t}`);
      const pane = document.getElementById(`pane-dock-${t}`);
      if (btn) btn.classList.toggle("active", t === tab);
      if (pane) pane.style.display = (t === tab) ? "block" : "none";
    });
    this.sound.playButtonClick();
    this.renderCookingSteps();
  }

  // Render Danh Sách Món Mẫu Phổ Biến (Quick Presets)
  renderQuickPresets() {
    const grid = document.getElementById("quick-presets-grid");
    if (!grid) return;

    const presets = [
      { noodleId: "my_bo", name: "Mì Bò Mỹ", icon: "🥩", size: "M", spicy: 2, toppingId: "bo", sub: "M · Cay 2 · Bò" },
      { noodleId: "my_haisan", name: "Mì Hải Sản", icon: "🦐", size: "M", spicy: 3, toppingId: "tom", sub: "M · Cay 3 · Tôm" },
      { noodleId: "my_bo", name: "Combo Mì Bò & Boba", icon: "🧋", size: "M", spicy: 2, toppingId: "top_boba_black", sub: "M · Cay 2 · Trân châu" },
      { noodleId: "my_thapcam", name: "Mì Thập Cẩm", icon: "🍲", size: "M", spicy: 3, toppingId: "xucxich", sub: "M · Cay 3 · Xúc xích" },
      { noodleId: "my_kimchi", name: "Mì Kim Chi", icon: "🥬", size: "M", spicy: 1, toppingId: "kimchi", sub: "M · Cay 1 · Kim chi" },
      { noodleId: "my_tomyum", name: "Mì Tomyum", icon: "🌶️", size: "M", spicy: 4, toppingId: "muc", sub: "M · Cay 4 · Mực" },
      { noodleId: "my_nam", name: "Mì Lẩu Nấm", icon: "🍄", size: "M", spicy: 1, toppingId: "nam", sub: "M · Cay 1 · Nấm" },
      { noodleId: "my_baongu", name: "Niêu Bào Ngư", icon: "👑", size: "L", spicy: 5, toppingId: "bo", sub: "L · Cay 5 · Bò" }
    ];

    grid.innerHTML = presets.map(p => {
      const noodle = this.state.noodles[p.noodleId];
      const isUnlocked = noodle && noodle.unlocked;
      const hasStock = noodle && noodle.stock > 0;
      const isAvailable = isUnlocked && hasStock;

      return `
        <div class="preset-recipe-card ${!isAvailable ? 'preset-disabled' : ''}" 
             onclick="window.game.applyRecipePreset('${p.noodleId}', '${p.size}', ${p.spicy}, '${p.toppingId}')"
             style="${!isAvailable ? 'opacity: 0.55;' : ''}"
             title="${isAvailable ? 'Bấm để nạp nhanh niêu mì này!' : (!isUnlocked ? 'Chưa mở khóa mì này!' : 'Hết mì trong kho!')}">
          <span class="preset-icon">${p.icon}</span>
          <div class="preset-info">
            <span class="preset-name">${p.name}</span>
            <span class="preset-sub">${isAvailable ? p.sub : (!isUnlocked ? 'Chưa mở' : 'Hết mì')}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  // Nạp Nhanh Công Thức Mẫu Vào Niêu Đất
  applyRecipePreset(noodleId, size, spicy, toppingId) {
    const noodle = this.state.noodles[noodleId];
    if (!noodle || !noodle.unlocked) {
      GameUIModal.showToast("Món mì này chưa được mở khóa trong Thực đơn!", "warning", "🔒");
      return;
    }
    if (noodle.stock <= 0) {
      GameUIModal.showToast(`Trong kho đã hết ${noodle.name} rồi! Vào Kho bổ sung nhé!`, "warning", "⚠️");
      return;
    }

    this.currentPot.noodleId = noodleId;
    this.currentPot.size = size || "M";
    this.currentPot.spicyLevel = spicy || 0;
    this.currentPot.toppings = toppingId && this.state.toppings[toppingId]?.stock > 0 ? [toppingId] : [];
    this.currentPot.drinkId = null;

    this.sound.playCookingSizzle();
    this.triggerPotBounce();
    GameUIModal.showToast(`⚡ Đã nấu niêu ${noodle.name} (Cấp ${spicy})! Bấm "Bưng ngay" để phục vụ!`, "success", noodle.icon);

    this.renderPotWorkstation();
    this.renderCookingSteps();
    this.renderOrderQueue();
  }

  // Render Các Bước Lựa Chọn Nấu Mì
  renderCookingSteps() {
    // 0. Render các món mẫu 1-chạm
    this.renderQuickPresets();

    // 1. Size Niêu (Sync cả 2 vị trí: Tab Cay và Tab Chọn Mì)
    const btnM = document.getElementById("btn-size-m");
    const btnL = document.getElementById("btn-size-l");
    const btnMInline = document.getElementById("btn-size-m-inline");
    const btnLInline = document.getElementById("btn-size-l-inline");

    [btnM, btnMInline].forEach(b => {
      if (b) {
        b.classList.toggle("active", this.currentPot.size === "M");
        b.onclick = () => this.selectPotSize("M");
      }
    });
    [btnL, btnLInline].forEach(b => {
      if (b) {
        b.classList.toggle("active", this.currentPot.size === "L");
        b.onclick = () => this.selectPotSize("L");
      }
    });

    // 2. Cấp Độ Cay 0 - 7 (Hiển thị ngay trong tab Chọn Mì và tab Cay & Size)
    const spicyWrap = document.getElementById("spicy-levels-options");
    const spicyWrapInline = document.getElementById("spicy-levels-options-inline");
    const spicyButtonsHtml = [0, 1, 2, 3, 4, 5, 6, 7].map(lvl => `
      <button class="btn-spicy-level level-${lvl} ${this.currentPot.spicyLevel === lvl ? 'active' : ''}" onclick="window.game.selectSpicyLevel(${lvl})" title="Cấp độ cay ${lvl}">
        ${lvl}
      </button>
    `).join("");

    if (spicyWrap) spicyWrap.innerHTML = spicyButtonsHtml;
    if (spicyWrapInline) spicyWrapInline.innerHTML = spicyButtonsHtml;

    // 3. Mì cay (có badge số lượng tồn kho tròn nổi trên đầu chuẩn ảnh)
    const noodleWrap = document.getElementById("cooking-noodles-grid");
    if (noodleWrap) {
      const activeNoodles = Object.values(this.state.noodles).filter(n => n.unlocked);
      noodleWrap.innerHTML = activeNoodles.map(n => `
        <div class="ingredient-badge-card ${this.currentPot.noodleId === n.id ? 'selected' : ''} ${this.getStockClass(n.stock)}" onclick="window.game.selectNoodle('${n.id}')">
          <span class="ingredient-stock-bubble">${n.stock}</span>
          <span class="ingredient-icon">${n.icon}</span>
          <span class="ingredient-name">${n.name}</span>
        </div>
      `).join("");
    }

    // 4. Topping (có badge số lượng)
    const topWrap = document.getElementById("cooking-toppings-grid");
    if (topWrap) {
      const activeTops = Object.values(this.state.toppings).filter(t => t.unlocked);
      topWrap.innerHTML = activeTops.map(t => {
        const isSelected = this.currentPot.toppings.includes(t.id);
        return `
          <div class="ingredient-badge-card ${isSelected ? 'selected' : ''} ${this.getStockClass(t.stock)}" onclick="window.game.toggleTopping('${t.id}')">
            <span class="ingredient-stock-bubble">${t.stock}</span>
            <span class="ingredient-icon">${t.icon}</span>
            <span class="ingredient-name">${t.name}</span>
          </div>
        `;
      }).join("");
    }

    // 5. Nước giải cay
    const drinkWrap = document.getElementById("cooking-drinks-grid");
    if (drinkWrap) {
      const activeDrinks = Object.values(this.state.drinks).filter(d => d.unlocked);
      drinkWrap.innerHTML = activeDrinks.map(d => {
        const isSelected = this.currentPot.drinkId === d.id;
        return `
          <div class="ingredient-badge-card ${isSelected ? 'selected' : ''} ${this.getStockClass(d.stock)}" onclick="window.game.toggleDrink('${d.id}')">
            <span class="ingredient-stock-bubble">${d.stock}</span>
            <span class="ingredient-icon">${d.icon}</span>
            <span class="ingredient-name">${d.name}</span>
          </div>
        `;
      }).join("");
    }

    // Cập nhật câu hướng dẫn bước linh hoạt
    const guidePill = document.getElementById("step-guide-pill");
    if (guidePill) {
      const anyMatch = this.orderSlots.some(slot => slot && this.currentPot.noodleId &&
        this.currentPot.noodleId === slot.order.noodleId &&
        (!slot.order.size || this.currentPot.size === slot.order.size) &&
        (this.currentPot.spicyLevel === slot.order.spicyLevel) &&
        (!slot.order.toppingId || this.currentPot.toppings.includes(slot.order.toppingId))
      );

      if (anyMatch) {
        guidePill.innerHTML = "✨ <strong>Niêu mỳ đã nấu đúng món khách gọi!</strong> Bấm nút <strong>'Bưng ngay'</strong> ở khay trên để phục vụ nhận tiền!";
        guidePill.style.background = "#EBF7F2";
        guidePill.style.color = "#1B6650";
        guidePill.style.borderColor = "#A3E0C8";
      } else if (!this.currentPot.noodleId) {
        guidePill.innerHTML = "ⓘ <strong>Nấu siêu tốc:</strong> Chạm vào đơn khách trên cùng để nấu 1-chạm, hoặc chọn món mẫu bên dưới!";
        guidePill.style.background = "#EAF5EE";
        guidePill.style.color = "#227554";
        guidePill.style.borderColor = "#C8E6C9";
      } else {
        guidePill.innerHTML = "ⓘ <strong>Ninh xì xèo:</strong> Chọn thêm Topping hoặc Nước theo đơn khách, sau đó bấm <strong>Bưng ngay</strong>!";
        guidePill.style.background = "#FFF8E7";
        guidePill.style.color = "#8A6110";
        guidePill.style.borderColor = "#FFE082";
      }
    }
  }

  // Thùng nguyên liệu: cảnh báo sắp hết (≤3 phần) và đã hết
  getStockClass(stock) {
    if (stock <= 0) return "is-out";
    if (stock <= 3) return "is-low";
    return "";
  }

  triggerPotBounce() {
    const pot = document.getElementById("korean-clay-pot");
    if (pot) {
      pot.classList.remove("pot-pop-bounce");
      void pot.offsetWidth; // force reflow
      pot.classList.add("pot-pop-bounce");
      setTimeout(() => pot.classList.remove("pot-pop-bounce"), 400);
    }
  }

  // Tương tác nấu trong niêu
  selectPotSize(size) {
    this.currentPot.size = size;
    this.sound.playButtonClick();
    this.triggerPotBounce();
    this.renderPotWorkstation();
    this.renderCookingSteps();
    this.renderOrderQueue();
  }

  selectSpicyLevel(lvl) {
    this.currentPot.spicyLevel = lvl;
    this.sound.playCookingSizzle();
    this.triggerPotBounce();
    this.renderPotWorkstation();
    this.renderCookingSteps();
    this.renderOrderQueue();
  }

  selectNoodle(noodleId) {
    const noodle = this.state.noodles[noodleId];
    if (!noodle || noodle.stock <= 0) {
      GameUIModal.showToast("Món mì này trong kho đã hết phần sẵn sàng!", "warning", "⚠️");
      return;
    }

    this.currentPot.noodleId = noodleId;
    this.sound.playCookingSizzle();
    this.triggerPotBounce();
    GameUIModal.showToast(`Đã bỏ ${noodle.name} vào niêu đất!`, "success", noodle.icon);
    this.renderPotWorkstation();
    this.renderCookingSteps();
    this.renderOrderQueue();
  }

  toggleTopping(toppingId) {
    const top = this.state.toppings[toppingId];
    if (!top) return;

    const idx = this.currentPot.toppings.indexOf(toppingId);
    if (idx >= 0) {
      this.currentPot.toppings.splice(idx, 1);
      this.sound.playButtonClick();
    } else {
      if (top.stock <= 0) {
        GameUIModal.showToast(`Trong kho đã hết ${top.name} rồi!`, "warning", "⚠️");
        return;
      }
      this.currentPot.toppings.push(toppingId);
      this.sound.playCookingSizzle();
      this.triggerPotBounce();
      GameUIModal.showToast(`Đã thêm ${top.name} vào niêu!`, "info", top.icon);
    }
    this.renderPotWorkstation();
    this.renderCookingSteps();
    this.renderOrderQueue();
  }

  toggleDrink(drinkId) {
    if (this.currentPot.drinkId === drinkId) {
      this.currentPot.drinkId = null;
      this.sound.playButtonClick();
    } else {
      const drink = this.state.drinks[drinkId];
      if (drink && drink.stock > 0) {
        this.currentPot.drinkId = drinkId;
        if (this.sound.playShakerSound) {
          this.sound.playShakerSound();
        } else {
          this.sound.playCoinChime();
        }
        GameUIModal.showToast(`🧋 Đã lắc xong 1 ly ${drink.name}!`, "info", drink.icon);
      } else if (drink && drink.stock <= 0) {
        GameUIModal.showToast(`Trong kho đã hết ${drink.name} rồi! Vào Kho để bổ sung nhé!`, "warning", "⚠️");
      }
    }
    this.renderCookingSteps();
    this.renderPotWorkstation();
    this.renderOrderQueue();
  }

  clearCurrentPot(silent = false) {
    this.currentPot = {
      size: "M",
      spicyLevel: 0,
      noodleId: null,
      toppings: [],
      drinkId: null
    };
    // Khi gọi nội bộ (sau khi bưng, đầu/cuối ca) thì im lặng: trên mobile chỉ hiện 1 toast,
    // trước đây toast "Đã dọn niêu" đè mất toast báo tiền vừa bưng món
    if (!silent) {
      this.sound.playButtonClick();
      GameUIModal.showToast("Đã dọn sạch niêu đất để nấu niêu mới!", "info", "🧹");
    }
    this.renderPotWorkstation();
    this.renderCookingSteps();
    this.renderOrderQueue();
  }

  // Tự động chuẩn bị nhanh niêu đất khớp 100% với đơn khách (Quick-Cook)
  quickCookForSlot(slotIdx) {
    const slot = this.orderSlots[slotIdx];
    if (!slot) return;
    const order = slot.order;

    // Kiểm tra tồn kho mì
    const noodle = this.state.noodles[order.noodleId];
    if (!noodle || noodle.stock <= 0) {
      GameUIModal.showToast(`Trong kho đã hết ${order.noodleName} rồi! Hãy vào tab Kho bổ sung!`, "warning", "⚠️");
      return;
    }

    this.currentPot.size = order.size || "M";
    this.currentPot.spicyLevel = order.spicyLevel || 0;
    this.currentPot.noodleId = order.noodleId;
    this.currentPot.toppings = order.toppingId && !this.isItemSoldOut("toppings", order.toppingId) ? [order.toppingId] : [];
    this.currentPot.drinkId = order.drinkId && !this.isItemSoldOut("drinks", order.drinkId) ? order.drinkId : null;

    this.sound.playCookingSizzle();
    this.triggerPotBounce();
    GameUIModal.showToast(`⚡ Đã nấu niêu đúng đơn cho ${slot.customer.name}! Bấm "🛎️ Bưng" để phục vụ!`, "success", "🍲");

    this.renderPotWorkstation();
    this.renderCookingSteps();
    this.renderOrderQueue();
  }

  // Bưng mỳ cho bất kỳ khách nào đang có đơn khớp với niêu hiện tại (Dành cho Mobile Sticky Bar hoặc Shortcut)
  serveToMatchingSlot() {
    if (!this.currentPot.noodleId) {
      GameUIModal.showToast("Bạn chưa nấu mì trong niêu đất!", "warning", "🍲");
      return;
    }

    const idx = this.orderSlots.findIndex(slot => slot && !this.getOrderMismatch(slot.order));
    if (idx >= 0) {
      this.serveToSlot(idx);
      return;
    }

    GameUIModal.showToast("Niêu mì hiện tại chưa khớp với đơn khách nào đang chờ!", "warning", "⚠️");
  }

  // Bưng mỳ cho khách ở Slot
  serveToSlot(slotIdx, isAutoUsagi = false) {
    const slot = this.orderSlots[slotIdx];
    if (!slot) return;

    const order = slot.order;
    const pot = this.currentPot;

    const mismatchReason = this.getOrderMismatch(order, pot);
    if (mismatchReason) {
      if (!isAutoUsagi) GameUIModal.showToast(mismatchReason, "warning", "⚠️");
      return;
    }

    // Món kèm đã hết sạch kho thì được bưng thiếu: không tính tiền phần đó, khách hơi tiếc (-tip, -1 sao)
    const missingTopping = Boolean(order.toppingId && !pot.toppings.includes(order.toppingId));
    const missingDrink = Boolean(order.drinkId && pot.drinkId !== order.drinkId);
    const bill = this.calcOrderBill(order, { missingTopping, missingDrink });
    const noodle = bill.noodle;
    const servedDrink = bill.drink;
    const patienceRatio = Math.max(0, slot.patience / slot.maxPatience);

    // Nguyên liệu phụ (mì sợi, nước hầm, niêu, sốt ớt, trà, sữa...) — thiếu thì món kém ngon
    const lackSupplies = this.consumeSupplies(this.getSuppliesForOrder(order, Boolean(servedDrink)));
    let foodPrice = bill.food;
    if (lackSupplies.length > 0) foodPrice = Math.round(foodPrice * 0.85);
    const bowlPrice = foodPrice + bill.drinkPrice + bill.duckyBonus;

    // Tỷ lệ tiền tip theo giá bán (rẻ -> tip đậm, đắt -> tip ít)
    let baseTipRate = 0.18;
    if (bill.priceRatio <= 0.85) baseTipRate = 0.28;
    else if (bill.priceRatio > 1.35) baseTipRate = 0.05;
    else if (bill.priceRatio > 1.15) baseTipRate = 0.10;

    // Bưng nhanh khi khách còn kiên nhẫn -> tip đậm hơn; để khách chờ lâu -> tip ít
    const isSpeedy = patienceRatio >= 0.7;
    const speedFactor = isSpeedy ? 1.25 : (patienceRatio >= 0.4 ? 1.0 : 0.7);

    let tip = Math.round(bowlPrice * baseTipRate * (slot.customer.tipMultiplier || 1) * speedFactor);
    if (this.state.staff.mochi) tip = Math.round(tip * 1.25);
    if (missingTopping || missingDrink) tip = Math.round(tip * 0.5);

    // ĐƠN ĐẶC BIỆT (trùng Món Đặc Biệt Hôm Nay): cần đủ topping mới tính
    const isSpecialCombo = !missingTopping && this.isSpecialComboOrder(order);
    let specialBonus = 0;
    if (isSpecialCombo) {
      tip = Math.round(tip * 1.5);
      specialBonus = Math.round(foodPrice * 0.20) + 12;

      this.state.specialCombo.streak = (this.state.specialCombo.streak || 0) + 1;
      this.state.todaySpecialBowlsSold = (this.state.todaySpecialBowlsSold || 0) + 1;
      this.state.todaySpecialBonus = (this.state.todaySpecialBonus || 0) + specialBonus;
      this.state.stats.specialBowlsServed = (this.state.stats.specialBowlsServed || 0) + 1;
      this.state.stats.specialBonusEarned = (this.state.stats.specialBonusEarned || 0) + specialBonus;
    }

    // Thưởng chuỗi phục vụ: mỗi mốc x5 liên tiếp +5% (tối đa +25%)
    const streakBefore = this.serveStreak || 0;
    const streakMult = 1 + Math.min(0.25, Math.floor((streakBefore + 1) / 5) * 0.05);
    const feverMultiplier = this.isFeverActive ? FEVER_MULT : 1.0;
    const vipBonus = slot.customer.isVip ? Math.floor(Math.random() * 16) + 25 : 0;

    const subTotal = Math.round((bowlPrice + tip + specialBonus) * feverMultiplier * streakMult);
    const totalEarned = subTotal + vipBonus;
    const extraFromMult = subTotal - (bowlPrice + tip + specialBonus);

    this.addFeverPoints(isSpeedy ? 28 : 20);

    // Trừ kho: mì, topping thực có trong niêu, ly nước khách gọi (ly khách không gọi được giữ lại, không mất)
    if (noodle.stock > 0) noodle.stock -= 1;
    pot.toppings.forEach(topId => {
      const t = this.state.toppings[topId];
      if (t && t.stock > 0) t.stock -= 1;
    });
    if (servedDrink && servedDrink.stock > 0) servedDrink.stock -= 1;

    if (noodle.stock <= 0) this.checkAndAutoRejectOutOfStockDuplicates();

    this.state.money += totalEarned;
    this.state.todayEarnings += totalEarned;
    this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + totalEarned;
    this.state.todayBowlsSold += 1;
    this.state.stats.bowlsServed += 1;
    if (servedDrink) {
      this.state.stats.drinksServed++;
      this.state.todayDrinksSold++;
    }
    const tipsTotal = tip + specialBonus + vipBonus + Math.max(0, extraFromMult);
    this.state.todayTips += tipsTotal;
    this.state.stats.tipsEarned += tipsTotal;
    if (order.spicyLevel >= 6) {
      this.state.todaySpicy7Sold += 1;
      this.state.stats.spicyMasterServed += 1;
    }
    this.bumpServeStreak();

    if (slot.customer) {
      this.unlockCustomer(slot.customer, true);
      if (slot.customer.isVip) this.state.stats.vipServed = (this.state.stats.vipServed || 0) + 1;
    }

    if (this.sound && typeof this.sound.playServeSound === "function") {
      this.sound.playServeSound();
    } else {
      this.sound.playCoinChime();
    }

    // 1 dòng hiệu ứng nổi + 1 toast gọn: liệt kê đúng các khoản thưởng thực nhận
    const extras = [];
    if (this.isFeverActive) extras.push(`🔥 x${FEVER_MULT}`);
    if (streakMult > 1) extras.push(`⛓️ Chuỗi +${Math.round((streakMult - 1) * 100)}%`);
    if (isSpeedy) extras.push("⚡ Thần tốc");
    if (vipBonus > 0) extras.push(`👑 +${vipBonus}k`);
    if (specialBonus > 0) extras.push(`🎁 +${specialBonus}k`);
    if (bill.duckyBonus > 0) extras.push("🦆 +25% nước");

    const slotCard = document.getElementById(`order-slot-${slotIdx}`);
    if (slotCard && typeof GameUIModal.spawnFloatingFx === "function") {
      GameUIModal.spawnFloatingFx(slotCard, `+${totalEarned}k${extras.length ? " " + extras[0] : ""}`, true);
    }

    const who = isAutoUsagi ? `🐰 Usagi bưng cho ${slot.customer.name}` : (slot.customer.isVip ? `👑 VIP ${slot.customer.name} rất hài lòng` : "Bưng mỳ thành công");
    const warnBits = [];
    if (missingTopping || missingDrink) warnBits.push("thiếu món kèm");
    if (lackSupplies.length > 0) warnBits.push(`thiếu ${lackSupplies.join(", ")}`);
    GameUIModal.showToast(
      `${who}! +${totalEarned}k (món ${bowlPrice}k · tip ${tip}k)${extras.length ? " · " + extras.join(" · ") : ""}${warnBits.length ? ` ⚠️ ${warnBits.join(", ")}` : ""}`,
      warnBits.length ? "warning" : "success",
      isAutoUsagi ? "🐰" : (isSpecialCombo ? "🌟" : "✨")
    );

    // Đánh giá sao 1 -> 5 theo điểm tổng hợp: tốc độ, giá, món kèm, nguyên liệu và tính cách từng khách
    const rating = rateDineIn({
      customerName: slot.customer.name,
      patienceRatio,
      priceRatio: bill.priceRatio,
      bowlPrice,
      noodleName: noodle.name,
      spicy: order.spicyLevel,
      likesSpicy: (slot.customer.preferredSpicy || []).some(lv => lv >= 6),
      missingItem: missingTopping || missingDrink,
      missingName: missingDrink ? (order.drinkName || "đồ uống") : (order.toppingName || "topping"),
      lackSupplies: lackSupplies.length > 0,
      lackName: lackSupplies[0],
      isSpecialCombo,
      isVip: Boolean(slot.customer.isVip),
      owl: Boolean(this.state.staff.owl),
      decorScore: this.state.upgrades.decorScore
    });
    const stars = rating.stars;
    const comment = rating.comment;

    if (stars === 5) {
      this.state.reputation = Math.min(1000, (this.state.reputation || 30) + 2);
      GameUIModal.showToast(`⭐ Khách tặng 5★! +2 Điểm danh tiếng (hiện có: ${this.state.reputation}⭐)`, "success", "⭐", 2500);
    } else if (stars === 4) {
      this.state.reputation = Math.min(1000, (this.state.reputation || 30) + 1);
    } else if (stars <= 2) {
      this.state.reputation = Math.max(5, (this.state.reputation || 30) - 2);
    }

    const foodieBadges = ["Foodie Sành Ăn", "Mê Ăn Cay Cấp 7", "Khách Quen Ruột", "Tín Đồ Mì Cay", "Chuyên Gia Đánh Giá"];
    const randomBadge = foodieBadges[Math.floor(Math.random() * foodieBadges.length)];

    const toppingNames = (pot.toppings || [])
      .map(tid => this.state.toppings[tid] ? this.state.toppings[tid].name : null)
      .filter(Boolean);
    const toppingAttached = toppingNames.length ? ` + ${toppingNames.join(", ")}` : (order.toppingName ? ` + ${order.toppingName}` : "");

    this.addReview({
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      customerName: slot.customer.name,
      customerAvatar: slot.customer.avatar || "assets/cust_cat.png",
      stars: stars,
      comment: comment,
      date: `Ngày ${this.state.day}`,
      foodieBadge: randomBadge,
      foodAttached: `${noodle.name} (Cấp ${order.spicyLevel})${toppingAttached}${servedDrink ? ` + ${servedDrink.name}` : ""}`,
      issues: rating.issues,
      persona: rating.persona,
      isOnline: false,
      replied: false,
      ownerReply: null,
      customerFeedback: null
    });

    // Nhiệm vụ & thành tựu
    this.trackProgress("serve", {
      earned: totalEarned,
      isVip: Boolean(slot.customer.isVip),
      isSpecial: isSpecialCombo,
      isSpeedy,
      spicy: order.spicyLevel,
      withDrink: Boolean(servedDrink),
      stars
    });

    // Chuyển khách ra bàn ăn thưởng thức niêu đất xì xèo!
    this.initTables();
    const emptyTable = this.state.tables.find(t => t.status === "empty");
    if (emptyTable) {
      emptyTable.status = "eating";
      emptyTable.customer = { ...slot.customer };
      emptyTable.order = {
        noodleName: noodle.name,
        spicyLevel: order.spicyLevel,
        toppings: [...pot.toppings]
      };
      emptyTable.eatTimer = 12;
    }

    // Giải phóng slot và reset niêu
    this.orderSlots[slotIdx] = null;
    this.clearCurrentPot(true);

    this.saveGame();
    this.renderHeader();
    this.renderDiningStage();
    this.renderOpenMode();
  }

  // Từ chối khách ở Slot
  rejectSlot(slotIdx) {
    const slot = this.orderSlots[slotIdx];
    if (!slot) return;

    // Hết mì thật sự: xin lỗi khách lịch sự, chỉ -1 uy tín, không mất chuỗi và không bị review 1 sao
    const soldOut = this.isItemSoldOut("noodles", slot.order.noodleId);
    if (soldOut) {
      this.state.reputation = Math.max(5, this.state.reputation - 1);
      this.orderSlots[slotIdx] = null;
      this.sound.playButtonClick();
      GameUIModal.showToast(`🙇 Đã xin lỗi ${slot.customer.name} vì hết ${slot.order.noodleName} (-1 uy tín). Nhớ nhập thêm hàng nhé!`, "info", "🚪");
      this.renderHeader();
      this.renderOrderQueue();
      return;
    }

    // Từ chối khi còn hàng: 65% khách bực bội để lại đánh giá 1 sao
    if (Math.random() < 0.65) {
      this.state.reputation = Math.max(5, this.state.reputation - 2);

      const noodleName = (slot.order && slot.order.noodleName) ? slot.order.noodleName : "mì cay";
      const rejectComments = [
        `Đang đói cồn cào ghé tiệm định gọi ${noodleName} thì quán bảo từ chối không nhận đơn! Hụt hẫng thật sự 😩👎`,
        `Vừa bước chân vào bàn gọi món mà nhân viên xua tay từ chối không bán! Buôn bán kiểu gì kỳ cục vậy trời?! 💢`,
        `Tranh thủ giờ nghỉ trưa tạt sang ăn bát mì cay nóng hổi mà bị đuổi khéo, làm lỡ dở cả bữa trưa! Quá thất vọng! 😤`,
        `Hí hửng rủ bạn bè ghé quán ăn thử mà tiệm từ chối thẳng thừng, quê trước mặt bạn bè ghê luôn! 1 sao! 😡`,
        `Khách bước chân vào cửa mà không thèm tiếp, thái độ phục vụ quá chán! Sẽ không bao giờ ghé lại lần hai! 🚫`,
        `Bảo là tiệm mì cay đệ nhất mà khách vào lại từ chối phục vụ? Trải nghiệm cực kỳ tệ hại! 👎`
      ];
      const chosenComment = rejectComments[Math.floor(Math.random() * rejectComments.length)];

      this.addReview({
        id: Date.now() + Math.random().toString(36).substr(2, 4),
        customerName: slot.customer.name,
        customerAvatar: slot.customer.avatar || "assets/cust_cat.png",
        stars: getPersona(slot.customer.name).leniency >= 6 ? 2 : 1,
        comment: chosenComment,
        issues: ["rejected"],
        date: `Ngày ${this.state.day}`,
        replied: false,
        ownerReply: null,
        customerFeedback: null
      });
    }

    this.orderSlots[slotIdx] = null;
    this.resetServeStreak();
    this.sound.playButtonClick();
    GameUIModal.showToast("Đã từ chối đơn hàng, khay đã sẵn sàng đón khách mới!", "info", "🚪");
    this.renderHeader();
    this.renderOrderQueue();
  }

  // Số phần của 1 món đang bị các đơn trên khay "giữ chỗ"
  countReserved(field, id) {
    return this.orderSlots.filter(s => s && s.order && s.order[field] === id).length;
  }

  pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // Sinh khách mới vào các slot trống: khách chỉ gọi món còn đủ hàng (đã trừ phần các đơn khác đang chờ)
  spawnCustomerToSlot() {
    const emptyIndices = [];
    this.orderSlots.forEach((slot, idx) => {
      if (!slot) emptyIndices.push(idx);
    });
    if (emptyIndices.length === 0) return;

    const chosenSlotIdx = this.pickRandom(emptyIndices);
    const activeNoodles = Object.values(this.state.noodles).filter(n => n.unlocked && n.inMenu);
    if (activeNoodles.length === 0) return;

    const availNoodles = activeNoodles.filter(n => n.stock > this.countReserved("noodleId", n.id));
    if (availNoodles.length === 0) {
      // Hết sạch mì: không cho khách vào rồi bắt họ bỏ về, chỉ nhắc nhẹ 1 lần mỗi 20 giây
      const now = Date.now();
      if (!this.lastSoldOutToast || now - this.lastSoldOutToast > 20000) {
        this.lastSoldOutToast = now;
        GameUIModal.showToast("🍜 Kho đã hết sạch mì đang bán! Khách ngoài cửa đành đi tiếp... Hãy kết ca để nhập hàng.", "warning", "📦");
      }
      return;
    }

    const availTops = Object.values(this.state.toppings).filter(t => t.unlocked && t.inMenu && t.stock > this.countReserved("toppingId", t.id));
    const availDrinks = Object.values(this.state.drinks).filter(d => d.unlocked && d.inMenu && d.stock > this.countReserved("drinkId", d.id));

    const vipList = this.customerTemplates.filter(c => c.isVip);
    const normalList = this.customerTemplates.filter(c => !c.isVip);
    // Hồ Cá Koi Zen (zenGarden): +8% tỉ lệ khách VIP mỗi cấp (gốc 10%)
    const zenLv = this.state.upgrades.zenGarden || 0;
    const vipRate = Math.min(0.5, 0.10 + zenLv * 0.08);
    const chosenCust = (vipList.length > 0 && Math.random() < vipRate) ? this.pickRandom(vipList) : this.pickRandom(normalList);

    let chosenNoodle = null;
    let spicyLevel = 0;
    let chosenTop = null;

    // ~35% khách bị hấp dẫn bởi Món Đặc Biệt Hôm Nay (chỉ khi còn đủ hàng)
    const combo = this.state.specialCombo;
    if (combo && Math.random() < 0.35) {
      const specNoodle = availNoodles.find(n => n.id === combo.noodleId);
      const specTop = availTops.find(t => t.id === combo.toppingId);
      if (specNoodle && specTop) {
        chosenNoodle = specNoodle;
        spicyLevel = combo.spicyLevel;
        chosenTop = specTop;
      }
    }

    if (!chosenNoodle) {
      chosenNoodle = this.pickRandom(availNoodles);
      spicyLevel = this.pickRandom(chosenCust.preferredSpicy);
      chosenTop = availTops.length > 0 && Math.random() > 0.4 ? this.pickRandom(availTops) : null;
    }

    // Khách gọi kèm đồ uống (v1.7.0): ~35% đơn, có Vịt Ducky thì 50%
    const drinkRate = this.state.staff.ducky ? 0.5 : 0.35;
    const chosenDrink = availDrinks.length > 0 && Math.random() < drinkRate ? this.pickRandom(availDrinks) : null;

    const order = {
      noodleId: chosenNoodle.id,
      noodleName: chosenNoodle.name,
      size: Math.random() > 0.5 ? "L" : "M",
      spicyLevel: spicyLevel,
      toppingId: chosenTop ? chosenTop.id : null,
      toppingName: chosenTop ? chosenTop.name : null,
      drinkId: chosenDrink ? chosenDrink.id : null,
      drinkName: chosenDrink ? chosenDrink.name : null
    };

    this.orderSlots[chosenSlotIdx] = {
      customer: chosenCust,
      isSpecial: Math.random() > 0.7,
      isSpecialCombo: this.isSpecialComboOrder(order),
      orderPriceRatio: this.calcOrderBill(order).priceRatio,
      order,
      patience: 100,
      maxPatience: 100
    };

    // Khám phá khách hàng khi ghé tiệm
    this.unlockCustomer(chosenCust, false);

    if (chosenCust.isVip) {
      if (this.sound && typeof this.sound.playUpgradeSound === "function") {
        this.sound.playUpgradeSound();
      } else {
        this.sound.playDoorBell();
      }
      GameUIModal.showToast(`👑 KHÁCH VIP THẦN TÀI: ${chosenCust.name} vừa ghé tiệm! Phục vụ ngay để nhận tiền tip khủng!`, "success", "💰");
    } else {
      this.sound.playDoorBell();
    }
    this.renderOrderQueue();
  }

  // Tự động kiểm tra và từ chối các đơn thứ 2 trở đi của loại mì đã hết hàng trong kho
  checkAndAutoRejectOutOfStockDuplicates() {
    const seenOutOfStockNoodles = new Set();
    let hasRejected = false;

    this.orderSlots.forEach((slot, idx) => {
      if (!slot || !slot.order) return;
      const noodleId = slot.order.noodleId;
      const noodle = this.state.noodles[noodleId];
      const isOutOfStock = !noodle || (noodle.stock <= 0);

      if (isOutOfStock) {
        if (seenOutOfStockNoodles.has(noodleId)) {
          // Đây là đơn sau của loại mì đã hết hàng -> Tự động từ chối!
          const custName = slot.customer?.name || "Khách hàng";
          const noodleName = slot.order.noodleName || noodle?.name || "Mì cay";
          this.orderSlots[idx] = null;
          hasRejected = true;

          GameUIModal.showToast(
            `📢 Kho đã hết "${noodleName}" (đã có 1 đơn chờ)! Tự động từ chối đơn của ${custName} để nhường khay cho khách khác!`,
            "warning",
            "⚠️"
          );
        } else {
          // Đơn đầu tiên của loại mì đã hết hàng: Giữ lại trên khay
          seenOutOfStockNoodles.add(noodleId);
        }
      }
    });

    if (hasRejected) {
      this.sound.playButtonClick();
      this.renderOrderQueue();
      // Nhường chỗ cho khách khác vào xếp hàng ngay
      setTimeout(() => {
        if (this.state.dayPhase === "open" && !this.isPaused) {
          this.spawnCustomerToSlot();
        }
      }, 350);
    }
  }

  // 12. Thanh nút chân trang & CTA Deck trên đỉnh Kho
  renderBottomActionBar() {
    const btn = document.getElementById("btn-primary-action");
    const pauseBtn = document.getElementById("btn-pause-open");
    const quickBtn = document.getElementById("btn-quick-open-day");
    const quickBtnText = document.getElementById("btn-quick-open-text");
    const brewBtn = document.getElementById("btn-brew-supplies");
    const brewBtnText = document.getElementById("btn-brew-text");

    const myBoStock = this.state.noodles.my_bo ? this.state.noodles.my_bo.stock : 0;
    const isReady = myBoStock > 0;

    // Cập nhật trạng thái nút Ninh Nước Dùng
    if (brewBtn) {
      if (this.state.hasBrewedToday) {
        brewBtn.classList.add("btn-brewed-done");
        if (brewBtnText) brewBtnText.textContent = "✓ Đã ninh nước dùng hôm nay";
        brewBtn.disabled = true;
      } else {
        brewBtn.classList.remove("btn-brewed-done");
        if (brewBtnText) brewBtnText.textContent = "Ninh Nước Dùng & Nấu Mì Sẵn Sàng";
        brewBtn.disabled = false;
      }
    }

    if (this.state.dayPhase === "prep") {
      // Ở chế độ chuẩn bị: Ẩn thanh/nút cố định dưới đáy để không bị trùng 2 nút Mở cửa
      if (btn) btn.style.display = "none";
      if (pauseBtn) pauseBtn.style.display = "none";
      const bottomBar = document.querySelector(".game-bottom-action-bar");
      if (bottomBar) bottomBar.style.display = "none";

      // Nút Mở Cửa duy nhất nằm trang trọng tại CTA Action Deck trên đỉnh Kho
      if (quickBtn) {
        quickBtn.style.display = "inline-flex";
        if (!isReady) {
          quickBtn.className = "btn-open-day-prominent btn-warning-state";
          if (quickBtnText) quickBtnText.textContent = "⚠️ Cần chuẩn bị Mì";
        } else {
          quickBtn.className = "btn-open-day-prominent btn-ready-state";
          if (quickBtnText) quickBtnText.textContent = `Mở Cửa Ngày ${this.state.day}`;
        }
      }
    } else {
      // Khi đang trong ca mở bán: Hiện thanh điều khiển dưới đáy với nút Tạm dừng
      if (btn) btn.style.display = "none";
      if (pauseBtn) pauseBtn.style.display = "flex";
      const bottomBar = document.querySelector(".game-bottom-action-bar");
      if (bottomBar) bottomBar.style.display = "flex";
      if (quickBtn) quickBtn.style.display = "none";
    }
  }

  // 13. Sân khấu tiệm mỳ sống động (Living Stage)
  renderDiningStage() {
    this.initTables();

    // 1. Tính toán điểm sao và độ nổi tiếng của quán
    const hasReviews = this.state.reviews && this.state.reviews.length > 0;
    let avgStars = 5.0;
    if (hasReviews) {
      const sum = this.state.reviews.reduce((s, r) => s + (r.stars || 5), 0);
      avgStars = (sum / this.state.reviews.length).toFixed(1);
    }

    const eatingCount = this.state.tables.filter(t => t.status === "eating").length;
    const dirtyCount = this.state.tables.filter(t => t.status === "dirty").length;
    const emptyCount = this.state.tables.filter(t => t.status === "empty").length;

    // Cập nhật huy hiệu bàn bẩn trên tab mobile
    const dirtyBadge = document.getElementById("tab-badge-dirty");
    if (dirtyBadge) {
      if (dirtyCount > 0) {
        dirtyBadge.style.display = "inline-block";
        dirtyBadge.textContent = `🧹 ${dirtyCount}`;
      } else {
        dirtyBadge.style.display = "none";
      }
    }

    // Cập nhật các bảng trạng thái tấp nập
    const prepCrowdText = document.getElementById("prep-crowd-status-text");
    if (prepCrowdText) {
      if (!hasReviews) {
        prepCrowdText.textContent = "🏮 Tiệm mới khai trương ngày đầu! Hãy mở cửa đón những vị khách đầu tiên ghé quán ✨";
      } else if (avgStars >= 4.5) {
        prepCrowdText.textContent = `Độ nổi tiếng: ${avgStars} ⭐ · Khách trên phố đang ngóng chờ mở quán nườm nượp! 🔥`;
      } else if (avgStars >= 3.5) {
        prepCrowdText.textContent = `Độ nổi tiếng: ${avgStars} ⭐ · Khách dạo phố ghé nhìn menu đều đặn. ✨`;
      } else {
        prepCrowdText.textContent = `Độ nổi tiếng: ${avgStars} ⭐ · Quán hơi vắng do đánh giá thấp, cần nỗ lực kéo khách! 🍂`;
      }
    }

    const openCrowdHeadline = document.getElementById("open-crowd-headline-text");
    const openCrowdWrap = document.querySelector(".stage-crowd-headline");
    if (openCrowdHeadline) {
      if (!hasReviews) {
        openCrowdHeadline.textContent = "🏮 Tiệm mới khai trương! Sẵn sàng phục vụ những niêu mì thơm phức đầu tiên! ✨";
        if (openCrowdWrap) openCrowdWrap.className = "stage-crowd-headline";
      } else if (avgStars >= 4.5) {
        openCrowdHeadline.textContent = `🔥 QUÁN ĐANG ĐÔNG NGHẸT KHÁCH! (Độ nổi tiếng: ${avgStars} ⭐ · Khách dồn dập)`;
        if (openCrowdWrap) {
          openCrowdWrap.className = "stage-crowd-headline is-crowded";
        }
      } else if (avgStars >= 3.5) {
        openCrowdHeadline.textContent = `✨ Quán đông vui, khách ra vào nườm nượp (Độ nổi tiếng: ${avgStars} ⭐)`;
        if (openCrowdWrap) {
          openCrowdWrap.className = "stage-crowd-headline";
        }
      } else {
        openCrowdHeadline.textContent = `🍂 Quán vắng vẻ do bị chê bai (${avgStars} ⭐ · Cần tăng tốc và xoa dịu khách)`;
        if (openCrowdWrap) {
          openCrowdWrap.className = "stage-crowd-headline is-deserted";
        }
      }
    }

    const prepRoofBadge = document.getElementById("prep-roof-shop-badge");
    if (prepRoofBadge) {
      prepRoofBadge.textContent = "🏮 Tiệm Mỳ Cay 7 Cấp Độ 🏮";
    }

    const prepDiningStatus = document.getElementById("prep-dining-status-text");
    if (prepDiningStatus) {
      if (eatingCount > 0) {
        prepDiningStatus.textContent = `${eatingCount} khách đang ăn ngon lành xì xèo!`;
      } else if (dirtyCount > 0) {
        prepDiningStatus.textContent = `${dirtyCount} bàn cần dọn dẹp sạch sẽ`;
      } else {
        prepDiningStatus.textContent = `${emptyCount} bàn sạch bóng sẵn sàng đón khách`;
      }
    }

    // 2. Tạo HTML cho các bàn ăn sống động, chân thực, ấm cúng
    const tablesHtml = this.state.tables.map(table => {
      if (table.status === "empty") {
        return `
          <div id="dining-table-${table.id}" class="dining-table-box is-empty">
            <div class="dining-table-top-bar">
              <span class="dining-table-num-badge">Bàn #${table.id}</span>
              <span class="dining-table-status-pill status-ready">🟢 Sẵn sàng</span>
            </div>
            <div class="dining-table-scene">
              <div class="table-oak-surface">
                <div class="table-chairs-pair">
                  <span class="chair-icon chair-left">🪑</span>
                  <div class="table-mat-center">
                    <span class="table-cutlery-set" title="Đũa & muỗng">🥢</span>
                    <span class="table-cup-item" title="Trà thơm">🍵</span>
                  </div>
                  <span class="chair-icon chair-right">🪑</span>
                </div>
              </div>
            </div>
            <div class="dining-table-footer">
              <span class="table-status-hint">✨ Đang chờ khách ghé</span>
            </div>
          </div>
        `;
      }

      if (table.status === "dirty") {
        return `
          <div id="dining-table-${table.id}" class="dining-table-box is-dirty">
            <div class="dining-table-top-bar">
              <span class="dining-table-num-badge">Bàn #${table.id}</span>
              <span class="dining-table-status-pill status-dirty">🧹 Cần dọn</span>
            </div>
            <div class="dining-table-scene">
              <div class="table-oak-surface dirty-surface">
                <div class="table-dirty-pot-wrap">
                  <span class="dirty-empty-pot">🍲</span>
                  <span class="table-coin-pile anime-coin-float">🪙✨</span>
                </div>
              </div>
            </div>
            <div class="dining-table-footer">
              <button class="btn-clean-table pulse-clean" onclick="window.game.cleanTable(${table.id})" title="Dọn bàn và thu tiền tip">
                🧹 Dọn Bàn (+Tip)
              </button>
            </div>
          </div>
        `;
      }

      const cust = table.customer || { name: "Thực khách", avatar: "assets/cust_cat.png" };
      const order = table.order || { noodleName: "Mì cay Bò", spicyLevel: 2 };
      const eatTimer = table.eatTimer || 12;
      const eatPct = Math.round((eatTimer / 12) * 100);

      const acLv = this.state.upgrades.acCooling || 1;
      let comment = "🍜 Nước dùng ngọt thanh quá!";
      if (order.spicyLevel >= 6) {
        comment = acLv >= 2 ? "🔥 Cay xè mà Daikin phà mát lạnh đã ghê! ❄️" : "🔥 Cay bốc khói mà ngon tê tái!";
      } else if (order.spicyLevel >= 3) {
        comment = acLv >= 2 ? "🌶️ Mì ngon đậm đà, phòng mát lạnh cực êm! ❄️" : "🌶️ Đậm đà thơm lừng đã miệng!";
      } else if (acLv >= 2) {
        comment = "❄️ Điều hòa Daikin mát rượi, ăn mì ấm lòng!";
      }

      return `
        <div id="dining-table-${table.id}" class="dining-table-box is-eating" onclick="window.game.interactEatingTable(${table.id})" title="Chạm vào bàn để xem khách thưởng thức!">
          <div class="dining-table-top-bar">
            <span class="dining-table-num-badge">Bàn #${table.id}</span>
            ${acLv >= 2 ? '<span class="dining-cool-badge" title="Mát rượi nhờ Daikin">❄️ Mát</span>' : ''}
            <span class="dining-table-timer-pill">⏱️ ${eatTimer}s</span>
          </div>

          <div class="dining-table-scene">
            <div class="dining-eating-stage">
              <div class="dining-customer-seat">
                <img src="${cust.avatar || 'assets/cust_cat.png'}" class="dining-customer-avatar" alt="${cust.name}" onerror="this.src='assets/cust_cat.png'" />
                <span class="dining-customer-name">${cust.name}</span>
              </div>

              <div class="dining-pot-bubble-col">
                <div class="dining-clay-pot-visual">
                  <span class="pot-steam-icon">♨️</span>
                  <span class="pot-dish-icon">🍲</span>
                </div>
                <div class="customer-thought-bubble">${comment}</div>
              </div>
            </div>
            <div class="dining-dish-title">${order.noodleName} · Cấp ${order.spicyLevel} 🌶️</div>
          </div>

          <div class="dining-table-footer">
            <div class="table-patience-bar" title="Tiến độ thưởng thức mì của khách">
              <div class="table-patience-fill" style="width: ${eatPct}%;"></div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // 3. Render đồng bộ vào tất cả các vị trí hiển thị trên màn hình:
    const openGrid = document.getElementById("open-dining-tables-grid");
    if (openGrid) openGrid.innerHTML = tablesHtml;
    this.renderDaikinAC();

    // Mini-tables gọn gàng tối ưu diện tích cho Phòng Ăn Gỗ Sồi trong Chế độ Chuẩn bị
    const miniTablesHtml = this.state.tables.map(table => {
      if (table.status === "empty") {
        return `
          <div class="mini-table-card is-empty">
            <div class="mini-table-head">
              <span class="mini-table-icon">🪑</span>
              <span class="mini-table-name">Bàn #${table.id}</span>
            </div>
            <span class="mini-table-badge badge-ready">Sẵn sàng</span>
          </div>
        `;
      }
      if (table.status === "dirty") {
        return `
          <div class="mini-table-card is-dirty">
            <div class="mini-table-head">
              <span class="mini-table-icon">🍲</span>
              <span class="mini-table-name">Bàn #${table.id}</span>
            </div>
            <span class="mini-table-badge badge-dirty">Cần dọn</span>
          </div>
        `;
      }
      const cust = table.customer || { name: "Khách" };
      return `
        <div class="mini-table-card is-eating">
          <div class="mini-table-head">
            <span class="mini-table-icon">🍜</span>
            <span class="mini-table-name">Bàn #${table.id}</span>
          </div>
          <span class="mini-table-badge badge-eating">${cust.name}</span>
        </div>
      `;
    }).join("");

    const prepMiniGrid = document.getElementById("prep-mini-tables");
    if (prepMiniGrid) prepMiniGrid.innerHTML = miniTablesHtml;

    const floorEl = document.getElementById("living-restaurant-scene");
    if (floorEl) floorEl.innerHTML = tablesHtml;
  }

  // Dọn dẹp bàn ăn bẩn & nhặt tiền tip
  cleanTable(tableId) {
    const table = this.state.tables.find(t => t.id === tableId);
    if (!table || table.status !== "dirty") return;

    table.status = "empty";
    table.customer = null;
    table.order = null;

    const tipEarned = Math.floor(Math.random() * 5) + 6; // 6k - 10k
    this.state.money += tipEarned;
    this.state.todayTips += tipEarned;
    this.state.todayEarnings += tipEarned;
    this.state.stats.tipsEarned += tipEarned;
    this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + tipEarned;

    const tableEl = document.getElementById(`dining-table-${tableId}`);
    if (tableEl && typeof GameUIModal.spawnFloatingFx === "function") {
      GameUIModal.spawnFloatingFx(tableEl, `+${tipEarned}k 🪙`, true);
    }

    if (this.sound && typeof this.sound.playCleaningSound === "function") {
      this.sound.playCleaningSound();
    } else {
      this.sound.playCoinChime();
    }

    GameUIModal.showToast(`Đã dọn sạch bàn #${tableId}! Nhận thêm +${tipEarned}k tiền tip để lại 🪙`, "success", "🧹");

    this.saveGame();
    this.renderHeader();
    this.renderDiningStage();
  }

  // Tương tác chạm vào bàn đang ăn để nghe tiếng ăn xì xụp và thả cảm xúc
  interactEatingTable(tableId) {
    const table = this.state.tables.find(t => t.id === tableId);
    if (!table || table.status !== "eating") return;

    if (this.sound && typeof this.sound.playSlurpSound === "function") {
      this.sound.playSlurpSound();
    }

    const tableEl = document.getElementById(`dining-table-${tableId}`);
    if (tableEl && typeof GameUIModal.spawnFloatingFx === "function") {
      const compliments = ["Ngon tuyệt! 💖", "Xì xụp! 🍜", "Đậm đà! 🔥", "Mê ly! ✨", "Nước ngọt lừ! 🍲"];
      const comp = compliments[Math.floor(Math.random() * compliments.length)];
      GameUIModal.spawnFloatingFx(tableEl, comp, true);
    }
  }

  // ==========================================================
  // 14. HỆ THỐNG ĐIỀU HÒA DAIKIN MÁT RƯỢI (LIVING DAIKIN AC SYSTEM)
  // ==========================================================
  getBaseDaikinTemp() {
    const acLv = (this.state && this.state.upgrades && this.state.upgrades.acCooling) || 1;
    return acLv >= 3 ? 16 : (acLv === 2 ? 20 : 24);
  }

  getCurrentDaikinTemp() {
    if (!this.state) return 24;
    if (this.state.acTemp === undefined || this.state.acTemp === null) {
      this.state.acTemp = this.getBaseDaikinTemp();
    }
    return this.state.acTemp;
  }

  renderDaikinAC() {
    const acLv = (this.state && this.state.upgrades && this.state.upgrades.acCooling) || 1;
    const currentTemp = this.getCurrentDaikinTemp();
    const isTurbo = !!(this.state && this.state.acTurboActive);
    const turboSecs = (this.state && this.state.acTurboSeconds) || 0;

    let modeText = "INVERTER";
    let speedText = "Êm ái dịu mát";
    let bonusPct = 25;

    if (acLv === 2) {
      modeText = "LÀM LẠNH SÂU";
      speedText = "Gió lạnh băng giá";
      bonusPct = 50;
    } else if (acLv >= 3) {
      modeText = "TURBO COOL MAX";
      speedText = "Băng tuyết siêu tốc";
      bonusPct = 75;
    }

    if (isTurbo) {
      modeText = "TURBO BOOST";
      speedText = `Xả gió băng tuyết ${currentTemp}°C`;
    }

    const tempDisplay = `${currentTemp}°C`;
    const turboLedClass = isTurbo ? "is-turbo-led" : "";
    const turboSpinClass = isTurbo ? "fast-spin" : "";
    const turboBtnText = isTurbo ? `❄️ Đang Xả ${tempDisplay} (${turboSecs}s)` : `⚡ Turbo 16°C`;
    const turboBtnClass = isTurbo ? "btn-k-turbo active-blasting" : "btn-k-turbo";

    // 1. Cục lạnh treo tường Daikin tại Sân Khấu Phòng Ăn (Open Mode)
    const stageContainer = document.getElementById("daikin-ac-stage-container");
    if (stageContainer) {
      stageContainer.innerHTML = `
        <div class="daikin-wall-unit lv-${acLv} ${isTurbo ? 'is-turbo-blasting' : ''}" onclick="window.game.interactDaikinAC()" title="Điều hòa Daikin ${modeText} - Chạm để xả gió lạnh Turbo!">
          <div class="daikin-front-panel">
            <div class="daikin-brand-badge">
              <span class="daikin-brand-name">DAIKIN</span>
              <span class="daikin-brand-tech">${modeText} · CẤP ${acLv}</span>
            </div>
            <div class="daikin-center-grille"></div>
            <div class="daikin-screen-led ${turboLedClass}">
              <span class="daikin-led-num" id="daikin-led-num">${tempDisplay}</span>
              <span class="daikin-led-snowflake ${turboSpinClass}">❄️</span>
            </div>
            <div class="daikin-led-pills">
              <span class="ac-led-dot led-green" title="Nguồn"></span>
              <span class="ac-led-dot led-blue" title="Cooling"></span>
            </div>
          </div>
          <div class="daikin-louver-flap"></div>
          <div class="daikin-air-curtain">
            <div class="air-breeze-stream stream-left"></div>
            <div class="air-breeze-stream stream-center"></div>
            <div class="air-breeze-stream stream-right"></div>
            <div class="air-frost-particles">
              <span class="frost-snowflake f1">❄️</span>
              <span class="frost-snowflake f2">💨</span>
              <span class="frost-snowflake f3">❄️</span>
              <span class="frost-snowflake f4">✨</span>
            </div>
          </div>
          <div class="daikin-cooling-tip">
            <span>❄️ Daikin ${tempDisplay} · ${speedText} · Giảm sốt ruột cho khách (+${bonusPct}% kiên nhẫn)</span>
            <span class="btn-tap-turbo-hint">${isTurbo ? '❄️ Đang Turbo...' : '⚡ Chạm để Turbo'}</span>
          </div>
        </div>
      `;
    }

    // 2. Thanh điều hòa Daikin ở Bếp Nấu Siêu Tốc
    const kitchenBar = document.getElementById("kitchen-daikin-bar");
    if (kitchenBar) {
      kitchenBar.innerHTML = `
        <div class="k-daikin-inner lv-${acLv} ${isTurbo ? 'is-turbo-blasting' : ''}">
          <div class="k-daikin-badge">
            <span class="k-daikin-brand">❄️ DAIKIN</span>
            <span class="k-daikin-led ${turboLedClass}" id="k-daikin-led">${tempDisplay}</span>
            <div class="k-daikin-temp-ctrls">
              <button class="btn-ac-temp-step" onclick="event.stopPropagation(); window.game.adjustDaikinTemp(-1);" title="Giảm 1°C">▼</button>
              <button class="btn-ac-temp-step" onclick="event.stopPropagation(); window.game.adjustDaikinTemp(1);" title="Tăng 1°C">▲</button>
            </div>
          </div>
          <div class="k-daikin-flow-wrap">
            <span class="k-daikin-status" id="k-daikin-status">Gió lạnh ${modeText}: Làm dịu cơn cay · Khách kiên nhẫn +${bonusPct}%</span>
          </div>
          <button class="${turboBtnClass}" id="btn-k-turbo" onclick="event.stopPropagation(); window.game.interactDaikinAC();" title="Bật Turbo Boost ngay!">
            ${turboBtnText}
          </button>
        </div>
      `;
    }

    // 3. Mini Daikin ở Phòng Chuẩn Bị Ngày
    const prepAc = document.getElementById("daikin-prep-wall-ac");
    const prepBadge = document.getElementById("prep-daikin-indicator");
    if (prepBadge) {
      prepBadge.textContent = `❄️ Daikin ${tempDisplay} (${modeText})`;
    }
    if (prepAc) {
      prepAc.innerHTML = `
        <div class="prep-daikin-mini lv-${acLv}" onclick="window.game.interactDaikinAC()" title="Điều hòa Daikin Inverter sẵn sàng làm mát quán!">
          <div class="prep-daikin-case">
            <span class="prep-daikin-brand">DAIKIN</span>
            <span class="prep-daikin-temp">${tempDisplay}</span>
            <span class="ac-led-dot led-green"></span>
          </div>
          <div style="font-weight:700; color:#00796B;">Không gian mát lạnh (+${bonusPct}% kiên nhẫn)</div>
          <div style="font-size:12px;">❄️💨</div>
        </div>
      `;
    }
  }

  // Cập nhật nhanh số liệu LED và nút mà không cần dựng lại toàn bộ DOM
  updateDaikinLedDisplays() {
    const currentTemp = this.getCurrentDaikinTemp();
    const tempDisplay = `${currentTemp}°C`;
    const isTurbo = !!(this.state && this.state.acTurboActive);
    const turboSecs = (this.state && this.state.acTurboSeconds) || 0;
    const acLv = (this.state && this.state.upgrades && this.state.upgrades.acCooling) || 1;
    const modeText = isTurbo ? "TURBO BOOST" : (acLv >= 3 ? "TURBO COOL MAX" : (acLv === 2 ? "LÀM LẠNH SÂU" : "INVERTER"));
    const bonusPct = acLv >= 3 ? 75 : (acLv === 2 ? 50 : 25);

    // 1. Stage LED
    const stageLedNum = document.getElementById("daikin-led-num");
    if (stageLedNum) {
      stageLedNum.textContent = tempDisplay;
    }
    const stageScreen = document.querySelector(".daikin-screen-led");
    if (stageScreen) {
      if (isTurbo) stageScreen.classList.add("is-turbo-led");
      else stageScreen.classList.remove("is-turbo-led");
    }
    const stageFlake = document.querySelector(".daikin-led-snowflake");
    if (stageFlake) {
      if (isTurbo) stageFlake.classList.add("fast-spin");
      else stageFlake.classList.remove("fast-spin");
    }

    // 2. Kitchen Bar LED & Button
    const kLed = document.getElementById("k-daikin-led");
    if (kLed) {
      kLed.textContent = tempDisplay;
      if (isTurbo) kLed.classList.add("is-turbo-led");
      else kLed.classList.remove("is-turbo-led");
    }
    const kStatus = document.getElementById("k-daikin-status");
    if (kStatus) {
      kStatus.textContent = isTurbo
        ? `🔥 XẢ GIÓ TURBO ${tempDisplay}! Cả quán mát lạnh cóng, khách cực kỳ kiên nhẫn (${turboSecs}s còn lại)`
        : `Gió lạnh ${modeText}: Làm dịu cơn cay · Khách kiên nhẫn +${bonusPct}%`;
    }
    const turboBtn = document.getElementById("btn-k-turbo");
    if (turboBtn) {
      turboBtn.innerHTML = isTurbo ? `❄️ Đang Xả ${tempDisplay} (${turboSecs}s)` : `⚡ Turbo 16°C`;
      if (isTurbo) turboBtn.classList.add("active-blasting");
      else turboBtn.classList.remove("active-blasting");
    }

    // 3. Wall unit classes
    const wallUnit = document.querySelector(".daikin-wall-unit");
    if (wallUnit) {
      if (isTurbo) wallUnit.classList.add("is-turbo-blasting");
      else wallUnit.classList.remove("is-turbo-blasting");
    }
    const kInner = document.querySelector(".k-daikin-inner");
    if (kInner) {
      if (isTurbo) kInner.classList.add("is-turbo-blasting");
      else kInner.classList.remove("is-turbo-blasting");
    }

    // 4. Prep Mode Mini
    const prepIndicator = document.getElementById("prep-daikin-indicator");
    if (prepIndicator) {
      prepIndicator.textContent = `❄️ Daikin ${tempDisplay} (${modeText})`;
    }
    const prepTemp = document.querySelector(".prep-daikin-temp");
    if (prepTemp) {
      prepTemp.textContent = tempDisplay;
    }
  }

  // Tăng giảm nhiệt độ thủ công trên thanh điều hòa
  adjustDaikinTemp(delta) {
    this.sound.playButtonClick();
    const acLv = (this.state && this.state.upgrades && this.state.upgrades.acCooling) || 1;
    const minTemp = acLv >= 3 ? 14 : 16;
    const maxTemp = 28;

    let currentTemp = this.getCurrentDaikinTemp();
    currentTemp = Math.max(minTemp, Math.min(maxTemp, currentTemp + delta));
    this.state.acTemp = currentTemp;

    this.updateDaikinLedDisplays();
    GameUIModal.showToast(`🌡️ Đã chỉnh nhiệt độ Điều Hòa Daikin: ${currentTemp}°C`, "info", "❄️");
  }

  // Tương tác bấm vào Điều hòa Daikin để xả gió Turbo
  interactDaikinAC() {
    if (this.sound && typeof this.sound.playFrostWindSound === "function") {
      this.sound.playFrostWindSound();
    } else {
      this.sound.playCoinChime();
    }
    const acLv = (this.state && this.state.upgrades && this.state.upgrades.acCooling) || 1;
    const targetTurboTemp = acLv >= 3 ? 14 : 16;

    // Hồi phục kiên nhẫn ngay cho tất cả khách đang chờ (+30)
    let boostedCount = 0;
    this.orderSlots.forEach(slot => {
      if (slot) {
        slot.patience = Math.min(slot.maxPatience, slot.patience + 30);
        boostedCount++;
      }
    });

    // Kích hoạt trạng thái Turbo 12 giây
    this.state.acTurboActive = true;
    this.state.acTurboSeconds = 12;

    // Hiệu ứng nhiệt độ tụt dốc thời gian thực (Drop animation)
    if (this.daikinDropInterval) clearInterval(this.daikinDropInterval);
    const curr = this.getCurrentDaikinTemp();

    if (curr > targetTurboTemp) {
      this.daikinDropInterval = setInterval(() => {
        if (this.state.acTemp > targetTurboTemp) {
          this.state.acTemp -= 1;
          this.updateDaikinLedDisplays();
        } else {
          clearInterval(this.daikinDropInterval);
          this.daikinDropInterval = null;
        }
      }, 110);
    } else {
      this.state.acTemp = targetTurboTemp;
      this.updateDaikinLedDisplays();
    }

    // Hiệu ứng luồng gió lạnh băng giá phà khắp quán
    const openModeLayout = document.getElementById("view-open-mode");
    if (openModeLayout) {
      for (let i = 0; i < 9; i++) {
        const flake = document.createElement("div");
        flake.className = "daikin-wind-breeze";
        flake.textContent = ["❄️", "🌬️", "✨", "🧊"][i % 4];
        flake.style.left = `${10 + Math.random() * 80}%`;
        flake.style.top = `${20 + Math.random() * 55}%`;
        flake.style.animationDelay = `${i * 0.08}s`;
        openModeLayout.appendChild(flake);
        setTimeout(() => flake.remove(), 1800);
      }
    }

    this.renderOrderQueue();
    GameUIModal.showToast(
      `🧊 BẬT TURBO DAIKIN ${targetTurboTemp}°C! Nhiệt độ hạ sâu tức thì, gió phà mát lạnh cả quán (+30 Kiên nhẫn cho ${boostedCount} khách)!`,
      "success",
      "❄️"
    );
  }

  // ==========================================================
  // VÒNG ĐỜI NGÀY MỞ CỬA (DAY CYCLE)
  // ==========================================================
  startOpenDay() {
    const myBoStock = this.state.noodles.my_bo.stock;
    if (myBoStock <= 0) {
      GameUIModal.showToast("Bạn cần vào Kho mua ít nhất 1 phần Mì cay Bò Mỹ trước khi mở quán!", "warning", "🍜");
      this.switchTab("tab-kho");
      return;
    }

    this.state.dayPhase = "open";
    this.state.todayEarnings = 0;
    this.state.todayBowlsSold = 0;
    this.state.todayDrinksSold = 0;
    this.state.todaySpicy7Sold = 0;
    this.state.todayTips = 0;
    this.state.todaySpecialBonus = 0;
    this.state.todaySpecialBowlsSold = 0;
    this.dayRemaining = this.dayDuration;
    this.orderSlots = [null, null, null];
    this.settleCodPending(true); // Tiền COD còn sót từ phiên trước (nếu có)
    this.state.onlineOrders = [];
    this.onlineHistory = [];
    this.serveStreak = 0;
    this.bestServeStreak = 0;
    this.clearCurrentPot(true);

    // Reset Giờ Vàng FEVER RUSH đầu ca
    this.feverPoints = 0;
    this.isFeverActive = false;
    this.feverRemainingSeconds = 0;
    this.updateFeverUI();

    // Chuyển view: Ẩn prep view, hiện open cooking view
    const prepView = document.getElementById("view-prep-mode");
    const openView = document.getElementById("view-open-mode");
    if (prepView) prepView.style.display = "none";
    if (openView) openView.style.display = "block";

    this.switchMobileOpenTab("cockpit");
    this.switchCookingDockTab("quick");

    this.sound.playDoorBell();
    // Nguyên liệu phụ sắp cạn thì nhắc ngay lúc mở cửa (thiếu sẽ làm món kém ngon: -15% giá, -1 sao)
    const lowSupplies = Object.values(this.state.supplies).filter(sup => sup.stock < 6).map(sup => `${sup.icon} ${sup.name} (${sup.stock})`);
    if (lowSupplies.length > 0 && !this.state.staff.fawn) {
      GameUIModal.showToast(`Khai trương Ngày ${this.state.day}! ⚠️ Sắp hết: ${lowSupplies.join(", ")} — thiếu sẽ làm món kém ngon.`, "warning", "📦", 4200);
    } else {
      GameUIModal.showToast(`Khai trương Ngày ${this.state.day}! Tiệm mỳ cay xì xèo ấm áp đón khách!`, "success", "🏮");
    }
    if (this.scene) this.scene.announce("open");

    // Khách đầu tiên ghé ngay lập tức
    this.spawnCustomerToSlot();

    this.saveGame();
    this.renderAll();

    // Bắt đầu vòng lặp
    this.startDayLoop();
  }

  startDayLoop() {
    if (this.dayTimerInterval) clearInterval(this.dayTimerInterval);
    if (this.customerInterval) clearInterval(this.customerInterval);
    if (this.onlineOrderInterval) clearInterval(this.onlineOrderInterval);
    if (this.staffAutomationInterval) clearInterval(this.staffAutomationInterval);

    // 1. Đếm ngược thời gian ca bán
    this.dayTimerInterval = setInterval(() => {
      if (this.isPaused) return;

      this.dayRemaining -= 1;
      this.renderHeader();

      // Kiểm tra định kỳ loại mì hết hàng để từ chối các đơn trùng phía sau
      this.checkAndAutoRejectOutOfStockDuplicates();

      // Cập nhật đếm ngược Turbo Daikin (nếu đang kích hoạt)
      if (this.state && this.state.acTurboActive) {
        this.state.acTurboSeconds = (this.state.acTurboSeconds || 12) - 1;
        if (this.state.acTurboSeconds <= 0) {
          this.state.acTurboActive = false;
          this.state.acTurboSeconds = 0;
          this.state.acTemp = this.getBaseDaikinTemp();
          this.updateDaikinLedDisplays();
          GameUIModal.showToast("💨 Chế độ Turbo Daikin đã kết thúc. Điều hòa trở về chế độ Inverter êm dịu!", "info", "❄️");
        } else {
          this.updateDaikinLedDisplays();
        }
      }

      // Cập nhật đếm ngược Giờ Vàng FEVER RUSH (Tính năng VIP v1.5.5)
      if (this.isFeverActive) {
        this.feverRemainingSeconds = (this.feverRemainingSeconds || FEVER_SECONDS) - 1;
        this.updateFeverUI();
        if (this.feverRemainingSeconds <= 0) {
          this.endFeverRush();
        }
      }

      // Nâng cấp Điều Hòa Daikin (acCooling): Không khí mát lành giảm độ bức bối giúp khách kiên nhẫn hơn
      const acLv = this.state.upgrades.acCooling || 1;
      const dayRush = Math.min(0.35, (this.state.day - 1) * 0.05); // Các ngày sau khách đông và sốt ruột hơn một chút
      const patienceLoss = Math.max(0.6, 1.1 + dayRush - (acLv - 1) * 0.15);

      // Khi đang trong Giờ Vàng FEVER RUSH: ĐÓNG BĂNG KIÊN NHẪN (patience loss = 0)! Khách luôn tươi cười kiên nhẫn chờ!
      const isPatienceFrozen = this.isFeverActive;
      if (!isPatienceFrozen) {
        // Giảm độ kiên nhẫn của khách ở các slot (Điều hòa Daikin & Tác động giá bán)
        this.orderSlots.forEach((slot, idx) => {
          if (slot) {
            // Khách gọi món đắt đỏ sẽ khắt khe và sốt ruột hơn, món rẻ khách kiên nhẫn hơn
            const slotPriceRatio = slot.orderPriceRatio || 1.0;
            let pricePatienceMod = 1.0;
            if (slotPriceRatio > 1.35) {
              pricePatienceMod = 1.35; // Quá đắt: sốt ruột x1.35
            } else if (slotPriceRatio > 1.15) {
              pricePatienceMod = 1.15; // Hơi đắt: sốt ruột x1.15
            } else if (slotPriceRatio <= 0.85) {
              pricePatienceMod = 0.82; // Rẻ hạt dẻ: kiên nhẫn, chờ được lâu hơn
            }

            slot.patience -= (patienceLoss * pricePatienceMod);
            if (slot.patience <= 0) {
              // Bạch Hổ Tora (Vệ Sĩ): 85% hòa giải thành công dỗ dành khách kiên nhẫn
              if (this.state.staff.tora && Math.random() < 0.85) {
                slot.patience = 35;
                GameUIModal.showToast(`🐯 Bạch Hổ Tora đã dỗ dành ${slot.customer.name}! Tặng nước thanh nhiệt giữ khách thành công (+35 Kiên nhẫn)!`, "success", "🐯");
                const slotCard = document.getElementById(`order-slot-${idx}`);
                if (slotCard && typeof GameUIModal.spawnFloatingFx === "function") {
                  GameUIModal.spawnFloatingFx(slotCard, "🐯 Hòa Giải!", true);
                }
              } else {
                GameUIModal.showToast(`${slot.customer.name} đã tức giận bỏ về vì chờ quá lâu! (-1 ⭐)`, "warning", "😡");
                this.sound.playReviewChime();

                const angryComments = [
                  `Chờ mòn mỏi cả 20 phút không thấy tô mì đâu! Đói lả cả người đành phải bỏ về, quán phục vụ quá chậm chạp! 😡`,
                  `Quán gì để khách chờ sốt ruột toát mồ hôi hột. Gọi món xong ngồi ngó nhân viên, bực mình bỏ về luôn. 1 sao! 👎`,
                  `Bảo quán mì cay đệ nhất mà làm ăn như rùa bò, không bao giờ quay lại lần thứ hai! 💢`
                ];
                const angryText = angryComments[Math.floor(Math.random() * angryComments.length)];

                this.state.reputation = Math.max(5, this.state.reputation - 4);
                this.addReview({
                  id: Date.now() + Math.random().toString(36).substr(2, 4),
                  customerName: slot.customer.name,
                  customerAvatar: slot.customer.avatar || "assets/cust_cat.png",
                  stars: getPersona(slot.customer.name).leniency >= 6 ? 2 : 1,
                  comment: angryText,
                  issues: ["walkout"],
                  date: `Ngày ${this.state.day}`,
                  replied: false,
                  ownerReply: null,
                  customerFeedback: null
                });

                this.orderSlots[idx] = null;
                this.resetServeStreak();
                this.renderHeader();
              }
            }
          }
        });
      }
      this.renderOrderQueue();

      // Giao hàng online: bếp nấu, tài xế di chuyển, hết hạn đơn...
      this.tickOnlineOrders();

      // Cập nhật thực khách đang ăn tại các bàn (Quạt hút ion airPurifier tăng tốc ăn 25% mỗi cấp)
      let tableChanged = false;
      const purifierLv = this.state.upgrades.airPurifier || 0;
      const eatStep = 1 + (purifierLv * 0.25);
      this.state.tables.forEach(table => {
        if (table.status === "eating") {
          table.eatTimer = (table.eatTimer || 12) - eatStep;
          if (table.eatTimer <= 0) {
            tableChanged = true;
            if (this.state.staff.shiba) {
              table.status = "empty";
              table.customer = null;
              table.order = null;
              const hasTip = Math.random() < 0.6;
              const autoTip = hasTip ? (Math.floor(Math.random() * 3) + 2) : 0; // 2k - 4k tip
              if (autoTip > 0) {
                this.state.money += autoTip;
                this.state.todayTips += autoTip;
                this.state.todayEarnings += autoTip;
                this.state.stats.tipsEarned += autoTip;
                this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + autoTip;
              }
              if (this.sound && typeof this.sound.playCleaningSound === "function") {
                this.sound.playCleaningSound();
              } else {
                this.sound.playCoinChime();
              }
              const tableEl = document.getElementById(`dining-table-${table.id}`);
              if (tableEl && autoTip > 0 && typeof GameUIModal.spawnFloatingFx === "function") {
                GameUIModal.spawnFloatingFx(tableEl, `+${autoTip}k 🐶`, true);
              }
              GameUIModal.showToast(`🐶 Cún Shiba đã lau dọn sạch bàn #${table.id}!${autoTip > 0 ? ` Nhặt được +${autoTip}k tip!` : ''}`, "success", "✨");
            } else {
              table.status = "dirty";
            }
          }
        }
      });
      if (tableChanged) {
        this.renderDiningStage();
        this.renderHeader();
      }

      if (this.dayRemaining <= 0) {
        this.endDay();
      }
    }, 1000 / this.gameSpeed);

    // 2. Nâng cấp Đèn Lồng Đỏ Tokyo - Seoul (decorScore) & TÁC ĐỘNG ĐIỂM SAO UY TÍN (AVG STARS) & GIÁ BÁN TRUNG BÌNH:
    // Điểm sao cao (danh tiếng tốt) -> Khách ghé nườm nượp tấp nập!
    // Điểm sao thấp (bị chê bai) -> Quán ế ẩm, ít khách ghé!
    const decorLv = this.state.upgrades.decorScore || 1;
    let currentAvgStars = 5;
    if (this.state.reviews.length > 0) {
      const totalStars = this.state.reviews.reduce((sum, r) => sum + (r.stars || 5), 0);
      currentAvgStars = totalStars / this.state.reviews.length;
    }

    let starMultiplier = 1.0;
    if (currentAvgStars >= 4.6) starMultiplier = 0.65; // Khách kéo đến nườm nượp tấp nập! (-35% thời gian)
    else if (currentAvgStars >= 3.8) starMultiplier = 0.95; // Ổn định
    else if (currentAvgStars >= 2.5) starMultiplier = 1.5; // Giảm lượng khách (+50% thời gian)
    else starMultiplier = 2.2; // Quán vắng tanh do bị chê bai (+120% thời gian)

    // Tác động của Mức Giá Bán Trung Bình của Tiệm:
    // Giá rẻ (<= 0.85) -> Khách kéo đến đông hơn (+25% lưu lượng, -20% thời gian chờ)
    // Giá đắt (> 1.15) -> Khách e dè hơn (-15% đến -35% lượng khách)
    const avgPriceRatio = this.getAveragePriceRatio();
    let priceTrafficMultiplier = 1.0;
    if (avgPriceRatio <= 0.85) {
      priceTrafficMultiplier = 0.80; // Giảm interval -> khách vào tấp nập hơn
    } else if (avgPriceRatio > 1.35) {
      priceTrafficMultiplier = 1.45; // Quá đắt -> quán vắng vẻ
    } else if (avgPriceRatio > 1.15) {
      priceTrafficMultiplier = 1.18; // Hơi đắt -> khách thưa hơn một chút
    }

    // Nhịp độ khách vào quán hợp lý (3.5s - 9.5s), Owl tăng +40% tần suất khách ghé quán
    const owlTraffic = this.state.staff.owl ? 0.65 : 1.0;
    const custIntervalMs = Math.max(3500, Math.round((9500 - (decorLv - 1) * 750) * starMultiplier * priceTrafficMultiplier * owlTraffic));

    // Khách mới ghé các slot trống
    this.customerInterval = setInterval(() => {
      if (this.isPaused) return;
      this.spawnCustomerToSlot();
    }, custIntervalMs / this.gameSpeed);

    // 3. Đơn hàng Shipper online định kỳ (Owl rút ngắn từ 18s xuống 10s bão đơn)
    const onlineTimerMs = (this.state.staff.owl ? 10000 : 18000) / this.gameSpeed;
    this.onlineOrderInterval = setInterval(() => {
      if (this.isPaused) return;
      this.spawnOnlineOrder();
    }, onlineTimerMs);

    // 4. Vòng lặp làm việc thực tế của nhân viên (Kenji, Usagi, Shiba, Ducky, Fawn, Ryu)
    // Nâng cấp Bếp Gas (stoveSpeed) & Bếp Niêu Đôi (dualStove) giúp thao tác nhanh vượt trội
    const stoveLv = (this.state.upgrades.stoveSpeed || 1) + ((this.state.upgrades.dualStove || 0) * 1.5);
    const autoIntervalMs = Math.max(850, 2200 - (stoveLv - 1) * 320) / this.getStaffEfficiency();

    this.staffAutomationInterval = setInterval(() => {
      this.runStaffAutomation();
    }, autoIntervalMs / this.gameSpeed);
  }

  // Tự động hóa nhân viên đang làm việc thực tế trong tiệm
  runStaffAutomation() {
    if (this.isPaused || this.state.dayPhase !== "open") return;

    const staff = this.state.staff;
    // Mỗi nhịp chỉ 1 thao tác bếp: nấu / pha nước xong phải sang nhịp sau Usagi mới bưng (không bưng tức thì)
    let kitchenBusy = false;

    // 1. Gấu Kenji (Đầu bếp): niêu đang rỗng -> nấu cho khách sốt ruột nhất mà kho còn mì
    if (staff.kenji && !this.currentPot.noodleId) {
      const target = this.orderSlots
        .map((slot, i) => ({ slot, i }))
        .filter(({ slot }) => slot && !this.isItemSoldOut("noodles", slot.order.noodleId))
        .sort((a, b) => (a.slot.patience / a.slot.maxPatience) - (b.slot.patience / b.slot.maxPatience))[0];
      if (target) {
        const ord = target.slot.order;
        this.currentPot.noodleId = ord.noodleId;
        this.currentPot.size = ord.size || "M";
        this.currentPot.spicyLevel = ord.spicyLevel || 0;
        this.currentPot.toppings = ord.toppingId && !this.isItemSoldOut("toppings", ord.toppingId) ? [ord.toppingId] : [];
        this.currentPot.drinkId = null;
        kitchenBusy = true;
        this.sound.playCookingSizzle();
        this.triggerPotBounce();
        this.renderPotWorkstation();
        this.renderCookingSteps();
        this.renderOrderQueue();
      }
    }

    // 2. Vịt Ducky (Barista): đơn đang nấu có gọi nước -> pha đúng ly khách gọi (trừ kho khi bưng, không trừ 2 lần)
    if (staff.ducky && !kitchenBusy && this.currentPot.noodleId && !this.currentPot.drinkId) {
      const needDrink = this.orderSlots.find(slot => slot && slot.order.drinkId &&
        !this.isItemSoldOut("drinks", slot.order.drinkId) &&
        !this.getOrderMismatch(slot.order, { ...this.currentPot, drinkId: slot.order.drinkId }));
      if (needDrink) {
        this.currentPot.drinkId = needDrink.order.drinkId;
        kitchenBusy = true;
        if (this.sound && typeof this.sound.playShakerSound === "function") this.sound.playShakerSound();
        this.renderPotWorkstation();
        this.renderCookingSteps();
        this.renderOrderQueue();
      }
    }

    // 3. Thỏ Usagi (Phục vụ): niêu đã khớp đơn nào (đủ size, cay, topping, nước) thì bưng ngay
    if (staff.usagi && !kitchenBusy && this.currentPot.noodleId) {
      const idx = this.orderSlots.findIndex(slot => slot && !this.getOrderMismatch(slot.order));
      if (idx >= 0) this.serveToSlot(idx, true);
    }

    // 4. Cún Shiba (Tạp vụ): Dọn dẹp bàn ghế, nhặt thêm tiền tip ngẫu nhiên
    if (staff.shiba && Math.random() < 0.08) {
      const extraTip = Math.floor(Math.random() * 2) + 2; // 2k - 3k
      this.state.money += extraTip;
      this.state.todayTips += extraTip;
      this.state.todayEarnings += extraTip;
      this.state.stats.tipsEarned += extraTip;
      this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + extraTip;
      this.sound.playCoinChime();
      this.renderHeader();
    }

    // 5. Nai Fawn (Logistics & Quản lý Kho): Tự động đặt sỉ khi nguyên liệu cạn đáy (còn <= 1 phần)
    if (staff.fawn) {
      const allWarehouseItems = [
        ...Object.values(this.state.supplies),
        ...Object.values(this.state.noodles).filter(n => n.unlocked),
        ...Object.values(this.state.toppings).filter(t => t.unlocked),
        ...Object.values(this.state.drinks).filter(d => d.unlocked)
      ];
      for (const item of allWarehouseItems) {
        if ((item.stock || 0) <= 1) {
          if (this.marketBuy(item.id, 5)) {
            this.renderHeader();
            this.renderKhoTab();
            break;
          }
        }
      }
    }

    // 6. Thần Long Ryu (Linh vật may mắn tối thượng): Nạp đầy FEVER & ban phát mưa tiền vàng
    if (staff.ryu && Math.random() < 0.16) {
      this.addFeverPoints(35);
      const goldRain = Math.floor(Math.random() * 25) + 20; // 20k - 45k
      this.state.money += goldRain;
      this.state.todayEarnings += goldRain;
      this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + goldRain;
      this.sound.playCoinChime();
      GameUIModal.showToast(`🐉 Thần Long Ryu giáng thế! Rơi mưa vàng +${goldRain}k & tích lũy năng lượng FEVER RUSH!`, "success", "✨");
      this.renderHeader();
    }
  }

  // ==========================================================
  // GIAO HÀNG ONLINE (GrabFood / ShopeeFood / BeFood / Baemin) - quy trình như ngoài đời:
  // Đơn mới (15s để nhận) -> Nhận đơn & nấu -> Đóng gói (ép màng, túi, đũa/sốt, tem) -> Báo món xong
  // -> Tài xế tới lấy (đọc mã đơn) -> Giao cho khách -> Quán nhận tiền sau khi trừ phí nền tảng
  // ==========================================================
  getOnlineAcceptRate() {
    const s = this.state.stats;
    const accepted = s.onlineAccepted || 0;
    const total = accepted + (s.onlineRejected || 0) + (s.onlineMissed || 0);
    return total < 5 ? 1 : accepted / total;
  }

  findOnlineOrder(id) {
    return this.state.onlineOrders.find(o => o.id === Number(id));
  }

  removeOnlineOrder(order) {
    if (this.sealOrderId === order.id) this.closeSealMinigame();
    const idx = this.state.onlineOrders.indexOf(order);
    if (idx >= 0) this.state.onlineOrders.splice(idx, 1);
  }

  pushOnlineHistory(text, tone = "ok") {
    this.onlineHistory.unshift({ text, tone });
    if (this.onlineHistory.length > 6) this.onlineHistory.pop();
  }

  // Đơn mới từ ứng dụng giao đồ ăn
  spawnOnlineOrder() {
    if (this.state.dayPhase !== "open") return;
    const orders = this.state.onlineOrders;
    // Tối đa 3 đơn đang chờ xử lý cùng lúc (đơn đã giao đi xa không tính)
    if (orders.filter(o => o.stage !== "delivering").length >= 3) return;
    // Tỉ lệ nhận đơn thấp -> app giảm đẩy đơn cho quán (giống xếp hạng cửa hàng ngoài đời)
    if (this.getOnlineAcceptRate() < 0.7 && Math.random() < 0.45) return;

    const app = this.pickRandom(Object.keys(DELIVERY_APPS));
    const cfg = DELIVERY_APPS[app];

    // Chỉ đặt món còn hàng (đã trừ phần các đơn tại quán đang chờ)
    const activeNoodles = Object.values(this.state.noodles).filter(n => n.unlocked && n.inMenu && n.stock > this.countReserved("noodleId", n.id));
    if (activeNoodles.length === 0) return;
    const chosenNoodle = this.pickRandom(activeNoodles);
    const noodlePrice = chosenNoodle.price;

    const activeDrinks = Object.values(this.state.drinks).filter(d => d.unlocked && d.inMenu && d.stock > this.countReserved("drinkId", d.id));
    const chosenDrink = activeDrinks.length > 0 ? this.pickRandom(activeDrinks) : null;
    const drinkPrice = chosenDrink ? chosenDrink.price : 0;

    const spicyLevel = Math.floor(Math.random() * 4) + 1;
    const itemsText = `1 ${chosenNoodle.name} (Cấp ${spicyLevel}) [${noodlePrice}k]` +
      (chosenDrink ? ` + 1 ${chosenDrink.name} [${drinkPrice}k]` : "");

    // Giá trên app cao hơn giá tại quán ~12%, quán bị trừ phí nền tảng theo từng app
    const gross = Math.round((noodlePrice + drinkPrice) * DELIVERY_MENU_MARKUP);
    const isCod = Math.random() < DELIVERY_COD_SHARE;
    const commission = Math.round(gross * (cfg.commission - (isCod ? DELIVERY_COD_FEE_DISCOUNT : 0)));

    const baseShipper = this.pickRandom(this.shipperTemplates);
    const shipper = {
      name: baseShipper.name,
      avatar: baseShipper.avatar,
      vehicle: this.generateRandomShipperVehicle(),
      quote: baseShipper.quote
    };

    const order = {
      id: ++this.onlineSeq,
      code: String(Math.floor(1000 + Math.random() * 9000)),
      app,
      stage: "new",
      itemsText,
      noodleId: chosenNoodle.id,
      drinkId: chosenDrink ? chosenDrink.id : null,
      noodlePrice,
      drinkPrice,
      bowlsCount: 1,
      gross,
      commission,
      isCod,
      codConfirmed: false,
      price: gross - commission,
      note: this.pickRandom(DELIVERY_NOTES),
      distanceKm: Math.round((0.8 + Math.random() * 2.7) * 10) / 10,
      shipper,
      offerLeft: DELIVERY_OFFER_SECONDS,
      offerAge: 0
    };
    orders.push(order);
    this.sound.playDoorBell();
    GameUIModal.showToast(`🔔 Đơn ${app} #${order.id} vừa đổ về! Nhận trong ${DELIVERY_OFFER_SECONDS}s nhé.`, "info", "🛵");
    this.renderOnlineBoards();
  }

  // Bước 1: nhận đơn (trừ kho, bếp bắt đầu nấu, app gán tài xế chạy tới quán)
  acceptOnlineOrder(id, byShiro = false) {
    const o = this.findOnlineOrder(id);
    if (!o || o.stage !== "new") return;

    const noodle = this.state.noodles[o.noodleId];
    if (!noodle || noodle.stock <= this.countReserved("noodleId", o.noodleId)) {
      this.removeOnlineOrder(o);
      this.pushOnlineHistory(`❌ #${o.id} ${o.app}: hết ${noodle ? noodle.name : "mì"}, app tự hủy đơn`, "bad");
      GameUIModal.showToast(`📦 Kho đã hết ${noodle ? noodle.name : "mì"}, app tự hủy đơn #${o.id}.`, "warning", "⚠️");
      this.renderOnlineBoards();
      return;
    }

    // Nguyên liệu được giữ cho đơn ngay khi nhận (hủy sau đó vẫn mất nguyên liệu như ngoài đời)
    noodle.stock -= 1;
    const drink = o.drinkId ? this.state.drinks[o.drinkId] : null;
    if (drink && drink.stock > 0) drink.stock -= 1;
    else o.drinkId = null;
    this.consumeSupplies(this.getSuppliesForOrder({ spicyLevel: 1 }, Boolean(o.drinkId)));
    this.state.stats.onlineAccepted = (this.state.stats.onlineAccepted || 0) + 1;

    const stoveLv = this.state.upgrades.stoveSpeed || 1;
    const cookTotal = Math.max(6, 14 - (stoveLv - 1) * 2);
    const eta = Math.round(o.distanceKm * 14) + 4 + Math.floor(Math.random() * 6);
    const deliverTotal = Math.round(o.distanceKm * 12) + 8;
    const autoSealed = (this.state.upgrades.autoSealer || 0) > 0;

    Object.assign(o, {
      stage: "active",
      age: 0,
      cookTotal,
      cookLeft: cookTotal,
      cooking: false,
      cookDone: false,
      cookDoneAge: null,
      packed: { seal: autoSealed, bag: false, cutlery: false, tem: false },
      ready: false,
      arrived: false,
      etaLeft: eta,
      waitLeft: DELIVERY_DRIVER_PATIENCE,
      deliverTotal,
      deliverLeft: deliverTotal,
      promiseSecs: Math.max(cookTotal + 10, eta) + deliverTotal + 25,
      rain: false,
      autoSealed
    });
    if (autoSealed) o.price += 20; // Máy ép màng tự động: +20k/đơn

    this.sound.playCoinChime();
    if (byShiro) GameUIModal.showToast(`🦊 Cáo Shiro đã nhận đơn ${o.app} #${o.id}!`, "success", "📲");
    this.renderOnlineBoards();
  }

  rejectOnlineOrder(id) {
    const o = this.findOnlineOrder(id);
    if (!o || o.stage !== "new") return;
    this.state.stats.onlineRejected = (this.state.stats.onlineRejected || 0) + 1;
    this.removeOnlineOrder(o);
    this.pushOnlineHistory(`🚫 #${o.id} ${o.app}: quán từ chối đơn`, "warn");
    GameUIModal.showToast(`Đã từ chối đơn #${o.id}. Từ chối nhiều sẽ làm tỉ lệ nhận đơn tụt, app đẩy ít đơn hơn.`, "info", "🚫");
    this.renderOnlineBoards();
  }

  // Bước 3: đóng gói từng thứ (ép màng chỉ làm được khi niêu đã chín)
  packOnlineItem(id, key, byShiro = false) {
    const o = this.findOnlineOrder(id);
    if (!o || o.stage !== "active" || o.ready || o.packed[key]) return;
    if (key === "seal" && !o.cookDone) {
      GameUIModal.showToast("Niêu mì chưa chín, chưa ép màng được!", "info", "🍲");
      return;
    }
    // Ép màng thủ công là thao tác thật: phải miết kín cả vòng miệng niêu (Cáo Shiro làm thay thì khỏi)
    if (key === "seal" && !byShiro) {
      this.startSealMinigame(o.id);
      return;
    }
    o.packed[key] = true;

    if (this.sound && typeof this.sound.playPackagingSound === "function") this.sound.playPackagingSound();
    else this.sound.playCoinChime();

    if (key === "seal") {
      o.price += 15; // Khách tip thêm vì niêu ép màng chống tràn
      const card = document.querySelector(`[data-oid="${o.id}"]`);
      if (card && !byShiro) GameUIModal.spawnFloatingFx(card, "+15k 📦", true);
    }
    this.renderOnlineBoards();
  }

  // Mini-game ép màng: giữ chuột / ngón tay miết quanh miệng niêu, mỗi đoạn viền đi qua sẽ dính màng
  startSealMinigame(id) {
    const o = this.findOnlineOrder(id);
    if (!o || o.stage !== "active" || o.ready || o.packed.seal) return;
    this.closeSealMinigame();
    this.sealOrderId = o.id;

    const SEG = DELIVERY_SEAL_SEGMENTS;
    const R = 100;
    const WIDTH = 26;
    let arcs = "";
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * 2 * Math.PI - Math.PI / 2 + 0.03;
      const a1 = ((i + 1) / SEG) * 2 * Math.PI - Math.PI / 2 - 0.03;
      arcs += `<path class="seal-seg" d="M${(130 + R * Math.cos(a0)).toFixed(1)} ${(130 + R * Math.sin(a0)).toFixed(1)} A${R} ${R} 0 0 1 ${(130 + R * Math.cos(a1)).toFixed(1)} ${(130 + R * Math.sin(a1)).toFixed(1)}" />`;
    }
    const overlay = document.createElement("div");
    overlay.className = "seal-overlay";
    overlay.innerHTML = `
      <div class="seal-card">
        <div class="seal-title">🔒 Ép màng niêu #${o.id}</div>
        <div class="seal-hint">Giữ chuột / ngón tay rồi miết quanh miệng niêu cho màng dính kín cả vòng</div>
        <svg class="seal-svg" viewBox="0 0 260 260">
          <circle class="seal-pot" cx="130" cy="130" r="114" />
          <circle class="seal-film" cx="130" cy="130" r="88" />
          ${arcs}
          <text class="seal-count" x="130" y="136" text-anchor="middle">0/${SEG}</text>
        </svg>
        <button class="dlv-btn dlv-btn-ghost seal-cancel">Thôi, ép sau</button>
      </div>`;
    document.body.appendChild(overlay);
    this.sealOverlay = overlay;

    const svg = overlay.querySelector(".seal-svg");
    const segs = overlay.querySelectorAll(".seal-seg");
    const countEl = overlay.querySelector(".seal-count");
    const done = new Set();
    let drawing = false;
    let last = null;

    const mark = i => {
      if (done.has(i)) return;
      done.add(i);
      segs[i].classList.add("is-sealed");
      countEl.textContent = `${done.size}/${SEG}`;
    };
    const handle = e => {
      const rect = svg.getBoundingClientRect();
      const k = rect.width / 260;
      const x = (e.clientX - rect.left) / k - 130;
      const y = (e.clientY - rect.top) / k - 130;
      if (Math.abs(Math.hypot(x, y) - R) > WIDTH) { last = null; return; }
      let ang = Math.atan2(y, x) + Math.PI / 2;
      if (ang < 0) ang += 2 * Math.PI;
      const idx = Math.floor((ang / (2 * Math.PI)) * SEG) % SEG;
      if (last !== null && last !== idx) {
        // Miết nhanh có thể nhảy qua đoạn: tô nốt các đoạn nằm giữa theo chiều ngắn nhất
        const fwd = (idx - last + SEG) % SEG;
        const dir = fwd <= SEG / 2 ? 1 : -1;
        const steps = dir === 1 ? fwd : SEG - fwd;
        for (let st = 1; st < steps; st++) mark((last + dir * st + SEG) % SEG);
      }
      mark(idx);
      last = idx;
      if (done.size >= SEG) this.finishSeal(o.id);
    };
    svg.addEventListener("pointerdown", e => {
      drawing = true;
      last = null;
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* con trỏ giả lập / đã nhả */ }
      handle(e);
    });
    svg.addEventListener("pointermove", e => { if (drawing) handle(e); });
    const stop = () => { drawing = false; last = null; };
    svg.addEventListener("pointerup", stop);
    svg.addEventListener("pointercancel", stop);
    overlay.querySelector(".seal-cancel").addEventListener("click", () => this.closeSealMinigame());
    this.sealKeyHandler = e => { if (e.key === "Escape") this.closeSealMinigame(); };
    document.addEventListener("keydown", this.sealKeyHandler);
  }

  closeSealMinigame() {
    if (this.sealOverlay) this.sealOverlay.remove();
    if (this.sealKeyHandler) document.removeEventListener("keydown", this.sealKeyHandler);
    this.sealOverlay = null;
    this.sealKeyHandler = null;
    this.sealOrderId = null;
  }

  finishSeal(id) {
    this.closeSealMinigame();
    const o = this.findOnlineOrder(id);
    if (!o || o.stage !== "active" || o.ready || o.packed.seal) return;
    o.packed.seal = true;
    o.price += 15; // Khách tip thêm vì niêu ép màng chống tràn
    if (this.sound && typeof this.sound.playPackagingSound === "function") this.sound.playPackagingSound();
    else this.sound.playCoinChime();
    const card = document.querySelector(`[data-oid="${o.id}"]`);
    if (card) GameUIModal.spawnFloatingFx(card, "+15k 📦", true);
    GameUIModal.showToast(`🔒 Đã ép kín màng niêu đơn #${o.id}!`, "success", "✨");
    this.renderOnlineBoards();
  }

  // Gọi điện xác nhận đơn COD: giảm mạnh nguy cơ khách bom hàng
  confirmCodOrder(id) {
    const o = this.findOnlineOrder(id);
    if (!o || !o.isCod || o.codConfirmed || o.stage === "delivering") return;
    o.codConfirmed = true;
    GameUIModal.showToast(`📞 Đã gọi xác nhận đơn #${o.id}: khách đồng ý nhận hàng và sẽ chuẩn bị tiền mặt.`, "success", "☎️");
    this.renderOnlineBoards();
  }

  // Bước 4: báo "món đã xong" trên app (tài xế sẽ thấy và vào lấy)
  markOnlineReady(id, byShiro = false) {
    const o = this.findOnlineOrder(id);
    if (!o || o.stage !== "active" || o.ready) return;
    if (!o.cookDone) {
      GameUIModal.showToast("Niêu mì chưa chín, chưa báo xong được!", "info", "🍲");
      return;
    }
    o.ready = true;
    if (!byShiro) {
      const missing = DELIVERY_PACK_ITEMS.filter(it => !o.packed[it.key]).map(it => it.label);
      if (missing.length) GameUIModal.showToast(`⚠️ Đơn #${o.id} chưa đóng gói đủ: thiếu ${missing.join(", ")}. Khách dễ chê!`, "warning", "📦");
    }
    this.renderOnlineBoards();
  }

  // Bước 5: giao túi cho tài xế (tài xế đọc mã đơn, quán đối chiếu)
  handoverOnlineOrder(id, byShiro = false) {
    const o = this.findOnlineOrder(id);
    if (!o || o.stage !== "active") return;
    if (!o.ready) {
      GameUIModal.showToast("Món chưa báo xong, chưa có gì để giao!", "info", "📦");
      return;
    }
    if (!o.arrived) {
      GameUIModal.showToast(`Tài xế ${o.shipper.name} chưa tới quán, còn ${o.etaLeft}s nữa.`, "info", "🛵");
      return;
    }
    o.stage = "delivering";
    // Trời mưa / tắc đường: tài xế đi chậm hơn
    if (Math.random() < 0.25) {
      o.rain = true;
      o.deliverLeft += 10;
      o.deliverTotal += 10;
    }
    this.sound.playDoorBell();
    const who = byShiro ? "🦊 Cáo Shiro" : "Bạn";
    GameUIModal.showToast(`${who} giao túi cho ${o.shipper.name} (mã ${o.code} khớp). ${o.rain ? "🌧️ Trời mưa nên tài xế đi chậm hơn." : "Tài xế lên đường!"}`, "success", "🛵");
    this.renderOnlineBoards();
  }

  // Phím Space / nút nhanh: giao đơn đang chờ tài xế; không có thì nhận đơn mới
  handoverToShipper(isAutoShiro = false) {
    const orders = this.state.onlineOrders;
    const target = orders.find(o => o.stage === "active" && o.ready && o.arrived);
    if (target) {
      this.handoverOnlineOrder(target.id, isAutoShiro);
      return;
    }
    const offer = orders.find(o => o.stage === "new");
    if (offer) {
      this.acceptOnlineOrder(offer.id);
      return;
    }
    GameUIModal.showToast("Chưa có đơn nào cần xử lý hoặc tài xế nào đang chờ lấy hàng!", "info", "🛵");
  }

  // Mỗi giây trong ca bán: bếp nấu, tài xế di chuyển, hết hạn đơn, hủy chuyến...
  tickOnlineOrders() {
    const orders = this.state.onlineOrders;
    if (!orders.length) return;
    const shiro = Boolean(this.state.staff.shiro);
    // Số niêu nấu được cùng lúc: bếp thường 1, Bếp Niêu Đôi +1, Gấu Kenji +1
    const cookSlots = 1 + (this.state.upgrades.dualStove ? 1 : 0) + (this.state.staff.kenji ? 1 : 0);
    let cooking = 0;

    [...orders].forEach(o => {
      if (o.stage === "new") {
        o.offerLeft -= 1;
        o.offerAge += 1;
        if (shiro && o.offerAge >= 2) {
          this.acceptOnlineOrder(o.id, true);
        } else if (o.offerLeft <= 0) {
          this.state.stats.onlineMissed = (this.state.stats.onlineMissed || 0) + 1;
          this.removeOnlineOrder(o);
          this.pushOnlineHistory(`⌛ #${o.id} ${o.app}: quán không kịp nhận đơn`, "warn");
          GameUIModal.showToast(`⌛ Đơn ${o.app} #${o.id} hết hạn vì quán không nhận kịp.`, "warning", "📲");
        }
        return;
      }

      if (o.stage === "delivering") {
        o.age += 1;
        o.deliverLeft -= 1;
        if (o.deliverLeft <= 0) this.completeOnlineDelivery(o);
        return;
      }

      // stage === "active"
      o.age += 1;
      if (!o.cookDone) {
        o.cooking = cooking < cookSlots;
        if (o.cooking) {
          cooking += 1;
          o.cookLeft -= 1;
          if (o.cookLeft <= 0) {
            o.cookDone = true;
            o.cooking = false;
            o.cookDoneAge = o.age;
            this.sound.playCoinChime();
            GameUIModal.showToast(`🍲 Niêu mì đơn #${o.id} đã chín! Mau ép màng, đóng gói rồi báo món xong.`, "success", "🔥");
          }
        }
      }

      // Cáo Shiro đóng gói từng món, xong thì tự báo món
      if (shiro && o.cookDone && !o.ready) {
        const next = DELIVERY_PACK_ITEMS.find(it => !o.packed[it.key]);
        if (next) this.packOnlineItem(o.id, next.key, true);
        else this.markOnlineReady(o.id, true);
      }

      if (!o.arrived) {
        o.etaLeft -= 1;
        if (o.etaLeft <= 0) {
          o.arrived = true;
          this.sound.playDoorBell();
          GameUIModal.showToast(`🛵 ${o.shipper.name} đã tới quán lấy đơn #${o.id}!${o.ready ? "" : " Món chưa xong, tài xế đang chờ."}`, "info", "📍");
        }
      } else if (!o.ready) {
        o.waitLeft -= 1;
        if (o.waitLeft <= 0) {
          this.cancelOnlineOrder(o, "driver");
          return;
        }
      }

      if (o.arrived && o.ready && shiro) {
        this.handoverOnlineOrder(o.id, true);
        return;
      }
      if (o.age > o.promiseSecs + 75) this.cancelOnlineOrder(o, "customer");
    });

    this.refreshOnlineBoards();
  }

  cancelOnlineOrder(o, reason) {
    this.removeOnlineOrder(o);
    this.state.stats.onlineCancelled = (this.state.stats.onlineCancelled || 0) + 1;
    const lossRep = reason === "driver" ? 2 : 1;
    this.state.reputation = Math.max(5, this.state.reputation - lossRep);
    const reasonText = {
      driver: `${o.shipper.name} chờ quá lâu không có hàng nên hủy chuyến`,
      customer: "khách chờ quá lâu nên hủy đơn",
      closing: "quán đóng cửa khi chưa giao kịp"
    }[reason];
    this.pushOnlineHistory(`❌ #${o.id} ${o.app}: ${reasonText} (-${lossRep} ⭐)`, "bad");
    this.sound.playReviewChime();
    GameUIModal.showToast(`❌ Đơn ${o.app} #${o.id}: ${reasonText}. Mất đơn & nguyên liệu (-${lossRep} ⭐ uy tín).`, "warning", "💨");
    this.renderHeader();
    this.renderOnlineBoards();
  }

  // Tài xế giao tới khách: tính tiền, chấm điểm theo đúng những gì quán đã làm
  completeOnlineDelivery(o) {
    // Khách COD có thể bom hàng: quán mất món, không thu được đồng nào
    if (o.isCod && Math.random() < (o.codConfirmed ? DELIVERY_BOM_CONFIRMED : DELIVERY_BOM_CHANCE)) {
      this.removeOnlineOrder(o);
      this.state.stats.onlineBombed = (this.state.stats.onlineBombed || 0) + 1;
      this.pushOnlineHistory(`💥 #${o.id} ${o.app}: khách COD bom hàng, quán mất cả món lẫn tiền`, "bad");
      this.sound.playReviewChime();
      GameUIModal.showToast(`💥 Khách đơn COD #${o.id} bom hàng! ${o.shipper.name} mang túi mì về. Lần sau nhớ gọi xác nhận trước.`, "warning", "😭");
      this.saveGame();
      this.renderOnlineBoards();
      return;
    }
    const p = o.packed;
    const issues = [];
    if (o.age > o.promiseSecs) issues.push("late");
    if (o.age - o.cookDoneAge > (p.bag ? 90 : 55)) issues.push("cold");
    if (!p.seal && Math.random() < 0.6) issues.push("spill");
    else if (!p.tem && Math.random() < 0.35) issues.push("packing");
    else if (!p.bag && Math.random() < 0.3) issues.push("packing");
    const noCutlery = o.note && o.note.noCutlery;
    const needCutlery = o.note && o.note.needCutlery;
    if (!p.cutlery && !noCutlery && (needCutlery || Math.random() < 0.7)) issues.push("missing");
    o.issues = issues;
    o.isPacked = p.seal;
    o.fullPack = DELIVERY_PACK_ITEMS.every(it => p[it.key]);
    o.fast = o.age <= o.promiseSecs * 0.75;

    let fawnBonus = 0;
    if (this.state.staff.fawn) fawnBonus = Math.round(o.price * 0.15); // +15% chiết khấu sỉ logistics
    const earned = o.price + fawnBonus;
    const drink = o.drinkId ? this.state.drinks[o.drinkId] : null;

    // Đơn COD: tài xế thu tiền mặt của khách, cuối ca mới đối soát trả lại quán
    if (o.isCod) {
      this.state.codPending = (this.state.codPending || 0) + earned;
    } else {
      this.state.money += earned;
      this.state.todayEarnings += earned;
      this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + earned;
    }
    this.state.stats.bowlsServed += o.bowlsCount || 1;
    if (drink) this.state.stats.drinksServed++;
    this.state.stats.onlineDelivered = (this.state.stats.onlineDelivered || 0) + 1;
    this.state.stats.onlineCommissionPaid = (this.state.stats.onlineCommissionPaid || 0) + o.commission;
    if (issues.includes("late")) this.state.stats.onlineLate = (this.state.stats.onlineLate || 0) + 1;
    this.state.deliveredOnlineCount++;

    if (Math.random() < (issues.length ? 0.9 : 0.6)) this.generateOnlineReview(o);

    this.removeOnlineOrder(o);
    this.trackProgress("online", { earned });

    const card = document.querySelector(`[data-oid="${o.id}"]`);
    if (card) GameUIModal.spawnFloatingFx(card, `+${earned}k 🛵`, true);
    this.sound.playCoinChime();

    const bad = issues.map(k => ISSUE_TEXT[k]).filter(Boolean);
    const fawnTxt = fawnBonus > 0 ? ` + 🦌 Nai Fawn thưởng sỉ +${fawnBonus}k` : "";
    if (bad.length) {
      this.pushOnlineHistory(`⚠️ #${o.id} ${o.app}: +${earned}k nhưng bị chê (${bad.join(", ")})`, "warn");
      GameUIModal.showToast(`🛵 Đơn #${o.id} đã tới khách, +${earned}k${fawnTxt}. Nhưng có vấn đề: ${bad.join(", ")}.`, "warning", "📦");
    } else {
      this.pushOnlineHistory(`✅ #${o.id} ${o.app}: +${earned}k, giao đúng hẹn & đóng gói tốt`, "ok");
      GameUIModal.showToast(`✅ Đơn #${o.id} giao thành công! +${earned}k (đã trừ phí ${o.app})${fawnTxt}`, "success", "🛵");
    }

    this.saveGame();
    this.renderHeader();
    this.renderOnlineBoards();
  }

  // Đối soát COD: tài xế nộp lại tiền mặt đã thu hộ trong ca
  settleCodPending(silent = false) {
    const amount = this.state.codPending || 0;
    if (amount <= 0) return;
    this.state.codPending = 0;
    this.state.money += amount;
    this.state.todayEarnings += amount;
    this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + amount;
    this.pushOnlineHistory(`💵 Đối soát COD: tài xế nộp lại ${amount}k tiền mặt`, "ok");
    if (!silent) GameUIModal.showToast(`💵 Đối soát COD cuối ca: nhận ${amount}k tiền mặt từ các tài xế!`, "success", "🧾");
  }

  // Hết ca: đơn tài xế đã lấy đi vẫn giao xong; đơn chưa giao bị hủy, đơn mới chưa nhận tự biến mất
  settleOnlineOrdersAtClose() {
    [...this.state.onlineOrders].forEach(o => {
      if (o.stage === "delivering") this.completeOnlineDelivery(o);
      else if (o.stage === "active") this.cancelOnlineOrder(o, "closing");
      else this.removeOnlineOrder(o);
    });
    this.settleCodPending();
    this.renderOnlineBoards();
  }

  // ---------- Giao diện bảng đơn online (dùng chung cho tab Online và trong ca bán) ----------
  getOnlineSig() {
    return this.state.onlineOrders.map(o => [
      o.id, o.stage, o.codConfirmed ? 1 : 0, o.cooking ? 1 : 0, o.cookDone ? 1 : 0, o.ready ? 1 : 0, o.arrived ? 1 : 0, o.rain ? 1 : 0,
      o.packed ? DELIVERY_PACK_ITEMS.map(it => (o.packed[it.key] ? 1 : 0)).join("") : "", o.price
    ].join(":")).join("|");
  }

  // Mỗi giây: chỉ vẽ lại khi cấu trúc đổi, còn lại cập nhật số đếm để không mất cú click của người chơi
  refreshOnlineBoards() {
    if (this.getOnlineSig() !== this.onlineRenderSig) this.renderOnlineBoards();
    else this.patchOnlineTimers();
  }

  renderOnlineTab() {
    this.renderOnlineBoards();
  }

  renderOnlineBoards() {
    this.onlineRenderSig = this.getOnlineSig();
    const orders = this.state.onlineOrders;

    const board = document.getElementById("open-mode-shipper-card");
    if (board) {
      board.style.display = orders.length ? "flex" : "none";
      board.innerHTML = orders.map(o => this.buildOnlineCard(o, true)).join("");
    }

    const countEl = document.getElementById("online-total-delivered");
    if (countEl) countEl.textContent = `Đã giao: ${this.state.deliveredOnlineCount} đơn`;

    const listEl = document.getElementById("online-orders-list");
    if (listEl) {
      listEl.innerHTML = orders.length
        ? orders.map(o => this.buildOnlineCard(o, false)).join("")
        : `<div class="dlv-empty">${this.state.dayPhase === "open"
          ? "🛵 Đang chờ khách đặt mỳ cay qua GrabFood, ShopeeFood, BeFood, Baemin..."
          : "🌙 Quán đang đóng cửa. Mở cửa bán để bật ứng dụng & nhận đơn online."}</div>`;
    }

    const s = this.state.stats;
    const statsEl = document.getElementById("online-stats-row");
    if (statsEl) {
      const rate = Math.round(this.getOnlineAcceptRate() * 100);
      statsEl.innerHTML = `
        <span class="dlv-stat ${rate < 70 ? "is-bad" : ""}" title="Dưới 70% app sẽ đẩy ít đơn hơn cho quán">📈 Nhận đơn ${rate}%</span>
        <span class="dlv-stat">⏰ Trễ hẹn ${s.onlineLate || 0}</span>
        <span class="dlv-stat">❌ Hủy ${s.onlineCancelled || 0}</span>
        <span class="dlv-stat">💥 Bom hàng ${s.onlineBombed || 0}</span>
        <span class="dlv-stat" title="Tiền mặt tài xế thu hộ, nhận lại khi đóng ca">💵 COD chờ đối soát ${this.state.codPending || 0}k</span>
        <span class="dlv-stat">💸 Phí app đã trả ${s.onlineCommissionPaid || 0}k</span>`;
    }
    const histEl = document.getElementById("online-history-list");
    if (histEl) {
      histEl.innerHTML = this.onlineHistory.length
        ? this.onlineHistory.map(h => `<div class="dlv-log is-${h.tone}">${h.text}</div>`).join("")
        : `<div class="dlv-log">Chưa có đơn nào hôm nay.</div>`;
    }
    this.patchOnlineTimers();
  }

  buildOnlineCard(o, compact) {
    const cfg = DELIVERY_APPS[o.app] || DELIVERY_APPS.GrabFood;
    const steps = ["Đơn mới", "Chuẩn bị", "Tài xế tới", "Đang giao"];
    const cur = o.stage === "new" ? 0 : o.stage === "delivering" ? 3 : (o.arrived ? 2 : 1);
    const stepper = steps.map((s, i) => `<span class="dlv-step ${i < cur ? "is-past" : ""} ${i === cur ? "is-now" : ""}">${s}</span>`).join("");
    const note = o.note ? `<div class="dlv-note">📝 Khách dặn: ${o.note.text}</div>` : "";
    const pay = o.isCod
      ? `<span class="dlv-pay is-cod">💵 COD · thu hộ ${o.gross}k</span>`
      : `<span class="dlv-pay">💳 Đã thanh toán</span>`;
    const codBtn = o.isCod && o.stage !== "delivering"
      ? `<button class="dlv-chip ${o.codConfirmed ? "is-done" : ""}" ${o.codConfirmed ? "disabled" : ""} onclick="window.game.confirmCodOrder(${o.id})">${o.codConfirmed ? "✔ Đã xác nhận với khách" : "📞 Gọi xác nhận (tránh bom hàng)"}</button>`
      : "";
    const money = compact ? "" : `
      <div class="dlv-money">Khách trả ${o.gross}k · Phí ${o.app} −${Math.round(cfg.commission * 100)}% (−${o.commission}k) · Quán nhận <b>${o.price}k</b>${o.isCod ? " (tiền mặt, đối soát cuối ca)" : ""}</div>`;

    let body = "";
    if (o.stage === "new") {
      body = `
        <div class="dlv-bar"><i data-ofield="offerBar"></i></div>
        <div class="dlv-sub" data-ofield="offerTxt">Còn ${o.offerLeft}s để nhận đơn</div>
        <div class="dlv-actions">
          <button class="dlv-btn dlv-btn-go" onclick="window.game.acceptOnlineOrder(${o.id})">✅ Nhận đơn</button>
          <button class="dlv-btn dlv-btn-ghost" onclick="window.game.rejectOnlineOrder(${o.id})">Từ chối</button>
        </div>`;
    } else if (o.stage === "active") {
      const done = DELIVERY_PACK_ITEMS.filter(it => o.packed[it.key]).length;
      const cook = o.cookDone
        ? `<div class="dlv-cook is-done">🍲 Niêu mì đã chín, đóng gói đi!</div>`
        : `<div class="dlv-cook">${o.cooking ? "🔥 Bếp đang nấu" : "⏳ Chờ bếp trống"}<div class="dlv-bar"><i data-ofield="cookBar"></i></div></div>`;
      const chips = DELIVERY_PACK_ITEMS.map(it => {
        const isDone = o.packed[it.key];
        const locked = it.needCooked && !o.cookDone;
        return `<button class="dlv-chip ${isDone ? "is-done" : ""}" ${isDone || locked || o.ready ? "disabled" : ""} onclick="window.game.packOnlineItem(${o.id},'${it.key}')">${isDone ? "✔" : it.icon} ${it.label}</button>`;
      }).join("");
      let action;
      if (o.arrived && o.ready) {
        action = `<button class="dlv-btn dlv-btn-go" onclick="window.game.handoverOnlineOrder(${o.id})">🤝 Giao cho tài xế · mã ${o.code}</button>`;
      } else if (o.ready) {
        action = `<button class="dlv-btn" disabled>✅ Đã báo xong · chờ tài xế tới</button>`;
      } else {
        action = `<button class="dlv-btn dlv-btn-go" ${o.cookDone ? "" : "disabled"} onclick="window.game.markOnlineReady(${o.id})">✅ Báo món đã xong (${done}/${DELIVERY_PACK_ITEMS.length} đã đóng gói)</button>`;
      }
      const wait = o.arrived && !o.ready
        ? `<div class="dlv-wait">⏳ Tài xế đang chờ, ${o.waitLeft}s nữa sẽ hủy chuyến</div><div class="dlv-bar is-warn"><i data-ofield="waitBar"></i></div>`
        : "";
      body = `
        <div class="shipper-driver-profile dlv-driver">
          <img src="${o.shipper.avatar}" class="shipper-driver-avatar" alt="${o.shipper.name}" onerror="this.src='assets/cust_shiba.png'" />
          <div class="shipper-driver-meta">
            <div class="shipper-driver-name">${o.shipper.name}</div>
            <div class="shipper-driver-sub">${o.shipper.vehicle} · cách quán ${o.distanceKm}km</div>
          </div>
          <span class="dlv-eta" data-ofield="eta"></span>
        </div>
        ${cook}
        <div class="dlv-chips">${chips}</div>
        ${wait}
        <div class="dlv-actions">${action}</div>`;
    } else {
      body = `
        <div class="dlv-route"><span>🏮</span>
          <div class="dlv-bar dlv-road"><i data-ofield="delBar"></i><em data-ofield="delBike">🛵</em></div>
        <span>🏠</span></div>
        <div class="dlv-sub">${o.shipper.name} đang giao tới khách · còn <b data-ofield="delTxt"></b>${o.rain ? " · 🌧️ trời mưa, đi chậm hơn" : ""}</div>`;
    }

    const age = o.stage === "new" ? "" : `<div class="dlv-age" data-ofield="age"></div>`;
    return `
      <div class="dlv-card ${compact ? "is-compact" : ""} is-${o.stage}" data-oid="${o.id}">
        <div class="dlv-top">
          <span class="shipper-app-badge ${cfg.cls}">${o.app}</span>
          <b class="dlv-id">#${o.id}</b>
          <span class="dlv-net">+${o.price}k</span>
        </div>
        <div class="dlv-steps">${stepper}</div>
        <div class="dlv-items">${o.itemsText}</div>
        <div class="dlv-payrow">${pay}${codBtn}</div>
        ${note}${money}${age}${body}
      </div>`;
  }

  patchOnlineTimers() {
    const byId = new Map(this.state.onlineOrders.map(o => [String(o.id), o]));
    document.querySelectorAll("[data-oid]").forEach(card => {
      const o = byId.get(card.dataset.oid);
      if (!o) return;
      card.querySelectorAll("[data-ofield]").forEach(el => {
        switch (el.dataset.ofield) {
          case "offerBar": el.style.width = `${Math.max(0, (o.offerLeft / DELIVERY_OFFER_SECONDS) * 100)}%`; break;
          case "offerTxt": el.textContent = `Còn ${Math.max(0, o.offerLeft)}s để nhận đơn`; break;
          case "cookBar": el.style.width = `${Math.min(100, (1 - o.cookLeft / o.cookTotal) * 100)}%`; break;
          case "eta": el.textContent = o.arrived ? "📍 Đã tới quán" : `🛵 ${Math.max(0, o.etaLeft)}s nữa tới`; break;
          case "waitBar": el.style.width = `${Math.max(0, (o.waitLeft / DELIVERY_DRIVER_PATIENCE) * 100)}%`; break;
          case "delBar": el.style.width = `${Math.min(100, (1 - o.deliverLeft / o.deliverTotal) * 100)}%`; break;
          case "delBike": el.style.left = `${Math.min(96, (1 - o.deliverLeft / o.deliverTotal) * 100)}%`; break;
          case "delTxt": el.textContent = `${Math.max(0, o.deliverLeft)}s`; break;
          case "age":
            el.textContent = `⏱️ ${o.age}s / hẹn khách ${o.promiseSecs}s`;
            el.classList.toggle("is-late", o.age > o.promiseSecs);
            break;
        }
      });
    });
  }

  // Tự động sinh đánh giá thực khách online sau khi Shipper giao hàng thành công
  generateOnlineReview(order) {
    if (!order) return;
    const isPacked = !!order.isPacked;
    const shipperName = order.shipper ? order.shipper.name : "Bác Tài Shipper";
    const app = order.app || "GrabFood";

    const customerNames = [
      "Quỳnh Anh Foodie", "Hoàng Long Review", "Thảo Vy Mê Trà Sữa", "Minh Trí Coder",
      "Bảo Ngọc Sống Ảo", "Tuấn Kiệt Ăn Cay", "Khánh Linh Sinh Viên", "Đức Huy Văn Phòng"
    ];
    const custName = customerNames[Math.floor(Math.random() * customerNames.length)];
    const rating = rateOnline({
      customerName: custName, isPacked, shipperName, app, owl: Boolean(this.state.staff.owl),
      issues: order.issues, fullPack: order.fullPack, fast: order.fast
    });
    const stars = rating.stars;
    const comment = rating.comment;

    const badges = ["Gourmet VIP", "Mê Ăn Cay Cấp 7", "Nghiện Trà Sữa", "Thánh Ăn Đêm", "Top Food Reviewer"];
    const badge = badges[Math.floor(Math.random() * badges.length)];

    const newReview = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      customerName: custName,
      customerAvatar: order.shipper ? order.shipper.avatar : "assets/cust_cat.png",
      stars: stars,
      comment: comment,
      date: `Ngày ${this.state.day}`,
      isOnline: true,
      app: app,
      shipperName: shipperName,
      isPacked: isPacked,
      issues: rating.issues,
      persona: rating.persona,
      foodieBadge: badge,
      foodAttached: order.itemsText || "Mì Cay & Trà Sữa",
      replied: false,
      ownerReply: null,
      customerFeedback: null
    };

    this.addReview(newReview);
  }

  // Sinh ngẫu nhiên phương tiện và biển số xe Việt Nam chân thực cho Shipper mỗi chuyến giao
  generateRandomShipperVehicle() {
    const vehicles = [
      "Honda Wave Alpha", "Honda Wave RSX", "Yamaha Sirius", "Honda Future 125",
      "Honda Vision 110", "Honda Air Blade 125", "Honda Air Blade 160", "Yamaha Grande Hybrid",
      "Honda Lead 125", "Honda Vario 160", "Honda SH Mode", "Yamaha NVX 155",
      "VinFast Evo 200 (Xe điện)", "VinFast Feliz S (Xe điện)", "VinFast Klara S (Xe điện)"
    ];

    const provinces = ["29", "30", "50", "51", "59", "43", "60", "61", "65", "72", "14", "15", "79", "36", "37", "47", "68", "77", "81"];
    const seriesLetters = ["B", "C", "D", "E", "F", "G", "K", "L", "M", "N", "P", "S", "T", "U", "V", "X", "Y"];
    const seriesNums = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

    const chosenVehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
    const chosenProv = provinces[Math.floor(Math.random() * provinces.length)];
    const chosenLetter = seriesLetters[Math.floor(Math.random() * seriesLetters.length)];
    const chosenSeriNum = seriesNums[Math.floor(Math.random() * seriesNums.length)];

    // Tạo 5 chữ số biển xe: 3 số đầu . 2 số sau (vd: 59-X1 682.55)
    const part1 = String(Math.floor(Math.random() * 900) + 100);
    const part2 = String(Math.floor(Math.random() * 90) + 10);
    const plate = `${chosenProv}-${chosenLetter}${chosenSeriNum} ${part1}.${part2}`;

    return `${chosenVehicle} • ${plate}`;
  }

  pauseShift() {
    this.isPaused = true;
    GameUIModal.confirm({
      title: "Tiệm Mỳ Đang Tạm Dừng ⏸️",
      message: "Quán đang tạm ngưng đón khách. Bạn muốn làm gì tiếp theo?",
      icon: "🍜",
      confirmText: "▶️ Tiếp Tục Bán",
      cancelText: "🌅 Kết Thúc Ca Bán",
      onConfirm: () => {
        this.isPaused = false;
      },
      onCancel: () => {
        this.isPaused = false;
        this.endDay();
      }
    });
  }

  resumeShift() {
    this.isPaused = false;
    GameUIModal.closeDialogs();
    GameUIModal.showToast("Tiệm đã tiếp tục ca bán! ▶️", "info", "🍜");
  }

  endDay() {
    if (this.scene) this.scene.announce("close");
    if (this.dayTimerInterval) clearInterval(this.dayTimerInterval);
    if (this.customerInterval) clearInterval(this.customerInterval);
    if (this.onlineOrderInterval) clearInterval(this.onlineOrderInterval);
    if (this.staffAutomationInterval) clearInterval(this.staffAutomationInterval);
    if (this.daikinDropInterval) clearInterval(this.daikinDropInterval);

    if (this.state) {
      this.state.acTurboActive = false;
      this.state.acTurboSeconds = 0;
      this.state.acTemp = this.getBaseDaikinTemp();
    }
    this.updateDaikinLedDisplays();

    this.settleOnlineOrdersAtClose();

    this.state.dayPhase = "prep";
    this.state.hasBrewedToday = false;
    this.state.todaySupplySpent = 0;
    this.orderSlots = [null, null, null];
    this.clearCurrentPot(true);

    // Chuyển view lại prep view
    const prepView = document.getElementById("view-prep-mode");
    const openView = document.getElementById("view-open-mode");
    if (prepView) prepView.style.display = "block";
    if (openView) openView.style.display = "none";

    // Chốt sổ cuối ngày: hàng hỏng, thuế, lãi tiết kiệm, tiền thuê, điện nước, lương, trả góp...
    const bills = this.settleDayFinance();
    const activeStaffNames = bills.staffNames;

    // Nhiệm vụ đã xong mà chưa bấm nhận thì tự cộng thưởng trước khi sang ngày mới
    this.state.todayQuestReward = this.autoClaimPendingQuests();

    this.showDaySummaryModal(activeStaffNames);
    this.state.day += 1;
    this.pendingAudit = GameIntegrity.rollAudit();
    this.ensureDailyQuests();
    this.rollDailySpecialCombo(true); // Chuẩn bị Món Đặc Biệt mới cho ngày tiếp theo ở bảng chuẩn bị
    this.saveGame();
    this.renderAll();
    if (this.pendingAudit) {
      this.pendingAudit = false;
      setTimeout(() => this.startInspection(), 1500);
    }
  }

  // Đoàn kiểm tra liên ngành: cảnh sát pixel đi tới tiệm trên bản đồ phố, rồi tịch thu & xoá dữ liệu
  startInspection() {
    if (document.getElementById("inspection-overlay") || !window.worldMap) return;
    const shop = this.state.shopName || "Tiệm Mỳ Cay";
    const owner = this.state.ownerFullName ? `ông/bà ${this.state.ownerFullName}, chủ ${shop}` : `chủ ${shop}`;
    window.worldMap.playInspection(
      [
        `Chào ${owner}. Chúng tôi là đoàn kiểm tra liên ngành.`,
        "Chúng tôi nhận được đơn tố cáo tiệm có dấu hiệu gian lận số liệu, can thiệp dữ liệu trò chơi."
      ],
      {
        title: `${shop.toUpperCase()} BỊ NIÊM PHONG`,
        text: "Toàn bộ tài sản bị tịch thu, tiệm bị niêm phong.<br>Mọi dữ liệu bị xoá, quay về Ngày 1.<br><br>Đoàn kiểm tra ghét những người gian dối.<br>Chơi thật mới vui nhé!"
      },
      () => this.confiscateAndReset()
    );
  }

  confiscateAndReset() {
    window.__mycayRestoring = true; // chặn lưu đè trước khi tải lại
    ["mycay_save_data", "mycay_seen_version", "mycay_coachmark_seen", "mycay_first_name_set"].forEach(k => localStorage.removeItem(k));
    GameIntegrity.clearFlags();
    location.reload();
  }

  showDaySummaryModal(activeStaffNames = []) {
    const modal = document.getElementById("modal-day-summary");
    const titleEl = document.getElementById("day-summary-title");
    const bodyEl = document.getElementById("day-summary-body");

    const rentCost = this.state.todayRentCost || 0;
    const staffWages = this.state.todayStaffWages || 0;
    const totalExpenses = (this.state.todayExpenses || (rentCost + staffWages));
    const grossRevenue = this.state.todayEarnings || 0;
    const netProfit = grossRevenue - totalExpenses;

    if (titleEl) titleEl.textContent = `🧾 Hóa Đơn Kết Toán Ngày ${this.state.day}`;
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div class="day-receipt-box">
          <div class="receipt-header">
            <div class="receipt-shop-badge">🍜 TIỆM MỲ CAY 7 CẤP ĐỘ</div>
            <div class="receipt-date">Ca Bán Ngày ${this.state.day} · ${this.state.todayBowlsSold} Tô Mì Phục Vụ</div>
          </div>

          <div class="receipt-chips">
            <span>🧋 ${this.state.todayDrinksSold || 0} ly</span>
            <span>⛓️ Chuỗi max x${this.bestServeStreak || 0}</span>
            <span>🎯 ${(this.state.quests?.list || []).filter(q => q.progress >= q.target).length}/${(this.state.quests?.list || []).length} nhiệm vụ</span>
          </div>

          <div class="receipt-divider-dash"></div>

          <div class="receipt-section-title">DOANH THU THU VÀO</div>
          <div class="receipt-row">
            <span>🍜 Bán mỳ & đồ uống:</span>
            <strong class="receipt-val-green">+${txaformat.formatVND(Math.max(0, grossRevenue - this.state.todayTips))}</strong>
          </div>
          <div class="receipt-row">
            <span>💖 Tiền tip thực khách:</span>
            <strong class="receipt-val-green">+${txaformat.formatVND(Math.max(0, this.state.todayTips - (this.state.todaySpecialBonus || 0)))}</strong>
          </div>
          ${this.state.todaySpecialBonus > 0 ? `
            <div class="receipt-row">
              <span>🌟 Thưởng Món Đặc Biệt (${this.state.todaySpecialBowlsSold || 0} tô):</span>
              <strong class="receipt-val-gold">+${txaformat.formatVND(this.state.todaySpecialBonus)}</strong>
            </div>
          ` : ''}
          ${this.state.todayQuestReward > 0 ? `
            <div class="receipt-row">
              <span>🎯 Thưởng nhiệm vụ (tự nhận):</span>
              <strong class="receipt-val-gold">+${txaformat.formatVND(this.state.todayQuestReward)}</strong>
            </div>
          ` : ''}
          ${this.state.todayBankInterest > 0 ? `
            <div class="receipt-row">
              <span>🏦 Lãi Ngân Hàng Tiết Kiệm:</span>
              <strong class="receipt-val-gold">+${txaformat.formatVND(this.state.todayBankInterest)}</strong>
            </div>
          ` : ''}

          <div class="receipt-divider-dash"></div>

          ${this.buildExpenseReceiptHtml()}

          <div class="receipt-divider-double"></div>

          <div class="receipt-summary-row">
            <span class="receipt-net-label">LỢI NHUẬN RÒNG:</span>
            <span class="receipt-net-val ${netProfit >= 0 ? 'profit-pos' : 'profit-neg'}">
              ${netProfit >= 0 ? '+' : ''}${txaformat.formatVND(netProfit)}
            </span>
          </div>

          <div class="receipt-stamp-badge">💮 ĐÃ THANH TOÁN</div>
        </div>
      `;
    }

    if (modal) modal.style.display = "flex";
    this.sound.playReviewChime();
  }

  // 14. Quản lý Hồ sơ Chủ Tiệm Mì Cay
  showOwnerProfileModal() {
    const modal = document.getElementById("modal-owner-profile");
    if (!modal) return;

    const avatarEl = document.getElementById("owner-dialog-avatar");
    const nameEl = document.getElementById("owner-dialog-name");
    const rankEl = document.getElementById("owner-dialog-rank");
    const bowlsEl = document.getElementById("owner-stat-bowls");
    const spicy7El = document.getElementById("owner-stat-spicy7");
    const shippersEl = document.getElementById("owner-stat-shippers");

    const currentAvatar = this.state.ownerAvatar || "assets/cust_cat.png";
    const currentName = this.state.ownerName || "Bếp Trưởng Mèo Linh";

    if (avatarEl) avatarEl.src = currentAvatar;
    if (nameEl) nameEl.textContent = currentName;

    // Tính rank danh hiệu
    const totalServed = this.state.stats.bowlsServed || 0;
    let rankText = "⭐ Bếp Tập Sự";
    if (totalServed >= 50) rankText = "👑 Huyền Thoại Mì Cay 7 Cấp Độ";
    else if (totalServed >= 25) rankText = "⭐⭐⭐⭐ Siêu Bếp Trưởng Lửa";
    else if (totalServed >= 10) rankText = "⭐⭐⭐ Bếp Chính Tiệm Mì";
    else if (totalServed >= 3) rankText = "⭐⭐ Bếp Trưởng Triển Vọng";

    if (rankEl) rankEl.textContent = rankText;
    if (bowlsEl) bowlsEl.textContent = totalServed;
    if (spicy7El) spicy7El.textContent = this.state.stats.spicyMasterServed || 0;
    if (shippersEl) shippersEl.textContent = this.state.deliveredOnlineCount || 0;

    // Đánh dấu avatar đang chọn
    document.querySelectorAll(".owner-avatar-opt").forEach(opt => {
      const isSel = opt.getAttribute("data-avatar") === currentAvatar;
      opt.classList.toggle("active", isSel);
    });

    modal.style.display = "flex";
    this.sound.playButtonClick();
  }

  selectOwnerAvatar(avatarPath, defaultName) {
    this.state.ownerAvatar = avatarPath;
    this.state.ownerName = defaultName;

    const avatarEl = document.getElementById("owner-dialog-avatar");
    const nameEl = document.getElementById("owner-dialog-name");
    if (avatarEl) avatarEl.src = avatarPath;
    if (nameEl) nameEl.textContent = defaultName;

    document.querySelectorAll(".owner-avatar-opt").forEach(opt => {
      opt.classList.toggle("active", opt.getAttribute("data-avatar") === avatarPath);
    });
    this.sound.playButtonClick();
  }

  saveOwnerProfile() {
    const modal = document.getElementById("modal-owner-profile");
    if (modal) modal.style.display = "none";

    this.sound.playReviewChime();
    GameUIModal.showToast(`✨ Đã lưu hình tượng: ${this.state.ownerName}!`, "success", "👑");

    this.saveGame();
    this.renderHeader();
    if (this.state.dayPhase === "open") {
      this.renderStaffKitchenBar();
    }
  }

  switchTab(tabId) {
    if (this.state.dayPhase === "open") {
      GameUIModal.showToast("Quán đang trong ca bán mở cửa! Hãy tập trung phục vụ khách nhé!", "info", "⏱️");
      return;
    }

    document.querySelectorAll(".nav-grid-btn").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-tab") === tabId);
    });

    const activeNavBtn = document.querySelector(`.nav-grid-btn[data-tab="${tabId}"]`);
    const tabArea = document.querySelector(".tab-content-area");
    if (tabArea && activeNavBtn) {
      // Chỉ lấy icon + nhãn, bỏ qua chấm đỏ đếm thưởng
      const icon = activeNavBtn.querySelector(".tab-btn-icon")?.textContent || "";
      const label = activeNavBtn.querySelector(".tab-btn-label")?.textContent || "";
      tabArea.setAttribute("data-title", `${icon} ${label}`.replace(/\s+/g, " ").trim());
    }

    document.querySelectorAll(".tab-pane").forEach(p => {
      p.classList.toggle("active", p.id === tabId);
    });

    if (tabId === "tab-kho") this.renderKhoTab();
    if (tabId === "tab-menu") this.renderMenuTab();
    if (tabId === "tab-price") this.renderPriceTab();
    if (tabId === "tab-upgrades") this.renderUpgradesTab();
    if (tabId === "tab-staff") this.renderStaffTab();
    if (tabId === "tab-online") this.renderOnlineTab();
    if (tabId === "tab-bank") this.renderBankTab();
    if (tabId === "tab-collection") this.renderCollectionTab();
    if (tabId === "tab-summary") this.renderSummaryTab();
    if (tabId === "tab-reviews") this.renderReviewsTab();
    if (tabId === "tab-quests") this.renderQuestsTab();

    this.sound.playButtonClick();
  }

  // ==========================================================
  // 15. MENU TRỢ LỰC BÍ MẬT (SECRET DEVELOPER BUFF CONSOLE)
  // ==========================================================
  openSecretBuffModal() {
    const modal = document.getElementById("modal-dev-buff");
    if (modal) {
      modal.style.display = "flex";
      this.sound.playCoinChime();
      GameUIModal.showToast("👑 Đã mở Bảng Trợ Lực Hệ Thống dành riêng cho Chủ Quán!", "success", "✨");
    }
  }

  devBuff(type) {
    switch (type) {
      case "money_50m":
        this.state.money += 50000;
        this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + 50000;
        GameUIModal.showToast("💰 Đã buff +50.000k (50 Triệu VNĐ) vào két sắt!", "success", "✨");
        break;

      case "money_500m":
        this.state.money += 500000;
        this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + 500000;
        GameUIModal.showToast("💎 Đã buff +500.000k (500 Triệu VNĐ) tài chính vô hạn!", "success", "✨");
        break;

      case "reputation_max":
        this.state.reputation = 100;
        GameUIModal.showToast("⭐ Đã nâng Danh Tiếng quán lên tối đa 100⭐!", "success", "👑");
        break;

      case "fever_rush":
        this.feverPoints = 100;
        this.triggerFeverRush();
        GameUIModal.showToast("🔥 Đã kích hoạt Giờ Vàng FEVER RUSH bão khách ngay lập tức!", "success", "🔥");
        break;

      case "stock_full":
        for (const k in this.state.noodles) this.state.noodles[k].stock = Math.max(99, (this.state.noodles[k].stock || 0) + 99);
        for (const k in this.state.toppings) this.state.toppings[k].stock = Math.max(99, (this.state.toppings[k].stock || 0) + 99);
        for (const k in this.state.drinks) this.state.drinks[k].stock = Math.max(99, (this.state.drinks[k].stock || 0) + 99);
        for (const k in this.state.supplies) this.state.supplies[k].stock = Math.max(99, (this.state.supplies[k].stock || 0) + 99);
        GameUIModal.showToast("📦 Kho hàng đã được bơm đầy +99 toàn bộ mì, topping & trà sữa!", "success", "📦");
        break;

      case "hire_all_staff":
        for (const k in this.state.staff) this.state.staff[k] = true;
        GameUIModal.showToast("👥 Đã chiêu mộ toàn bộ 11 nhân viên toàn năng về tiệm mì!", "success", "🐾");
        break;

      case "max_all_upgrades":
        this.state.upgrades.tableCount = 8;
        this.state.upgrades.stoveSpeed = 6;
        this.state.upgrades.chiliSecret = 5;
        this.state.upgrades.acCooling = 5;
        this.state.upgrades.decorScore = 6;
        this.state.upgrades.freezerStorage = 5;
        this.state.upgrades.lofiAcoustic = 4;
        this.state.upgrades.autoSealer = 5;
        this.state.upgrades.dualStove = 5;
        this.state.upgrades.airPurifier = 5;
        this.state.upgrades.zenGarden = 5;
        this.state.upgrades.shichimiSpice = 5;
        this.initTables();
        while (this.state.tables.length < 8) {
          this.state.tables.push({
            id: this.state.tables.length + 1,
            status: "empty",
            customer: null,
            order: null,
            patience: 100,
            maxPatience: 100
          });
        }
        GameUIModal.showToast("🛠️ Đã nâng cấp Max Cực Đại toàn bộ 12 trang thiết bị quán!", "success", "🌟");
        break;

      case "unlock_customers":
        this.customerTemplates.forEach(c => {
          this.unlockCustomer(c, false);
        });
        GameUIModal.showToast("👑 Đã mở khóa đủ toàn bộ 16 khách quen & VIP trong Bộ sưu tập!", "success", "🎉");
        break;

      case "clean_tables":
        this.state.tables.forEach(t => {
          t.status = "empty";
          t.customer = null;
          t.order = null;
        });
        GameUIModal.showToast("✨ Đã lau dọn sạch bóng toàn bộ bàn ghế trong tiệm!", "success", "🧹");
        break;

      case "skip_day_10":
        this.state.day = 10;
        GameUIModal.showToast("⏭️ Đã tua nhanh thời gian tới Ngày 10!", "info", "📅");
        break;

      case "skip_day_30":
        this.state.day = 30;
        GameUIModal.showToast("🚀 Đã tua nhanh thời gian tới Ngày 30!", "info", "📅");
        break;

      case "skip_day_50":
        this.state.day = 50;
        GameUIModal.showToast("🐉 Đã tua nhanh thời gian tới Ngày 50!", "info", "📅");
        break;

      case "bank_100m":
        if (!this.state.bank) {
          this.state.bank = { savings: 0, totalInterestEarned: 0, activePlan: "flexi", termDepositAmount: 0, termDaysRemaining: 0, history: [] };
        }
        this.state.bank.savings = (this.state.bank.savings || 0) + 100000;
        this.addBankHistory("deposit", 100000, "👑 Buff Trợ Lực Chủ Quán (+100 Triệu VNĐ)");
        this.renderBankTab();
        GameUIModal.showToast("🏦 Đã buff +100.000k (100 Triệu VNĐ) vào Ngân Hàng Tiết Kiệm!", "success", "✨");
        break;
    }

    this.sound.playCoinChime();
    this.saveGame();
    this.renderAll();
    if (this.state.dayPhase === "open") {
      this.renderOpenMode();
      this.renderDiningStage();
      this.renderStaffKitchenBar();
    }
  }
}

// Kinh tế thật (v2.3.0): chợ nguyên liệu, nhân sự, tài chính được tách ra module riêng
Object.assign(SpicyNoodleGame.prototype, MarketMethods, HrMethods, FinanceMethods, OfflineMethods);
