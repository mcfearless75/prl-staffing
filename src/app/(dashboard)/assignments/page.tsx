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
      <KanbanBoard initialAssignments={JSON.parse(JSON.stringify(assignments))} />

      {/* Table View */}
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
