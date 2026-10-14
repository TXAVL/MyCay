// ==========================================================
// QUANG CẢNH ĐƯỜNG PHỐ TẤP NẬP XE CỘ (BUSTLING STREET SIMULATION)
// Mô phỏng đường phố phong cách Anime / Animal Restaurant
// - Xe hơi, xe máy giao hàng, xe buýt chạy 2 chiều nhộn nhịp
// - Khách bộ hành đi dạo trên vỉa hè ngó vào tiệm
// - Tương tác chạm còi xe toe toét & nhặt xu may mắn
// ==========================================================

import { txaformat } from "./txaformat.js";
import { GameUIModal } from "./modal.js";

export class StreetSimulation {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.container = null;
    this.vehicles = [];
    this.pedestrians = [];
    this.spawnTimer = null;
    this.pedestrianTimer = null;

    // Danh sách các loại phương tiện tấp nập
    this.vehicleTypes = [
      {
        id: "scooter",
        name: "Xe Giao Mỳ Cay",
        emoji: "🛵💨",
        speed: 5.5,
        tipChance: 0.35,
        soundTip: "Bíp bíp! Đang giao mỳ cay cấp 7 hỏa tốc!"
      },
      {
        id: "car_yellow",
        name: "Xe Con Anime Vàng",
        emoji: "🚕💨",
        speed: 6.8,
        tipChance: 0.25,
        soundTip: "Pim pim! Xe du khách ghé phố ẩm thực!"
      },
      {
        id: "bus",
        name: "Xe Buýt Mèo Tokyo",
        emoji: "🚌💨",
        speed: 4.2,
        tipChance: 0.45,
        soundTip: "Kétt! Xe buýt đưa đoàn khách đến ăn mỳ!"
      },
      {
        id: "bike",
        name: "Xe Đạp Thỏ Con",
        emoji: "🚲🌸",
        speed: 3.2,
        tipChance: 0.2,
        soundTip: "Kính coong! Đi dạo ngắm hoa anh đào!"
      },
      {
        id: "truck",
        name: "Xe Tải Chở Kim Chi",
        emoji: "🚚💨",
        speed: 4.8,
        tipChance: 0.3,
        soundTip: "Bíp bíp! Giao 50kg bò Mỹ và kim chi cho tiệm!"
      },
      {
        id: "sports_car",
        name: "Siêu Xe Đỏ Rực",
        emoji: "🏎️💨",
        speed: 8.5,
        tipChance: 0.5,
        soundTip: "Vrooom! Dân chơi đi ăn mỳ cay cấp 7!"
      }
    ];

    // Người đi bộ dạo phố ngó tiệm
    this.pedestrianQuotes = [
      "Mùi mỳ cay thơm nức mũi luôn nè! 🤤",
      "Hôm nay lạnh, vào làm tô cấp 3 là ấm bụng! 🍜",
      "Quán này đông khách quá, review 5 sao rần rần! ⭐",
      "Trà sữa boba ở đây nghe nói giải cay đỉnh lắm! 🧋",
      "Tối nay phải rủ bạn thân ghé thử thách cấp 7! 🔥",
      "Decor đèn lồng hoa anh đào xinh xỉu! 🌸"
    ];

