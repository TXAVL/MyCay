// Service Worker cho Tiệm Mỳ Cay & Trà Sữa Boba v1.5.0
// Hỗ trợ chơi game 100% Offline không cần mạng sau lần tải đầu tiên

const CACHE_NAME = "mycay-pwa-v1.5.0";

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./styles/main.css",
  "./styles/main.css?v=1.5.0",
  "./js/app.js",
  "./js/game.js",
  "./js/audio.js",
  "./js/modal.js",
  "./js/street.js",
  "./js/txacoachmark.js",
  "./js/txaformat.js",
  "./js/txaqr.js",
  "./js/txatheme.js",
  "./js/txaversion.js",
  "./js/filter.js",
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

// Cài đặt Service Worker và lưu trước toàn bộ tài nguyên
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Dùng nạp từng phần để đảm bảo nếu 1 file nhỏ lỗi cũng không chặn việc cache toàn bộ game
      await Promise.allSettled(
        PRECACHE_ASSETS.map((assetUrl) =>
          cache.add(assetUrl).catch((err) => {
            console.warn("[SW] Bỏ qua tài nguyên phụ chưa tải được:", assetUrl, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
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

// Điều phối yêu cầu mạng: Ưu tiên Cache để mở nhanh tức thì không cần mạng
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Bỏ qua các giao thức không phải HTTP/HTTPS (vd: chrome-extension, data:)
  if (!req.url.startsWith("http://") && !req.url.startsWith("https://")) {
    return;
  }

  // Đối với điều hướng trang (HTML navigation):
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match("./index.html") || caches.match("./");
      })
    );
    return;
  }

  const url = new URL(req.url);

  // Tài nguyên nội bộ cùng nguồn gốc (Local Assets)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) {
          // Trả về cache ngay lập tức, đồng thời fetch ngầm để cập nhật bản mới nếu có mạng
          fetch(req).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
          }).catch(() => {
            // Không có mạng -> tiếp tục dùng cache cũ bình thường
          });
          return cachedResponse;
        }

        // Nếu chưa có trong cache thì nạp từ mạng và đưa vào cache
        return fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkResponse;
        }).catch(() => {
          // Trường hợp ảnh bị lỗi khi offline: trả về fallback nếu cần
          if (req.destination === "image") {
            return caches.match("./assets/favicon.png");
          }
        });
      })
    );
    return;
  }

  // Tài nguyên ngoại vi (Google Fonts, CDN, etc.):
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkResponse;
        }).catch(() => {
          // Ngoại tuyến: nếu font không tải được sẽ tự động fallback sang system font
          return new Response("", { status: 408, statusText: "Offline" });
        })
      );
    })
  );
});
