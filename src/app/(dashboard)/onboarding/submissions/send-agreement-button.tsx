"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NewSupplierModal, { type AgreementPrefill } from "./new-supplier-modal";

/** "Send agreement" for one known person — opens the agreement form already filled in. */
export function SendAgreementButton({ prefill, label = "Send agreement" }: { prefill: AgreementPrefill; label?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-[#005f8c] px-3 py-1 text-xs font-medium text-white hover:bg-[#004d72]"
      >
        {label}
      </button>
      <NewSupplierModal
        open={open}
        prefill={prefill}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
