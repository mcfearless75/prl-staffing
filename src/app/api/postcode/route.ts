import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface IdealPostcodesAddress {
  line_1: string;
  line_2: string;
  line_3: string;
  post_town: string;
  county: string;
  postcode: string;
}

// Ideal Postcodes trial credit — no live balance endpoint exists on their API,
// so this is tracked by counting our own ActivityLog entries, not a real quota check.
const TRIAL_CREDIT_LIMIT = 50;

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

    // A response of any kind (found, not-found, or error) still consumes a credit.
    const used = await prisma.activityLog.count({ where: { action: "Postcode Lookup" } });
    await prisma.activityLog.create({
      data: { action: "Postcode Lookup", entityType: "PostcodeLookup", details: pc },
    });
    const remaining = Math.max(0, TRIAL_CREDIT_LIMIT - (used + 1));

    if (res.status === 404) {
      return NextResponse.json({ error: "No addresses found for this postcode", remaining }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: json?.message || `Error ${res.status} from Ideal Postcodes`, remaining }, { status: res.status });
    }

    const addresses: IdealPostcodesAddress[] = Array.isArray(json.result) ? json.result : [];
    if (addresses.length === 0) {
      return NextResponse.json({ error: "No addresses found for this postcode", remaining }, { status: 404 });
    }

    return NextResponse.json({ addresses, remaining });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Upstream fetch failed: ${msg}` }, { status: 500 });
  }
}
