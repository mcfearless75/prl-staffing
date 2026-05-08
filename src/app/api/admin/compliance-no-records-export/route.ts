import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

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

  const header = "Name,Email,Phone,Status,ProfileURL";
  const rows = contractors.map((c) => {
    const name = escapeCSV(`${c.firstName} ${c.lastName}`);
    const email = escapeCSV(c.email ?? "");
    const phone = escapeCSV(c.phone ?? "");
    const status = escapeCSV(c.status ?? "");
    const profileUrl = escapeCSV(
      `https://www.prismworkforce.online/contractors/${c.id}`
    );
    return `${name},${email},${phone},${status},${profileUrl}`;
  });

  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="compliance-no-records.csv"',
    },
  });
}
