"use client";

import { useState, useRef, useEffect } from "react";
import { Download, MoreVertical } from "lucide-react";

export function RatesActions({ query }: { query: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const suffix = query ? `?${query}` : "";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
        Actions
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <a
            href={`/api/rates/export${suffix}`}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4 text-gray-400" />
            Export Rates
          </a>
          <a
            href={`/api/rates/awr-report${suffix}`}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4 text-gray-400" />
            Export AWR Report
          </a>
        </div>
      )}
    </div>
  );
}
