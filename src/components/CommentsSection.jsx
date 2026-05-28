"use client";
import { useState, useEffect, useCallback } from "react";

export default function CommentsSection({ animeId, animeName, episodeId }) {
  const [comments, setComments]   = useState([]);
  const [user, setUser]           = useState(null);
  const [content, setContent]     = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [posting, setPosting]     = useState(false);
  const [error, setError]         = useState("");

  const epId = episodeId || "0";

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/comments?anime_id=${animeId}&episode_id=${epId}`);
    const data = await res.json();
    setComments(data.comments || []);
    setLoading(false);
  }, [animeId, epId]);

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
      body: JSON.stringify({ anime_id: animeId, episode_id: epId, content, is_spoiler: isSpoiler }),
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

  function formatDate(str) {
    return new Date(str).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function initials(name) { return name?.charAt(0)?.toUpperCase() || "?"; }

  return (
    <div style={s.wrap}>
      <h3 style={s.heading}>
        Comments{comments.length > 0 && <span style={s.count}>{comments.length}</span>}
      </h3>

      {user ? (
        <form onSubmit={postComment} style={s.form}>
          <div style={s.formTop}>
            {user.image
              ? <img src={user.image} alt={user.username} style={s.avatarImg} />
              : <div style={s.avatar}>{initials(user.username)}</div>}
            <textarea style={s.textarea} placeholder={`Comment as ${user.username}...`}
              value={content} onChange={e => setContent(e.target.value)} rows={3} required />
          </div>
          <div style={s.formBottom}>
            <label style={s.spoilerLabel}>
              <input type="checkbox" checked={isSpoiler} onChange={e => setIsSpoiler(e.target.checked)} />
              {" "}Spoiler
            </label>
            {error && <span style={s.errText}>{error}</span>}
            <button style={s.postBtn} type="submit" disabled={posting}>
              {posting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      ) : (
        <div style={s.loginPrompt}>
          <a href="/login" style={s.loginLink}>Log in</a> to leave a comment
        </div>
      )}

      {loading ? (
        <p style={s.empty}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <div style={s.emptyWrap}>
          <p style={s.emptyTitle}>No comments yet.</p>
          <p style={s.emptySub}>Be the first to comment!</p>
        </div>
      ) : (
        <div style={s.list}>
          {comments.map(c => (
            <div key={c.id} style={s.comment}>
              <div style={s.commentHeader}>
                {c.user_avatar
                  ? <img src={c.user_avatar} alt={c.username} style={s.avatarImg} />
                  : <div style={s.avatar}>{initials(c.username)}</div>}
                <div>
                  <span style={s.username}>{c.username}</span>
                  <span style={s.date}>{formatDate(c.created_at)}</span>
                </div>
                {user?.id === c.user_id && (
                  <button style={s.deleteBtn} onClick={() => deleteComment(c.id)}>Delete</button>
                )}
              </div>
              {c.is_spoiler ? <SpoilerText text={c.content} /> : <p style={s.content}>{c.content}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SpoilerText({ text }) {
  const [reveal, setReveal] = useState(false);
  return reveal
    ? <p style={{ color: "#c0c0c8", fontSize: "14px", lineHeight: 1.6, margin: 0, cursor: "pointer" }} onClick={() => setReveal(false)}>{text}</p>
    : <p style={{ backgroundColor: "rgba(232,65,122,0.1)", color: "#e8417a", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", userSelect: "none" }} onClick={() => setReveal(true)}>⚠ Spoiler — click to reveal</p>;
}

const s = {
  wrap: { padding: "24px 0", fontFamily: "Inter,sans-serif" },
  heading: { color: "#fff", fontSize: "18px", fontWeight: 700, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" },
  count: { backgroundColor: "rgba(232,65,122,0.15)", color: "#e8417a", borderRadius: "20px", padding: "2px 10px", fontSize: "13px" },
  form: { backgroundColor: "#141418", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px", marginBottom: "24px" },
  formTop: { display: "flex", gap: "12px", alignItems: "flex-start" },
  formBottom: { display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", justifyContent: "flex-end" },
  avatar: { width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#e8417a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px", flexShrink: 0 },
  avatarImg: { width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  textarea: { flex: 1, backgroundColor: "#0e0e12", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px", resize: "vertical", fontFamily: "Inter,sans-serif", outline: "none" },
  spoilerLabel: { color: "#a0a0b0", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" },
  postBtn: { backgroundColor: "#e8417a", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" },
  loginPrompt: { color: "#a0a0b0", fontSize: "14px", backgroundColor: "#141418", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px", marginBottom: "24px", textAlign: "center" },
  loginLink: { color: "#e8417a", textDecoration: "none", fontWeight: 600 },
  empty: { color: "#606070", fontSize: "14px" },
  emptyWrap: { textAlign: "center", padding: "40px 0" },
  emptyTitle: { color: "#a0a0b0", fontSize: "16px", fontWeight: 600, margin: "0 0 6px" },
  emptySub: { color: "#606070", fontSize: "14px", margin: 0 },
  list: { display: "flex", flexDirection: "column", gap: "16px" },
  comment: { backgroundColor: "#141418", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px" },
  commentHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" },
  username: { color: "#fff", fontWeight: 600, fontSize: "14px", display: "block" },
  date: { color: "#606070", fontSize: "12px" },
  deleteBtn: { marginLeft: "auto", backgroundColor: "transparent", border: "none", color: "#606070", fontSize: "12px", cursor: "pointer" },
  content: { color: "#c0c0c8", fontSize: "14px", lineHeight: 1.6, margin: 0 },
  errText: { color: "#e8417a", fontSize: "12px" },
};
