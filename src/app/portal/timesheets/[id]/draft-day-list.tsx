"use client";

import { useActionState, useState } from "react";
import { AbsenceDayRow, type AssignmentOption } from "./absence-day-row";
import { formatAssignmentLabel, type LabelableAssignment } from "../assignment-label";
import type { TimesheetActionState } from "../actions";

type TimesheetAction = (
  prevState: TimesheetActionState,
  formData: FormData
) => Promise<TimesheetActionState>;

type EntryData = {
  id: string;
  dayOfWeek: number;
  hours: number;
  status: string;
  absenceReason: string | null;
  assignmentId: string | null;
};

type DayBadge = { label: string; className: string } | null;

export function DraftDayList({
  action,
  entries,
  dayNames,
  dayBadges,
  rowBgClass,
  assignments,
  defaultAssignmentId,
  totalHours,
  overtimeHours,
}: {
  action: TimesheetAction;
  entries: EntryData[];
  dayNames: string[];
  dayBadges: Record<number, DayBadge>;
  rowBgClass: Record<number, string>;
  assignments: (LabelableAssignment & { id: string })[];
  defaultAssignmentId: string | null;
  totalHours: number;
  overtimeHours: number;
}) {
  const [state, formAction, saving] = useActionState<TimesheetActionState, FormData>(action, null);

  // Each day defaults to its own recorded assignment, falling back to the
  // timesheet-level assignmentId — the same fallback invoicing uses.
  const [assignmentByDay, setAssignmentByDay] = useState<Record<number, string>>(() =>
    Object.fromEntries(entries.map((e) => [e.dayOfWeek, e.assignmentId ?? defaultAssignmentId ?? ""]))
  );

  const assignmentOptions: AssignmentOption[] = assignments.map((a) => ({
    id: a.id,
    label: formatAssignmentLabel(a),
  }));

  function applyToAll(value: string) {
    setAssignmentByDay((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) next[Number(key)] = value;
      return next;
    });
  }

  return (
    <form action={formAction}>
      {assignments.length > 1 && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
            Set all days to
          </label>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) applyToAll(e.target.value);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Choose an assignment...</option>
            {assignmentOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-gray-400">
            Worked different sites this week? Change the site on any day below.
          </p>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {entries.map((entry) => (
          <div key={entry.id} className={rowBgClass[entry.dayOfWeek] || ""}>
            <AbsenceDayRow
              dayOfWeek={entry.dayOfWeek}
              dayLabel={dayNames[entry.dayOfWeek]}
              defaultHours={entry.hours}
              defaultAbsent={entry.status === "Absent"}
              defaultReason={entry.absenceReason}
              badge={dayBadges[entry.dayOfWeek]}
              assignmentOptions={assignmentOptions}
              assignmentValue={assignmentByDay[entry.dayOfWeek] ?? ""}
              onAssignmentChange={(value) =>
                setAssignmentByDay((prev) => ({ ...prev, [entry.dayOfWeek]: value }))
              }
            />
          </div>
        ))}
      </div>

      {state && (state.error || state.ok) && (
        <div
          className={`border-t px-4 py-2.5 text-xs font-medium ${
            state.error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {state.error || state.ok}
        </div>
      )}

      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex justify-between items-center">
        <div>
          <p className="text-sm font-bold text-gray-900">{totalHours}h total</p>
          {overtimeHours > 0 && (
            <p className="text-xs text-orange-600">{overtimeHours}h overtime</p>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Hours"}
        </button>
      </div>
    </form>
  );
}

export function SubmitTimesheetForm({ action }: { action: TimesheetAction }) {
  const [state, formAction, submitting] = useActionState<TimesheetActionState, FormData>(
    action,
    null
  );

  return (
    <form action={formAction} className="flex-1">
      {state?.error && (
        <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-medium text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-colors"
      >
        {submitting ? "Submitting..." : "Submit for Approval"}
      </button>
    </form>
  );
}
