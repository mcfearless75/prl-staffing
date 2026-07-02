import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const pc = request.nextUrl.searchParams.get("pc")?.replace(/\s+/g, "").toUpperCase();
  if (!pc) return NextResponse.json({ error: "Postcode required" }, { status: 400 });

  const apiKey = process.env.GETADDRESS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured (GETADDRESS_API_KEY missing)" }, { status: 500 });

  try {
    const res = await fetch(
      `https://api.getaddress.io/find/${encodeURIComponent(pc)}?api-key=${apiKey}&expand=true`,
      { cache: "no-store" }
    );

    // Parse JSON safely — a 401/403 may return plain text, not JSON
    let json: Record<string, unknown> = {};
    try {
      json = await res.json();
    } catch {
      // non-JSON body (plain text error from getAddress.io)
    }

    if (!res.ok) {
      const msg = json?.Message || json?.message || `Error ${res.status} from getAddress.io`;
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    // expand=true → addresses is an array of objects with line_1, line_2, etc.
    const addresses: Array<{
      line_1: string;
      line_2: string;
      locality: string;
      town_or_city: string;
      county: string;
    }> = Array.isArray(json.addresses) ? (json.addresses as never[]) : [];

    if (addresses.length === 0) {
      return NextResponse.json({ error: "No addresses found for this postcode" }, { status: 404 });
    }

    return NextResponse.json({ addresses });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Upstream fetch failed: ${msg}` }, { status: 500 });
  }
}
