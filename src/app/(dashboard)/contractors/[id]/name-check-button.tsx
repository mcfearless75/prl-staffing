"use client";

import { useState, useTransition } from "react";
import { markNameChecked } from "./name-check-actions";

export function NameCheckButton({ contractorId }: { contractorId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Have you checked the new name against their passport or ID?")) return;
          startTransition(async () => {
            const res = await markNameChecked(contractorId);
            if (!res.ok) setError(res.message ?? "Could not update.");
          });
        }}
        className="ml-2 rounded border border-amber-400 bg-white px-1.5 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Mark as checked"}
      </button>
      {error && <span className="ml-2 text-red-600">{error}</span>}
    </>
  );
}
