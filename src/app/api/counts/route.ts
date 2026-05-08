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
    const [pendingTimesheets, complianceAlerts, draftInvoices, pendingOnboarding, pendingApplicants, openQueries] = await Promise.all([
      prisma.timesheet.count({
        where: { status: { in: ["Submitted", "Draft"] } },
      }),
      prisma.complianceRecord.count({
        where: { status: { in: ["Pending", "Non-Compliant", "Expired"] } },
      }),
      prisma.invoice.count({
        where: { status: "Draft" },
      }),
      prisma.supplyAgreement.count({
        where: { status: "Pending" },
      }),
      prisma.contractor.count({
        where: { status: "Pending" },
      }),
      prisma.paymentQuery.count({
        where: { status: { in: ["Open", "Assigned"] } },
      }),
    ]);

    return NextResponse.json({
      pendingTimesheets,
      complianceAlerts,
      draftInvoices,
      pendingOnboarding,
      pendingApplicants,
      openQueries,
    });
  } catch {
    return NextResponse.json({ pendingTimesheets: 0, complianceAlerts: 0, draftInvoices: 0, pendingOnboarding: 0, pendingApplicants: 0, openQueries: 0 });
  }
}
