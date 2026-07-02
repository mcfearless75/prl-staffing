import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const pc = request.nextUrl.searchParams.get("pc")?.replace(/\s+/g, "");
  if (!pc) return NextResponse.json({ error: "Postcode required" }, { status: 400 });

  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
    const json = await res.json();
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ status: 500, error: "Upstream fetch failed" }, { status: 500 });
  }
}
