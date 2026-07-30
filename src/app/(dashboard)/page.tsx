export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { formatDate, getInitials } from "@/lib/utils";
import {
  Users,
  Building2,
  Clock,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  UserCheck,
  MessageSquare,
} from "lucide-react";
import { ComplianceScoreRing } from "./compliance/compliance-score-ring";
import { syncComplianceStatuses } from "@/lib/compliance-sync";
import { CampaignActivityFeed } from "@/components/campaign-activity-feed";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const params = await searchParams;
  const isDemo = params.demo === "true";

  await syncComplianceStatuses();

  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [
    totalContractors,
    activeAssignments,
    pendingTimesheets,
    complianceAlerts,
    totalCompanies,
    docsAwaitingReview,
    recentContractors,
    recentAlerts,
    totalComplianceRecords,
    verifiedComplianceRecords,
    recentActivity,
    recentSubmittedTimesheets,
    recentDocUploads,
    pendingApplicants,
    openPaymentQueries,
    assignmentsEndingSoon,
    assignmentsStartingSoon,
    assignmentsOverdueCompletion,
    pendingExpenses,
  ] = await Promise.all([
    prisma.contractor.count(),
    prisma.assignment.count({ where: { status: "Active" } }),
    prisma.timesheet.count({
      where: { status: { in: ["Draft", "Submitted"] } },
    }),
    prisma.complianceRecord.count({
      where: { status: { in: ["Expiring", "Expired", "Non-Compliant"] } },
    }),
    prisma.company.count(),
    prisma.complianceRecord.count({ where: { status: "Pending" } }),
    prisma.contractor.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.complianceRecord.findMany({
      where: { status: { in: ["Expiring", "Expired", "Non-Compliant"] } },
      orderBy: { expiryDate: "asc" },
      take: 5,
      include: { contractor: true },
    }),
    prisma.complianceRecord.count(),
    prisma.complianceRecord.count({ where: { status: "Verified" } }),
    // Recent contractor portal activity (changes to monitor)
    prisma.activityLog.findMany({
      where: {
        OR: [
          { action: { contains: "UPDATE" } },
          { action: { contains: "SUBMIT" } },
          { action: { contains: "UPLOAD" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    // Recent submitted timesheets (pending review)
    prisma.timesheet.findMany({
      where: { status: "Submitted" },
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: { contractor: true },
    }),
    // Recent document uploads
    prisma.document.findMany({
      where: { uploadedBy: "contractor" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { contractor: true },
    }),
    // New applicants
    prisma.contractor.count({ where: { status: "Applied" } }),
    // Open payment queries
    prisma.paymentQuery.count({ where: { status: { in: ["Open", "Assigned"] } } }),
    // Assignments ending soon
    prisma.assignment.count({
      where: { status: "Active", endDate: { gte: now, lte: in14Days } },
    }),
    // Assignments starting soon
    prisma.assignment.count({
      where: { status: "Placed", startDate: { gte: now, lte: in14Days } },
    }),
    // Assignments overdue completion
    prisma.assignment.count({
      where: { status: { in: ["Active", "Ending"] }, endDate: { lt: now } },
    }),
    // Pending expenses awaiting approval
    prisma.expense.count({ where: { status: "Pending" } }),
  ]);

  const complianceScore =
    totalComplianceRecords > 0
      ? Math.round((verifiedComplianceRecords / totalComplianceRecords) * 100)
      : 0;

  const [allComplianceRecords, totalContractorCount, activeAssignmentContractors] = await Promise.all([
    prisma.complianceRecord.findMany({ select: { contractorId: true, status: true } }),
    prisma.contractor.count({ where: { status: { notIn: ["Left", "Inactive"] } } }),
    // Score is scoped to subcontractors actively assigned to a client — same
    // rule as the /compliance dashboard.
    prisma.assignment.findMany({
      where: { status: { in: ["Placed", "Active", "Ending"] } },
      select: { contractorId: true },
      distinct: ["contractorId"],
    }),
  ]);

  const assignedContractorIds = new Set(activeAssignmentContractors.map((a) => a.contractorId));
  const assignedTotal = assignedContractorIds.size;
  const assignedComplianceRecords = allComplianceRecords.filter((r) => assignedContractorIds.has(r.contractorId));

  const contractorIdsWithRecords = new Set(assignedComplianceRecords.map((r) => r.contractorId));
  const byContractor = new Map<string, string[]>();
  for (const r of assignedComplianceRecords) {
    const existing = byContractor.get(r.contractorId) ?? [];
    existing.push(r.status);
    byContractor.set(r.contractorId, existing);
  }
  function worstStatus(statuses: string[]) {
    if (statuses.some((s) => s === "Expired" || s === "Non-Compliant")) return "Non-Compliant";
    if (statuses.some((s) => s === "Expiring")) return "Expiring";
    if (statuses.some((s) => s === "Pending")) return "Pending";
    return "Verified";
  }
  let complianceFullyCompliant = 0, compliancePending = 0, complianceActionRequired = 0;
  for (const statuses of byContractor.values()) {
    const w = worstStatus(statuses);
    if (w === "Verified") complianceFullyCompliant++;
    else if (w === "Pending") compliancePending++;
    else complianceActionRequired++;
  }
  const complianceNoRecords = assignedTotal - contractorIdsWithRecords.size;
  const workforceScore = assignedTotal > 0
    ? Math.round((complianceFullyCompliant / assignedTotal) * 100)
    : 0;

  // Demo mode — explicit ?demo=true only.
  //
  // There used to be a second trigger here: a hardcoded date ("18/05/2026")
  // that silently forced these figures to a perfect 100% for anyone viewing the
  // dashboard on that day, with nothing on screen to say so. Removed — a
  // compliance number that can lie without disclosing it is worse than no
  // number. The URL param survives for demos and now renders a visible banner.
  const isDemoActive = isDemo;

  const displayWorkforceScore = isDemoActive ? 100 : workforceScore;
  const displayComplianceScore = isDemoActive ? 100 : complianceScore;
  const displayFullyCompliant = isDemoActive ? assignedTotal : complianceFullyCompliant;
  const displayPending = isDemoActive ? 0 : compliancePending;
  const displayActionRequired = isDemoActive ? 0 : complianceActionRequired;
  const displayNoRecords = isDemoActive ? 0 : complianceNoRecords;

  return (
    <div className="space-y-8">
<PageHeader
        title="Dashboard"
        description="Overview of your subcontractor workforce and compliance status."
      />

      {/* Demo mode must never be mistakable for live data. */}
      {isDemoActive && (
        <div className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-900">
            Demo mode — compliance figures on this page are not real.
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Scores are forced to 100% for demonstration. The live workforce score is{" "}
            <strong>{workforceScore}%</strong> ({complianceFullyCompliant} fully compliant of{" "}
            {assignedTotal} assigned, {complianceNoRecords} with no records).{" "}
            <Link href="/" className="font-medium underline">
              Show real figures
            </Link>
            .
          </p>
        </div>
      )}

      {/* KPI Cards - all clickable */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Subcontractors"
          value={totalContractors}
          icon={Users}
          href="/contractors"
        />
        <StatCard
          title="Active Assignments"
          value={activeAssignments}
          icon={TrendingUp}
          href="/assignments"
        />
        <StatCard
          title="Pending Timesheets"
          value={pendingTimesheets}
          icon={Clock}
          href="/timesheets?status=Submitted"
        />
        <StatCard
          title="Compliance Alerts"
          value={complianceAlerts}
          icon={AlertTriangle}
          href="/compliance?status=Expiring"
        />
        <StatCard
          title="Clients"
          value={totalCompanies}
          icon={Building2}
          href="/companies"
        />
        <StatCard
          title="Docs Awaiting Review"
          value={docsAwaitingReview}
          icon={ShieldCheck}
          href="/compliance/review"
        />
        <StatCard
          title="New Applicants"
          value={pendingApplicants}
          icon={UserCheck}
          href="/applicants"
        />
        <StatCard
          title="Pay Queries"
          value={openPaymentQueries}
          icon={MessageSquare}
          href="/payment-queries"
        />
      </div>

      {/* Compliance Overview Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Compliance</h2>
          <Link
            href="/compliance"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            View Dashboard &rarr;
          </Link>
        </div>
        <div className="flex flex-col items-center py-2">
          <span
            className={`text-6xl font-bold ${
              displayWorkforceScore >= 80
                ? "text-green-600"
                : displayWorkforceScore >= 50
                ? "text-amber-500"
                : "text-red-600"
            }`}
          >
            {displayWorkforceScore}%
          </span>
          <p className="mt-1 text-sm text-gray-500">of assigned workforce fully compliant</p>
          <p className="mt-0.5 text-xs text-gray-400">
            {assignedTotal} of {totalContractorCount} subcontractors currently assigned
          </p>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Fully Compliant: {displayFullyCompliant}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Pending: {displayPending}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Action Required: {displayActionRequired}
          </span>
          {displayNoRecords > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              No Records: {displayNoRecords}
            </span>
          )}
        </div>
        {displayPending > 0 && (
          <div className="mt-5 flex justify-center">
            <Link
              href="/compliance/review"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Review Queue ({compliancePending})
            </Link>
          </div>
        )}
      </div>

      {/* Campaign Activity — live feed, auto-refreshes every 30s */}
      <CampaignActivityFeed />

      {/* Alert Cards — pulse when active */}
      {(pendingApplicants > 0 || openPaymentQueries > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pendingApplicants > 0 && (
            <a href="/applicants" className="block animate-pulse rounded-xl border-2 border-amber-400 bg-amber-50 p-5 ring-2 ring-amber-300 ring-offset-2 transition-all hover:shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <UserCheck className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700">{pendingApplicants}</p>
                  <p className="text-sm font-medium text-amber-600">New Applicants — Review needed</p>
                </div>
              </div>
            </a>
          )}
          {openPaymentQueries > 0 && (
            <a href="/payment-queries" className="block animate-pulse rounded-xl border-2 border-red-400 bg-red-50 p-5 ring-2 ring-red-300 ring-offset-2 transition-all hover:shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <MessageSquare className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-700">{openPaymentQueries}</p>
                  <p className="text-sm font-medium text-red-600">Open Payment Queries</p>
                </div>
              </div>
            </a>
          )}
        </div>
      )}

      {/* Recent Contractors & Compliance Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Contractors */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Subcontractors
            </h2>
            <Link
              href="/contractors"
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentContractors.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No contractors found.
              </div>
            ) : (
              recentContractors.map((contractor) => (
                <Link
                  key={contractor.id}
                  href={`/contractors/${contractor.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-medium text-blue-700">
                    {getInitials(contractor.firstName, contractor.lastName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {contractor.firstName} {contractor.lastName}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {contractor.jobTitle || "No job title"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={contractor.status}>
                      {contractor.status}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {formatDate(contractor.createdAt)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Compliance Alerts */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Compliance Alerts
            </h2>
            <div className="flex items-center gap-3">
              <ComplianceScoreRing score={displayComplianceScore} />
              <Link
                href="/compliance"
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentAlerts.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No compliance alerts. ✅
              </div>
            ) : (
              recentAlerts.map((record) => (
                <Link
                  key={record.id}
                  href={`/compliance/${record.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {record.contractor.firstName}{" "}
                      {record.contractor.lastName}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {record.type}
                      {record.expiryDate
                        ? ` \u00B7 Expires ${formatDate(record.expiryDate)}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant={record.status}>{record.status}</Badge>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Contractor Activity Feed */}
      {(recentSubmittedTimesheets.length > 0 || recentDocUploads.length > 0 || recentActivity.length > 0 || assignmentsEndingSoon > 0 || assignmentsStartingSoon > 0 || assignmentsOverdueCompletion > 0 || pendingExpenses > 0) && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50">
          <div className="flex items-center gap-2 border-b border-amber-200 px-6 py-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold animate-pulse">!</span>
            <h2 className="text-lg font-semibold text-amber-900">Contractor Activity</h2>
            <span className="ml-auto text-xs text-amber-700">Actions requiring your attention</span>
          </div>
          <div className="divide-y divide-amber-100">
            {/* Assignments ending soon */}
            {assignmentsEndingSoon > 0 && (
              <Link
                href="/assignments"
                className="flex items-center gap-4 px-6 py-3 hover:bg-amber-50 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">
                    <strong>{assignmentsEndingSoon}</strong> assignment{assignmentsEndingSoon === 1 ? "" : "s"} ending in the next 14 days
                  </p>
                  <p className="text-xs text-gray-500">Active assignments approaching their end date</p>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Review</span>
              </Link>
            )}
            {/* Assignments starting soon */}
            {assignmentsStartingSoon > 0 && (
              <Link
                href="/assignments"
                className="flex items-center gap-4 px-6 py-3 hover:bg-amber-50 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">
                    <strong>{assignmentsStartingSoon}</strong> assignment{assignmentsStartingSoon === 1 ? "" : "s"} starting in the next 14 days
                  </p>
                  <p className="text-xs text-gray-500">Placed assignments due to start soon</p>
                </div>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">Review</span>
              </Link>
            )}
            {/* Assignments overdue completion */}
            {assignmentsOverdueCompletion > 0 && (
              <Link
                href="/assignments"
                className="flex items-center gap-4 px-6 py-3 hover:bg-amber-50 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-medium text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">
                    <strong>{assignmentsOverdueCompletion}</strong> assignment{assignmentsOverdueCompletion === 1 ? "" : "s"} overdue completion
                  </p>
                  <p className="text-xs text-gray-500">Active or ending assignments past their end date</p>
                </div>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">Review</span>
              </Link>
            )}
            {/* Pending expenses awaiting approval */}
            {pendingExpenses > 0 && (
              <Link
                href="/expenses"
                className="flex items-center gap-4 px-6 py-3 hover:bg-amber-50 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-700">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">
                    <strong>{pendingExpenses}</strong> expense{pendingExpenses === 1 ? "" : "s"} awaiting approval
                  </p>
                  <p className="text-xs text-gray-500">Contractor-submitted expenses pending review</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Review</span>
              </Link>
            )}
            {/* Submitted timesheets needing review */}
            {recentSubmittedTimesheets.map((ts) => (
              <Link
                key={`ts-${ts.id}`}
                href={`/timesheets/${ts.id}`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-amber-50 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                  {getInitials(ts.contractor.firstName, ts.contractor.lastName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">
                    <strong>{ts.contractor.firstName} {ts.contractor.lastName}</strong> submitted a timesheet
                  </p>
                  <p className="text-xs text-gray-500">{ts.totalHours}h total · {ts.overtimeHours}h OT · Week of {formatDate(ts.weekStarting)}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">Review</span>
              </Link>
            ))}
            {/* Recent document uploads */}
            {recentDocUploads.map((doc) => (
              <Link
                key={`doc-${doc.id}`}
                href={`/contractors/${doc.contractorId}`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-amber-50 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-700">
                  {getInitials(doc.contractor.firstName, doc.contractor.lastName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">
                    <strong>{doc.contractor.firstName} {doc.contractor.lastName}</strong> uploaded {doc.type}
                  </p>
                  <p className="text-xs text-gray-500">{doc.fileName} · {formatDate(doc.createdAt)}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Verify</span>
              </Link>
            ))}
            {/* Profile updates from activity log */}
            {recentActivity.filter(a => a.action === "UPDATE" && a.entityType === "Contractor").slice(0, 3).map((log) => (
              <Link
                key={`log-${log.id}`}
                href={log.entityId ? `/contractors/${log.entityId}` : "/activity"}
                className="flex items-center gap-4 px-6 py-3 hover:bg-amber-50 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-700">
                  UP
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">{log.details || "Profile updated"}</p>
                  <p className="text-xs text-gray-500">{log.userEmail} · {formatDate(log.createdAt)}</p>
                </div>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">View</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
