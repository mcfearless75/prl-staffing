"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PipelineAction } from "@/lib/new-starter-pipeline";
import { SendAgreementButton } from "../onboarding/submissions/send-agreement-button";
import type { AgreementPrefill } from "../onboarding/submissions/new-supplier-modal";
import {
  cancelNewStarter,
  completeNewStarter,
  markNewStarterDocsVerified,
  resendNewStarterInvite,
  type PipelineResult,
} from "./pipeline-actions";

const BTN = "rounded-md px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50";

/** The buttons for one pipeline row. Which buttons show comes from pipelineActions(). */
export function PipelineRowActions({
  placementId,
  contractorId,
  docsBlockedReason,
  name,
  actions,
  agreementPrefill,
}: {
  placementId: string;
  /** Where "Induction done" / "Not needed" goes next: the person's Assignments tab. */
  contractorId: string;
  /** Set while documents are still waiting: "Documents verified" is greyed out with this reason. */
  docsBlockedReason?: string | null;
  name: string;
  actions: PipelineAction[];
  agreementPrefill: AgreementPrefill;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  function run(fn: () => Promise<PipelineResult>) {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fn();
        if (res.error) setMessage({ text: res.error, error: true });
        else if (res.ok) setMessage({ text: res.ok, error: false });
        router.refresh();
      } catch {
        setMessage({ text: "Something went wrong. Please try again.", error: true });
      }
    });
  }

  function complete(mode: "induction-done" | "no-induction" | "complete") {
    const label = mode === "induction-done" ? "their induction is done" : mode === "no-induction" ? "no induction is needed" : "they are ready";
    if (!confirm(`Confirm ${label}? This creates ${name}'s placement (status Placed), makes them Active and opens their Assignments tab.`)) return;
    setMessage(null);
    startTransition(async () => {
      try {
        let res = await completeNewStarter(placementId, mode);
        if (res.needsOverride) {
          const note = prompt(`${res.needsOverride}\n\nReason for placing them anyway:`);
          if (!note?.trim()) {
            setMessage({ text: "Not completed — no override reason given.", error: true });
            return;
          }
          res = await completeNewStarter(placementId, mode, note);
        }
        if (res.error) {
          setMessage({ text: res.error, error: true });
          router.refresh();
          return;
        }
        // Straight to their Assignments tab to check the job that was just
        // created (role, site, rates) — Jenni, 08-10-26.
        router.push(`/contractors/${contractorId}?tab=Assignments`);
      } catch {
        setMessage({ text: "Something went wrong. Please try again.", error: true });
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        {actions.includes("resend-invite") && (
          <button
            type="button"
            disabled={pending}
            onClick={() => confirm(`Send the app invite to ${name} again?`) && run(() => resendNewStarterInvite(placementId))}
            className={`${BTN} border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100`}
          >
            Resend invite
          </button>
        )}
        {actions.includes("docs-verified") && (
          <button
            type="button"
            disabled={pending || !!docsBlockedReason}
            title={docsBlockedReason ?? undefined}
            onClick={() =>
              confirm(`Have you checked ${name}'s documents? This moves them to Onboarding, ready for the agreement.`) &&
              run(() => markNewStarterDocsVerified(placementId))
            }
            className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600`}
          >
            Documents verified → Onboarding
          </button>
        )}
        {(actions.includes("send-agreement") || actions.includes("resend-agreement")) && (
          <SendAgreementButton
            prefill={agreementPrefill}
            label={actions.includes("resend-agreement") ? "Resend agreement" : "Send agreement"}
          />
        )}
        {actions.includes("induction-done") && (
          <button type="button" disabled={pending} onClick={() => complete("induction-done")} className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-700`}>
            Induction done
          </button>
        )}
        {actions.includes("no-induction") && (
          <button type="button" disabled={pending} onClick={() => complete("no-induction")} className={`${BTN} border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>
            No induction needed
          </button>
        )}
        {actions.includes("complete") && (
          <button type="button" disabled={pending} onClick={() => complete("complete")} className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-700`}>
            Complete — ready to start
          </button>
        )}
        {actions.includes("cancel") && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              confirm(`Cancel ${name}'s placement? Use this when they have withdrawn. They will be set Inactive unless they are working elsewhere.`) &&
              run(() => cancelNewStarter(placementId))
            }
            className={`${BTN} bg-red-600 text-white hover:bg-red-700`}
          >
            Cancel
          </button>
        )}
      </div>
      {pending && <p className="text-xs text-gray-500">Working…</p>}
      {message && <p className={`max-w-xs text-xs ${message.error ? "text-red-600" : "text-emerald-700"}`}>{message.text}</p>}
    </div>
  );
}
