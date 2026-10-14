// ==========================================================
// TIỆM MỲ CAY - SPICY NOODLE RESTAURANT SIMULATION ENGINE
// Giao diện tinh tế chuẩn Cozy Anime · Thống kê doanh thu chính xác 100%
// Có đầy đủ chế độ Nấu Mì Tương Tác chuẩn 100% screenshot thực tế
// ==========================================================

import { txaversion } from "./txaversion.js?v=1.4.0";
import { txaformat } from "./txaformat.js?v=1.4.0";
import { NameValidator } from "./filter.js?v=1.4.0";
import { SoundManager } from "./audio.js?v=1.4.0";
import { GameUIModal } from "./modal.js?v=1.4.0";

export class SpicyNoodleGame {
  constructor() {
    this.sound = new SoundManager();
    this.gameSpeed = 1;
    this.particlesEnabled = true;

    // Trạng thái cửa hàng mỳ cay
    this.state = {
      shopName: "Tiệm Mỳ Cay",
      ownerAvatar: "assets/cust_cat.png",
      ownerName: "Bếp Trưởng Mèo Linh",
      day: 1,
      dayPhase: "prep", // "prep" (Chuẩn bị) | "open" (Đang mở cửa bán)
      money: 400, // Đơn vị k = 1.000đ (400k = 400.000đ)
      reputation: 30, // Điểm uy tín ⭐
      todayEarnings: 0,
      todayBowlsSold: 0,
      todayDrinksSold: 0,
      todaySpicy7Sold: 0,
      todayTips: 0,
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
        phomai: { id: "phomai", name: "Phô Mai Kéo Sợi", shortName: "Phô mai", icon: "🧀", price: 20, basePrice: 20, unitCost: 6.0, unlockCost: 250, unlocked: false, inMenu: false, stock: 0 }
      },

      // Quầy đồ uống giải cay
      drinks: {
        trasua: { id: "trasua", name: "Trà Sữa Trân Châu", icon: "🧋", price: 25, basePrice: 25, unitCost: 5.0, unlockCost: 0, unlocked: true, inMenu: true, stock: 15 },
        tradao: { id: "tradao", name: "Trà Đào Cam Sả", icon: "🍑", price: 22, basePrice: 22, unitCost: 4.5, unlockCost: 150, unlocked: false, inMenu: false, stock: 0 },
        suatuoi: { id: "suatuoi", name: "Sữa Tươi Lắc Phô Mai", icon: "🥛", price: 28, basePrice: 28, unitCost: 6.0, unlockCost: 220, unlocked: false, inMenu: false, stock: 0 },
        nuocsam: { id: "nuocsam", name: "Nước Sâm Bí Đao", icon: "🌿", price: 15, basePrice: 15, unitCost: 3.0, unlockCost: 100, unlocked: false, inMenu: false, stock: 0 }
      },

      // Nguyên liệu phụ trong kho
      supplies: {
        mi_soi: { id: "mi_soi", name: "Mì Sợi Hàn Quốc", icon: "🍜", unitCost: 4.5, stock: 20 },
        nuoc_ham: { id: "nuoc_ham", name: "Nước Hầm Xương", icon: "🍲", unitCost: 5.0, stock: 18 },
        sot_ot: { id: "sot_ot", name: "Sốt Ớt Hiểm 7 Cấp", icon: "🌶️", unitCost: 3.0, stock: 25 },
        nieu_dat: { id: "nieu_dat", name: "Niêu Đất Nung", icon: "🏺", unitCost: 2.0, stock: 30 }
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

      // Nâng cấp trang thiết bị
      upgrades: {
        potCount: 1, // Số bếp niêu đất nấu cùng lúc
        stoveSpeed: 1, // Tốc độ bếp
        tableCount: 3, // Bàn gỗ sồi
        decorScore: 1, // Điểm decor đèn lồng
        chiliSecret: 1, // Sốt ớt bí truyền tăng giá bán
        acCooling: 1 // Điều hòa Daikin tăng kiên nhẫn
      },

      // Nhân viên
      staff: {
        mochi: false, // Mèo tiếp tân đón khách & tăng tip (+25%)
        kenji: false, // Gấu Panda đầu bếp ninh mì tự động
        usagi: false, // Thỏ Usagi bưng bê tự động
        shiba: false, // Cún Shiba tạp vụ dọn bàn tự động
        shiro: false  // Cáo Shiro thu ngân tự động
      },

      // Đơn hàng Online
      onlineOrders: [],
      deliveredOnlineCount: 0,

      // Đánh giá thực khách
      reviews: [],

      // Thống kê chính xác toàn diện
      stats: {
        bowlsServed: 0,
        drinksServed: 0,
        spicyMasterServed: 0, // Cấp 6-7 bốc hỏa
        tipsEarned: 0,
        totalRevenue: 400
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

    // Thời gian ngày (4 phút = 240s)
    this.dayDuration = 240;
    this.dayRemaining = 240;
    this.isPaused = false;
    this.dayTimerInterval = null;
    this.customerInterval = null;
    this.onlineOrderInterval = null;
    this.staffAutomationInterval = null;
    this.activeLiveShipperOrder = null;
    this.mobileOpenTab = "cockpit"; // "cockpit" (Bếp nấu 0-cuộn) | "dining" (Sảnh ăn 3 bàn)
    this.cookingDockTab = "quick"; // "quick" | "noodle" | "topping" | "spicy" | "drink"
  }

  init() {
    this.loadGame();
    this.initTables();
    this.renderAll();
    this.initPedestrianSimulation();
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
    localStorage.setItem("mycay_save_data", JSON.stringify(this.state));
  }

  loadGame() {
    const saved = localStorage.getItem("mycay_save_data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
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
        if (typeof parsed.money === "number") this.state.money = parsed.money;
        if (typeof parsed.reputation === "number") this.state.reputation = parsed.reputation;
        if (typeof parsed.day === "number") this.state.day = parsed.day;
        if (Array.isArray(parsed.reviews)) this.state.reviews = parsed.reviews;
        if (parsed.shopName) this.state.shopName = parsed.shopName;
        if (parsed.ownerAvatar) this.state.ownerAvatar = parsed.ownerAvatar;
        if (parsed.ownerName) this.state.ownerName = parsed.ownerName;
        if (parsed.tutorialDismissed) this.state.tutorialDismissed = parsed.tutorialDismissed;
      } catch (e) {
        console.error("Lỗi nạp game:", e);
      }
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

    this.renderBottomActionBar();
    this.renderDiningStage();
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
      ownerAvatarEl.src = this.state.ownerAvatar || "assets/cust_cat.png";
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

    if (timerEl) {
      if (isPrep) {
        timerEl.textContent = "4 phút";
      } else {
        const m = Math.floor(this.dayRemaining / 60);
        const s = this.dayRemaining % 60;
        timerEl.textContent = `${m}:${s < 10 ? "0" : ""}${s}`;
      }
    }

    // Tiền hiển thị chính xác định dạng VNĐ chuẩn ảnh: 400.000đ, 253.500đ
    if (moneyEl) {
      moneyEl.textContent = txaformat.formatVND(this.state.money);
    }

    // Tính điểm đánh giá sao chuẩn xác từ reviews
    let avgStars = 5;
    if (this.state.reviews.length > 0) {
      const totalStars = this.state.reviews.reduce((sum, r) => sum + (r.stars || 5), 0);
      avgStars = Math.round(totalStars / this.state.reviews.length);
    }
    const starString = "★".repeat(Math.min(5, Math.max(1, avgStars))) + "☆".repeat(Math.max(0, 5 - avgStars));

    if (starsEl) starsEl.textContent = starString;
    if (reviewsEl) reviewsEl.textContent = `${this.state.reviews.length} đánh giá`;

    // Cập nhật số lượng khách đang ngồi ăn trực tiếp tại các bàn
    const eatingCount = (this.state.tables || []).filter(t => t.status === "eating").length;
    const diningLiveText = document.getElementById("prep-dining-status-text") || document.getElementById("dining-live-status-text");
    if (diningLiveText) {
      diningLiveText.textContent = eatingCount > 0 ? `Đang có ${eatingCount} khách ngồi ăn xì xèo 🍜` : "Bàn ghế sạch bóng sẵn sàng đón khách ✨";
    }
    const openDiningCount = document.getElementById("open-dining-count");
    if (openDiningCount) {
      openDiningCount.textContent = eatingCount > 0 ? `(${eatingCount} đang ăn)` : "";
    }
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

  // 3. Thẻ món đặc biệt hôm nay
  renderSpecialCard() {
    const comboEl = document.getElementById("display-special-combo");
    const streakEl = document.getElementById("display-special-streak");

    if (comboEl) {
      const noodle = this.state.noodles[this.state.specialCombo.noodleId] || this.state.noodles.my_haisan;
      const top = this.state.toppings[this.state.specialCombo.toppingId] || this.state.toppings.phomai;
      comboEl.textContent = `${noodle.name} · Cấp ${this.state.specialCombo.spicyLevel} · Thêm ${top.name}`;
    }

    if (streakEl) {
      streakEl.textContent = `Điểm danh ${this.state.specialCombo.streak} ngày`;
    }
  }

  // 4. Tab 1: Kho (Nguyên liệu dạng Card Grid & Stepper Tối Ưu)
  renderKhoTab() {
    const noodleList = document.getElementById("kho-noodle-list");
    const topList = document.getElementById("kho-topping-list");
    const tutorialBox = document.getElementById("tutorial-tooltip-kho");

    if (tutorialBox) {
      tutorialBox.style.display = this.state.tutorialDismissed ? "none" : "flex";
    }

    // Cập nhật thanh Tạm tính chi phí & Ngân quỹ ví
    const spentEl = document.getElementById("kho-subtotal-spent");
    const walletEl = document.getElementById("kho-subtotal-wallet");
    if (spentEl) {
      spentEl.textContent = txaformat.formatVND(this.state.todaySupplySpent || 0);
    }
    if (walletEl) {
      walletEl.textContent = txaformat.formatVND(this.state.money);
    }

    // Hàm render từng thẻ bài nguyên liệu trực quan (Card Grid)
    const renderCard = (item) => {
      const isOutOfStock = (item.stock || 0) <= 0;
      const isTutorialTarget = !this.state.tutorialDismissed && item.id === "mi_soi";
      const formattedPrice = txaformat.formatVND(item.unitCost);
      const isMinusDisabled = isOutOfStock;

      return `
        <div class="kho-card ${isOutOfStock ? 'card-out-of-stock' : ''}" data-item-id="${item.id}">
          <div class="kho-card-badge-wrap">
            ${isOutOfStock 
              ? `<span class="kho-badge out-of-stock">⚠️ HẾT HÀNG</span>` 
              : `<span class="kho-badge in-stock">Còn ${item.stock} phần</span>`
            }
          </div>

          <div class="kho-card-icon-box">
            <span class="kho-card-icon">${item.icon}</span>
          </div>

          <div class="kho-card-info">
            <h4 class="kho-card-name" title="${item.name}">${item.name}</h4>
            <div class="kho-card-price">${formattedPrice} <span class="unit-text">/phần</span></div>
          </div>

          <!-- Cụm Stepper gọn gàng: nút -, số lượng, nút + -->
          <div class="kho-stepper-control">
            <button class="btn-stepper-action btn-minus ${isMinusDisabled ? 'disabled' : ''}" 
                    ${isMinusDisabled ? 'disabled' : ''} 
                    onclick="window.game.adjustStock('${item.id}', -1)"
                    title="Bớt 1 phần">
              −
            </button>
            <div class="kho-stepper-stock-val">${item.stock}</div>
            <button class="btn-stepper-action btn-plus ${isTutorialTarget ? 'highlight-glow' : ''}" 
                    onclick="window.game.adjustStock('${item.id}', 1)"
                    title="Mua thêm 1 phần">
              +
            </button>
          </div>

          <!-- Nút chọn mua nhanh số lượng lớn -->
          <div class="kho-quick-chips">
            <button class="btn-chip-qty" onclick="window.game.adjustStock('${item.id}', 5)" title="Mua nhanh +5 phần">+5</button>
            <button class="btn-chip-qty" onclick="window.game.adjustStock('${item.id}', 10)" title="Mua nhanh +10 phần">+10</button>
          </div>
        </div>
      `;
    };

    if (noodleList) {
      const noodleItems = [
        ...Object.values(this.state.supplies),
        ...Object.values(this.state.noodles)
      ];
      noodleList.innerHTML = noodleItems.map(renderCard).join("");
    }

    if (topList) {
      topList.innerHTML = Object.values(this.state.toppings).map(renderCard).join("");
    }
  }

  adjustStock(itemId, amount) {
    let item = this.state.supplies[itemId] || this.state.noodles[itemId] || this.state.toppings[itemId] || this.state.drinks[itemId];
    if (!item) return;

    if (amount > 0) {
      const cost = item.unitCost * amount;
      if (this.state.money < cost) {
        GameUIModal.showToast("Không đủ tiền trong ngân quỹ để mua thêm!", "warning", "🪙");
        return;
      }
      this.state.money -= cost;
      item.stock += amount;
      this.state.todaySupplySpent = (this.state.todaySupplySpent || 0) + cost;
      this.sound.playCoinChime();
      GameUIModal.showToast(`Đã mua +${amount} ${item.name} (-${txaformat.formatVND(cost)})`, "success", item.icon);

      if (itemId === "mi_soi" && !this.state.tutorialDismissed) {
        this.state.tutorialDismissed = true;
      }
    } else {
      const reduce = Math.abs(amount);
      if (item.stock < reduce) {
        GameUIModal.showToast(`Trong kho chỉ còn ${item.stock} phần thôi!`, "warning", "⚠️");
        return;
      }
      const refund = (item.unitCost * reduce) * 0.8;
      item.stock -= reduce;
      this.state.money += refund;
      this.state.todaySupplySpent = Math.max(0, (this.state.todaySupplySpent || 0) - refund);
      this.sound.playButtonClick();
      GameUIModal.showToast(`Đã trả lại kho ${reduce} ${item.name} (+${txaformat.formatVND(refund)})`, "info", "↩️");
    }

    this.saveGame();
    this.renderHeader();
    this.renderKhoTab();
    this.renderBottomActionBar();
  }

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

  // 6. Tab 3: Giá bán
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
            <span class="price-card-title">${item.icon} ${item.name}</span>
            <span class="price-card-desc">Vốn: ${txaformat.formatVND(item.unitCost)} · Gốc: ${txaformat.formatVND(base)} · Lãi: +${txaformat.formatVND(profit)}</span>
            <span class="price-indicator-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="price-card-controls">
            <button class="btn-stepper" onclick="window.game.adjustPrice('${item.id}', -1)">−</button>
            <span style="font-weight: 800; min-width: 55px; text-align: center; color: var(--accent-money);">${txaformat.formatVND(item.price)}</span>
            <button class="btn-stepper" onclick="window.game.adjustPrice('${item.id}', 1)">+</button>
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
  }

  // 7. Tab 4: Nâng cấp
  renderUpgradesTab() {
    const listEl = document.getElementById("upgrades-list");
    if (!listEl) return;

    const upgradesConfig = [
      { key: "tableCount", name: "Thêm Bàn Ghế Gỗ Sồi", desc: "Tăng số lượng bàn đón khách cùng lúc", baseCost: 280, max: 6, icon: "🪑", minDay: 1 },
      { key: "stoveSpeed", name: "Bếp Niêu Đất Cao Cấp", desc: "Tăng tốc độ ninh mỳ và nấu song song", baseCost: 350, max: 4, icon: "🔥", minDay: 2 },
      { key: "chiliSecret", name: "Sốt Ớt Hiểm Bí Truyền", desc: "Gia vị cay nồng độc quyền tăng 15% giá bán", baseCost: 420, max: 3, icon: "🌶️", minDay: 2 },
      { key: "acCooling", name: "Điều Hòa Daikin Mát Rượi", desc: "Giải nhiệt ăn cay, tăng 30% kiên nhẫn của khách", baseCost: 320, max: 3, icon: "❄️", minDay: 2 },
      { key: "decorScore", name: "Đèn Lồng Đỏ Tokyo - Seoul", desc: "Tăng danh tiếng và kéo khách nườm nượp", baseCost: 380, max: 4, icon: "🏮", minDay: 3 }
    ];

    listEl.innerHTML = upgradesConfig.map(up => {
      const currentLv = this.state.upgrades[up.key] || 1;
      const isMax = currentLv >= up.max;
      const cost = Math.round(up.baseCost * Math.pow(1.6, currentLv - 1));
      const isDayUnlocked = this.state.day >= up.minDay;

      return `
        <div class="upgrade-card">
          <div class="upgrade-card-info">
            <span class="upgrade-card-title">${up.icon} ${up.name} (Cấp ${currentLv}/${up.max})</span>
            <span class="upgrade-card-desc">${up.desc}</span>
          </div>
          <div>
            ${isMax ? `<span style="font-weight: 800; color: #258A6D;">Tối đa</span>` : (
              !isDayUnlocked ? `<span class="staff-lock-badge">🔒 Ngày ${up.minDay}</span>` : `
              <button class="btn-menu-action btn-buy-lock" onclick="window.game.buyUpgrade('${up.key}', ${cost}, ${up.minDay})">
                <span class="btn-price-top">${cost}k</span>
                <span class="btn-action-sub">Nâng Cấp</span>
              </button>
            `)}
          </div>
        </div>
      `;
    }).join("");
  }

  buyUpgrade(key, cost, minDay = 1) {
    if (this.state.day < minDay) {
      GameUIModal.showToast(`Trang bị này mở khóa từ Ngày ${minDay}!`, "warning", "📅");
      return;
    }
    if (this.state.money < cost) {
      GameUIModal.showToast(`Cần ${cost}k để nâng cấp!`, "warning", "🪙");
      return;
    }

    this.state.money -= cost;
    this.state.upgrades[key] = (this.state.upgrades[key] || 1) + 1;

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
    }

    this.sound.playCoinChime();
    GameUIModal.showToast("Nâng cấp thành công cơ ngơi tiệm mì!", "success", "🛠️");
    this.saveGame();
    this.renderHeader();
    this.renderUpgradesTab();
  }

  // 8. Tab 5: Nhân viên
  renderStaffTab() {
    const listEl = document.getElementById("staff-list");
    if (!listEl) return;

    const staffConfig = [
      { key: "mochi", name: "Bé Mèo Mochi (Tiếp tân)", desc: "Tự động chào đón khách & tăng 25% tiền tip", cost: 350, minDay: 2, icon: "🐱" },
      { key: "usagi", name: "Thỏ Usagi (Bưng bê niêu đất)", desc: "Tự động bưng mì nóng hổi ra bàn cho khách", cost: 480, minDay: 2, icon: "🐰" },
      { key: "shiba", name: "Cún Shiba (Tạp vụ dọn bàn)", desc: "Tự động lau dọn bàn sạch bóng & nhặt tiền tip", cost: 520, minDay: 3, icon: "🐶" },
      { key: "kenji", name: "Gấu Kenji (Đầu bếp ninh mì)", desc: "Tự động nấu niêu đất khi khách gọi món", cost: 680, minDay: 4, icon: "🐼" },
      { key: "shiro", name: "Cáo Shiro (Thu ngân)", desc: "Tự động tính tiền và phát phiếu giảm giá", cost: 750, minDay: 5, icon: "🦊" }
    ];

    listEl.innerHTML = staffConfig.map(st => {
      const isHired = !!this.state.staff[st.key];
      const isDayUnlocked = this.state.day >= st.minDay;

      return `
        <div class="staff-card">
          <div class="staff-card-info">
            <span class="staff-card-title">${st.icon} ${st.name}</span>
            <span class="staff-card-desc">${st.desc}</span>
          </div>
          <div>
            ${isHired ? `<span style="font-weight: 800; color: #258A6D;">Đang làm việc</span>` : (
              !isDayUnlocked ? `<span class="staff-lock-badge">🔒 Ngày ${st.minDay}</span>` : `
              <button class="btn-menu-action btn-buy-lock" onclick="window.game.hireStaff('${st.key}', ${st.cost}, ${st.minDay})">
                <span class="btn-price-top">${st.cost}k</span>
                <span class="btn-action-sub">Thuê</span>
              </button>
            `)}
          </div>
        </div>
      `;
    }).join("");
  }

  hireStaff(key, cost, minDay = 1) {
    if (this.state.day < minDay) {
      GameUIModal.showToast(`Nhân viên này chỉ nhận hợp đồng từ Ngày ${minDay}!`, "warning", "📅");
      return;
    }
    if (this.state.money < cost) {
      GameUIModal.showToast(`Cần ${cost}k để ký hợp đồng nhân viên!`, "warning", "🪙");
      return;
    }

    this.state.money -= cost;
    this.state.staff[key] = true;
    this.sound.playCoinChime();
    GameUIModal.showToast(`Đã đón chào nhân viên mới về tiệm mì cay!`, "success", "🐾");
    this.saveGame();
    this.renderHeader();
    this.renderStaffTab();
  }

  // 9. Tab 6: Online
  renderOnlineTab() {
    const listEl = document.getElementById("online-orders-list");
    const countEl = document.getElementById("online-total-delivered");

    if (countEl) countEl.textContent = `Đã giao: ${this.state.deliveredOnlineCount} đơn`;

    if (listEl) {
      if (this.state.onlineOrders.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 24px 0; color: var(--text-muted);">
            🛵 Đang chờ khách đặt đơn mỳ cay qua GrabFood & ShopeeFood...
          </div>
        `;
      } else {
        listEl.innerHTML = this.state.onlineOrders.map((ord, idx) => `
          <div class="online-order-card">
            <div class="online-order-header">
              <span>🔔 Đơn #${ord.id} (${ord.app})</span>
              <span style="color: var(--accent-money);">+${ord.price}k</span>
            </div>
            <div class="online-order-items">
              ${ord.itemsText}
            </div>
            <button class="btn-pack-order" onclick="window.game.deliverOnlineOrder(${idx})">
              🛵 Đóng Gói Niêu & Giao Shipper
            </button>
          </div>
        `).join("");
      }
    }
  }

  deliverOnlineOrder(index) {
    const order = this.state.onlineOrders[index];
    if (!order) return;

    this.state.money += order.price;
    this.state.deliveredOnlineCount++;
    this.state.todayEarnings += order.price;
    this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + order.price;
    this.state.stats.bowlsServed += order.bowlsCount || 1;
    this.state.onlineOrders.splice(index, 1);

    this.sound.playCoinChime();
    GameUIModal.showToast(`Shipper đã lấy mỳ cay! Nhận +${order.price}k!`, "coin", "🛵");
    this.saveGame();
    this.renderHeader();
    this.renderOnlineTab();
  }

  // 10. Tab 7: Bộ sưu tập
  renderCollectionTab() {
    const custGrid = document.getElementById("collection-customers-grid");
    const badgeGrid = document.getElementById("collection-badges-grid");

    if (custGrid) {
      custGrid.innerHTML = this.customerTemplates.map(c => `
        <div class="collection-card">
          <img src="${c.avatar}" alt="${c.name}" class="collection-avatar" onerror="this.src='assets/cust_cat.png'" />
          <span class="collection-name">${c.name}</span>
          <span class="collection-bio">${c.bio}</span>
        </div>
      `).join("");
    }

    if (badgeGrid) {
      badgeGrid.innerHTML = `
        <div class="collection-card">
          <span style="font-size: 32px;">🌟</span>
          <span class="collection-name">Khai Trương Tiệm Mì</span>
          <span class="collection-bio">Mở tiệm mì cay ngày đầu tiên</span>
        </div>
        <div class="collection-card">
          <span style="font-size: 32px;">🔥</span>
          <span class="collection-name">Bậc Thầy Cấp 7</span>
          <span class="collection-bio">Phục vụ thành công 10 tô mì cấp 7 bốc hỏa</span>
        </div>
        <div class="collection-card">
          <span style="font-size: 32px;">🍜</span>
          <span class="collection-name">Vua Niêu Đất</span>
          <span class="collection-bio">Bán vượt mốc 50 tô mì cay</span>
        </div>
      `;
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
    const reviewsList = document.getElementById("reviews-list");

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

    if (reviewsList) {
      if (this.state.reviews.length === 0) {
        reviewsList.innerHTML = `
          <div style="text-align: center; padding: 24px 0; color: var(--text-muted);">
            Chưa có đánh giá nào. Hãy mở cửa đón thực khách vào thưởng thức mì cay nhé!
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

        const listHtml = this.state.reviews.slice(0, 15).map((r, idx) => {
          const starCount = Math.max(1, Math.min(5, r.stars || 5));
          const starStr = "★".repeat(starCount) + "☆".repeat(5 - starCount);
          const tagClass = `star-${starCount}`;
          const starTagText = starCount === 5 ? "5★ Xuất sắc" : (starCount === 4 ? "4★ Hài lòng" : (starCount === 3 ? "3★ Tạm ổn" : (starCount === 2 ? "2★ Thất vọng" : "1★ Rất tệ")));
          const custAvatar = r.customerAvatar || "assets/cust_cat.png";

          return `
            <div class="review-item-card">
              <div class="review-card-head">
                <div class="review-customer-identity">
                  <img src="${custAvatar}" alt="${r.customerName}" class="review-cust-avatar" onerror="this.src='assets/cust_cat.png'" />
                  <div>
                    <div class="review-customer-name">${r.customerName}</div>
                    <div class="review-date-badge">${r.date || 'Hôm nay'}</div>
                  </div>
                </div>
                <div class="review-stars-wrap">
                  <span class="review-stars">${starStr}</span>
                  <span class="review-star-tag ${tagClass}">${starTagText}</span>
                </div>
              </div>

              <div class="review-comment">"${r.comment}"</div>

              ${r.replied ? `
                <div class="owner-reply-bubble">
                  <div class="owner-reply-title">🧑‍🍳 Chủ tiệm (${this.state.ownerName || 'Bếp Trưởng'}):</div>
                  <div>"${r.ownerReply || 'Cảm ơn quý khách!'}"</div>
                </div>
                ${r.customerFeedback ? (() => {
                  const cleanFeedback = r.customerFeedback
                    .replace(/^(Phản hồi lại:\s*)?Khách (phản hồi|cảm động|thả reaction|thả tim):\s*['"]?/, '')
                    .replace(/^['"]/, '')
                    .replace(/['"]$/, '');
                  return `
                    <div class="customer-comeback-bubble">
                      <div class="customer-comeback-title">💬 ${r.customerName} hồi đáp:</div>
                      <div>"${cleanFeedback}"</div>
                    </div>
                  `;
                })() : ''}
              ` : `
                <div class="review-reply-form">
                  <div class="reply-input-row">
                    <input type="text" id="reply-input-${idx}" class="review-reply-input" placeholder="Gõ lời phản hồi của chủ tiệm gửi đến ${r.customerName}..." />
                    <button class="btn-send-reply" onclick="window.game.submitCustomReply(${idx})">Gửi 💌</button>
                  </div>
                  <div class="reply-quick-chips">
                    ${starCount <= 2 ? `
                      <span class="reply-chip" onclick="window.game.fillQuickReply(${idx}, 'Dạ tiệm xin lỗi bạn nhiều nha, lần sau ghé tiệm sẽ bù cho bạn 1 phần trà sữa ạ! 🧋')">🧋 Xin lỗi & Tặng trà sữa</span>
                      <span class="reply-chip" onclick="window.game.fillQuickReply(${idx}, 'Tiệm chân thành ghi nhận và đã chấn chỉnh ngay tốc độ nấu mì ạ! ⚡')">⚡ Hứa cải thiện tốc độ</span>
                    ` : `
                      <span class="reply-chip" onclick="window.game.fillQuickReply(${idx}, 'Cảm ơn bạn yêu nhiều nha, chúc bạn luôn vui vẻ và ngon miệng! 💖')">💖 Cảm ơn nồng nhiệt</span>
                      <span class="reply-chip" onclick="window.game.fillQuickReply(${idx}, 'Cảm ơn bạn đã ủng hộ tiệm, hẹn gặp lại bạn trong ca bán tới nhé! 🍜')">🍜 Hẹn gặp lại bạn</span>
                    `}
                  </div>
                </div>
              `}
            </div>
          `;
        }).join("");

        reviewsList.innerHTML = headerHtml + listHtml;
      }
    }
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
    const replyText = (input && input.value.trim()) ? input.value.trim() : "Dạ tiệm xin cảm ơn quý khách rất nhiều ạ! Chúc bạn luôn ngon miệng và có một ngày tuyệt vời!";

    rev.replied = true;
    rev.ownerReply = replyText;

    // Phản hồi phản ứng thực tế của khách hàng (Interactive customer comeback với cảm xúc chân thực)
    const isHostile = /đ[j|i|ụ]t|cút|biến|ngu|chó|đm|vcl|vđ|đéo|mày|tao|chửi|kệ/i.test(replyText);
    const isApology = /xin lỗi|bù|tặng|thông cảm|cải thiện|khắc phục|chân thành|sơ suất|mong bạn|ghi nhận/i.test(replyText);
    const isHumorous = /haha|hihi|hehe|kkk|vui|dễ thương|iu|yêu|bắt đền|ahihi|hài/i.test(replyText);
    const isExplanation = /đông|quá tải|bếp|cháy hàng|hết bàn|chờ lâu|giờ cao điểm/i.test(replyText);
    const isCurious = /hả|sao|văn phong|gì|thế|ủa/i.test(replyText);

    if (isHostile) {
      // Chủ quán văng tục / phản hồi thô lỗ -> Khách phẫn nộ đòi bóc phốt
      const hostileReplies = [
        "Ủa chủ quán chửi khách luôn hả trời?! Thái độ côn đồ vậy, chụp màn hình bóc phốt lên mạng ngay! 😡💥 (-3 ⭐ Uy tín)",
        "Khách góp ý thật lòng mà chủ tiệm văng tục chửi bới? Tẩy chay tiệm vĩnh viễn, mọi người né quán này ra nhé! 🚫 (-3 ⭐ Uy tín)",
        "Thái độ bán hàng kiểu vô học thế này thì sớm muộn cũng sập tiệm thôi! Quá coi thường khách hàng! 💢 (-3 ⭐ Uy tín)"
      ];
      rev.customerFeedback = hostileReplies[Math.floor(Math.random() * hostileReplies.length)];
      rev.stars = Math.max(1, (rev.stars || 1) - 1);
      this.state.reputation = Math.max(5, this.state.reputation - 5);
      GameUIModal.showToast("Chủ tiệm phản hồi thô lỗ! Khách phẫn nộ đòi bóc phốt (-3 ⭐ Uy tín)!", "warning", "💥");
    } else if (rev.stars <= 2) {
      if (isApology) {
        const apologyReplies = [
          "Dạ không sao đâu ạ, thấy chủ quán chân thành lắng nghe là em vui rồi. Em sẽ quay lại ủng hộ tiệm tiếp ạ! 🥰 (+1 ⭐ Hòa giải)",
          "Chủ tiệm phản hồi tử tế thế này thì em giận sao được nữa nè! Lần tới nhớ làm tô mì thật ngon cho em nha! 💖 (+1 ⭐ Hòa giải)",
          "Dạ cảm ơn tiệm đã quan tâm đến trải nghiệm của khách! Em xóa giận rồi, tiệm cố lên nhé! ✨ (+1 ⭐ Hòa giải)"
        ];
        rev.customerFeedback = apologyReplies[Math.floor(Math.random() * apologyReplies.length)];
        rev.stars = Math.min(5, rev.stars + 1);
        this.state.reputation = Math.min(100, this.state.reputation + 4);
        GameUIModal.showToast("Lời xin lỗi chân thành đã xoa dịu khách! Khách tăng +1 ⭐ hòa giải!", "success", "💖");
      } else if (isHumorous) {
        rev.customerFeedback = "Haha chủ quán rep lầy lội và dễ thương ghê! Thôi em bỏ qua nhé, hôm nào rủ bạn qua ăn tiếp! 😆 (+5k Tip)";
        this.state.money += 5;
        this.state.todayTips += 5;
        this.state.reputation = Math.min(100, this.state.reputation + 2);
        GameUIModal.showToast("Sự hài hước đã làm khách vui vẻ bỏ qua! (+5k Tip)", "coin", "🪙");
      } else if (isExplanation) {
        rev.customerFeedback = "Dạ em hiểu lúc đó quán đông nghẹt rồi, buôn bán vất vả mà. Lần tới em sẽ lựa giờ vắng hơn ghé ủng hộ nhé! 👍";
        this.state.reputation = Math.min(100, this.state.reputation + 2);
        GameUIModal.showToast("Khách đã thấu hiểu cho giờ cao điểm của quán!", "info", "💌");
      } else if (isCurious) {
        rev.customerFeedback = "Dạ em nhận xét trải nghiệm thực tế hôm đi ăn á chủ tiệm ơi! Mong quán tiếp thu để ngày càng đông khách nha! 🍜";
        this.state.reputation = Math.min(100, this.state.reputation + 1);
        GameUIModal.showToast("Khách đã chia sẻ chân thành với bạn!", "info", "💌");
      } else {
        const neutralReplies = [
          "Dạ em đã đọc phản hồi rồi, hy vọng lần tới ghé lại sẽ thấy sự thay đổi tích cực từ quán ạ! ✨",
          "Cảm ơn tiệm đã đọc feedback, chúc tiệm buôn may bán đắt và cải thiện chất lượng nhé! 🍜",
          "Ghi nhận lời của chủ quán, em sẽ rủ bạn bè ghé thử lại xem sao nhé! 👍",
          "Dạ mong tiệm nói được làm được, hoàn thiện tốc độ phục vụ trong các ca bán tới nha tiệm!"
        ];
        rev.customerFeedback = neutralReplies[Math.floor(Math.random() * neutralReplies.length)];
        this.state.reputation = Math.min(100, this.state.reputation + 1);
        GameUIModal.showToast("Khách đã ghi nhận phản hồi của bạn!", "info", "💌");
      }
    } else if (rev.stars === 3) {
      if (isApology || isHumorous) {
        const midNiceReplies = [
          "Dạ tiệm nấu nhanh hơn xíu là 10 điểm không có nhưng luôn á! Em gửi thêm 5k tip nha ✨ (+5k Tip)",
          "Cảm ơn tiệm đã lắng nghe ý kiến! Em thích thái độ cầu thị này, lần sau em sẽ tiếp tục ủng hộ! 👍 (+5k Tip)",
          "Chủ quán dễ thương xỉu! Lần tới ghé em sẽ thử mì cấp cao hơn xem sao nè! 🍜 (+5k Tip)"
        ];
        rev.customerFeedback = midNiceReplies[Math.floor(Math.random() * midNiceReplies.length)];
      } else {
        const midReplies = [
          "Dạ tiệm nấu nhanh hơn xíu là 10 điểm không có nhưng luôn á! Lần sau em ghé lại nè ✨ (+5k Tip)",
          "Cảm ơn tiệm đã lắng nghe ý kiến! Em thích thái độ cầu thị này, lần sau em sẽ tiếp tục ủng hộ! 👍 (+5k Tip)",
          "Dạ em cảm ơn chủ quán phản hồi nha! Hy vọng lần tới ghé tiệm sẽ không phải chờ lâu nữa nè! 🍜 (+5k Tip)"
        ];
        rev.customerFeedback = midReplies[Math.floor(Math.random() * midReplies.length)];
      }
      this.state.money += 5;
      this.state.todayTips += 5;
      this.state.stats.tipsEarned += 5;
      this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + 5;
      this.state.reputation = Math.min(100, this.state.reputation + 3);
      GameUIModal.showToast("Khách gửi thêm +5k tiền tip động viên tiệm!", "coin", "🪙");
    } else {
      const positiveReplies = [
        "Mì ngon đỉnh chóp luôn tiệm ơi! Em sẽ rủ cả hội bạn thân và đồng nghiệp ghé ăn ủng hộ tiệm dài dài! Yêu quán nhiều! 💖 (+8k Tip)",
        "Chủ quán dễ thương quá chừng! Nước dùng đậm đà, mì dai ngon đúng gu em luôn á. Chúc quán luôn đông khách nghen! 🍜✨ (+8k Tip)",
        "Đọc phản hồi của tiệm thấy ấm lòng ghê! Chắc chắn tuần này em sẽ ghé thêm vài lần nữa nha! ⭐ (+8k Tip)",
        "Quán ruột của em từ nay về sau nè! Giá cả hợp lý mà phục vụ nhanh như chớp, 10/10! 🍲🎉 (+8k Tip)"
      ];
      rev.customerFeedback = positiveReplies[Math.floor(Math.random() * positiveReplies.length)];
      this.state.money += 8;
      this.state.todayTips += 8;
      this.state.stats.tipsEarned += 8;
      this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + 8;
      this.state.reputation = Math.min(100, this.state.reputation + 4);
      GameUIModal.showToast("Khách khen nức nở và gửi tặng +8k tip! (+4 ⭐ Uy tín)", "coin", "✨");
    }

    this.sound.playReviewChime();
    this.saveGame();
    this.renderHeader();
    this.renderSummaryTab();
  }

  // ==========================================================
  // CHẾ ĐỘ MỞ CỬA BÁN MÌ CAY (OPEN COOKING MODE)
  // CHUẨN 100% SCREENSHOT MỚI
  // ==========================================================
  renderOpenMode() {
    this.renderStaffKitchenBar();
    this.renderActiveBuffsIndicator();
    this.renderOrderQueue();
    this.renderPotWorkstation();
    this.renderCookingSteps();
    this.renderDiningStage();
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
      }
    ];

    const activeWorkers = workers.filter(w => w.active);

    staffBar.innerHTML = activeWorkers.map(w => `
      <div class="kitchen-worker-pill" title="${w.name}: ${w.role}">
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

  // Render 3 Khay Đơn Hàng Slot (Với tính năng nhận diện món khớp đơn thông minh)
  renderOrderQueue() {
    const queueGrid = document.getElementById("order-queue-grid");
    if (!queueGrid) return;

    queueGrid.innerHTML = this.orderSlots.map((slot, idx) => {
      if (!slot) {
        return `
          <div class="order-slot-card slot-empty">
            <span class="empty-slot-text">Trống</span>
          </div>
        `;
      }

      const cust = slot.customer;
      const order = slot.order;
      const patiencePct = Math.max(0, Math.min(100, (slot.patience / slot.maxPatience) * 100));
      const patienceClass = patiencePct < 25 ? "patience-danger" : (patiencePct < 55 ? "patience-warning" : "");

      // Kiểm tra xem niêu đất đang nấu có khớp đơn khách này không
      const pot = this.currentPot;
      const isMatch = pot.noodleId &&
        pot.noodleId === order.noodleId &&
        (!order.size || pot.size === order.size) &&
        (pot.spicyLevel === order.spicyLevel) &&
        (!order.toppingId || pot.toppings.includes(order.toppingId));

      return `
        <div class="order-slot-card ${isMatch ? 'is-matching-dish' : ''}">
          <div class="order-customer-head">
            <div class="order-cust-avatar-wrap">
              <img src="${cust.avatar}" alt="${cust.name}" class="order-cust-avatar" onerror="this.src='assets/cust_cat.png'" />
            </div>
            <div class="order-cust-info">
              <span class="order-cust-title">${slot.isSpecial ? '⭐ ' : ''}${cust.name}</span>
              <span class="order-cust-mood ${patienceClass}">
                ${patiencePct > 55 ? '😊 Đang đợi món' : (patiencePct > 25 ? '🤤 Sốt ruột' : '💦 Sắp về')}
              </span>
            </div>
          </div>
          <div class="order-speech-bubble" onclick="window.game.quickCookForSlot(${idx})" style="cursor: pointer;" title="Chạm để nạp nhanh công thức này vào niêu đất!">
            ${slot.isSpecial ? '<div style="font-size:9.5px; color:#C44569; font-weight:800; margin-bottom:1px;">Món tâm đắc:</div>' : ''}
            <span class="dish-highlight-badge">${order.noodleName}</span>
            <div style="margin-top: 2px; font-size: 10.5px;">
              Size <strong>${order.size}</strong> · Cấp <strong>${order.spicyLevel} 🌶️</strong>
              ${order.toppingName ? `<br/>+ thêm <strong>${order.toppingName}</strong>` : ''}
            </div>
          </div>
          <div class="order-patience-track">
            <div class="order-patience-fill ${patienceClass}" style="width: ${patiencePct}%;"></div>
          </div>
          <div class="order-actions-row">
            <button class="btn-quick-cook" onclick="window.game.quickCookForSlot(${idx})" title="Tự động chuẩn bị niêu đất đúng đơn khách này">
              ⚡ Nấu
            </button>
            <button class="btn-serve-slot ${isMatch ? 'is-matching' : ''}" onclick="window.game.serveToSlot(${idx})">
              ${isMatch ? '✨ Bưng' : 'Bưng 🍜'}
            </button>
            <button class="btn-reject-slot" onclick="window.game.rejectSlot(${idx})" title="Từ chối khách">✕</button>
          </div>
        </div>
      `;
    }).join("");
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

    // Cập nhật size niêu đất
    if (potEl) {
      potEl.className = `korean-clay-pot size-${pot.size.toLowerCase()}`;
    }

    if (!pot.noodleId) {
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

    // Cập nhật nút Bưng Khớp Đơn trên bảng niêu đất
    const directServeBtn = document.getElementById("btn-direct-serve");
    if (directServeBtn) {
      const hasMatch = this.orderSlots.some(slot => slot && pot.noodleId &&
        pot.noodleId === slot.order.noodleId &&
        (!slot.order.size || pot.size === slot.order.size) &&
        (pot.spicyLevel === slot.order.spicyLevel) &&
        (!slot.order.toppingId || pot.toppings.includes(slot.order.toppingId))
      );
      if (hasMatch) {
        directServeBtn.style.animation = "servePulse 1.2s infinite alternate ease-in-out";
        directServeBtn.style.background = "linear-gradient(135deg, #10B981 0%, #059669 100%)";
      } else {
        directServeBtn.style.animation = "none";
        directServeBtn.style.background = "linear-gradient(135deg, #258A6D 0%, #166534 100%)";
      }
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
        <div class="ingredient-badge-card ${this.currentPot.noodleId === n.id ? 'selected' : ''}" onclick="window.game.selectNoodle('${n.id}')">
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
          <div class="ingredient-badge-card ${isSelected ? 'selected' : ''}" onclick="window.game.toggleTopping('${t.id}')">
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
          <div class="ingredient-badge-card ${isSelected ? 'selected' : ''}" onclick="window.game.toggleDrink('${d.id}')">
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

  // Tương tác nấu trong niêu
  selectPotSize(size) {
    this.currentPot.size = size;
    this.sound.playButtonClick();
    this.renderPotWorkstation();
    this.renderCookingSteps();
    this.renderOrderQueue();
  }

  selectSpicyLevel(lvl) {
    this.currentPot.spicyLevel = lvl;
    this.sound.playCookingSizzle();
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
      GameUIModal.showToast(`Đã thêm ${top.name} vào niêu!`, "info", top.icon);
    }
    this.renderPotWorkstation();
    this.renderCookingSteps();
    this.renderOrderQueue();
  }

  toggleDrink(drinkId) {
    if (this.currentPot.drinkId === drinkId) {
      this.currentPot.drinkId = null;
    } else {
      const drink = this.state.drinks[drinkId];
      if (drink && drink.stock > 0) {
        this.currentPot.drinkId = drinkId;
        this.sound.playCoinChime();
      }
    }
    this.renderCookingSteps();
    this.renderPotWorkstation();
    this.renderOrderQueue();
  }

  clearCurrentPot() {
    this.currentPot = {
      size: "M",
      spicyLevel: 0,
      noodleId: null,
      toppings: [],
      drinkId: null
    };
    this.sound.playButtonClick();
    GameUIModal.showToast("Đã dọn sạch niêu đất để nấu niêu mới!", "info", "🧹");
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
    this.currentPot.toppings = order.toppingId && this.state.toppings[order.toppingId]?.stock > 0 ? [order.toppingId] : [];
    this.currentPot.drinkId = null;

    this.sound.playCookingSizzle();
    GameUIModal.showToast(`⚡ Đã nấu niêu đúng đơn cho ${slot.customer.name}! Bấm "✨ Bưng ngay" để phục vụ!`, "success", "🍲");

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

    const pot = this.currentPot;
    for (let idx = 0; idx < this.orderSlots.length; idx++) {
      const slot = this.orderSlots[idx];
      if (slot) {
        const order = slot.order;
        const isMatch = pot.noodleId === order.noodleId &&
          (!order.size || pot.size === order.size) &&
          (pot.spicyLevel === order.spicyLevel) &&
          (!order.toppingId || pot.toppings.includes(order.toppingId));
        if (isMatch) {
          this.serveToSlot(idx);
          return;
        }
      }
    }

    GameUIModal.showToast("Niêu mì hiện tại chưa khớp với đơn khách nào đang chờ!", "warning", "⚠️");
  }

  // Bưng mỳ cho khách ở Slot
  serveToSlot(slotIdx, isAutoUsagi = false) {
    const slot = this.orderSlots[slotIdx];
    if (!slot) return;

    if (!this.currentPot.noodleId) {
      if (!isAutoUsagi) {
        GameUIModal.showToast("Bạn chưa chọn mì vào niêu đất để nấu!", "warning", "🍲");
      }
      return;
    }

    const order = slot.order;
    const pot = this.currentPot;

    // Kiểm tra độ khớp của món ăn
    let isMatch = true;
    if (pot.noodleId !== order.noodleId) isMatch = false;
    if (order.toppingId && !pot.toppings.includes(order.toppingId)) isMatch = false;

    if (!isMatch) {
      if (!isAutoUsagi) {
        GameUIModal.showToast(`Khách muốn ${order.noodleName} cấp ${order.spicyLevel}! Hãy kiểm tra lại niêu đất nhé.`, "warning", "⚠️");
      }
      return;
    }

    // Khách hài lòng -> Tính tiền
    const noodle = this.state.noodles[pot.noodleId];
    let bowlPrice = noodle.price;
    if (pot.size === "L") bowlPrice += 7;

    pot.toppings.forEach(topId => {
      if (this.state.toppings[topId]) bowlPrice += this.state.toppings[topId].price;
    });

    if (pot.drinkId && this.state.drinks[pot.drinkId]) {
      bowlPrice += this.state.drinks[pot.drinkId].price;
      this.state.stats.drinksServed++;
      this.state.todayDrinksSold++;
    }

    // Nâng cấp Sốt Ớt Hiểm Bí Truyền (chiliSecret): Tăng 15% doanh thu mỗi cấp!
    const chiliLv = this.state.upgrades.chiliSecret || 1;
    if (chiliLv > 1) {
      bowlPrice = Math.round(bowlPrice * (1 + (chiliLv - 1) * 0.15));
    }

    // Tính giá gốc thị trường chuẩn của tô mì để đo lường mức độ đắt/rẻ
    let baseBowlPrice = noodle.basePrice || noodle.price;
    if (pot.size === "L") baseBowlPrice += 7;
    pot.toppings.forEach(topId => {
      if (this.state.toppings[topId]) baseBowlPrice += (this.state.toppings[topId].basePrice || this.state.toppings[topId].price);
    });
    if (pot.drinkId && this.state.drinks[pot.drinkId]) {
      baseBowlPrice += (this.state.drinks[pot.drinkId].basePrice || this.state.drinks[pot.drinkId].price);
    }
    const orderPriceRatio = baseBowlPrice > 0 ? (bowlPrice / baseBowlPrice) : 1.0;

    // Tỷ lệ tiền tip phụ thuộc vào giá bán (Rẻ -> tip đậm, Đắt -> tip ít hoặc không tip):
    let baseTipRate = 0.25;
    if (orderPriceRatio <= 0.85) {
      baseTipRate = 0.35; // Giá hạt dẻ hời quá nên khách vui vẻ tip đậm!
    } else if (orderPriceRatio > 1.35) {
      baseTipRate = 0.08; // Quá đắt đỏ, khách chỉ tip tượng trưng
    } else if (orderPriceRatio > 1.15) {
      baseTipRate = 0.16; // Hơi đắt
    }

    // Tiền tip (Nhân viên Mèo Mochi tăng 35% tip)
    let tip = Math.round(bowlPrice * baseTipRate * (slot.customer.tipMultiplier || 1));
    if (this.state.staff.mochi) tip = Math.round(tip * 1.35);

    const totalEarned = bowlPrice + tip;

    // Trừ 1 suất nguyên liệu trong kho
    if (noodle.stock > 0) noodle.stock -= 1;
    pot.toppings.forEach(topId => {
      if (this.state.toppings[topId] && this.state.toppings[topId].stock > 0) {
        this.state.toppings[topId].stock -= 1;
      }
    });

    this.state.money += totalEarned;
    this.state.todayEarnings += totalEarned;
    this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + totalEarned;
    this.state.todayBowlsSold += 1;
    this.state.todayTips += tip;
    this.state.stats.bowlsServed += 1;
    this.state.stats.tipsEarned += tip;
    if (pot.spicyLevel >= 6) {
      this.state.todaySpicy7Sold += 1;
      this.state.stats.spicyMasterServed += 1;
    }

    this.sound.playCoinChime();
    if (isAutoUsagi) {
      GameUIModal.showToast(`🐰 Thỏ Usagi nhanh tay bưng mì cho ${slot.customer.name}! +${totalEarned}k (tip +${tip}k)`, "success", "✨");
    } else {
      GameUIModal.showToast(`Bưng mỳ thành công! Khách gửi +${totalEarned}k (tip +${tip}k)!`, "success", "✨");
    }

    // Tạo đánh giá sao động (1 -> 5 sao) dựa trên thời gian phục vụ, chất lượng món ăn và mức giá bán
    const patienceRatio = slot.patience / slot.maxPatience;
    let stars = 5;
    let comment = "";

    if (patienceRatio >= 0.70) {
      stars = 5;
      const comments5 = [
        `Mì ${noodle.name} cấp ${pot.spicyLevel} nước dùng ngọt xương thơm lừng, phục vụ siêu nhanh, ăn xì xèo ngon mê ly! 💖`,
        `Quán phục vụ nhanh như chớp! Niêu đất sôi sùng sục, cấp ${pot.spicyLevel} cay nồng đậm đà chuẩn vị! 🍜✨`,
        `Quá xuất sắc! Bát mì ${noodle.name} đầy đặn, nóng hổi vừa thổi vừa ăn, chắc chắn sẽ rủ bạn bè ghé ủng hộ dài dài! ⭐`
      ];
      comment = comments5[Math.floor(Math.random() * comments5.length)];
    } else if (patienceRatio >= 0.40) {
      stars = 4;
      const comments4 = [
        `Mì ${noodle.name} cấp ${pot.spicyLevel} vị đậm đà ngon miệng. Quán hơi đông nên phải đợi một tẹo nhưng bù lại mì rất chất lượng! 👍`,
        `Nước dùng ngọt thanh, mì dai ngon đúng chuẩn. Giá mà quán lên món nhanh thêm một chút nữa thì trọn vẹn 5 sao! 🍲`,
        `Thực đơn đa dạng, mì cay cấp ${pot.spicyLevel} đúng khẩu vị. Nhân viên phục vụ nhiệt tình và chu đáo!`
      ];
      comment = comments4[Math.floor(Math.random() * comments4.length)];
    } else if (patienceRatio >= 0.15) {
      stars = 3;
      const comments3 = [
        `Chờ hơi lâu mới có mì, sốt ruột toát cả mồ hôi. Vị mì ${noodle.name} tạm ổn nhưng cần cải thiện tốc độ vào giờ cao điểm! ⏱️`,
        `Mì cấp ${pot.spicyLevel} ăn được nhưng đợi mỏi mòn quá. Lúc bưng ra suýt nữa thì mình hủy đơn về rồi đấy. 😐`,
        `Quán đông nên phục vụ lóng ngóng, chờ gần hết kiên nhẫn. Mong tiệm nâng cấp thêm bếp nấu nhanh hơn!`
      ];
      comment = comments3[Math.floor(Math.random() * comments3.length)];
    } else {
      stars = 2;
      const comments2 = [
        `Chờ quá lâu, đợi đói lả cả người mới được ăn! Mì ${noodle.name} bưng ra hơi nguội bớt nước dùng rồi. Rất thất vọng! 😤`,
        `Thời gian chờ đợi quá lâu, giục mấy lần mới có mì. Thái độ cần xem lại, lần sau chắc phải cân nhắc trước khi ghé tiệm! 👎`
      ];
      comment = comments2[Math.floor(Math.random() * comments2.length)];
    }

    // Tác động trực tiếp từ Giá Bán (Price Ratio):
    if (orderPriceRatio > 1.35) {
      // Bị chê chặt chém, trừ 1 sao và bình luận bức xúc về giá
      stars = Math.max(1, stars - 1);
      const expensiveComments = [
        `Mì ${noodle.name} ăn cũng ổn mà giá ${bowlPrice}k chát quá! Tính tiền xong xót cả ví, cảm giác bị chặt chém! 💸`,
        `Giá quá đắt đỏ so với mặt bằng chung! Dù bưng ra đúng lúc nhưng giá trên trời thế này thì khó quay lại lần 2. 👎`,
        `Một tô mì giá ${bowlPrice}k là quá cao! Ăn xong không thấy tương xứng với số tiền bỏ ra, hơi thất vọng. 😤`
      ];
      comment = expensiveComments[Math.floor(Math.random() * expensiveComments.length)];
    } else if (orderPriceRatio <= 0.85 && stars >= 4) {
      // Khách khen nức nở vì giá rẻ hạt dẻ, auto 5 sao
      stars = 5;
      const cheapComments = [
        `Giá hạt dẻ bất ngờ, chỉ ${bowlPrice}k mà niêu ${noodle.name} cấp ${pot.spicyLevel} ngập tràn topping! Quá hời luôn 💖⭐`,
        `Tiệm bán giá sinh viên siêu yêu thương! Mì cay nóng hổi đầy đặn, vừa túi tiền mà ngon đỉnh chóp! 🍜🎉`,
        `Quán chân ái của mình! Giá rẻ hơn hẳn các quán khác mà chất lượng đỉnh cao, xứng đáng 10/10! ⭐⭐⭐⭐⭐`
      ];
      comment = cheapComments[Math.floor(Math.random() * cheapComments.length)];
    } else if (pot.spicyLevel >= 6 && stars >= 4) {
      // Thử thách mì cay cấp 6-7 bốc hỏa
      comment = `🔥 Thử thách mì cay cấp ${pot.spicyLevel} bốc hỏa thành công! Cay xé lưỡi toát mồ hôi hột mà ngon bá cháy, xứng đáng 5 sao! 🌶️👑`;
      stars = 5;
    }

    // Cập nhật danh tiếng theo sao
    if (stars === 5) this.state.reputation = Math.min(100, this.state.reputation + 2);
    else if (stars === 4) this.state.reputation = Math.min(100, this.state.reputation + 1);
    else if (stars <= 2) this.state.reputation = Math.max(5, this.state.reputation - 2);

    this.state.reviews.unshift({
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      customerName: slot.customer.name,
      customerAvatar: slot.customer.avatar || "assets/cust_cat.png",
      stars: stars,
      comment: comment,
      date: `Ngày ${this.state.day}`,
      replied: false,
      ownerReply: null,
      customerFeedback: null
    });

    // Chuyển khách ra bàn ăn thưởng thức niêu đất xì xèo!
    this.initTables();
    const emptyTable = this.state.tables.find(t => t.status === "empty");
    if (emptyTable) {
      emptyTable.status = "eating";
      emptyTable.customer = { ...slot.customer };
      emptyTable.order = {
        noodleName: noodle.name,
        spicyLevel: pot.spicyLevel,
        toppings: [...pot.toppings]
      };
      emptyTable.eatTimer = 12;
    }

    // Giải phóng slot và reset niêu
    this.orderSlots[slotIdx] = null;
    this.clearCurrentPot();

    this.saveGame();
    this.renderHeader();
    this.renderDiningStage();
    this.renderOpenMode();
  }

  // Từ chối khách ở Slot
  rejectSlot(slotIdx) {
    const slot = this.orderSlots[slotIdx];
    if (slot) {
      // Khách bị từ chối phục vụ để lại đánh giá 1-2 sao thất vọng
      const isAngry = Math.random() < 0.65;
      if (isAngry) {
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

        this.state.reviews.unshift({
          id: Date.now() + Math.random().toString(36).substr(2, 4),
          customerName: slot.customer.name,
          customerAvatar: slot.customer.avatar || "assets/cust_cat.png",
          stars: 1,
          comment: chosenComment,
          date: `Ngày ${this.state.day}`,
          replied: false,
          ownerReply: null,
          customerFeedback: null
        });
      }
    }

    this.orderSlots[slotIdx] = null;
    this.sound.playButtonClick();
    GameUIModal.showToast("Đã từ chối đơn hàng, khay đã sẵn sàng đón khách mới!", "info", "🚪");
    this.renderHeader();
    this.renderOrderQueue();
  }

  // Sinh khách mới vào các slot trống
  spawnCustomerToSlot() {
    const emptyIndices = [];
    this.orderSlots.forEach((slot, idx) => {
      if (!slot) emptyIndices.push(idx);
    });

    if (emptyIndices.length === 0) return;

    const chosenSlotIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    const activeNoodles = Object.values(this.state.noodles).filter(n => n.unlocked && n.inMenu);
    if (activeNoodles.length === 0) return;

    const chosenNoodle = activeNoodles[Math.floor(Math.random() * activeNoodles.length)];
    const chosenCust = this.customerTemplates[Math.floor(Math.random() * this.customerTemplates.length)];
    const spicyLevel = chosenCust.preferredSpicy[Math.floor(Math.random() * chosenCust.preferredSpicy.length)];

    const activeTops = Object.values(this.state.toppings).filter(t => t.unlocked && t.inMenu);
    const chosenTop = activeTops.length > 0 && Math.random() > 0.4 ? activeTops[Math.floor(Math.random() * activeTops.length)] : null;
    const isSpecial = Math.random() > 0.7;

    const baseNoodlePrice = chosenNoodle.basePrice || chosenNoodle.price || 40;
    const currentNoodlePrice = chosenNoodle.price || 40;
    const baseTopPrice = chosenTop ? (chosenTop.basePrice || chosenTop.price || 15) : 0;
    const currentTopPrice = chosenTop ? (chosenTop.price || 15) : 0;
    const orderBaseTotal = baseNoodlePrice + baseTopPrice;
    const orderCurrentTotal = currentNoodlePrice + currentTopPrice;
    const orderPriceRatio = orderBaseTotal > 0 ? (orderCurrentTotal / orderBaseTotal) : 1.0;

    this.orderSlots[chosenSlotIdx] = {
      customer: chosenCust,
      isSpecial: isSpecial,
      orderPriceRatio: orderPriceRatio,
      order: {
        noodleId: chosenNoodle.id,
        noodleName: chosenNoodle.name,
        size: Math.random() > 0.5 ? "L" : "M",
        spicyLevel: spicyLevel,
        toppingId: chosenTop ? chosenTop.id : null,
        toppingName: chosenTop ? chosenTop.name : null
      },
      patience: 100,
      maxPatience: 100
    };

    this.sound.playDoorBell();
    this.renderOrderQueue();
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
    let avgStars = 5.0;
    if (this.state.reviews.length > 0) {
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
      if (avgStars >= 4.5) {
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
      if (avgStars >= 4.5) {
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

    // 2. Tạo HTML cho các bàn ăn
    const tablesHtml = this.state.tables.map(table => {
      if (table.status === "empty") {
        return `
          <div class="dining-table-box is-empty">
            <span style="font-size: 26px;">🪑</span>
            <span style="font-size: 11px; font-weight: 800; color: #3B180E;">Bàn #${table.id} Trống</span>
            <span style="font-size: 10px; color: #8C431A; opacity: 0.75;">Sẵn sàng đón khách</span>
          </div>
        `;
      }

      if (table.status === "dirty") {
        return `
          <div class="dining-table-box is-dirty">
            <span style="font-size: 22px;">🍲✨</span>
            <span style="font-size: 11px; font-weight: 800; color: #8C431A;">Bàn #${table.id} đã ăn xong</span>
            <button class="btn-clean-table" onclick="window.game.cleanTable(${table.id})">🧹 Dọn Bàn (+Tip)</button>
          </div>
        `;
      }

      const cust = table.customer || { name: "Thực khách", avatar: "assets/cust_cat.png" };
      const order = table.order || { noodleName: "Mì cay Bò", spicyLevel: 2 };
      const eatPct = Math.round(((table.eatTimer || 1) / 12) * 100);

      let comment = "🍜 Nước dùng ngọt thanh quá!";
      if (order.spicyLevel >= 6) comment = "🔥 Cay bốc khói mà ngon tê tái!";
      else if (order.spicyLevel >= 3) comment = "🌶️ Đậm đà thơm lừng đã miệng!";

      return `
        <div class="dining-table-box is-eating">
          <img src="${cust.avatar || 'assets/cust_cat.png'}" class="dining-customer-avatar" alt="${cust.name}" onerror="this.src='assets/cust_cat.png'" />
          <span style="font-size: 11px; font-weight: 800; color: #3B180E;">${cust.name}</span>
          <div class="eating-pot-icon">🍲💨</div>
          <div class="customer-thought-bubble">${comment}</div>
          <div class="table-patience-bar">
            <div class="table-patience-fill" style="width: ${eatPct}%; background: #258A6D;"></div>
          </div>
        </div>
      `;
    }).join("");

    // 3. Render đồng bộ vào tất cả các vị trí hiển thị trên màn hình:
    const openGrid = document.getElementById("open-dining-tables-grid");
    if (openGrid) openGrid.innerHTML = tablesHtml;

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

    this.sound.playCoinChime();
    GameUIModal.showToast(`Đã dọn sạch bàn #${tableId}! Nhận thêm +${tipEarned}k tiền tip để lại 🪙`, "success", "🧹");

    this.saveGame();
    this.renderHeader();
    this.renderDiningStage();
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
    this.dayRemaining = this.dayDuration;
    this.orderSlots = [null, null, null];
    this.clearCurrentPot();

    // Chuyển view: Ẩn prep view, hiện open cooking view
    const prepView = document.getElementById("view-prep-mode");
    const openView = document.getElementById("view-open-mode");
    if (prepView) prepView.style.display = "none";
    if (openView) openView.style.display = "block";

    this.switchMobileOpenTab("cockpit");
    this.switchCookingDockTab("quick");

    this.sound.playDoorBell();
    GameUIModal.showToast(`Khai trương Ngày ${this.state.day}! Tiệm mỳ cay xì xèo ấm áp đón khách!`, "success", "🏮");

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

      // Nâng cấp Điều Hòa Daikin (acCooling): Không khí mát lành giảm độ bức bối giúp khách kiên nhẫn hơn
      const acLv = this.state.upgrades.acCooling || 1;
      const dayRush = Math.min(0.35, (this.state.day - 1) * 0.05); // Các ngày sau khách đông và sốt ruột hơn một chút
      const patienceLoss = Math.max(0.6, 1.1 + dayRush - (acLv - 1) * 0.15);

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
            GameUIModal.showToast(`${slot.customer.name} đã tức giận bỏ về vì chờ quá lâu! (-1 ⭐)`, "warning", "😡");
            this.sound.playReviewChime();

            const angryComments = [
              `Chờ mòn mỏi cả 20 phút không thấy tô mì đâu! Đói lả cả người đành phải bỏ về, quán phục vụ quá chậm chạp! 😡`,
              `Quán gì để khách chờ sốt ruột toát mồ hôi hột. Gọi món xong ngồi ngó nhân viên, bực mình bỏ về luôn. 1 sao! 👎`,
              `Bảo quán mì cay đệ nhất mà làm ăn như rùa bò, không bao giờ quay lại lần thứ hai! 💢`
            ];
            const angryText = angryComments[Math.floor(Math.random() * angryComments.length)];

            this.state.reputation = Math.max(5, this.state.reputation - 4);
            this.state.reviews.unshift({
              id: Date.now() + Math.random().toString(36).substr(2, 4),
              customerName: slot.customer.name,
              customerAvatar: slot.customer.avatar || "assets/cust_cat.png",
              stars: 1,
              comment: angryText,
              date: `Ngày ${this.state.day}`,
              replied: false,
              ownerReply: null,
              customerFeedback: null
            });

            this.orderSlots[idx] = null;
            this.renderHeader();
          }
        }
      });
      this.renderOrderQueue();

      // Cập nhật đếm ngược của Shipper trực tiếp trong ca bán (20s)
      if (this.activeLiveShipperOrder) {
        this.activeLiveShipperOrder.remainingSeconds = (this.activeLiveShipperOrder.remainingSeconds || 20) - 1;
        const secs = this.activeLiveShipperOrder.remainingSeconds;
        const timerBadge = document.getElementById("open-shipper-timer");
        const timerFill = document.getElementById("open-shipper-timer-fill");
        const pct = Math.max(0, Math.min(100, (secs / 20) * 100));

        if (timerBadge) {
          timerBadge.textContent = `⏱️ ${secs}s`;
          if (secs <= 5) {
            timerBadge.style.background = "#FEE2E2";
            timerBadge.style.color = "#DC2626";
          }
        }
        if (timerFill) {
          timerFill.style.width = `${pct}%`;
        }

        if (secs <= 0) {
          const lostOrder = this.activeLiveShipperOrder;
          this.activeLiveShipperOrder = null;
          const idx = this.state.onlineOrders.indexOf(lostOrder);
          if (idx >= 0) this.state.onlineOrders.splice(idx, 1);

          const shipperCard = document.getElementById("open-mode-shipper-card");
          if (shipperCard) shipperCard.style.display = "none";

          this.state.reputation = Math.max(5, this.state.reputation - 2);
          this.sound.playReviewChime();
          GameUIModal.showToast(`🛵 Shipper đã rời đi do quán quá lâu không bấm giao! Mất đơn online (-2 ⭐ Uy tín)!`, "warning", "💨");

          this.renderHeader();
          this.renderOnlineTab();
        }
      }

      // Cập nhật thực khách đang ăn tại các bàn
      let tableChanged = false;
      this.state.tables.forEach(table => {
        if (table.status === "eating") {
          table.eatTimer = (table.eatTimer || 12) - 1;
          if (table.eatTimer <= 0) {
            tableChanged = true;
            if (this.state.staff.shiba) {
              table.status = "empty";
              table.customer = null;
              table.order = null;
              const autoTip = Math.floor(Math.random() * 4) + 6;
              this.state.money += autoTip;
              this.state.todayTips += autoTip;
              this.state.todayEarnings += autoTip;
              this.state.stats.tipsEarned += autoTip;
              this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + autoTip;
              this.sound.playCoinChime();
              GameUIModal.showToast(`🐶 Cún Shiba đã lau dọn sạch bàn #${table.id}! Nhặt được +${autoTip}k tip!`, "success", "✨");
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

    // Nhịp độ khách vào quán hợp lý (5.0s - 9.5s), cân bằng hài hòa giữa sao & giá bán
    const custIntervalMs = Math.max(5000, Math.round((9500 - (decorLv - 1) * 750) * starMultiplier * priceTrafficMultiplier));

    // Khách mới ghé các slot trống
    this.customerInterval = setInterval(() => {
      if (this.isPaused) return;
      this.spawnCustomerToSlot();
    }, custIntervalMs / this.gameSpeed);

    // 3. Đơn hàng Shipper online định kỳ (mỗi 18s)
    this.onlineOrderInterval = setInterval(() => {
      if (this.isPaused) return;
      this.spawnOnlineOrder();
    }, 18000 / this.gameSpeed);

    // 4. Vòng lặp làm việc thực tế của nhân viên (Kenji nấu, Usagi bưng, Shiba dọn dẹp)
    // Nâng cấp Bếp Gas Cao Cấp (stoveSpeed) giúp Kenji và nhà bếp thao tác nhanh hơn
    const stoveLv = this.state.upgrades.stoveSpeed || 1;
    const autoIntervalMs = Math.max(1200, 2200 - (stoveLv - 1) * 350);

    this.staffAutomationInterval = setInterval(() => {
      this.runStaffAutomation();
    }, autoIntervalMs / this.gameSpeed);
  }

  // Tự động hóa nhân viên đang làm việc thực tế trong tiệm
  runStaffAutomation() {
    if (this.isPaused || this.state.dayPhase !== "open") return;

    const staff = this.state.staff;

    // 1. Gấu Kenji (Đầu bếp): Tự nấu niêu đất nếu niêu đang rỗng và có khách gọi món
    if (staff.kenji && !this.currentPot.noodleId) {
      for (let i = 0; i < this.orderSlots.length; i++) {
        const slot = this.orderSlots[i];
        if (slot) {
          const ord = slot.order;
          const noodle = this.state.noodles[ord.noodleId];
          if (noodle && noodle.stock > 0) {
            this.currentPot.noodleId = ord.noodleId;
            this.currentPot.size = ord.size || "M";
            this.currentPot.spicyLevel = ord.spicyLevel || 0;
            if (ord.toppingId && this.state.toppings[ord.toppingId]?.stock > 0) {
              this.currentPot.toppings = [ord.toppingId];
            } else {
              this.currentPot.toppings = [];
            }
            this.sound.playCookingSizzle();
            GameUIModal.showToast(`🐼 Gấu Kenji đã bỏ ${noodle.name} Cấp ${ord.spicyLevel} vào niêu đất để nấu!`, "info", "🔥");
            this.renderPotWorkstation();
            this.renderCookingSteps();
            this.renderOrderQueue();
            break;
          }
        }
      }
    }

    // 2. Thỏ Usagi (Phục vụ): Tự động bưng niêu mì ra bàn nếu niêu đất đã nấu khớp với đơn khách
    if (staff.usagi && this.currentPot.noodleId) {
      for (let i = 0; i < this.orderSlots.length; i++) {
        const slot = this.orderSlots[i];
        if (slot) {
          const ord = slot.order;
          const pot = this.currentPot;
          if (pot.noodleId === ord.noodleId &&
              pot.spicyLevel === ord.spicyLevel &&
              (!ord.toppingId || pot.toppings.includes(ord.toppingId))) {
            this.serveToSlot(i, true);
            break;
          }
        }
      }
    }

    // 3. Cún Shiba (Tạp vụ): Dọn dẹp bàn ghế, nhặt thêm tiền tip ngẫu nhiên
    if (staff.shiba && Math.random() < 0.28) {
      const extraTip = Math.floor(Math.random() * 6) + 6; // 6k - 11k
      this.state.money += extraTip;
      this.state.todayTips += extraTip;
      this.state.todayEarnings += extraTip;
      this.state.stats.tipsEarned += extraTip;
      this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + extraTip;
      this.sound.playCoinChime();
      GameUIModal.showToast(`🐶 Cún Shiba chăm chỉ lau dọn quán, nhặt được +${extraTip}k tiền tip!`, "success", "🪙");
      this.renderHeader();
    }
  }

  // Đơn hàng Online phát sinh từ Grab / Shopee
  spawnOnlineOrder() {
    if (this.state.onlineOrders.length >= 4) return;

    const apps = ["GrabFood", "ShopeeFood"];
    const app = apps[Math.floor(Math.random() * apps.length)];
    const id = Math.floor(Math.random() * 800) + 100;

    // Lấy món mì đang mở bán trong thực đơn của quán và đồ uống để tính giá thực tế theo người chơi set
    const activeNoodles = Object.values(this.state.noodles).filter(n => n.unlocked && n.inMenu);
    const chosenNoodle = activeNoodles.length > 0 ? activeNoodles[Math.floor(Math.random() * activeNoodles.length)] : this.state.noodles.my_bo;
    const noodlePrice = chosenNoodle ? chosenNoodle.price : 40;
    const noodleName = chosenNoodle ? chosenNoodle.name : "Mì cay Bò Mỹ";

    const trasua = this.state.drinks.trasua;
    const trasuaPrice = (trasua && trasua.unlocked && trasua.inMenu) ? trasua.price : 25;
    const price = noodlePrice + trasuaPrice;

    const spicyLevel = Math.floor(Math.random() * 4) + 1;
    const itemsText = `1 ${noodleName} (Cấp ${spicyLevel}) + 1 Trà sữa trân châu`;

    const order = {
      id: id,
      app: app,
      price: price,
      bowlsCount: 1,
      itemsText: itemsText,
      remainingSeconds: 20
    };

    this.state.onlineOrders.push(order);
    this.renderOnlineTab();

    // Nếu đang trong ca bán mở cửa: Hiển thị trực tiếp thẻ Shipper tới lấy niêu mì!
    if (this.state.dayPhase === "open") {
      this.activeLiveShipperOrder = order;
      const shipperCard = document.getElementById("open-mode-shipper-card");
      const priceEl = document.getElementById("open-shipper-price");
      const descEl = document.getElementById("open-shipper-desc");

      if (shipperCard && priceEl && descEl) {
        priceEl.textContent = `+${price}k`;
        descEl.textContent = `[${app}] #${id}: ${itemsText}`;
        const timerBadge = document.getElementById("open-shipper-timer");
        const timerFill = document.getElementById("open-shipper-timer-fill");
        if (timerBadge) {
          timerBadge.textContent = "⏱️ 20s";
          timerBadge.style.background = "#FFEDD5";
          timerBadge.style.color = "#C2410C";
        }
        if (timerFill) timerFill.style.width = "100%";
        shipperCard.style.display = "block";
        this.sound.playDoorBell();
      }

      // Nếu đã thuê Cáo Shiro (Thu ngân): Shiro tự động đóng gói giao Shipper sau 3.5s!
      if (this.state.staff.shiro) {
        setTimeout(() => {
          if (this.activeLiveShipperOrder === order && this.state.dayPhase === "open" && !this.isPaused) {
            this.handoverToShipper(true);
          }
        }, 3500 / this.gameSpeed);
      }
    }
  }

  // Giao đơn niêu mì trực tiếp cho Shipper Grab / Shopee
  handoverToShipper(isAutoShiro = false) {
    if (!this.activeLiveShipperOrder && this.state.onlineOrders.length === 0) {
      GameUIModal.showToast("Chưa có shipper nào đến lấy hàng!", "info", "🛵");
      return;
    }

    const order = this.activeLiveShipperOrder || this.state.onlineOrders[0];
    if (!order) return;

    this.state.money += order.price;
    this.state.deliveredOnlineCount++;
    this.state.todayEarnings += order.price;
    this.state.stats.totalRevenue = (this.state.stats.totalRevenue || 0) + order.price;
    this.state.stats.bowlsServed += order.bowlsCount || 1;

    // Loại khỏi danh sách online
    const idx = this.state.onlineOrders.indexOf(order);
    if (idx >= 0) {
      this.state.onlineOrders.splice(idx, 1);
    }
    this.activeLiveShipperOrder = null;

    // Ẩn thẻ shipper
    const shipperCard = document.getElementById("open-mode-shipper-card");
    if (shipperCard) shipperCard.style.display = "none";

    this.sound.playCoinChime();
    if (isAutoShiro) {
      GameUIModal.showToast(`🦊 Cáo Shiro đã đóng gói giao đơn cho Shipper ${order.app}! (+${order.price}k)`, "success", "🛵");
    } else {
      GameUIModal.showToast(`🛵 Đã giao niêu mì cho Shipper ${order.app}! Nhận +${order.price}k`, "success", "✨");
    }

    this.saveGame();
    this.renderHeader();
    this.renderOnlineTab();
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

  endDay() {
    if (this.dayTimerInterval) clearInterval(this.dayTimerInterval);
    if (this.customerInterval) clearInterval(this.customerInterval);
    if (this.onlineOrderInterval) clearInterval(this.onlineOrderInterval);
    if (this.staffAutomationInterval) clearInterval(this.staffAutomationInterval);

    this.activeLiveShipperOrder = null;
    const shipperCard = document.getElementById("open-mode-shipper-card");
    if (shipperCard) shipperCard.style.display = "none";

    this.state.dayPhase = "prep";
    this.state.hasBrewedToday = false;
    this.state.todaySupplySpent = 0;
    this.orderSlots = [null, null, null];
    this.clearCurrentPot();

    // Chuyển view lại prep view
    const prepView = document.getElementById("view-prep-mode");
    const openView = document.getElementById("view-open-mode");
    if (prepView) prepView.style.display = "block";
    if (openView) openView.style.display = "none";

    // Chi phí mặt bằng & điện nước vận hành (từ Ngày 2 trở đi để game có độ thử thách thực tế)
    const rentCost = this.state.day === 1 ? 0 : Math.min(120, 25 + (this.state.day - 1) * 15);
    this.state.todayRentCost = rentCost;
    if (rentCost > 0) {
      this.state.money = Math.max(0, this.state.money - rentCost);
    }

    this.showDaySummaryModal();
    this.state.day += 1;
    this.saveGame();
    this.renderAll();
  }

  showDaySummaryModal() {
    const modal = document.getElementById("modal-day-summary");
    const titleEl = document.getElementById("day-summary-title");
    const bodyEl = document.getElementById("day-summary-body");

    const rentCost = this.state.todayRentCost || 0;
    const netProfit = this.state.todayEarnings - rentCost;

    if (titleEl) titleEl.textContent = `🎉 Kết Quả Ngày ${this.state.day}`;
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px; padding: 10px 0;">
          <div style="display: flex; justify-content: space-between; font-weight: 700;">
            <span>Số tô mì đã bán:</span>
            <span>${this.state.todayBowlsSold} tô 🍜</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 700;">
            <span>Doanh thu bán mỳ:</span>
            <span style="color: var(--accent-money);">+${txaformat.formatVND(this.state.todayEarnings - this.state.todayTips)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 700;">
            <span>Tiền tip của khách:</span>
            <span style="color: var(--accent-berry);">+${txaformat.formatVND(this.state.todayTips)} 💖</span>
          </div>
          ${rentCost > 0 ? `
            <div style="display: flex; justify-content: space-between; font-weight: 700; color: #E74C3C;">
              <span>Chi phí điện nước & mặt bằng:</span>
              <span>-${txaformat.formatVND(rentCost)} ⚡</span>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #27AE60; font-weight: 700;">
              <span>Hỗ trợ ngày khai trương:</span>
              <span>Miễn phí mặt bằng ✨</span>
            </div>
          `}
          <hr style="border: none; border-top: 1px solid var(--border-subtle);" />
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800;">
            <span>Lợi nhuận ròng ngày:</span>
            <span style="color: ${netProfit >= 0 ? '#258A6D' : '#E74C3C'};">${netProfit >= 0 ? '+' : ''}${txaformat.formatVND(netProfit)} 🪙</span>
          </div>
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
    document.querySelectorAll(".nav-grid-btn").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-tab") === tabId);
    });

    document.querySelectorAll(".tab-pane").forEach(p => {
      p.classList.toggle("active", p.id === tabId);
    });

    if (tabId === "tab-kho") this.renderKhoTab();
    if (tabId === "tab-menu") this.renderMenuTab();
    if (tabId === "tab-price") this.renderPriceTab();
    if (tabId === "tab-upgrades") this.renderUpgradesTab();
    if (tabId === "tab-staff") this.renderStaffTab();
    if (tabId === "tab-online") this.renderOnlineTab();
    if (tabId === "tab-collection") this.renderCollectionTab();
    if (tabId === "tab-summary") this.renderSummaryTab();

    this.sound.playButtonClick();
  }
}
