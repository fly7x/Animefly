/**
 * api.js — Client-side fetch helpers
 * All calls go to /api/* (same origin) — no secrets exposed to browser.
 *
 * VPS deployment: always use relative URLs for API calls.
 * Relative URLs work for both client-side (browser resolves against current origin)
 * and server-side (Next.js resolves against the internal server).
 *
 * NEXT_PUBLIC_SITE_URL is only needed for absolute URL contexts (e.g. OG tags, sitemaps).
 * It is NOT needed for API calls since we use relative paths everywhere.
 */

const BASE = "/api";

/**
 * Get the base URL for API calls.
 * - Client-side: always use relative URL (browser handles origin)
 * - Server-side: use NEXT_PUBLIC_SITE_URL if set, otherwise localhost
 *   (server-side API calls are rare — most data fetching is client-side)
 */
function getBaseUrl() {
  if (typeof window !== "undefined") return ""; // relative URL on client
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  return "http://localhost:3000";
}

async function apiFetch(path, params = {}) {
  const base = getBaseUrl();
  const urlStr = base + BASE + path;
  const url = new URL(urlStr, base || "http://localhost");
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  // For relative URLs (client-side), just use the path+search
  const fetchUrl = base ? url.toString() : url.pathname + url.search;
  const res = await fetch(fetchUrl);
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function cryPost(action, body = {}) {
  const res = await fetch(`${BASE}/stream/crysoline`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ action, ...body }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Crysoline error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ── Metadata (AniList-backed) ──────────────────────────────────────────
  home:      ()               => apiFetch("/anime/home"),
  search:    (q, page = 1)   => apiFetch("/anime/search", { q, page }),
  category:  (cat, page = 1) => apiFetch(`/anime/category/${cat}`, { page }),

  info: (slug) => {
    if (!slug || slug === "undefined" || slug === "null") {
      console.warn("[api.info] called with invalid slug:", slug);
      return Promise.resolve(null);
    }
    return apiFetch(`/anime/info/${slug}`);
  },

  episodes: (slug) => {
    if (!slug || slug === "undefined" || slug === "null") {
      console.warn("[api.episodes] called with invalid slug:", slug);
      return Promise.resolve({ episodes: [], totalEpisodes: 0 });
    }
    return apiFetch(`/anime/episodes/${slug}`);
  },

  /** Rich episode metadata from ani.zip (thumbnails, titles, summaries, ratings) */
  episodesMeta: (anilistId) => {
    if (!anilistId) return Promise.resolve(null);
    return apiFetch(`/anime/episodes-meta/${anilistId}`);
  },

  // ── Crysoline streaming (server-side proxy) ───────────────────────────
  crysoline: {
    map: (anilistId, lang = "en") =>
      cryPost("map", { anilistId, lang }),

    mapOne: (anilistId, sourceId) =>
      cryPost("mapOne", { anilistId, sourceId }),

    episodes: (sourceId, mappedId, anilistId) =>
      cryPost("episodes", { sourceId, mappedId, ...(anilistId ? { anilistId } : {}) }),

    servers: (sourceId, mappedId, episodeId, episodeNumber) =>
      cryPost("servers", { sourceId, mappedId, episodeId, episodeNumber }),

    sources: (sourceId, mappedId, episodeId, subType = "", server = "", episodeNumber) =>
      cryPost("sources", { sourceId, mappedId, episodeId, subType, server, episodeNumber }),

    auto: (anilistId, epNumber, subType = "sub") =>
      cryPost("auto", { anilistId, epNumber, subType }),
  },
};
