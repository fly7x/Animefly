import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const user = await getUserFromRequest(request);
  return NextResponse.json({ user: user || null });
}
