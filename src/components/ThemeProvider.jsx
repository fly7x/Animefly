"use client";
import { useEffect, createContext, useContext, useState } from "react";

const THEMES = {
  pink:   { accent: "#e8417a", accentHover: "#f0527f", bg: "#0e0e12", bgCard: "#141418", name: "Default Pink",    emoji: "🌸" },
  green:  { accent: "#22c55e", accentHover: "#16a34a", bg: "#080f0a", bgCard: "#0f1a0f", name: "Dark Green",      emoji: "🌿" },
  blue:   { accent: "#3b82f6", accentHover: "#2563eb", bg: "#080e14", bgCard: "#0d1520", name: "Ocean Blue",      emoji: "🌊" },
  purple: { accent: "#a855f7", accentHover: "#9333ea", bg: "#0d0814", bgCard: "#140d1a", name: "Cosmic Purple",   emoji: "🔮" },
  amber:  { accent: "#f59e0b", accentHover: "#d97706", bg: "#110e06", bgCard: "#1a1408", name: "Amber Gold",      emoji: "✨" },
  teal:   { accent: "#14b8a6", accentHover: "#0d9488", bg: "#060f0f", bgCard: "#0a1818", name: "Midnight Teal",   emoji: "🌙" },
  red:    { accent: "#ef4444", accentHover: "#dc2626", bg: "#100808", bgCard: "#1a0d0d", name: "Crimson",         emoji: "🔥" },
};

export const ThemeContext = createContext({ theme: "pink", setTheme: () => {} });
export function useTheme() { return useContext(ThemeContext); }
export { THEMES };

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("pink");

  useEffect(() => {
    // Load from localStorage first (instant)
    const saved = localStorage.getItem("fa_theme") || "pink";
    setTheme(saved);
    applyTheme(saved);

    // Then sync from server
    fetch("/api/auth/preferences")
      .then(r => r.json())
      .then(d => {
        if (d.preferences?.theme) {
          setTheme(d.preferences.theme);
          applyTheme(d.preferences.theme);
          localStorage.setItem("fa_theme", d.preferences.theme);
        }
      })
      .catch(() => {});
  }, []);

  function applyTheme(key) {
    const t = THEMES[key] || THEMES.pink;
    const root = document.documentElement;
    root.style.setProperty("--accent",       t.accent);
    root.style.setProperty("--accent-hover", t.accentHover);
    root.style.setProperty("--bg",           t.bg);
    root.style.setProperty("--bg-card",      t.bgCard);
    root.style.setProperty("--accent-soft",  t.accent + "28");
    root.style.setProperty("--accent-glow",  t.accent + "44");
    root.style.setProperty("--border",       t.accent + "18");
    root.style.setProperty("--border-md",    t.accent + "30");
  }

  async function changeTheme(key) {
    setTheme(key);
    applyTheme(key);
    localStorage.setItem("fa_theme", key);
    await fetch("/api/auth/preferences", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: key }),
    }).catch(() => {});
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}
