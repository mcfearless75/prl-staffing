import { requireStaff } from "@/lib/require-staff";
import { computeAwrClocks, filterAwrByBasis, type AwrBasis } from "@/lib/awr";

const VALID_BASES: AwrBasis[] = ["reached", "below-comparable", "future"];

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatCsvDate(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/**
 * CSV export mirroring Requidex's 3 AWR report bases:
 * ?basis=reached           — trigger reached
 * ?basis=below-comparable  — trigger reached AND rate below comparable
 * ?basis=future            — trigger not yet reached (projected)
 */
export async function GET(request: Request) {
  const guard = await requireStaff();
  if (!guard.ok) {
    return new Response("Unauthorized", { status: guard.reason === "forbidden" ? 403 : 401 });
  }

  const { searchParams } = new URL(request.url);
  const basis = searchParams.get("basis") as AwrBasis | null;

  if (!basis || !VALID_BASES.includes(basis)) {
    return new Response("Invalid or missing basis. Use reached | below-comparable | future.", { status: 400 });
  }

  const allClocks = await computeAwrClocks();
  const clocks = filterAwrByBasis(allClocks, basis);

  const header = [
    "Contractor Ref",
    "Contractor Name",
    "Company",
    "Qualifying Weeks",
    "Trigger Reached",
    "Trigger Date",
    "Projected Trigger Date",
    "Pay Rate",
    "Comparator Rate",
    "Below Comparator",
  ].join(",");

  const rows = clocks.map((c) =>
    [
      escapeCSV(c.contractorRef ?? ""),
      escapeCSV(c.contractorName),
      escapeCSV(c.companyName),
      String(c.qualifyingWeeks),
      c.triggerReached ? "Yes" : "No",
      formatCsvDate(c.triggerDate),
      formatCsvDate(c.projectedTriggerDate),
      c.currentPayRate !== null ? c.currentPayRate.toFixed(2) : "",
      c.comparatorRate !== null ? c.comparatorRate.toFixed(2) : "",
      c.comparatorBelow ? "Yes" : "No",
    ].join(",")
  );

  const csv = [header, ...rows].join("\r\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="awr-${basis}.csv"`,
    },
  });
}
