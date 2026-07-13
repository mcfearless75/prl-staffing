export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { createTimesheet } from "../actions";

interface NewTimesheetPageProps {
  searchParams: Promise<{
    duplicateId?: string;
    weekStarting?: string;
    contractorId?: string;
    assignmentId?: string;
    notes?: string;
  }>;
}

export default async function NewTimesheetPage({
  searchParams,
}: NewTimesheetPageProps) {
  const params = await searchParams;
  const duplicate = params.duplicateId
    ? await prisma.timesheet.findUnique({ where: { id: params.duplicateId } })
    : null;

  const contractors = await prisma.contractor.findMany({
    where: { status: "Active" },
    include: {
      assignments: {
        include: { company: true },
      },
    },
    orderBy: { lastName: "asc" },
  });

  // Collect all assignments across contractors for the select
  const allAssignments = contractors.flatMap((c) =>
    c.assignments.map((a) => ({
      id: a.id,
      label: `${a.role} - ${a.company.name}`,
      contractorId: c.id,
    }))
  );

  return (
    <div className="space-y-6">
      <PageHeader title="New Timesheet" />

      {duplicate && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            You already have a timesheet for this week (status:{" "}
            {duplicate.status}).
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Link
              href={`/timesheets/${duplicate.id}`}
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors"
            >
              View existing timesheet
            </Link>
            {duplicate.status === "Approved" ? (
              <p className="text-xs text-amber-700">
                This timesheet is already approved and can&apos;t be replaced here — it must be reopened by an authorised approver first.
              </p>
            ) : (
              <form action={createTimesheet}>
                <input type="hidden" name="confirmReplace" value="true" />
                <input
                  type="hidden"
                  name="contractorId"
                  value={params.contractorId || ""}
                />
                <input
                  type="hidden"
                  name="assignmentId"
                  value={params.assignmentId || ""}
                />
                <input
                  type="hidden"
                  name="weekStarting"
                  value={params.weekStarting || ""}
                />
                <input type="hidden" name="notes" value={params.notes || ""} />
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
                >
                  Replace existing timesheet
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <form action={createTimesheet} className="space-y-6">
          {/* Contractor */}
          <div>
            <label
              htmlFor="contractorId"
              className="block text-sm font-medium text-gray-700"
            >
              Contractor <span className="text-red-500">*</span>
            </label>
            <select
              id="contractorId"
              name="contractorId"
              required
              defaultValue={params.contractorId || ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a contractor</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Assignment */}
          <div>
            <label
              htmlFor="assignmentId"
              className="block text-sm font-medium text-gray-700"
            >
              Assignment
            </label>
            <select
              id="assignmentId"
              name="assignmentId"
              defaultValue={params.assignmentId || ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">None</option>
              {allAssignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Week Starting */}
          <div>
            <label
              htmlFor="weekStarting"
              className="block text-sm font-medium text-gray-700"
            >
              Week Starting <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="weekStarting"
              name="weekStarting"
              required
              defaultValue={params.weekStarting || ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700"
            >
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={params.notes || ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Optional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Create Timesheet
            </button>
            <Link
              href="/timesheets"
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
