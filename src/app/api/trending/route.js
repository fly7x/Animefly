import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/trending — Record a community trending view.
 * Currently a no-op stub to prevent 404 errors from WatchClient.
 */
export async function POST() {
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ trending: [] });
}
