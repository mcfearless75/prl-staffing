"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Assignment = {
  id: string;
  role: string;
  company: { name: string };
  location: string | null;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PortalTimesheetForm({
  assignments,
  contractorId,
}: {
  assignments: Assignment[];
  contractorId: string;
}) {
  const router = useRouter();
  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id || "");
  const [weekStarting, setWeekStarting] = useState(() => {
    // Default to this Monday
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split("T")[0];
  });
  const [hours, setHours] = useState<number[]>([8, 8, 8, 8, 8, 0, 0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalHours = hours.reduce((sum, h) => sum + h, 0);
  const overtimeHours = Math.max(0, totalHours - 40);
  const selectedAssignment = assignments.find((a) => a.id === assignmentId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignmentId || !weekStarting) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/portal/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId,
          assignmentId,
          weekStarting,
          hours,
          notes,
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

      {/* Assignment Selection */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="block text-xs font-medium text-gray-500 mb-2">Assignment</label>
        <select
          value={assignmentId}
          onChange={(e) => setAssignmentId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.role} — {a.company.name} {a.location ? `(${a.location})` : ""}
            </option>
          ))}
        </select>
      </div>

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

      {/* Daily Hours Entry */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="block text-xs font-medium text-gray-500 mb-3">Daily Hours</label>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day, i) => (
            <div key={day} className="text-center">
              <p className={`text-[10px] font-medium mb-1.5 ${i >= 5 ? "text-orange-600" : "text-gray-500"}`}>
                {day}
              </p>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={hours[i]}
                onChange={(e) => {
                  const newHours = [...hours];
                  newHours[i] = parseFloat(e.target.value) || 0;
                  setHours(newHours);
                }}
                className={`w-full rounded-lg border px-1 py-2.5 text-center text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  hours[i] > 0
                    ? i >= 5
                      ? "border-orange-300 bg-orange-50 text-orange-700"
                      : "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-400"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <div>
            <p className="text-xs text-gray-500">Total Hours</p>
            <p className="text-xl font-bold text-gray-900">{totalHours}h</p>
          </div>
          {overtimeHours > 0 && (
            <div className="text-right">
              <p className="text-xs text-orange-600">Overtime</p>
              <p className="text-xl font-bold text-orange-600">{overtimeHours}h</p>
            </div>
          )}
        </div>
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
        {submitting ? "Submitting..." : `Submit Timesheet (${totalHours}h)`}
      </button>
    </form>
  );
}
