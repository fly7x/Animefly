/**
 * Streaming providers registry
 *
 * Vidnest (AniList-based) and MegaPlay (AniList/MAL-based) embed sources.
 * All TMDB-based providers have been removed.
 */

/**
 * Vidnest providers — AniList ID based, no TMDB needed.
 * https://vidnest.fun/anime/[ANILIST_ID]/[EPISODE]/[sub|dub|hindi|...]
 * https://vidnest.fun/animepahe/[ANILIST_ID]/[EPISODE]/[sub|dub]
 */
export const VIDNEST_PROVIDERS = [
  {
    id:   "vidnest_anime",
    name: "VidNest",
    getUrl({ anilistId, episode = 1, lang = "sub" }) {
      if (!anilistId) return null;
      return `https://vidnest.fun/anime/${anilistId}/${episode}/${lang}`;
    },
  },
  {
    id:   "vidnest_pahe",
    name: "VidNest Pahe",
    getUrl({ anilistId, episode = 1, lang = "sub" }) {
      if (!anilistId) return null;
      return `https://vidnest.fun/animepahe/${anilistId}/${episode}/${lang}`;
    },
  },
];

/**
 * MegaPlay providers — AniList ID + episode based embeds.
 * https://megaplay.buzz/stream/ani/{anilist-id}/{ep-num}/{language}
 *
 * Also supports MAL ID: https://megaplay.buzz/stream/mal/{mal-id}/{ep-num}/{language}
 * And Anikoto/HiAnime episode IDs: https://megaplay.buzz/stream/s-2/{ep-id}/{language}
 *
 * Docs: https://megaplay.buzz/api
 */
export const MEGAPLAY_PROVIDERS = [
  {
    id:   "megaplay_ani",
    name: "MegaPlay",
    getUrl({ anilistId, episode = 1, lang = "sub" }) {
      if (!anilistId) return null;
      return `https://megaplay.buzz/stream/ani/${anilistId}/${episode}/${lang}`;
    },
  },
  {
    id:   "megaplay_dub",
    name: "MegaPlay",
    getUrl({ anilistId, episode = 1 }) {
      if (!anilistId) return null;
      return `https://megaplay.buzz/stream/ani/${anilistId}/${episode}/dub`;
    },
  },
];

/**
 * AnimePlay providers — AniList ID based embeds (animeplay.cfd).
 * https://animeplay.cfd/stream/ani/{anilist-id}/{ep-num}/{language}
 *
 * Also supports MAL ID: https://animeplay.cfd/stream/mal/{mal-id}/{ep-num}/{language}
 * Valid language values: sub, dub
 */
export const ANIMEPLAY_PROVIDERS = [
  {
    id:   "animeplay_sub",
    name: "AnimePlay",
    getUrl({ anilistId, episode = 1 }) {
      if (!anilistId) return null;
      return `https://animeplay.cfd/stream/ani/${anilistId}/${episode}/sub`;
    },
  },
  {
    id:   "animeplay_dub",
    name: "AnimePlay",
    getUrl({ anilistId, episode = 1 }) {
      if (!anilistId) return null;
      return `https://animeplay.cfd/stream/ani/${anilistId}/${episode}/dub`;
    },
  },
];

// Keep PROVIDERS as empty array for backwards compat (WatchClient references it)
export const PROVIDERS = [];
export const SAFE_PROVIDERS = [];

export function buildEmbedUrl(providerId, ctx) { return null; }

export function buildVidnestUrl(providerId, ctx) {
  const p = VIDNEST_PROVIDERS.find(p => p.id === providerId);
  return p ? p.getUrl(ctx) : null;
}
