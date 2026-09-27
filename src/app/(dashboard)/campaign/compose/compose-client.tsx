"use client";

import { useMemo, useState, useTransition } from "react";
import { previewCampaign, sendCampaignBatch, type PreviewRecipient } from "./actions";
import { MAX_MESSAGE, MAX_SUBJECT, SEND_BATCH_SIZE } from "@/lib/campaign-builder";

type Template = { id: string; label: string; subject: string; message: string; missing: string };

const inputCls =
  "mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ComposeClient({
  jobTitles,
  statuses,
  categories,
  templates,
}: {
  jobTitles: string[];
  statuses: string[];
  categories: string[];
  templates: Template[];
}) {
  const first = templates[0];
  const [status, setStatus] = useState("Active");
  const [jobTitle, setJobTitle] = useState("");
  const [missing, setMissing] = useState(first?.missing ?? "");
  const [subject, setSubject] = useState(first?.subject ?? "");
  const [message, setMessage] = useState(first?.message ?? "");
  const [withAppButton, setWithAppButton] = useState(true);

  const [recipients, setRecipients] = useState<PreviewRecipient[] | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; sent: number; skipped: number; failed: number; errors: string[] } | null>(null);

  const sendable = useMemo(
    () => (recipients ?? []).filter((r) => !r.skip && !excluded.has(r.id)),
    [recipients, excluded]
  );

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject);
    setMessage(t.message);
    setMissing(t.missing);
    setRecipients(null);
  }

  function filterChanged<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setRecipients(null); // stale preview must never be sent
      setProgress(null);
    };
  }

  function preview() {
    setError(null);
    setProgress(null);
    startLoading(async () => {
      const res = await previewCampaign({ status, jobTitle, missing });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRecipients(res.recipients);
      setExcluded(new Set());
    });
  }

  async function send() {
    if (sendable.length === 0) return;
    if (!subject.trim() || !message.trim()) {
      setError("Add a subject and a message first.");
      return;
    }
    if (!confirm(`Send "${subject}" to ${sendable.length} ${sendable.length === 1 ? "person" : "people"}?\n\nThis sends real emails.`)) return;

    const key = newKey();
    const ids = sendable.map((r) => r.id);
    const p = { done: 0, total: ids.length, sent: 0, skipped: 0, failed: 0, errors: [] as string[] };
    setProgress({ ...p });
    setSending(true);
    setError(null);
    try {
      for (let i = 0; i < ids.length; i += SEND_BATCH_SIZE) {
        const batch = ids.slice(i, i + SEND_BATCH_SIZE);
        const res = await sendCampaignBatch({ key, subject, message, withAppButton, ids: batch });
        if (!res.ok) {
          setError(res.error);
          break;
        }
        p.done += batch.length;
        p.sent += res.sent;
        p.skipped += res.skipped;
        p.failed += res.failed;
        p.errors.push(...res.errors);
        setProgress({ ...p });
      }
    } catch {
      setError("Sending stopped part-way (connection lost). Anyone already emailed is recorded; check the log before sending again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left: who + message */}
      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">1. Who is it for?</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium text-gray-700">
              Status
              <select value={status} onChange={(e) => filterChanged(setStatus)(e.target.value)} className={inputCls}>
                <option value="">Any</option>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Job title
              <select value={jobTitle} onChange={(e) => filterChanged(setJobTitle)(e.target.value)} className={inputCls}>
                <option value="">Any</option>
                {jobTitles.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Missing document
              <select value={missing} onChange={(e) => filterChanged(setMissing)(e.target.value)} className={inputCls}>
                <option value="">Don&apos;t filter</option>
                <option value="rtw">Right to Work (not covered)</option>
                {categories.map((c) => <option key={c} value={`category:${c}`}>{c}</option>)}
              </select>
            </label>
          </div>
          <p className="text-xs text-gray-500">
            &quot;Missing&quot; means nothing uploaded in that group, or only rejected or out-of-date copies.
            Right to Work uses the same rule as the red flag on profiles (verified and in date).
          </p>
          <button
            type="button"
            onClick={preview}
            disabled={loading || sending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Finding people..." : "Show who it will go to"}
          </button>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">2. The message</h2>
            <select onChange={(e) => applyTemplate(e.target.value)} defaultValue="" className="rounded-lg border border-gray-300 px-2 py-1 text-xs" aria-label="Start from a template">
              <option value="" disabled>Start from a template…</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <label className="block text-sm font-medium text-gray-700">
            Subject
            <input value={subject} maxLength={MAX_SUBJECT} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Message
            <textarea
              value={message}
              maxLength={MAX_MESSAGE}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              className={`${inputCls} font-sans`}
            />
          </label>
          <p className="text-xs text-gray-500">
            <code>{"{name}"}</code> becomes each person&apos;s name (their &quot;known as&quot; name if set). Leave a blank line between paragraphs.
          </p>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={withAppButton} onChange={(e) => setWithAppButton(e.target.checked)} />
            Add an &quot;Open the PRISM app&quot; button (goes to Documents)
          </label>
        </section>
      </div>

      {/* Right: preview + send */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 lg:sticky lg:top-4 lg:self-start">
        <h2 className="text-sm font-semibold text-gray-900">3. Check and send</h2>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {!recipients && <p className="text-sm text-gray-500">Press &quot;Show who it will go to&quot; to see the list.</p>}

        {recipients && (
          <>
            <p className="text-sm text-gray-700">
              <strong>{sendable.length}</strong> will be emailed
              {recipients.length !== sendable.length && <> · {recipients.length - sendable.length} left out</>}
            </p>
            <ul className="max-h-[420px] divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 text-sm">
              {recipients.length === 0 && <li className="px-3 py-3 text-gray-500">Nobody matches these filters.</li>}
              {recipients.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Include ${r.name}`}
                    disabled={!!r.skip || sending}
                    checked={!r.skip && !excluded.has(r.id)}
                    onChange={(e) =>
                      setExcluded((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.delete(r.id);
                        else next.add(r.id);
                        return next;
                      })
                    }
                  />
                  <a href={`/contractors/${r.id}`} target="_blank" className="min-w-0 flex-1 truncate text-gray-900 hover:underline">
                    {r.name}
                  </a>
                  <span className="truncate text-xs text-gray-500">{r.jobTitle || "—"}</span>
                  {r.skip && <span className="whitespace-nowrap text-xs text-amber-700">{r.skip}</span>}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={send}
              disabled={sending || sendable.length === 0 || (progress !== null && progress.done === progress.total)}
              className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
            >
              {sending ? "Sending..." : `Send to ${sendable.length} ${sendable.length === 1 ? "person" : "people"}`}
            </button>
            <p className="text-xs text-gray-500">Emails go out about one every two seconds, so a long list takes a few minutes. Keep this page open.</p>
          </>
        )}

        {progress && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <p>
              {progress.done} of {progress.total} processed · <span className="text-emerald-700">{progress.sent} sent</span>
              {progress.skipped > 0 && <> · {progress.skipped} skipped</>}
              {progress.failed > 0 && <> · <span className="text-red-700">{progress.failed} failed</span></>}
            </p>
            {progress.errors.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-xs text-red-700">
                {progress.errors.slice(0, 10).map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
