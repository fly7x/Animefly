import { NextResponse } from "next/server";
import { getDb, getUserFromRequest } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PUT(request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json();
  const db   = getDb();

  if (body.action === "avatar") {
    await db.execute({ sql: "UPDATE users SET image = ? WHERE id = ?", args: [body.image, user.id] });
    return NextResponse.json({ success: true });
  }

  if (body.action === "username") {
    if (!body.username?.trim())
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    const exists = await db.execute({
      sql: "SELECT id FROM users WHERE username = ? AND id != ?",
      args: [body.username, user.id],
    });
    if (exists.rows.length > 0)
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    await db.execute({
      sql: "UPDATE users SET username = ? WHERE id = ?",
      args: [body.username.trim(), user.id],
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "password") {
    if (!body.oldPassword || !body.newPassword)
      return NextResponse.json({ error: "Both passwords required" }, { status: 400 });
    if (body.newPassword.length < 6)
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    const result = await db.execute({
      sql: "SELECT password FROM users WHERE id = ?", args: [user.id],
    });
    const valid = await bcrypt.compare(body.oldPassword, result.rows[0].password);
    if (!valid) return NextResponse.json({ error: "Incorrect current password" }, { status: 401 });
    const hashed = await bcrypt.hash(body.newPassword, 10);
    await db.execute({ sql: "UPDATE users SET password = ? WHERE id = ?", args: [hashed, user.id] });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
