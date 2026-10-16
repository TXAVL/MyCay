// ==========================================================
// REAL-TIME STATS & ANTI-SPAM ANALYTICS FOR TIỆM MỲ CAY
// Powered by Supabase Realtime Channels (Presence & Postgres Changes)
// ==========================================================

const SUPABASE_URL = "https://camnragrlqzmcxtgvukj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nWBCfr-d5ZSuk5e5ULrpZQ_zVFp_nUh";

class RealtimeStats {
  constructor() {
    this.client = null;
    this.presenceChannel = null;
    this.viewsChannel = null;
    this.onlineCount = 1;
    this.totalViews = null;
    this.deviceId = this.getOrCreateDeviceId();
    this.isInitialized = false;
  }

  // Khởi tạo Device ID duy nhất cho trình duyệt (dùng làm Presence key để gom nhiều tab thành 1 người)
  getOrCreateDeviceId() {
    try {
      let id = localStorage.getItem("mycay_client_uuid");
      if (!id) {
        id = "usr_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 10);
        localStorage.setItem("mycay_client_uuid", id);
      }
      return id;
    } catch (e) {
      return "usr_guest_" + Math.random().toString(36).substring(2, 8);
    }
  }

  // Khởi động hệ thống kết nối Realtime
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Nếu đang ngoại tuyến, kích hoạt ngay chế độ offline không cần chờ mạng
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.updateOnlineUI(1);
      return;
    }

    // Đảm bảo thư viện Supabase đã sẵn sàng
    if (typeof window.supabase === "undefined") {
      await this.waitForSupabaseSdk(1200);
    }

    if (typeof window.supabase === "undefined" || typeof window.supabase.createClient !== "function") {
      this.updateOnlineUI(1);
      return;
    }

    try {
      this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });

      // 1. Kết nối theo dõi người chơi đang online (Presence Realtime)
      this.setupPresenceChannel();

      // 2. Ghi nhận và theo dõi tổng lượt truy cập thực tế (Chống spam)
      this.setupTotalViewsTracking();
    } catch (err) {
      console.error("[RealtimeStats] Lỗi khởi tạo Realtime:", err);
      this.updateOnlineUI(1);
    }
  }

  // Chờ nạp script Supabase SDK nếu chưa xong
  waitForSupabaseSdk(timeoutMs = 5000) {
    return new Promise((resolve) => {
      if (typeof window.supabase !== "undefined") return resolve();
      const start = Date.now();
      const timer = setInterval(() => {
        if (typeof window.supabase !== "undefined" || Date.now() - start > timeoutMs) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  }

  // ==========================================================
  // 1. THEO DÕI SỐ NGƯỜI ĐANG ONLINE TRỰC TIẾP (PRESENCE REALTIME)
  // ==========================================================
  setupPresenceChannel() {
    if (!this.client) return;

    // Kênh Realtime Presence với key là DeviceId duy nhất của người chơi
    this.presenceChannel = this.client.channel("mycay_live_counter", {
      config: {
        presence: {
          key: this.deviceId
        }
      }
    });

    this.presenceChannel
      .on("presence", { event: "sync" }, () => {
        try {
          const state = this.presenceChannel.presenceState();
          // Lấy danh sách các unique deviceId đang kết nối
          const uniquePlayers = Object.keys(state);
          const liveCount = Math.max(1, uniquePlayers.length);
          this.updateOnlineUI(liveCount);
        } catch (e) {
          console.error("[RealtimeStats] Lỗi đồng bộ presence:", e);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          try {
            await this.presenceChannel.track({
              online_at: new Date().toISOString(),
              platform: navigator.userAgentData?.platform || navigator.platform || "Web"
            });
          } catch (e) {
            console.error("[RealtimeStats] Lỗi gửi track presence:", e);
          }
        }
      });

    // Khi người chơi đóng tab hoặc rời khỏi trang, thoát presence ngay lập tức
    window.addEventListener("beforeunload", () => {
      if (this.presenceChannel) {
        try {
          this.presenceChannel.untrack();
        } catch (e) {}
      }
    });
  }

  // ==========================================================
  // ==========================================================
  // 2. TỔNG SỐ LƯỢT TRUY CẬP THỰC TẾ & CƠ CHẾ CHỐNG SPAM (ANTI-SPAM)
  // Ghi nhận chi tiết Thiết Bị, Trình Duyệt, Quốc Gia phục vụ Biểu Đồ Admin
  // ==========================================================
  async setupTotalViewsTracking() {
    if (!this.client) return;

    // Kiểm tra các điều kiện chống spam chặt chẽ:
    const shouldCount = this.checkShouldCountVisit();

    if (shouldCount) {
      try {
        // Thu thập thông số telemetry không xâm nhập riêng tư
        const telemetry = await this.gatherClientTelemetry();

        // Ghi nhận vào bảng mycay_visit_logs & tăng bộ đếm an toàn qua Stored Procedure
        const { data, error } = await this.client.rpc("record_mycay_visit", {
          p_device_id: telemetry.deviceId,
          p_country: telemetry.country,
          p_country_name: telemetry.countryName,
          p_city: telemetry.city,
          p_browser: telemetry.browser,
          p_device_type: telemetry.deviceType,
          p_os: telemetry.os,
          p_screen_resolution: telemetry.screenRes,
          p_language: telemetry.language
        });

        if (!error && typeof data === "number") {
          this.markVisitCounted();
          this.updateViewsUI(data);
        } else {
          // Fallback: nếu lỗi rpc record_mycay_visit thì thử increment_mycay_views cũ
          const { data: fallbackData } = await this.client.rpc("increment_mycay_views");
          if (typeof fallbackData === "number") {
            this.markVisitCounted();
            this.updateViewsUI(fallbackData);
          } else {
            await this.fetchCurrentTotalViews();
          }
        }
      } catch (e) {
        console.error("[RealtimeStats] Lỗi ghi nhận lượt xem:", e);
        await this.fetchCurrentTotalViews();
      }
    } else {
      // Nếu đã được tính trong phiên này hoặc vừa reload trong 30 phút -> Chỉ đọc số hiện tại
      await this.fetchCurrentTotalViews();
    }

    // Lắng nghe thay đổi lượt xem thời gian thực qua Postgres Changes:
    // Bất cứ khi nào có người chơi mới trên toàn cầu, toàn bộ footer của mọi người chơi khác đều nhảy số!
    try {
      this.viewsChannel = this.client
        .channel("mycay_views_broadcast")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "mycay_analytics", filter: "id=eq.mycay_game" },
          (payload) => {
            if (payload.new && typeof payload.new.total_views === "number") {
              this.updateViewsUI(payload.new.total_views);
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn("[RealtimeStats] Lỗi đăng ký kênh postgres changes:", e);
    }
  }

  // Thu thập thông số thiết bị, trình duyệt, hệ điều hành & vị trí phục vụ biểu đồ Admin
  async gatherClientTelemetry() {
    const ua = typeof navigator !== "undefined" ? (navigator.userAgent || "") : "";

    // 1. Phân loại thiết bị (Device Type: Mobile / Tablet / Desktop)
    let deviceType = "Desktop";
    const isMobileUa = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTabletUa = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) || 
      (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isTabletUa) {
      deviceType = "Tablet";
    } else if (isMobileUa || (typeof window !== "undefined" && window.innerWidth <= 640 && (navigator.maxTouchPoints || 0) > 0)) {
      deviceType = "Mobile";
    }

    // 2. Nhận diện Trình duyệt (Browser)
    let browser = "Khác";
    if (/CocCoc/i.test(ua)) {
      browser = "Cốc Cốc";
    } else if (/Edg|Edge/i.test(ua)) {
      browser = "Microsoft Edge";
    } else if (/OPR|Opera/i.test(ua)) {
      browser = "Opera";
    } else if (/SamsungBrowser/i.test(ua)) {
      browser = "Samsung Internet";
    } else if (/Chrome|CriOS/i.test(ua)) {
      browser = "Google Chrome";
    } else if (/Firefox|FxiOS/i.test(ua)) {
      browser = "Mozilla Firefox";
    } else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) {
      browser = "Apple Safari";
    } else if (/Zalo/i.test(ua)) {
      browser = "Zalo In-App";
    } else if (/FBAN|FBAV/i.test(ua)) {
      browser = "Facebook In-App";
    }

    // 3. Hệ điều hành (OS)
    let os = "Khác";
    if (/iPhone|iPad|iPod/i.test(ua) || (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      os = "iOS";
    } else if (/Android/i.test(ua)) {
      os = "Android";
    } else if (/Windows/i.test(ua)) {
      os = "Windows";
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      os = "macOS";
    } else if (/CrOS/i.test(ua)) {
      os = "ChromeOS";
    } else if (/Linux/i.test(ua)) {
      os = "Linux";
    }

    // 4. Độ phân giải màn hình & Ngôn ngữ
    const screenRes = typeof window !== "undefined" 
      ? `${window.screen?.width || window.innerWidth}x${window.screen?.height || window.innerHeight}` 
      : "unknown";
    const language = typeof navigator !== "undefined" ? (navigator.language || "vi") : "vi";

    // 5. Quốc gia (Country detection: Timezone heuristic + Lightweight API)
    let country = "VN";
    let countryName = "Việt Nam";
    let city = null;

    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (timeZone.includes("Asia/Ho_Chi_Minh") || timeZone.includes("Saigon") || language.startsWith("vi")) {
        country = "VN";
        countryName = "Việt Nam";
      } else if (timeZone.includes("Tokyo")) {
        country = "JP";
        countryName = "Nhật Bản";
      } else if (timeZone.includes("Seoul")) {
        country = "KR";
        countryName = "Hàn Quốc";
      } else if (timeZone.startsWith("America/")) {
        country = "US";
        countryName = "Hoa Kỳ";
      } else if (timeZone.startsWith("Europe/")) {
        country = "EU";
        countryName = "Châu Âu";
      }
    } catch (e) {}

    // Truy vấn API IP geolocation nhẹ với timeout ngắn (1.5s) để không làm chậm trải nghiệm
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch("https://api.country.is", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.country) {
          country = data.country.toUpperCase();
          if (country === "VN") countryName = "Việt Nam";
          else if (country === "US") countryName = "Hoa Kỳ";
          else if (country === "JP") countryName = "Nhật Bản";
          else if (country === "KR") countryName = "Hàn Quốc";
          else countryName = country;
        }
      }
    } catch (e) {
      // Giữ giá trị từ Timezone heuristic nếu offline hoặc timeout
    }

    // 6. Device ID: Tận dụng ID từ Security Shield nếu có
    let deviceId = this.deviceId;
    if (typeof window !== "undefined" && window.securityShield && window.securityShield.deviceId) {
      deviceId = window.securityShield.deviceId;
    }

    return {
      deviceId,
      country,
      countryName,
      city,
      browser,
      deviceType,
      os,
      screenRes,
      language
    };
  }

  // Kiểm tra chống spam: 1 phiên (session) chỉ tính 1 lần, và cách nhau tối thiểu 30 phút giữa các lần mở
  checkShouldCountVisit() {
    try {
      // 1. Kiểm tra session hiện tại (nếu vừa F5 / refresh trang trong cùng tab -> KHÔNG TÍNH)
      const sessionCounted = sessionStorage.getItem("mycay_view_recorded");
      if (sessionCounted === "1") {
        return false;
      }

      // 2. Kiểm tra mốc thời gian truy cập gần nhất từ thiết bị này (tối thiểu 30 phút = 1800000ms)
      const lastVisit = Number(localStorage.getItem("mycay_last_visit_time") || 0);
      const now = Date.now();
      const THIRTY_MINUTES = 30 * 60 * 1000;
      if (now - lastVisit < THIRTY_MINUTES) {
        return false;
      }

      return true;
    } catch (e) {
      return true;
    }
  }

  // Đánh dấu đã ghi nhận lượt truy cập hợp lệ
  markVisitCounted() {
    try {
      sessionStorage.setItem("mycay_view_recorded", "1");
      localStorage.setItem("mycay_last_visit_time", String(Date.now()));
    } catch (e) {}
  }

  // Lấy tổng lượt xem hiện tại từ database
  async fetchCurrentTotalViews() {
    if (!this.client) return;
    try {
      const { data, error } = await this.client
        .from("mycay_analytics")
        .select("total_views")
        .eq("id", "mycay_game")
        .single();

      if (!error && data && typeof data.total_views === "number") {
        this.updateViewsUI(data.total_views);
      }
    } catch (e) {
      console.error("[RealtimeStats] Lỗi truy vấn total_views:", e);
    }
  }

  // Lấy dữ liệu tổng hợp cho biểu đồ Trang Admin (Device, Browser, Country, Daily Trend)
  async getAdminStats() {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.rpc("get_mycay_admin_stats");
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.error("[RealtimeStats] Lỗi lấy admin stats:", e);
    }
    return null;
  }

  // ==========================================================
  // CẬP NHẬT GIAO DIỆN (UI BINDINGS)
  // ==========================================================
  updateOnlineUI(count) {
    this.onlineCount = count;
    const desktopEl = document.getElementById("footer-online-count");
    const mobileEl = document.getElementById("mobile-footer-online-count");

    [desktopEl, mobileEl].forEach((el) => {
      if (!el) return;
      el.textContent = this.formatNumber(count);
      this.triggerPulseFx(el);
    });
  }

  updateViewsUI(views) {
    this.totalViews = views;
    const desktopEl = document.getElementById("footer-views-count");
    const mobileEl = document.getElementById("mobile-footer-views-count");

    [desktopEl, mobileEl].forEach((el) => {
      if (!el) return;
      el.textContent = this.formatNumber(views);
      this.triggerPulseFx(el);
    });
  }

  formatNumber(num) {
    if (typeof num !== "number") return num;
    return num.toLocaleString("vi-VN");
  }

  triggerPulseFx(el) {
    if (!el) return;
    el.classList.remove("stat-num-pulse");
    void el.offsetWidth; // force reflow
    el.classList.add("stat-num-pulse");
    setTimeout(() => el.classList.remove("stat-num-pulse"), 600);
  }
}

// Khởi tạo Singleton Instance
export const realtimeStats = new RealtimeStats();

// Gắn vào window để hỗ trợ trang Admin và dev console
if (typeof window !== "undefined") {
  window.mycayStats = realtimeStats;
}

// Tự động kích hoạt khi DOM tải xong
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => realtimeStats.init());
  } else {
    realtimeStats.init();
  }
}
