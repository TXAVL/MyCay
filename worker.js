// Cloudflare Worker entrypoint cho game Tiệm Mỳ Cay
// Phục vụ Static Assets trực tiếp lên domain *.workers.dev với tốc độ cao toàn cầu (Edge CDN)
// Đảm bảo không tạo ra redirect 301/302 cho root URL nhằm tránh lỗi Safari WebKit Service Worker

export default {
  async fetch(request, env) {
    let req = request;
    const url = new URL(request.url);

    // Chuẩn hóa truy cập root để nạp /index.html trực tiếp, triệt tiêu redirect
    if (url.pathname === "" || url.pathname === "/") {
      req = new Request(new URL("/index.html", request.url), request);
    }

    const response = await env.ASSETS.fetch(req);

    // Đối với html, js, css: luôn yêu cầu trình duyệt kiểm tra phiên bản mới
    if (url.pathname.endsWith(".html") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname === "/" || url.pathname === "" || url.pathname === "/manifest.json") {
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Cache-Control", "public, max-age=0, must-revalidate");
      if (url.pathname === "/sw.js" || url.pathname.endsWith("/sw.js")) {
        newHeaders.set("Service-Worker-Allowed", "/");
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    return response;
  }
};
