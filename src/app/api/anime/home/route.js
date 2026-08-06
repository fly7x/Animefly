export const maxDuration = 30;
export const revalidate  = 300;

import { NextResponse } from "next/server";
import { getHome }       from "@/lib/scraper";
import { getCachedAsync, setCachedAsync } from "@/lib/cache";

const ANILIST = "https://graphql.anilist.co";

const EMPTY = {
  spotlightAnimes: [], trendingAnimes: [], latestEpisodeAnimes: [],
  topAiringAnimes: [], mostFavoriteAnimes: [], top10Animes: { today: [], week: [] },
  trending: { media: [] }, topAiring: { media: [] },
  popular:  { media: [] }, newEpisodes: { media: [] },
};

// ── Fetch top airing from AniList (includes nextAiringEpisode countdown) ──────
async function fetchAniListHome() {
  const query = `
    query {
      topAiring: Page(page: 1, perPage: 10) {
        media(status: RELEASING, sort: POPULARITY_DESC, type: ANIME) {
          id idMal
          title { romaji english }
          coverImage { extraLarge large }
          bannerImage
          genres format status episodes averageScore
          nextAiringEpisode { airingAt episode }
        }
      }
      trending: Page(page: 1, perPage: 20) {
        media(sort: TRENDING_DESC, type: ANIME) {
          id idMal
          title { romaji english }
          coverImage { extraLarge large }
          genres format status episodes averageScore
          nextAiringEpisode { airingAt episode }
        }
      }
      popular: Page(page: 1, perPage: 20) {
        media(sort: POPULARITY_DESC, type: ANIME) {
          id idMal
          title { romaji english }
          coverImage { extraLarge large }
          genres format status episodes averageScore
          nextAiringEpisode { airingAt episode }
        }
      }
      newEpisodes: Page(page: 1, perPage: 20) {
        media(status: RELEASING, sort: UPDATED_AT_DESC, type: ANIME) {
          id idMal
          title { romaji english }
          coverImage { extraLarge large }
          genres format status episodes averageScore
          nextAiringEpisode { airingAt episode }
        }
      }
    }
  `;

  const res  = await fetch(ANILIST, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body:    JSON.stringify({ query }),
    next:    { revalidate: 300 },
  });

  const json = await res.json();
  return json?.data || null;
}

export async function GET() {
  const key      = "home_v2";
  const staleKey = "home_v2_stale";

  const cached = await getCachedAsync(key);
  if (cached) return NextResponse.json(cached);

  try {
    // Fetch both scraper and AniList in parallel
    const [scraperData, anilistData] = await Promise.allSettled([
      getHome(),
      fetchAniListHome(),
    ]);

    const scraper  = scraperData.status  === "fulfilled" ? scraperData.value  : {};
    const anilist  = anilistData.status  === "fulfilled" ? anilistData.value  : null;

    const data = {
      // Scraper fields (used by other parts of the site)
      spotlightAnimes:     scraper.spotlightAnimes     || [],
      trendingAnimes:      scraper.trendingAnimes      || [],
      latestEpisodeAnimes: scraper.latestEpisodeAnimes || [],
      topAiringAnimes:     scraper.topAiringAnimes     || [],
      mostFavoriteAnimes:  scraper.mostFavoriteAnimes  || [],
      top10Animes:         scraper.top10Animes         || { today: [], week: [] },

      // AniList fields (used by new HomeClient hero + sections)
      topAiring:  anilist?.topAiring  || { media: [] },
      trending:   anilist?.trending   || { media: [] },
      popular:    anilist?.popular    || { media: [] },
      newEpisodes: anilist?.newEpisodes || { media: [] },
    };

    await setCachedAsync(key,      data, 30 * 60);
    setCachedAsync(staleKey, data, 24 * 60 * 60).catch(() => {});

    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });

  } catch (err) {
    console.error("[home]", err.message);

    const stale = await getCachedAsync(staleKey);
    if (stale) return NextResponse.json({ ...stale, _stale: true });

    return NextResponse.json({ ...EMPTY, error: err.message });
  }
}
