export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/utils";
import { updateTimesheetEntries } from "../../actions";
import { getBankHolidaysInWeek } from "@/lib/uk-bank-holidays";

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const dayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

  const bankHolidays = getBankHolidaysInWeek(timesheet.weekStarting);
  const updateAction = updateTimesheetEntries.bind(null, timesheet.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Timesheet — ${timesheet.contractor.firstName} ${timesheet.contractor.lastName}`}
        description={`Week starting ${formatDate(timesheet.weekStarting)}`}
      />

      {/* Info Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold">Auto-Overtime Calculation</p>
            <p className="mt-1">
              Enter total hours per day. Overtime is calculated automatically:
              daily hours over 8h, all weekend hours, and bank holiday hours are flagged as overtime.
            </p>
          </div>
        </div>
      </div>

      {/* Bank Holiday Notice */}
      {bankHolidays.length > 0 && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v9.75" />
            </svg>
            <div className="text-sm text-purple-800">
              <p className="font-semibold">Bank Holidays This Week</p>
              {bankHolidays.map((bh) => (
                <p key={bh.dayOfWeek} className="mt-1">
                  <span className="font-medium">{dayShort[bh.dayOfWeek]}</span>: {bh.name} — all hours will be calculated as overtime (premium rate)
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

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
                    Hours Worked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {timesheet.entries.map((entry) => {
                  const bankHol = bankHolidays.find((b) => b.dayOfWeek === entry.dayOfWeek);
                  const isWeekend = entry.dayOfWeek >= 5;

                  return (
                    <tr
                      key={entry.id}
                      className={
                        bankHol
                          ? "bg-purple-50/50"
                          : isWeekend
                          ? "bg-orange-50/30"
                          : "bg-white"
                      }
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {dayNames[entry.dayOfWeek]}
                          </span>
                          {bankHol && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                              {bankHol.name}
                            </span>
                          )}
                          {isWeekend && !bankHol && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                              Weekend
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          name={`hours_${entry.dayOfWeek}`}
                          defaultValue={entry.hours}
                          step={0.5}
                          min={0}
                          max={24}
                          className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-medium ${
                          bankHol
                            ? "text-purple-600"
                            : isWeekend
                            ? "text-orange-600"
                            : "text-gray-500"
                        }`}>
                          {bankHol
                            ? "All hours → Overtime (bank hol premium)"
                            : isWeekend
                            ? "All hours → Overtime (weekend)"
                            : "Regular (overtime auto-calculated over 8h)"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Save & Calculate Overtime
            </button>
            <Link
              href={`/timesheets/${timesheet.id}`}
              className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
