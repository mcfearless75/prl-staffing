"use client";

import { useState } from "react";
import { Bell, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

type State = "idle" | "loading" | "done" | "error";

interface Summary {
  sent: number;
  failed: number;
  total: number;
  expiringRecords: number;
}

export function ExpiryAlertButton() {
  const [state, setState] = useState<State>("idle");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function handleClick() {
    setState("loading");
    setSummary(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/compliance-expiry-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 30 }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json();
      setSummary(data.summary);
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
      setState("error");
    }
  }

  if (state === "idle") {
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
      >
        <Bell className="h-4 w-4" />
        Send Expiry Alerts (30 days)
      </button>
    );
  }

  if (state === "loading") {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Sending expiry alerts&hellip;
      </div>
    );
  }

  if (state === "done" && summary) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Expiry alerts sent</p>
            <p className="mt-0.5">
              {summary.sent} email{summary.sent !== 1 ? "s" : ""} sent to contractors with expiring documents.
              {summary.failed > 0 && (
                <span className="ml-1 text-amber-700">({summary.failed} failed)</span>
              )}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 inline-flex items-center gap-1 text-amber-700 underline hover:text-amber-900"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // error
  return (
    <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
        <div>
          <p className="font-medium">Failed to send expiry alerts</p>
          {errorMsg && <p className="mt-0.5">{errorMsg}</p>}
          <button
            onClick={() => setState("idle")}
            className="mt-2 inline-flex items-center gap-1 text-red-700 underline hover:text-red-900"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
