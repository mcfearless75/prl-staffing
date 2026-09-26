"use client";

import { useState, useTransition } from "react";
import { sendComplianceReminderAction, type ReminderResult } from "./compliance-reminder-actions";

export function ComplianceReminderButton({
  contractorId,
  blockReason,
  docTypes,
}: {
  contractorId: string;
  blockReason: string | null;
  docTypes: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ReminderResult>(null);

  const disabled = pending || !!blockReason || result?.type === "ok";
  const title = blockReason ?? `Emails them about: ${docTypes.join(", ")}`;

  function send() {
    if (!confirm(`Send a compliance reminder listing ${docTypes.length} document(s)?\n\n${docTypes.join("\n")}`)) return;
    startTransition(async () => {
      setResult(await sendComplianceReminderAction(contractorId));
    });
  }

  return (
    <span className="relative inline-flex flex-col items-end">
      <button
        type="button"
        onClick={send}
        disabled={disabled}
        title={title}
        className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 shadow-sm hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        {pending ? "Sending..." : result?.type === "ok" ? "Reminder sent" : "Send Compliance Reminder"}
      </button>
      {(result || blockReason) && (
        <span
          className={`absolute top-full mt-1 whitespace-nowrap text-[11px] ${
            result?.type === "error" ? "text-red-600" : result?.type === "ok" ? "text-emerald-700" : "text-gray-400"
          }`}
        >
          {result?.message ?? blockReason}
        </span>
      )}
    </span>
  );
}
