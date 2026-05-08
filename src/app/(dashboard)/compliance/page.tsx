export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, getInitials } from "@/lib/utils";
import {
  Plus,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Search,
  Clock,
  CheckCircle2,
  AlertOctagon,
} from "lucide-react";
import { ComplianceScoreRing } from "./compliance-score-ring";
import { syncComplianceStatuses } from "@/lib/compliance-sync";
import { getComplianceGaps } from "@/lib/compliance-gaps";
import { ComplianceCharts } from "./compliance-charts";
import { BackfillButton } from "./compliance-actions";

const COMPLIANCE_TYPES = [
  "CV",
  "CSCS",
  "CCNSG",
  "NPORS",
  "Passport",
  "Share Code",
  "Right to Work",
  "DBS",
  "P45",
  "P60",
  "Insurance",
  "IR35 Assessment",
  "Qualification",
  "Other",
] as const;

export default async function CompliancePage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string; type?: string }>;
}) {
  const params = await searchParams;
  const search = params?.search || "";
  const status = params?.status || "";
  const type = params?.type || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.contractor = {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  // Sync statuses based on expiry dates before fetching
  await syncComplianceStatuses();

  const [records, allRecords, gaps, totalContractors] = await Promise.all([
    prisma.complianceRecord.findMany({
      where,
      include: { contractor: true },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.complianceRecord.findMany({ include: { contractor: true } }),
    getComplianceGaps(),
    prisma.contractor.count({
      where: { status: { notIn: ["Left", "Inactive"] } },
    }),
  ]);

  // Contractors with no compliance records at all (for chase view)
  const contractorIdsWithRecords = [...new Set(allRecords.map((r) => r.contractorId))];
  const noRecordContractors = await prisma.contractor.findMany({
    where: {
      id: { notIn: contractorIdsWithRecords },
      status: { notIn: ["Left", "Inactive"] },
    },
    orderBy: [{ status: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, email: true, status: true, phone: true },
  });

  // Get actual types from DB for the filter dropdown
  const actualTypes = Array.from(new Set(allRecords.map((r) => r.type))).sort();

  const mandatoryGaps = gaps.filter((g) => g.isMandatory);
  const criticalGaps = gaps.filter(
    (g) => g.status === "missing" || g.status === "expired"
  );

  // ── Contractor-centric metrics ──────────────────────────────────────────────
  // Group all records by contractorId
  const recordsByContractor = new Map<
    string,
    { status: string; contractorId: string }[]
  >();
  for (const r of allRecords) {
    const existing = recordsByContractor.get(r.contractorId) ?? [];
    existing.push({ status: r.status, contractorId: r.contractorId });
    recordsByContractor.set(r.contractorId, existing);
  }

  // Derive worst status per contractor
  function worstStatus(
    statuses: string[]
  ): "Verified" | "Expiring" | "Non-Compliant" | "Pending" {
    if (statuses.some((s) => s === "Expired" || s === "Non-Compliant"))
      return "Non-Compliant";
    if (statuses.some((s) => s === "Expiring")) return "Expiring";
    if (statuses.some((s) => s === "Pending")) return "Pending";
    return "Verified";
  }

  const contractorsWithRecords = recordsByContractor.size;
  let fullyCompliant = 0;
  let contractorExpiring = 0;
  let actionRequired = 0;
  let pendingReview = 0;

  for (const recs of recordsByContractor.values()) {
    const worst = worstStatus(recs.map((r) => r.status));
    if (worst === "Verified") fullyCompliant++;
    else if (worst === "Expiring") contractorExpiring++;
    else if (worst === "Non-Compliant") actionRequired++;
    else pendingReview++;
  }

  const noRecords = totalContractors - contractorsWithRecords;
  // Score is against the full workforce — honest audit number
  const riskScore =
    totalContractors > 0
      ? Math.round((fullyCompliant / totalContractors) * 100)
      : 0;

  // ── Per-type breakdown — unique contractors per type ─────────────────────
  // Types that collapse into "Right to Work"
  const RTW_TYPES = new Set(["Passport", "Share Code", "Right to Work"]);

  // Display order: RTW first in place of the three separate types, rest unchanged
  const DISPLAY_TYPES = [
    "CV",
    "CSCS",
    "CCNSG",
    "NPORS",
    "Right to Work",
    "DBS",
    "P45",
    "P60",
    "Insurance",
    "IR35 Assessment",
    "Qualification",
    "Other",
  ] as const;

  type DisplayTypeName = (typeof DISPLAY_TYPES)[number];

  const typeBreakdown = DISPLAY_TYPES.map((displayName) => {
    // Records belonging to this display row
    const ofType = allRecords.filter((r) =>
      displayName === "Right to Work"
        ? RTW_TYPES.has(r.type)
        : r.type === displayName
    );

    // Unique contractors who have this type
    const contractorIds = new Set(ofType.map((r) => r.contractorId));
    const total = contractorIds.size;
    if (total === 0) return null;

    // Per-contractor worst status for this type group
    let verified = 0;
    let expiring = 0;
    let expired = 0;
    let pending = 0;

    for (const cid of contractorIds) {
      const statuses = ofType
        .filter((r) => r.contractorId === cid)
        .map((r) => r.status);
      const worst = worstStatus(statuses);
      if (worst === "Verified") verified++;
      else if (worst === "Expiring") expiring++;
      else if (worst === "Non-Compliant") expired++;
      else pending++;
    }

    const percentage = total > 0 ? Math.round((verified / total) * 100) : 0;

    let displayStatus: string;
    if (expired > 0) displayStatus = "Non-Compliant";
    else if (expiring > 0) displayStatus = "Expiring";
    else if (pending > 0) displayStatus = "Pending";
    else if (verified > 0) displayStatus = "Verified";
    else displayStatus = "None";

    return {
      type: displayName as DisplayTypeName,
      total,
      verified,
      expiring,
      expired,
      pending,
      percentage,
      displayStatus,
    };
  }).filter((t): t is NonNullable<typeof t> => t !== null);

  function getRowBorderColor(recordStatus: string) {
    switch (recordStatus) {
      case "Expiring":
        return "border-l-4 border-l-amber-400";
      case "Expired":
      case "Non-Compliant":
        return "border-l-4 border-l-red-400";
      default:
        return "";
    }
  }

  function getStatusIcon(displayStatus: string) {
    switch (displayStatus) {
      case "Verified":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "Expiring":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "Non-Compliant":
      case "Expired":
        return <AlertOctagon className="h-5 w-5 text-red-500" />;
      case "Pending":
        return <Clock className="h-5 w-5 text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-300" />;
    }
  }

  function getProgressBarColor(displayStatus: string) {
    switch (displayStatus) {
      case "Verified":
        return "bg-emerald-500";
      case "Expiring":
        return "bg-amber-500";
      case "Non-Compliant":
      case "Expired":
        return "bg-red-500";
      default:
        return "bg-gray-300";
    }
  }

  function getProgressTrackColor(displayStatus: string) {
    switch (displayStatus) {
      case "Verified":
        return "bg-emerald-100";
      case "Expiring":
        return "bg-amber-100";
      case "Non-Compliant":
      case "Expired":
        return "bg-red-100";
      default:
        return "bg-gray-100";
    }
  }

  // ── Chart data ───────────────────────────────────────────────────────────
  const workforceChartData = [
    { name: "Fully Compliant", value: fullyCompliant, color: "#10b981" },
    { name: "Expiring Soon",   value: contractorExpiring, color: "#f59e0b" },
    { name: "Action Required", value: actionRequired, color: "#ef4444" },
    { name: "Pending Review",  value: pendingReview, color: "#3b82f6" },
    { name: "No Records",      value: noRecords, color: "#e5e7eb" },
  ];

  const typeCoverageData = typeBreakdown.map((t) => ({
    type: t.type,
    contractors: t.total,
    verified: t.verified,
    notVerified: t.total - t.verified,
    percentage: t.percentage,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Dashboard"
        description="Workforce compliance monitoring and risk scoring"
        action={
          <div className="flex flex-wrap gap-2">
            <BackfillButton />
            <Link
              href="/compliance/requirements"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Checklists
            </Link>
            <Link
              href="/compliance/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Record
            </Link>
          </div>
        }
      />

      {/* Risk Score + Summary Cards — Requidex Style */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Compliance Overview
          </h2>
          <div className="flex flex-col items-center gap-1">
            <ComplianceScoreRing score={riskScore} />
            <p className="text-[10px] text-gray-400 text-center leading-tight max-w-[72px]">
              of total workforce
            </p>
          </div>
        </div>

        {/* Summary Cards — full workforce view for audit */}
        <div className="grid grid-cols-5 gap-3 mb-2">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-3xl font-bold text-emerald-700">{fullyCompliant}</p>
            <p className="text-xs font-medium text-emerald-600 mt-1">Fully Compliant</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
            <p className="text-3xl font-bold text-amber-700">{contractorExpiring}</p>
            <p className="text-xs font-medium text-amber-600 mt-1">Expiring Soon</p>
          </div>
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
            <p className="text-3xl font-bold text-red-700">{actionRequired}</p>
            <p className="text-xs font-medium text-red-600 mt-1">Action Required</p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-center">
            <p className="text-3xl font-bold text-blue-700">{pendingReview}</p>
            <p className="text-xs font-medium text-blue-600 mt-1">Pending Review</p>
          </div>
          <div className="rounded-xl bg-gray-100 border border-gray-300 p-4 text-center">
            <p className="text-3xl font-bold text-gray-600">{noRecords}</p>
            <p className="text-xs font-medium text-gray-500 mt-1">No Records</p>
          </div>
        </div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-gray-500">
            Total workforce: <span className="font-semibold text-gray-900">{totalContractors}</span> contractors
            &nbsp;·&nbsp;
            <span className="text-red-600 font-medium">{noRecords} have no compliance documents on file</span>
          </p>
          <p className="text-xs text-gray-400">{contractorsWithRecords} contractors have at least one record</p>
        </div>

        {/* Per-Type Progress Bars — Requidex Style */}
        <div className="space-y-4">
          {typeBreakdown.map((item) => (
            <div
              key={item.type}
              className="flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200">
                {getStatusIcon(item.displayStatus)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-gray-900">
                    {item.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {item.total} contractor{item.total !== 1 ? "s" : ""} /{" "}
                    {item.verified} verified
                  </span>
                </div>
                <div
                  className={`h-2.5 w-full rounded-full ${getProgressTrackColor(item.displayStatus)}`}
                >
                  <div
                    className={`h-2.5 rounded-full transition-all ${getProgressBarColor(item.displayStatus)}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
              <Badge variant={item.displayStatus} className="ml-2 shrink-0">
                {item.displayStatus}
              </Badge>
            </div>
          ))}

          {typeBreakdown.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">
              No compliance records yet.{" "}
              <Link
                href="/compliance/new"
                className="text-blue-600 hover:underline"
              >
                Add your first record
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      {typeCoverageData.length > 0 && (
        <ComplianceCharts
          workforce={workforceChartData}
          typeCoverage={typeCoverageData}
          totalContractors={totalContractors}
        />
      )}

      {/* Compliance Gaps */}
      {criticalGaps.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">
              Compliance Gaps ({criticalGaps.length})
            </h2>
            <span className="text-sm text-red-600">
              Contractors missing mandatory requirements
            </span>
          </div>
          <div className="space-y-2">
            {criticalGaps.slice(0, 10).map((gap, i) => (
              <div
                key={`${gap.contractorId}-${gap.requiredType}-${i}`}
                className="flex items-center justify-between rounded-lg border border-red-200 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      gap.status === "missing"
                        ? "bg-red-500"
                        : "bg-amber-500"
                    }`}
                  />
                  <div>
                    <Link
                      href={`/contractors/${gap.contractorId}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      {gap.contractorName}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {gap.assignmentRole} at {gap.companyName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    {gap.requiredType}
                  </span>
                  <Badge
                    variant={
                      gap.status === "missing"
                        ? "Non-Compliant"
                        : gap.status === "expired"
                          ? "Expired"
                          : gap.status === "expiring"
                            ? "Expiring"
                            : "Pending"
                    }
                  >
                    {gap.status === "missing" ? "Missing" : gap.status === "expired" ? "Expired" : gap.status === "expiring" ? "Expiring" : "Pending"}
                  </Badge>
                </div>
              </div>
            ))}
            {criticalGaps.length > 10 && (
              <p className="text-center text-sm text-red-600 pt-2">
                + {criticalGaps.length - 10} more gaps
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <form method="GET" className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            placeholder="Search by contractor name..."
            defaultValue={search}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="Verified">Verified</option>
          <option value="Pending">Pending</option>
          <option value="Expiring">Expiring</option>
          <option value="Expired">Expired</option>
          <option value="Non-Compliant">Non-Compliant</option>
        </select>
        <select
          name="type"
          defaultValue={type}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {actualTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Compliance Table */}
      {records.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contractor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Document / Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Issue Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((record) => (
                <tr
                  key={record.id}
                  className={`hover:bg-gray-50 transition-colors ${getRowBorderColor(record.status)}`}
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link href={`/contractors/${record.contractor.id}`} className="flex items-center gap-3 group">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                        {getInitials(
                          record.contractor.firstName,
                          record.contractor.lastName
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {record.contractor.firstName}{" "}
                        {record.contractor.lastName}
                      </span>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {record.type}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <div>
                      {record.documentName && (
                        <span className="text-gray-900">
                          {record.documentName}
                        </span>
                      )}
                      {record.reference && (
                        <span className="ml-2 text-gray-400">
                          #{record.reference}
                        </span>
                      )}
                      {!record.documentName && !record.reference && "—"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {record.issueDate ? formatDate(record.issueDate) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {record.expiryDate ? formatDate(record.expiryDate) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge variant={record.status}>
                      {record.status}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/compliance/${record.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                      <Link
                        href={`/compliance/${record.id}/edit`}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No compliance records found.{" "}
            {search || status || type ? (
              <Link
                href="/compliance"
                className="text-blue-600 hover:underline"
              >
                Clear filters
              </Link>
            ) : (
              <Link
                href="/compliance/new"
                className="text-blue-600 hover:underline"
              >
                Add your first compliance record
              </Link>
            )}
          </p>
        </div>
      )}

      {/* No Records — contractor chase list */}
      {noRecordContractors.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                No Compliance Records ({noRecordContractors.length})
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Active contractors with nothing on file — chase or add records
              </p>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {noRecordContractors.map((c) => {
              const statusColor =
                c.status === "Active" ? "bg-emerald-100 text-emerald-700"
                : c.status === "On Site" ? "bg-blue-100 text-blue-700"
                : c.status === "Pending Docs" ? "bg-orange-100 text-orange-700"
                : c.status === "Applied" ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-600";
              const initials = (c.firstName?.[0] ?? "") + (c.lastName?.[0] ?? "");
              return (
                <div key={c.id} className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/contractors/${c.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                        {c.firstName} {c.lastName}
                      </Link>
                      {c.email && <p className="text-xs text-gray-400 truncate">{c.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}>
                      {c.status}
                    </span>
                    <Link
                      href={`/compliance/new?contractorId=${c.id}`}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      + Add Record
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
