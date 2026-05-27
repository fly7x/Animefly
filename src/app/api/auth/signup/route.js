import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const AVATARS = [
  "https://cdn.noitatnemucod.net/avatar/100x100/demon_splayer/File15.jpg",
  "https://cdn.noitatnemucod.net/avatar/100x100/jujutsu_kaisen/File1.png",
  "https://cdn.noitatnemucod.net/avatar/100x100/zoro_normal/av-zz-01.jpeg",
  "https://cdn.noitatnemucod.net/avatar/100x100/zoro_normal/av-zz-02.jpeg",
  "https://cdn.noitatnemucod.net/avatar/100x100/zoro_normal/av-zz-03.jpeg",
  "https://cdn.noitatnemucod.net/avatar/100x100/zoro_normal/av-zz-04.jpeg",
  "https://cdn.noitatnemucod.net/avatar/100x100/chainsaw/01.png",
  "https://cdn.noitatnemucod.net/avatar/100x100/chainsaw/02.png",
  "https://cdn.noitatnemucod.net/avatar/100x100/chainsaw/03.png",
  "https://cdn.noitatnemucod.net/avatar/100x100/one_piece/user-10.jpeg",
  "https://cdn.noitatnemucod.net/avatar/100x100/one_piece/user-11.jpeg",
  "https://cdn.noitatnemucod.net/avatar/100x100/spy_family/06.png",
  "https://cdn.noitatnemucod.net/avatar/100x100/spy_family/07.png",
];

export async function POST(request) {
  try {
    await initDb();
    const { username, email, password } = await request.json();
    if (!username || !email || !password)
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    const db = getDb();
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE email = ? OR username = ?",
      args: [email, username],
    });
    if (existing.rows.length > 0)
      return NextResponse.json({ error: "Username or email already taken" }, { status: 409 });

    const hashed = await bcrypt.hash(password, 10);
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];

    await db.execute({
      sql: "INSERT INTO users (username, email, password, image) VALUES (?, ?, ?, ?)",
      args: [username, email, hashed, avatar],
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[signup]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
