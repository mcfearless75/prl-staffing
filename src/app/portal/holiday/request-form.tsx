"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHolidayRequest } from "./actions";

export function HolidayRequestForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      try {
        await createHolidayRequest(formData);
        router.refresh();
        (document.getElementById("holiday-request-form") as HTMLFormElement | null)?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit request.");
      }
    });
  }

  return (
    <form id="holiday-request-form" action={handleSubmit} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">Request holiday pay</h2>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Hours</label>
        <input
          type="number"
          name="hours"
          step="0.01"
          min="0.01"
          required
          placeholder="e.g. 8"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Note (optional)</label>
        <input
          type="text"
          name="note"
          placeholder="e.g. Week commencing 4 Aug"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 active:bg-blue-800 transition-colors"
      >
        {isPending ? "Submitting..." : "Submit request"}
      </button>
    </form>
  );
}
