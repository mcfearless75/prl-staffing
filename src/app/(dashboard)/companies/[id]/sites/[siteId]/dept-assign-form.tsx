"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { quickAssignContractor } from "../actions";

type Contractor = { id: string; firstName: string; lastName: string };

interface Props {
  companyId: string;
  siteId: string;
  deptId: string;
  contractors: Contractor[];
}

export function DeptAssignForm({ companyId, siteId, deptId, contractors }: Props) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [state, formAction, pending] = useActionState(quickAssignContractor, null);

  const filtered = query.trim().length === 0
    ? []
    : contractors.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (state?.type === "ok" || state?.type === "moved") {
      setQuery("");
      setSelectedId("");
    }
  }, [state]);

  function handleSelect(c: Contractor) {
    setQuery(`${c.firstName} ${c.lastName}`);
    setSelectedId(c.id);
    setOpen(false);
  }

  const bannerStyle =
    state?.type === "duplicate" || state?.type === "error"
      ? "bg-amber-50 border border-amber-300 text-amber-800"
      : state?.type === "moved"
        ? "bg-blue-50 border border-blue-300 text-blue-800"
        : "bg-green-50 border border-green-300 text-green-800";

  return (
    <div className="mb-4">
      {state?.message && (
        <div className={`mb-2 rounded-lg px-3 py-2 text-xs font-medium ${bannerStyle}`}>
          {state.message}
        </div>
      )}
      <form action={formAction} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        {/* Hidden routing fields */}
        <input type="hidden" name="companyId" value={companyId} />
        <input type="hidden" name="siteId" value={siteId} />
        <input type="hidden" name="deptId" value={deptId} />
        <input type="hidden" name="contractorId" value={selectedId} />

        {/* Searchable contractor picker */}
        <div ref={containerRef} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedId("");
              setOpen(true);
            }}
            onFocus={() => { if (query) setOpen(true); }}
            placeholder="Type to search contractor"
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          {open && filtered.length > 0 && (
            <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {filtered.map((c) => (
                <li
                  key={c.id}
                  onMouseDown={() => handleSelect(c)}
                  className="cursor-pointer px-3 py-2 text-sm text-gray-900 hover:bg-blue-50 hover:text-blue-700"
                >
                  {c.firstName} {c.lastName}
                </li>
              ))}
            </ul>
          )}
          {open && query.trim().length > 0 && filtered.length === 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 shadow-lg">
              No match
            </div>
          )}
        </div>

        <input
          name="role"
          required
          placeholder="Role (e.g. Rigger)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          name="startDate"
          type="date"
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!selectedId || pending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {pending ? "Assigning..." : "Assign"}
        </button>
      </form>
    </div>
  );
}
