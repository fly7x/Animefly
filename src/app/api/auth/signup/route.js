import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

const AVATARS = [
  "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b80.jpg&w=200&h=200&fit=cover",
  "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b71.jpg&w=200&h=200&fit=cover",
  "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b417.jpg&w=200&h=200&fit=cover",
  "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b1868.jpg&w=200&h=200&fit=cover",
  "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b40882.jpg&w=200&h=200&fit=cover",
  "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b40881.jpg&w=200&h=200&fit=cover",
  "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b17.jpg&w=200&h=200&fit=cover",
  "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b40.jpg&w=200&h=200&fit=cover",
  "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b30.jpg&w=200&h=200&fit=cover",
  "https://images.weserv.nl/?url=s4.anilist.co/file/anilistcdn/character/large/b143980.jpg&w=200&h=200&fit=cover",
];

function emailHtml(code) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#0e0e12;color:#fff;padding:32px;border-radius:16px;">
      <h2 style="color:#e8417a;margin:0 0 4px;">🎌 Fly Anime</h2>
      <p style="color:#a0a0b0;font-size:13px;margin:0 0 28px;">Verify your email to create your account</p>
      <p style="font-size:15px;margin:0 0 16px;color:#fff;">Your verification code:</p>
      <div style="background:#141418;border:1px solid rgba(232,65,122,0.3);border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;">
        <span style="font-size:40px;font-weight:900;letter-spacing:14px;color:#e8417a;">${code}</span>
      </div>
      <p style="color:#606070;font-size:13px;">Expires in 10 minutes. If you didn't request this, ignore this email.</p>
    </div>
  `;
}

// Step 1: POST { username, email, password } → sends verification code
// Step 2: POST { email, code, confirm: true } → creates account
export async function POST(request) {
  try {
    await initDb();
    const body = await request.json();
    const db   = getDb();

    // ── Step 2: confirm code ──────────────────────────────────────
    if (body.confirm) {
      const { email, code, username, password, image } = body;

      const codeResult = await db.execute({
        sql: `SELECT * FROM verification_codes
              WHERE email = ? AND code = ? AND used = 0
              AND expires_at > datetime('now')
              ORDER BY created_at DESC LIMIT 1`,
        args: [email, code],
      });

      if (codeResult.rows.length === 0)
        return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

      // Mark used
      await db.execute({
        sql: "UPDATE verification_codes SET used = 1 WHERE id = ?",
        args: [codeResult.rows[0].id],
      });

      // Check still unique
      const exists = await db.execute({
        sql: "SELECT id FROM users WHERE email = ? OR username = ?",
        args: [email, username],
      });
      if (exists.rows.length > 0)
        return NextResponse.json({ error: "Username or email already taken" }, { status: 409 });

      const hashed = await bcrypt.hash(password, 10);
      const avatar = image || AVATARS[Math.floor(Math.random() * AVATARS.length)];

      await db.execute({
        sql: "INSERT INTO users (username, email, password, image, verified) VALUES (?, ?, ?, ?, 1)",
        args: [username, email, hashed, avatar],
      });

      return NextResponse.json({ success: true });
    }

    // ── Step 1: send verification code ───────────────────────────
    const { username, email, password } = body;
    if (!username || !email || !password)
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    // Check if already taken
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE email = ? OR username = ?",
      args: [email, username],
    });
    if (existing.rows.length > 0)
      return NextResponse.json({ error: "Username or email already taken" }, { status: 409 });

    const code    = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await db.execute({ sql: "DELETE FROM verification_codes WHERE email = ?", args: [email] });
    await db.execute({
      sql: "INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)",
      args: [email, code, expires],
    });

    await resend.emails.send({
      from:    process.env.FROM_EMAIL || "onboarding@resend.dev",
      to:      email,
      subject: "Fly Anime — Verify your email",
      html:    emailHtml(code),
    });

    return NextResponse.json({ codeSent: true });
  } catch (e) {
    console.error("[signup]", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
