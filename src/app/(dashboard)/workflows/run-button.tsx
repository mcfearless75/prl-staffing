"use client";
import { useState } from "react";
import { Zap } from "lucide-react";

export function WorkflowRunButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/workflows/run", { method: "POST" });
      const data = await res.json();
      const summary = data.results
        ?.map((r: { workflow: string; acted: number; failed: number }) =>
          `${r.workflow}: ${r.acted} actions, ${r.failed} failed`
        )
        .join(" | ");
      setResult(summary || "Done");
      // Reload to show updated log
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setResult("Error — check console");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full max-w-sm truncate">
          {result}
        </span>
      )}
      <button
        onClick={handleRun}
        disabled={running}
        className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-60 transition-colors"
      >
        <Zap className={`h-4 w-4 ${running ? "animate-pulse" : ""}`} />
        {running ? "Running…" : "Run Agents Now"}
      </button>
    </div>
  );
}
