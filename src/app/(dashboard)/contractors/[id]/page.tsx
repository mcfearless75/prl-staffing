export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { DeleteContractorButton } from "./delete-contractor-button";
import { SendAppInviteButton } from "./send-app-invite-button";
import { PortalLinkButton } from "./portal-link-button";
import { ComplianceReminderButton } from "./compliance-reminder-button";
import { checkComplianceReminder } from "@/lib/workflows/compliance-chase";
import { TabNav } from "./tabs/tab-nav";
import { OverviewTab } from "./tabs/overview-tab";
import { RightToWorkTab } from "./tabs/right-to-work-tab";
import { CompsCertsTab } from "./tabs/comps-certs-tab";
import { effectiveKnownAs } from "@/lib/contractor-name";
import { AssignmentsTab } from "./tabs/assignments-tab";
import { ApplicationTab } from "./tabs/application-tab";
import { ActivityTab } from "./tabs/activity-tab";
import { NotesTab } from "./tabs/notes-tab";
import { isTabLabel, type TabLabel } from "./tabs/types";

export default async function ContractorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const tabParams = searchParams ? await searchParams : {};
  const activeTab: TabLabel = isTabLabel(tabParams.tab) ? tabParams.tab : "Overview";

  const [contractor, activityLogs, documents, complianceRecords, companies, projects, reminder] = await Promise.all([
    prisma.contractor.findUnique({
      where: { id },
      include: {
        supplier: true,
        assignments: { include: { company: true, site: true, department: true, project: true } },
        compliances: true,
        contractorLogin: true,
        noteEntries: { orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }] },
      },
    }),
    prisma.activityLog.findMany({
      where: { entityType: "Contractor", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.document.findMany({
      where: { contractorId: id },
      orderBy: [{ type: "asc" }, { version: "desc" }],
    }),
    prisma.complianceRecord.findMany({
      where: { contractorId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      include: {
        sites: {
          orderBy: { name: "asc" },
          include: {
            departments: { orderBy: { name: "asc" } },
          },
        },
      },
    }),
    prisma.project.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    checkComplianceReminder(id),
  ]);

  if (!contractor) {
    notFound();
  }

  const initials =
    (contractor.firstName?.[0] ?? "") + (contractor.lastName?.[0] ?? "");

  const statusColor =
    contractor.status === "Active"
      ? "bg-green-100 text-green-800"
      : contractor.status === "Inactive"
        ? "bg-gray-100 text-gray-800"
        : "bg-yellow-100 text-yellow-800";

  function worstStatus(statuses: string[]): string {
    if (statuses.length === 0) return "No Records";
    if (statuses.some((s) => s === "Expired" || s === "Non-Compliant")) return "Non-Compliant";
    if (statuses.some((s) => s === "Expiring")) return "Expiring";
    if (statuses.some((s) => s === "Pending")) return "Pending";
    return "Verified";
  }
  const overallStatus = worstStatus(complianceRecords.map((r) => r.status));

  const overallStatusColor =
    overallStatus === "Verified"
      ? "bg-emerald-100 text-emerald-700"
      : overallStatus === "Non-Compliant"
        ? "bg-red-100 text-red-700"
        : overallStatus === "Expiring"
          ? "bg-orange-100 text-orange-700"
          : overallStatus === "Pending"
            ? "bg-amber-100 text-amber-700"
            : "bg-gray-100 text-gray-500";

  const overallStatusDot =
    overallStatus === "Verified"
      ? "bg-emerald-500"
      : overallStatus === "Non-Compliant"
        ? "bg-red-500"
        : overallStatus === "Expiring"
          ? "bg-orange-400"
          : overallStatus === "Pending"
            ? "bg-amber-400"
            : "bg-gray-300";

  const crVerified = complianceRecords.filter((r) => r.status === "Verified").length;
  const crPending = complianceRecords.filter((r) => r.status === "Pending").length;
  const crActionRequired = complianceRecords.filter(
    (r) => r.status === "Expired" || r.status === "Non-Compliant" || r.status === "Expiring"
  ).length;

  // Same basis as the app-invite email (src/app/api/send-app-invite/route.ts):
  // NEXTAUTH_URL falls back to the production domain, contractors sign in at /login.
  const appUrl = process.env.NEXTAUTH_URL || "https://www.prismworkforce.online";
  const portalUrl = `${appUrl}/login`;
  const hasPortalAccount = !!contractor.contractorLogin;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {contractor.firstName} {contractor.lastName}
                {effectiveKnownAs(contractor) && (
                  <span className="ml-2 align-middle text-base font-normal text-gray-500">
                    (known as &ldquo;{effectiveKnownAs(contractor)}&rdquo;)
                  </span>
                )}
                {contractor.ref && (
                  <span className="ml-2 align-middle rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs font-normal text-gray-500">
                    {contractor.ref}
                  </span>
                )}
              </h1>
              {contractor.jobTitle && (
                <p className="text-sm text-gray-500">{contractor.jobTitle}</p>
              )}
              <span
                className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
              >
                {contractor.status}
              </span>
              <span
                className={`mt-1 ml-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${overallStatusColor}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${overallStatusDot}`} />
                Compliance: {overallStatus}
              </span>
              {contractor.emailBounced && (
                <span
                  title={contractor.emailBounceReason ?? undefined}
                  className="mt-1 ml-1 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  Email bounced{contractor.emailBouncedAt ? ` ${formatDate(contractor.emailBouncedAt)}` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 gap-y-5">
            <Link
              href="/contractors"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              ← Contractors
            </Link>
            <Link
              href={`/contractors/${contractor.id}/ir35`}
              className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100 transition-colors"
            >
              IR35 Assessment
            </Link>
            <Link
              href={`/contractors/${contractor.id}/edit`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Edit
            </Link>
            <PortalLinkButton portalUrl={portalUrl} hasPortalAccount={hasPortalAccount} />
            <SendAppInviteButton contractorId={contractor.id} />
            {reminder && (
              <ComplianceReminderButton
                contractorId={contractor.id}
                blockReason={reminder.blockReason}
                docTypes={reminder.docs.map((d) => d.type)}
              />
            )}
            <DeleteContractorButton contractorId={contractor.id} />
          </div>
        </div>
      </div>

      <TabNav
        contractorId={contractor.id}
        activeTab={activeTab}
        compsCertsCount={complianceRecords.length > 0 ? complianceRecords.length : undefined}
        activityCount={activityLogs.length > 0 ? activityLogs.length : undefined}
        notesCount={contractor.noteEntries.length > 0 ? contractor.noteEntries.length : undefined}
      />

      {activeTab === "Overview" && <OverviewTab contractor={contractor} />}
      {activeTab === "Right to Work" && (
        <RightToWorkTab
          contractorId={contractor.id}
          complianceRecords={complianceRecords}
          crVerified={crVerified}
          crPending={crPending}
          crActionRequired={crActionRequired}
          declared={{
            nonBritishNational: contractor.nonBritishNational,
            requiresWorkPermit: contractor.requiresWorkPermit,
            passportNumber: contractor.passportNumber,
            passportExpiry: contractor.passportExpiry,
            visaNumber: contractor.visaNumber,
            visaExpiry: contractor.visaExpiry,
          }}
        />
      )}
      {activeTab === "Comps & Certs" && (
        <CompsCertsTab
          contractorId={contractor.id}
          compliances={contractor.compliances}
          documents={documents}
          complianceRecords={complianceRecords}
          crVerified={crVerified}
          crPending={crPending}
          crActionRequired={crActionRequired}
        />
      )}
      {activeTab === "Assignments" && (
        <AssignmentsTab
          contractorId={contractor.id}
          assignments={contractor.assignments}
          companies={companies}
          projects={projects}
        />
      )}
      {activeTab === "Application" && <ApplicationTab notes={contractor.notes} />}
      {activeTab === "Activity" && <ActivityTab activityLogs={activityLogs} />}
      {activeTab === "Notes" && (
        <NotesTab contractorId={contractor.id} notes={contractor.noteEntries} />
      )}
    </div>
  );
}
