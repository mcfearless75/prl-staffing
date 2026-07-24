"use client";

import { useState } from "react";
import { markTimesheetEntryAbsent } from "../actions";

// Mirrors the portal-side absence reasons so staff and contractor audit
// trails read consistently.
const ABSENCE_REASONS = ["Sick", "Unauthorised", "Authorised", "Site closed"] as const;

export function MarkAbsentControl({
  entryId,
  dayLabel,
}: {
  entryId: string;
  dayLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(ABSENCE_REASONS[0]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await markTimesheetEntryAbsent(entryId, reason, note.trim() || undefined);
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to mark day absent. Please try again.");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-700"
      >
        Mark absent
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-1">
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded border border-gray-300 px-1.5 py-1 text-[10px] text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {ABSENCE_REASONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={`Note for ${dayLabel} (optional)`}
        className="w-full rounded border border-gray-300 px-1.5 py-1 text-[10px] text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <div className="flex justify-center gap-1">
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "..." : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={loading}
          className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
