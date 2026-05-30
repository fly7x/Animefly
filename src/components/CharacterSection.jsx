"use client";
import { useState, useEffect, useCallback } from "react";

const SORT_OPTIONS = ["Latest", "Oldest", "Most Liked"];

export default function CommentsSection({ animeId, animeName, episodeId }) {
  const [comments,   setComments]   = useState([]);
  const [user,       setUser]       = useState(null);
  const [content,    setContent]    = useState("");
  const [isSpoiler,  setIsSpoiler]  = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [posting,    setPosting]    = useState(false);
  const [error,      setError]      = useState("");
  const [sort,       setSort]       = useState("Latest");
  const [epFilter,   setEpFilter]   = useState("all");
  const [showEpDrop, setShowEpDrop] = useState(false);

  const epId = episodeId || "0";

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const ep  = epFilter === "all" ? "all" : epId;
    const url = ep === "all"
      ? `/api/comments?anime_id=${animeId}&episode_id=all`
      : `/api/comments?anime_id=${animeId}&episode_id=${epId}`;
    const res  = await fetch(url);
    const data = await res.json();
    let list = data.comments || [];

    if (sort === "Oldest")     list = [...list].reverse();
    if (sort === "Most Liked") list = [...list].sort((a, b) => (b.likes || 0) - (a.likes || 0));

    setComments(list);
    setLoading(false);
  }, [animeId, epId, epFilter, sort]);

  useEffect(() => {
    fetchComments();
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user || null));
  }, [fetchComments]);

  async function postComment(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true); setError("");
    const res  = await fetch("/api/comments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anime_id: animeId, anime_name: animeName, episode_id: epId, content, is_spoiler: isSpoiler }),
    });
    const data = await res.json();
    setPosting(false);
    if (data.error) { setError(data.error); return; }
    setContent(""); setIsSpoiler(false); fetchComments();
  }

  async function deleteComment(id) {
    await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
    fetchComments();
  }

  async function react(commentId, type) {
    if (!user) { window.location.href = "/login"; return; }
    await fetch("/api/comments/react", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment_id: commentId, type }),
    });
    fetchComments();
  }

  function timeAgo(str) {
    const diff = Date.now() - new Date(str).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m} minutes ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hours ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d} days ago`;
    return `${Math.floor(d / 30)} months ago`;
  }

  function initials(name) { return name?.charAt(0)?.toUpperCase() || "?"; }

  const epLabel = epFilter === "all" ? "All Episodes" : `Episode ${epNumber}`;

  return (
    <div style={s.wrap}>

      {/* ── Header bar ── */}
      <div style={s.headerBar}>
        <h3 style={s.title}>Comments</h3>

        {/* Episode filter */}
        <div style={{ position: "relative" }}>
          <button style={s.filterBtn} onClick={() => setShowEpDrop(v => !v)}>
            {epFilter === "all" ? "All Episodes" : `Episode ${epId}`}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: "6px" }}>
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          {showEpDrop && (
            <div style={s.dropMenu}>
              <button style={s.dropItem} onClick={() => { setEpFilter("all"); setShowEpDrop(false); }}>
                All Episodes {epFilter === "all" && "✓"}
              </button>
              <button style={s.dropItem} onClick={() => { setEpFilter(epId); setShowEpDrop(false); }}>
                Episode {epId} {epFilter !== "all" && "✓"}
              </button>
            </div>
          )}
        </div>

        {/* Comment count */}
        <div style={s.countBadge}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {comments.length}
        </div>

        {/* Sort */}
        <select style={s.sortSelect} value={sort} onChange={e => setSort(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* ── Login prompt or post box ── */}
      {!user ? (
        <div style={s.loginPrompt}>
          Please <a href="/login" style={s.loginLink}>login</a> to post a comment
          <textarea style={{ ...s.textarea, opacity: 0.4, pointerEvents: "none", marginTop: "12px" }}
            placeholder="Leave a comment" rows={3} disabled />
        </div>
      ) : (
        <form onSubmit={postComment} style={s.postForm}>
          <textarea style={s.textarea} placeholder="Leave a comment"
            value={content} onChange={e => setContent(e.target.value)} rows={3} required />
          <div style={s.postFormBottom}>
            <label style={s.spoilerLabel}>
              <input type="checkbox" checked={isSpoiler} onChange={e => setIsSpoiler(e.target.checked)} />
              {" "}Spoiler
            </label>
            {error && <span style={s.errText}>{error}</span>}
            <button style={s.postBtn} type="submit" disabled={posting}>
              {posting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      )}

      {/* ── Comments list ── */}
      {loading ? (
        <p style={s.empty}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <div style={s.emptyWrap}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#353540" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p style={s.emptyTitle}>No comments yet</p>
          <p style={s.emptySub}>Be the first to comment!</p>
        </div>
      ) : (
        <div style={s.list}>
          {comments.map(c => (
            <div key={c.id} style={s.comment}>
              <div style={s.avatarCol}>
                {c.user_avatar
                  ? <img src={c.user_avatar} alt={c.username} style={s.avatarImg} />
                  : <div style={s.avatarFallback}>{initials(c.username)}</div>}
              </div>
              <div style={s.commentBody}>
                <div style={s.commentMeta}>
                  <span style={s.commentUser}>{c.username}</span>
                  <span style={s.commentTime}>{timeAgo(c.created_at)}</span>
                  {c.episode_id && c.episode_id !== "0" && (
                    <span style={s.commentEp}>◂ Episode {c.episode_id}</span>
                  )}
                </div>
                {c.is_spoiler
                  ? <SpoilerText text={c.content} />
                  : <p style={s.commentText}>{c.content}</p>}
                <div style={s.commentActions}>
                  <button style={s.actionBtn} onClick={() => react(c.id, 1)}>
                    👍 {c.likes || 0}
                  </button>
                  <button style={s.actionBtn} onClick={() => react(c.id, 0)}>
                    👎 {c.dislikes || 0}
                  </button>
                  {user?.id === c.user_id && (
                    <button style={{ ...s.actionBtn, color: "#606070", marginLeft: "auto" }}
                      onClick={() => deleteComment(c.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SpoilerText({ text }) {
  const [show, setShow] = useState(false);
  return show
    ? <p style={{ color: "#c0c0c8", fontSize: "14px", lineHeight: 1.6, margin: "6px 0", cursor: "pointer" }} onClick={() => setShow(false)}>{text}</p>
    : <p onClick={() => setShow(true)} style={{ backgroundColor: "rgba(232,65,122,0.1)", color: "#e8417a", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", margin: "6px 0", userSelect: "none" }}>⚠ Spoiler — click to reveal</p>;
}

const s = {
  wrap: { padding: "24px 0", fontFamily: "Inter,sans-serif" },
  headerBar: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", flexWrap: "wrap" },
  title: { color: "#e8417a", fontSize: "20px", fontWeight: 800, margin: 0 },
  filterBtn: { display: "flex", alignItems: "center", backgroundColor: "#141418", border: "1px solid rgba(255,255,255,0.1)", color: "#a0a0b0", borderRadius: "8px", padding: "7px 12px", fontSize: "13px", cursor: "pointer", fontFamily: "Inter,sans-serif" },
  dropMenu: { position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50, backgroundColor: "#1a1a20", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "6px", minWidth: "160px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" },
  dropItem: { display: "block", width: "100%", textAlign: "left", backgroundColor: "transparent", border: "none", color: "#a0a0b0", padding: "8px 12px", borderRadius: "6px", fontSize: "13px", cursor: "pointer", fontFamily: "Inter,sans-serif" },
  countBadge: { display: "flex", alignItems: "center", gap: "5px", color: "#a0a0b0", fontSize: "14px", fontWeight: 600 },
  sortSelect: { marginLeft: "auto", backgroundColor: "#141418", border: "1px solid rgba(255,255,255,0.1)", color: "#a0a0b0", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", cursor: "pointer", fontFamily: "Inter,sans-serif", outline: "none" },
  loginPrompt: { color: "#a0a0b0", fontSize: "14px", marginBottom: "20px" },
  loginLink: { color: "#e8417a", textDecoration: "none", fontWeight: 600 },
  postForm: { marginBottom: "24px" },
  textarea: { width: "100%", backgroundColor: "#141418", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "12px 14px", color: "#fff", fontSize: "14px", resize: "vertical", fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box" },
  postFormBottom: { display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" },
  spoilerLabel: { color: "#a0a0b0", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" },
  postBtn: { marginLeft: "auto", backgroundColor: "#e8417a", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 20px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" },
  errText: { color: "#e8417a", fontSize: "12px" },
  empty: { color: "#606070", fontSize: "14px", padding: "20px 0" },
  emptyWrap: { textAlign: "center", padding: "48px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" },
  emptyTitle: { color: "#a0a0b0", fontSize: "16px", fontWeight: 600, margin: 0 },
  emptySub: { color: "#606070", fontSize: "14px", margin: 0 },
  list: { display: "flex", flexDirection: "column", gap: "0" },
  comment: { display: "flex", gap: "14px", padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  avatarCol: { flexShrink: 0 },
  avatarImg: { width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover" },
  avatarFallback: { width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "#e8417a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "16px" },
  commentBody: { flex: 1, minWidth: 0 },
  commentMeta: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" },
  commentUser: { color: "#fff", fontWeight: 700, fontSize: "14px" },
  commentTime: { color: "#606070", fontSize: "12px" },
  commentEp: { color: "#a0a0b0", fontSize: "12px" },
  commentText: { color: "#c0c0c8", fontSize: "14px", lineHeight: 1.6, margin: "0 0 8px", wordBreak: "break-word" },
  commentActions: { display: "flex", alignItems: "center", gap: "12px" },
  actionBtn: { backgroundColor: "transparent", border: "none", color: "#606070", fontSize: "13px", cursor: "pointer", padding: "4px 0", fontFamily: "Inter,sans-serif" },
};
