"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

export function BackfillButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  async function run() {
    setState("loading");
    try {
      const res = await fetch("/api/admin/backfill-compliance");
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setResult(data.summary);
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done" && result) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <p className="text-sm text-emerald-800">
          Backfill complete — <strong>{result.created}</strong> new records created,{" "}
          <strong>{result.skipped}</strong> already existed.{" "}
          <button onClick={() => window.location.reload()} className="underline font-medium">
            Refresh page
          </button>
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2">
        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
        <p className="text-sm text-red-700">Backfill failed — try again or check the logs.</p>
        <button onClick={() => setState("idle")} className="ml-2 text-sm underline text-red-700">Retry</button>
      </div>
    );
  }

  return (
    <button
      onClick={run}
      disabled={state === "loading"}
      className="inline-flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-800 hover:bg-orange-100 transition-colors disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${state === "loading" ? "animate-spin" : ""}`} />
      {state === "loading" ? "Running backfill…" : "Sync uploaded docs → compliance records"}
    </button>
  );
}
