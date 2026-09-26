"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { REMOVAL_REASONS, type ItemTarget } from "@/lib/document-removal";
import {
  moveItemAction,
  removeItemAction,
  searchMoveCandidates,
  type ItemActionResult,
  type MoveCandidate,
} from "./document-actions";

type Mode = "move" | "delete" | null;

/**
 * "⋯" menu on a compliance record or uploaded file: move it to the right
 * contractor, or delete it (record, file row and stored file). For documents
 * added to the wrong profile — often ID scans, so the reason is logged.
 */
export function ItemActionsMenu({
  contractorId,
  target,
  label,
}: {
  contractorId: string;
  target: ItemTarget;
  /** What the dialog calls it, e.g. "Passport file passport.pdf". */
  label: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        type="button"
        aria-label={`More actions for ${label}`}
        onClick={() => setMenuOpen((o) => !o)}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menuOpen && (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-gray-200 bg-white py-1 text-left shadow-lg">
          <button
            type="button"
            onClick={() => { setMode("move"); setMenuOpen(false); }}
            className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
          >
            Move to another contractor…
          </button>
          <button
            type="button"
            onClick={() => { setMode("delete"); setMenuOpen(false); }}
            className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
          >
            Delete…
          </button>
        </div>
      )}
      {mode && (
        <ItemDialog
          mode={mode}
          contractorId={contractorId}
          target={target}
          label={label}
          onClose={() => setMode(null)}
        />
      )}
    </div>
  );
}

function ItemDialog({
  mode,
  contractorId,
  target,
  label,
  onClose,
}: {
  mode: "move" | "delete";
  contractorId: string;
  target: ItemTarget;
  label: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState<string>("Wrong person");
  const [detail, setDetail] = useState("");
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<MoveCandidate[]>([]);
  const [picked, setPicked] = useState<MoveCandidate | null>(null);
  const [result, setResult] = useState<ItemActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (mode !== "move" || picked) return;
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      setCandidates(await searchMoveCandidates(q, contractorId));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, mode, picked, contractorId]);

  // Stale results from a longer query are hidden rather than cleared in the effect.
  const shown = query.trim().length >= 2 ? candidates : [];
  const needsDetail = reason === "Other" && !detail.trim();
  const canSubmit = !pending && !needsDetail && (mode === "delete" || !!picked) && result?.type !== "ok";

  function submit() {
    startTransition(async () => {
      const res =
        mode === "delete"
          ? await removeItemAction(contractorId, target, reason, detail)
          : await moveItemAction(contractorId, target, picked!.id, reason, detail);
      setResult(res);
      if (res.type === "ok") {
        router.refresh();
        setTimeout(onClose, 1200);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !pending) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-5 text-left shadow-xl">
        <h2 className="text-base font-semibold text-gray-900">
          {mode === "delete" ? "Delete" : "Move"} {label}
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          {mode === "delete"
            ? "Removes the record, the uploaded file and the stored copy. This cannot be undone. Who did it and why is kept in the Activity tab."
            : "Moves the record and its file to the right person. Both profiles' Activity tabs record the move."}
        </p>

        {mode === "move" && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700">Belongs to</label>
            {picked ? (
              <div className="mt-1 flex items-center justify-between rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm">
                <span>
                  {picked.name}
                  {picked.ref && <span className="ml-1 text-xs text-gray-500">{picked.ref}</span>}
                </span>
                <button type="button" onClick={() => setPicked(null)} className="text-xs text-blue-700 hover:underline">
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, ref or email"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {shown.length > 0 && (
                  <ul className="mt-1 max-h-48 overflow-auto rounded-lg border border-gray-200">
                    {shown.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setPicked(c)}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          {c.name}
                          <span className="ml-2 text-xs text-gray-500">
                            {[c.ref, c.jobTitle].filter(Boolean).join(" · ")}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        <fieldset className="mt-4">
          <legend className="text-xs font-medium text-gray-700">Reason</legend>
          <div className="mt-1 flex gap-4">
            {REMOVAL_REASONS.map((r) => (
              <label key={r} className="flex items-center gap-1.5 text-sm text-gray-700">
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                {r}
              </label>
            ))}
          </div>
          {reason === "Other" && (
            <input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={200}
              placeholder="What was wrong?"
              className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}
        </fieldset>

        {result && (
          <p className={`mt-3 text-sm ${result.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>{result.message}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {result?.type === "ok" ? "Close" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              mode === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {pending ? "Working..." : mode === "delete" ? "Delete" : "Move"}
          </button>
        </div>
      </div>
    </div>
  );
}
