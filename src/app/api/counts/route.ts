import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { WORKFORCE_FILTER } from "@/lib/contractor-statuses";
import { syncComplianceStatuses } from "@/lib/compliance-sync";
import { NextResponse } from "next/server";
import { countUnreadWorkerReplies } from "@/lib/contractor-messages-server";
import { STAFF_ROLE_PENDING } from "@/lib/staff-access";
import { ownNotificationsWhere } from "@/lib/staff-notifications";
import { loadPipelineRows } from "@/lib/new-starter-pipeline-server";
import { NEW_STARTER_STAGES, ONBOARDING_STAGES } from "@/lib/new-starter-pipeline";

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

    const [pendingTimesheets, complianceAlerts, draftInvoices, pendingAgreements, pendingApplicants, openQueries, openGrievances, newStarterChecklists, newCallEnquiries, pipelineRows, unreadMessages, pendingStaff] = await Promise.all([
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
      // New Starter pipeline: people lined up but not yet started, with their
      // stage, so each is counted on the page that shows them (below).
      loadPipelineRows(),
      countUnreadWorkerReplies(),
      // Staff waiting for access on /settings/staff (badge shown to admins only).
      prisma.user.count({ where: { role: STAFF_ROLE_PENDING } }),
    ]);
    // Jenni, 2026-10-08: once documents are verified a starter is Onboarding's
    // job. Each badge counts exactly the people its page shows, so the person
    // sending agreements sees a number. (Agreements sent from the pipeline are
    // saved "Approved", so a starter is never also a Pending agreement.)
    const inStages = (stages: readonly string[]) => pipelineRows.filter((r) => stages.includes(r.stage)).length;
    // The New Starters page has both tabs: the pipeline and HMRC checklists.
    const newStarters = newStarterChecklists + inStages(NEW_STARTER_STAGES);
    const pendingOnboarding = pendingAgreements + inStages(ONBOARDING_STAGES);

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
      // Sidebar Onboarding badge: agreements to review + new starters in the pipeline.
      onboardingTotal: pendingOnboarding + newStarters,
    });
  } catch {
    return NextResponse.json({ pendingTimesheets: 0, complianceAlerts: 0, draftInvoices: 0, pendingOnboarding: 0, pendingApplicants: 0, openQueries: 0, openGrievances: 0, newStarters: 0, newCallEnquiries: 0, unreadMessages: 0, pendingStaff: 0, unreadNotifications: 0, onboardingTotal: 0 });
  }
}
