"use client";

import { useActionState, useRef } from "react";
import { MESSAGE_MAX_LENGTH, MESSAGE_TEMPLATES, fillMessageTemplate } from "@/lib/contractor-messages";
import { sendStaffMessage } from "./message-actions";

// Uncontrolled on purpose: React resets the form after the action, which is
// what clears the box once a message has gone (same as the Notes thread).
// A template only pre-fills the box; it's still edited and sent as normal.
export function MessageComposer({ contractorId, firstName }: { contractorId: string; firstName?: string | null }) {
  const action = sendStaffMessage.bind(null, contractorId);
  const [state, formAction, pending] = useActionState(action, null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  function applyTemplate(id: string) {
    const t = MESSAGE_TEMPLATES.find((x) => x.id === id);
    if (!t || !boxRef.current) return;
    if (boxRef.current.value.trim() && !confirm("Replace what you've written with this template?")) return;
    boxRef.current.value = fillMessageTemplate(t.body, firstName);
    boxRef.current.focus();
  }

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex items-center justify-end">
        <select
          value=""
          onChange={(e) => applyTemplate(e.target.value)}
          aria-label="Start from a template"
          className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700"
        >
          <option value="">Start from a template…</option>
          {MESSAGE_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
      <textarea
        ref={boxRef}
        name="body"
        rows={3}
        required
        maxLength={MESSAGE_MAX_LENGTH}
        placeholder="Write a message to this worker..."
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs ${state?.type === "error" ? "text-red-600" : "text-gray-500"}`}>
          {state?.message ?? `Up to ${MESSAGE_MAX_LENGTH} characters.`}
        </span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
