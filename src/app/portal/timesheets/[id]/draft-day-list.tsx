"use client";

import { useState } from "react";
import { AbsenceDayRow, type AssignmentOption } from "./absence-day-row";
import { formatAssignmentLabel, type LabelableAssignment } from "../assignment-label";

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
  entries,
  dayNames,
  dayBadges,
  rowBgClass,
  assignments,
  defaultAssignmentId,
}: {
  entries: EntryData[];
  dayNames: string[];
  dayBadges: Record<number, DayBadge>;
  rowBgClass: Record<number, string>;
  assignments: (LabelableAssignment & { id: string })[];
  defaultAssignmentId: string | null;
}) {
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
    <div>
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
    </div>
  );
}
