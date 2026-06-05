import { NextResponse } from "next/server";
import { getDb, getUserFromRequest } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const db = getDb();

  if (action === "history") {
    await db.execute({ sql: "DELETE FROM watch_history WHERE user_id = ?", args: [user.id] });
    return NextResponse.json({ success: true });
  }

  if (action === "all") {
    await db.execute({ sql: "DELETE FROM watch_history WHERE user_id = ?",       args: [user.id] });
    await db.execute({ sql: "DELETE FROM watchlist WHERE user_id = ?",           args: [user.id] });
    await db.execute({ sql: "DELETE FROM comments WHERE user_id = ?",            args: [user.id] });
    await db.execute({ sql: "DELETE FROM comment_reactions WHERE user_id = ?",   args: [user.id] });
    await db.execute({ sql: "UPDATE users SET preferences = '{}' WHERE id = ?",  args: [user.id] });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