    this.pedestrianAvatars = ["🐱", "🐕", "🐰", "🐼", "🦊", "🐻", "🐹", "🐧"];
  }

  init() {
    this.container = document.getElementById("bustling-street-viewport");
    if (!this.container) return;

    this.renderStreetFramework();
    this.startTrafficEngine();
  }

  renderStreetFramework() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="street-sky-backdrop">
        <span class="street-floating-cloud cloud-a">☁️</span>
        <span class="street-floating-cloud cloud-b">☁️</span>
        <div class="street-urban-buildings">
          <span>🏬</span><span>🏮</span><span>🏪</span><span>⛩️</span><span>🌸</span><span>🏢</span><span>🌸</span><span>🏪</span>
        </div>
      </div>

      <!-- Vỉa hè cho người đi dạo phố -->
      <div class="street-sidewalk-lane">
        <div class="street-lamp-post" title="Đèn lồng phố đêm">🏮</div>
        <div class="street-pedestrian-track" id="pedestrian-track"></div>
        <div class="street-decor-elements">
          <span class="street-vending" title="Máy bán nước tự động">🧃</span>
          <span class="street-bench" title="Ghế nghỉ ven đường">🪑</span>
          <span class="street-cherry-tree" title="Cây hoa anh đào">🌸</span>
        </div>
      </div>

      <!-- Lòng đường 2 làn xe chạy tấp nập -->
      <div class="street-roadway">
        <div class="road-lane lane-eastbound" id="lane-eastbound">
          <!-- Xe chạy hướng Đông (Trái sang Phải) -->
        </div>
        <div class="road-marking-divider"></div>
        <div class="road-lane lane-westbound" id="lane-westbound">
          <!-- Xe chạy hướng Tây (Phải sang Trái) -->
        </div>
        <div class="road-crosswalk-stripes" title="Vạch qua đường đi bộ"></div>
      </div>
    `;
  }

  startTrafficEngine() {
    if (this.spawnTimer) clearInterval(this.spawnTimer);
    if (this.pedestrianTimer) clearInterval(this.pedestrianTimer);

    // Bắt đầu thả vài xe đầu tiên ngay lập tức
    this.spawnVehicle("east");
    setTimeout(() => this.spawnVehicle("west"), 800);
    this.spawnPedestrian();

    // Vòng lặp liên tục tạo xe cộ tấp nập mỗi 2.2 - 3.8 giây
    this.spawnTimer = setInterval(() => {
      const direction = Math.random() > 0.5 ? "east" : "west";
      this.spawnVehicle(direction);
    }, 2400);

    // Vòng lặp thả người đi bộ mỗi 3.5 giây
    this.pedestrianTimer = setInterval(() => {
      this.spawnPedestrian();
    }, 3600);
  }

  spawnVehicle(direction = "east") {
    const lane = document.getElementById(direction === "east" ? "lane-eastbound" : "lane-westbound");
    if (!lane) return;

    const vType = this.vehicleTypes[Math.floor(Math.random() * this.vehicleTypes.length)];
    const el = document.createElement("div");
    el.className = `street-vehicle-actor vehicle-${direction}`;
    
    // Đảo hướng emoji nếu xe chạy ngược lại
    const flipStyle = direction === "west" ? "transform: scaleX(-1);" : "";
    el.innerHTML = `
      <span class="vehicle-sprite" style="${flipStyle}">${vType.emoji}</span>
      <span class="vehicle-sound-bubble">🚗</span>
    `;

    // Tính toán tốc độ chạy qua đường (từ 4s đến 8s)
    const animDuration = (12 - vType.speed) * (1 / (this.game ? this.game.gameSpeed : 1));
    el.style.animationDuration = `${Math.max(2.5, animDuration)}s`;

    // Tương tác khi người chơi bấm vào xe
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      this.handleVehicleClick(el, vType);
    });

    lane.appendChild(el);

    // Tự động dọn dẹp node sau khi xe chạy hết màn hình
    setTimeout(() => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, animDuration * 1000 + 500);
  }

  handleVehicleClick(el, vType) {
    if (this.game && this.game.sound) {
      this.game.sound.playButtonClick();
    }

    // Hiển thị bóng thoại còi xe
    const soundBubble = el.querySelector(".vehicle-sound-bubble");
    if (soundBubble) {
      soundBubble.textContent = "Bíp bíp! 💨";
      soundBubble.classList.add("show-bubble");
      setTimeout(() => soundBubble.classList.remove("show-bubble"), 1200);
    }

    // Tỉ lệ nhận được tiền tip may mắn từ xe qua đường
    if (Math.random() < vType.tipChance && this.game) {
      const luckyCoins = Math.floor(Math.random() * 25) + 15; // 15k - 40k
      this.game.state.money += luckyCoins;
      this.game.saveGame();
      this.game.renderHeaderStats();

      if (this.game.sound) {
        this.game.sound.playCoinChime();
      }

      GameUIModal.spawnFloatingFx(el, `+${txaformat.formatShort(luckyCoins)} 🪙`, true);
      GameUIModal.showToast(`${vType.name}: ${vType.soundTip} Tặng tip +${txaformat.formatShort(luckyCoins)} 🪙!`, "coin", "🎉");
    }
  }

  spawnPedestrian() {
    const track = document.getElementById("pedestrian-track");
    if (!track) return;

    const avatar = this.pedestrianAvatars[Math.floor(Math.random() * this.pedestrianAvatars.length)];
    const quote = this.pedestrianQuotes[Math.floor(Math.random() * this.pedestrianQuotes.length)];
    const direction = Math.random() > 0.5 ? "left-to-right" : "right-to-left";

    const pEl = document.createElement("div");
    pEl.className = `pedestrian-walker-node walker-${direction}`;
    pEl.innerHTML = `
      <span class="walker-avatar">${avatar}</span>
      <div class="walker-thought-cloud">${quote}</div>
    `;

    const walkDuration = Math.floor(Math.random() * 5) + 9; // 9s - 14s
    pEl.style.animationDuration = `${walkDuration}s`;

    pEl.addEventListener("click", () => {
      if (this.game && this.game.sound) {
        this.game.sound.playDoorBell();
      }
      const cloud = pEl.querySelector(".walker-thought-cloud");
      if (cloud) {
        cloud.classList.add("force-show-cloud");
        setTimeout(() => cloud.classList.remove("force-show-cloud"), 2000);
      }
    });

    track.appendChild(pEl);

    setTimeout(() => {
      if (pEl && pEl.parentNode) {
        pEl.parentNode.removeChild(pEl);
      }
    }, walkDuration * 1000 + 500);
  }
}
