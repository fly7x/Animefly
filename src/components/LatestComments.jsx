"use client";
import { useState, useEffect } from "react";

export default function LatestComments() {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    fetch("/api/comments/recent").then(r => r.json()).then(d => setComments(d.comments || []));
  }, []);

  if (comments.length === 0) return null;

  function timeAgo(str) {
    const diff = Date.now() - new Date(str).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function initials(name) { return name?.charAt(0)?.toUpperCase() || "?"; }

  return (
    <div style={s.wrap}>
      <h4 style={s.title}>Latest Comments</h4>
      {comments.map(c => (
        <div key={c.id} style={s.item}>
          <div style={s.avatar}>{initials(c.username)}</div>
          <div style={s.body}>
            <div style={s.meta}>
              <span style={s.username}>{c.username}</span>
              <span style={s.dot}>·</span>
              <span style={s.anime}>{c.anime_name || c.anime_id}</span>
              <span style={s.time}>{timeAgo(c.created_at)}</span>
            </div>
            <p style={s.text}>
              {c.content.length > 80 ? c.content.slice(0, 80) + "..." : c.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

const s = {
  wrap: { marginBottom: "32px", fontFamily: "Inter,sans-serif" },
  title: { color: "#fff", fontSize: "13px", fontWeight: 700, marginBottom: "14px", textTransform: "uppercase", letterSpacing: "1px" },
  item: { display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "12px" },
  avatar: { width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#e8417a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px", flexShrink: 0 },
  body: { flex: 1 },
  meta: { display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap", marginBottom: "3px" },
  username: { color: "#fff", fontWeight: 600, fontSize: "13px" },
  dot: { color: "#606070", fontSize: "12px" },
  anime: { color: "#e8417a", fontSize: "12px" },
  time: { color: "#606070", fontSize: "12px", marginLeft: "auto" },
  text: { color: "#a0a0b0", fontSize: "13px", margin: 0, lineHeight: 1.5 },
};
