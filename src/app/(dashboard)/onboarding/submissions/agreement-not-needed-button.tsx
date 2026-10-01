"use client";

import { useState, useTransition } from "react";
import { markAgreementNotNeeded } from "./agreement-not-needed-actions";

/** "Not needed" on a ready-for-agreement row: asks once, then hides them from the list. */
export function AgreementNotNeededButton({ contractorId, name }: { contractorId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Remove ${name} from this list? Nothing is deleted — you can still send them an agreement later.`)) return;
          setError("");
          startTransition(async () => {
            const r = await markAgreementNotNeeded(contractorId);
            if (!r.ok) setError(r.message ?? "Couldn't update");
          });
        }}
        className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "..." : "Not needed"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
