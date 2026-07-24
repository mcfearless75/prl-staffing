"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { calculateProfessionalHours } from "@/lib/professional-hours";
import { formatAssignmentLabel } from "../assignment-label";

type Assignment = {
  id: string;
  role: string;
  company: { name: string };
  location: string | null;
  site?: { name: string } | null;
  department?: { name: string } | null;
};

type DayEntry = {
  assignmentId: string;
  startTime: string;
  finishTime: string;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function emptyDay(assignmentId: string): DayEntry {
  return { assignmentId, startTime: "", finishTime: "" };
}

export function PortalTimesheetForm({
  assignments,
  contractorId,
}: {
  assignments: Assignment[];
  contractorId: string;
}) {
  const router = useRouter();
  const defaultAssignmentId = assignments[0]?.id || "";
  const [weekStarting, setWeekStarting] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split("T")[0];
  });
  const [days, setDays] = useState<DayEntry[]>(() =>
    Array.from({ length: 7 }, () => emptyDay(defaultAssignmentId))
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const dayHours = days.map((d) => calculateProfessionalHours(d.startTime, d.finishTime) ?? 0);
  const totalHours = dayHours.reduce((sum, h) => sum + h, 0);

  function updateDay(index: number, patch: Partial<DayEntry>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  // Apply one assignment to every day at once — the common case is a single
  // placement all week; per-day override handles mid-week role/company changes.
  function applyAssignmentToAll(assignmentId: string) {
    setDays((prev) => prev.map((d) => ({ ...d, assignmentId })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weekStarting) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/portal/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId,
          weekStarting,
          notes,
          days: days.map((d, i) => ({
            dayOfWeek: i,
            assignmentId: d.assignmentId || null,
            startTime: d.startTime || null,
            finishTime: d.finishTime || null,
            hours: dayHours[i],
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit timesheet");
        setSubmitting(false);
        return;
      }

      router.push("/portal/timesheets");
      router.refresh();
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Week Starting */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="block text-xs font-medium text-gray-500 mb-2">Week Starting (Monday)</label>
        <input
          type="date"
          value={weekStarting}
          onChange={(e) => setWeekStarting(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Default assignment — fills every day in one tap */}
      {assignments.length > 1 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Set all days to
          </label>
          <select
            defaultValue={defaultAssignmentId}
            onChange={(e) => applyAssignmentToAll(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {formatAssignmentLabel(a)}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-gray-400">
            Worked different sites this week? Change the site on any day below.
          </p>
        </div>
      )}

      {/* Per-day entry */}
      <div className="space-y-2">
        {DAYS.map((day, i) => {
          const isWeekend = i >= 5;
          const hrs = dayHours[i];
          return (
            <div
              key={day}
              className={`rounded-xl border p-4 ${
                hrs > 0
                  ? isWeekend
                    ? "border-orange-200 bg-orange-50/40"
                    : "border-blue-200 bg-blue-50/40"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className={`text-sm font-semibold ${isWeekend ? "text-orange-700" : "text-gray-900"}`}>
                  {day}
                </span>
                <span className={`text-sm font-bold ${hrs > 0 ? "text-gray-900" : "text-gray-300"}`}>
                  {hrs > 0 ? `${hrs.toFixed(2)}h` : "—"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1">Start</label>
                  <input
                    type="time"
                    value={days[i].startTime}
                    onChange={(e) => updateDay(i, { startTime: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1">Finish</label>
                  <input
                    type="time"
                    value={days[i].finishTime}
                    onChange={(e) => updateDay(i, { finishTime: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {assignments.length > 0 && (
                <select
                  value={days[i].assignmentId}
                  onChange={(e) => updateDay(i, { assignmentId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-2 py-2 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">No site</option>
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {formatAssignmentLabel(a)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between rounded-xl bg-gray-900 px-4 py-3.5 text-white">
        <span className="text-sm font-medium text-gray-300">Total this week</span>
        <span className="text-2xl font-bold">{totalHours.toFixed(2)}h</span>
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="block text-xs font-medium text-gray-500 mb-2">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any notes about this week..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || totalHours === 0}
        className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 active:bg-blue-800 transition-colors"
      >
        {submitting ? "Submitting..." : `Submit Timesheet (${totalHours.toFixed(2)}h)`}
      </button>
    </form>
  );
}
