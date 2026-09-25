import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { getMissingEmergencyContactsReport } from "../_lib/missing-emergency-contacts";

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

  const rows = await getMissingEmergencyContactsReport();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  if (format === "csv") {
    const headers = ["Ref", "Name", "Status", "Missing", "On Live Work", "Phone", "Email"];

    const csvRows = rows.map((r) =>
      [r.ref, r.name, r.status, r.missing.join(" + "), r.onLiveWork ? "Yes" : "No", r.phone, r.email]
        .map(csvCell)
        .join(",")
    );

    const csv = [headers.map(csvCell).join(","), ...csvRows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="prism-missing-emergency-contacts.csv"`,
      },
    });
  }

  return NextResponse.json({
    count: rows.length,
    contractors: rows,
  });
}
