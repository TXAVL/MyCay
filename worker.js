// Cloudflare Worker entrypoint cho game Tiệm Mỳ Cay
// Phục vụ Static Assets trực tiếp lên domain *.workers.dev với tốc độ cao toàn cầu (Edge CDN)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);

    // Đối với html, js, css: luôn yêu cầu trình duyệt kiểm tra phiên bản mới
    if (url.pathname.endsWith(".html") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname === "/") {
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Cache-Control", "public, max-age=0, must-revalidate");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    return response;
  }
};
