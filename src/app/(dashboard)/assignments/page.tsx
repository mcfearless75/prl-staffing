export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, getInitials } from "@/lib/utils";
import { Plus } from "lucide-react";

const STATUSES = ["Placed", "Active", "Ending", "Completed"] as const;

const statusBorderColors: Record<string, string> = {
  Placed: "border-l-blue-500",
  Active: "border-l-emerald-500",
  Ending: "border-l-orange-500",
  Completed: "border-l-gray-400",
};

const statusHeaderColors: Record<string, string> = {
  Placed: "bg-blue-50 text-blue-700",
  Active: "bg-emerald-50 text-emerald-700",
  Ending: "bg-orange-50 text-orange-700",
  Completed: "bg-gray-50 text-gray-600",
};

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filterStatus = params?.status || "";

  const where: Record<string, unknown> = {};
  if (filterStatus) {
    where.status = filterStatus;
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      contractor: true,
      company: true,
    },
    orderBy: { startDate: "desc" },
  });

  const grouped = {
    Placed: assignments.filter((a) => a.status === "Placed"),
    Active: assignments.filter((a) => a.status === "Active"),
    Ending: assignments.filter((a) => a.status === "Ending"),
    Completed: assignments.filter((a) => a.status === "Completed"),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        action={
          <Link
            href="/assignments/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Assignment
          </Link>
        }
      />

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2">
        <Link
          href="/assignments"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            !filterStatus
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/assignments?status=${s}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filterStatus === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {(["Placed", "Active", "Ending"] as const).map((status) => (
          <div key={status} className="space-y-3">
            {/* Column Header */}
            <div
              className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${statusHeaderColors[status]}`}
            >
              <span className="text-sm font-semibold">{status}</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/60 text-xs font-bold">
                {grouped[status].length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {grouped[status].length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
                  No assignments
                </div>
              ) : (
                grouped[status].map((assignment) => {
                  const initials = assignment.contractor
                    ? getInitials(
                        assignment.contractor.firstName,
                        assignment.contractor.lastName
                      )
                    : "??";

                  return (
                    <Link
                      key={assignment.id}
                      href={`/assignments/${assignment.id}`}
                      className={`block rounded-xl border border-gray-200 border-l-4 bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${statusBorderColors[status]}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {assignment.contractor
                              ? `${assignment.contractor.firstName} ${assignment.contractor.lastName}`
                              : "Unknown"}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {assignment.company?.name || "—"}
                          </p>
                          <p className="mt-1 text-xs font-medium text-gray-700">
                            {assignment.role}
                          </p>
                          {assignment.location && (
                            <p className="text-xs text-gray-400">
                              {assignment.location}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                            <span>{formatDate(assignment.startDate)}</span>
                            {assignment.endDate && (
                              <>
                                <span>—</span>
                                <span>{formatDate(assignment.endDate)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Table View Fallback */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          All Assignments
        </h2>
        {assignments.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Contractor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    End Date
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
                {assignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                          {assignment.contractor
                            ? getInitials(
                                assignment.contractor.firstName,
                                assignment.contractor.lastName
                              )
                            : "??"}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {assignment.contractor
                            ? `${assignment.contractor.firstName} ${assignment.contractor.lastName}`
                            : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {assignment.company?.name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {assignment.role}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {assignment.location || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(assignment.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {assignment.endDate
                        ? formatDate(assignment.endDate)
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge variant={assignment.status}>
                        {assignment.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link
                        href={`/assignments/${assignment.id}`}
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
              No assignments found.{" "}
              {filterStatus ? (
                <Link
                  href="/assignments"
                  className="text-blue-600 hover:underline"
                >
                  Clear filters
                </Link>
              ) : (
                <Link
                  href="/assignments/new"
                  className="text-blue-600 hover:underline"
                >
                  Create your first assignment
                </Link>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
