import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [pendingTimesheets, complianceAlerts, draftInvoices] = await Promise.all([
      prisma.timesheet.count({
        where: { status: { in: ["Submitted", "Draft"] } },
      }),
      prisma.complianceRecord.count({
        where: { status: { in: ["Expiring", "Expired"] } },
      }),
      prisma.invoice.count({
        where: { status: "Draft" },
      }),
    ]);

    return NextResponse.json({
      pendingTimesheets,
      complianceAlerts,
      draftInvoices,
    });
  } catch {
    return NextResponse.json({ pendingTimesheets: 0, complianceAlerts: 0, draftInvoices: 0 });
  }
}
