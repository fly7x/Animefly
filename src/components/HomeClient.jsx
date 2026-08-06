"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import AnimeCard from "@/components/AnimeCard";
import DiscordBanner from "@/components/DiscordBanner";
import { api } from "@/lib/api";
import { getRecentlyWatched } from "@/lib/watchProgress";

// ── Countdown timer ───────────────────────────────────────────────────────────
function formatCountdown(airingAt) {
  const diff = airingAt * 1000 - Date.now();
  if (diff <= 0) return "Airing now";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function Countdown({ airingAt }) {
  const [text, setText] = useState(formatCountdown(airingAt));
  useEffect(() => {
    const id = setInterval(() => setText(formatCountdown(airingAt)), 1000);
    return () => clearInterval(id);
  }, [airingAt]);
  return <span style={{ color: "var(--accent,#e8417a)", fontWeight: 700 }}>{text}</span>;
}

// ── Hero slide ────────────────────────────────────────────────────────────────
function HeroSlide({ anime, active }) {
  const nxt   = anime?.nextAiring;
  const title = anime?.name || "Unknown";
  const bg    = anime?.banner || anime?.poster;
  const genres = (anime?.genres || []).slice(0, 3);

  return (
    <div style={{ ...css.slide, opacity: active ? 1 : 0, pointerEvents: active ? "all" : "none", transition: "opacity 0.8s ease" }}>
      {bg && <div style={{ ...css.slideBg, backgroundImage: `url(${bg})` }} />}
      <div style={css.slideOverlay} />
      <div style={css.slideContent}>
        {/* Cover poster */}
        <div style={css.coverWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={anime?.poster} alt={title} style={css.coverImg}
            onError={e => { e.target.style.display = "none"; }} />
        </div>

        {/* Info */}
        <div style={css.slideInfo}>
          <span style={css.airingBadge}>
            <svg width="8" height="8" viewBox="0 0 8 8" style={{ marginRight: "5px" }}>
              <circle cx="4" cy="4" r="4" fill="currentColor"/>
            </svg>
            Now Airing
          </span>

          <h1 style={css.slideTitle}>{title}</h1>

          {genres.length > 0 && (
            <div style={css.tagRow}>
              {genres.map(g => <span key={g} style={css.tag}>{g}</span>)}
              {anime?.rating && <span style={css.tagScore}>{anime.rating}</span>}
            </div>
          )}

          {nxt && (
            <div style={css.countdownRow}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>
                EP {nxt.episode} in <Countdown airingAt={nxt.airingAt} />
              </span>
            </div>
          )}

          <p style={css.slideMeta}>
            {[anime?.type, anime?.season, anime?.status].filter(Boolean).join(" · ")}
          </p>

          <div style={css.slideActions}>
            <Link href={`/anime/${anime?.id}`} style={css.btnPink}>View Details</Link>
            <Link href={`/watch/${anime?.id}/ep-1`} style={css.btnGlass}>Watch Now</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Horizontal scroll section ─────────────────────────────────────────────────
function Section({ title, href, items, loading }) {
  return (
    <section style={css.section}>
      <div style={css.sectionHead}>
        <h2 style={css.sectionTitle}>{title}</h2>
        {href && <Link href={href} style={css.sectionLink}>View All →</Link>}
      </div>
      <div style={css.scrollRow}>
        {loading
          ? Array.from({ length: 10 }).map((_, i) => <div key={i} style={css.skeleton} />)
          : items.map(a => <AnimeCard key={a.id} anime={a} />)
        }
      </div>
    </section>
  );
}

// ── Continue watching card ────────────────────────────────────────────────────
function ContinueCard({ item }) {
  return (
    <Link href={`/watch/${item.id}/ep-${item.ep}`} style={css.contCard}>
      {item.poster
        ? <img src={item.poster} alt={item.title} style={css.contImg} onError={e => { e.target.style.display = "none"; }} />
        : <div style={css.contPlaceholder}>🎌</div>}
      <div style={css.contOverlay}>
        <p style={css.contTitle}>{item.title}</p>
        <p style={css.contEp}>Episode {item.ep}</p>
        <span style={css.contBadge}>▶ Resume</span>
      </div>
    </Link>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomeClient({ initialData }) {
  const [data,    setData]    = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [recent,  setRecent]  = useState([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setRecent(getRecentlyWatched(10));
    if (initialData) return;
    api.home()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [initialData]);

  // Your API returns these fields
  const heroList  = data?.spotlightAnimes    || [];
  const trending  = data?.trendingAnimes     || [];
  const latest    = data?.latestEpisodeAnimes || [];
  const topAiring = data?.topAiringAnimes    || [];
  const topRated  = data?.mostFavoriteAnimes || [];

  const advance = useCallback(() => {
    if (heroList.length < 2) return;
    setHeroIdx(i => (i + 1) % heroList.length);
  }, [heroList.length]);

  useEffect(() => {
    if (heroList.length < 2) return;
    timerRef.current = setInterval(advance, 5000);
    return () => clearInterval(timerRef.current);
  }, [advance, heroList.length]);

  function goTo(n) {
    setHeroIdx((n + heroList.length) % heroList.length);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(advance, 5000);
  }

  return (
    <div style={{ backgroundColor: "var(--bg,#0e0e12)", minHeight: "100vh", fontFamily: "Inter,sans-serif" }}>

      {/* ── Hero ── */}
      {heroList.length > 0 && (
        <div style={css.heroWrap}>
          {heroList.slice(0, 8).map((a, i) => (
            <HeroSlide key={a.id} anime={a} active={i === heroIdx} />
          ))}

          {heroList.length > 1 && (
            <>
              <button style={css.arrowLeft} onClick={() => goTo(heroIdx - 1)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              </button>
              <button style={css.arrowRight} onClick={() => goTo(heroIdx + 1)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
              </button>
              <div style={css.dotRow}>
                {heroList.slice(0, 8).map((_, i) => (
                  <button key={i} onClick={() => goTo(i)} style={{
                    ...css.dot,
                    backgroundColor: i === heroIdx ? "var(--accent,#e8417a)" : "rgba(255,255,255,0.3)",
                    transform: i === heroIdx ? "scale(1.4)" : "scale(1)",
                  }} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Body ── */}
      <div style={css.body}>

        {/* Continue Watching */}
        {recent.length > 0 && (
          <section style={css.section}>
            <div style={css.sectionHead}>
              <h2 style={css.sectionTitle}>Continue Watching</h2>
            </div>
            <div style={css.scrollRow}>
              {recent.map(item => <ContinueCard key={item.id} item={item} />)}
            </div>
          </section>
        )}

        <DiscordBanner />

        <Section title="Trending Now"        href="/browse?category=trending"         items={trending}  loading={loading} />
        <Section title="Latest Episodes"     href="/browse?category=recently-updated"  items={latest}    loading={loading} />
        <Section title="Top Airing"          href="/browse?category=top-airing"        items={topAiring} loading={loading} />
        <Section title="Most Popular"        href="/browse?category=most-popular"      items={topRated}  loading={loading} />
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const css = {
  heroWrap: { position: "relative", width: "100%", height: "clamp(480px,65vh,700px)", overflow: "hidden", backgroundColor: "#000" },
  slide: { position: "absolute", inset: 0, zIndex: 1 },
  slideBg: { position: "absolute", inset: 0, backgroundSize: "cover", backgroundPosition: "center top", filter: "blur(3px) brightness(0.45)", transform: "scale(1.06)", transition: "opacity 0.8s" },
  slideOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.05) 100%), linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 35%)" },
  slideContent: { position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: "36px", padding: "0 clamp(16px,5vw,80px)", zIndex: 2 },
  coverWrap: { flexShrink: 0 },
  coverImg: { width: "clamp(120px,14vw,180px)", height: "clamp(170px,20vw,260px)", objectFit: "cover", borderRadius: "14px", boxShadow: "0 12px 40px rgba(0,0,0,0.7)", display: "block" },
  slideInfo: { flex: 1, maxWidth: "580px" },
  airingBadge: { display: "inline-flex", alignItems: "center", backgroundColor: "var(--accent,#e8417a)", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "5px 12px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" },
  slideTitle: { color: "#fff", fontSize: "clamp(22px,4vw,46px)", fontWeight: 900, lineHeight: 1.1, margin: "0 0 14px", textShadow: "0 2px 12px rgba(0,0,0,0.7)" },
  tagRow: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" },
  tag: { backgroundColor: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)", color: "rgba(255,255,255,0.8)", fontSize: "12px", padding: "4px 12px", borderRadius: "20px" },
  tagScore: { backgroundColor: "rgba(250,204,21,0.2)", color: "#facc15", fontSize: "12px", padding: "4px 12px", borderRadius: "20px", fontWeight: 700 },
  countdownRow: { display: "flex", alignItems: "center", gap: "7px", color: "rgba(255,255,255,0.6)", fontSize: "13px", marginBottom: "10px" },
  slideMeta: { color: "rgba(255,255,255,0.45)", fontSize: "13px", margin: "0 0 22px" },
  slideActions: { display: "flex", gap: "12px", flexWrap: "wrap" },
  btnPink: { backgroundColor: "var(--accent,#e8417a)", color: "#fff", padding: "12px 26px", borderRadius: "10px", textDecoration: "none", fontWeight: 700, fontSize: "14px", display: "inline-block", transition: "opacity 0.2s" },
  btnGlass: { backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", color: "#fff", padding: "12px 26px", borderRadius: "10px", textDecoration: "none", fontWeight: 700, fontSize: "14px", border: "1px solid rgba(255,255,255,0.2)", display: "inline-block" },
  arrowLeft: { position: "absolute", top: "50%", left: "16px", transform: "translateY(-50%)", zIndex: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  arrowRight: { position: "absolute", top: "50%", right: "16px", transform: "translateY(-50%)", zIndex: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  dotRow: { position: "absolute", bottom: "22px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px", zIndex: 10 },
  dot: { width: "8px", height: "8px", borderRadius: "50%", border: "none", cursor: "pointer", transition: "all 0.3s", padding: 0 },
  body: { maxWidth: "1400px", margin: "0 auto", padding: "0 16px 60px" },
  section: { padding: "32px 0 8px" },
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  sectionTitle: { color: "#fff", fontSize: "18px", fontWeight: 800, margin: 0 },
  sectionLink: { color: "var(--accent,#e8417a)", fontSize: "13px", textDecoration: "none", fontWeight: 600 },
  scrollRow: { display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "12px", scrollbarWidth: "thin", scrollbarColor: "rgba(232,65,122,0.3) transparent" },
  skeleton: { width: "140px", minWidth: "140px", height: "220px", backgroundColor: "#141418", borderRadius: "10px", flexShrink: 0, opacity: 0.6 },
  contCard: { position: "relative", width: "200px", minWidth: "200px", height: "120px", borderRadius: "10px", overflow: "hidden", textDecoration: "none", flexShrink: 0, display: "block" },
  contImg: { width: "100%", height: "100%", objectFit: "cover" },
  contPlaceholder: { width: "100%", height: "100%", backgroundColor: "#141418", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" },
  contOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 55%)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "10px" },
  contTitle: { color: "#fff", fontSize: "12px", fontWeight: 600, margin: "0 0 2px", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
  contEp: { color: "rgba(255,255,255,0.5)", fontSize: "11px", margin: "0 0 6px" },
  contBadge: { backgroundColor: "var(--accent,#e8417a)", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", alignSelf: "flex-start" },
};
