import { NextResponse } from "next/server";

const BASE = "https://anikotoapi.site";

export const dynamic = "force-dynamic";

// GET /api/anikoto?action=search&q=naruto
// GET /api/anikoto?action=series&id=123
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    if (action === "recent") {
      const page = searchParams.get("page") || "1";
      const res  = await fetch(`${BASE}/recent-anime?page=${page}&per_page=20`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (action === "series") {
      const id  = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const res  = await fetch(`${BASE}/series/${id}`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
