"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHolidayAdjustment } from "./actions";

interface ContractorOption {
  id: string;
  name: string;
  ref: string | null;
}

export function AdjustmentForm({ contractors }: { contractors: ContractorOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      try {
        await createHolidayAdjustment(formData);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save adjustment.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 transition-colors"
      >
        Manual adjustment
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Manual holiday adjustment</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Contractor (PAYE)</label>
          <select
            name="contractorId"
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select contractor...</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.ref ? ` (${c.ref})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Hours (+/-)</label>
          <input
            type="number"
            name="hours"
            step="0.01"
            required
            placeholder="e.g. 8 or -8"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Note</label>
        <input
          type="text"
          name="note"
          required
          placeholder="Reason for adjustment..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save adjustment"}
      </button>
    </form>
  );
}
