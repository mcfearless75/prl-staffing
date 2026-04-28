export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, getInitials } from "@/lib/utils";
import { Plus } from "lucide-react";
import { KanbanBoard } from "./kanban-board";

const STATUSES = ["Placed", "Active", "Ending", "Completed"] as const;

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filterStatus = params?.status || "";

  // Always fetch ALL assignments for the kanban board
  const allAssignments = await prisma.assignment.findMany({
    include: {
      contractor: true,
      company: true,
    },
    orderBy: { startDate: "desc" },
  });

  // Filter for the table only
  const tableAssignments = filterStatus
    ? allAssignments.filter((a) => a.status === filterStatus)
    : allAssignments;

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

      {/* Kanban Board - always shows ALL assignments */}
      <KanbanBoard initialAssignments={JSON.parse(JSON.stringify(allAssignments))} />

      {/* Table View - respects status filter */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {filterStatus ? `${filterStatus} Assignments` : "All Assignments"} ({tableAssignments.length})
        </h2>
        {tableAssignments.length > 0 ? (
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
                {tableAssignments.map((assignment) => (
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
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/assignments/${assignment.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          View
                        </Link>
                        <Link
                          href={`/assignments/${assignment.id}/edit`}
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
              No {filterStatus?.toLowerCase()} assignments found.{" "}
              <Link
                href="/assignments"
                className="text-blue-600 hover:underline"
              >
                View all
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
