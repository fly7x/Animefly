/**
 * WatchClient — Streamlined watch page
 *
 * Sources:
 *   - Crysoline: AnimePahe (default), AnimeGG, Anizone
 *   - Embedded: VidNest, VidNest Pahe, MegaPlay, AnimePlay
 *
 * Features:
 *   - Persistent HlsPlayer (never re-mounted on episode change)
 *   - Source preference persistence (localStorage)
 *   - Automatic fallback chain (AnimePahe → AnimeGG → Anizone → VidNest)
 *   - Hydration-safe state (no localStorage reads in useState)
 *   - Watch progress saving
 *   - Episode prefetching on hover
 */
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { idFromSlug } from "@/lib/utils";
import { VIDNEST_PROVIDERS, MEGAPLAY_PROVIDERS, ANIMEPLAY_PROVIDERS, buildVidnestUrl } from "@/lib/providers";
import { CRYSOLINE_SOURCES, DEFAULT_SOURCE_ID, FALLBACK_SOURCE_IDS } from "@/lib/crysoline";
import { saveProgress } from "@/lib/watchProgress";
import { useQuery, prefetch } from "@/hooks/useQuery";
import AnimePlayer from "./AnimePlayer";
import CommentsSection from "./CommentsSection";
import AniListPanel from "./AniListPanel";
import styles from "./WatchClient.module.css";
import AnimePlayer from "@/components/AnimePlayer";

// ── Source preference persistence ─────────────────────────────────────────────
const PREF_KEY = "player_source_pref";
function loadSourcePref() { try { return JSON.parse(localStorage.getItem(PREF_KEY) || "{}"); } catch { return {}; } }
function saveSourcePref(update) { try { localStorage.setItem(PREF_KEY, JSON.stringify({ ...loadSourcePref(), ...update })); } catch {} }

// Module-level dedup: prevents StrictMode double-invoke from firing two
// identical probe races for the same anilistId simultaneously.
const probeInFlight = new Map();

// ── Skeleton components ───────────────────────────────────────────────────────
function EpisodeSkeleton() {
  return (
    <div className={styles.epSkelWrap}>
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} className={`skeleton ${styles.epSkel}`} />
      ))}
    </div>
  );
}

