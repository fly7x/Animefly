import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const token = request.cookies.get("fa_session")?.value;
  if (token) {
    const db = getDb();
    await db.execute({ sql: "DELETE FROM sessions WHERE token = ?", args: [token] });
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete("fa_session");
  return response;
}
