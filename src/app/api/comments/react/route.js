import { NextResponse } from "next/server";
import { getDb, getUserFromRequest } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { comment_id, type } = await request.json();
  const db = getDb();

  try {
    await db.execute({
      sql: `INSERT INTO comment_reactions (comment_id, user_id, type) VALUES (?, ?, ?)
            ON CONFLICT(comment_id, user_id) DO UPDATE SET type = excluded.type`,
      args: [comment_id, user.id, type],
    });
  } catch {
    await db.execute({
      sql: "DELETE FROM comment_reactions WHERE comment_id = ? AND user_id = ?",
      args: [comment_id, user.id],
    });
  }

  return NextResponse.json({ success: true });
}
