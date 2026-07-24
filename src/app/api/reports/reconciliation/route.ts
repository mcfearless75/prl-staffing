import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { getReconciliationReport } from "../_lib/reconciliation";

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

  const rows = await getReconciliationReport();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const flaggedCount = rows.filter((r) => r.flag === "Unreconciled").length;

  if (format === "csv") {
    const headers = [
      "Invoice Number",
      "Company",
      "Status",
      "Match Status",
      "Lines Total",
      "Invoice Total",
      "Difference",
      "Orphan Lines",
      "Flag",
    ];

    const csvRows = rows.map((r) =>
      [
        r.invoiceNumber,
        r.company,
        r.status,
        r.matchStatus,
        r.linesTotal.toFixed(2),
        r.invoiceTotal.toFixed(2),
        r.difference.toFixed(2),
        r.orphanLineCount,
        r.flag,
      ]
        .map(csvCell)
        .join(",")
    );

    const csv = [headers.map(csvCell).join(","), ...csvRows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="prism-reconciliation.csv"`,
      },
    });
  }

  return NextResponse.json({
    count: rows.length,
    flaggedCount,
    invoices: rows,
  });
}
