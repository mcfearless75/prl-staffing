export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/utils";
import { Plus, Settings, Mail } from "lucide-react";
import { WeeklyTimesheetGroup } from "./weekly-group";

const statuses = ["All", "Draft", "Submitted", "Approved", "Rejected", "Absence"];
const PAGE_SIZE = 50;

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; page?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const statusFilter = params?.status || "";
  const currentPage = Math.max(1, parseInt(params?.page || "1", 10) || 1);
  const isAbsenceFilter = statusFilter === "Absence";

  // "Absence" isn't a Timesheet.status value — it's a filter for timesheets
  // that contain at least one Absent entry, so it needs its own where-clause
  // shape rather than the plain status equality used by the other tabs.
  const where: Record<string, unknown> = isAbsenceFilter
    ? { entries: { some: { status: "Absent" } } }
    : statusFilter && statusFilter !== "All"
    ? { status: statusFilter }
    : {};

  const [timesheets, totalCount, statusCounts, absenceCount] = await Promise.all([
    prisma.timesheet.findMany({
      where,
      include: {
        contractor: true,
        assignment: { include: { company: true, site: true, department: true } },
        entries: { select: { status: true } },
      },
      orderBy: { weekStarting: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.timesheet.count({ where }),
    prisma.timesheet.groupBy({ by: ["status"], where, _count: { status: true } }),
    prisma.timesheet.count({ where: { entries: { some: { status: "Absent" } } } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Stats (respect the active status filter, matching prior behaviour)
  const countByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count.status])
  );
  const submittedCount = countByStatus["Submitted"] || 0;
  const draftCount = countByStatus["Draft"] || 0;
  const approvedCount = countByStatus["Approved"] || 0;

  // Group by week
  const grouped: Record<string, typeof timesheets> = {};
  for (const ts of timesheets) {
    const weekKey = new Date(ts.weekStarting).toISOString().split("T")[0];
    if (!grouped[weekKey]) grouped[weekKey] = [];
    grouped[weekKey].push(ts);
  }

  const weeks = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheets"
        description={`${totalCount} timesheets`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/timesheets/chase"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Chase
            </Link>
            <Link
              href="/timesheets/approval-chains"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Approval Chains
            </Link>
            <Link
              href="/timesheets/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Timesheet
            </Link>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{submittedCount}</p>
          <p className="text-xs text-orange-600">Awaiting Approval</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{draftCount}</p>
          <p className="text-xs text-blue-600">Draft</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
          <p className="text-xs text-emerald-600">Approved</p>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2">
        {statuses.map((s) => {
          const isActive =
            s === "All"
              ? !statusFilter || statusFilter === "All"
              : statusFilter === s;
          return (
            <Link
              key={s}
              href={
                s === "All" ? "/timesheets" : `/timesheets?status=${s}`
              }
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? s === "Absence"
                    ? "bg-indigo-600 text-white"
                    : "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
              {s === "Absence" && absenceCount > 0 && (
                <span className="ml-1.5 text-xs opacity-80">{absenceCount}</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Weekly Grouped Timesheets */}
      {weeks.length > 0 ? (
        <WeeklyTimesheetGroup
          weeks={weeks}
          grouped={JSON.parse(JSON.stringify(
            Object.fromEntries(
              weeks.map((w) => [
                w,
                grouped[w].map((ts) => ({
                  id: ts.id,
                  contractorName: `${ts.contractor.firstName} ${ts.contractor.lastName}`,
                  weekStarting: ts.weekStarting,
                  totalHours: ts.totalHours,
                  overtimeHours: ts.overtimeHours,
                  status: ts.status,
                  isException: ts.isException,
                  approvedBy: ts.approvedBy,
                  companyName: ts.assignment?.company?.name || "—",
                  siteName: ts.assignment?.site?.name || "—",
                  departmentName: ts.assignment?.department?.name || "—",
                  hasAbsence: ts.entries.some((e) => e.status === "Absent"),
                })),
              ])
            )
          ))}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No timesheets found.{" "}
            {statusFilter ? (
              <Link
                href="/timesheets"
                className="text-blue-600 hover:underline"
              >
                Clear filters
              </Link>
            ) : (
              <Link
                href="/timesheets/new"
                className="text-blue-600 hover:underline"
              >
                Create your first timesheet
              </Link>
            )}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages} ({totalCount} timesheets)
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/timesheets?status=${statusFilter || "All"}&page=${currentPage - 1}`}
              aria-disabled={currentPage <= 1}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                currentPage <= 1
                  ? "pointer-events-none bg-gray-50 text-gray-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Previous
            </Link>
            <Link
              href={`/timesheets?status=${statusFilter || "All"}&page=${currentPage + 1}`}
              aria-disabled={currentPage >= totalPages}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                currentPage >= totalPages
                  ? "pointer-events-none bg-gray-50 text-gray-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
