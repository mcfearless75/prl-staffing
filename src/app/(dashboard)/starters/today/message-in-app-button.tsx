"use client";

import { useState, useTransition } from "react";
import { sendCheckInMessage } from "./actions";

export function MessageInAppButton({
  assignmentId,
  firstName,
  alreadySent,
  hasAppLogin,
}: {
  assignmentId: string;
  firstName: string;
  alreadySent: boolean;
  hasAppLogin: boolean;
}) {
  const [sent, setSent] = useState(alreadySent);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <span className="text-xs font-medium text-emerald-700" title={note ?? undefined}>
        Messaged ✓{note && note !== "Sent" && <span className="ml-1 font-normal text-amber-700">(no email on file)</span>}
      </span>
    );
  }

  function onClick() {
    const warning = hasAppLogin ? "" : `\n\n${firstName} hasn't set up their app login yet, so they can't read it until they do.`;
    if (!confirm(`Send ${firstName} a first-day check-in message in the PRISM app?${warning}`)) return;
    setError(null);
    startTransition(async () => {
      const result = await sendCheckInMessage(assignmentId);
      if (result.ok) {
        setNote(result.note);
        setSent(true);
      }
      else setError(result.error);
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Sending..." : "Message in app"}
      </button>
    </span>
  );
}
