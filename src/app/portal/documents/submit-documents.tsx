"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

/**
 * "I've finished" button at the bottom of My Documents (Jenni, 08-10-26), so
 * workers know when they're done and the office is told once, not mid-upload.
 */
export function SubmitDocuments({
  pendingCount,
  lastSubmittedAt,
}: {
  pendingCount: number;
  lastSubmittedAt: string | null;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [justSent, setJustSent] = useState(false);

  async function submit() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/portal/documents/submit", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setJustSent(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (justSent || (pendingCount === 0 && lastSubmittedAt)) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
        <p className="font-semibold">✓ Documents submitted{!justSent && lastSubmittedAt ? ` on ${formatDate(lastSubmittedAt)}` : ""}</p>
        <p className="mt-1">
          Thanks — the office has been told and will check them. Need to add something else? Upload it above, then
          submit again.
        </p>
      </div>
    );
  }

  if (pendingCount === 0) return null;

  return (
    <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
      <p className="text-sm text-blue-900">
        You&apos;ve added <strong>{pendingCount} document{pendingCount === 1 ? "" : "s"}</strong>. When you&apos;ve
        added everything, press <strong>Submit</strong> so the office knows you&apos;ve finished.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={sending}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {sending ? "Sending…" : "I've finished — submit my documents"}
      </button>
    </div>
  );
}
