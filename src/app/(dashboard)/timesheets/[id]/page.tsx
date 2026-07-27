export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { submitTimesheet, approveTimesheet, reopenTimesheet } from "../actions";
import { rejectTimesheet } from "../actions";
import { getTimesheetAuditTrail } from "@/lib/timesheet-audit";
import { getBankHolidaysInWeek } from "@/lib/uk-bank-holidays";
import { RejectDayControl } from "./reject-day-control";
import { MarkAbsentControl } from "./mark-absent-control";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

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
      entries: {
        orderBy: { dayOfWeek: "asc" },
        include: { assignment: { include: { company: true, site: true, department: true } } },
      },
      approvals: { orderBy: { stepOrder: "asc" } },
    },
  });

  if (!timesheet) {
    notFound();
  }

  const auditTrail = await getTimesheetAuditTrail(timesheet.id);
  const bankHolidays = getBankHolidaysInWeek(timesheet.weekStarting);

  // Reveals mid-week site/department switches — only shown when the day has
  // its own assignment recorded (falls back to nothing when it just used the
  // timesheet-level default).
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

  const weekEnding = new Date(timesheet.weekStarting);
  weekEnding.setDate(weekEnding.getDate() + 6);

  const submitAction = submitTimesheet.bind(null, timesheet.id);
  const approveAction = approveTimesheet.bind(null, timesheet.id);
  const rejectAction = rejectTimesheet.bind(null, timesheet.id);
  const reopenAction = reopenTimesheet.bind(null, timesheet.id);

  return (
    <div className="space-y-6">
      <Link
        href="/timesheets"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Timesheets
      </Link>
      <PageHeader
        title={`${timesheet.contractor.firstName} ${timesheet.contractor.lastName}`}
        description={`Week ending ${formatDate(weekEnding)}`}
        action={
          <div className="flex items-center gap-2">
            {timesheet.isException && (
              <Badge variant="Expiring" className="text-sm px-3 py-1">
                Exception
              </Badge>
            )}
            <Badge variant={timesheet.status} className="text-sm px-3 py-1">
              {timesheet.status}
            </Badge>
          </div>
        }
      />

      {/* Exception Banner */}
      {timesheet.isException && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Exception Flagged — Manual Review Required</h3>
              <p className="mt-1 text-sm text-amber-700">{timesheet.exceptionReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Timesheet Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Assignment</p>
            <p className="mt-1 text-sm text-gray-900">
              {timesheet.assignment
                ? `${timesheet.assignment.role} - ${timesheet.assignment.company.name}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Total Hours</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{timesheet.totalHours}h</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Overtime</p>
            <p className={`mt-1 text-2xl font-bold ${timesheet.overtimeHours > 0 ? "text-orange-600" : "text-gray-900"}`}>
              {timesheet.overtimeHours}h
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Regular Hours</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {Math.max(0, timesheet.totalHours - timesheet.overtimeHours)}h
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

      {/* Weekly Grid - Requidex Style */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Weekly Breakdown</h2>
        </div>

        {/* Visual day cards like Requidex */}
        <div className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {timesheet.entries.map((entry) => {
              const bankHol = bankHolidays.find((b) => b.dayOfWeek === entry.dayOfWeek);
              const isWeekend = entry.dayOfWeek >= 5;
              const hasOvertime = entry.overtime > 0;
              const isRejected = entry.status === "Rejected";
              const isAbsent = entry.status === "Absent";

              return (
                <div key={entry.id} className="text-center">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    {dayNames[entry.dayOfWeek]}
                  </p>
                  <div
                    className={`rounded-xl py-4 px-2 text-xl font-bold transition-colors ${
                      isAbsent
                        ? "bg-indigo-100 text-indigo-700 border-2 border-indigo-300"
                        : isRejected
                        ? "bg-red-100 text-red-700 border-2 border-red-300"
                        : bankHol
                        ? "bg-purple-100 text-purple-700 border-2 border-purple-300"
                        : isWeekend && entry.hours > 0
                        ? "bg-orange-100 text-orange-700 border-2 border-orange-300"
                        : entry.hours > 0
                        ? "bg-blue-100 text-blue-700 border-2 border-blue-200"
                        : "bg-gray-50 text-gray-400 border border-gray-200"
                    }`}
                  >
                    {isAbsent ? "A" : entry.hours}
                  </div>
                  {hasOvertime && !isAbsent && (
                    <p className="text-xs text-orange-600 font-medium mt-1">
                      +{entry.overtime}h OT
                    </p>
                  )}
                  {bankHol && !isAbsent && (
                    <p className="text-[10px] text-purple-600 font-medium mt-1 leading-tight">
                      {bankHol.name}
                    </p>
                  )}
                  {isAbsent && (
                    <p className="text-[10px] text-indigo-600 font-medium mt-1 leading-tight">
                      Absent — {entry.absenceReason}
                    </p>
                  )}
                  {isRejected && (
                    <p className="text-[10px] text-red-600 font-medium mt-1 leading-tight">
                      {entry.rejectionReason}
                    </p>
                  )}
                  {!isAbsent && dayAssignmentLabel(entry) && (
                    <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                      {dayAssignmentLabel(entry)}
                    </p>
                  )}
                  {timesheet.status === "Submitted" && !isRejected && !isAbsent && (
                    <RejectDayControl entryId={entry.id} dayLabel={dayNames[entry.dayOfWeek]} />
                  )}
                  {(timesheet.status === "Draft" || timesheet.status === "Submitted") && !isRejected && !isAbsent && (
                    <MarkAbsentControl entryId={entry.id} dayLabel={dayNames[entry.dayOfWeek]} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary bar like Requidex */}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 p-4 mt-4">
            <div>
              <p className="text-xs text-gray-500">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{timesheet.totalHours}h</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Overtime</p>
              <p className={`text-2xl font-bold ${timesheet.overtimeHours > 0 ? "text-orange-600" : "text-gray-400"}`}>
                {timesheet.overtimeHours}h
              </p>
            </div>
            {timesheet.status === "Submitted" && (
              <div className="flex gap-2">
                <form action={approveAction}>
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 transition-colors"
                  >
                    Approve
                  </button>
                </form>
                <form action={rejectAction}>
                  <button
                    type="submit"
                    className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    Reject
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approval Chain Progress */}
      {timesheet.approvals.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Approval Chain</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4">
              {timesheet.approvals.map((step, index) => (
                <div key={step.id} className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        step.status === "Approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : step.status === "Rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {step.status === "Approved" ? "✓" : step.status === "Rejected" ? "✗" : step.stepOrder}
                    </div>
                    <p className="mt-1 text-xs font-medium text-gray-600">{step.stepLabel}</p>
                    <Badge variant={step.status} className="mt-1 text-[10px]">
                      {step.status}
                    </Badge>
                    {step.approvedAt && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatTime(step.approvedAt)}
                      </p>
                    )}
                  </div>
                  {index < timesheet.approvals.length - 1 && (
                    <div
                      className={`h-0.5 w-12 ${
                        step.status === "Approved" ? "bg-emerald-300" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {timesheet.status === "Draft" && (
          <>
            <form action={submitAction}>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Submit for Approval
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

        {timesheet.status === "Rejected" && (
          <form action={reopenAction}>
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-600 transition-colors"
            >
              Reopen as Draft
            </button>
          </form>
        )}

        <Link
          href="/timesheets"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Back to Timesheets
        </Link>
      </div>

      {/* Audit Trail */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Audit Trail</h2>
          <p className="text-xs text-gray-500 mt-1">
            Complete history of every modification to this timesheet
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {auditTrail.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              No audit entries yet.
            </div>
          ) : (
            auditTrail.map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 px-6 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 mt-0.5">
                  {entry.action === "Created" && (
                    <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  )}
                  {entry.action === "Edited" && (
                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" /></svg>
                  )}
                  {(entry.action === "Approved" || entry.action === "AutoApproved" || entry.action === "StepApproved") && (
                    <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  )}
                  {entry.action === "Rejected" && (
                    <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  )}
                  {entry.action === "Submitted" && (
                    <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                  )}
                  {entry.action === "AutoCalculated" && (
                    <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm2.25-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H12.75v-.008Zm0 2.25h.008v.008H12.75v-.008ZM6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" /></svg>
                  )}
                  {(entry.action === "Reopened" || entry.action === "ExceptionFlagged") && (
                    <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                  )}
                  {entry.action === "DayMarkedAbsent" && (
                    <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{entry.action}</span>
                    {entry.field && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600">
                        {entry.field}
                      </span>
                    )}
                  </div>
                  {(entry.oldValue || entry.newValue) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {entry.oldValue && entry.newValue
                        ? `${entry.oldValue} → ${entry.newValue}`
                        : entry.newValue || entry.oldValue}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">{formatTime(entry.createdAt)}</p>
                  <p className="text-xs text-gray-400">{entry.userName || "System"}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
