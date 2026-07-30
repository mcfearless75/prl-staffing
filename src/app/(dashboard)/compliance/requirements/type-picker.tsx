"use client";

import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { COMPLIANCE_TYPE_GROUPS } from "@/lib/compliance-types";

/**
 * Document-type selector for a role's compliance checklist.
 *
 * The taxonomy has ~130 specific types across 16 categories, so a plain <select>
 * is unusable — and picking the wrong string matters, because requirements match
 * ComplianceRecord.type exactly. Search + category grouping keeps the real type
 * names visible rather than making staff guess at abbreviations.
 */
export function TypePicker({
  name = "types",
  initialSelected = [],
}: {
  name?: string;
  initialSelected?: string[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(initialSelected);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMPLIANCE_TYPE_GROUPS;
    return COMPLIANCE_TYPE_GROUPS.map((g) => ({
      category: g.category,
      types: g.types.filter(
        (t) => t.toLowerCase().includes(q) || g.category.toLowerCase().includes(q)
      ),
    })).filter((g) => g.types.length > 0);
  }, [query]);

  function toggle(type: string) {
    setSelected((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  return (
    <div className="space-y-3">
      {/* Selected types are posted as repeated form fields. */}
      {selected.map((t) => (
        <input key={t} type="hidden" name={name} value={t} />
      ))}

      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search document types — e.g. CSCS, NPORS, passport"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <span className="whitespace-nowrap text-xs font-medium text-gray-500">
          {selected.length} selected
        </span>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-lg bg-blue-50 p-3">
          {selected.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-blue-700 shadow-sm hover:bg-red-50 hover:text-red-700"
              title="Remove"
            >
              {t}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
        {groups.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            No document types match “{query}”.
          </p>
        )}
        {groups.map((g) => (
          <div key={g.category}>
            <div className="sticky top-0 bg-gray-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {g.category}
            </div>
            {g.types.map((t) => {
              const isOn = selected.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(t)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                    isOn ? "bg-blue-50 text-blue-900" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isOn ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"
                    }`}
                  >
                    {isOn && <Check className="h-3 w-3 text-white" />}
                  </span>
                  {t}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
