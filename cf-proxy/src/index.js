export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // Health check
    if (url.pathname === "/crysoline-health") {
      const res = await fetch("https://api.crysoline.moe/health");
      return new Response(res.body, {
        status: res.status,
        headers: { ...corsHeaders(), "Cache-Control": "public, max-age=60" },
      });
    }

    // Proxy
    if (url.pathname === "/proxy") {
      const target   = url.searchParams.get("url");
      const referer  = url.searchParams.get("referer") || target;

      if (!target) {
        return new Response("Missing url param", { status: 400, headers: corsHeaders() });
      }

      const res = await fetch(target, {
        headers: {
          "Referer":    referer,
          "Origin":     new URL(target).origin,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const newHeaders = new Headers(res.headers);
      Object.entries(corsHeaders()).forEach(([k, v]) => newHeaders.set(k, v));

      return new Response(res.body, {
        status:  res.status,
        headers: newHeaders,
      });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders() });
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range",
  };
}
