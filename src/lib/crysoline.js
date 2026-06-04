/**
 * crysoline.js — Crysoline API v1 client
 *
 * ⚠️  CRITICAL: All endpoints use /api/v1/ prefix, NOT /api/
 *     Correct: https://api.crysoline.moe/api/v1/anime/animegg/episodes/{id}
 *     Wrong:   https://api.crysoline.moe/api/anime/animegg/episodes/{id}
 *
 * Mapper endpoint: /api/v1/mapper/map
 * Source search:   /api/v1/anime/{source}/search?q=
 * Source episodes: /api/v1/anime/{source}/episodes/{id}
 * Source sources:  /api/v1/anime/{source}/sources?id=&episodeId=
 * Source servers:  /api/v1/anime/{source}/servers?id=&episodeId=
 *   ↳ Only these sources have /servers per the API docs:
 *     anicore, anidap, animeav1, animelib, animemeow, animenix, animex
 *
 * Timeout strategy (fail fast → auto-switch to embedded player):
 *   Mapper/search/probe: 8s, 0 retries
 *   Episodes/sources:   20s, 1 retry
 *
 * BUG FIXES applied vs original:
 *   1. SOURCES LIST: Added 10 sources that exist in API but were missing:
 *      animelib, animerevival, kuudere, animemeow, animeav1, lunaranime,
 *      anime3rb, animenix, animerevival — skipping aniliberty/kodik/123anime
 *      (intentionally broken per requirements).
 *   2. hasServers FLAGS: animeav1, animelib, animemeow, animenix also have
 *      /servers endpoints in the API — were incorrectly set to false.
 *   3. map action in route: mapAnilistSequential was called without titles arg —
 *      fixed in route.js.
 *   4. "map" action in route: needApiIds path discards titles — fixed in route.js.
 *   5. STALE_MAPPING re-map: called mapAnilistToSource without titles — fixed.
 */

import axios from "axios";

const BASE = "https://api.crysoline.moe";

// ── Global rate limiter ───────────────────────────────────────────────────────
// Prevents concurrent requests from different users on the same server IP
// from all hitting Crysoline simultaneously. Max 1 request every 1.5s globally.
let _globalLastRequest = 0;
const GLOBAL_MIN_GAP = 1500; // ms — Crysoline rate-limits aggressively

async function globalRateLimit() {
  const gap = GLOBAL_MIN_GAP - (Date.now() - _globalLastRequest);
  if (gap > 0) await sleep(gap);
  _globalLastRequest = Date.now();
}

// ── Per-source request serializer ────────────────────────────────────────────
// Crysoline rate-limits per IP. Running parallel probes fires multiple requests
// simultaneously → immediate 429 storm.
// This queue ensures at most one in-flight request per source at a time,
// with a minimum 1200ms gap between requests to the same source.
const _srcQueues = {};  // sourceId → { promise, lastAt }

function queuedCryGet(sourceId, path, params, timeoutMs, retries, signal404) {
  if (!_srcQueues[sourceId]) _srcQueues[sourceId] = { promise: Promise.resolve(), lastAt: 0 };
  const q = _srcQueues[sourceId];
  const MIN_GAP = 1200; // ms between requests to same source (increased from 600ms)

  q.promise = q.promise.then(async () => {
    const gap = MIN_GAP - (Date.now() - q.lastAt);
    if (gap > 0) await sleep(gap);
    q.lastAt = Date.now();
    return cryGet(path, params, timeoutMs, retries, signal404);
  });
  return q.promise;
}

export const STALE_MAPPING = Symbol("STALE_MAPPING");

