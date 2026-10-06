"use client";

import { useActionState } from "react";
import { MESSAGE_MAX_LENGTH } from "@/lib/contractor-messages";
import { sendStaffMessage } from "./message-actions";

// Uncontrolled on purpose: React resets the form after the action, which is
// what clears the box once a message has gone (same as the Notes thread).
export function MessageComposer({ contractorId }: { contractorId: string }) {
  const action = sendStaffMessage.bind(null, contractorId);
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-2">
      <textarea
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
