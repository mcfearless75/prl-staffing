"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * RolePicker — shared searchable multi-select for JobRole assignment.
 *
 * EMIT CONTRACT (read this before wiring a new consumer):
 *   Selected role ids are emitted as MULTIPLE HIDDEN <input type="hidden">
 *   elements, all sharing the same `name` prop value. On submit, read them
 *   server-side with:
 *
 *     const roleIds = formData.getAll(name) as string[];
 *
 *   There is no single JSON-encoded input — every selected id gets its own
 *   hidden input, so `formData.getAll("jobRoleIds")` returns a string[] of
 *   the currently-selected JobRole ids (empty array if none selected).
 */

interface RolePickerOption {
  id: string;
  name: string;
}

interface RolePickerProps {
  options: RolePickerOption[];
  selectedIds: string[];
  name: string;
  /**
   * Optional. The hidden-input contract above only reaches the server for
   * consumers that submit a <form> (server actions / FormData). The public
   * /apply form is a client component that POSTs JSON via fetch, so it needs
   * the selection in React state instead. Existing consumers omit this and are
   * unaffected.
   */
  onSelectionChange?: (ids: string[]) => void;
}

export function RolePicker({ options, selectedIds, name, onSelectionChange }: RolePickerProps) {
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [filter, setFilter] = useState("");

  // In an effect rather than inside the toggle handlers, so the parent is never
  // updated during this component's render.
  useEffect(() => {
    onSelectionChange?.(selected);
    // onSelectionChange is intentionally not a dependency — callers commonly
    // pass an inline arrow, which would re-fire this on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const optionsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of options) map.set(option.id, option.name);
    return map;
  }, [options]);

  const filteredOptions = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.name.toLowerCase().includes(query));
  }, [options, filter]);

  function toggleRole(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((roleId) => roleId !== id) : [...prev, id]
    );
  }

  function removeRole(id: string) {
    setSelected((prev) => prev.filter((roleId) => roleId !== id));
  }

  return (
    <div>
      {/* Emit contract: one hidden input per selected id, all named `${name}`. */}
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
            >
              {optionsById.get(id) ?? id}
              <button
                type="button"
                onClick={() => removeRole(id)}
                aria-label={`Remove ${optionsById.get(id) ?? id}`}
                className="text-blue-500 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter job roles..."
        aria-label="Filter job roles"
        className="mb-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-2">
        {filteredOptions.length === 0 && (
          <p className="px-1 py-1 text-sm text-gray-500">No matching roles</p>
        )}
        {filteredOptions.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleRole(option.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {option.name}
            </label>
          );
        })}
      </div>
    </div>
  );
}
