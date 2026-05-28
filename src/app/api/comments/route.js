import { NextResponse } from "next/server";
import { getDb, initDb, getUserFromRequest } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const anime_id = searchParams.get("anime_id");
  const episode_id = searchParams.get("episode_id") || "0";
  if (!anime_id) return NextResponse.json({ error: "anime_id required" }, { status: 400 });

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT c.*,
          (SELECT COUNT(*) FROM comment_reactions WHERE comment_id = c.id AND type = 1) as likes,
          (SELECT COUNT(*) FROM comment_reactions WHERE comment_id = c.id AND type = 0) as dislikes
          FROM comments c
          WHERE c.anime_id = ? AND c.episode_id = ? AND c.parent_id IS NULL
          ORDER BY c.created_at DESC`,
    args: [anime_id, episode_id],
  });
  return NextResponse.json({ comments: result.rows });
}

export async function POST(request) {
  try {
    await initDb();
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Please log in to comment" }, { status: 401 });

    const { anime_id, anime_name, episode_id, content, is_spoiler } = await request.json();
    if (!anime_id || !content?.trim())
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO comments (user_id, anime_id, anime_name, episode_id, content, is_spoiler, username, user_avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [user.id, anime_id, anime_name || anime_id, episode_id || "0", content.trim(), is_spoiler ? 1 : 0, user.username, user.image || null],
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const db = getDb();
  await db.execute({ sql: "DELETE FROM comments WHERE id = ? AND user_id = ?", args: [id, user.id] });
  return NextResponse.json({ success: true });
}
