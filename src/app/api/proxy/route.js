/**
 * GET /api/proxy?url=<encoded>&referer=<encoded>
 *
 * Full server-side proxy with CDN-specific referer handling.
 *
 * Handles:
 *  - m3u8 manifests: fetched server-side, segments rewritten to proxy through here
 *  - Segment/binary: streamed with byte-range support
 *  - CORS: all responses include Access-Control-Allow-Origin: *
 *
 * CRITICAL FIX: When running behind Nginx, request.url has host=localhost:3000.
 * We must use X-Forwarded-Host / X-Forwarded-Proto (set by Nginx) to build
 * the correct public origin for m3u8 URL rewriting. Without this, all rewritten
 * segment URLs point to localhost:3000 and fail in the browser.
 */

import { NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * Determine the public-facing origin for URL rewriting in m3u8 manifests.
 */
function getPublicOrigin(request) {
  const fwdHost  = request.headers.get("x-forwarded-host");
  const fwdProto = request.headers.get("x-forwarded-proto") || "https";
  if (fwdHost) {
    const host = fwdHost.split(",")[0].trim();
    return `${fwdProto}://${host}`;
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  const reqUrl = new URL(request.url);
  return `${reqUrl.protocol}//${reqUrl.host}`;
}

function isM3U8(url, ct) {
  return url.includes(".m3u8") || (ct || "").toLowerCase().includes("mpegurl");
}

function rewriteM3U8(text, manifestUrl, referer, origin) {
  const base = new URL(manifestUrl);

  // CDN-specific referer overrides for segment URLs
  const effectiveReferer = (base.hostname.includes("owocdn.top") || base.hostname.includes("uwucdn.top"))
    ? "https://kwik.cx/"
    : base.hostname.includes("vid-cdn.xyz")
    ? "https://anizone.to/"
    : base.hostname.includes("burntburst45.store") || base.hostname.includes("burntburst")
    ? "https://play.echovideo.ru/"
    : base.hostname.includes("mewstream") || base.hostname.includes("mewcdn")
    ? "https://megaplay.buzz/"
    : base.hostname.includes("flareon.click")
    ? "https://hikari.gg/"
    : base.hostname.includes("kuro.gg") || base.hostname.includes("anichi")
    ? "https://anichi.me/"
    : base.hostname.includes("anidb.app")
    ? "https://anidb.app/"
    : base.hostname.includes("cinewave2.site") || base.hostname.includes("cinewave")
    ? "https://megaplay.buzz/"
    : base.hostname.includes("newterrafoods.store")
    ? "https://allanime.uns.bio/"
    : base.hostname.includes("animeonsen.xyz")
    ? "https://www.animeonsen.xyz/"
    : referer;

  function abs(raw) {
    const t = raw.trim();
    if (!t || t.startsWith("data:") || t.startsWith("blob:")) return raw;
    if (t.startsWith("https://") || t.startsWith("http://")) return t;
    if (t.startsWith("//")) return base.protocol + t;
    if (t.startsWith("/")) return base.protocol + "//" + base.host + t;
    const dir = base.href.substring(0, base.href.lastIndexOf("/") + 1);
    try { return new URL(t, dir).href; } catch { return raw; }
  }

  function toProxy(raw) {
    const absolute = abs(raw.trim());
    if (absolute.includes("/api/proxy?")) return raw;
    try {
      const p = new URLSearchParams({ url: absolute });
      if (effectiveReferer) p.set("referer", effectiveReferer);
      return origin + "/api/proxy?" + p.toString();
    } catch { return raw; }
  }

  function rewriteTagLine(line) {
    return line.replace(/URI="([^"]+)"/g, function(_, u) {
      return 'URI="' + toProxy(u) + '"';
    });
  }

  return text.split("\n").map(function(line) {
    const t = line.trim();
    if (!t) return line;
    if (t.startsWith("#")) {
      if (t.includes('URI="')) return rewriteTagLine(t);
      return line;
    }
    return toProxy(t);
  }).join("\n");
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
  "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request) {
  const reqUrl  = new URL(request.url);
  const rawUrl  = reqUrl.searchParams.get("url");
  const referer = reqUrl.searchParams.get("referer") || "";
  if (!rawUrl) return NextResponse.json({ error: "url param required" }, { status: 400 });

  let targetUrl;
  try { targetUrl = new URL(decodeURIComponent(rawUrl)); }
  catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }

  if (!["http:", "https:"].includes(targetUrl.protocol))
    return NextResponse.json({ error: "Only http/https allowed" }, { status: 400 });

  const effectiveReferer = referer
    ? decodeURIComponent(referer)
    : `${targetUrl.protocol}//${targetUrl.hostname}/`;

  const upHeaders = {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept":          "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "identity",
    "Referer":         effectiveReferer,
    "Origin":          `${targetUrl.protocol}//${targetUrl.hostname}`,
  };

  // ── CDN-specific header overrides ──────────────────────────────────────────

  // kwik.cx / owocdn.top / uwucdn.top (AnimePahe CDN)
  if (targetUrl.hostname.includes("kwik.cx") || targetUrl.hostname.includes("kwik.si") || targetUrl.hostname.includes("owocdn.top") || targetUrl.hostname.includes("uwucdn.top") || targetUrl.hostname.includes("pahe.win") || targetUrl.hostname.includes("mewcdn")) {
    upHeaders["Cookie"] = "_ga=GA1.2.1234567890.1234567890; _gid=GA1.2.1234567890.1234567890";
    upHeaders["Referer"] = "https://kwik.cx/";
    upHeaders["Origin"]  = "https://kwik.cx";
  }

  // AnimeGG signed play URLs
  if (targetUrl.hostname.includes("animegg.org")) {
    upHeaders["Referer"] = "https://animegg.org/";
    upHeaders["Origin"]  = "https://animegg.org";
    upHeaders["Sec-Fetch-Dest"] = "video";
    upHeaders["Sec-Fetch-Mode"] = "no-cors";
    upHeaders["Sec-Fetch-Site"] = "same-origin";
  }

  // Anizone CDN (vid-cdn.xyz)
  if (targetUrl.hostname.includes("vid-cdn.xyz")) {
    upHeaders["Referer"] = "https://anizone.to/";
    upHeaders["Origin"]  = "https://anizone.to";
  }

  // KickAssAnime CDNs
  if (targetUrl.hostname.includes("duckstream") || targetUrl.hostname.includes("birdstream") || targetUrl.hostname.includes("kaa.lt")) {
    upHeaders["Referer"] = "https://kaa.lt/";
    upHeaders["Origin"]  = "https://kaa.lt";
  }

  // AllManga CDN
  if (targetUrl.hostname.includes("allanimenews.com") || targetUrl.hostname.includes("allanime")) {
    upHeaders["Referer"] = "https://allmanga.to/";
    upHeaders["Origin"]  = "https://allmanga.to";
  }

  // burntburst45.store — AniWaves
  if (targetUrl.hostname.includes("burntburst45.store") || targetUrl.hostname.includes("burntburst")) {
    upHeaders["Origin"]  = "https://play.echovideo.ru";
    upHeaders["Referer"] = "https://play.echovideo.ru/";
  }

  // mewstream / mewcdn / flareon.click — StreamX, Filmu, AniChi
  if (targetUrl.hostname.includes("mewstream") || targetUrl.hostname.includes("mewcdn") || targetUrl.hostname.includes("flareon.click")) {
    const cfWorker = process.env.CF_PROXY_URL;
    if (cfWorker) {
      const ref = targetUrl.hostname.includes("flareon") ? "https://hikari.gg/" : "https://megaplay.buzz/";
      const rangeHeader = request.headers.get("range");
      const cfUrl = `${cfWorker}/proxy?url=${encodeURIComponent(targetUrl.toString())}&referer=${encodeURIComponent(ref)}`;
      try {
        const cfRes = await fetch(cfUrl, { headers: rangeHeader ? { "Range": rangeHeader } : {} });
        if (cfRes.ok || cfRes.status === 206) {
          const resHeaders = { ...CORS_HEADERS, "Content-Type": cfRes.headers.get("content-type") || "application/octet-stream" };
          for (const h of ["content-length","content-range","accept-ranges","cache-control"]) {
            const v = cfRes.headers.get(h); if (v) resHeaders[h] = v;
          }
          if (!resHeaders["accept-ranges"]) resHeaders["accept-ranges"] = "bytes";
          return new NextResponse(cfRes.body, { status: cfRes.status, headers: resHeaders });
        }
      } catch {}
    }
    const ref = targetUrl.hostname.includes("flareon") ? "https://hikari.gg/" : "https://megaplay.buzz/";
    upHeaders["Referer"] = ref;
    upHeaders["Origin"]  = new URL(ref).origin;
  }

  // AniChi / Kuro CDNs
  if (targetUrl.hostname.includes("kuro.gg") || targetUrl.hostname.includes("anichi")) {
    upHeaders["Referer"] = "https://anichi.me/";
    upHeaders["Origin"]  = "https://anichi.me";
  }

  // anidap CDNs (24stream.xyz)
  if (targetUrl.hostname.includes("24stream.xyz")) {
    const cfWorker = process.env.CF_PROXY_URL;
    if (cfWorker) {
      const rangeHeader = request.headers.get("range");
      const cfUrl = `${cfWorker}/proxy?url=${encodeURIComponent(targetUrl.toString())}&referer=${encodeURIComponent("https://allanime.day/")}`;
      try {
        const cfRes = await fetch(cfUrl, { headers: rangeHeader ? { "Range": rangeHeader } : {} });
        if (cfRes.ok || cfRes.status === 206) {
          const resHeaders = { ...CORS_HEADERS, "Content-Type": cfRes.headers.get("content-type") || "application/octet-stream" };
          for (const h of ["content-length","content-range","accept-ranges","cache-control"]) {
            const v = cfRes.headers.get(h); if (v) resHeaders[h] = v;
          }
          if (!resHeaders["accept-ranges"]) resHeaders["accept-ranges"] = "bytes";
          return new NextResponse(cfRes.body, { status: cfRes.status, headers: resHeaders });
        }
      } catch {}
    }
    upHeaders["Referer"] = "https://allanime.day/";
    upHeaders["Origin"]  = "https://allanime.day";
  }

  // tools.fast4speed.rsvp — mochi/anidap AND allmanga
  if (targetUrl.hostname.includes("fast4speed")) {
    const ref = effectiveReferer.includes("animex") ? "https://animex.one/" : "https://allanime.day/";
    upHeaders["Referer"] = effectiveReferer || ref;
    upHeaders["Origin"]  = effectiveReferer ? new URL(effectiveReferer).origin : "https://allanime.day";
    upHeaders["Sec-Fetch-Dest"] = "video";
    upHeaders["Sec-Fetch-Mode"] = "no-cors";
    upHeaders["Sec-Fetch-Site"] = "cross-site";
  }

  // hls.anidb.app — route via CF worker if available
  if (targetUrl.hostname.includes("anidb.app")) {
    const anidbProxy = process.env.ANIDB_PROXY_URL;
    const cfWorker = anidbProxy || process.env.CF_PROXY_URL;
    if (cfWorker) {
      const ref = "https://anidb.app/";
      const cfUrl = anidbProxy
        ? `${cfWorker}?url=${encodeURIComponent(targetUrl.toString())}&ref=${encodeURIComponent(ref)}`
        : `${cfWorker}/proxy?url=${encodeURIComponent(targetUrl.toString())}&referer=${encodeURIComponent(ref)}`;
      try {
        const cfRes = await fetch(cfUrl, {
          headers: {
            ...(request.headers.get("range") ? { "Range": request.headers.get("range") } : {}),
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
        });
        if (cfRes.ok || cfRes.status === 206) {
          const contentType = cfRes.headers.get("content-type") || "";
          const serverOrigin = getPublicOrigin(request);

          if (isM3U8(targetUrl.href, contentType)) {
            const text = await cfRes.text();
            const rewritten = rewriteM3U8(text, targetUrl.href, ref, serverOrigin);
            return new NextResponse(rewritten, {
              status: 200,
              headers: { ...CORS_HEADERS, "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "public, max-age=30" },
            });
          }

          const resHeaders = { ...CORS_HEADERS, "Content-Type": contentType || "application/octet-stream" };
          for (const h of ["content-length", "content-range", "accept-ranges", "cache-control"]) {
            const v = cfRes.headers.get(h); if (v) resHeaders[h] = v;
          }
          if (!resHeaders["accept-ranges"]) resHeaders["accept-ranges"] = "bytes";
          if (targetUrl.pathname.endsWith(".xls") || contentType.includes("ms-excel") || contentType.includes("spreadsheet")) {
            resHeaders["Content-Type"] = "video/mp2t";
          }
          return new NextResponse(cfRes.body, { status: cfRes.status, headers: resHeaders });
        }
      } catch (e) {
        console.error("[proxy] anidb.app CF proxy fetch failed:", e.message);
      }
    }
    upHeaders["Referer"] = "https://anidb.app/";
    upHeaders["Origin"]  = "https://anidb.app";
  }

  // cinewave2.site — yuki provider
  if (targetUrl.hostname.includes("cinewave2.site") || targetUrl.hostname.includes("cinewave")) {
    upHeaders["Referer"] = "https://megaplay.buzz/";
    upHeaders["Origin"]  = "https://megaplay.buzz";
  }

  // animeonsen.xyz — vee provider (DASH)
  if (targetUrl.hostname.includes("animeonsen.xyz")) {
    upHeaders["Referer"] = "https://www.animeonsen.xyz/";
    upHeaders["Origin"]  = "https://www.animeonsen.xyz";
  }

  // newterrafoods.store / allanime — miku (allanime) provider
  if (targetUrl.hostname.includes("newterrafoods.store") || targetUrl.hostname.includes("allanime.uns.bio")) {
    upHeaders["Referer"] = "https://allanime.uns.bio/";
    upHeaders["Origin"]  = "https://allanime.uns.bio";
    upHeaders["User-Agent"] = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36";
  }

  // echovideo.ru
  if (targetUrl.hostname.includes("echovideo.ru")) {
    upHeaders["Origin"]  = "https://play.echovideo.ru";
    upHeaders["Referer"] = "https://play.echovideo.ru/";
  }

  // Animelok CDN domains
  if (targetUrl.hostname.includes("as-cdn") || targetUrl.hostname.includes("zephyrflick")) {
    upHeaders["Referer"] = effectiveReferer;
    try {
      upHeaders["Origin"] = new URL(effectiveReferer).origin;
    } catch {
      upHeaders["Origin"] = `${targetUrl.protocol}//${targetUrl.hostname}`;
    }
    upHeaders["Sec-Fetch-Dest"] = "empty";
    upHeaders["Sec-Fetch-Mode"] = "cors";
    upHeaders["Sec-Fetch-Site"] = "same-origin";
  }

  const rangeHeader = request.headers.get("range");
  if (rangeHeader) upHeaders["Range"] = rangeHeader;

  try {
    const upstream = await fetch(targetUrl.toString(), {
      headers: upHeaders,
      redirect: "follow",
    });

    if (!upstream.ok && upstream.status !== 206) {
      console.error(`[proxy] upstream ${upstream.status} for ${targetUrl.hostname}`);
      return new NextResponse(
        `Upstream error ${upstream.status} from ${targetUrl.hostname}`,
        { status: upstream.status, headers: { ...CORS_HEADERS, "Content-Type": "text/plain" } }
      );
    }

    const contentType  = upstream.headers.get("content-type") || "";
    const serverOrigin = getPublicOrigin(request);

    // M3U8 manifest — rewrite all URLs to proxy through here
    if (isM3U8(targetUrl.href, contentType)) {
      const text = await upstream.text();
      const rewritten = rewriteM3U8(text, targetUrl.href, effectiveReferer, serverOrigin);
      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type":  "application/vnd.apple.mpegurl",
          "Cache-Control": "public, max-age=30",
        },
      });
    }

    // Binary (segments, keys, etc.) — stream with byte-range support
    const resHeaders = {
      ...CORS_HEADERS,
      "Content-Type": contentType || "application/octet-stream",
    };
    for (const h of ["content-length", "content-range", "accept-ranges", "cache-control"]) {
      const v = upstream.headers.get(h);
      if (v) resHeaders[h] = v;
    }
    if (!resHeaders["accept-ranges"]) resHeaders["accept-ranges"] = "bytes";

    // AnimeGG direct MP4: force correct content-type
    const isDirectMp4 = targetUrl.pathname.includes("/play/") || targetUrl.pathname.endsWith(".mp4");
    if (isDirectMp4 && (!contentType || contentType === "application/octet-stream")) {
      resHeaders["Content-Type"] = "video/mp4";
    }

    // Animelok CDN: disguised video files with .js extension
    if ((targetUrl.hostname.includes("as-cdn") || targetUrl.hostname.includes("zephyrflick")) && contentType === "application/javascript") {
      resHeaders["Content-Type"] = "video/mp4";
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    });

  } catch (e) {
    console.error("[proxy] fetch error:", e.message, "→", targetUrl.hostname);
    const isSslError = e.message?.includes("SSL") || e.message?.includes("certificate") || e.message?.includes("CERT");
    return NextResponse.json(
      { error: e.message, host: targetUrl.hostname },
      { status: isSslError ? 525 : 502, headers: CORS_HEADERS }
    );
  }
}

export async function HEAD(request) {
  const reqUrl = new URL(request.url);
  const rawUrl = reqUrl.searchParams.get("url");
  const referer = reqUrl.searchParams.get("referer") || "";
  if (!rawUrl) return new NextResponse(null, { status: 400 });

  let targetUrl;
  try { targetUrl = new URL(decodeURIComponent(rawUrl)); }
  catch { return new NextResponse(null, { status: 400 }); }

  const effectiveReferer = referer
    ? decodeURIComponent(referer)
    : `${targetUrl.protocol}//${targetUrl.hostname}/`;

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": effectiveReferer,
        "Origin":  `${targetUrl.protocol}//${targetUrl.hostname}`,
      },
      redirect: "follow",
    });
    const h = new Headers();
    h.set("Access-Control-Allow-Origin", "*");
    h.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
    for (const hdr of ["content-type","content-length","accept-ranges","cache-control"]) {
      const v = upstream.headers.get(hdr);
      if (v) h.set(hdr, v);
    }
    if (!h.has("accept-ranges")) h.set("accept-ranges", "bytes");
    return new NextResponse(null, { status: upstream.ok ? 200 : upstream.status, headers: h });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
