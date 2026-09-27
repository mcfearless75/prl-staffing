"use client";

import { useState, useTransition } from "react";
import { sendRtwReminderAction, type RtwReminderResult } from "./rtw-reminder-actions";

/** Red banner on the profile header when Right to Work isn't covered. */
export function RtwFlag({
  contractorId,
  reason,
  blockReason,
  lastSentLabel,
}: {
  contractorId: string;
  reason: string;
  blockReason: string | null;
  lastSentLabel: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RtwReminderResult>(null);
  const disabled = pending || !!blockReason || result?.type === "ok";

  function send() {
    if (!confirm(`Email them asking to complete their Right to Work?\n\nMissing: ${reason}`)) return;
    startTransition(async () => setResult(await sendRtwReminderAction(contractorId)));
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs text-red-800">
      <span className="font-semibold">Right to Work not covered:</span>
      <span>{reason}</span>
      <button
        type="button"
        onClick={send}
        disabled={disabled}
        title={blockReason ?? undefined}
        className="rounded-md border border-red-300 bg-white px-2 py-0.5 font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Sending..." : result?.type === "ok" ? "Reminder sent" : "Send RTW reminder"}
      </button>
      {(result || blockReason || lastSentLabel) && (
        <span className={result?.type === "error" ? "text-red-700" : result?.type === "ok" ? "text-emerald-700" : "text-red-700/70"}>
          {result?.message ?? blockReason ?? lastSentLabel}
        </span>
      )}
    </div>
  );
}
