"use client";

import { useActionState } from "react";
import { MESSAGE_MAX_LENGTH } from "@/lib/contractor-messages";
import { sendWorkerReply } from "./actions";

export function ReplyForm() {
  const [state, formAction, pending] = useActionState(sendWorkerReply, null);

  return (
    <form action={formAction} className="space-y-2">
      <textarea
        name="body"
        rows={3}
        required
        maxLength={MESSAGE_MAX_LENGTH}
        placeholder="Write a reply to PRL..."
        className="w-full rounded-lg border border-prism-line bg-white px-3 py-2 text-base text-prism-ink placeholder:text-gray-400 focus:border-prism-ink focus:outline-none focus:ring-1 focus:ring-prism-ink"
      />
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs ${state?.type === "error" ? "text-prism-bad" : "text-prism-ink-muted"}`}>
          {state?.message ?? ""}
        </span>
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] rounded-lg bg-prism-ink px-5 py-2 text-sm font-semibold text-prism-paper transition-colors hover:bg-prism-ink/90 disabled:opacity-50"
        >
          {pending ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
