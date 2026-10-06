"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { WAIVER_DECISIONS, WAIVER_LABELS, type WaiverDecision } from "@/lib/working-time-waiver";

type Saved = { decision: string; signature: string; signedAt: string | null };

function fmt(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Europe/London" }).format(new Date(iso));
}

/**
 * 48 Hour Waiver — Working Time Regulations 1998 opt-out. Wording carried over
 * from the old public /apply form (removed 2026-10-06). The worker can change
 * their choice at any time by signing again.
 */
export function WaiverForm() {
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [decision, setDecision] = useState<WaiverDecision | "">("");
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portal/waiver")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) return setState("unavailable");
        const data = (await res.json()) as Saved;
        setSaved(data);
        if ((WAIVER_DECISIONS as readonly string[]).includes(data.decision)) setDecision(data.decision as WaiverDecision);
        setState("ready");
      })
      .catch(() => !cancelled && setState("unavailable"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function sign() {
    setBusy(true);
    setError("");
    setDone(false);
    try {
      const res = await fetch("/api/portal/waiver", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, signature }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save. Please try again.");
      } else {
        setSaved({ decision, signature: signature.trim(), signedAt: data.signedAt });
        setSignature("");
        setDone(true);
      }
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "unavailable") return null;

  const signedBefore = !!saved?.signedAt && !!saved.decision;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Clock className="h-4 w-4 text-gray-400" /> 48 Hour Waiver
        </h2>
      </div>

      {state === "loading" ? (
        <p className="px-4 py-6 text-center text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-4 p-4">
          <div className="space-y-2 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
            <p className="font-semibold text-gray-700">Working Time Regulations</p>
            <p>
              The Working Time Regulations 1998 state that a worker&apos;s average working time, including overtime,
              shall not exceed 48 hours for each seven-day period averaged over a reference period of 17 weeks.
            </p>
            <p>
              However, you may agree with PRL Site Solutions to exclude this limit. If you do, you will not be required
              or expected to work more than 48 hours per week on average, but you may do so if you wish. Opting out is
              entirely voluntary. You may cancel this agreement by giving PRL Site Solutions not less than seven
              days&apos; notice in writing.
            </p>
            <p>You can change your choice below at any time by signing again.</p>
          </div>

          {signedBefore && saved && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Current choice: <strong>{WAIVER_LABELS[saved.decision as WaiverDecision] ?? saved.decision}</strong>
              {saved.signedAt && <> — signed by {saved.signature} on {fmt(saved.signedAt)}</>}
            </p>
          )}

          <div role="radiogroup" aria-label="48-hour waiver choice" className="space-y-2">
            {WAIVER_DECISIONS.map((d) => (
              <label
                key={d}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  decision === d ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"
                }`}
              >
                <input
                  type="radio"
                  name="waiverDecision"
                  checked={decision === d}
                  onChange={() => {
                    setDecision(d);
                    setDone(false);
                  }}
                  className="h-4 w-4 text-blue-600"
                />
                {WAIVER_LABELS[d]}
              </label>
            ))}
          </div>

          <label className="block text-sm text-gray-700">
            Type your full name to sign <span className="text-red-500">*</span>
            <input
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              maxLength={120}
              autoComplete="name"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {done && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Signed. Thank you.
            </p>
          )}

          <button
            type="button"
            onClick={sign}
            disabled={busy || !decision || !signature.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Saving..." : signedBefore ? "Sign updated choice" : "Sign waiver"}
          </button>
        </div>
      )}
    </div>
  );
}
