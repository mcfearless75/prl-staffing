import { requireStaff } from "@/lib/require-staff";
import { prisma } from "@/lib/db";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.reason === "forbidden" ? 403 : 401 });

  const withRecords = await prisma.complianceRecord.findMany({
    select: { contractorId: true },
  });

  const ids = [...new Set(withRecords.map((r) => r.contractorId))];

  const contractors = await prisma.contractor.findMany({
    where: {
      id: { notIn: ids },
      status: { notIn: ["Left", "Inactive"] },
    },
    orderBy: [{ status: "asc" }, { lastName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
    },
  });

  const header = "Name,Email,Phone,Status,Profile";
  const rows = contractors.map((c) => {
    const name = escapeCSV(`${c.firstName} ${c.lastName}`);
    const email = escapeCSV(c.email ?? "");
    const phone = escapeCSV(c.phone ?? "");
    const status = escapeCSV(c.status ?? "");
    // Excel/Sheets don't reliably auto-linkify a plain URL string in a CSV
    // cell — HYPERLINK() renders as a real clickable link on open instead.
    // Must stay outside escapeCSV: quoting the whole formula would make
    // Excel treat it as literal text rather than evaluate it.
    const profileLink = `"=HYPERLINK(""https://www.prismworkforce.online/contractors/${c.id}"",""Open Profile"")"`;
    return `${name},${email},${phone},${status},${profileLink}`;
  });

  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="compliance-no-records.csv"',
    },
  });
}
