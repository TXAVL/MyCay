// ==========================================================
// NHIỆM VỤ HẰNG NGÀY & THÀNH TỰU TIỆM (v1.7.0)
// - 3 nhiệm vụ đổi mới mỗi ngày, độ khó tăng dần theo Ngày
// - Hoàn thành cả 3 mở Rương Thưởng Ngày
// - Thành tựu lũy kế nhiều bậc, nhận thưởng 1 lần
// Chỉ chứa dữ liệu & hàm thuần, phần hiển thị nằm trong game.js
// ==========================================================

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// metric: tên bộ đếm được cộng trong game.trackProgress()
export const QUEST_POOL = [
  {
    id: "bowls", icon: "🍜", metric: "bowls",
    target: d => clamp(6 + Math.floor(d * 1.2), 6, 32),
    title: n => `Bán ${n} tô mì tại quán`,
    reward: d => ({ money: 30 + d * 4, xp: 20 })
  },
  {
    id: "earn", icon: "💰", metric: "earn",
    target: d => clamp(Math.round((220 + d * 45) / 10) * 10, 220, 1600),
    title: n => `Kiếm ${n}k trong 1 ca bán`,
    reward: d => ({ money: 40 + d * 5, xp: 25 })
  },
  {
    id: "streak", icon: "⛓️", metric: "streak", isMax: true,
    target: d => clamp(4 + Math.floor(d / 2), 4, 15),
    title: n => `Đạt chuỗi phục vụ x${n}`,
    reward: d => ({ money: 35 + d * 4, xp: 25 })
  },
  {
    id: "speedy", icon: "⚡", metric: "speedy",
    target: d => clamp(3 + Math.floor(d / 2), 3, 14),
    title: n => `Bưng thần tốc ${n} đơn (khách còn ≥70% kiên nhẫn)`,
    reward: d => ({ money: 35 + d * 4, xp: 22 })
  },
  {
    id: "vip", icon: "👑", metric: "vip",
    target: d => clamp(1 + Math.floor(d / 5), 1, 4),
    title: n => `Phục vụ ${n} khách VIP Thần Tài`,
    reward: d => ({ money: 45 + d * 5, xp: 30 })
  },
  {
    id: "special", icon: "🌟", metric: "special",
    target: d => clamp(1 + Math.floor(d / 3), 1, 6),
    title: n => `Bán ${n} phần Món Đặc Biệt Hôm Nay`,
    reward: d => ({ money: 40 + d * 5, xp: 28 })
  },
  {
    id: "drinks", icon: "🧋", metric: "drinks",
    target: d => clamp(2 + Math.floor(d / 2), 2, 12),
    title: n => `Bán kèm ${n} ly nước cho khách tại quán`,
    reward: d => ({ money: 30 + d * 4, xp: 20 }),
    requires: g => Object.values(g.state.drinks).some(x => x.unlocked && x.inMenu)
  },
  {
    id: "spicy", icon: "🌶️", metric: "spicy",
    target: d => clamp(1 + Math.floor(d / 3), 1, 6),
    title: n => `Bán ${n} tô mì cay cấp 5 trở lên`,
    reward: d => ({ money: 35 + d * 4, xp: 22 })
  },
  {
    id: "online", icon: "🛵", metric: "online",
    target: d => clamp(1 + Math.floor(d / 3), 1, 6),
    title: n => `Giao ${n} đơn cho shipper`,
    reward: d => ({ money: 30 + d * 4, xp: 20 })
  },
  {
    id: "five_star", icon: "⭐", metric: "fiveStar",
    target: d => clamp(3 + Math.floor(d / 2), 3, 14),
    title: n => `Nhận ${n} đánh giá 5 sao`,
    reward: d => ({ money: 35 + d * 4, xp: 24 })
  },
  {
    id: "fever", icon: "🔥", metric: "fever",
    target: d => (d >= 8 ? 2 : 1),
    title: n => `Kích hoạt Giờ Vàng FEVER ${n} lần`,
    reward: d => ({ money: 40 + d * 5, xp: 28 })
  }
];

