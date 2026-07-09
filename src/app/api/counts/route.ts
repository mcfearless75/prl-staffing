import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  try {
    const [pendingTimesheets, complianceAlerts, draftInvoices, pendingOnboarding, pendingApplicants, openQueries, openGrievances] = await Promise.all([
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
      prisma.grievance.count({
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
      openGrievances,
    });
  } catch {
    return NextResponse.json({ pendingTimesheets: 0, complianceAlerts: 0, draftInvoices: 0, pendingOnboarding: 0, pendingApplicants: 0, openQueries: 0, openGrievances: 0 });
  }
}
