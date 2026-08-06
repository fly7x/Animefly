import { NextResponse } from "next/server";
import { getDb, getUserFromRequest, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  await initDb();
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
  await initDb();
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

  // ── Update streak ────────────────────────────────────────────────
  const today     = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const userResult = await db.execute({
    sql: "SELECT streak, last_watch_date, total_watched FROM users WHERE id = ?",
    args: [user.id],
  });
  const u = userResult.rows[0];
  const last = u?.last_watch_date;
  let streak = u?.streak || 0;
  let total  = (u?.total_watched || 0) + 1;

  if (last === today) {
    // Already watched today — don't change streak
  } else {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    streak = last === yesterday ? streak + 1 : 1;
  }

  await db.execute({
    sql: "UPDATE users SET streak = ?, last_watch_date = ?, total_watched = ? WHERE id = ?",
    args: [streak, today, total, user.id],
  });

  // ── Check achievements ───────────────────────────────────────────
  const checks = [
    { type: "first_watch",    condition: total >= 1 },
    { type: "watched_10",     condition: total >= 10 },
    { type: "watched_50",     condition: total >= 50 },
    { type: "watched_100",    condition: total >= 100 },
    { type: "streak_3",       condition: streak >= 3 },
    { type: "streak_7",       condition: streak >= 7 },
    { type: "streak_30",      condition: streak >= 30 },
  ];

  for (const { type, condition } of checks) {
    if (condition) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO achievements (user_id, type) VALUES (?, ?)",
        args: [user.id, type],
      }).catch(() => {});
    }
  }

  return NextResponse.json({ success: true, streak, total });
}