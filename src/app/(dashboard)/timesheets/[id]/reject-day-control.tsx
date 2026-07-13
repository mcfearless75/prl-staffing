"use client";

import { useState } from "react";
import { rejectTimesheetEntry } from "../actions";

export function RejectDayControl({
  entryId,
  dayLabel,
}: {
  entryId: string;
  dayLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await rejectTimesheetEntry(entryId, reason.trim());
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to reject day. Please try again.");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-[10px] font-medium text-red-600 hover:text-red-700"
      >
        Flag
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-1">
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={`Reason for ${dayLabel}`}
        className="w-full rounded border border-gray-300 px-1.5 py-1 text-[10px] text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
      />
      <div className="flex justify-center gap-1">
        <button
          type="button"
          onClick={submit}
          disabled={loading || !reason.trim()}
          className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
