"use client";

import { useState } from "react";
import { acknowledgePolicy } from "./actions";

interface AcknowledgeButtonProps {
  userId: string;
  userEmail: string;
  userName: string;
  hasAcknowledged: boolean;
}

export function AcknowledgeButton({ userId, userEmail, userName, hasAcknowledged }: AcknowledgeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(hasAcknowledged);
  const [error, setError] = useState<string | null>(null);

  async function handleAcknowledge() {
    setLoading(true);
    setError(null);
    try {
      const result = await acknowledgePolicy(userId, userEmail, userName);
      if (result.error) {
        setError(result.error);
      } else {
        setAcknowledged(true);
      }
    } catch {
      setError("Failed to acknowledge policy. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (acknowledged) {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
        <p className="text-sm font-medium text-emerald-700">
          You have acknowledged this policy.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <button
        onClick={handleAcknowledge}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Acknowledging..." : "I Acknowledge This Policy"}
      </button>
    </div>
  );
}
