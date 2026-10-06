import { NextResponse } from "next/server";
import { csvCell, toCsv } from "@/lib/csv";
import { logActivity } from "@/lib/activity-log";
import {
  NEW_STARTER_COLUMNS,
  auditDetails,
  describeFilters,
  parseNewStarterFilters,
  reportFileStem,
  rowCells,
} from "@/lib/reports/new-starter-report";
import { companyNamesFor, getNewStarterReport } from "@/lib/reports/new-starter-query";
import { buildNewStarterPdf } from "@/lib/reports/new-starter-pdf";
import { requireNewStarterReportAccess } from "../_lib/new-starter-access";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/new-starters?format=csv|pdf&from=YYYY-MM-DD&to=&company=..&role=..
 * Downloads the New Starter Report. Every download is written to the Activity
 * Log because the file carries NI numbers.
 */
export async function GET(request: Request) {
  const guard = await requireNewStarterReportAccess();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  if (format !== "csv" && format !== "pdf") {
    return NextResponse.json({ error: "format must be csv or pdf" }, { status: 400 });
  }

  const parsed = parseNewStarterFilters(searchParams);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const filters = parsed.filters;

  const rows = await getNewStarterReport(filters);
  const stem = reportFileStem(filters);
  const headers = { "Cache-Control": "no-store" };

  if (format === "csv") {
    const csv = toCsv([[...NEW_STARTER_COLUMNS].map(csvCell), ...rows.map((r) => rowCells(r).map(csvCell))]);
    await logActivity("Exported New Starter Report (CSV)", "Report", undefined, auditDetails(filters, rows.length));
    return new NextResponse(csv, {
      headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${stem}.csv"`,
      },
    });
  }

  const pdf = await buildNewStarterPdf(rows, {
    filterSummary: describeFilters(filters, await companyNamesFor(filters.companyIds)),
    generatedAt: new Date(),
    generatedBy: guard.session.user.name,
  });
  await logActivity("Exported New Starter Report (PDF)", "Report", undefined, auditDetails(filters, rows.length));
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      ...headers,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${stem}.pdf"`,
    },
  });
}