// Rương thưởng khi hoàn thành đủ 3 nhiệm vụ trong ngày
export const dailyChestReward = day => ({ money: 60 + day * 8, xp: 40 });

export function rollDailyQuests(game, day) {
  const pool = QUEST_POOL.filter(q => !q.requires || q.requires(game));
  const picked = [];
  const bag = [...pool];
  while (picked.length < 3 && bag.length > 0) {
    const i = Math.floor(Math.random() * bag.length);
    picked.push(bag.splice(i, 1)[0]);
  }
  return {
    day,
    chestClaimed: false,
    list: picked.map(q => {
      const target = q.target(day);
      return {
        id: q.id,
        icon: q.icon,
        metric: q.metric,
        isMax: Boolean(q.isMax),
        title: q.title(target),
        target,
        progress: 0,
        reward: q.reward(day),
        claimed: false
      };
    })
  };
}

// Thành tựu nhiều bậc: value(game) trả số hiện tại, mỗi bậc nhận thưởng 1 lần
const tiers = (base, list) => list.map(([target, money, xp], i) => ({
  ...base,
  id: `${base.key}_${target}`,
  tier: i + 1,
  target,
  reward: { money, xp }
}));

export const ACHIEVEMENTS = [
  ...tiers({ key: "bowls", icon: "🍜", name: "Bậc Thầy Niêu Đất", unit: "tô đã bán", value: g => g.state.stats.bowlsServed || 0 },
    [[10, 40, 30], [50, 120, 60], [200, 300, 120], [500, 700, 220], [1000, 1500, 400]]),
  ...tiers({ key: "vip", icon: "👑", name: "Người Hầu Thần Tài", unit: "khách VIP", value: g => g.state.stats.vipServed || 0 },
    [[5, 80, 40], [25, 250, 100], [100, 800, 260]]),
  ...tiers({ key: "streak", icon: "⛓️", name: "Chuỗi Không Gãy", unit: "chuỗi dài nhất", value: g => g.state.stats.bestStreak || 0 },
    [[10, 80, 50], [25, 250, 120], [50, 600, 250]]),
  ...tiers({ key: "day", icon: "📅", name: "Tiệm Lâu Năm", unit: "ngày kinh doanh", value: g => Math.max(0, (g.state.day || 1) - 1) },
    [[3, 60, 40], [7, 150, 80], [14, 350, 150], [30, 900, 300]]),
  ...tiers({ key: "revenue", icon: "💎", name: "Đại Gia Mì Cay", unit: "k doanh thu", value: g => Math.round(g.state.stats.totalRevenue || 0) },
    [[5000, 120, 60], [20000, 400, 140], [100000, 1500, 400]]),
  ...tiers({ key: "five", icon: "⭐", name: "Ngôi Sao Khu Phố", unit: "đánh giá 5 sao", value: g => g.state.stats.fiveStarReviews || 0 },
    [[20, 80, 50], [100, 300, 140], [300, 900, 300]]),
  ...tiers({ key: "online", icon: "🛵", name: "Vua Giao Hàng", unit: "đơn shipper", value: g => g.state.stats.onlineDelivered || 0 },
    [[10, 70, 40], [50, 250, 110]]),
  ...tiers({ key: "fire", icon: "🌶️", name: "Lưỡi Thép Cấp 7", unit: "tô cay cấp 6-7", value: g => g.state.stats.spicyMasterServed || 0 },
    [[10, 70, 40], [50, 250, 110]]),
  ...tiers({ key: "quests", icon: "🎯", name: "Chăm Chỉ Mỗi Ngày", unit: "nhiệm vụ", value: g => g.state.stats.questsDone || 0 },
    [[10, 100, 60], [50, 400, 160]]),
  ...tiers({ key: "collect", icon: "📖", name: "Nhà Sưu Tập Thực Khách", unit: "khách đã gặp", value: g => Object.keys(g.state.unlockedCustomers || {}).length },
    [[10, 80, 40], [27, 400, 150]])
];

export function achievementStatus(game, ach) {
  const value = ach.value(game);
  const claimed = Boolean(game.state.achievements && game.state.achievements[ach.id]);
  return { value, claimed, ready: !claimed && value >= ach.target };
}
