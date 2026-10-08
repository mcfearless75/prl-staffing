"use client";

import { useState } from "react";

/**
 * Jenni, 08-10-26: this used to send the moment it was clicked and then show
 * "App invite sent." with only an OK button, so a mis-click couldn't be undone.
 * Now it asks first (OK / Cancel) and nothing is sent unless they press OK; the
 * result shows next to the button instead of in a pop-up.
 */
export function SendAppInviteButton({
  contractorId,
  name,
  email,
}: {
  contractorId: string;
  name: string;
  email: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; error: boolean } | null>(null);

  async function sendInvite() {
    if (!confirm(`Send the app invite to ${name}${email ? ` (${email})` : ""}?`)) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/send-app-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setResult({ text: data?.error || "Failed to send app invite. Please try again.", error: true });
        return;
      }
      setResult({ text: "✓ Invite sent", error: false });
    } catch {
      setResult({ text: "Network error. Please try again.", error: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={sendInvite}
        disabled={loading}
        className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100 disabled:opacity-50 transition-colors"
      >
        {loading ? "Sending..." : "Send App Invite"}
      </button>
      {result && (
        <span className={`text-xs font-medium ${result.error ? "text-red-600" : "text-emerald-600"}`}>{result.text}</span>
      )}
    </span>
  );
}
