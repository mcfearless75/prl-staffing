export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { deleteAssignment } from "../actions";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      contractor: true,
      company: true,
      project: true,
      timesheets: true,
    },
  });

  if (!assignment) {
    notFound();
  }

  const deleteAction = deleteAssignment.bind(null, assignment.id);

  const initials = assignment.contractor
    ? getInitials(
        assignment.contractor.firstName,
        assignment.contractor.lastName
      )
    : "??";

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {assignment.contractor
                  ? `${assignment.contractor.firstName} ${assignment.contractor.lastName}`
                  : "Unknown Contractor"}
              </h1>
              <p className="text-sm text-gray-500">
                {assignment.role} at {assignment.company?.name || "—"}
              </p>
              <Badge variant={assignment.status} className="mt-1">
                {assignment.status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/assignments/${assignment.id}/edit`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Edit
            </Link>
            <form action={deleteAction}>
              <button
                type="submit"
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Assignment Details
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Contractor</p>
            <p className="text-sm text-gray-900">
              {assignment.contractor
                ? `${assignment.contractor.firstName} ${assignment.contractor.lastName}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Company</p>
            <p className="text-sm text-gray-900">
              {assignment.company?.name || "—"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Role</p>
            <p className="text-sm text-gray-900">{assignment.role}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Location</p>
            <p className="text-sm text-gray-900">
              {assignment.location || "—"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Start Date</p>
            <p className="text-sm text-gray-900">
              {formatDate(assignment.startDate)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">End Date</p>
            <p className="text-sm text-gray-900">
              {assignment.endDate ? formatDate(assignment.endDate) : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <Badge variant={assignment.status}>{assignment.status}</Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">PO Number</p>
            <p className="text-sm text-gray-900">
              {assignment.poNumber || "—"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Project</p>
            <p className="text-sm text-gray-900">
              {assignment.project
                ? `${assignment.project.code} - ${assignment.project.name}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Charge Rate</p>
            <p className="text-sm text-gray-900">
              {assignment.chargeRate != null
                ? `${formatCurrency(assignment.chargeRate)}${assignment.rateBasis ? ` / ${assignment.rateBasis === "Daily" ? "day" : "hr"}` : ""}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Pay Rate</p>
            <p className="text-sm text-gray-900">
              {assignment.payRate != null
                ? `${formatCurrency(assignment.payRate)}${assignment.rateBasis ? ` / ${assignment.rateBasis === "Daily" ? "day" : "hr"}` : ""}`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {assignment.notes && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {assignment.notes}
          </p>
        </div>
      )}

      {/* Linked Timesheets */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Timesheets
        </h2>
        {assignment.timesheets.length === 0 ? (
          <p className="text-sm text-gray-500">No timesheets found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Week Ending
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assignment.timesheets.map((timesheet: any) => (
                  <tr key={timesheet.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {timesheet.weekStarting
                        ? formatDate(timesheet.weekStarting)
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {timesheet.totalHours ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant={timesheet.status}>
                        {timesheet.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
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
        )}
      </div>
    </div>
  );
}
