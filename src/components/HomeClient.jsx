"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import AnimeCard from "@/components/AnimeCard";
import DiscordBanner from "@/components/DiscordBanner";
import { api } from "@/lib/api";
import { getRecentlyWatched } from "@/lib/watchProgress";

// ── Next episode countdown ────────────────────────────────────────────────────
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

function useCountdown(airingAt) {
  const [text, setText] = useState(airingAt ? formatCountdown(airingAt) : null);
  useEffect(() => {
    if (!airingAt) return;
    const id = setInterval(() => setText(formatCountdown(airingAt)), 1000);
    return () => clearInterval(id);
  }, [airingAt]);
  return text;
}

// ── Hero slide ────────────────────────────────────────────────────────────────
function HeroSlide({ anime, active }) {
  const nxt = anime?.nextAiringEpisode;
  const countdown = useCountdown(nxt?.airingAt);
  const bg     = anime?.bannerImage || anime?.coverImage?.extraLarge;
  const title  = anime?.title?.english || anime?.title?.romaji || "Unknown";
  const genres = (anime?.genres || []).slice(0, 3);
  const score  = anime?.averageScore;
  const eps    = anime?.episodes || anime?.nextAiringEpisode?.episode - 1 || "?";

  return (
    <div style={{
      ...hs.slide,
      opacity: active ? 1 : 0,
      pointerEvents: active ? "all" : "none",
      transition: "opacity 0.7s ease",
    }}>
      {/* Background */}
      {bg && (
        <div style={{ ...hs.bg, backgroundImage: `url(${bg})` }} />
      )}
      <div style={hs.overlay} />

      {/* Content */}
      <div style={hs.content}>
        {/* Cover */}
        <div style={hs.coverWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={anime?.coverImage?.large || anime?.coverImage?.extraLarge}
            alt={title}
            style={hs.coverImg}
          />
        </div>

        {/* Info */}
        <div style={hs.info}>
          <span style={hs.badge}>Now Airing</span>

          <h1 style={hs.title}>{title}</h1>

          <div style={hs.tags}>
            {genres.map(g => <span key={g} style={hs.tag}>{g}</span>)}
            {score && <span style={hs.tagAccent}>{score}%</span>}
          </div>

          {/* Next episode countdown */}
          {nxt && countdown && (
            <div style={hs.countdown}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              EP {nxt.episode} in <strong style={{ color: "var(--accent,#e8417a)", marginLeft: "4px" }}>{countdown}</strong>
            </div>
          )}

          <div style={hs.meta}>
            {anime?.format || "TV"} · {eps} eps
          </div>

          <div style={hs.actions}>
            <Link href={`/anime/${anime?.id}`} style={hs.btnPrimary}>
              View Details
            </Link>
            <Link href={`/watch/${anime?.id}/ep-1`} style={hs.btnOutline}>
              Watch Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, href, items, loading }) {
  return (
    <section style={sc.section}>
      <div style={sc.header}>
        <h2 style={sc.title}>{title}</h2>
        {href && <Link href={href} style={sc.link}>View All →</Link>}
      </div>
      <div style={sc.row}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={sc.skeleton} />
            ))
          : items.map(a => <AnimeCard key={a.id} anime={a} />)}
      </div>
    </section>
  );
}

