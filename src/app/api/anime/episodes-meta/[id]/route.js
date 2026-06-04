/**
 * GET /api/anime/episodes-meta/[anilistId]
 *
 * Fetches rich episode metadata from ani.zip:
 *   - Episode thumbnails (TVDB screencaps)
 *   - Multilingual episode titles
 *   - Episode summaries/overviews
 *   - Air dates
 *   - Ratings
 *   - Runtime
 *   - Cross-platform mappings (MAL, TVDB, IMDB, TMDB, Kitsu)
 *   - Series images (banner, poster, fanart, clearlogo)
 *
 * Cached for 24 hours.
 */
import { NextResponse } from "next/server";
import { getCachedAsync, setCachedAsync } from "@/lib/cache";

export async function GET(request, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const cacheKey = `anizip:${id}`;
  const cached = await getCachedAsync(cacheKey);
  if (cached) return NextResponse.json(cached, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });

  try {
    const res = await fetch(`https://api.ani.zip/mappings?anilist_id=${id}`);
    if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await res.json();

    // Parse episodes into a clean format
    const episodes = {};
    for (const [num, ep] of Object.entries(data.episodes || {})) {
      episodes[num] = {
        number: Number(num),
        absoluteNumber: ep.absoluteEpisodeNumber || Number(num),
        title: ep.title || {},
        overview: ep.overview || ep.summary || "",
        image: ep.image || null,
        airDate: ep.airDate || ep.airdate || null,
        runtime: ep.runtime || ep.length || null,
        rating: ep.rating ? parseFloat(ep.rating) : null,
        tvdbId: ep.tvdbId || null,
        seasonNumber: ep.seasonNumber || 1,
      };
    }

    const result = {
      anilistId: Number(id),
      episodeCount: data.episodeCount || 0,
      specialCount: data.specialCount || 0,
      titles: data.titles || {},
      images: (data.images || []).reduce((acc, img) => {
        acc[img.coverType?.toLowerCase()] = img.url;
        return acc;
      }, {}),
      mappings: data.mappings || {},
      episodes,
    };

    await setCachedAsync(cacheKey, result, 86400); // 24h cache
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
