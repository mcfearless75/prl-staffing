import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { getRedeploymentReport } from "../_lib/redeployment";

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

  const rows = await getRedeploymentReport();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  if (format === "csv") {
    const headers = [
      "Ref",
      "Name",
      "Role",
      "Company",
      "End Date",
      "Days Until End",
      "Days Since End",
      "Phone",
      "Email",
    ];

    const csvRows = rows.map((r) =>
      [
        r.ref,
        r.name,
        r.role,
        r.company,
        r.endDate.toISOString().slice(0, 10),
        r.daysUntilEnd ?? "",
        r.daysSinceEnd ?? "",
        r.phone,
        r.email,
      ]
        .map(csvCell)
        .join(",")
    );

    const csv = [headers.map(csvCell).join(","), ...csvRows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="prism-redeployment.csv"`,
      },
    });
  }

  return NextResponse.json({
    count: rows.length,
    contractors: rows.map((r) => ({
      contractorId: r.contractorId,
      ref: r.ref,
      name: r.name,
      role: r.role,
      company: r.company,
      endDate: r.endDate.toISOString(),
      daysUntilEnd: r.daysUntilEnd,
      daysSinceEnd: r.daysSinceEnd,
      phone: r.phone,
      email: r.email,
    })),
  });
}
