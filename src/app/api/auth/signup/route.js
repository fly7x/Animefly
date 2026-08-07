import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

const AVATARS = [
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/zoro_normal/av-zz-01.jpeg",    label: "Roronoa Zoro" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/zoro_normal/av-zz-02.jpeg",    label: "Zoro 2" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/zoro_normal/av-zz-03.jpeg",    label: "Zoro 3" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/zoro_normal/av-zz-04.jpeg",    label: "Zoro 4" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/zoro_normal/av-zz-05.jpeg",    label: "Zoro 5" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/zoro_normal/av-zz-06.jpeg",    label: "Zoro 6" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/zoro_normal/av-zz-07.jpeg",    label: "Zoro 7" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/zoro_normal/av-zz-08.jpeg",    label: "Zoro 8" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/zoro_normal/av-zz-09.jpeg",    label: "Zoro 9" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/zoro_normal/av-zz-10.jpeg",    label: "Zoro 10" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File1.jpg",       label: "Tanjiro" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File2.jpg",       label: "Nezuko" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File3.jpg",       label: "Zenitsu" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File4.jpg",       label: "Inosuke" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File5.jpg",       label: "Rengoku" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File6.jpg",       label: "Shinobu" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File7.jpg",       label: "Uzui" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File8.jpg",       label: "Muzan" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File9.jpg",       label: "Akaza" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File10.jpg",      label: "Doma" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File11.jpg",      label: "Giyu" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File12.jpg",      label: "Kanao" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File13.jpg",      label: "Yoriichi" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File14.jpg",      label: "Kokushibo" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File15.jpg",      label: "Urokodaki" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/jujutsu_kaisen/File1.png",      label: "Yuji" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/jujutsu_kaisen/File2.png",      label: "Megumi" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/jujutsu_kaisen/File3.png",      label: "Nobara" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/jujutsu_kaisen/File4.png",      label: "Gojo" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/jujutsu_kaisen/File5.png",      label: "Sukuna" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/jujutsu_kaisen/File6.png",      label: "Nanami" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/jujutsu_kaisen/File7.png",      label: "Geto" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/jujutsu_kaisen/File8.png",      label: "Toge" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/chainsaw/01.png",               label: "Denji" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/chainsaw/02.png",               label: "Power" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/chainsaw/03.png",               label: "Aki" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/chainsaw/04.png",               label: "Makima" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/chainsaw/05.png",               label: "Himeno" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/spy_family/01.png",             label: "Loid" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/spy_family/02.png",             label: "Yor" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/spy_family/03.png",             label: "Anya" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/spy_family/04.png",             label: "Bond" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/spy_family/05.png",             label: "Damian" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/spy_family/06.png",             label: "Becky" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/spy_family/07.png",             label: "Franky" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/spy_family/08.png",             label: "Yuri" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/one_piece/user-1.jpeg",         label: "Luffy" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/one_piece/user-2.jpeg",         label: "Zoro OP" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/one_piece/user-3.jpeg",         label: "Nami" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/one_piece/user-4.jpeg",         label: "Usopp" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/one_piece/user-5.jpeg",         label: "Sanji" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/one_piece/user-6.jpeg",         label: "Chopper" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/one_piece/user-7.jpeg",         label: "Robin" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/one_piece/user-8.jpeg",         label: "Franky OP" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/one_piece/user-9.jpeg",         label: "Brook" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/one_piece/user-10.jpeg",        label: "Ace" },
  { url: "https://cdn.noitatnemucod.net/avatar/100x100/one_piece/user-11.jpeg",        label: "Shanks" },
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
