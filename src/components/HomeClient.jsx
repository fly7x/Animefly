"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import AnimeCard from "@/components/AnimeCard";
import DiscordBanner from "@/components/DiscordBanner";
import { api } from "@/lib/api";
import { getRecentlyWatched } from "@/lib/watchProgress";

// ── Countdown ─────────────────────────────────────────────────────────────────
function fmt(airingAt) {
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
  const [t, setT] = useState(fmt(airingAt));
  useEffect(() => {
    const id = setInterval(() => setT(fmt(airingAt)), 1000);
    return () => clearInterval(id);
  }, [airingAt]);
  return <span style={{ color: "var(--accent,#e8417a)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{t}</span>;
}

// ── Hero slide — bottom-aligned like AniCult ──────────────────────────────────
function HeroSlide({ anime, rank, active }) {
  const nxt    = anime?.nextAiring;
  const title  = anime?.name || "Unknown";
  const bg     = anime?.banner || anime?.poster;
  const genres = (anime?.genres || []).slice(0, 3);
  const score  = anime?.rating;
  const desc   = anime?.description?.replace(/<[^>]*>/g, "").slice(0, 160) || "";

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "flex-end",
      opacity: active ? 1 : 0,
      visibility: active ? "visible" : "hidden",
      transition: "opacity 0.6s ease, visibility 0.6s ease",
    }}>
      {/* Background */}
      {bg && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center 25%",
          opacity: 0.85,
          transition: "transform 7s ease",
          transform: active ? "scale(1.06)" : "scale(1)",
        }} />
      )}

      {/* Gradient overlay — fades to bg at bottom like AniCult */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(8,8,12,0.35) 0%, rgba(8,8,12,0.88) 65%, var(--bg,#0e0e12) 100%)",
      }} />

      {/* Content — bottom aligned */}
      <div style={{
        position: "relative", zIndex: 2,
        width: "100%", maxWidth: "1280px", margin: "0 auto",
        padding: "32px 24px",
        display: "flex", alignItems: "flex-end", gap: "20px",
      }}>
        {/* Big rank number */}
        <div style={{
          fontSize: "clamp(80px,12vw,150px)", fontWeight: 800,
          lineHeight: 0.75, fontStyle: "italic", letterSpacing: "-6px",
          color: "var(--accent,#e8417a)", opacity: 0.9, flexShrink: 0,
          marginBottom: "-10px", textShadow: "0 2px 10px rgba(0,0,0,0.7)",
          userSelect: "none",
        }}>
          #{rank}
        </div>

        {/* Cover + info */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "20px", flex: 1, minWidth: 0 }}>
          {/* Cover poster */}
          <div style={{
            width: "130px", borderRadius: "10px", overflow: "hidden",
            flexShrink: 0, border: "2px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={anime?.poster} alt={title}
              style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }}
              onError={e => { e.target.style.display = "none"; }} />
          </div>

          {/* Text info */}
          <div style={{ flex: 1, minWidth: 0, paddingBottom: "6px" }}>
            {/* Airing badge with pulsing dot */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#4ade80", marginBottom: "8px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#4ade80", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
              Now Airing
            </div>

            <h2 style={{ fontSize: "clamp(18px,3vw,28px)", fontWeight: 700, lineHeight: 1.2, marginBottom: "10px", color: "#fff" }}>
              {title}
            </h2>

            {/* Genre tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
              {genres.map(g => (
                <span key={g} style={{ fontSize: "11px", padding: "3px 9px", borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8a8a9a" }}>
                  {g}
                </span>
              ))}
              {score && (
                <span style={{ fontSize: "11px", padding: "3px 9px", borderRadius: "6px", color: "var(--accent,#e8417a)", borderColor: "rgba(230,57,70,0.3)", backgroundColor: "rgba(230,57,70,0.08)", border: "1px solid" }}>
                  {score}
                </span>
              )}
            </div>

            {/* Description */}
            {desc && (
              <p style={{ fontSize: "13px", color: "#8a8a9a", lineHeight: 1.6, marginBottom: "10px", maxWidth: "620px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {desc}
              </p>
            )}

            {/* Meta + countdown */}
            <div style={{ fontSize: "12px", color: "#505060", marginBottom: "14px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span>{[anime?.type, anime?.season, anime?.status].filter(Boolean).join(" · ")}</span>
              {nxt && (
                <span style={{ color: "#8a8a9a", display: "flex", alignItems: "center", gap: "5px" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  EP {nxt.episode} in <Countdown airingAt={nxt.airingAt} />
                </span>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link href={`/anime/${anime?.id}`} style={{
                backgroundColor: "var(--accent,#e8417a)", color: "#fff",
                padding: "9px 20px", borderRadius: "8px", fontWeight: 600,
                fontSize: "14px", display: "inline-block", textDecoration: "none",
              }}>
                View Details
              </Link>
              <Link href={`/watch/${anime?.id}/ep-1`} style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
                color: "#fff", padding: "9px 20px", borderRadius: "8px",
                fontWeight: 600, fontSize: "14px", display: "inline-block", textDecoration: "none",
              }}>
                Watch Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Scroll section ────────────────────────────────────────────────────────────
function Section({ title, href, items, loading }) {
  return (
    <div style={{ marginBottom: "40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#f0f0f5", margin: 0 }}>{title}</h2>
        {href && (
          <Link href={href} style={{ fontSize: "13px", color: "var(--accent,#e8417a)", fontWeight: 500, textDecoration: "none" }}>
            View All
          </Link>
        )}
      </div>
      <div style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "8px", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ minWidth: "160px", width: "160px", height: "240px", backgroundColor: "#12121a", borderRadius: "10px", flexShrink: 0 }} />
            ))
          : items.map(a => (
              <div key={a.id} style={{ minWidth: "160px", maxWidth: "160px", flexShrink: 0 }}>
                <AnimeCard anime={a} />
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ── Continue watching ─────────────────────────────────────────────────────────
function ContinueCard({ item }) {
  return (
    <Link href={`/watch/${item.id}/ep-${item.ep}`} style={{
      position: "relative", minWidth: "200px", width: "200px", height: "120px",
      borderRadius: "10px", overflow: "hidden", display: "block",
      flexShrink: 0, textDecoration: "none", backgroundColor: "#12121a",
    }}>
      {item.poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.poster} alt={item.title}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={e => { e.target.style.display = "none"; }} />
      )}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 55%)",
        display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "10px",
      }}>
        <p style={{ color: "#fff", fontSize: "12px", fontWeight: 600, margin: "0 0 2px", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {item.title}
        </p>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", margin: "0 0 6px" }}>
          Episode {item.ep}
        </p>
        
