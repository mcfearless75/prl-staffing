"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { COMPLIANCE_TYPE_GROUPS } from "@/lib/compliance-types";
import { Search } from "lucide-react";

export function TypeSelect({ recordId, type }: { recordId: string; type: string }) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) searchRef.current?.focus();
  }, [editing]);

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

  async function save(next: string) {
    if (next === type) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/compliance/${recordId}/type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to change type. Please try again.");
        setSaving(false);
        return;
      }
      window.location.reload();
    } catch {
      alert("Network error. Please try again.");
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-1 flex items-center gap-2">
        <span className="text-sm text-gray-900">{type}</span>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setEditing(true);
          }}
          className="text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1 space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search document types…"
          disabled={saving}
          className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white">
        {groups.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-gray-400">No matching types</p>
        ) : (
          groups.map((g) => (
            <div key={g.category}>
              <p className="sticky top-0 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {g.category}
              </p>
              {g.types.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={saving}
                  onClick={() => save(t)}
                  className={`block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-blue-50 disabled:opacity-50 ${
                    t === type ? "bg-blue-50 font-medium text-blue-700" : "text-gray-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => setEditing(false)}
        disabled={saving}
        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        {saving ? "Saving…" : "Cancel"}
      </button>
    </div>
  );
}
