"use client";
import { useState, useEffect } from "react";
import { useTheme, THEMES } from "@/components/ThemeProvider";

export default function SettingsPanel({ open, onClose }) {
  const { theme, setTheme } = useTheme();
  const [user,   setUser]   = useState(null);
  const [msg,    setMsg]    = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user || null));
  }, [open]);

  async function clearHistory() {
    if (!confirm("Clear all watch history?")) return;
    await fetch("/api/auth/reset?action=history", { method: "DELETE" });
    setMsg("Watch history cleared.");
  }

  async function clearLocalData() {
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    setMsg("Local data cleared.");
  }

  async function resetAll() {
    if (!confirm("Delete ALL your data? This cannot be undone.")) return;
    await fetch("/api/auth/reset?action=all", { method: "DELETE" });
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    setMsg("All data reset.");
  }

  if (!open) return null;

  return (
    <>
      <div style={s.backdrop} onClick={onClose} />
      <div style={s.panel}>

        {/* Header */}
        <div style={s.header}>
          <h3 style={s.title}>Settings</h3>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.scroll}>

          {/* ── Theme ── */}
          <p style={s.sectionHead}>🎨 Accent Color</p>
          <div style={s.themeGrid}>
            {Object.entries(THEMES).map(([key, t]) => (
              <button key={key} onClick={() => setTheme(key)} style={s.themeOpt} title={t.name}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  backgroundColor: t.accent, flexShrink: 0,
                  border: theme === key ? "3px solid #fff" : "3px solid transparent",
                  boxShadow: theme === key ? `0 0 14px ${t.accent}` : "none",
                  transition: "all 0.2s",
                }} />
                <span style={{ ...s.themeLabel, color: theme === key ? "#fff" : "#a0a0b0" }}>
                  {t.emoji} {t.name}
                </span>
              </button>
            ))}
          </div>

          <div style={s.divider} />

          {/* ── Privacy & Account ── */}
          <p style={s.sectionHead}>🔒 Privacy & Account</p>

          {msg && <p style={s.successMsg}>{msg}</p>}

          <div style={s.privCard}>
            <div>
              <p style={s.privTitle}>Clear Watch History</p>
              <p style={s.privDesc}>Remove all saved episode positions from your account.</p>
            </div>
            <button style={s.warnBtn} onClick={clearHistory}>Clear</button>
          </div>

          <div style={s.privCard}>
            <div>
              <p style={s.privTitle}>Clear Local Data</p>
              <p style={s.privDesc}>Reset cached data and preferences from this browser.</p>
            </div>
            <button style={s.warnBtn} onClick={clearLocalData}>Clear</button>
          </div>

          {user && (
            <div style={{ ...s.privCard, borderColor: "rgba(239,68,68,0.25)" }}>
              <div>
                <p style={{ ...s.privTitle, color: "#ef4444" }}>Reset Everything</p>
                <p style={s.privDesc}>Delete all data: history, watchlist, comments. Cannot be undone.</p>
              </div>
              <button style={s.dangerBtn} onClick={resetAll}>Reset</button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

const s = {
  backdrop: {
    position: "fixed", inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)", zIndex: 998,
    backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
  },
  panel: {
    position: "fixed", top: 0, right: 0, bottom: 0, width: "300px",
    zIndex: 999, backgroundColor: "#0e0e12",
    borderLeft: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
    display: "flex", flexDirection: "column",
    fontFamily: "Inter,sans-serif",
  },
  header: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  title: { color: "#fff", fontSize: "17px", fontWeight: 700, margin: 0 },
  closeBtn: { background: "none", border: "none", color: "#606070", fontSize: "20px", cursor: "pointer" },
  scroll: { flex: 1, overflowY: "auto", padding: "20px" },
  sectionHead: {
    color: "#a0a0b0", fontSize: "13px", fontWeight: 700,
    margin: "0 0 14px", letterSpacing: "0.3px",
  },
  themeGrid: { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "4px" },
  themeOpt: {
    display: "flex", alignItems: "center", gap: "12px",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "10px", padding: "10px 14px", cursor: "pointer",
    fontFamily: "Inter,sans-serif", width: "100%", textAlign: "left",
    transition: "background 0.15s",
  },
  themeLabel: { fontSize: "13px", fontWeight: 500 },
  divider: { height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "20px 0" },
  privCard: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
    backgroundColor: "#141418", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px", padding: "14px 16px", marginBottom: "10px",
  },
  privTitle: { color: "#fff", fontSize: "13px", fontWeight: 600, margin: "0 0 4px" },
  privDesc: { color: "#606070", fontSize: "12px", lineHeight: 1.4, margin: 0 },
  warnBtn: {
    backgroundColor: "rgba(255,255,255,0.08)", color: "#a0a0b0",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
    padding: "7px 14px", fontSize: "12px", fontWeight: 600,
    cursor: "pointer", fontFamily: "Inter,sans-serif", flexShrink: 0,
  },
  dangerBtn: {
    backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444",
    border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px",
    padding: "7px 14px", fontSize: "12px", fontWeight: 600,
    cursor: "pointer", fontFamily: "Inter,sans-serif", flexShrink: 0,
  },
  successMsg: {
    color: "#4ade80", fontSize: "13px",
    backgroundColor: "rgba(74,222,128,0.1)",
    border: "1px solid rgba(74,222,128,0.2)",
    borderRadius: "8px", padding: "10px 14px", marginBottom: "12px",
  },
};
