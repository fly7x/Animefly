import { NextResponse } from "next/server";
import { getDb, getUserFromRequest, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  await initDb();
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ streak: 0, total: 0, achievements: [] });

  const db = getDb();

  const userResult = await db.execute({
    sql: "SELECT streak, total_watched FROM users WHERE id = ?",
    args: [user.id],
  });

  const achResult = await db.execute({
    sql: "SELECT type, earned_at FROM achievements WHERE user_id = ? ORDER BY earned_at DESC",
    args: [user.id],
  });

  return NextResponse.json({
    streak:       userResult.rows[0]?.streak       || 0,
    total:        userResult.rows[0]?.total_watched || 0,
    achievements: achResult.rows || [],
  });
}
