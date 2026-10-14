// Cloudflare Worker entrypoint cho game Tiệm Mỳ Cay
// Phục vụ Static Assets trực tiếp lên domain *.workers.dev với tốc độ cao toàn cầu (Edge CDN)

export default {
  async fetch(request, env) {
    // Tự động phân phối static assets (index.html, styles, js, manifest...)
    return await env.ASSETS.fetch(request);
  }
};
