"use client";
import { useState, useEffect } from "react";

const STATUS_OPTIONS = [
  { key: "watching",   label: "Watching",     icon: "▶" },
  { key: "planning",   label: "Plan to Watch", icon: "📋" },
  { key: "completed",  label: "Completed",    icon: "✓" },
  { key: "on_hold",    label: "On Hold",      icon: "⏸" },
  { key: "dropped",    label: "Dropped",      icon: "✕" },
];

export default function AniListPanel({ anilistId, animeId, animeName, poster, compact = false }) {
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [open,    setOpen]    = useState(false);
  const [user,    setUser]    = useState(null);

  const id = animeId || String(anilistId);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user || null));
    if (!id) { setLoading(false); return; }
    fetch(`/api/watchlist`)
      .then(r => r.json())
      .then(d => {
        const entry = (d.watchlist || []).find(w => w.anime_id === id);
        if (entry) setStatus(entry.type || "watching");
        setLoading(false);
      });
  }, [id]);

  async function save(type) {
    if (!user) { window.location.href = "/login"; return; }
    setSaving(true);
    await fetch("/api/watchlist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anime_id: id, anime_name: animeName, poster, type }),
    });
    setStatus(type); setSaving(false); setOpen(false);
  }

  async function remove() {
    setSaving(true);
    await fetch(`/api/watchlist?anime_id=${id}`, { method: "DELETE" });
    setStatus(null); setSaving(false); setOpen(false);
  }

  if (!id) return null;

  const current = STATUS_OPTIONS.find(s => s.key === status);

  return (
    <div style={{ position: "relative", fontFamily: "Inter,sans-serif" }}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading || saving}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          backgroundColor: status ? "#e8417a" : "rgba(232,65,122,0.12)",
          border: "1px solid rgba(232,65,122,0.3)",
          color: status ? "#fff" : "#e8417a",
          borderRadius: "8px", padding: "9px 14px",
          fontSize: "13px", fontWeight: 600, cursor: "pointer",
          fontFamily: "Inter,sans-serif", width: "100%",
        }}
      >
        {loading ? "Loading..." : current
          ? `${current.icon} ${current.label}`
          : "+ Add to Watchlist"}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
          style={{ marginLeft: "auto", opacity: 0.6, transform: open ? "rotate(180deg)" : "", transition: "transform .2s" }}>
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
          backgroundColor: "#141418", border: "1px solid rgba(232,65,122,0.2)",
          borderRadius: "10px", padding: "8px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          {STATUS_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => save(opt.key)} disabled={saving}
              style={{
                display: "block", width: "100%", textAlign: "left",
                backgroundColor: status === opt.key ? "rgba(232,65,122,0.15)" : "transparent",
                border: "none", color: status === opt.key ? "#e8417a" : "#a0a0b0",
                padding: "9px 12px", borderRadius: "6px", fontSize: "13px",
                cursor: "pointer", fontFamily: "Inter,sans-serif", fontWeight: 500,
              }}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
          {status && (
            <>
              <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "6px 0" }} />
              <button onClick={remove} disabled={saving}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  backgroundColor: "transparent", border: "none", color: "#606070",
                  padding: "9px 12px", borderRadius: "6px", fontSize: "13px",
                  cursor: "pointer", fontFamily: "Inter,sans-serif",
                }}
              >
                ✕ Remove from list
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
