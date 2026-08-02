"use client";

export default function DiscordBanner() {
  return (
    <a href="https://dsc.gg/flyanime" target="_blank" rel="noopener noreferrer" style={s.wrap}>
      <div style={s.bg} />
      <div style={s.glowLeft} />
      <div style={s.glowRight} />
      <div style={s.content}>
        <div style={s.icon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
        </div>
        <div style={s.text}>
          <p style={s.eyebrow}>ANIME NEWS · SITE UPDATES · WEEKLY REVIEWS · EXCLUSIVE LEAKS</p>
          <h3 style={s.title}>Join Our Community</h3>
          <p style={s.sub}>Simulcast schedules, episode discussions, contests & more</p>
        </div>
        <div style={s.cta}>
          <span style={s.ctaBtn}>Join Server →</span>
          <p style={s.ctaLink}>dsc.gg/flyanime</p>
        </div>
      </div>
    </a>
  );
}

const s = {
  wrap: { display: "block", textDecoration: "none", width: "100%", margin: "28px 0", borderRadius: "16px", overflow: "hidden", position: "relative", cursor: "pointer", border: "1px solid rgba(88,101,242,0.35)" },
  bg: { position: "absolute", inset: 0, background: "linear-gradient(135deg,#0f0f2e 0%,#1a1a5e 35%,#1e1e6a 55%,#0a0a20 100%)", zIndex: 0 },
  glowLeft: { position: "absolute", left: "-30px", top: "-30px", width: "220px", height: "220px", borderRadius: "50%", background: "radial-gradient(circle,rgba(88,101,242,0.35) 0%,transparent 70%)", zIndex: 1, pointerEvents: "none" },
  glowRight: { position: "absolute", right: "-30px", bottom: "-30px", width: "240px", height: "240px", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,65,122,0.25) 0%,transparent 70%)", zIndex: 1, pointerEvents: "none" },
  content: { position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: "20px", padding: "24px 28px", flexWrap: "wrap" },
  icon: { width: "58px", height: "58px", borderRadius: "16px", backgroundColor: "#5865F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 24px rgba(88,101,242,0.55)" },
  text: { flex: 1, minWidth: "200px" },
  eyebrow: { color: "rgba(255,255,255,0.45)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.5px", margin: "0 0 6px", fontFamily: "Inter,sans-serif" },
  title: { color: "#fff", fontSize: "clamp(16px,3vw,22px)", fontWeight: 900, margin: "0 0 4px", fontFamily: "Inter,sans-serif", textShadow: "0 2px 8px rgba(0,0,0,0.5)" },
  sub: { color: "rgba(255,255,255,0.55)", fontSize: "13px", margin: 0, fontFamily: "Inter,sans-serif" },
  cta: { textAlign: "center", flexShrink: 0 },
  ctaBtn: { display: "inline-block", backgroundColor: "#5865F2", color: "#fff", padding: "11px 22px", borderRadius: "10px", fontSize: "14px", fontWeight: 700, fontFamily: "Inter,sans-serif", boxShadow: "0 4px 18px rgba(88,101,242,0.45)" },
  ctaLink: { color: "rgba(255,255,255,0.4)", fontSize: "11px", margin: "6px 0 0", fontFamily: "Inter,sans-serif" },
};
