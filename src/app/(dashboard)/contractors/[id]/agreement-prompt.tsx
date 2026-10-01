"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import NewSupplierModal, { type AgreementPrefill } from "../../onboarding/submissions/new-supplier-modal";

/**
 * Shown after a Verify on the profile once nothing is left pending and no
 * agreement has gone to them (Erica, 2026-10-01): "Do you want to send the
 * Subcontractors Agreement to X?" Yes opens the agreement form pre-filled.
 */
export function AgreementPrompt({ prefill }: { prefill: AgreementPrefill }) {
  const [stage, setStage] = useState<"ask" | "form" | "done">("ask");
  const router = useRouter();
  const pathname = usePathname();

  // Drop ?agreementPrompt so a refresh doesn't ask again.
  function close() {
    setStage("done");
    router.replace(pathname, { scroll: false });
  }

  if (stage === "done") return null;

  if (stage === "form") {
    return (
      <NewSupplierModal
        open
        prefill={prefill}
        onClose={close}
        onSuccess={() => {
          close();
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-base font-semibold text-gray-900">Documents verified</p>
        <p className="mt-2 text-sm text-gray-700">
          Do you want to send the Subcontractor Agreement to <strong>{prefill.personName}</strong>?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => setStage("form")}
            className="rounded-lg bg-[#005f8c] px-4 py-2 text-sm font-medium text-white hover:bg-[#004d72]"
          >
            Yes, send agreement
          </button>
        </div>
      </div>
    </div>
  );
}