// ── Continue watching card ────────────────────────────────────────────────────
function ContinueCard({ item }) {
  return (
    <Link href={`/watch/${item.id}/ep-${item.ep}`} style={cc.card}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.poster} alt={item.title} style={cc.img}
        onError={e => { e.target.style.display = "none"; }} />
      <div style={cc.overlay}>
        <p style={cc.name}>{item.title}</p>
        <p style={cc.ep}>Episode {item.ep}</p>
        <span style={cc.resume}>▶ Resume</span>
      </div>
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HomeClient({ initialData }) {
  const [data,    setData]    = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [recent,  setRecent]  = useState([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const localHistory = getRecentlyWatched(10);
    setRecent(localHistory);

    if (initialData) return;
    api.home()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [initialData]);

  const spotlight = data?.spotlight || data?.trending?.media || [];
  const trending  = data?.trending?.media  || [];
  const newEps    = data?.newEpisodes?.media || data?.recentlyUpdated?.media || [];
  const popular   = data?.popular?.media   || [];
  const topAiring = data?.topAiring?.media || spotlight;
  const heroList  = topAiring.slice(0, 8);

  // Auto-advance hero
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

      {/* ── Hero slideshow ── */}
      {heroList.length > 0 && (
        <div style={hero.wrap}>
          {heroList.map((anime, i) => (
            <HeroSlide key={anime.id} anime={anime} active={i === heroIdx} />
          ))}

          {/* Arrows */}
          {heroList.length > 1 && (
            <>
              <button style={hero.arrow} onClick={() => goTo(heroIdx - 1)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              </button>
              <button style={{ ...hero.arrow, right: "16px", left: "auto" }} onClick={() => goTo(heroIdx + 1)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
              </button>
            </>
          )}

          {/* Dots */}
          {heroList.length > 1 && (
            <div style={hero.dots}>
              {heroList.map((_, i) => (
                <button key={i} onClick={() => goTo(i)}
                  style={{ ...hero.dot, backgroundColor: i === heroIdx ? "var(--accent,#e8417a)" : "rgba(255,255,255,0.3)", transform: i === heroIdx ? "scale(1.3)" : "scale(1)" }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 16px" }}>

        {/* Continue Watching */}
        {recent.length > 0 && (
          <section style={sc.section}>
            <div style={sc.header}>
              <h2 style={sc.title}>Continue Watching</h2>
            </div>
            <div style={sc.row}>
              {recent.map(item => <ContinueCard key={item.id} item={item} />)}
            </div>
          </section>
        )}

        {/* Discord banner */}
        <DiscordBanner />

        <Section title="Trending Now"       href="/browse?category=trending"       items={trending}  loading={loading} />
        <Section title="Latest Episodes"    href="/browse?category=recently-updated" items={newEps}  loading={loading} />
        <Section title="All Time Popular"   href="/browse?category=popular"         items={popular}  loading={loading} />
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const hero = {
  wrap: { position: "relative", width: "100%", height: "clamp(420px,60vh,680px)", overflow: "hidden", backgroundColor: "#000" },
  arrow: { position: "absolute", top: "50%", left: "16px", transform: "translateY(-50%)", zIndex: 10, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: "50%", width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" },
  dots: { position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px", zIndex: 10 },
  dot: { width: "8px", height: "8px", borderRadius: "50%", border: "none", cursor: "pointer", transition: "all 0.3s", padding: 0 },
};

const hs = {
  slide: { position: "absolute", inset: 0, zIndex: 1 },
  bg: { position: "absolute", inset: 0, backgroundSize: "cover", backgroundPosition: "center top", filter: "blur(2px) brightness(0.5)", transform: "scale(1.05)" },
  overlay: { position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.1) 100%), linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 40%)" },
  content: { position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 clamp(16px,5vw,80px)", gap: "32px", zIndex: 2 },
  coverWrap: { flexShrink: 0, display: "none", "@media(min-width:640px)": { display: "block" } },
  coverImg: { width: "160px", height: "230px", objectFit: "cover", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", display: "block" },
  info: { flex: 1, maxWidth: "600px" },
  badge: { display: "inline-block", backgroundColor: "var(--accent,#e8417a)", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "4px 12px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" },
  title: { color: "#fff", fontSize: "clamp(22px,4vw,42px)", fontWeight: 900, lineHeight: 1.1, margin: "0 0 12px", textShadow: "0 2px 8px rgba(0,0,0,0.6)" },
  tags: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" },
  tag: { backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", fontSize: "12px", padding: "3px 10px", borderRadius: "20px", backdropFilter: "blur(4px)" },
  tagAccent: { backgroundColor: "var(--accent,#e8417a)", color: "#fff", fontSize: "12px", padding: "3px 10px", borderRadius: "20px", fontWeight: 700 },
  countdown: { display: "flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,0.7)", fontSize: "13px", marginBottom: "8px" },
  meta: { color: "rgba(255,255,255,0.5)", fontSize: "13px", marginBottom: "20px" },
  actions: { display: "flex", gap: "12px", flexWrap: "wrap" },
  btnPrimary: { backgroundColor: "var(--accent,#e8417a)", color: "#fff", padding: "11px 24px", borderRadius: "10px", textDecoration: "none", fontWeight: 700, fontSize: "14px", fontFamily: "Inter,sans-serif", display: "inline-block" },
  btnOutline: { backgroundColor: "rgba(255,255,255,0.12)", color: "#fff", padding: "11px 24px", borderRadius: "10px", textDecoration: "none", fontWeight: 700, fontSize: "14px", fontFamily: "Inter,sans-serif", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(8px)", display: "inline-block" },
};

const sc = {
  section: { padding: "32px 0 8px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  title: { color: "#fff", fontSize: "18px", fontWeight: 800, margin: 0 },
  link: { color: "var(--accent,#e8417a)", fontSize: "13px", textDecoration: "none", fontWeight: 600 },
  row: { display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "12px", scrollbarWidth: "thin", scrollbarColor: "rgba(232,65,122,0.4) transparent" },
  skeleton: { width: "140px", minWidth: "140px", height: "220px", backgroundColor: "#141418", borderRadius: "10px", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" },
};

const cc = {
  card: { position: "relative", width: "200px", minWidth: "200px", height: "120px", borderRadius: "10px", overflow: "hidden", textDecoration: "none", flexShrink: 0, display: "block" },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  overlay: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "10px" },
  name: { color: "#fff", fontSize: "12px", fontWeight: 600, margin: "0 0 2px", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
  ep: { color: "rgba(255,255,255,0.6)", fontSize: "11px", margin: "0 0 6px" },
  resume: { backgroundColor: "var(--accent,#e8417a)", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", alignSelf: "flex-start" },
};
