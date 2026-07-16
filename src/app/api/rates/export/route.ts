import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

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
    "Project",
    "Employment Type",
    "Rate Type",
    "Rate Basis",
    "Pay",
    "Agency Markup",
    "Charge",
    "Margin %",
    "Effective From",
    "Effective To",
  ];

  const rows = rates.map((r) =>
    [
      r.trade,
      r.region,
      r.sector,
      r.project,
      r.employmentType,
      r.rateType,
      r.rateBasis,
      r.pay,
      r.agencyMarkup,
      r.charge,
      r.margin,
      r.effectiveFrom.toISOString().slice(0, 10),
      r.effectiveTo ? r.effectiveTo.toISOString().slice(0, 10) : "",
    ].map(csvCell).join(",")
  );

  const csv = [headers.map(csvCell).join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prism-rates.csv"`,
    },
  });
}
