"use client";

import { useState } from "react";
import { CheckCircle2, RefreshCw, AlertTriangle } from "lucide-react";

type State = "idle" | "loading" | "done" | "error";

export default function BulkVerifyButton() {
  const [state, setState] = useState<State>("idle");
  const [updatedCount, setUpdatedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleVerify() {
    setState("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/compliance/bulk-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      setUpdatedCount(data.updated ?? 0);
      setState("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-3 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-green-800">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">
          {updatedCount} {updatedCount === 1 ? "record" : "records"} verified.
        </span>
        <a
          href=""
          onClick={(e) => {
            e.preventDefault();
            window.location.reload();
          }}
          className="ml-auto text-sm underline hover:no-underline"
        >
          Refresh page
        </a>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-800">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span className="text-sm">{errorMessage}</span>
        <button
          onClick={handleVerify}
          className="ml-auto text-sm underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleVerify}
      disabled={state === "loading"}
      className="inline-flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {state === "loading" ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          Verifying…
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4" />
          Verify All Pending
        </>
      )}
    </button>
  );
}
