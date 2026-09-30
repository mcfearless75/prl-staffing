"use client";

import { useState, useTransition } from "react";
import { previewRtwReminderAction, sendRtwReminderAction, type RtwReminderResult } from "./rtw-reminder-actions";
import { EmailPreviewModal } from "@/components/email-preview-modal";
import type { EmailPreviewResult } from "@/lib/sent-email-record";

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<EmailPreviewResult | null>(null);
  // The button stays usable when blocked so staff can still see the email
  // and the reason; Send is disabled inside the preview instead.
  const disabled = pending || result?.type === "ok";

  function openPreview() {
    setPreview(null);
    setPreviewOpen(true);
    previewRtwReminderAction(contractorId)
      .then(setPreview)
      .catch(() => setPreview({ ok: false, error: "Could not build the preview. Please try again." }));
  }

  function send() {
    startTransition(async () => {
      setResult(await sendRtwReminderAction(contractorId));
      setPreviewOpen(false);
    });
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs text-red-800">
      <span className="font-semibold">Right to Work not covered:</span>
      <span>{reason}</span>
      <button
        type="button"
        onClick={openPreview}
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
      {previewOpen && (
        <EmailPreviewModal
          title="Preview: Right to Work reminder"
          loading={!preview}
          email={preview?.ok ? preview.email : null}
          error={preview && !preview.ok ? preview.error : null}
          blockReason={preview?.ok ? preview.blockReason : null}
          onClose={() => setPreviewOpen(false)}
          onSend={send}
          sending={pending}
        />
      )}
    </div>
  );
}
