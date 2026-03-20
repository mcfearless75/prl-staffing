export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
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
} from "lucide-react";
import { ComplianceScoreRing } from "./compliance/compliance-score-ring";

export default async function DashboardPage() {
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Contractors"
          value={totalContractors}
          icon={Users}
        />
        <StatCard
          title="Active Assignments"
          value={activeAssignments}
          icon={TrendingUp}
        />
        <StatCard
          title="Pending Timesheets"
          value={pendingTimesheets}
          icon={Clock}
        />
        <StatCard
          title="Compliance Alerts"
          value={complianceAlerts}
          icon={AlertTriangle}
        />
        <StatCard
          title="Companies"
          value={totalCompanies}
          icon={Building2}
        />
        <StatCard
          title="Active Suppliers"
          value={activeSuppliers}
          icon={ShieldCheck}
        />
      </div>

      {/* Recent Contractors & Compliance Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Contractors */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Contractors
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentContractors.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No contractors found.
              </div>
            ) : (
              recentContractors.map((contractor) => (
                <div
                  key={contractor.id}
                  className="flex items-center gap-4 px-6 py-4"
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
                </div>
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
            <ComplianceScoreRing score={complianceScore} />
          </div>
          <div className="divide-y divide-gray-100">
            {recentAlerts.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No compliance alerts.
              </div>
            ) : (
              recentAlerts.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-4 px-6 py-4"
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
