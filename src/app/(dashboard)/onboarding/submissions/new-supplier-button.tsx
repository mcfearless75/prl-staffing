"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import NewSupplierModal from "./new-supplier-modal";

export function NewSupplierButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-[#005f8c] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#004d72] transition-colors"
      >
        <Plus className="h-4 w-4" />
        New Supplier
      </button>

      <NewSupplierModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
