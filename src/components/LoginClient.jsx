"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginClient() {
  const router = useRouter();
  const [login, setLogin]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setError(""); setLoading(true);
    const res  = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    router.push("/"); router.refresh();
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <h1 style={s.title}>Welcome Back</h1>
        <p style={s.sub}>Log in to your Fly Anime account</p>
        {error && <p style={s.error}>{error}</p>}
        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>Username or Email</label>
          <input style={s.input} type="text" placeholder="username or email"
            value={login} onChange={e => setLogin(e.target.value)} required />
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)} required />
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p style={s.foot}>Don't have an account? <Link href="/register" style={s.link}>Register</Link></p>
        <p style={s.foot}><Link href="/" style={s.link}>← Back to Fly Anime</Link></p>
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", backgroundColor: "#0e0e12", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "Inter,sans-serif" },
  card: { backgroundColor: "#141418", border: "1px solid rgba(232,65,122,0.2)", borderRadius: "16px", padding: "40px 36px", width: "100%", maxWidth: "420px" },
  title: { color: "#fff", fontSize: "24px", fontWeight: 800, margin: "0 0 8px" },
  sub: { color: "#a0a0b0", fontSize: "14px", margin: "0 0 28px" },
  error: { backgroundColor: "rgba(232,65,122,0.12)", border: "1px solid rgba(232,65,122,0.3)", color: "#e8417a", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" },
  form: { display: "flex", flexDirection: "column", gap: "14px" },
  label: { color: "#a0a0b0", fontSize: "13px", fontWeight: 500 },
  input: { backgroundColor: "#0e0e12", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "12px 14px", color: "#fff", fontSize: "14px", outline: "none", fontFamily: "Inter,sans-serif" },
  btn: { backgroundColor: "#e8417a", color: "#fff", border: "none", borderRadius: "8px", padding: "13px", fontSize: "15px", fontWeight: 700, cursor: "pointer", marginTop: "6px", fontFamily: "Inter,sans-serif" },
  foot: { color: "#606070", fontSize: "13px", textAlign: "center", marginTop: "16px" },
  link: { color: "#e8417a", textDecoration: "none" },
};
