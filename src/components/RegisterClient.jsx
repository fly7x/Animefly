"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterClient() {
  const router = useRouter();
  const [step,     setStep]    = useState(1); // 1=form, 2=verify
  const [form,     setForm]    = useState({ username: "", email: "", password: "", cpassword: "" });
  const [code,     setCode]    = useState("");
  const [error,    setError]   = useState("");
  const [loading,  setLoading] = useState(false);

  function update(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submitForm(e) {
    e.preventDefault(); setError("");
    if (form.password !== form.cpassword) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    const res  = await fetch("/api/auth/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    setStep(2);
  }

  async function submitCode(e) {
    e.preventDefault(); setError("");
    setLoading(true);
    const res  = await fetch("/api/auth/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirm: true,
        email: form.email, code,
        username: form.username, password: form.password,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    router.push("/login?registered=1");
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        {step === 1 ? (
          <>
            <h1 style={s.title}>Create Account</h1>
            <p style={s.sub}>Join Fly Anime — it's free</p>
            {error && <p style={s.error}>{error}</p>}
            <form onSubmit={submitForm} style={s.form}>
              <label style={s.label}>Username</label>
              <input style={s.input} type="text" placeholder="username" required
                value={form.username} onChange={e => update("username", e.target.value)} />
              <label style={s.label}>Email</label>
              <input style={s.input} type="email" placeholder="name@email.com" required
                value={form.email} onChange={e => update("email", e.target.value)} />
              <label style={s.label}>Password</label>
              <input style={s.input} type="password" placeholder="Minimum 6 characters" required
                value={form.password} onChange={e => update("password", e.target.value)} />
              <label style={s.label}>Confirm Password</label>
              <input style={s.input} type="password" placeholder="Repeat password" required
                value={form.cpassword} onChange={e => update("cpassword", e.target.value)} />
              <button style={s.btn} type="submit" disabled={loading}>
                {loading ? "Sending code..." : "Continue →"}
              </button>
            </form>
            <p style={s.foot}>Already have an account? <Link href="/login" style={s.link}>Login</Link></p>
          </>
        ) : (
          <>
            <div style={s.emailIcon}>✉️</div>
            <h1 style={s.title}>Check your email</h1>
            <p style={s.sub}>We sent a 6-digit code to <strong style={{ color: "#fff" }}>{form.email}</strong></p>
            {error && <p style={s.error}>{error}</p>}
            <form onSubmit={submitCode} style={s.form}>
              <label style={s.label}>Verification Code</label>
              <input
                style={{ ...s.input, letterSpacing: "10px", textAlign: "center", fontSize: "24px", fontWeight: 700 }}
                type="text" maxLength={6} placeholder="000000" required
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              />
              <button style={s.btn} type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Create Account"}
              </button>
            </form>
            <p style={s.foot}>
              Wrong email?{" "}
              <button style={{ background: "none", border: "none", color: "#e8417a", cursor: "pointer", fontSize: "13px", padding: 0 }}
                onClick={() => { setStep(1); setCode(""); setError(""); }}>
                Go back
              </button>
            </p>
          </>
        )}
        <p style={s.foot}><Link href="/" style={s.link}>← Back to Fly Anime</Link></p>
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", backgroundColor: "#0e0e12", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "Inter,sans-serif" },
  card: { backgroundColor: "#141418", border: "1px solid rgba(232,65,122,0.2)", borderRadius: "16px", padding: "40px 36px", width: "100%", maxWidth: "420px" },
  emailIcon: { fontSize: "40px", textAlign: "center", marginBottom: "12px" },
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
