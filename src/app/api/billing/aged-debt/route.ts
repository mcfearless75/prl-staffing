import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { getAgedDebtRows } from "../../../(dashboard)/billing/aged-debt-data";

/**
 * Aged debt CSV export — one row per outstanding (non-Draft, non-fully-paid)
 * invoice, bucketed by days past dueDate.
 */
export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  const rows = await getAgedDebtRows();

  const formatCsvDate = (date: Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const headers = [
    "Company",
    "Invoice",
    "Status",
    "Due Date",
    "Total",
    "Paid",
    "Balance",
    "Days Past Due",
    "Bucket",
  ];

  const csvRows = rows.map((row) => [
    row.companyName,
    row.invoiceNumber,
    row.status,
    formatCsvDate(row.dueDate),
    row.total.toFixed(2),
    row.amountPaid.toFixed(2),
    row.balance.toFixed(2),
    String(row.daysPastDue),
    row.bucket,
  ]);

  const csvContent = [
    headers.join(","),
    ...csvRows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\r\n");

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prism-aged-debt.csv"`,
    },
  });
}
