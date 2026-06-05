"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StreakBadge from "@/components/StreakBadge";

const AVATARS = [
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b80.jpg&w=200&h=200&fit=cover",     label: "Light Yagami" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b71.jpg&w=200&h=200&fit=cover",     label: "L Lawliet" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b77.jpg&w=200&h=200&fit=cover",     label: "Misa Amane" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b417.jpg&w=200&h=200&fit=cover",    label: "Lelouch" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b1868.jpg&w=200&h=200&fit=cover",   label: "C.C." },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b420.jpg&w=200&h=200&fit=cover",    label: "Suzaku" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b40882.jpg&w=200&h=200&fit=cover",  label: "Eren Yeager" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b40881.jpg&w=200&h=200&fit=cover",  label: "Levi Ackerman" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b40883.jpg&w=200&h=200&fit=cover",  label: "Mikasa" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b17.jpg&w=200&h=200&fit=cover",     label: "Naruto" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b13.jpg&w=200&h=200&fit=cover",     label: "Sasuke" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b14.jpg&w=200&h=200&fit=cover",     label: "Itachi" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b40.jpg&w=200&h=200&fit=cover",     label: "Luffy" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b41.jpg&w=200&h=200&fit=cover",     label: "Zoro" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b30.jpg&w=200&h=200&fit=cover",     label: "Gon Freecss" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b31.jpg&w=200&h=200&fit=cover",     label: "Killua" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b123479.jpg&w=200&h=200&fit=cover", label: "Tanjiro" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b143980.jpg&w=200&h=200&fit=cover", label: "Yuji Itadori" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b163370.jpg&w=200&h=200&fit=cover", label: "Denji" },
  { url: "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b179593.jpg&w=200&h=200&fit=cover", label: "Anya" },
];


