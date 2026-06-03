/**
 * AnimeDex Universal Streaming Proxy — Cloudflare Worker
 * ═══════════════════════════════════════════════════════
 * Handles all CDNs used by AnimeDex sources with correct referers.
 *
 * Usage: GET /?url=<encoded_url>&referer=<optional_referer>
 *
 * Deploy: Cloudflare Dashboard → Workers → Create → paste this → Deploy
 */

// ── CDN → Referer mapping ─────────────────────────────────────────────────────
const CDN_REFERERS = {
  // AnimePahe / Kiwi (kwik.cx CDN)
  "owocdn.top": "https://kwik.cx/",
  "uwucdn.top": "https://kwik.cx/",
  "kwik.cx": "https://kwik.cx/",
  "kwik.si": "https://kwik.cx/",
  "pahe.win": "https://kwik.cx/",

  // AniWaves (burntburst CDN)
  "burntburst45.store": "https://play.echovideo.ru/",
  "burntburst": "https://play.echovideo.ru/",

  // StreamX / Filmu / AniChi (mewstream CDN)
  "mewstream.buzz": "https://megaplay.buzz/",
  "mewcdn": "https://megaplay.buzz/",
  "flareon.click": "https://megaplay.buzz/",

  // Filmu alternate CDN
  "watching.onl": "https://vidwish.live/",
  "cinewave2.site": "https://megaplay.buzz/",
  "cinewave": "https://megaplay.buzz/",

  // AniDB (kiwi provider via anidap)
  "anidb.app": "https://anidb.app/",
  "hls.anidb.app": "https://anidb.app/",

  // Anidap CDNs (mimi/beep providers)
  "24stream.xyz": "https://allanime.day/",
  "hawk.24stream.xyz": "https://allanime.day/",
  "bd.24stream.xyz": "https://allanime.day/",

  // Anidap (mochi provider)
  "fast4speed.rsvp": "https://animex.one/",

  // AllAnime / Miku provider
  "newterrafoods.store": "https://allanime.uns.bio/",
  "allanime.uns.bio": "https://allanime.uns.bio/",

  // Animeonsen / Vee provider
  "animeonsen.xyz": "https://www.animeonsen.xyz/",

  // Anizone CDN
  "vid-cdn.xyz": "https://anizone.to/",

  // AnimeGG
  "animegg.org": "https://animegg.org/",

  // Animelok CDN
  "as-cdn": "https://as-cdn21.top/",
  "zephyrflick": "https://as-cdn21.top/",

  // KickAssAnime
  "duckstream": "https://kaa.lt/",
  "birdstream": "https://kaa.lt/",
  "kaa.lt": "https://kaa.lt/",

  // AllManga
  "allanimenews.com": "https://allmanga.to/",
  "allanime": "https://allmanga.to/",
};

function getRefererForHost(hostname) {
  const h = hostname.toLowerCase();
  for (const [pattern, referer] of Object.entries(CDN_REFERERS)) {
    if (h.includes(pattern)) return referer;
  }
  return null;
}

// ── CORS headers ──────────────────────────────────────────────────────────────
function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range, Content-Type, Origin",
    "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
    ...extra,
  };
}

// ── M3U8 rewriter ─────────────────────────────────────────────────────────────
function isM3U8(url, contentType) {
  const ct = (contentType || "").toLowerCase();
  return url.includes(".m3u8") || ct.includes("mpegurl") || ct.includes("x-mpegurl");
}

