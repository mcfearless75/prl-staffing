import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const pc = request.nextUrl.searchParams.get("pc")?.replace(/\s+/g, "");
  if (!pc) return NextResponse.json({ error: "Postcode required" }, { status: 400 });

  const apiKey = process.env.GETADDRESS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured (GETADDRESS_API_KEY missing)" }, { status: 500 });

  try {
    const res = await fetch(
      `https://api.getaddress.io/find/${encodeURIComponent(pc)}?api-key=${apiKey}&expand=true`
    );
    const json = await res.json();
    if (!res.ok) {
      // getAddress.io returns { Message: "..." } on errors
      const msg = json?.Message || json?.message || `Error ${res.status} from getAddress.io`;
      return NextResponse.json({ error: msg }, { status: res.status });
    }
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 500 });
  }
}
