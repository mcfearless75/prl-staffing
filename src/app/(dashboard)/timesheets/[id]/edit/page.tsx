export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/utils";
import { updateTimesheetEntries } from "../../actions";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function EditTimesheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: {
      contractor: true,
      entries: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!timesheet) {
    notFound();
  }

  if (timesheet.status !== "Draft") {
    redirect(`/timesheets/${timesheet.id}`);
  }

  const updateAction = updateTimesheetEntries.bind(null, timesheet.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Timesheet - ${timesheet.contractor.firstName} ${timesheet.contractor.lastName}`}
        description={`Week starting ${formatDate(timesheet.weekStarting)}`}
      />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <form action={updateAction} className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-gray-200">
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
                      entry.dayOfWeek >= 5 ? "bg-blue-50/50" : "bg-blue-50/30"
                    }
                  >
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {dayNames[entry.dayOfWeek]}
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="number"
                        name={`hours_${entry.dayOfWeek}`}
                        defaultValue={entry.hours}
                        step={0.5}
                        min={0}
                        max={24}
                        className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="number"
                        name={`overtime_${entry.dayOfWeek}`}
                        defaultValue={entry.overtime}
                        step={0.5}
                        min={0}
                        max={24}
                        className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Save Entries
            </button>
            <Link
              href={`/timesheets/${timesheet.id}`}
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
