import { NextRequest, NextResponse } from "next/server";

interface IdealPostcodesAddress {
  line_1: string;
  line_2: string;
  line_3: string;
  post_town: string;
  county: string;
  postcode: string;
}

export async function GET(request: NextRequest) {
  const pc = request.nextUrl.searchParams.get("pc")?.replace(/\s+/g, "").toUpperCase();
  if (!pc) return NextResponse.json({ error: "Postcode required" }, { status: 400 });

  const apiKey = process.env.IDEAL_POSTCODES_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured (IDEAL_POSTCODES_API_KEY missing)" }, { status: 500 });

  try {
    const res = await fetch(
      `https://api.ideal-postcodes.co.uk/v1/postcodes/${encodeURIComponent(pc)}?api_key=${apiKey}`,
      { cache: "no-store" }
    );

    const json = await res.json();

    if (res.status === 404) {
      return NextResponse.json({ error: "No addresses found for this postcode" }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: json?.message || `Error ${res.status} from Ideal Postcodes` }, { status: res.status });
    }

    const addresses: IdealPostcodesAddress[] = Array.isArray(json.result) ? json.result : [];
    if (addresses.length === 0) {
      return NextResponse.json({ error: "No addresses found for this postcode" }, { status: 404 });
    }

    return NextResponse.json({ addresses });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Upstream fetch failed: ${msg}` }, { status: 500 });
  }
}
