import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

// Agency Workers Regulations (AWR) starter report.
//
// After 12 qualifying weeks an agency worker is entitled to the same basic pay
// as a comparable direct hire. A full AWR assessment needs a defined comparator
// pay per trade/region; this export lays out the current rate cards as the pay
// basis that assessment starts from (trade, region, pay, charge, margin). The
// exact contents PRL Console produces should be confirmed and matched before
// this is treated as the definitive AWR return.

const EMPLOYMENT_TYPES = ["CIS", "PAYE", "PSC"];
const RATE_TYPES = ["Time", "Piece"];
const RATE_BASES = ["Hourly", "Daily"];

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(request: Request) {
  const guard = await requireStaff();
  if (!guard.ok) {
    return NextResponse.json({ error: "Unauthorised" }, { status: guard.reason === "forbidden" ? 403 : 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const employmentType = EMPLOYMENT_TYPES.includes(searchParams.get("employmentType") || "")
    ? searchParams.get("employmentType")!
    : undefined;
  const rateType = RATE_TYPES.includes(searchParams.get("rateType") || "") ? searchParams.get("rateType")! : undefined;
  const rateBasis = RATE_BASES.includes(searchParams.get("rateBasis") || "") ? searchParams.get("rateBasis")! : undefined;

  const where: Prisma.RateCardWhereInput = {
    ...(employmentType ? { employmentType } : {}),
    ...(rateType ? { rateType } : {}),
    ...(rateBasis ? { rateBasis } : {}),
    ...(q
      ? {
          OR: [
            { trade: { contains: q, mode: "insensitive" } },
            { region: { contains: q, mode: "insensitive" } },
            { sector: { contains: q, mode: "insensitive" } },
            { project: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const rates = await prisma.rateCard.findMany({ where, orderBy: [{ trade: "asc" }, { region: "asc" }] });

  const headers = [
    "Trade",
    "Region",
    "Sector",
    "Employment Type",
    "Basis",
    "Agency Pay",
    "Comparator (Charge)",
    "Margin %",
    "AWR Basic Pay Parity",
    "Effective From",
  ];

  const rows = rates.map((r) => {
    // Flag where agency pay materially lags the charge basis — a prompt to
    // review parity, not a definitive AWR compliance verdict.
    const parity = r.charge > 0 ? (r.pay / r.charge) * 100 : 0;
    const flag = parity < 60 ? "Review" : "OK";
    return [
      r.trade,
      r.region,
      r.sector,
      r.employmentType,
      r.rateBasis,
      r.pay,
      r.charge,
      r.margin,
      flag,
      r.effectiveFrom.toISOString().slice(0, 10),
    ].map(csvCell).join(",");
  });

  const csv = [headers.map(csvCell).join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prism-awr-report.csv"`,
    },
  });
}
