"use client";

import { useState } from "react";
import { Send } from "lucide-react";

const FORM_PATH = "/onboarding";

export function SendFormButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [copied, setCopied] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setError("");
    setSentTo("");
    setCopied(false);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/send-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send the form");
      setSentTo(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the form");
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${FORM_PATH}`);
      setCopied(true);
    } catch {
      setError("Could not copy the link");
    }
  }

  return (
    <>
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-[#005f8c] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#004d72] transition-colors"
      >
        <Send className="h-4 w-4" />
        Send Form
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between rounded-t-xl bg-[#005f8c] px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Send Supply Agreement Form</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            {sentTo ? (
              <div className="space-y-4 p-6">
                <p className="text-sm text-gray-700">
                  ✓ Sent to <strong>{sentTo}</strong>. When they fill it in, it will appear here under Pending.
                </p>
                <div className="flex justify-end gap-3">
                  <button onClick={reset} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Send another
                  </button>
                  <button onClick={() => setOpen(false)} className="rounded-lg bg-[#005f8c] px-4 py-2 text-sm font-medium text-white hover:bg-[#004d72]">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={send} className="space-y-4 p-6">
                <p className="text-sm text-gray-600">
                  We&apos;ll email them a link to fill in the form themselves.
                </p>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Their name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g. John Smith"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Their email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="name@example.com"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={copyLink}
                    className="text-sm font-medium text-[#005f8c] hover:underline"
                  >
                    {copied ? "✓ Link copied" : "Copy link for WhatsApp/text"}
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="rounded-lg bg-[#005f8c] px-4 py-2 text-sm font-medium text-white hover:bg-[#004d72] disabled:opacity-50"
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
