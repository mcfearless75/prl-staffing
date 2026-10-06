"use client";

import { useState } from "react";
import { Download, FileText, Mail } from "lucide-react";

const buttonClass =
  "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50";

/** Download CSV / Download PDF / Email PDF for the results on screen. */
export function NewStarterExportActions({
  query,
  defaultRecipients,
  senderEmail,
}: {
  query: string;
  defaultRecipients: string;
  senderEmail: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultRecipients);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/new-starters/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, to, message }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; to?: string[] };
      if (!res.ok) {
        setError(json.error || "The email could not be sent.");
        return;
      }
      setSent(`Sent to ${(json.to ?? []).join(", ")}${senderEmail ? `, copied to ${senderEmail}` : ""}.`);
      setOpen(false);
    } catch {
      setError("The email could not be sent. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <a href={`/api/reports/new-starters?format=csv&${query}`} className={buttonClass}>
          <Download className="h-4 w-4" />
          Download CSV
        </a>
        <a href={`/api/reports/new-starters?format=pdf&${query}`} className={buttonClass}>
          <FileText className="h-4 w-4" />
          Download PDF
        </a>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setSent(null);
            setOpen(true);
          }}
          className={buttonClass}
        >
          <Mail className="h-4 w-4" />
          Email PDF
        </button>
      </div>
      {sent && <p className="text-sm text-emerald-700">{sent}</p>}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-report-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p id="email-report-title" className="text-base font-semibold text-gray-900">
              Email New Starter Report
            </p>
            <p className="mt-1 text-xs text-gray-500">
              The PDF is attached. It contains NI numbers, so check the address before sending.
            </p>

            <label htmlFor="report-to" className="mt-4 block text-sm font-medium text-gray-700">
              To
            </label>
            <input
              id="report-to"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="payroll@example.com, another@example.com"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Separate addresses with commas.{senderEmail ? ` You (${senderEmail}) will be copied in.` : ""}
            </p>

            <label htmlFor="report-message" className="mt-4 block text-sm font-medium text-gray-700">
              Message <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="report-message"
              rows={4}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={sending}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={send}
                disabled={sending || !to.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
