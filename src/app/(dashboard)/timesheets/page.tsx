export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { Plus, Settings } from "lucide-react";

const statuses = ["All", "Draft", "Submitted", "Approved", "Rejected"];

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const statusFilter = params?.status || "";

  const where: Record<string, unknown> = {};
  if (statusFilter && statusFilter !== "All") {
    where.status = statusFilter;
  }

  const timesheets = await prisma.timesheet.findMany({
    where,
    include: {
      contractor: true,
      assignment: { include: { company: true } },
    },
    orderBy: { weekStarting: "desc" },
  });

  // Stats
  const totalCount = timesheets.length;
  const exceptionCount = timesheets.filter((t) => t.isException).length;
  const autoApprovedCount = timesheets.filter(
    (t) => t.status === "Approved" && t.approvedBy === "system"
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheets"
        description={`${totalCount} timesheets${exceptionCount > 0 ? ` · ${exceptionCount} exceptions` : ""}${autoApprovedCount > 0 ? ` · ${autoApprovedCount} auto-approved` : ""}`}
        action={
          <div className="flex items-center gap-2">
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
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </Link>
          );
        })}
      </div>

      {/* Timesheets Table */}
      {timesheets.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contractor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Week Starting
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Overtime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Assignment
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timesheets.map((timesheet) => (
                <tr
                  key={timesheet.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    timesheet.isException ? "bg-amber-50/40" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {timesheet.contractor.firstName}{" "}
                    {timesheet.contractor.lastName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(timesheet.weekStarting)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                    {timesheet.totalHours}h
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className={timesheet.overtimeHours > 0 ? "font-semibold text-orange-600" : "text-gray-400"}>
                      {timesheet.overtimeHours}h
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={timesheet.status}>
                        {timesheet.status}
                      </Badge>
                      {timesheet.isException && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          Exception
                        </span>
                      )}
                      {timesheet.status === "Approved" && timesheet.approvedBy === "system" && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          Auto
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {timesheet.assignment?.company?.name || "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link
                      href={`/timesheets/${timesheet.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
