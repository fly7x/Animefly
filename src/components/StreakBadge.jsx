"use client";

const ACHIEVEMENTS = {
  first_watch:  { label: "First Watch",    icon: "▶",  color: "#e8417a", desc: "Watched your first episode" },
  watched_10:   { label: "10 Episodes",    icon: "📺", color: "#3b82f6", desc: "Watched 10 episodes" },
  watched_50:   { label: "50 Episodes",    icon: "⭐", color: "#f59e0b", desc: "Watched 50 episodes" },
  watched_100:  { label: "Century Club",   icon: "💯", color: "#a855f7", desc: "Watched 100 episodes" },
  streak_3:     { label: "On a Roll",      icon: "🔥", color: "#f97316", desc: "3-day watch streak" },
  streak_7:     { label: "Week Warrior",   icon: "⚡", color: "#eab308", desc: "7-day watch streak" },
  streak_30:    { label: "Monthly Master", icon: "👑", color: "#e8417a", desc: "30-day watch streak" },
};

function FireIcon({ size = 24, color = "#f97316" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 2 9 7 9 10.5C9 12.433 10.343 14 12 14C13.657 14 15 12.433 15 10.5C15 9.2 14.3 8.1 14.3 8.1C14.3 8.1 16 10 16 13C16 16.314 14.209 19 12 19C9.791 19 8 16.314 8 13C8 9.134 10.5 5.5 12 2Z" opacity="0.7"/>
      <path d="M12 22C14.761 22 17 19.761 17 17C17 14.5 15.5 12.5 14 11.5C14 13 13.105 14.5 12 14.5C10.895 14.5 10 13 10 11.5C8.5 12.5 7 14.5 7 17C7 19.761 9.239 22 12 22Z"/>
    </svg>
  );
}

export { FireIcon, ACHIEVEMENTS };

export default function StreakBadge({ streak, total, achievements = [], compact = false }) {
  if (compact) {
    return (
      <div style={s.compact}>
        <FireIcon size={18} color={streak > 0 ? "#f97316" : "#353540"} />
        <span style={{ ...s.compactNum, color: streak > 0 ? "#f97316" : "#606070" }}>
          {streak}
        </span>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      {/* Streak */}
      <div style={s.streakCard}>
        <FireIcon size={36} color={streak > 0 ? "#f97316" : "#353540"} />
        <div>
          <p style={s.streakNum}>{streak}</p>
          <p style={s.streakLabel}>Day Streak</p>
        </div>
        <div style={s.streakRight}>
          <p style={s.totalNum}>{total}</p>
          <p style={s.streakLabel}>Episodes</p>
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div>
          <p style={s.achHead}>Achievements</p>
          <div style={s.achGrid}>
            {achievements.map(a => {
              const def = ACHIEVEMENTS[a.type];
              if (!def) return null;
              return (
                <div key={a.type} style={s.achBadge} title={def.desc}>
                  <div style={{ ...s.achIcon, backgroundColor: def.color + "22", border: `1px solid ${def.color}44` }}>
                    <span style={{ fontSize: "18px" }}>{def.icon}</span>
                  </div>
                  <span style={s.achLabel}>{def.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  compact: { display: "flex", alignItems: "center", gap: "4px" },
  compactNum: { fontWeight: 700, fontSize: "14px", fontFamily: "Inter,sans-serif" },
  wrap: { fontFamily: "Inter,sans-serif" },
  streakCard: {
    display: "flex", alignItems: "center", gap: "16px",
    backgroundColor: "#141418", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "14px", padding: "18px 20px", marginBottom: "20px",
  },
  streakNum: { color: "#fff", fontSize: "28px", fontWeight: 900, margin: 0, lineHeight: 1 },
  streakLabel: { color: "#606070", fontSize: "12px", margin: "4px 0 0" },
  streakRight: { marginLeft: "auto", textAlign: "right" },
  totalNum: { color: "#fff", fontSize: "22px", fontWeight: 800, margin: 0, lineHeight: 1 },
  achHead: { color: "#606070", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" },
  achGrid: { display: "flex", flexWrap: "wrap", gap: "10px" },
  achBadge: { display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", cursor: "default" },
  achIcon: { width: "52px", height: "52px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center" },
  achLabel: { color: "#a0a0b0", fontSize: "11px", textAlign: "center", maxWidth: "60px" },
};
