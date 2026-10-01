"use client";

import { useState, useTransition } from "react";
import { previewFinishNoticeAction, sendFinishNoticeAction, type FinishNoticeResult } from "./finish-notice-actions";
import { EmailPreviewModal } from "@/components/email-preview-modal";
import type { EmailPreviewResult } from "@/lib/sent-email-record";

export function FinishNoticeButton({
  contractorId,
  blockReason,
  summary,
}: {
  contractorId: string;
  blockReason: string | null;
  summary: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FinishNoticeResult>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<EmailPreviewResult | null>(null);

  // Still clickable when blocked, so staff can see the email and the reason;
  // Send is disabled inside the preview instead.
  const disabled = pending || result?.type === "ok";

  function openPreview() {
    setPreview(null);
    setPreviewOpen(true);
    previewFinishNoticeAction(contractorId)
      .then(setPreview)
      .catch(() => setPreview({ ok: false, error: "Could not build the preview. Please try again." }));
  }

  function send() {
    startTransition(async () => {
      setResult(await sendFinishNoticeAction(contractorId));
      setPreviewOpen(false);
    });
  }

  return (
    <span className="relative inline-flex flex-col items-end">
      <button
        type="button"
        onClick={openPreview}
        disabled={disabled}
        title={blockReason ?? `Emails them: ${summary}`}
        className={`rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800 shadow-sm hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${
          blockReason && !result ? "opacity-60" : ""
        }`}
      >
        {pending ? "Sending..." : result?.type === "ok" ? "Finish date sent" : "Email Finish Date"}
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
          title="Preview: Finish date"
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
