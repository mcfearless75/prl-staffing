"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Compact "Send app invite" action for an Applicants table row. Once an invite
 * has gone out (Contractor.inviteSentAt, stamped by /api/send-app-invite) it
 * becomes "Resend" behind a confirm(), so staff don't email someone twice by
 * accident.
 */
export function ApplicantInviteButton({
  contractorId,
  name,
  sentLabel,
  disabledReason,
}: {
  contractorId: string;
  name: string;
  /** dd/mm/yyyy of the last invite, or null if never sent. */
  sentLabel: string | null;
  /** Set when there is no usable email address; disables the button. */
  disabledReason?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function sendInvite() {
    if (sentLabel && !confirm(`An app invite was already sent to ${name} on ${sentLabel}. Send it again?`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/send-app-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to send app invite. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const label = loading ? "Sending..." : sentLabel ? "Resend" : "Send app invite";

  // The tooltip sits on a wrapper: some browsers show no title on a disabled button.
  return (
    <span title={disabledReason} className="inline-flex">
      <button
        type="button"
        onClick={sendInvite}
        disabled={loading || Boolean(disabledReason)}
        className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {label}
      </button>
    </span>
  );
}