function makeClient(timeout = 20000) {
  const key = process.env.CRYSOLINE_API_KEY || "";
  if (!key) console.warn("[crysoline] CRYSOLINE_API_KEY not set");
  return axios.create({
    baseURL: BASE,
    timeout,
    headers: { "x-api-key": key, Accept: "application/json" },
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function cryGet(path, params = {}, timeoutMs = 20000, retries = 1, signal404 = false) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await globalRateLimit();
      const { data } = await makeClient(timeoutMs).get(path, { params });
      return data;
    } catch (e) {
      const status    = e.response?.status;
      const isTimeout = e.code === "ECONNABORTED" || e.message?.includes("timeout");
      const msg       = e.response?.data?.message || e.response?.data || e.message;

      if (status === 404) {
        if (signal404) return STALE_MAPPING;
        return null;
      }

      // 500 on episodes/sources = Crysoline upstream can't find this anime
      // on that source. Treat as "not available" — don't retry, return null.
      // (Retrying just causes 429 storms and delays the fallback source.)
      if (status === 500) {
        console.log(`[crysoline] ${path} → 500: ${typeof msg === "string" ? msg.slice(0, 80) : JSON.stringify(msg).slice(0, 80)}`);
        return null;
      }

      // 525 = Cloudflare SSL Handshake Failed — transient, always retry
      // This happens when AnimePahe's CDN drops SSL connections under load
      if (status === 525 || status === 524 || status === 522) {
        if (attempt < retries) {
          const wait = 1500 * (attempt + 1);
          console.log(`[crysoline] ${path} → ${status} (SSL/timeout) — retrying in ${wait}ms`);
          await sleep(wait);
          continue;
        }
        console.log(`[crysoline] ${path} → ${status} — giving up after ${attempt + 1} attempts`);
        return null;
      }

      if (status === 429) {
        // Back off progressively: 5s, 15s, 40s
        const wait = Math.min(5000 * Math.pow(3, attempt), 40000);
        if (attempt < retries) {
          console.log(`[crysoline] 429 — waiting ${Math.round(wait / 1000)}s (attempt ${attempt + 1})`);
          await sleep(wait);
          continue;
        }
        console.log(`[crysoline] 429 — giving up on ${path}`);
        return null;
      }

      if (isTimeout && attempt < retries) {
        console.log(`[crysoline] timeout on ${path} — retrying`);
        await sleep(1000);
        continue;
      }

      if (isTimeout) {
        console.log(`[crysoline] timeout on ${path} — giving up`);
      } else {
        console.log(`[crysoline] ${path} → ${status || e.code}: ${typeof msg === "string" ? msg.slice(0, 80) : JSON.stringify(msg).slice(0, 80)}`);
      }
      return null;
    }
  }
  return null;
}

// ── Sources list ───────────────────────────────────────────────────────────────
/**
 * SOURCE MANAGEMENT (Fix 3)
 * ─────────────────────────
 * Active sources: AnimePahe (default), AnimeGG, Anizone.
 * All other sources are commented out — NOT deleted — so they can be
 * re-enabled at any time by removing the comment markers.
 *
 * To re-enable a source:
 *   1. Uncomment the line below.
 *   2. Add its id to FALLBACK_SOURCE_IDS if you want it in the auto-load race.
 */
export const CRYSOLINE_SOURCES = [
  // ── ACTIVE — stable, working sources ─────────────────────────────────────
  { id: "animepahe", name: "AnimePahe", site: "animepahe.pw",   langs: ["en","ja"], hasServers: false, isDefault: true },
  { id: "animegg",   name: "AnimeGG",   site: "animegg.org",    langs: ["en","ja"], hasServers: false },
  { id: "anizone",   name: "Anizone",   site: "anizone.to",     langs: ["en","ja"], hasServers: false },
  // ── INACTIVE — Crysoline scrapers returning 500; re-enable when fixed ────
  // { id: "animeparadise", name: "AnimeParadise", site: "animeparadise.moe", langs: ["en","ja"], hasServers: false },
  // { id: "anidap",    name: "Anidap",    site: "anidap.se",      langs: ["en","ja"], hasServers: true  },
  // { id: "animekai",  name: "AnimeKai",  site: "anikai.to",      langs: ["en","ja"], hasServers: false },
  // { id: "animeheaven",   name: "AnimeHeaven",   site: "animeheaven.me",    langs: ["en","ja"], hasServers: false },
  // { id: "animenexus",    name: "AnimeNexus",    site: "anime.nexus",       langs: ["en","ja"], hasServers: false },
  // { id: "animeonsen",    name: "AnimeOnsen",    site: "animeonsen.xyz",    langs: ["en","ja"], hasServers: false },
  // { id: "uniquestream",  name: "UniqueStream",  site: "anime.uniquestream.net", langs: ["en","ja"], hasServers: false },
  // { id: "anicore",  name: "Anicore",  site: "anikage.cc",     langs: ["en","ja","id"], hasServers: true },
  // { id: "animex",   name: "Animex",   site: "animex.one",     langs: ["en","ja","id"], hasServers: true },
  // { id: "animeav1", name: "AnimeAV1", site: "animeav1.com",   langs: ["es"],           hasServers: true },
  // { id: "animelib", name: "AnimeLib", site: "v3.animelib.org",langs: ["ru","ja"],      hasServers: true },
];

