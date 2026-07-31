export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { updateContractorTimesheetEntries, submitContractorTimesheet } from "../actions";
import { getBankHolidaysInWeek } from "@/lib/uk-bank-holidays";
import { DraftDayList, SubmitTimesheetForm } from "./draft-day-list";

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
      entries: {
        orderBy: { dayOfWeek: "asc" },
        include: { assignment: { include: { company: true, site: true, department: true } } },
      },
    },
  });

  if (!timesheet || timesheet.contractorId !== contractorId) notFound();

  // Session contractor's own Active/Placed assignments — the only options a
  // per-day picker may ever offer (also re-validated server-side on save).
  const assignments = await prisma.assignment.findMany({
    where: { contractorId, status: { in: [...LIVE_ASSIGNMENT_STATUSES] } },
    include: { company: true, site: true, department: true },
    orderBy: { startDate: "desc" },
  });

  const bankHolidays = getBankHolidaysInWeek(timesheet.weekStarting);
  const isDraft = timesheet.status === "Draft";
  const updateAction = updateContractorTimesheetEntries.bind(null, timesheet.id);
  const submitAction = submitContractorTimesheet.bind(null, timesheet.id);

  function dayAssignmentLabel(entry: {
    assignment: {
      site: { name: string } | null;
      department: { name: string } | null;
      company: { name: string };
    } | null;
  }): string | null {
    if (!entry.assignment) return null;
    const parts = [entry.assignment.site?.name, entry.assignment.department?.name].filter(Boolean);
    return parts.length > 0 ? parts.join(" / ") : entry.assignment.company.name;
  }

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
          <DraftDayList
            action={updateAction}
            entries={timesheet.entries.map((entry) => ({
              id: entry.id,
              dayOfWeek: entry.dayOfWeek,
              hours: entry.hours,
              status: entry.status,
              absenceReason: entry.absenceReason,
              assignmentId: entry.assignmentId,
            }))}
            dayNames={dayNames}
            dayBadges={Object.fromEntries(
              timesheet.entries.map((entry) => {
                const bankHol = bankHolidays.find((b) => b.dayOfWeek === entry.dayOfWeek);
                const isWeekend = entry.dayOfWeek >= 5;
                const badge = bankHol
                  ? { label: bankHol.name, className: "bg-purple-100 text-purple-700" }
                  : isWeekend
                  ? { label: "Weekend", className: "bg-orange-100 text-orange-700" }
                  : null;
                return [entry.dayOfWeek, badge];
              })
            )}
            rowBgClass={Object.fromEntries(
              timesheet.entries.map((entry) => {
                const bankHol = bankHolidays.find((b) => b.dayOfWeek === entry.dayOfWeek);
                const isWeekend = entry.dayOfWeek >= 5;
                return [entry.dayOfWeek, bankHol ? "bg-purple-50" : isWeekend ? "bg-orange-50/30" : ""];
              })
            )}
            assignments={assignments.map((a) => ({
              id: a.id,
              role: a.role,
              company: { name: a.company.name },
              site: a.site ? { name: a.site.name } : null,
              department: a.department ? { name: a.department.name } : null,
            }))}
            defaultAssignmentId={timesheet.assignmentId}
            totalHours={timesheet.totalHours}
            overtimeHours={timesheet.overtimeHours}
          />
        ) : (
          /* Read-only view */
          <>
            <div className="divide-y divide-gray-100">
              {timesheet.entries.map((entry) => {
                const bankHol = bankHolidays.find((b) => b.dayOfWeek === entry.dayOfWeek);
                const isAbsent = entry.status === "Absent";
                // A rejected day used to render identically to a normal one, so
                // a contractor emailed "Tuesday was queried" arrived here and
                // saw nothing. Follows the pattern portal/expenses already uses.
                const isRejected = entry.status === "Rejected";
                return (
                  <div
                    key={entry.id}
                    className={`px-4 py-3 ${isAbsent ? "bg-indigo-50/50" : ""} ${isRejected ? "bg-red-50/50" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 w-8">{dayNames[entry.dayOfWeek]}</span>
                        {bankHol && !isAbsent && !isRejected && (
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-medium text-purple-700">
                            {bankHol.name}
                          </span>
                        )}
                        {isAbsent && (
                          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-medium text-indigo-700">
                            Absent — {entry.absenceReason}
                          </span>
                        )}
                        {isRejected && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">
                            Queried
                          </span>
                        )}
                        {!isAbsent && !isRejected && dayAssignmentLabel(entry) && (
                          <span className="text-[10px] text-gray-400">{dayAssignmentLabel(entry)}</span>
                        )}
                      </div>
                      <div className="text-right">
                        {isAbsent ? (
                          <span className="text-sm font-bold text-indigo-600">A</span>
                        ) : (
                          <>
                            <span className={`text-sm font-bold ${isRejected ? "text-red-700" : "text-gray-900"}`}>
                              {entry.hours}h
                            </span>
                            {entry.overtime > 0 && (
                              <span className="ml-2 text-xs text-orange-600">+{entry.overtime}h OT</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {isRejected && entry.rejectionReason && (
                      <p className="mt-1 text-[11px] text-red-600 leading-snug">{entry.rejectionReason}</p>
                    )}
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
        {isDraft && timesheet.totalHours > 0 && <SubmitTimesheetForm action={submitAction} />}
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
      {/* Previously "Rejected" produced no message at all, so a returned week
          looked no different from one still awaiting approval. */}
      {timesheet.status === "Rejected" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold text-red-700">
            This timesheet was sent back and needs attention.
          </p>
          {timesheet.rejectionReason && (
            <p className="mt-1 text-xs text-red-600 leading-relaxed">{timesheet.rejectionReason}</p>
          )}
          <p className="mt-2 text-[11px] text-red-500">
            Contact your consultant or reply to the email we sent you if you think this is wrong.
          </p>
        </div>
      )}
    </div>
  );
}
