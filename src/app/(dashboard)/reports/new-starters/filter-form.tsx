"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

const inputClass =
  "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

interface Option {
  value: string;
  label: string;
}

/**
 * Checkbox dropdown. The checkboxes stay in the DOM while the panel is closed,
 * so they submit with the surrounding GET form as repeated `name=value` pairs.
 */
function MultiSelect({
  name,
  label,
  allLabel,
  options,
  initial,
}: {
  name: string;
  label: string;
  allLabel: string;
  options: Option[];
  initial: string[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(initial);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? "1 selected")
        : `${selected.length} selected`;

  const toggle = (value: string) =>
    setSelected((s) => (s.includes(value) ? s.filter((v) => v !== value) : [...s, value]));

  return (
    <div ref={ref} className="relative">
      <span className="block text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`${inputClass} flex items-center justify-between text-left`}
      >
        <span className={`truncate ${selected.length === 0 ? "text-gray-500" : ""}`}>{summary}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
      </button>

      <div
        className={`absolute z-20 mt-1 w-full min-w-[16rem] rounded-lg border border-gray-200 bg-white shadow-lg ${open ? "" : "hidden"}`}
      >
        <div className="border-b border-gray-100 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label={`Search ${label}`}
              className="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <button type="button" onClick={() => setSelected([])} className="font-medium text-blue-600 hover:text-blue-800">
              Clear ({allLabel.toLowerCase()})
            </button>
            <span className="text-gray-400">{selected.length} selected</span>
          </div>
        </div>
        <ul className="max-h-64 overflow-y-auto py-1">
          {options.length === 0 && <li className="px-3 py-2 text-sm text-gray-500">Nothing to choose from.</li>}
          {options.map((o) => (
            <li key={o.value} className={visible.includes(o) ? "" : "hidden"}>
              <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50">
                <input
                  type="checkbox"
                  name={name}
                  value={o.value}
                  checked={selected.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="truncate">{o.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function NewStarterFilterForm({
  companies,
  roles,
  initial,
}: {
  companies: { id: string; name: string }[];
  roles: string[];
  initial: { from: string; to: string; companyIds: string[]; roles: string[] };
}) {
  return (
    <form method="get" className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <div>
          <label htmlFor="from" className="block text-sm font-medium text-gray-700">
            Start date from <span className="text-red-500">*</span>
          </label>
          <input type="date" id="from" name="from" required defaultValue={initial.from} className={inputClass} />
        </div>
        <div>
          <label htmlFor="to" className="block text-sm font-medium text-gray-700">
            To <span className="font-normal text-gray-400">(blank = today)</span>
          </label>
          <input type="date" id="to" name="to" defaultValue={initial.to} className={inputClass} />
        </div>
        <MultiSelect
          name="company"
          label="Company"
          allLabel="All companies"
          options={companies.map((c) => ({ value: c.id, label: c.name }))}
          initial={initial.companyIds}
        />
        <MultiSelect
          name="role"
          label="Job role"
          allLabel="All roles"
          options={roles.map((r) => ({ value: r, label: r }))}
          initial={initial.roles}
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          View
        </button>
      </div>
    </form>
  );
}
