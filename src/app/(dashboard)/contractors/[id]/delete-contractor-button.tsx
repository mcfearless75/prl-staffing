"use client";

import { useActionState } from "react";
import { deleteContractor } from "../actions";

export function DeleteContractorButton({ contractorId }: { contractorId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteContractor.bind(null, contractorId),
    null
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!confirm("Delete this contractor? This cannot be undone.")) e.preventDefault();
        }}
        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        {pending ? "Deleting..." : "Delete"}
      </button>
      {state?.type === "error" && (
        <span className="max-w-xs text-right text-xs text-red-600">{state.message}</span>
      )}
    </form>
  );
}
