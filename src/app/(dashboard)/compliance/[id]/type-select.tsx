"use client";

import { useState } from "react";
import { COMPLIANCE_TYPES } from "@/lib/compliance-types";

export function TypeSelect({ recordId, type }: { recordId: string; type: string }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(type);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (selected === type) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/compliance/${recordId}/type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selected }),
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
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={saving}
        className="rounded-lg border border-gray-300 bg-white py-1.5 pl-2.5 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {COMPLIANCE_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setSelected(type);
          setEditing(false);
        }}
        disabled={saving}
        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        Cancel
      </button>
    </div>
  );
}
