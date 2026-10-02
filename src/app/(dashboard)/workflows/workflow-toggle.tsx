"use client";

import { useState, useTransition } from "react";
import { setWorkflowEnabledAction } from "./actions";

export function WorkflowToggle({ workflow, enabled }: { workflow: string; enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    startTransition(async () => {
      const res = await setWorkflowEnabledAction(workflow, next);
      if (res.ok) {
        setOn(next);
        setError(null);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        disabled={pending}
        title={on ? "Runs automatically every morning — click to switch off" : "Switched off — click to run automatically every morning"}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
          on ? "bg-emerald-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className={`text-[11px] font-medium ${on ? "text-emerald-700" : "text-gray-500"}`}>
        {pending ? "Saving..." : on ? "Auto ON" : "Auto OFF"}
      </span>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
