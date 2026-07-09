import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextResponse } from "next/server";

export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  const suppliers = await prisma.supplier.findMany({
    include: {
      _count: { select: { contractors: true } },
    },
    orderBy: { name: "asc" },
  });

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const tierLabel = (tier: string) =>
    tier === "Tier 1" ? "Gold" : tier === "Tier 2" ? "Silver" : tier === "Tier 3" ? "Bronze" : "Standard";

  const headers = [
    "Supplier Name",
    "Tier",
    "Tier Label",
    "Contact Name",
    "Email",
    "Phone",
    "Performance Score",
    "Status",
    "Contractors",
    "Last Reviewed",
  ];

  const rows: string[][] = suppliers.map((s) => [
    s.name,
    s.tier,
    tierLabel(s.tier),
    s.contactName || "",
    s.contactEmail || "",
    s.contactPhone || "",
    String(s.score),
    s.isActive ? "Active" : "Inactive",
    String(s._count.contractors),
    formatDate(s.updatedAt),
  ]);

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
      "Content-Disposition": `attachment; filename="supplier-index-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
