export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { createContractorTimesheet } from "./actions";
import { formatAssignmentLabel } from "./assignment-label";

export default async function PortalTimesheetsPage() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const timesheets = await prisma.timesheet.findMany({
    where: { contractorId },
    include: {
      assignment: { include: { company: true } },
    },
    orderBy: { weekStarting: "desc" },
  });

  // Get active assignments for new timesheet
  const assignments = await prisma.assignment.findMany({
    where: { contractorId, status: { in: [...LIVE_ASSIGNMENT_STATUSES] } },
    include: { company: true, site: true, department: true },
  });

  const createAction = createContractorTimesheet.bind(null, contractorId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Timesheets</h1>
      </div>

      {/* New Timesheet Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Submit New Timesheet</h2>
        <form action={createAction} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Assignment</label>
            <select
              name="assignmentId"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select assignment</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatAssignmentLabel(a)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Week Starting (Monday)</label>
            <input
              type="date"
              name="weekStarting"
              required
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            Create Timesheet
          </button>
        </form>
      </div>

      {/* Timesheets List */}
      <div className="space-y-2">
        {timesheets.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
            No timesheets yet. Create your first one above.
          </div>
        ) : (
          timesheets.map((ts) => (
            <Link
              key={ts.id}
              href={`/portal/timesheets/${ts.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(ts.weekStarting)}
                </p>
                <p className="text-xs text-gray-500">
                  {ts.assignment?.role ? `${ts.assignment.role} - ${ts.assignment.company.name}` : "No assignment"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {ts.totalHours}h total {ts.overtimeHours > 0 && `(${ts.overtimeHours}h OT)`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ts.status}>{ts.status}</Badge>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
