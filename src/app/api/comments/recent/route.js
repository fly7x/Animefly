import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const result = await db.execute(
    `SELECT id, username, user_avatar, content, anime_id, created_at
     FROM comments ORDER BY created_at DESC LIMIT 5`
  );
  return NextResponse.json({ comments: result.rows });
}
