"use client";

import { useState, useTransition } from "react";
import { revealDeclarationsAction, type RevealResult } from "./declarations-actions";

/**
 * Health & declarations, for named administrators only. Nothing is fetched
 * until "Reveal" is pressed, and each reveal is written to the access log.
 */
export function DeclarationsPanel({
  contractorId,
  status,
  lastViewed,
}: {
  contractorId: string;
  status: "none" | "incomplete" | "complete";
  lastViewed: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RevealResult | null>(null);

  const label =
    status === "complete" ? "Completed" : status === "incomplete" ? "Started, not complete" : "Not answered yet";

  const row = (q: string, v: string | undefined) => (
    <div className="flex justify-between gap-4 py-1">
      <dt className="text-gray-600">{q}</dt>
      <dd className="font-medium text-gray-900">{v || "—"}</dd>
    </div>
  );

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">Health &amp; declarations</p>
          <p className="text-xs text-gray-500">
            {label} · Restricted: every view is logged{lastViewed ? ` · last viewed ${lastViewed}` : ""}
          </p>
        </div>
        {status !== "none" && !(result && result.ok) && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => setResult(await revealDeclarationsAction(contractorId)))}
            className="rounded-lg border border-purple-300 bg-white px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50"
          >
            {pending ? "Opening..." : "Reveal answers"}
          </button>
        )}
      </div>

      {result && !result.ok && <p className="mt-2 text-xs text-red-700">{result.error}</p>}

      {result && result.ok && (
        <dl className="mt-3 divide-y divide-purple-100 border-t border-purple-100">
          {row("Medical conditions", result.answers?.hasMedicalCondition)}
          {result.answers?.medicalConditions && (
            <div className="py-1">
              <dt className="text-gray-600">Conditions listed</dt>
              <dd className="whitespace-pre-wrap text-gray-900">{result.answers.medicalConditions}</dd>
            </div>
          )}
          {row("Can take a drugs & alcohol test", result.answers?.canTakeDaTest)}
          {row("Unspent criminal convictions", result.answers?.hasUnspentConviction)}
          {row("Declaration ticked", result.answers?.declarationTrue ? "Yes" : "No")}
          {result.answers?.applyAnswers && (
            <>
              {row("Application form: convicted of an offence", result.answers.applyAnswers.hasCriminalConviction)}
              {row("Application form: previous convictions", result.answers.applyAnswers.hasPreviousConvictions)}
            </>
          )}
          {result.daBlocked && (
            <p className="py-2 text-xs font-medium text-amber-800">
              Said they cannot take a drugs &amp; alcohol test. They were asked to call the office.
            </p>
          )}
        </dl>
      )}
    </div>
  );
}