export default function ProfileClient() {
  const router = useRouter();
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("profile");
  const [showPicker, setShowPicker] = useState(false);
  const [newUsername,  setNewUsername]  = useState("");
  const [oldPass,      setOldPass]      = useState("");
  const [newPass,      setNewPass]      = useState("");
  const [confirmPass,  setConfirmPass]  = useState("");
  const [msg,    setMsg]    = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);
  const [history,   setHistory]   = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [codeSent,    setCodeSent]    = useState(false);  // ← add here
  const [verifyCode,  setVerifyCode]  = useState(""); 
  const [stats, setStats] = useState({ streak: 0, total: 0, achievements: [] });

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.user) { router.push("/login"); return; }
      setUser(d.user); setNewUsername(d.user.username); setLoading(false);
    });
    fetch("/api/history").then(r => r.json()).then(d => setHistory(d.history || []));
    fetch("/api/watchlist").then(r => r.json()).then(d => setWatchlist(d.watchlist || []));
  }, [router]);

  async function updateAvatar(url) {
  const res  = await fetch("/api/auth/profile", {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "avatar", image: url }),
  });
  const data = await res.json();
  if (data.error) { setMsg({ type: "error", text: data.error }); return; }
  if (data.success) { setUser(u => ({ ...u, image: url })); setShowPicker(false); setMsg({ type: "success", text: "Avatar updated!" }); }
}

  async function updateUsername(e) {
    e.preventDefault(); setSaving(true); setMsg({ type: "", text: "" });
    const res  = await fetch("/api/auth/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "username", username: newUsername }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) { setMsg({ type: "error", text: data.error }); return; }
    setUser(u => ({ ...u, username: newUsername }));
    setMsg({ type: "success", text: "Username updated!" });
  }

  async function handlePasswordStep(e) {
  e.preventDefault(); setSaving(true); setMsg({ type: "", text: "" });

  if (!codeSent) {
    // Step 1 — send code
    const res  = await fetch("/api/auth/send-code", { method: "POST" });
    const data = await res.json();
    setSaving(false);
    if (data.error) { setMsg({ type: "error", text: data.error }); return; }
    setCodeSent(true);
    setMsg({ type: "success", text: "Code sent to your email!" });
    return;
  }

  // Step 2 — verify code + change password
  if (newPass !== confirmPass) { setMsg({ type: "error", text: "Passwords do not match" }); setSaving(false); return; }
  const res  = await fetch("/api/auth/verify-code", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: verifyCode, newPassword: newPass }),
  });
  const data = await res.json();
  setSaving(false);
  if (data.error) { setMsg({ type: "error", text: data.error }); return; }
  setCodeSent(false); setVerifyCode(""); setNewPass(""); setConfirmPass("");
  setMsg({ type: "success", text: "Password changed successfully!" });
}


  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/"); router.refresh();
  }

  async function removeWatchlist(anime_id) {
    await fetch(`/api/watchlist?anime_id=${anime_id}`, { method: "DELETE" });
    setWatchlist(w => w.filter(a => a.anime_id !== anime_id));
  }

  function initials(name) { return name?.charAt(0)?.toUpperCase() || "?"; }

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0e0e12", display: "flex", alignItems: "center", justifyContent: "center", color: "#a0a0b0", fontFamily: "Inter,sans-serif" }}>
      Loading...
    </div>
  );

  return (
    <div style={s.wrap}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div style={s.avatarWrap} onClick={() => setShowPicker(true)} title="Change avatar">
          {user.image
            ? <img src={user.image} alt={user.username} style={s.avatarImg} />
            : <div style={s.avatarFallback}>{initials(user.username)}</div>}
          <div style={s.avatarOverlay}>Change</div>
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={s.username}>{user.username}</h1>
          <p style={s.email}>{user.email}</p>
        </div>
        <button style={s.logoutBtn} onClick={logout}>Logout</button>
      </div>

      {/* ── Avatar Picker ── */}
      {showPicker && (
        <div style={s.picker}>
          <div style={s.pickerHead}>
            <h3 style={s.pickerTitle}>Choose Avatar</h3>
            <button style={s.closeBtn} onClick={() => setShowPicker(false)}>✕</button>
          </div>
          <div style={s.avatarGrid}>
            {AVATARS.map((a, i) => (
              <div key={i} style={s.avatarOpt} onClick={() => updateAvatar(a.url)} title={a.label}>
                <img src={a.url} alt={a.label} style={s.avatarOptImg}
                  onError={e => { e.target.style.display = "none"; }} />
                <span style={s.avatarOptLabel}>{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={s.tabs}>
        {[
          { key: "profile",   label: "Edit Profile" },
          { key: "watchlist", label: "Watchlist" },
          { key: "history",   label: "Continue Watching" },
        ].map(t => (
          <button key={t.key} style={{ ...s.tab, ...(tab === t.key ? s.tabActive : {}) }}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Edit Profile ── */}
      {tab === "profile" && (
        <div style={s.section}>
          {msg.text && (
            <p style={{ ...s.msgBox, color: msg.type === "error" ? "#e8417a" : "#4ade80" }}>{msg.text}</p>
          )}

          <form onSubmit={updateUsername} style={s.form}>
            <h3 style={s.formTitle}>Change Username</h3>
            <label style={s.label}>Username</label>
            <input style={s.input} type="text" value={newUsername}
              onChange={e => setNewUsername(e.target.value)} required />
            <button style={s.btn} type="submit" disabled={saving}>Save Username</button>
          </form>

          <div style={s.divider} />

          {/* ── Password change with email verification ── */}
<form onSubmit={handlePasswordStep} style={s.form}>
  <h3 style={s.formTitle}>Change Password</h3>

  {!codeSent ? (
    <>
      <p style={{ color: "#a0a0b0", fontSize: "13px", margin: 0 }}>
        We'll send a verification code to your email.
      </p>
      <button style={s.btn} type="submit" disabled={saving}>
        {saving ? "Sending..." : "Send Verification Code"}
      </button>
    </>
  ) : (
    <>
      <label style={s.label}>Verification Code</label>
      <input style={{ ...s.input, letterSpacing: "6px", textAlign: "center", fontSize: "20px" }}
        type="text" maxLength={6} placeholder="000000"
        value={verifyCode} onChange={e => setVerifyCode(e.target.value)} required />
      <label style={s.label}>New Password</label>
      <input style={s.input} type="password" placeholder="Minimum 6 characters"
        value={newPass} onChange={e => setNewPass(e.target.value)} required />
      <label style={s.label}>Confirm New Password</label>
      <input style={s.input} type="password"
        value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required />
      <div style={{ display: "flex", gap: "10px" }}>
        <button style={s.btn} type="submit" disabled={saving}>
          {saving ? "Changing..." : "Change Password"}
        </button>
        <button type="button" style={{ ...s.btn, backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#a0a0b0" }}
          onClick={() => { setCodeSent(false); setVerifyCode(""); }}>
          Resend Code
                </button>
      </div>
    </>
  )}
        </form>
        </div>
      )}

      {/* ── Watchlist ── */}
      {tab === "watchlist" && (
        <div style={s.section}>
          {watchlist.length === 0 ? (
            <p style={s.empty}>Your watchlist is empty. <Link href="/browse" style={s.link}>Browse anime →</Link></p>
          ) : (
            <div style={s.grid}>
              {watchlist.map(a => (
                <div key={a.id} style={s.card}>
                  {a.poster && <img src={a.poster} alt={a.anime_name} style={s.cardImg} />}
                  <div style={s.cardBody}>
                    <p style={s.cardTitle}>{a.anime_name}</p>
                    <div style={s.cardActions}>
                      <Link href={`/anime/${a.anime_id}`} style={s.cardLink}>View</Link>
                      <button style={s.cardRemove} onClick={() => removeWatchlist(a.anime_id)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Continue Watching ── */}
      {tab === "history" && (
        <div style={s.section}>
          {history.length === 0 ? (
            <p style={s.empty}>No watch history yet.</p>
          ) : (
            <div style={s.grid}>
              {history.map(a => (
                <div key={a.id} style={s.card}>
                  {a.poster && <img src={a.poster} alt={a.anime_name} style={s.cardImg} />}
                  <div style={s.cardBody}>
                    <p style={s.cardTitle}>{a.anime_name}</p>
                    <p style={s.cardEp}>Episode {a.episode_number}</p>
                    <Link href={`/watch/${a.anime_id}/ep-${a.episode_number}`} style={s.cardLink}>
                      Resume →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", backgroundColor: "#0e0e12", padding: "80px 20px 40px", maxWidth: "900px", margin: "0 auto", fontFamily: "Inter,sans-serif" },
  header: { display: "flex", alignItems: "center", gap: "20px", marginBottom: "36px", flexWrap: "wrap" },
  avatarWrap: { position: "relative", cursor: "pointer", flexShrink: 0 },
  avatarImg: { width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "3px solid #e8417a" },
  avatarFallback: { width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "#e8417a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 800 },
  avatarOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.65)", color: "#fff", fontSize: "11px", textAlign: "center", borderRadius: "0 0 50px 50px", padding: "3px 0" },
  username: { color: "#fff", fontSize: "22px", fontWeight: 800, margin: "0 0 4px" },
  email: { color: "#606070", fontSize: "13px", margin: 0 },
  logoutBtn: { marginLeft: "auto", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#a0a0b0", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", cursor: "pointer", fontFamily: "Inter,sans-serif" },
  picker: { backgroundColor: "#141418", border: "1px solid rgba(232,65,122,0.2)", borderRadius: "14px", padding: "20px", marginBottom: "28px" },
  pickerHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  pickerTitle: { color: "#fff", fontSize: "16px", fontWeight: 700, margin: 0 },
  closeBtn: { backgroundColor: "transparent", border: "none", color: "#a0a0b0", fontSize: "20px", cursor: "pointer" },
  avatarGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "12px" },
  avatarOpt: { cursor: "pointer", textAlign: "center", padding: "6px", borderRadius: "8px" },
  avatarOptImg: { width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover" },
  avatarOptLabel: { display: "block", color: "#606070", fontSize: "10px", marginTop: "4px" },
  tabs: { display: "flex", gap: "4px", marginBottom: "28px", backgroundColor: "#141418", padding: "4px", borderRadius: "10px" },
  tab: { flex: 1, backgroundColor: "transparent", border: "none", color: "#a0a0b0", padding: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", borderRadius: "8px", fontFamily: "Inter,sans-serif" },
  tabActive: { backgroundColor: "#e8417a", color: "#fff" },
  section: { backgroundColor: "#141418", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "24px" },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  formTitle: { color: "#fff", fontSize: "16px", fontWeight: 700, margin: "0 0 4px" },
  label: { color: "#a0a0b0", fontSize: "13px", fontWeight: 500 },
  input: { backgroundColor: "#0e0e12", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "11px 14px", color: "#fff", fontSize: "14px", outline: "none", fontFamily: "Inter,sans-serif" },
  btn: { backgroundColor: "#e8417a", color: "#fff", border: "none", borderRadius: "8px", padding: "11px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif", alignSelf: "flex-start" },
  divider: { height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "24px 0" },
  msgBox: { fontSize: "13px", margin: "0 0 12px", fontWeight: 500 },
  empty: { color: "#606070", fontSize: "14px", textAlign: "center", padding: "40px 0" },
  link: { color: "#e8417a", textDecoration: "none" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" },
  card: { backgroundColor: "#0e0e12", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" },
  cardImg: { width: "100%", height: "200px", objectFit: "cover" },
  cardBody: { padding: "12px" },
  cardTitle: { color: "#fff", fontSize: "13px", fontWeight: 600, margin: "0 0 8px", lineHeight: 1.4 },
  cardEp: { color: "#e8417a", fontSize: "12px", margin: "0 0 8px" },
  cardActions: { display: "flex", gap: "8px", alignItems: "center" },
  cardLink: { color: "#e8417a", fontSize: "12px", textDecoration: "none", fontWeight: 600 },
  cardRemove: { backgroundColor: "transparent", border: "none", color: "#606070", fontSize: "12px", cursor: "pointer", padding: 0, fontFamily: "Inter,sans-serif" },
};
