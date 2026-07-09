import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextResponse } from "next/server";

const COMPLIANCE_TYPES = [
  "CSCS",
  "DBS",
  "Right to Work",
  "Insurance",
  "IR35 Assessment",
  "Qualification",
  "Passport",
];

export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  const contractors = await prisma.contractor.findMany({
    where: { status: "Active" },
    include: { compliances: true },
    orderBy: { lastName: "asc" },
  });

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Build CSV headers
  const headers = ["Contractor", "Email"];
  for (const type of COMPLIANCE_TYPES) {
    headers.push(`${type} Status`, `${type} Expiry`);
  }

  // Build rows
  const rows: string[][] = [];

  for (const c of contractors) {
    const complianceMap = new Map(
      c.compliances.map((cr) => [cr.type, cr])
    );

    const row: string[] = [
      `${c.firstName} ${c.lastName}`,
      c.email,
    ];

    for (const type of COMPLIANCE_TYPES) {
      const record = complianceMap.get(type);

      if (!record) {
        row.push("Missing", "");
        continue;
      }

      let status = record.status;
      if (record.status === "Verified" && record.expiryDate) {
        if (new Date(record.expiryDate) <= now) {
          status = "Expired";
        } else if (new Date(record.expiryDate) <= thirtyDays) {
          status = "Expiring";
        }
      }

      row.push(status, formatDate(record.expiryDate));
    }

    rows.push(row);
  }

  // Build CSV
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\r\n");

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="training-matrix-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
