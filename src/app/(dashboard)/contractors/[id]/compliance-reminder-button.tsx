"use client";

import { useState, useTransition } from "react";
import {
  previewComplianceReminderAction,
  sendComplianceReminderAction,
  type ReminderResult,
} from "./compliance-reminder-actions";
import { EmailPreviewModal } from "@/components/email-preview-modal";
import type { EmailPreviewResult } from "@/lib/sent-email-record";

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<EmailPreviewResult | null>(null);

  // Still clickable when blocked, so staff can see the email and the reason;
  // Send is disabled inside the preview instead.
  const disabled = pending || result?.type === "ok";
  const title = blockReason ?? `Emails them about: ${docTypes.join(", ")}`;

  function openPreview() {
    setPreview(null);
    setPreviewOpen(true);
    previewComplianceReminderAction(contractorId)
      .then(setPreview)
      .catch(() => setPreview({ ok: false, error: "Could not build the preview. Please try again." }));
  }

  function send() {
    startTransition(async () => {
      setResult(await sendComplianceReminderAction(contractorId));
      setPreviewOpen(false);
    });
  }

  return (
    <span className="relative inline-flex flex-col items-end">
      <button
        type="button"
        onClick={openPreview}
        disabled={disabled}
        title={title}
        className={`rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 shadow-sm hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${
          blockReason && !result ? "opacity-60" : ""
        }`}
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
      {previewOpen && (
        <EmailPreviewModal
          title="Preview: Compliance reminder"
          loading={!preview}
          email={preview?.ok ? preview.email : null}
          error={preview && !preview.ok ? preview.error : null}
          blockReason={preview?.ok ? preview.blockReason : null}
          onClose={() => setPreviewOpen(false)}
          onSend={send}
          sending={pending}
        />
      )}
    </span>
  );
}
