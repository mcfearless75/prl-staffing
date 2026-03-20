export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { submitTimesheet, approveTimesheet, rejectTimesheet } from "../actions";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function TimesheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: {
      contractor: true,
      assignment: { include: { company: true } },
      entries: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!timesheet) {
    notFound();
  }

  const submitAction = submitTimesheet.bind(null, timesheet.id);
  const approveAction = approveTimesheet.bind(null, timesheet.id);
  const rejectAction = rejectTimesheet.bind(null, timesheet.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${timesheet.contractor.firstName} ${timesheet.contractor.lastName}`}
        description={`Week starting ${formatDate(timesheet.weekStarting)}`}
        action={
          <Badge variant={timesheet.status} className="text-sm px-3 py-1">
            {timesheet.status}
          </Badge>
        }
      />

      {/* Timesheet Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Assignment
            </p>
            <p className="mt-1 text-sm text-gray-900">
              {timesheet.assignment
                ? `${timesheet.assignment.role} - ${timesheet.assignment.company.name}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Total Hours
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {timesheet.totalHours}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Overtime Hours
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {timesheet.overtimeHours}
            </p>
          </div>
        </div>

        {timesheet.notes && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-medium uppercase text-gray-500">Notes</p>
            <p className="mt-1 text-sm text-gray-700">{timesheet.notes}</p>
          </div>
        )}
      </div>

      {/* Weekly Grid */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Day
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Overtime
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {timesheet.entries.map((entry) => (
              <tr
                key={entry.id}
                className={
                  entry.dayOfWeek >= 5 ? "bg-gray-50" : "bg-white"
                }
              >
                <td className="px-6 py-3 text-sm font-medium text-gray-900">
                  {dayNames[entry.dayOfWeek]}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {entry.hours}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {entry.overtime}
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="bg-gray-50 font-semibold">
              <td className="px-6 py-3 text-sm text-gray-900">Total</td>
              <td className="px-6 py-3 text-sm text-gray-900">
                {timesheet.totalHours}
              </td>
              <td className="px-6 py-3 text-sm text-gray-900">
                {timesheet.overtimeHours}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {timesheet.status === "Draft" && (
          <>
            <form action={submitAction}>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Submit
              </button>
            </form>
            <Link
              href={`/timesheets/${timesheet.id}/edit`}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Edit
            </Link>
          </>
        )}

        {timesheet.status === "Submitted" && (
          <>
            <form action={approveAction}>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                Approve
              </button>
            </form>
            <form action={rejectAction}>
              <button
                type="submit"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
            </form>
          </>
        )}

        <Link
          href="/timesheets"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Back to Timesheets
        </Link>
      </div>
    </div>
  );
}
