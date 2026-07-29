"use client";

import { useActionState, useState } from "react";
import {
  convertToContractor,
  rejectSubmission,
  reopenSubmission,
  saveNotes,
  type NewStarterActionState,
} from "./actions";

interface Props {
  submissionId: string;
  status: string;
  notes: string | null;
  name: string;
}

export function NewStarterActions({ submissionId, status, notes, name }: Props) {
  const [convertState, convertAction, converting] = useActionState<NewStarterActionState, FormData>(
    convertToContractor.bind(null, submissionId),
    null
  );
  const [rejectState, rejectAction, rejecting] = useActionState<NewStarterActionState, FormData>(
    rejectSubmission.bind(null, submissionId),
    null
  );
  const [reopenState, reopenAction, reopening] = useActionState<NewStarterActionState, FormData>(
    reopenSubmission.bind(null, submissionId),
    null
  );
  const [notesState, notesAction, savingNotes] = useActionState<NewStarterActionState, FormData>(
    saveNotes.bind(null, submissionId),
    null
  );

  const [showReject, setShowReject] = useState(false);

  const message =
    convertState?.error || rejectState?.ok || reopenState?.ok || notesState?.ok || null;
  const isError = !!convertState?.error;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Review</h2>
      <p className="mb-4 text-sm text-gray-500">
        Converting creates a subcontractor record prefilled from this checklist. If{" "}
        {name.split(" ")[0]} already exists in PRISM, the checklist links to that record and fills
        any blank details rather than creating a duplicate.
      </p>

      {message && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            isError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Staff notes */}
      <form action={notesAction} className="mb-5">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Staff notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={notes ?? ""}
          placeholder="Anything worth recording before processing this checklist..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={savingNotes}
          className="mt-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {savingNotes ? "Saving..." : "Save notes"}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
        {status !== "Processed" && (
          <form action={convertAction}>
            <button
              type="submit"
              disabled={converting}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {converting ? "Converting..." : "Convert to Subcontractor"}
            </button>
          </form>
        )}

        {status === "New" && !showReject && (
          <button
            type="button"
            onClick={() => setShowReject(true)}
            className="rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
          >
            Reject
          </button>
        )}

        {status !== "New" && (
          <form action={reopenAction}>
            <button
              type="submit"
              disabled={reopening}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {reopening ? "Reopening..." : "Reopen"}
            </button>
          </form>
        )}
      </div>

      {showReject && status === "New" && (
        <form action={rejectAction} className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <label htmlFor="reason" className="block text-sm font-medium text-red-800 mb-1">
            Reason for rejecting (optional)
          </label>
          <input
            type="text"
            id="reason"
            name="reason"
            placeholder="e.g. duplicate submission, applicant withdrew"
            className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={rejecting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {rejecting ? "Rejecting..." : "Confirm reject"}
            </button>
            <button
              type="button"
              onClick={() => setShowReject(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
