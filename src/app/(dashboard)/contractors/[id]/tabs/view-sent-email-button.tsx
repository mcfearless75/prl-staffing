"use client";

import { useState } from "react";
import { EmailPreviewModal } from "@/components/email-preview-modal";
import type { SentEmailRecord } from "@/lib/sent-email-record";

/** "View email" on an Activity entry that stored a copy of what was sent. */
export function ViewSentEmailButton({
  title,
  record,
  sentAtLabel,
}: {
  title: string;
  record: SentEmailRecord;
  sentAtLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const meta = [{ label: "Sent", value: sentAtLabel }];
  if (record.by) meta.push({ label: "By", value: record.by });
  if (record.note) meta.push({ label: "Note", value: record.note });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        View email
      </button>
      {open && (
        <EmailPreviewModal
          title={title}
          email={{ to: record.to, subject: record.subject, html: record.html }}
          meta={meta}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
