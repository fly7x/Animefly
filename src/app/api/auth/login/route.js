import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await initDb();
    const { login, password } = await request.json();
    if (!login || !password)
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });

    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM users WHERE username = ? OR email = ?",
      args: [login, login],
    });
    if (result.rows.length === 0)
      return NextResponse.json({ error: "User not found" }, { status: 401 });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });

    const token = randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.execute({
      sql: "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
      args: [user.id, token, expires],
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, image: user.image },
    });
    response.cookies.set("fa_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    return response;
  } catch (e) {
    console.error("[login]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
