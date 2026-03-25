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
    const [pendingTimesheets, complianceAlerts, draftInvoices, pendingOnboarding] = await Promise.all([
      prisma.timesheet.count({
        where: { status: { in: ["Submitted", "Draft"] } },
      }),
      prisma.complianceRecord.count({
        where: { status: { in: ["Expiring", "Expired"] } },
      }),
      prisma.invoice.count({
        where: { status: "Draft" },
      }),
      prisma.supplyAgreement.count({
        where: { status: "Pending" },
      }),
    ]);

    return NextResponse.json({
      pendingTimesheets,
      complianceAlerts,
      draftInvoices,
      pendingOnboarding,
    });
  } catch {
    return NextResponse.json({ pendingTimesheets: 0, complianceAlerts: 0, draftInvoices: 0, pendingOnboarding: 0 });
  }
}
