"use client";
import { useState, useEffect } from "react";
import { useTheme, THEMES } from "@/components/ThemeProvider";

export default function SettingsPanel({ open, onClose }) {
  const { theme, setTheme } = useTheme();
  const [tab,    setTab]    = useState("theme");
  const [user,   setUser]   = useState(null);
  const [msg,    setMsg]    = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user || null));
  }, []);

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
    if (!confirm("This will delete ALL your data. Are you sure? This cannot be undone.")) return;
    await fetch("/api/auth/reset?action=all", { method: "DELETE" });
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    setMsg("All data reset.");
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={s.backdrop} onClick={onClose} />

      {/* Panel */}
      <div style={s.panel}>
        <div style={s.panelHead}>
          <h3 style={s.panelTitle}>Settings</h3>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {["theme", "privacy"].map(t => (
            <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
              onClick={() => setTab(t)}>
              {t === "theme" ? "🎨 Theme" : "🔒 Privacy"}
            </button>
          ))}
        </div>

        {/* Theme tab */}
        {tab === "theme" && (
          <div style={s.content}>
            <p style={s.sectionLabel}>Accent Color</p>
            <div style={s.themeGrid}>
              {Object.entries(THEMES).map(([key, t]) => (
                <button key={key} style={s.themeOption} onClick={() => setTheme(key)}
                  title={t.name}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    backgroundColor: t.accent,
                    border: theme === key ? "3px solid #fff" : "3px solid transparent",
                    boxShadow: theme === key ? `0 0 12px ${t.accent}` : "none",
                    transition: "all 0.2s",
                  }} />
                  <span style={s.themeLabel}>{t.emoji} {t.name}</span>
                </button>
              ))}
            </div>
            <p style={{ ...s.sectionLabel, marginTop: "20px" }}>Current: <span style={{ color: "var(--accent)" }}>{THEMES[theme]?.name}</span></p>
          </div>
        )}

        {/* Privacy tab */}
        {tab === "privacy" && (
          <div style={s.content}>
            {msg && <p style={s.successMsg}>{msg}</p>}

            <div style={s.privacyCard}>
              <p style={s.privacyTitle}>Clear Watch History</p>
              <p style={s.privacyDesc}>Remove all saved episode positions and watch history.</p>
              <button style={s.dangerBtn} onClick={clearHistory}>Clear History</button>
            </div>

            <div style={s.privacyCard}>
              <p style={s.privacyTitle}>Clear Local Data</p>
              <p style={s.privacyDesc}>Reset preferences and cached data from this browser.</p>
              <button style={s.warnBtn} onClick={clearLocalData}>Clear Local Data</button>
            </div>

            {user && (
              <div style={{ ...s.privacyCard, borderColor: "rgba(239,68,68,0.3)" }}>
                <p style={{ ...s.privacyTitle, color: "#ef4444" }}>Reset Everything</p>
                <p style={s.privacyDesc}>Delete all data: history, watchlist, comments, preferences. Cannot be undone.</p>
                <button style={{ ...s.dangerBtn, backgroundColor: "#ef4444" }} onClick={resetAll}>
                  Reset All Data
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const s = {
  backdrop: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 998, backdropFilter: "blur(2px)" },
  panel: {
    position: "fixed", top: 0, right: 0, bottom: 0, width: "320px", zIndex: 999,
    backgroundColor: "#0e0e12", borderLeft: "1px solid rgba(255,255,255,0.08)",
    overflowY: "auto", fontFamily: "Inter,sans-serif",
    boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
  },
  panelHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 0" },
  panelTitle: { color: "#fff", fontSize: "18px", fontWeight: 700, margin: 0 },
  closeBtn: { background: "none", border: "none", color: "#a0a0b0", fontSize: "20px", cursor: "pointer" },
  tabs: { display: "flex", gap: "4px", padding: "16px 20px 0" },
  tab: { flex: 1, background: "rgba(255,255,255,0.05)", border: "none", color: "#a0a0b0", padding: "8px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "Inter,sans-serif" },
  tabActive: { backgroundColor: "var(--accent)", color: "#fff" },
  content: { padding: "20px" },
  sectionLabel: { color: "#606070", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 14px" },
  themeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  themeOption: { display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px", cursor: "pointer", fontFamily: "Inter,sans-serif" },
  themeLabel: { color: "#a0a0b0", fontSize: "12px", fontWeight: 500 },
  privacyCard: { backgroundColor: "#141418", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px", marginBottom: "12px" },
  privacyTitle: { color: "#fff", fontSize: "14px", fontWeight: 600, margin: "0 0 6px" },
  privacyDesc: { color: "#606070", fontSize: "12px", lineHeight: 1.5, margin: "0 0 12px" },
  dangerBtn: { backgroundColor: "#e8417a", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "Inter,sans-serif" },
  warnBtn: { backgroundColor: "rgba(255,255,255,0.08)", color: "#a0a0b0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "Inter,sans-serif" },
  successMsg: { color: "#4ade80", fontSize: "13px", backgroundColor: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" },
};
