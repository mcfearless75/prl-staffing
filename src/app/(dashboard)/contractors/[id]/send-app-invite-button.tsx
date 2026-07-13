"use client";

import { useState } from "react";

export function SendAppInviteButton({ contractorId }: { contractorId: string }) {
  const [loading, setLoading] = useState(false);

  async function sendInvite() {
    setLoading(true);
    try {
      const res = await fetch("/api/send-app-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to send app invite. Please try again.");
        return;
      }
      alert("App invite sent.");
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={sendInvite}
      disabled={loading}
      className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100 disabled:opacity-50 transition-colors"
    >
      {loading ? "Sending..." : "Send App Invite"}
    </button>
  );
}
