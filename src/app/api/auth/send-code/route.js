import { NextResponse } from "next/server";
import { getDb, getUserFromRequest, initDb } from "@/lib/db";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    await initDb();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const db   = getDb();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    // Get user email
    const result = await db.execute({
      sql: "SELECT email FROM users WHERE id = ?",
      args: [user.id],
    });
    const email = result.rows[0]?.email;
    if (!email) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Delete old codes for this email
    await db.execute({
      sql: "DELETE FROM verification_codes WHERE email = ?",
      args: [email],
    });

    // Save new code
    await db.execute({
      sql: "INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)",
      args: [email, code, expires],
    });

    // Send email
    await resend.emails.send({
      from: process.env.FROM_EMAIL || "noreply@flyanime.vercel.app",
      to:   email,
      subject: "Fly Anime — Password Change Verification Code",
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#0e0e12;color:#fff;padding:32px;border-radius:16px;">
          <h2 style="color:#e8417a;margin:0 0 8px;">Fly Anime</h2>
          <p style="color:#a0a0b0;margin:0 0 28px;font-size:14px;">Password change request</p>
          <p style="font-size:15px;margin:0 0 16px;">Your verification code is:</p>
          <div style="background:#141418;border:1px solid rgba(232,65,122,0.3);border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
            <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#e8417a;">${code}</span>
          </div>
          <p style="color:#606070;font-size:13px;margin:0;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[send-code]", e);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
