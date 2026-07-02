import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const pc = request.nextUrl.searchParams.get("pc")?.replace(/\s+/g, "");
  if (!pc) return NextResponse.json({ error: "Postcode required" }, { status: 400 });

  const apiKey = process.env.GETADDRESS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  try {
    const res = await fetch(
      `https://api.getaddress.io/find/${encodeURIComponent(pc)}?api-key=${apiKey}&expand=true`
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Postcode not found" }, { status: res.status });
    }
    const json = await res.json();
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 500 });
  }
}
