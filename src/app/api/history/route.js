import { NextResponse } from "next/server";
import { getDb, getUserFromRequest } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ history: [] });
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM watch_history WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20",
    args: [user.id],
  });
  return NextResponse.json({ history: result.rows });
}

export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { anime_id, anime_name, poster, anilist_id, episode_number } = await request.json();
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO watch_history (user_id, anime_id, anime_name, poster, anilist_id, episode_number, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(user_id, anime_id) DO UPDATE SET
          episode_number = excluded.episode_number, updated_at = datetime('now')`,
    args: [user.id, anime_id, anime_name, poster, anilist_id, episode_number],
  });
  return NextResponse.json({ success: true });
}
