import { NextResponse } from "next/server";
import { getDb, getUserFromRequest, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  await initDb();
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ preferences: {} });
  const db = getDb();
  const result = await db.execute({ sql: "SELECT preferences FROM users WHERE id = ?", args: [user.id] });
  try {
    return NextResponse.json({ preferences: JSON.parse(result.rows[0]?.preferences || "{}") });
  } catch {
    return NextResponse.json({ preferences: {} });
  }
}

export async function PUT(request) {
  await initDb();
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const body = await request.json();
  const db = getDb();

  const current = await db.execute({ sql: "SELECT preferences FROM users WHERE id = ?", args: [user.id] });
  let prefs = {};
  try { prefs = JSON.parse(current.rows[0]?.preferences || "{}"); } catch {}
  const merged = { ...prefs, ...body };

  await db.execute({ sql: "UPDATE users SET preferences = ? WHERE id = ?", args: [JSON.stringify(merged), user.id] });
  return NextResponse.json({ success: true, preferences: merged });
}