function InfoPanelSkeleton() {
  return (
    <div className={styles.infoPanel}>
      <div className={`skeleton ${styles.infoPosterWrap}`} style={{ background: "#222" }} />
      <div className={styles.infoBody}>
        <div className="skeleton" style={{ height: 22, width: "60%", borderRadius: 4, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 14, width: "40%", borderRadius: 4, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 60, borderRadius: 4 }} />
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WatchClient({ animeId, epSlug }) {
  const router    = useRouter();
  const anilistId = idFromSlug(animeId);

  // ── Data fetching with cache ───────────────────────────────────────────────
  const { data: infoData } = useQuery(
    `info:${animeId}`,
    () => api.info(animeId),
    { ttl: 300 }
  );
  const { data: epsData, loading: epsLoading } = useQuery(
    `episodes:${animeId}`,
    () => api.episodes(animeId),
    { ttl: 180 }
  );

  const info     = infoData;
  const eps      = epsData?.episodes || [];
  const anime    = info?.anime?.info;
  const moreInfo = info?.anime?.moreInfo;
  const related  = info?.relatedAnimes     || [];
  const recs     = info?.recommendedAnimes || [];
  const seasons  = info?.seasons           || [];

  // ── Episode navigation ────────────────────────────────────────────────────
  const [showAllEps, setShowAllEps] = useState(false);
  const currentIdx = eps.findIndex(e => e.epSlug === epSlug);
  const currentEp  = eps[currentIdx] || null;
  const prevEp     = currentIdx > 0            ? eps[currentIdx - 1] : null;
  const nextEp     = currentIdx < eps.length-1 ? eps[currentIdx + 1] : null;
  const epNumber   = parseInt(epSlug.replace("ep-", "")) || 1;
  const dispEps    = showAllEps ? eps : eps.slice(0, 60);
  const playerEpisodeTitle = `Episode ${epNumber}`;

  // ── Mode ──────────────────────────────────────────────────────────────────
  const [sourceMode, setSourceMode] = useState("crysoline");

  // ── Source state ──────────────────────────────────────────────────────────
  const [mounted,       setMounted]       = useState(false);
  const [sourceMap,     setSourceMap]     = useState({});
  const [sourceLoading, setSourceLoading] = useState({});
  const [activeSrcId,   setActiveSrcId]   = useState("");

  // ── Stream data ───────────────────────────────────────────────────────────
  const [cryEps,        setCryEps]       = useState([]);
  const [cryEpsLoad,    setCryEpsLoad]   = useState(false);
  const [cryStream,     setCryStream]    = useState(null);
  const [cryStreamLoad, setCrySLoad]     = useState(false);
  const [cryStreamErr,  setCrySErr]      = useState(null);
  const [cryServers,    setCryServers]   = useState([]);
  const [crySubType,    setCrySubType]   = useState("sub");
  const [cryServer,     setCryServer]    = useState("");
  const [crySelSrc,     setCrySelSrc]    = useState(null);

  // ── Embed ─────────────────────────────────────────────────────────────────
  const [embedProvider,  setEmbedProvider]  = useState("vidnest_anime");
  const [embedLang,      setEmbedLang]      = useState("sub");
  const [embedReload,    setEmbedReload]    = useState(0);

  // ── Player preferences ────────────────────────────────────────────────────
  const [autoplay, setAutoplay] = useState(true);
  const [autoNext, setAutoNext] = useState(true);
  const [theatre,  setTheatre]  = useState(false);

  useEffect(() => {
    try {
      const ap = localStorage.getItem("player_autoplay");
      const an = localStorage.getItem("player_autonext");
      if (ap !== null) setAutoplay(ap === "1");
      if (an !== null) setAutoNext(an === "1");
    } catch {}
  }, []);

  const handleAutoplayChange = (val) => {
    setAutoplay(val);
    try { localStorage.setItem("player_autoplay", val ? "1" : "0"); } catch {}
  };
  const handleAutoNextChange = (val) => {
    setAutoNext(val);
    try { localStorage.setItem("player_autonext", val ? "1" : "0"); } catch {}
  };

  // ── Watch progress ─────────────────────────────────────────────────────────
  const progressSaved = useRef(false);
  useEffect(() => { progressSaved.current = false; }, [animeId, epSlug]);

  useEffect(() => {
    if (!anime || !currentEp || progressSaved.current) return;
    saveProgress({ animeId, animeName: anime.name, poster: anime.poster,
      epSlug: currentEp.epSlug, epNumber: currentEp.number, epTitle: "" });
    progressSaved.current = true;
    fetch("/api/trending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ animeId, title: anime.name, poster: anime.poster }),
    }).catch(() => {});
  }, [anime, currentEp, animeId]);

  // ── Select + load source episodes ─────────────────────────────────────────
  const selectSource = useCallback(async (sourceId, mappedId, subType) => {
    if (!mappedId) return;
    const st = subType ?? crySubType;
    setActiveSrcId(sourceId);
    setCryStream(null);
    setCrySErr(null);
    setCrySelSrc(null);
    setCryServers([]);
    setCryServer("");
    saveSourcePref({ sourceId, subType: st });

    setCryEpsLoad(true);
    try {
      const d = await api.crysoline.episodes(sourceId, mappedId, anilistId);
      setCryEps(d.episodes || []);
    } catch { setCryEps([]); }
    finally { setCryEpsLoad(false); }
  }, [anilistId, crySubType]);

  // ── Fetch stream for current episode ──────────────────────────────────────
  const fetchStream = useCallback(async (subType = crySubType, server = cryServer) => {
    if (!activeSrcId) return;
    const mappedId = sourceMap[activeSrcId];
    if (!mappedId) return;

    const ep = cryEps.find(e => Number(e.number) === epNumber)
            || cryEps.find(e => Number(e.number) === epNumber - 1)
            || cryEps[epNumber - 1];
    if (!ep && cryEps.length > 0) { setCrySErr(`Episode ${epNumber} not found in this source`); return; }
    if (!ep) return;

    const episodeId = ep.id || String(epNumber);
    const episodeNumber = ep.number || epNumber;
    setCrySLoad(true); setCrySErr(null); setCryStream(null); setCrySelSrc(null);

    try {
      const src = CRYSOLINE_SOURCES.find(s => s.id === activeSrcId);
      if (src?.hasServers) {
        const sv = await api.crysoline.servers(activeSrcId, mappedId, episodeId, episodeNumber);
        setCryServers(sv.servers || []);
      }
      const data = await api.crysoline.sources(activeSrcId, mappedId, episodeId, subType, server, episodeNumber);
      setCryStream(data);
      if (data.sources?.length) {
        const preferred = data.sources.find(s => {
          const q = (s.quality || "").toLowerCase();
          return q.includes("720") || q.includes("1080") || q === "auto";
        }) || data.sources[data.sources.length - 1];
        setCrySelSrc(preferred);
      } else {
        setCrySErr(`No streams found for episode ${epNumber}. Try another source.`);
      }
    } catch (e) {
      setCrySErr(e.message);
    } finally { setCrySLoad(false); }
  }, [activeSrcId, sourceMap, cryEps, epNumber, crySubType, cryServer]);

  // ── Automatic source fallback chain ───────────────────────────────────────
  const tryFallback = useCallback(async (failedSourceId, subType, server) => {
    const activeIds   = CRYSOLINE_SOURCES.map(s => s.id);
    const fallbackIds = [DEFAULT_SOURCE_ID, ...FALLBACK_SOURCE_IDS]
      .filter(id => id !== failedSourceId && activeIds.includes(id));

    for (const fid of fallbackIds) {
      const maxAttempts = fid === "animepahe" ? 2 : 1;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          if (attempt > 1) await new Promise(r => setTimeout(r, 4000));
          console.log(`[watch] fallback → ${fid} (attempt ${attempt})`);

          let mappedId = sourceMap[fid] || null;
          if (!mappedId) {
            const data = await api.crysoline.mapOne(anilistId, fid);
            if (!data?.mappedId) break;
            mappedId = data.mappedId;
            setSourceMap(prev => ({ ...prev, [fid]: mappedId }));
          }

          let episodes = null;
          if (fid === activeSrcId && cryEps.length > 0) {
            episodes = cryEps;
          } else {
            const epsData = await api.crysoline.episodes(fid, mappedId, anilistId);
            if (!epsData?.episodes?.length) break;
            episodes = epsData.episodes;
          }

          const ep = episodes.find(e => Number(e.number) === epNumber)
                  || episodes[epNumber - 1];
          if (!ep) break;

          const epId   = ep.id || String(epNumber);
          const stream = await api.crysoline.sources(fid, mappedId, epId, subType, server, ep.number || epNumber);
          if (stream.sources?.length) {
            setActiveSrcId(fid);
            setCryEps(episodes);
            setCryStream(stream);
            setCrySelSrc(stream.sources[0]);
            setCrySErr(null);
            saveSourcePref({ sourceId: fid });
            return;
          }
        } catch { continue; }
      }
    }
    console.log("[watch] all fallbacks failed");
  }, [anilistId, epNumber, sourceMap, activeSrcId, cryEps]);

  // ── Auto-load on mount ─────────────────────────────────────────────────────
  const streamRaceRan = useRef(false);

  useEffect(() => {
    setMounted(true);
    const pref = loadSourcePref();
    if (pref.sourceId) setActiveSrcId(pref.sourceId);
    if (pref.subType)  setCrySubType(pref.subType);
  }, []);

  // Reset when anime changes
  useEffect(() => {
    streamRaceRan.current = false;
    setCryEps([]);
    setCryStream(null);
    setCrySelSrc(null);
    setCrySErr(null);
    setActiveSrcId("");
  }, [animeId]);

  // Reset race guard when episode changes
  useEffect(() => { streamRaceRan.current = false; }, [epSlug]);

  useEffect(() => {
    if (!currentEp || !anilistId) return;
    if (streamRaceRan.current) return;
    streamRaceRan.current = true;

    const pref = loadSourcePref();
    if (pref.subType) setCrySubType(pref.subType);

    if (probeInFlight.has(anilistId)) return;

    const probePromise = (async () => {
      const savedMode = pref.sourceMode;
      const subType = pref.subType || "sub";

      // Restore embedded if previously selected
      if (savedMode === "embedded" && pref.embedProvider) {
        setSourceMode("embedded");
        setEmbedProvider(pref.embedProvider);
        setEmbedLang(pref.embedLang || subType);
        setEmbedReload(r => r + 1);
        return;
      }

      // Restore Crysoline source if previously selected
      if (savedMode === "crysoline" && pref.sourceId) {
        try {
          setSourceMode("crysoline");
          const sourceId = pref.sourceId;
          let mappedId = sourceMap[sourceId] || null;
          if (!mappedId) {
            const data = await api.crysoline.mapOne(anilistId, sourceId);
            mappedId = data?.mappedId || null;
            if (mappedId) setSourceMap(prev => ({ ...prev, [sourceId]: mappedId }));
          }
          if (mappedId) {
            const epsResult = await api.crysoline.episodes(sourceId, mappedId, anilistId);
            if (epsResult?.episodes?.length) {
              setActiveSrcId(sourceId);
              setCryEps(epsResult.episodes);
              return;
            }
          }
        } catch (e) {
          console.log(`[watch] crysoline restore failed: ${e.message}`);
        }
      }

      // Default: try AnimePahe → AnimeGG → Anizone → VidNest embedded
      try {
        setSourceMode("crysoline");
        const sourceId = DEFAULT_SOURCE_ID;
        const data = await api.crysoline.mapOne(anilistId, sourceId);
        if (!data?.mappedId) {
          // AnimePahe not found, try AnimeGG
          const gg = await api.crysoline.mapOne(anilistId, "animegg");
          if (gg?.mappedId) {
            setSourceMap(prev => ({ ...prev, animegg: gg.mappedId }));
            const epsResult = await api.crysoline.episodes("animegg", gg.mappedId, anilistId);
            if (epsResult?.episodes?.length) {
              setActiveSrcId("animegg");
              setCryEps(epsResult.episodes);
              return;
            }
          }
          // Try Anizone
          const az = await api.crysoline.mapOne(anilistId, "anizone");
          if (az?.mappedId) {
            setSourceMap(prev => ({ ...prev, anizone: az.mappedId }));
            const epsResult = await api.crysoline.episodes("anizone", az.mappedId, anilistId);
            if (epsResult?.episodes?.length) {
              setActiveSrcId("anizone");
              setCryEps(epsResult.episodes);
              return;
            }
          }
          // All Crysoline failed → fall back to VidNest embedded
          setSourceMode("embedded");
          setEmbedProvider("vidnest_anime");
          setEmbedReload(r => r + 1);
          return;
        }
        const epsResult = await api.crysoline.episodes(sourceId, data.mappedId, anilistId);
        if (!epsResult?.episodes?.length) {
          setSourceMode("embedded");
          setEmbedProvider("vidnest_anime");
          setEmbedReload(r => r + 1);
          return;
        }
        setSourceMap(prev => ({ ...prev, [sourceId]: data.mappedId }));
        setActiveSrcId(sourceId);
        setCryEps(epsResult.episodes);
      } catch (e) {
        setCrySErr(`Failed to load source: ${e.message}`);
      }
    })();

    probeInFlight.set(anilistId, probePromise);
    probePromise.finally(() => probeInFlight.delete(anilistId));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEp?.epSlug, anilistId]);

  // Re-fetch stream when ep changes (episodes are already loaded)
  useEffect(() => {
    if (activeSrcId && cryEps.length > 0) fetchStream();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSrcId, cryEps, epSlug]);

  // Called by HlsPlayer when the stream URL is unreachable
  const handleStreamError = useCallback(() => {
    setCrySelSrc(null);
    setCryStream(null);
    setCrySErr("Stream failed to load. Try reloading or switching to another source.");
  }, []);

  // ── Handle source button click ────────────────────────────────────────────
  async function handleSourceClick(sourceId) {
    setSourceMode("crysoline");
    saveSourcePref({ sourceMode: "crysoline", sourceId });
    if (sourceMap[sourceId] !== undefined) {
      const cached = sourceMap[sourceId];
      if (cached) selectSource(sourceId, cached);
      else setCrySErr(`"${CRYSOLINE_SOURCES.find(s => s.id === sourceId)?.name}" is not available.`);
      return;
    }
    if (sourceLoading[sourceId]) return;
    setSourceLoading(prev => ({ ...prev, [sourceId]: true }));
    let mappedId = null;
    try {
      const data = await api.crysoline.mapOne(anilistId, sourceId);
      mappedId   = data?.mappedId || null;
      setSourceMap(prev => ({ ...prev, [sourceId]: mappedId }));
    } catch {
      setSourceMap(prev => ({ ...prev, [sourceId]: null }));
    } finally {
      setSourceLoading(prev => ({ ...prev, [sourceId]: false }));
    }
    if (mappedId) selectSource(sourceId, mappedId);
    else setCrySErr(`"${CRYSOLINE_SOURCES.find(s => s.id === sourceId)?.name}" is not available.`);
  }

  // ── Episode hover prefetch ─────────────────────────────────────────────────
  const prefetchEp = (ep) => {
    if (!ep) return;
    prefetch(`episodes:${animeId}`, () => api.episodes(animeId), 180);
  };

  // ── Navigate to episode ────────────────────────────────────────────────────
  const goToEp = useCallback((ep) => {
    if (!ep) return;
    router.push(`/watch/${animeId}/${ep.epSlug}`);
  }, [animeId, router]);

  // ── Episode progress helper ────────────────────────────────────────────────
  function getEpProgress(animeId, epNum) {
    if (typeof window === "undefined") return 0;
    try {
      const saved = parseFloat(localStorage.getItem(`cw_${animeId}_ep${epNum}`) || "0") || 0;
      if (saved < 10) return 0;
      const duration = 1440;
      return Math.min(100, Math.round((saved / duration) * 100));
    } catch { return 0; }
  }

  // ── Embedded URL builder ──────────────────────────────────────────────────
  const embedUrl = currentEp
    ? (buildVidnestUrl(embedProvider, { anilistId, episode: epNumber, lang: embedLang })
       || MEGAPLAY_PROVIDERS.find(p => p.id === embedProvider)?.getUrl({ anilistId, episode: epNumber, lang: embedLang })
       || ANIMEPLAY_PROVIDERS.find(p => p.id === embedProvider)?.getUrl({ anilistId, episode: epNumber })
       || null)
    : null;

  const sidebarSections = [
    ...(seasons.length > 0 ? [{ label: "Seasons",           items: seasons }]           : []),
    ...(related.length > 0  ? [{ label: "Related",           items: related.slice(0, 6) }]: []),
    ...(recs.length > 0     ? [{ label: "You May Also Like", items: recs.slice(0, 6) }]   : []),
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`${styles.watchPage} ${theatre ? styles.theatreMode : ""}`}>
      <div className={styles.playerSection}>

        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span className={styles.sep}>›</span>
          {anime
            ? <Link href={`/anime/${animeId}`}>{anime.name}</Link>
            : <span className="skeleton" style={{ width: 120, height: 14, display: "inline-block", borderRadius: 3 }} />
          }
          <span className={styles.sep}>›</span>
          <span>Episode {epNumber}</span>
        </nav>

        {/* Player */}
        <div className={styles.playerWrap}>
          {epsLoading && !currentEp && (
            <div className={styles.playerState}>
              <div className="spinner" /><p>Loading…</p>
            </div>
          )}
          {!epsLoading && !currentEp && (
            <div className={styles.playerState}><span>⚠</span><p>Episode not found.</p></div>
          )}

          {/* Crysoline player */}
          {currentEp && sourceMode === "crysoline" && (
            <>
              {(cryEpsLoad || cryStreamLoad) && !crySelSrc && (() => {
                const srcName = CRYSOLINE_SOURCES.find(s => s.id === activeSrcId)?.name || activeSrcId || "source";
                return (
                  <div className={styles.playerState}>
                    <div className="spinner" />
                    <p>{cryEpsLoad ? "Loading episodes…" : `Loading stream from ${srcName}…`}</p>
                  </div>
                );
              })()}
              {!activeSrcId && !cryStreamLoad && !cryEpsLoad && (
                <div className={styles.playerState}>
                  <div className="spinner" />
                  <p>Selecting source…</p>
                </div>
              )}
              {activeSrcId && !cryEpsLoad && !cryStreamLoad && cryStreamErr && !crySelSrc && (
                <div className={styles.playerState}>
                  <span className={styles.stateIcon}>⚡</span>
                  <p className={styles.stateMsg}>{cryStreamErr}</p>
                  <div className={styles.stateBtns}>
                    <button className={styles.retryBtn} onClick={() => fetchStream()}>Retry</button>
                  </div>
                </div>
              )}
              {crySelSrc && (
                <AnimePlayer
  src={crySelSrc?.url}
  isHLS={crySelSrc?.isHLS}
  subtitles={cryStream?.subtitles || []}
  headers={cryStream?.headers || {}}
  animeTitle={anime?.name}
  episodeName={currentEp?.title}
  episodeNumber={epNumber}
  autoPlay={autoPlay}
  autoNext={autoNext}
  onNext={handleNext}
  skipTimes={skipTimes}
/>


          {/* Embedded player */}
          {currentEp && sourceMode === "embedded" && (
            <>
              {!embedUrl && (
                <div className={styles.playerState}><span>📡</span><p>Select a source below.</p></div>
              )}
              {embedUrl && (
                <iframe
                  key={`${embedProvider}-${embedUrl}-${embedReload}`}
                  src={embedUrl}
                  className={styles.iframe}
                  frameBorder="0"
                  scrolling="no"
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  title={`${anime?.name || "Anime"} Episode ${epNumber}`}
                />
              )}
            </>
          )}
        </div>

        {/* ── Control panel ─────────────────────────────────────────────── */}
        <div className={styles.controlPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.modeTabs}>
              <button className={`${styles.modeTab} ${styles.modeTabActive}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                Sources
                {activeSrcId && crySelSrc && <span className={styles.activeIndicator} />}
              </button>
            </div>
            <button className={styles.reloadBtn} onClick={() => fetchStream()}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-4.5"/>
              </svg>
              Reload
            </button>
          </div>

          <div className={styles.cryBody}>
            {/* Info banner */}
            <div className={styles.serverInfo}>
              <p className={styles.serverInfoText}>
                You are watching <strong>Episode {epNumber}</strong>.
                If current server doesn&apos;t work, try other servers.
              </p>
            </div>

            {/* SUB row */}
            <div className={styles.serverRow}>
              <span className={styles.serverRowLabel}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h8v2H6zm10-4h2v2h-2zm-6 0h4v2h-4zm6 4h2v2h-2z"/></svg>
                SUB
              </span>
              <div className={styles.serverBtns}>
                {/* Crysoline sources */}
                {CRYSOLINE_SOURCES.map(src => (
                  <button
                    key={src.id}
                    className={`${styles.serverBtn} ${sourceMode === "crysoline" && activeSrcId === src.id && crySubType === "sub" ? styles.serverBtnActive : ""} ${sourceMap[src.id] === null ? styles.serverBtnUnavail : ""}`}
                    onClick={() => { setCrySubType("sub"); saveSourcePref({ subType: "sub" }); handleSourceClick(src.id); }}
                  >{src.name}</button>
                ))}
                {/* VidNest Sub */}
                {VIDNEST_PROVIDERS.map(p => {
                  const url = p.getUrl({ anilistId, episode: epNumber, lang: "sub" });
                  return (
                    <button key={`sub-${p.id}`}
                      className={`${styles.serverBtn} ${sourceMode === "embedded" && embedProvider === p.id && embedLang === "sub" ? styles.serverBtnActive : ""}`}
                      onClick={() => { setSourceMode("embedded"); setEmbedProvider(p.id); setEmbedLang("sub"); setEmbedReload(r => r + 1); saveSourcePref({ sourceMode: "embedded", embedProvider: p.id, embedLang: "sub", subType: "sub" }); }}
                      disabled={!url}
                    >{p.name}</button>
                  );
                })}
                {/* MegaPlay Sub */}
                {MEGAPLAY_PROVIDERS.filter(p => p.id !== "megaplay_dub").map(p => {
                  const url = p.getUrl({ anilistId, episode: epNumber, lang: "sub" });
                  return (
                    <button key={`sub-${p.id}`}
                      className={`${styles.serverBtn} ${sourceMode === "embedded" && embedProvider === p.id && embedLang === "sub" ? styles.serverBtnActive : ""}`}
                      onClick={() => { setSourceMode("embedded"); setEmbedProvider(p.id); setEmbedLang("sub"); setEmbedReload(r => r + 1); saveSourcePref({ sourceMode: "embedded", embedProvider: p.id, embedLang: "sub", subType: "sub" }); }}
                      disabled={!url}
                    >{p.name}</button>
                  );
                })}
                {/* AnimePlay Sub */}
                {ANIMEPLAY_PROVIDERS.filter(p => p.id === "animeplay_sub").map(p => {
                  const url = p.getUrl({ anilistId, episode: epNumber });
                  return (
                    <button key={`sub-${p.id}`}
                      className={`${styles.serverBtn} ${sourceMode === "embedded" && embedProvider === p.id ? styles.serverBtnActive : ""}`}
                      onClick={() => { setSourceMode("embedded"); setEmbedProvider(p.id); setEmbedLang("sub"); setEmbedReload(r => r + 1); saveSourcePref({ sourceMode: "embedded", embedProvider: p.id, embedLang: "sub", subType: "sub" }); }}
                      disabled={!url}
                    >{p.name}</button>
                  );
                })}
              </div>
            </div>

            {/* DUB row */}
            <div className={styles.serverRow}>
              <span className={styles.serverRowLabel}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                DUB
              </span>
              <div className={styles.serverBtns}>
                {/* Crysoline sources (dub) */}
                {CRYSOLINE_SOURCES.map(src => (
                  <button
                    key={`${src.id}-dub`}
                    className={`${styles.serverBtn} ${sourceMode === "crysoline" && activeSrcId === src.id && crySubType === "dub" ? styles.serverBtnActive : ""} ${sourceMap[src.id] === null ? styles.serverBtnUnavail : ""}`}
                    onClick={() => { setCrySubType("dub"); saveSourcePref({ subType: "dub" }); handleSourceClick(src.id); }}
                  >{src.name}</button>
                ))}
                {/* VidNest Dub */}
                {VIDNEST_PROVIDERS.map(p => {
                  const url = p.getUrl({ anilistId, episode: epNumber, lang: "dub" });
                  return (
                    <button key={`${p.id}-dub`}
                      className={`${styles.serverBtn} ${sourceMode === "embedded" && embedProvider === p.id && embedLang === "dub" ? styles.serverBtnActive : ""}`}
                      onClick={() => { setSourceMode("embedded"); setEmbedProvider(p.id); setEmbedLang("dub"); setEmbedReload(r => r + 1); saveSourcePref({ sourceMode: "embedded", embedProvider: p.id, embedLang: "dub", subType: "dub" }); }}
                      disabled={!url}
                    >{p.name}</button>
                  );
                })}
                {/* MegaPlay Dub */}
                {MEGAPLAY_PROVIDERS.filter(p => p.id !== "megaplay_ani").map(p => {
                  const url = p.getUrl({ anilistId, episode: epNumber, lang: "dub" });
                  return (
                    <button key={`${p.id}-dub`}
                      className={`${styles.serverBtn} ${sourceMode === "embedded" && embedProvider === p.id && embedLang === "dub" ? styles.serverBtnActive : ""}`}
                      onClick={() => { setSourceMode("embedded"); setEmbedProvider(p.id); setEmbedLang("dub"); setEmbedReload(r => r + 1); saveSourcePref({ sourceMode: "embedded", embedProvider: p.id, embedLang: "dub", subType: "dub" }); }}
                      disabled={!url}
                    >{p.name}</button>
                  );
                })}
                {/* AnimePlay Dub */}
                {ANIMEPLAY_PROVIDERS.filter(p => p.id === "animeplay_dub").map(p => {
                  const url = p.getUrl({ anilistId, episode: epNumber });
                  return (
                    <button key={`${p.id}-dub`}
                      className={`${styles.serverBtn} ${sourceMode === "embedded" && embedProvider === p.id ? styles.serverBtnActive : ""}`}
                      onClick={() => { setSourceMode("embedded"); setEmbedProvider(p.id); setEmbedLang("dub"); setEmbedReload(r => r + 1); saveSourcePref({ sourceMode: "embedded", embedProvider: p.id, embedLang: "dub", subType: "dub" }); }}
                      disabled={!url}
                    >{p.name}</button>
                  );
                })}
              </div>
            </div>

            {/* Quality selector */}
            {cryStream?.sources?.length > 1 && (
              <div className={styles.ctrlRow}>
                <span className={styles.ctrlLabel}>Quality</span>
                <div className={styles.btnGroup}>
                  {cryStream.sources.map((s, i) => (
                    <button key={i}
                      className={`${styles.optBtn} ${crySelSrc?.url === s.url ? styles.optBtnActive : ""}`}
                      onClick={() => setCrySelSrc(s)}>
                      {s.quality || `Stream ${i + 1}`}
                      {s.isHLS && <span className={styles.hlsBadge}>HLS</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Server selector */}
            {cryServers.length > 1 && (
              <div className={styles.ctrlRow}>
                <span className={styles.ctrlLabel}>Server</span>
                <div className={styles.btnGroup}>
                  <button
                    className={`${styles.optBtn} ${!cryServer ? styles.optBtnActive : ""}`}
                    onClick={() => { setCryServer(""); fetchStream(crySubType, ""); }}>
                    Default
                  </button>
                  {cryServers.map((sv, i) => (
                    <button key={i}
                      className={`${styles.optBtn} ${cryServer === (sv.name || sv) ? styles.optBtnActive : ""}`}
                      onClick={() => { setCryServer(sv.name || sv); fetchStream(crySubType, sv.name || sv); }}>
                      {sv.name || sv}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subtitle count info */}
            {(() => {
              const vttCount = (cryStream?.subtitles || []).filter(s => {
                const url = (s.url || "").toLowerCase();
                return !url.includes(".ass") && !url.includes(".ssa");
              }).length;
              if (!vttCount) return null;
              return (
                <div className={styles.subInfo}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M7 12h4m-4 4h10M15 12h2"/>
                  </svg>
                  {vttCount} subtitle track{vttCount > 1 ? "s" : ""} available
                </div>
              );
            })()}
          </div>
        </div>

        {/* Episode nav with prefetch on hover */}
        <div className={styles.epNav}>
          <button className={styles.navBtn} disabled={!prevEp}
            onMouseEnter={() => prefetchEp(prevEp)}
            onClick={() => goToEp(prevEp)}>
            ← Prev
          </button>
          <div className={styles.navMid}>
            <span className={styles.epLabel}>Episode {epNumber}</span>
            {currentEp?.airDate && <span className={styles.airDate}>{currentEp.airDate}</span>}
          </div>
          <button className={styles.navBtn} disabled={!nextEp}
            onMouseEnter={() => prefetchEp(nextEp)}
            onClick={() => goToEp(nextEp)}>
            Next →
          </button>
        </div>

        {/* Next episode release date */}
        {!nextEp && (info?.anime?.info?.nextAiring || info?.anime?.moreInfo?.nextAiring) && (() => {
          const nextAiring = info?.anime?.info?.nextAiring || info?.anime?.moreInfo?.nextAiring;
          const { airingAt, episode } = nextAiring;
          const releaseDate = new Date(airingAt * 1000);
          const now = new Date();
          const diffMs = releaseDate - now;
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const formatted = releaseDate.toLocaleDateString(undefined, {
            weekday: "short", month: "short", day: "numeric",
          });
          const timeStr = diffMs > 0
            ? diffDays === 0 ? "today" : diffDays === 1 ? "tomorrow" : `in ${diffDays} days`
            : null;
          return (
            <div className={styles.nextEpBanner}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <span>
                Episode {episode} releases on <strong>{formatted}</strong>
                {timeStr && <> — <em>{timeStr}</em></>}
              </span>
            </div>
          );
        })()}

        {/* Anime info panel */}
        {!anime ? <InfoPanelSkeleton /> : (
          <div className={styles.infoPanel}>
            <div className={styles.infoPosterWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={anime.poster} alt={anime.name} className={styles.infoPoster} />
            </div>
            <div className={styles.infoBody}>
              <Link href={`/anime/${animeId}`} className={styles.infoTitle}>{anime.name}</Link>
              {anime.jname && anime.jname !== anime.name && (
                <p className={styles.infoJname}>{anime.jname}</p>
              )}
              <div className={styles.infoMeta}>
                {anime.rating  && <span className={styles.ratingBadge}>★ {anime.rating}</span>}
                {anime.type    && <span className={styles.metaTag}>{anime.type}</span>}
                {anime.status  && <span className={styles.metaTag}>{(anime.status || "").replace(/_/g, " ")}</span>}
              </div>
              {moreInfo?.genres?.length > 0 && (
                <div className={styles.infoGenres}>
                  {moreInfo.genres.slice(0, 4).map(g => (
                    <Link key={g} href={`/browse?category=genre/${g.toLowerCase().replace(/ /g, "-")}`} className="tag">{g}</Link>
                  ))}
                </div>
              )}
              {anime.description && (
                <p className={styles.infoDesc}>
                  {anime.description.replace(/<[^>]*>/g, "").slice(0, 200)}
                  {anime.description.length > 200 ? "…" : ""}
                </p>
              )}
              <div className={styles.infoActions}>
                <Link href={`/anime/${animeId}`} className={styles.viewMoreLink}>Full details →</Link>
                {nextEp && (
                  <button className={styles.nextEpBtn} onClick={() => goToEp(nextEp)}>
                    Next Ep →
                  </button>
                )}
              </div>

              {/* AniList sync panel */}
              {anilistId && (
                <div style={{ marginTop: 14 }}>
                  <AniListPanel
                    anilistId={anilistId}
                    epNumber={epNumber}
                    totalEpisodes={anime?.episodes?.sub || null}
                    compact
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <CommentsSection
          animeId={anilistId}
          malId={moreInfo?.malId}
          epNumber={epNumber}
          title={anime?.name}
        />
      </div>

      {/* Right column */}
      <div className={styles.rightCol}>
        <div className={styles.epSidebar}>
          <div className={styles.epSideHead}>
            <p className={styles.epSideTitle}>{anime?.name || "Episodes"}</p>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span className={styles.epSideCount}>
                {(() => {
                  const loaded = eps.length;
                  const total  = anime?.episodes?.total
                    || info?.anime?.moreInfo?.nextAiring?.episode
                    || null;
                  if (total && total !== loaded) return loaded + " / " + total + " eps";
                  return loaded + " eps";
                })()}
              </span>
              {(anime?.episodes?.sub > 0 || anime?.episodes?.dub > 0) && (
                <span style={{ fontSize: 11, display: "flex", gap: 6 }}>
                  {anime.episodes.sub > 0 && <span className="badge badge-sub">SUB {anime.episodes.sub}</span>}
                  {anime.episodes.dub > 0 && <span className="badge badge-dub">DUB {anime.episodes.dub}</span>}
                </span>
              )}
            </div>
          </div>

          {/* Season selector tabs */}
          {seasons.length > 1 && (
            <div className={styles.seasonTabs}>
              {seasons.map(s => (
                <a
                  key={s.id}
                  href={`/anime/${s.id}`}
                  className={`${styles.seasonTab} ${s.id === animeId ? styles.seasonTabActive : ""}`}
                  title={s.name || s.title}
                >
                  {s.name || s.title}
                </a>
              ))}
            </div>
          )}

          <div className={styles.epList}>
            {epsLoading && eps.length === 0
              ? <EpisodeSkeleton />
              : dispEps.map(ep => (
                  <Link key={ep.epSlug} href={`/watch/${animeId}/${ep.epSlug}`}
                    className={`${styles.epItem} ${ep.epSlug === epSlug ? styles.epActive : ""} ${ep.isFiller ? styles.epFiller : ""}`}
                    onMouseEnter={() => prefetchEp(ep)}
                  >
                    <div className={styles.epContent}>
                      <span className={styles.epNum}>Ep {ep.number}</span>
                      {ep.isFiller && <span className={styles.fillerBadge}>FILLER</span>}
                    </div>
                    {getEpProgress(animeId, ep.number) > 0 && (
                      <div className={styles.epProgress} style={{ width: `${getEpProgress(animeId, ep.number)}%` }} />
                    )}
                  </Link>
                ))
            }
            {eps.length > 60 && !showAllEps && (
              <button className={styles.showAllBtn} onClick={() => setShowAllEps(true)}>
                Show all {eps.length} episodes
              </button>
            )}
          </div>
        </div>

        {sidebarSections.map(sec => (
          <div key={sec.label} className={styles.relatedBlock}>
            <h3 className={styles.relatedTitle}>{sec.label}</h3>
            <div className={styles.relatedList}>
              {sec.items.map(item => (
                <Link key={item.id} href={`/anime/${item.id}`} className={styles.relatedCard}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.poster} alt={item.name} className={styles.relatedPoster} loading="lazy" />
                  <div className={styles.relatedInfo}>
                    <p className={styles.relatedName}>{item.name}</p>
                    <div className={styles.relatedMeta}>
                      {item.type && <span>{item.type}</span>}
                      {item.episodes?.sub > 0 && <span className="badge badge-sub">{item.episodes.sub} eps</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
