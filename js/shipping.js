// ==========================================================
// VẬN ĐƠN DÙNG CHUNG (issue #9): giờ trong game, dòng thời gian đơn hàng, thẻ tài xế, ảnh POD
// Dùng cho cả đơn khách đặt mỳ qua app (tiệm bán) và đơn tiệm đặt nguyên liệu online (tiệm mua)
// ==========================================================

const SHIFT_OPEN_HOUR = 10; // ca bán mở lúc 10:00
const SHIFT_HOURS = 12; // ...và đóng lúc 22:00
const PREP_OPEN_HOUR = 7; // giờ chuẩn bị buổi sáng bắt đầu lúc 07:00

const STREETS = [
  "Ngõ 12 Phố Huế", "Hẻm 45 Lê Văn Sỹ", "Chung cư Hoa Sen, tầng 8", "KTX Đại học Bách Khoa, phòng 302",
  "Số 18 Nguyễn Trãi", "Tòa văn phòng Sun Tower, lễ tân", "Hẻm 7 Trần Hưng Đạo", "Nhà trọ cô Ba, phòng 5",
  "Số 92 Hai Bà Trưng", "Chung cư Mỳ Cay Garden, block B", "Ngõ 3 Chùa Láng", "Số 210 Điện Biên Phủ"
];

const pad2 = n => String(n).padStart(2, "0");
const esc = str => String(str == null ? "" : str).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

export function randomAddress() {
  return STREETS[Math.floor(Math.random() * STREETS.length)];
}

// Mã vận đơn kiểu "SPXVN632469169"
export function makeWaybill(prefix) {
  return `${prefix}${Math.floor(100000000 + Math.random() * 900000000)}`;
}

export function timelineHtml(timeline, limit = 0) {
  const list = (timeline || []).slice().reverse();
  const shown = limit > 0 ? list.slice(0, limit) : list;
  return `<ol class="shp-timeline">${shown.map((ev, i) => `
    <li class="${i === 0 ? "is-latest" : ""} ${ev.tone ? `is-${ev.tone}` : ""}">
      <span class="shp-time">[${esc(ev.t)}]</span> ${ev.icon || ""} ${esc(ev.text)}
    </li>`).join("")}</ol>`;
}

// Thẻ bưu tá / tài xế: tên, xe, nút gọi và nút ảnh POD
export function driverCardHtml(driver, { title = "Tài xế", callAction = "", podAction = "", callLabel = "📞 Gọi tài xế" } = {}) {
  if (!driver) return "";
  return `
    <div class="shp-driver">
      <div class="shp-driver-name">🧑‍✈️ ${esc(title)}: <b>${esc(driver.name)}</b></div>
      <div class="shp-driver-sub">Phương tiện: ${esc(driver.vehicle)}</div>
      <div class="shp-driver-actions">
        <button class="shp-btn" ${callAction ? `onclick="${callAction}"` : "disabled"}>${callLabel}</button>
        <button class="shp-btn" ${podAction ? `onclick="${podAction}"` : "disabled"}>📸 Ảnh POD</button>
      </div>
    </div>`;
}