export const DEFAULT_SOURCE_ID = "animepahe";

// English-primary sources (best for English-speaking audiences)
export const EN_SOURCE_IDS = CRYSOLINE_SOURCES
  .filter(s => s.langs.includes("en"))
  .map(s => s.id);

// All active source IDs
export const ALL_SOURCE_IDS = CRYSOLINE_SOURCES.map(s => s.id);

// Fallback order when AnimePahe (default) fails.
// Only active sources listed here.
export const FALLBACK_SOURCE_IDS = [
  "animegg",   // fallback 1 — direct MP4
  "anizone",   // fallback 2
];


// ── Title helpers ──────────────────────────────────────────────────────────────

function titleToSlug(title = "") {
  if (typeof title !== "string") title = String(title ?? "");
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-$/, "");
}

function candidateSlugs(titles = []) {
  const seen = new Set();
  return titles.filter(Boolean).map(t => titleToSlug(t)).filter(s => s && !seen.has(s) && seen.add(s));
}

// ── Search fallback ────────────────────────────────────────────────────────────

async function searchOnSource(sourceId, titles) {
  for (const title of titles.filter(Boolean).slice(0, 2)) {
    const data = await queuedCryGet(sourceId, `/api/v1/anime/${sourceId}/search`, { q: title }, 8000, 0, false);
    if (!data) continue;

    const results = Array.isArray(data) ? data
      : Array.isArray(data?.results) ? data.results
      : Array.isArray(data?.data)    ? data.data
      : null;
    if (!results?.length) continue;

    const query = titleToSlug(title);
    for (const item of results) {
      const itemId    = item.id || item.animeId || item.slug || null;
      const itemTitle = item.title || item.name  || item.slug || "";
      if (!itemId) continue;
      const itemSlug = titleToSlug(itemTitle);
      if (itemSlug === query || itemSlug.startsWith(query.slice(0, 15)) || query.startsWith(itemSlug.slice(0, 15))) {
        console.log(`[crysoline] search found ${sourceId}:"${itemTitle}" → ${itemId}`);
        return String(itemId);
      }
    }
  }
  return null;
}

// ── AnimeGG slug probe ─────────────────────────────────────────────────────────

