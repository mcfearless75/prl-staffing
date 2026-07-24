"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveHolidayRequest, rejectHolidayRequest, markHolidayRequestPaid } from "./actions";

export function RequestReviewControl({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runApprove() {
    setLoading(true);
    setError("");
    try {
      await approveHolidayRequest(requestId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request.");
    } finally {
      setLoading(false);
    }
  }

  async function runReject() {
    if (!reason.trim()) return;
    setLoading(true);
    setError("");
    try {
      await rejectHolidayRequest(requestId, reason.trim());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request.");
    } finally {
      setLoading(false);
    }
  }

  async function runMarkPaid() {
    setLoading(true);
    setError("");
    try {
      await markHolidayRequestPaid(requestId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark paid.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "Approved") {
    return (
      <div className="flex flex-col items-end gap-1">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="button"
          onClick={runMarkPaid}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Marking..." : "Mark paid"}
        </button>
      </div>
    );
  }

  if (status !== "Pending") return null;

  if (rejecting) {
    return (
      <div className="w-full max-w-xs space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Reason for rejection..."
          className="w-full rounded-lg border border-red-300 bg-white px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={runReject}
            disabled={loading || !reason.trim()}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Rejecting..." : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setRejecting(false)}
            disabled={loading}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={runApprove}
          disabled={loading}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? "Approving..." : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => setRejecting(true)}
          disabled={loading}
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