export const ShippingMethods = {
  // Giờ trong game: ca bán 10:00 → 22:00 trải đều theo thời gian ca; lúc chuẩn bị là buổi sáng 07:00 → 09:59
  getGameClock() {
    if (this.state.dayPhase === "open") {
      const total = this.dayDuration || 120;
      const progress = Math.min(1, Math.max(0, 1 - (this.dayRemaining || 0) / total));
      const mins = Math.floor(progress * SHIFT_HOURS * 60);
      return `${pad2(SHIFT_OPEN_HOUR + Math.floor(mins / 60))}:${pad2(mins % 60)}`;
    }
    if (!this.prepClockSince) this.prepClockSince = Date.now();
    // 1 giây thật = 1 phút trong game, không quá 09:59
    const mins = Math.min(179, Math.floor((Date.now() - this.prepClockSince) / 1000));
    return `${pad2(PREP_OPEN_HOUR + Math.floor(mins / 60))}:${pad2(mins % 60)}`;
  },

  // Ghi một mốc vào dòng thời gian của đơn
  logShip(order, icon, text, tone = "", at = null) {
    if (!order.timeline) order.timeline = [];
    order.timeline.push({ t: at || this.getGameClock(), day: this.state.day, icon, text, tone });
  },

  // Ảnh POD (proof of delivery): vẽ pixel cảnh túi hàng đặt trước cửa, hoặc cửa đóng nếu khách không nhận
  showPod(pod) {
    if (!pod) return;
    const overlay = document.createElement("div");
    overlay.className = "kpi-overlay";
    overlay.innerHTML = `
      <div class="kpi-card shp-pod-card">
        <h2 class="kpi-title">📸 Ảnh POD · ${esc(pod.code)}</h2>
        <canvas class="shp-pod-canvas" width="240" height="160"></canvas>
        <p class="kpi-lead">${esc(pod.caption)}</p>
        <div class="kpi-actions"><button class="kpi-btn kpi-btn-pay">Đóng</button></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector(".kpi-btn").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
    this.drawPod(overlay.querySelector("canvas"), pod);
  },

  drawPod(canvas, pod) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    let seed = 0;
    for (const ch of String(pod.code)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const pick = arr => arr[seed % arr.length];
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

    // Tường, nền gạch, cửa nhà
    px(0, 0, 240, 160, pick(["#E8D7B8", "#D9E4EC", "#EADBE6", "#DDE8D2"]));
    px(0, 128, 240, 32, "#9A8F86");
    for (let x = 0; x < 240; x += 16) px(x, 128, 1, 32, "#857A71");
    const door = pick(["#7A4A2A", "#3E5878", "#6B2E2E", "#2F5D46"]);
    px(80, 30, 80, 98, "#3A2412");
    px(84, 34, 72, 94, door);
    px(140, 80, 6, 6, "#F2C230");
    px(90, 40, 28, 36, "rgba(255,255,255,0.25)");
    px(96, 4 + 18, 48, 8, "#3A2412"); // biển số nhà
    ctx.fillStyle = "#F6E3A8";
    ctx.font = "bold 7px monospace";
    ctx.fillText(String(pod.houseNo || 18), 112, 29);
    px(70, 124, 100, 6, "#6E5A44"); // thảm chùi chân

    if (pod.failed) {
      // Khách không nhận: túi vẫn trong tay tài xế, dán giấy báo đỏ trên cửa
      px(98, 52, 44, 30, "#FFFFFF");
      px(98, 52, 44, 6, "#C0392B");
      ctx.fillStyle = "#C0392B";
      ctx.font = "bold 8px monospace";
      ctx.fillText("KHÔNG", 104, 70);
      ctx.fillText("NHẬN", 106, 79);
    } else {
      // Túi hàng màu của app trước cửa + hóa đơn kẹp trên túi
      const bag = pod.color || "#00B14F";
      px(104, 98, 34, 28, bag);
      px(104, 98, 34, 4, "rgba(0,0,0,0.25)");
      px(112, 92, 4, 8, bag);
      px(126, 92, 4, 8, bag);
      px(112, 92, 18, 3, bag);
      px(116, 106, 12, 14, "#FFFFFF");
      px(118, 109, 8, 1, "#888");
      px(118, 112, 8, 1, "#888");
      px(118, 115, 6, 1, "#888");
    }
    // Dấu thời gian kiểu camera điện thoại
    px(0, 0, 240, 14, "rgba(0,0,0,0.55)");
    ctx.fillStyle = "#FFF";
    ctx.font = "8px monospace";
    ctx.fillText(`${pod.stamp || ""}  ${pod.driver || ""}`, 4, 10);
  },
};
