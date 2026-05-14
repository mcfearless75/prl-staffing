"use client";

import { useState } from "react";
import { Mail, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

type State = "idle" | "confirm" | "loading" | "done" | "error";

interface Summary {
  sent: number;
  failed: number;
  total: number;
}

export function ChaseEmailButton() {
  const [state, setState] = useState<State>("idle");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleSend() {
    setState("loading");
    try {
      const res = await fetch("/api/admin/compliance-chase-email", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error ?? "An unexpected error occurred.");
        setState("error");
        return;
      }
      setSummary(data.summary);
      setState("done");
    } catch {
      setErrorMessage("Network error — please try again.");
      setState("error");
    }
  }

  if (state === "idle") {
    return (
      <button
        onClick={() => setState("confirm")}
        className="inline-flex items-center gap-2 rounded-md border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-800 hover:bg-orange-100 transition-colors"
      >
        <Mail className="h-4 w-4" />
        Chase No-Records Contractors
      </button>
    );
  }

  if (state === "confirm") {
    return (
      <div className="inline-flex items-center gap-3 rounded-md border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800">
        <span>This will email all contractors with no compliance records. Continue?</span>
        <button
          onClick={handleSend}
          className="rounded bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-700 transition-colors"
        >
          Send Emails
        </button>
        <button
          onClick={() => setState("idle")}
          className="rounded border border-orange-300 bg-white px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-orange-300 bg-orange-50 px-4 py-2 text-sm text-orange-800">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Sending chase emails&hellip;
      </div>
    );
  }

  if (state === "done" && summary) {
    return (
      <div className="inline-flex items-center gap-3 rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span>
          Chase emails sent &mdash; {summary.sent} sent, {summary.failed} failed.
        </span>
        <button
          onClick={() => window.location.reload()}
          className="text-xs font-medium underline hover:no-underline"
        >
          Refresh page
        </button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="inline-flex items-center gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <span>{errorMessage}</span>
        <button
          onClick={() => setState("idle")}
          className="rounded border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}