async function probeAnimeGGByTitle(titles) {
  const slugs = candidateSlugs(titles).slice(0, 3);
  if (slugs.length) console.log(`[crysoline] animegg probe trying: ${slugs.join(", ")}`);

  for (const slug of slugs) {
    const data = await queuedCryGet("animegg", `/api/v1/anime/animegg/episodes/${encodeURIComponent(slug)}`, {}, 8000, 0, false);
    if (!data || data === STALE_MAPPING) continue;

    const eps = Array.isArray(data) ? data
      : Array.isArray(data.episodes) ? data.episodes
      : Array.isArray(data.data)     ? data.data
      : null;
    if (eps?.length > 0) {
      console.log(`[crysoline] animegg probe found: "${slug}" (${eps.length} eps)`);
      return slug;
    }
  }
  return null;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export async function mapAnilistToSource(anilistId, sourceId, titles = []) {
  // Step 1: Crysoline mapper
  const data = await cryGet(
    "/api/v1/mapper/map",
    { id: String(anilistId), provider: sourceId },
    8000, 1, false
  );

  if (data && data !== STALE_MAPPING && data.found) {
    const id =
      (typeof data.idMap  === "string" ? data.idMap          : null) ||
      (typeof data.idMap  === "number" ? String(data.idMap)  : null) ||
      (typeof data.id     === "string" ? data.id             : null) ||
      (typeof data.result === "string" ? data.result         : null);
    if (id && id !== "null" && id !== "undefined" && id.trim()) {
      return id.trim();
    }
  }

  if (titles.length === 0) return null;

  // Step 2: Search API fallback
  console.log(`[crysoline] mapper missed ${sourceId}:${anilistId} — trying search`);
  const searchId = await searchOnSource(sourceId, titles);
  if (searchId) return searchId;

  // Step 3: Slug probe (AnimeGG only)
  if (sourceId === "animegg") {
    console.log(`[crysoline] search missed animegg:${anilistId} — trying slug probe`);
    const probeId = await probeAnimeGGByTitle(titles);
    if (probeId) return probeId;
  }

  return null;
}

export async function mapAnilistSequential(anilistId, sourceIds, titles = [], delayMs = 350) {
  const map = new Map();
  for (const sourceId of sourceIds) {
    const mappedId = await mapAnilistToSource(anilistId, sourceId, titles);
    if (mappedId) {
      map.set(sourceId, mappedId);
      console.log(`[crysoline] mapped ${sourceId} → ${mappedId}`);
    }
    await sleep(delayMs);
  }
  return map;
}

export async function mapAnilistToEnSources(anilistId, titles = []) {
  return mapAnilistSequential(anilistId, EN_SOURCE_IDS, titles, 350);
}

export async function mapAnilistToAllSources(anilistId, titles = []) {
  return mapAnilistSequential(anilistId, ALL_SOURCE_IDS, titles, 350);
}

// ── Episode / stream calls ────────────────────────────────────────────────────

export async function getEpisodesFromSource(sourceId, mappedId) {
  if (!sourceId || !mappedId) return [];

  // animepahe episodes endpoint is slower — give it more time
  const epsTimeout = sourceId === "animepahe" ? 30000 : 20000;

  const data = await cryGet(
    `/api/v1/anime/${sourceId}/episodes/${encodeURIComponent(mappedId)}`,
    {}, epsTimeout, 1, true  // signal404=true: cached slug is stale
  );

  if (data === STALE_MAPPING) return STALE_MAPPING;
  if (!data) return [];

  let raw = [];
  if (Array.isArray(data))               raw = data;
  else if (Array.isArray(data.episodes)) raw = data.episodes;
  else if (Array.isArray(data.data))     raw = data.data;
  else return [];

  return raw.map((ep, idx) => ({
    id:       ep.id || ep.episodeId || String(ep.number ?? idx + 1),
    number:   ep.number ?? ep.episode ?? idx + 1,
    title:    ep.title || ep.name || `Episode ${ep.number ?? idx + 1}`,
    image:    ep.image || ep.thumbnail || null,
    metadata: ep.metadata || {},
  }));
}

// ── Episode ID resolver ───────────────────────────────────────────────────────
// animepahe expects a hash episodeId (e.g. "5f490370-..."), not a slug.
// anizone expects a base64 episodeId from the episodes list.
// This function resolves a generic episodeId/number into the correct format.

async function resolveEpisodeId(sourceId, mappedId, episodeId, episodeNumber) {
  if (!mappedId) return episodeId;

  const epNum = Number(episodeNumber);
  const hasEpNum = Number.isFinite(epNum) && epNum > 0;

  if (sourceId !== "animepahe" && sourceId !== "anizone") return episodeId;

  // animepahe expects a hash episodeId, not a slug like "...-episode-1".
  if (sourceId === "animepahe" && /^[a-f0-9]{32,}$/i.test(episodeId)) return episodeId;

  // anizone expects a base64 episodeId from the episodes list (e.g. "ZjFnMWF1eXgvMQ==").
  if (sourceId === "anizone" && /^[A-Za-z0-9+/]+={0,2}$/.test(episodeId || "") && episodeId?.length >= 8) {
    return episodeId;
  }

  if (!hasEpNum) {
    if (!episodeId) return episodeId;
    // Try to extract episode number from the episodeId string
    const match = episodeId.match(/(?:episode|ep)[-\s]*(\d+)/i) || episodeId.match(/(\d+)$/);
    const parsed = match ? Number(match[1]) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return resolveEpisodeId(sourceId, mappedId, episodeId, parsed);
    }
    return episodeId;
  }

  // Fetch the episodes list to find the correct ID for this episode number
  const episodes = await getEpisodesFromSource(sourceId, mappedId);
  if (episodes === STALE_MAPPING || !Array.isArray(episodes)) return episodeId;
  const ep = episodes.find(e => Number(e.number) === epNum);
  return ep?.id || episodeId;
}

