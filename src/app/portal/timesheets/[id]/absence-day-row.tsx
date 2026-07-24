"use client";

import { useState } from "react";

const ABSENCE_REASONS = ["Sick", "Unauthorised", "Authorised", "Site closed"] as const;

export type AssignmentOption = { id: string; label: string };

export function AbsenceDayRow({
  dayOfWeek,
  dayLabel,
  defaultHours,
  defaultAbsent,
  defaultReason,
  badge,
  assignmentOptions,
  assignmentValue,
  onAssignmentChange,
}: {
  dayOfWeek: number;
  dayLabel: string;
  defaultHours: number;
  defaultAbsent: boolean;
  defaultReason: string | null;
  badge?: { label: string; className: string } | null;
  /** Session contractor's own Active/Placed assignments — omit to hide the picker entirely. */
  assignmentOptions?: AssignmentOption[];
  /** Controlled by the parent so "apply to all" can push a value into every day at once. */
  assignmentValue?: string;
  onAssignmentChange?: (value: string) => void;
}) {
  const [absent, setAbsent] = useState(defaultAbsent);
  // A stored absenceReason like "Sick: felt unwell" splits back into select + note.
  const [reasonValue, noteValue] = splitReason(defaultReason);

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 w-8">{dayLabel}</span>
          {badge && (
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-700">
            <input
              type="checkbox"
              name={`absent_${dayOfWeek}`}
              defaultChecked={defaultAbsent}
              onChange={(e) => setAbsent(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Absent
          </label>
          <input
            type="number"
            name={`hours_${dayOfWeek}`}
            defaultValue={defaultHours}
            step={0.5}
            min={0}
            max={24}
            disabled={absent}
            className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
          />
        </div>
      </div>

      {absent && (
        <div className="flex items-center gap-2 pl-10">
          <select
            name={`reason_${dayOfWeek}`}
            defaultValue={reasonValue}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {ABSENCE_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <input
            type="text"
            name={`note_${dayOfWeek}`}
            defaultValue={noteValue}
            placeholder="Note (optional)"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      )}

      {assignmentOptions && assignmentOptions.length > 0 && (
        <select
          name={`assignment_${dayOfWeek}`}
          value={assignmentValue ?? ""}
          onChange={(e) => onAssignmentChange?.(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">No site</option>
          {assignmentOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function splitReason(absenceReason: string | null): [string, string] {
  if (!absenceReason) return [ABSENCE_REASONS[0], ""];
  const [reason, ...rest] = absenceReason.split(": ");
  const isKnownReason = (ABSENCE_REASONS as readonly string[]).includes(reason);
  if (!isKnownReason) return [ABSENCE_REASONS[0], absenceReason];
  return [reason, rest.join(": ")];
}
