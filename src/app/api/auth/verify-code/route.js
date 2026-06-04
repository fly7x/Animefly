import { NextResponse } from "next/server";
import { getDb, getUserFromRequest } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { code, newPassword } = await request.json();
  if (!code || !newPassword)
    return NextResponse.json({ error: "Code and new password required" }, { status: 400 });
  if (newPassword.length < 6)
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

  const db = getDb();

  // Get user email
  const userResult = await db.execute({
    sql: "SELECT email FROM users WHERE id = ?", args: [user.id],
  });
  const email = userResult.rows[0]?.email;

  // Check code
  const codeResult = await db.execute({
    sql: `SELECT * FROM verification_codes
          WHERE email = ? AND code = ? AND used = 0
          AND expires_at > datetime('now')
          ORDER BY created_at DESC LIMIT 1`,
    args: [email, code],
  });

  if (codeResult.rows.length === 0)
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

  // Mark code as used
  await db.execute({
    sql: "UPDATE verification_codes SET used = 1 WHERE id = ?",
    args: [codeResult.rows[0].id],
  });

  // Update password
  const hashed = await bcrypt.hash(newPassword, 10);
  await db.execute({
    sql: "UPDATE users SET password = ? WHERE id = ?",
    args: [hashed, user.id],
  });

  return NextResponse.json({ success: true });
}