export async function getServersFromSource(sourceId, mappedId, episodeId, episodeNumber) {
  const src = CRYSOLINE_SOURCES.find(s => s.id === sourceId);
  if (!src?.hasServers) return [];
  if (!mappedId || !episodeId) return [];

  // Guard: some sources (animeav1) return bare slugs as mappedId.
  const looksLikeUrl = mappedId.startsWith("http://") || mappedId.startsWith("https://");
  const looksLikeNumericId = /^\d+$/.test(mappedId);
  const looksLikeSlug = !looksLikeUrl && !looksLikeNumericId && /^[a-z0-9-]+$/.test(mappedId);

  if (sourceId === "animeav1" && looksLikeSlug) {
    console.log(`[crysoline] skipping /servers for ${sourceId} — mappedId "${mappedId}" is a bare slug`);
    return [];
  }

  const resolvedEpisodeId = await resolveEpisodeId(sourceId, mappedId, episodeId, episodeNumber);

  const data = await cryGet(
    `/api/v1/anime/${sourceId}/servers`,
    { id: mappedId, episodeId: resolvedEpisodeId },
    20000, 1
  );
  if (!data) return [];
  return data.servers || (Array.isArray(data) ? data : []);
}

export async function getSourcesFromSource(sourceId, mappedId, episodeId, subType = "", server = "", episodeNumber) {
  if (!mappedId || !episodeId) return { sources: [], subtitles: [], headers: {} };

  const resolvedEpisodeId = await resolveEpisodeId(sourceId, mappedId, episodeId, episodeNumber);

  const params = { id: mappedId, episodeId: resolvedEpisodeId };
  if (subType) params.subType = subType;
  if (server)  params.server  = server;

  // Guard: animeav1 /sources fails with bare slugs
  const looksLikeUrl       = mappedId.startsWith("http://") || mappedId.startsWith("https://");
  const looksLikeNumericId = /^\d+$/.test(mappedId);
  const looksLikeBareSlug  = !looksLikeUrl && !looksLikeNumericId && /^[a-z0-9-]+$/.test(mappedId);
  if (sourceId === "animeav1" && looksLikeBareSlug) {
    console.log(`[crysoline] skipping /sources for ${sourceId} — bare slug mappedId`);
    return { sources: [], subtitles: [], headers: {} };
  }

  // animepahe needs more time — its CDN is slower to respond than AnimeGG
  // Also needs more retries due to frequent 525 SSL handshake failures
  const srcTimeout = sourceId === "animepahe" ? 30000 : 20000;
  const srcRetries = sourceId === "animepahe" ? 3 : 1;

  const data = await queuedCryGet(sourceId, `/api/v1/anime/${sourceId}/sources`, params, srcTimeout, srcRetries);
  if (!data) return { sources: [], subtitles: [], headers: {} };

  return {
    sources: (data.sources || []).map(s => ({
      url:     s.url || "",
      quality: s.quality || "auto",
      isHLS:   !!(s.isM3U8 || s.url?.includes(".m3u8")),
    })).filter(s => s.url),
    subtitles: (data.subtitles || data.tracks || []).map(t => {
      const rawUrl = t.url || t.file || "";
      if (!rawUrl) return null;
      // Proxy subtitle URLs that have restrictive CORS (e.g. vid-cdn.xyz for Anizone)
      const needsProxy = rawUrl.includes("vid-cdn.xyz") || rawUrl.includes("anizone.to");
      const url = needsProxy
        ? `/api/proxy?url=${encodeURIComponent(rawUrl)}&referer=${encodeURIComponent("https://anizone.to/")}`
        : rawUrl;
      return { url, label: t.lang || t.label || "Unknown" };
    }).filter(Boolean),
    headers: data.headers || {},
  };
}
