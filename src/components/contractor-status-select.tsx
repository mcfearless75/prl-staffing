"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { SETTABLE_CONTRACTOR_STATUSES } from "@/lib/contractor-statuses";

// Colours for any status a contractor might already hold, including legacy /
// pipeline values, so badges still render correctly even when not selectable.
// The VOCABULARY lives in contractor-statuses.ts — this map is presentation
// only, and an unknown status degrades to grey rather than disappearing.
const STATUS_COLORS: Record<string, string> = {
  New:            "bg-indigo-100 text-indigo-700 border-indigo-200",
  Active:         "bg-emerald-100 text-emerald-700 border-emerald-200",
  "On Hold":      "bg-amber-100 text-amber-700 border-amber-200",
  Suspended:      "bg-red-100 text-red-700 border-red-200",
  Inactive:       "bg-gray-100 text-gray-600 border-gray-200",
  Left:           "bg-rose-100 text-rose-700 border-rose-200",
  Applied:        "bg-purple-100 text-purple-700 border-purple-200",
  Looking:        "bg-sky-100 text-sky-700 border-sky-200",
  "On Site":      "bg-blue-100 text-blue-700 border-blue-200",
  Benched:        "bg-amber-100 text-amber-700 border-amber-200",
  "Pending Docs": "bg-orange-100 text-orange-700 border-orange-200",
};

function badgeColor(status: string) {
  return STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600 border-gray-200";
}

export function ContractorStatusSelect({
  id,
  status: initialStatus,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(initialStatus);
  const [selected, setSelected] = useState(initialStatus);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const dirty = selected !== current;

  function handleOpen() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
    setOpen((o) => !o);
  }

  function handleSave() {
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/contractors/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selected }),
      });
      if (res.ok) {
        setCurrent(selected);
        setOpen(false);
        router.refresh();
      } else {
        setError("Save failed");
      }
    });
  }

  function handleCancel() {
    setSelected(current);
    setOpen(false);
    setError("");
  }

  const dropdown = open && mounted ? createPortal(
    <>
      {/* Click-away backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={handleCancel}
      />
      <div
        className="fixed z-50 w-44 rounded-lg border border-gray-200 bg-white shadow-lg"
        style={{ top: dropdownPos.top, left: dropdownPos.left }}
      >
        <div className="p-1.5 space-y-0.5">
          {SETTABLE_CONTRACTOR_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setSelected(s)}
              className={`w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                selected === s
                  ? badgeColor(s) + " ring-1 ring-inset ring-current/30"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {error && <p className="px-3 pb-1 text-[10px] text-red-600">{error}</p>}

        <div className="flex items-center gap-1.5 border-t border-gray-100 px-2 py-2">
          <button
            onClick={handleSave}
            disabled={!dirty || isPending}
            className="flex-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-40 hover:bg-blue-700 transition-colors"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${badgeColor(current)}`}
        title="Click to change status"
      >
        {current}
        <svg className="h-3 w-3 opacity-60" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {dropdown}
    </div>
  );
}
