// Service Worker cho Tiệm Mỳ Cay & Trà Sữa Boba v2.0.0
// Hỗ trợ chơi game 100% Offline không cần mạng sau lần tải đầu tiên
// Khắc phục triệt để lỗi "Response served by service worker has redirections" & lỗi WebKit Offline trên Safari iOS

const CACHE_NAME = "mycay-pwa-v2.3.0";

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./styles/main.css",
  "./styles/main.css?v=2.3.0",
  "./styles/game-skin.css",
  "./styles/game-skin.css?v=2.3.0",
  "./js/app.js",
  "./js/app.js?v=2.3.0",
  "./js/game.js",
  "./js/game.js?v=2.3.0",
  "./js/audio.js",
  "./js/audio.js?v=2.3.0",
  "./js/modal.js",
  "./js/modal.js?v=2.3.0",
  "./js/shop-scene.js",
  "./js/shop-scene.js?v=2.3.0",
  "./js/reviews.js",
  "./js/reviews.js?v=2.3.0",
  "./js/backup.js",
  "./js/backup.js?v=2.3.0",
  "./js/integrity.js",
  "./js/integrity.js?v=2.3.0",
  "./js/world-map.js",
  "./js/world-map.js?v=2.3.0",
  "./js/pixel-interior.js",
  "./js/pixel-interior.js?v=2.3.0",
  "./js/pixel-sprites.js",
  "./js/pixel-sprites.js?v=2.3.0",
  "./js/quests.js",
  "./js/quests.js?v=2.3.0",
  "./js/market.js",
  "./js/market.js?v=2.3.0",
  "./js/hr.js",
  "./js/hr.js?v=2.3.0",
  "./js/finance.js",
  "./js/finance.js?v=2.3.0",
  "./js/street.js",
  "./js/txacoachmark.js",
  "./js/txaformat.js",
  "./js/txaformat.js?v=2.3.0",
  "./js/txaqr.js",
  "./js/txatheme.js",
  "./js/txaversion.js",
  "./js/txaversion.js?v=2.3.0",
  "./js/filter.js",
  "./js/filter.js?v=2.3.0",
  "./js/realtime-stats.js",
  "./js/realtime-stats.js?v=2.3.0",
  "./js/security-shield.js",
  "./js/security-shield.js?v=2.3.0",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "./assets/favicon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/logo.png",
  "./assets/banner.jpg",
  "./assets/interior.jpg",
  "./assets/cust_bear.png",
  "./assets/cust_bunny.png",
  "./assets/cust_cat.png",
  "./assets/cust_fox.png",
  "./assets/cust_hamster.png",
  "./assets/cust_panda.png",
  "./assets/cust_shiba.png",
  "./assets/cust_tiger.png",
  "./assets/staff_ducky.png",
  "./assets/staff_fawn.png",
  "./assets/staff_kenji.png",
  "./assets/staff_mochi.png",
  "./assets/staff_owl.png",
  "./assets/staff_shiba.png",
  "./assets/staff_usagi.png"
];

// Hàm loại bỏ cờ redirect để triệt tiêu lỗi "Response served by service worker has redirections" trên Safari WebKit
function cleanResponse(response) {
  if (!response) return response;
  // Safari WebKit sẽ throw error nếu Service Worker trả về Response có redirected = true hoặc opaqueredirect cho navigation
  if (response.redirected || response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
    const cleanHeaders = new Headers(response.headers);
    return new Response(response.body, {
      status: response.status === 200 || response.ok ? 200 : response.status,
      statusText: response.statusText || "OK",
      headers: cleanHeaders
    });
  }
  return response;
}

// Cài đặt Service Worker và lưu trước toàn bộ tài nguyên
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Nạp và lưu index.html chuẩn sạch (không mang cờ redirected) cho cả "./" và "./index.html"
      try {
        const indexRes = await fetch("./index.html");
        if (indexRes.ok) {
          const bodyBlob = await indexRes.blob();
          const clean1 = new Response(bodyBlob, {
            status: 200,
            statusText: "OK",
            headers: indexRes.headers
          });
          const clean2 = new Response(bodyBlob, {
            status: 200,
            statusText: "OK",
            headers: indexRes.headers
          });
          await cache.put("./index.html", clean1);
          await cache.put("./", clean2);
        }
      } catch (err) {
        console.warn("[SW] Lỗi nạp trước index.html:", err);
      }

      // Precache các tài nguyên còn lại
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (assetUrl) => {
          try {
            const res = await fetch(assetUrl);
            if (res.ok) {
              const clean = new Response(await res.blob(), {
                status: 200,
                statusText: "OK",
                headers: res.headers
              });
              await cache.put(assetUrl, clean);
            }
          } catch (e) {
            console.warn("[SW] Bỏ qua tài nguyên phụ chưa tải được:", assetUrl);
          }
        })
      );
    })().then(() => self.skipWaiting())
  );
});

