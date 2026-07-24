export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { updateContractorTimesheetEntries, submitContractorTimesheet } from "../actions";
import { getBankHolidaysInWeek } from "@/lib/uk-bank-holidays";
import { AbsenceDayRow } from "./absence-day-row";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function PortalTimesheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: {
      contractor: true,
      assignment: { include: { company: true } },
      entries: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!timesheet || timesheet.contractorId !== contractorId) notFound();

  const bankHolidays = getBankHolidaysInWeek(timesheet.weekStarting);
  const isDraft = timesheet.status === "Draft";
  const updateAction = updateContractorTimesheetEntries.bind(null, timesheet.id);
  const submitAction = submitContractorTimesheet.bind(null, timesheet.id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            Week of {formatDate(timesheet.weekStarting)}
          </h1>
          {timesheet.assignment && (
            <p className="text-xs text-gray-500">
              {timesheet.assignment.role} - {timesheet.assignment.company.name}
            </p>
          )}
        </div>
        <Badge variant={timesheet.status} className="text-xs">{timesheet.status}</Badge>
      </div>

      {/* Exception Banner */}
      {timesheet.isException && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs font-medium text-amber-800">Exception flagged: {timesheet.exceptionReason}</p>
        </div>
      )}

      {/* Hours Entry / Display */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {isDraft ? (
          /* Editable form */
          <form action={updateAction}>
            <div className="divide-y divide-gray-100">
              {timesheet.entries.map((entry) => {
                const bankHol = bankHolidays.find((b) => b.dayOfWeek === entry.dayOfWeek);
                const isWeekend = entry.dayOfWeek >= 5;
                const badge = bankHol
                  ? { label: bankHol.name, className: "bg-purple-100 text-purple-700" }
                  : isWeekend
                  ? { label: "Weekend", className: "bg-orange-100 text-orange-700" }
                  : null;

                return (
                  <div
                    key={entry.id}
                    className={bankHol ? "bg-purple-50" : isWeekend ? "bg-orange-50/30" : ""}
                  >
                    <AbsenceDayRow
                      dayOfWeek={entry.dayOfWeek}
                      dayLabel={dayNames[entry.dayOfWeek]}
                      defaultHours={entry.hours}
                      defaultAbsent={entry.status === "Absent"}
                      defaultReason={entry.absenceReason}
                      badge={badge}
                    />
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-gray-900">{timesheet.totalHours}h total</p>
                {timesheet.overtimeHours > 0 && (
                  <p className="text-xs text-orange-600">{timesheet.overtimeHours}h overtime</p>
                )}
              </div>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
              >
                Save Hours
              </button>
            </div>
          </form>
        ) : (
          /* Read-only view */
          <>
            <div className="divide-y divide-gray-100">
              {timesheet.entries.map((entry) => {
                const bankHol = bankHolidays.find((b) => b.dayOfWeek === entry.dayOfWeek);
                const isAbsent = entry.status === "Absent";
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between px-4 py-3 ${isAbsent ? "bg-indigo-50/50" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 w-8">{dayNames[entry.dayOfWeek]}</span>
                      {bankHol && !isAbsent && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-medium text-purple-700">
                          {bankHol.name}
                        </span>
                      )}
                      {isAbsent && (
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-medium text-indigo-700">
                          Absent — {entry.absenceReason}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {isAbsent ? (
                        <span className="text-sm font-bold text-indigo-600">A</span>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-gray-900">{entry.hours}h</span>
                          {entry.overtime > 0 && (
                            <span className="ml-2 text-xs text-orange-600">+{entry.overtime}h OT</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-gray-900">{timesheet.totalHours}h total</p>
                {timesheet.overtimeHours > 0 && (
                  <p className="text-xs text-orange-600">{timesheet.overtimeHours}h overtime</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {isDraft && timesheet.totalHours > 0 && (
          <form action={submitAction} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-medium text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
            >
              Submit for Approval
            </button>
          </form>
        )}
        <Link
          href="/portal/timesheets"
          className="rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors text-center flex-1"
        >
          Back
        </Link>
      </div>

      {/* Info text */}
      {isDraft && (
        <p className="text-[10px] text-gray-400 text-center">
          Overtime is auto-calculated: weekday hours over 8h, all weekend hours, and bank holiday hours are flagged as overtime.
        </p>
      )}
      {timesheet.status === "Submitted" && (
        <p className="text-xs text-blue-600 text-center font-medium">
          Your timesheet has been submitted and is awaiting approval.
        </p>
      )}
      {timesheet.status === "Approved" && (
        <p className="text-xs text-emerald-600 text-center font-medium">
          This timesheet has been approved.
        </p>
      )}
    </div>
  );
}
