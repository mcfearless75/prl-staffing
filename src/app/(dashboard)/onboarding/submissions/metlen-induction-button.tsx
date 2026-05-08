"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import MetlenInductionModal from "./metlen-induction-modal";

export function MetlenInductionButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 transition-colors"
      >
        <Mail className="h-4 w-4" />
        Metlen Induction
      </button>

      <MetlenInductionModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => setOpen(false)}
      />
    </>
  );
}
