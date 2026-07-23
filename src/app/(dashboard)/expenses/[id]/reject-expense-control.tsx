"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rejectExpense } from "../actions";

export function RejectExpenseControl({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!reason.trim()) return;
    setLoading(true);
    setError("");
    try {
      await rejectExpense(expenseId, reason.trim());
      router.refresh();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject expense. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 transition-colors"
      >
        Reject
      </button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-xl border border-red-200 bg-red-50 p-4">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <label className="block text-xs font-medium text-red-700">Rejection reason</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Explain why this expense is being rejected..."
        className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={loading || !reason.trim()}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Rejecting..." : "Confirm Reject"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={loading}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
