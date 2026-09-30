"use client";

import { useState, useTransition } from "react";
import { revealNiNumberAction } from "./ni-actions";

/** Masked NI number with a Show/Hide toggle — no trip to Edit needed. */
export function NiReveal({ contractorId, masked }: { contractorId: string; masked: string }) {
  const [full, setFull] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (masked === "-") return <p className="text-sm text-gray-900 font-mono">-</p>;

  return (
    <p className="flex items-center gap-2 text-sm text-gray-900 font-mono">
      {full ?? masked}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          full ? setFull(null) : startTransition(async () => setFull(await revealNiNumberAction(contractorId)))
        }
        className="font-sans text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
      >
        {pending ? "..." : full ? "Hide" : "Show"}
      </button>
    </p>
  );
}
