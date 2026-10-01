"use client";

import { useState, useTransition } from "react";
import { Ban } from "lucide-react";
import { setDoNotEmploy } from "./do-not-employ-actions";

/**
 * The red "Do not employ" banner when set, and the tick box + note to set it.
 * Ticking opens the note; nothing is saved until "Save" with a reason.
 */
export function DoNotEmploy({
  contractorId,
  flagged,
  reason,
  byLine,
}: {
  contractorId: string;
  flagged: boolean;
  reason: string | null;
  /** e.g. "by Sian on 1 Oct 2026" */
  byLine: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [ticked, setTicked] = useState(flagged);
  const [note, setNote] = useState(reason ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function save(on: boolean) {
    setError("");
    startTransition(async () => {
      const r = await setDoNotEmploy(contractorId, on, note);
      if (!r.ok) return setError(r.message);
      setEditing(false);
      if (!on) setNote("");
    });
  }

  if (flagged && !editing) {
    return (
      <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-red-700">
            <Ban className="h-4 w-4" /> Do not employ
          </p>
          <button
            type="button"
            onClick={() => { setTicked(true); setEditing(true); }}
            className="rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Edit / remove
          </button>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-red-900">{reason}</p>
        {byLine && <p className="mt-1 text-xs text-red-600">Marked {byLine}</p>}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${ticked ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <input
          type="checkbox"
          checked={ticked}
          onChange={(e) => { setTicked(e.target.checked); setEditing(true); setError(""); }}
          className="h-4 w-4 accent-red-600"
        />
        Do not employ
      </label>

      {ticked && editing && (
        <div className="mt-3 space-y-2">
          <label className="block text-sm text-gray-700">
            Why? <span className="text-red-500">*</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="e.g. Incident on site — theft of tools, 14 Sept. Reported by the site manager."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </label>
          <p className="text-xs text-gray-500">Saving makes them Inactive and stops them being placed on any job.</p>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

      {editing && (
        <div className="mt-3 flex gap-2">
          {ticked ? (
            <button
              type="button"
              disabled={pending || !note.trim()}
              onClick={() => save(true)}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save"}
            </button>
          ) : (
            flagged && (
              <button
                type="button"
                disabled={pending}
                onClick={() => save(false)}
                className="rounded-lg bg-gray-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
              >
                {pending ? "Saving..." : "Remove do not employ"}
              </button>
            )
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => { setEditing(false); setTicked(flagged); setNote(reason ?? ""); setError(""); }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
