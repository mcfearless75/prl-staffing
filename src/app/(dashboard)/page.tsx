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

export default async function DashboardPage() {
  await syncComplianceStatuses();

  const [
    totalContractors,
    activeAssignments,
    pendingTimesheets,
    complianceAlerts,
    totalCompanies,
    activeSuppliers,
    recentContractors,
    recentAlerts,
    totalComplianceRecords,
    verifiedComplianceRecords,
    recentActivity,
    recentSubmittedTimesheets,
    recentDocUploads,
    pendingApplicants,
    openPaymentQueries,
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
    prisma.supplier.count({ where: { isActive: true } }),
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
    prisma.contractor.count({ where: { status: "Pending" } }),
    // Open payment queries
    prisma.paymentQuery.count({ where: { status: { in: ["Open", "Assigned"] } } }),
  ]);

  const complianceScore =
    totalComplianceRecords > 0
      ? Math.round((verifiedComplianceRecords / totalComplianceRecords) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your contractor workforce and compliance status."
      />

      {/* KPI Cards - all clickable */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Contractors"
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
          title="Companies"
          value={totalCompanies}
          icon={Building2}
          href="/companies"
        />
        <StatCard
          title="Active Suppliers"
          value={activeSuppliers}
          icon={ShieldCheck}
          href="/suppliers"
        />
      </div>

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
              Recent Contractors
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
              <ComplianceScoreRing score={complianceScore} />
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
      {(recentSubmittedTimesheets.length > 0 || recentDocUploads.length > 0 || recentActivity.length > 0) && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50">
          <div className="flex items-center gap-2 border-b border-amber-200 px-6 py-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold animate-pulse">!</span>
            <h2 className="text-lg font-semibold text-amber-900">Contractor Activity</h2>
            <span className="ml-auto text-xs text-amber-700">Actions requiring your attention</span>
          </div>
          <div className="divide-y divide-amber-100">
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
