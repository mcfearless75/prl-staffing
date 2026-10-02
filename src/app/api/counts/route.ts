import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { STILL_WORKING_FILTER } from "@/lib/contractor-statuses";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  try {
    const [pendingTimesheets, complianceAlerts, draftInvoices, pendingOnboarding, pendingApplicants, openQueries, openGrievances, newStarters, newCallEnquiries] = await Promise.all([
      prisma.timesheet.count({
        where: { status: { in: ["Submitted", "Draft"] } },
      }),
      // Must equal "Records Needing Action (N)" on /compliance's landing view,
      // so the badge is a number staff can actually find. It used to count
      // leavers' old records and skip Expiring ones — matching nothing on the page.
      prisma.complianceRecord.count({
        where: { status: { notIn: ["Verified"] }, contractor: STILL_WORKING_FILTER },
      }),
      prisma.invoice.count({
        where: { status: "Draft" },
      }),
      prisma.supplyAgreement.count({
        where: { status: "Pending" },
      }),
      prisma.contractor.count({
        where: { status: "Applied" },
      }),
      prisma.paymentQuery.count({
        where: { status: { in: ["Open", "Assigned"] } },
      }),
      prisma.grievance.count({
        where: { status: { in: ["Open", "Assigned"] } },
      }),
      prisma.newStarterSubmission.count({
        where: { status: "New" },
      }),
      prisma.callEnquiry.count({
        where: { status: "New" },
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
      newStarters,
      newCallEnquiries,
    });
  } catch {
    return NextResponse.json({ pendingTimesheets: 0, complianceAlerts: 0, draftInvoices: 0, pendingOnboarding: 0, pendingApplicants: 0, openQueries: 0, openGrievances: 0, newStarters: 0, newCallEnquiries: 0 });
  }
}
