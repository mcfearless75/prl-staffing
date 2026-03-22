"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export function QuickVerifyButton({ recordId }: { recordId: string }) {
  const [verifying, setVerifying] = useState(false);
  const router = useRouter();

  async function handleVerify() {
    if (!confirm("Mark this compliance record as Verified?")) return;

    setVerifying(true);
    try {
      const res = await fetch(`/api/compliance/${recordId}/verify`, {
        method: "POST",
      });

      if (!res.ok) {
        alert("Failed to verify. Please try again.");
        return;
      }

      router.refresh();
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <button
      onClick={handleVerify}
      disabled={verifying}
      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
    >
      {verifying ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      {verifying ? "Verifying..." : "Mark Verified"}
    </button>
  );
}
