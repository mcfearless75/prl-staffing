"use client";

import { useActionState } from "react";
import { deleteProject } from "../actions";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteProject.bind(null, projectId),
    null
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!confirm("Delete this project? This cannot be undone.")) e.preventDefault();
        }}
        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        {pending ? "Deleting..." : "Delete"}
      </button>
      {state?.type === "error" && (
        <span className="max-w-xs text-right text-xs text-red-600">{state.message}</span>
      )}
    </form>
  );
}
