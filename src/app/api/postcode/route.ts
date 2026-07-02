import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const pc = request.nextUrl.searchParams.get("pc")?.replace(/\s+/g, "").toUpperCase();
  if (!pc) return NextResponse.json({ error: "Postcode required" }, { status: 400 });

  const apiKey = process.env.GETADDRESS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured (GETADDRESS_API_KEY missing)" }, { status: 500 });

  try {
    // Use the autocomplete endpoint (current documented API)
    const res = await fetch(
      `https://api.getAddress.io/autocomplete/${encodeURIComponent(pc)}?api-key=${apiKey}&all=true`,
      { cache: "no-store" }
    );
    const json = await res.json();

    if (!res.ok) {
      const msg = json?.Message || json?.message || `Error ${res.status} from getAddress.io`;
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const suggestions: Array<{ address: string; url: string; id: string }> = json.suggestions ?? [];

    if (suggestions.length === 0) {
      return NextResponse.json({ error: "No addresses found for this postcode" }, { status: 404 });
    }

    // Transform suggestion strings into structured address objects the frontend expects.
    // Suggestions look like: "1 Test Street, Locality, Town, County"
    const addresses = suggestions.map((s) => {
      const parts = s.address.split(", ").map((p) => p.trim());
      const line_1 = parts[0] ?? "";
      const line_2 = parts.length > 3 ? parts[1] : "";
      const town_or_city = parts.length > 2 ? parts[parts.length - 2] : parts[1] ?? "";
      const county = parts[parts.length - 1] ?? "";
      const locality = parts.length > 3 ? parts[parts.length - 3] : "";
      return { line_1, line_2, locality, town_or_city, county };
    });

    return NextResponse.json({ addresses });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Upstream fetch failed: ${msg}` }, { status: 500 });
  }
}
