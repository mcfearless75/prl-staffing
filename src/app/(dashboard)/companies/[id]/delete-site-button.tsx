"use client";

import { useActionState } from "react";
import { deleteSite } from "./sites/actions";

export function DeleteSiteButton({
  siteId,
  companyId,
}: {
  siteId: string;
  companyId: string;
}) {
  const [state, formAction, pending] = useActionState(
    deleteSite.bind(null, siteId, companyId),
    null
  );

  if (state?.type === "ok") {
    return <span className="text-sm text-gray-400">Deleted</span>;
  }

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!confirm("Delete this site? This cannot be undone.")) e.preventDefault();
        }}
        className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
      >
        {pending ? "..." : "Delete"}
      </button>
      {state?.type === "error" && (
        <span className="max-w-[180px] text-right text-xs text-red-600">{state.message}</span>
      )}
    </form>
  );
}