// Kích hoạt Service Worker và dọn dẹp các bản cache cũ
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Dọn dẹp cache cũ:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Điều phối yêu cầu mạng: Hỗ trợ Offline 100% & Khắc phục lỗi Redirect Safari
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Bỏ qua các giao thức không phải HTTP/HTTPS (vd: chrome-extension, data:)
  if (!req.url.startsWith("http://") && !req.url.startsWith("https://")) {
    return;
  }

  // Bỏ qua toàn bộ request không phải GET (POST/PUT/DELETE/RPC gửi thẳng qua mạng)
  if (req.method !== "GET") {
    return;
  }

  // Bỏ qua các API Supabase RPC thực thi trực tiếp qua mạng (nếu mất mạng thì code game đã có fallback rỗng)
  try {
    const url = new URL(req.url);
    if (url.hostname.includes("supabase.co") && url.pathname.includes("/rpc/")) {
      return;
    }
    if (url.hostname.includes("country.is") || url.hostname.includes("ipwho.is")) {
      return;
    }
  } catch (e) {}

  // 1. ĐIỀU HƯỚNG TRANG (HTML NAVIGATION):
  // Xử lý đặc thù cho Safari iOS: Cache First cho Navigation!
  // Đảm bảo khi tắt mạng WiFi/4G, iOS Safari standalone WebKit mở lập tức từ Cache không bị Native Error
  if (req.mode === "navigate" || (req.headers.get("accept") && req.headers.get("accept").includes("text/html"))) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // ƯU TIÊN MATCH CACHE TRƯỚC ĐỂ iOS SAFARI MỞ NGAY LẬP TỨC 100% OFFLINE
        const cachedHtml = 
          (await cache.match("./index.html", { ignoreSearch: true })) ||
          (await cache.match("index.html", { ignoreSearch: true })) ||
          (await cache.match("./", { ignoreSearch: true })) ||
          (await caches.match(req, { ignoreSearch: true }));

        if (cachedHtml) {
          // Nếu đang có mạng: Cập nhật ngầm cache index.html ở background
          if (navigator.onLine) {
            fetch(req).then(async (netRes) => {
              if (netRes && netRes.status === 200) {
                const bodyBlob = await netRes.blob();
                const cleanCached = new Response(bodyBlob, {
                  status: 200,
                  statusText: "OK",
                  headers: netRes.headers
                });
                await cache.put("./index.html", cleanCached);
              }
            }).catch(() => {});
          }
          return cleanResponse(cachedHtml);
        }

        // Nếu máy chưa có cache (lần mở web đầu tiên), tải từ mạng
        try {
          const networkResponse = await fetch(req);
          if (networkResponse && networkResponse.status === 200) {
            const bodyBlob = await networkResponse.clone().blob();
            const cleanCached = new Response(bodyBlob, {
              status: 200,
              statusText: "OK",
              headers: networkResponse.headers
            });
            await cache.put("./index.html", cleanCached);
          }
          return cleanResponse(networkResponse);
        } catch (err) {
          // Trang thông báo nếu chưa từng nạp cache
          return new Response(
            `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tiệm Mỳ Cay - Ngoại Tuyến</title><style>body{font-family:sans-serif;text-align:center;padding:40px;background:#FAF5ED;color:#3B2110;line-height:1.6;}h1{color:#C4385E;margin-bottom:10px;}p{font-size:15px;color:#664C3B;margin-bottom:20px;}button{padding:12px 24px;border-radius:12px;background:#C4385E;color:#fff;border:none;font-size:15px;font-weight:bold;cursor:pointer;box-shadow:0 4px 12px rgba(196,56,94,0.3);}</style></head><body><h1>🍜 Tiệm Mỳ Cay</h1><p>Bạn đang ở chế độ Ngoại Tuyến (Offline).<br>Vui lòng kết nối mạng một lần để tải toàn bộ tài nguyên game vào máy nhé!</p><button onclick="location.reload()">🔄 Tải Lại Trang</button></body></html>`,
            {
              status: 200,
              headers: { "Content-Type": "text/html; charset=utf-8" }
            }
          );
        }
      })()
    );
    return;
  }

  // 2. CÁC TÀI NGUYÊN TĨNH KHÁC (CSS, JS, ẢNH, FONTS, CDN):
  event.respondWith(
    (async () => {
      // Tìm trong cache trước (kèm ignoreSearch: true để bắt trúng query ?v=2.3.0)
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) {
        // Cập nhật ngầm nếu có mạng
        if (navigator.onLine) {
          fetch(req).then(async (netRes) => {
            if (netRes && netRes.status === 200) {
              const cache = await caches.open(CACHE_NAME);
              const clean = new Response(await netRes.blob(), {
                status: 200,
                statusText: "OK",
                headers: netRes.headers
              });
              await cache.put(req, clean);
            }
          }).catch(() => {});
        }
        return cleanResponse(cached);
      }

      // Chưa có trong cache: Fetch từ mạng
      try {
        const netRes = await fetch(req);
        if (netRes && netRes.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          const clean = new Response(await netRes.clone().blob(), {
            status: 200,
            statusText: "OK",
            headers: netRes.headers
          });
          await cache.put(req, clean);
        }
        return cleanResponse(netRes);
      } catch (err) {
        // Fallback khi offline cho ảnh
        if (req.destination === "image") {
          const fallbackIcon = await caches.match("./assets/favicon.png");
          if (fallbackIcon) return cleanResponse(fallbackIcon);
        }
        return new Response("", { status: 408, statusText: "Offline" });
      }
    })()
  );
});
