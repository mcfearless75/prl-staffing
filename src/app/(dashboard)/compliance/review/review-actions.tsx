"use client";

import { useState } from "react";

export function ReviewActions({ recordId }: { recordId: string }) {
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: "Verified" | "Non-Compliant") {
    setLoading(true);
    try {
      const res = await fetch(`/api/compliance/${recordId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        alert("Action failed. Please try again.");
        return;
      }
      window.location.reload();
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => updateStatus("Verified")}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : null}
        Verify
      </button>
      <button
        onClick={() => updateStatus("Non-Compliant")}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-600 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        ) : null}
        Reject
      </button>
    </div>
  );
}
