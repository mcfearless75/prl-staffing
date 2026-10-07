import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { WORKFORCE_FILTER } from "@/lib/contractor-statuses";
import { syncComplianceStatuses } from "@/lib/compliance-sync";
import { NextResponse } from "next/server";
import { countUnreadWorkerReplies } from "@/lib/contractor-messages-server";
import { STAFF_ROLE_PENDING } from "@/lib/staff-access";
import { ownNotificationsWhere } from "@/lib/staff-notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  try {
    // Expiry statuses are only rolled forward when something calls this, so do
    // it here too — otherwise the badge goes stale until someone opens the
    // Dashboard or /compliance after a document's date passes. A failed sync
    // must not blank every other badge, so it can't throw into the catch below.
    await syncComplianceStatuses().catch(() => {});

    const [pendingTimesheets, complianceAlerts, draftInvoices, pendingOnboarding, pendingApplicants, openQueries, openGrievances, newStarterChecklists, newCallEnquiries, openPlacements, unreadMessages, pendingStaff] = await Promise.all([
      prisma.timesheet.count({
        where: { status: { in: ["Submitted", "Draft"] } },
      }),
      // Must equal "Records Needing Action (N)" on /compliance's landing view,
      // so the badge is a number staff can actually find. It used to count
      // leavers' old records and skip Expiring ones — matching nothing on the page.
      prisma.complianceRecord.count({
        where: { status: { notIn: ["Verified"] }, contractor: WORKFORCE_FILTER },
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
      // New Starter pipeline: people lined up but not yet started.
      prisma.newStarterPlacement.count({
        where: { completedAt: null, cancelledAt: null },
      }),
      countUnreadWorkerReplies(),
      // Staff waiting for access on /settings/staff (badge shown to admins only).
      prisma.user.count({ where: { role: STAFF_ROLE_PENDING } }),
    ]);
    // The New Starters page has both tabs: the pipeline and HMRC checklists.
    const newStarters = newStarterChecklists + openPlacements;

    // The caller's own unread alerts (Notifications page badge), found by
    // session email like /api/notifications — SSO sessions carry no User.id.
    const email = guard.session.user.email;
    const me = email ? await prisma.user.findUnique({ where: { email }, select: { id: true } }) : null;
    const unreadNotifications = me
      ? await prisma.notification.count({ where: ownNotificationsWhere(me.id, { unreadOnly: true }) })
      : 0;

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
      unreadMessages,
      pendingStaff,
      unreadNotifications,
    });
  } catch {
    return NextResponse.json({ pendingTimesheets: 0, complianceAlerts: 0, draftInvoices: 0, pendingOnboarding: 0, pendingApplicants: 0, openQueries: 0, openGrievances: 0, newStarters: 0, newCallEnquiries: 0, unreadMessages: 0, pendingStaff: 0, unreadNotifications: 0 });
  }
}