function rewriteM3U8(text, manifestUrl, referer, workerOrigin) {
  const base = new URL(manifestUrl);

  function abs(raw) {
    const t = raw.trim();
    if (!t || t.startsWith("data:") || t.startsWith("blob:")) return raw;
    if (t.startsWith("https://") || t.startsWith("http://")) return t;
    if (t.startsWith("//")) return base.protocol + t;
    if (t.startsWith("/")) return `${base.protocol}//${base.host}${t}`;
    const dir = base.href.substring(0, base.href.lastIndexOf("/") + 1);
    try { return new URL(t, dir).href; } catch { return raw; }
  }

  function toProxy(raw) {
    try {
      const absolute = abs(raw);
      const p = new URLSearchParams({ url: absolute });
      if (referer) p.set("referer", referer);
      return `${workerOrigin}/?${p}`;
    } catch { return raw; }
  }

  function isSubM3U8(t) {
    const u = t.trim().toLowerCase().split("?")[0];
    return u.endsWith(".m3u8") || u.includes(".m3u8");
  }

  return text.split("\n").map((line) => {
    const t = line.trim();
    if (!t) return line;

    if (t.startsWith("#")) {
      // Rewrite URI= in tags (keys, maps, media tracks)
      return line.replace(/URI="([^"]+)"/g, (_, u) =>
        u.startsWith("data:") ? `URI="${u}"` : `URI="${toProxy(u)}"`
      );
    }

    if (t.startsWith("data:") || t.startsWith("blob:")) return line;

    // Sub-manifests → proxy; plain segments → also proxy (ensures referer is correct)
    return toProxy(t);
  }).join("\n");
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    // Health check
    if (url.pathname === "/" && !url.searchParams.has("url")) {
      return Response.json(
        { ok: true, service: "animedex-universal-proxy", version: "4.0", sources: Object.keys(CDN_REFERERS).length },
        { headers: cors() }
      );
    }

    // ── /proxy or /?url=... ───────────────────────────────────────────────────
    const rawUrl = url.searchParams.get("url");
    const customReferer = url.searchParams.get("referer") || "";

    if (!rawUrl) {
      return Response.json({ error: "url param required" }, { status: 400, headers: cors() });
    }

    let target;
    try { target = new URL(decodeURIComponent(rawUrl)); }
    catch { return Response.json({ error: "Invalid URL" }, { status: 400, headers: cors() }); }

    if (!["http:", "https:"].includes(target.protocol)) {
      return Response.json({ error: "Only http/https" }, { status: 400, headers: cors() });
    }

    // Determine the correct referer
    const effectiveReferer = customReferer
      ? decodeURIComponent(customReferer)
      : getRefererForHost(target.hostname) || `${target.protocol}//${target.hostname}/`;

    // Build upstream headers
    const upHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "identity",
      "Referer": effectiveReferer,
      "Origin": new URL(effectiveReferer).origin,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
    };

    // Special headers for specific CDNs
    if (target.hostname.includes("anidb.app")) {
      upHeaders["Origin"] = "https://anidb.app";
      upHeaders["Referer"] = "https://anidb.app/";
    }

    if (target.hostname.includes("newterrafoods.store")) {
      upHeaders["User-Agent"] = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36";
    }

    // Pass through Range header for byte-range requests
    const range = request.headers.get("range");
    if (range) upHeaders["Range"] = range;

    // HEAD request
    if (request.method === "HEAD") {
      try {
        const up = await fetch(target.toString(), { method: "HEAD", headers: upHeaders, redirect: "follow" });
        const h = new Headers(cors());
        for (const hdr of ["content-type", "content-length", "accept-ranges", "cache-control"]) {
          const v = up.headers.get(hdr); if (v) h.set(hdr, v);
        }
        if (!h.has("accept-ranges")) h.set("accept-ranges", "bytes");
        return new Response(null, { status: up.ok ? 200 : up.status, headers: h });
      } catch { return new Response(null, { status: 502, headers: cors() }); }
    }

    // GET request
    try {
      const upstream = await fetch(target.toString(), { headers: upHeaders, redirect: "follow" });

      if (!upstream.ok && upstream.status !== 206) {
        return new Response(
          `Upstream ${upstream.status} from ${target.hostname}`,
          { status: upstream.status, headers: cors({ "Content-Type": "text/plain" }) }
        );
      }

      const contentType = upstream.headers.get("content-type") || "";
      const workerOrigin = `${url.protocol}//${url.host}`;

      // M3U8 manifest → rewrite URLs
      if (isM3U8(target.href, contentType)) {
        const text = await upstream.text();
        const rewritten = rewriteM3U8(text, target.href, effectiveReferer, workerOrigin);
        return new Response(rewritten, {
          status: 200,
          headers: cors({
            "Content-Type": "application/vnd.apple.mpegurl",
            "Cache-Control": "public, max-age=30, s-maxage=60",
          }),
        });
      }

      // Subtitle files (.vtt, .srt, .ass)
      const isSub = contentType.includes("text/vtt") ||
        contentType.includes("text/plain") ||
        /\.(vtt|srt|ass|ssa)(\?|$)/i.test(target.pathname);
      if (isSub) {
        return new Response(upstream.body, {
          status: upstream.status,
          headers: cors({
            "Content-Type": contentType || "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          }),
        });
      }

      // Everything else — segments, keys, MP4, etc.
      const rh = new Headers(cors());
      for (const hdr of ["content-type", "content-length", "content-range", "accept-ranges", "cache-control", "etag"]) {
        const v = upstream.headers.get(hdr); if (v) rh.set(hdr, v);
      }
      if (!rh.has("accept-ranges")) rh.set("accept-ranges", "bytes");

      // Force video content-type for MP4 play URLs
      const ct = rh.get("content-type") || "";
      if (!ct && target.pathname.match(/\.mp4|\/play\//i)) rh.set("content-type", "video/mp4");

      return new Response(upstream.body, { status: upstream.status, headers: rh });

    } catch (e) {
      return Response.json(
        { error: "Upstream fetch failed", detail: e.message, host: target.hostname },
        { status: 502, headers: cors() }
      );
    }
  },
};