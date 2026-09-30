"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ComposedEmail } from "@/lib/sent-email-record";

/**
 * Shows an email exactly as it will be (or was) sent: To, Subject and the
 * rendered body. Used for the "preview before sending" step on the reminder
 * buttons and, read-only, for "View email" on the Activity tab.
 *
 * The body is rendered in a fully sandboxed iframe (no scripts, no forms, no
 * same-origin), so stored HTML can never act on the PRISM page.
 */
export function EmailPreviewModal({
  title,
  email,
  loading = false,
  error = null,
  blockReason = null,
  meta = [],
  onClose,
  onSend,
  sending = false,
}: {
  title: string;
  email: ComposedEmail | null;
  loading?: boolean;
  error?: string | null;
  /** Why the email can't be sent; shown as a warning and disables Send. */
  blockReason?: string | null;
  /** Extra rows under To/Subject, e.g. sent time and sender. */
  meta?: Array<{ label: string; value: string }>;
  onClose: () => void;
  /** Present = preview mode with Send/Cancel. Absent = read-only view. */
  onSend?: () => void;
  sending?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !sending) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, sending]);

  // Only ever opened by a click, but never portal during a server render.
  if (typeof document === "undefined") return null;

  const rows = email
    ? [{ label: "To", value: email.to }, { label: "Subject", value: email.subject }, ...meta]
    : meta;
  const canSend = !!onSend && !!email && !blockReason && !loading && !error && !sending;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !sending && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-gray-500">Building preview...</p>}
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {blockReason && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Can&apos;t send right now: {blockReason}
            </p>
          )}
          {rows.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {rows.map((r) => (
                <div key={r.label} className="contents">
                  <dt className="font-medium text-gray-500">{r.label}</dt>
                  <dd className="break-words text-gray-900">{r.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {email && (
            <iframe
              title="Email body"
              sandbox=""
              srcDoc={email.html}
              className="h-[400px] w-full rounded-lg border border-gray-200 bg-white"
            />
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {onSend ? "Cancel" : "Close"}
          </button>
          {onSend && (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
