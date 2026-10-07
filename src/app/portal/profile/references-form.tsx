"use client";

import { useEffect, useImperativeHandle, useState, type Ref } from "react";
import { Users, Plus, Trash2 } from "lucide-react";
import { EMPTY_REFERENCE, MAX_REFERENCES, type ReferenceInput } from "@/lib/contractor-references";
import type { SectionHandle } from "./section-handle";

const inputCls =
  "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const FIELDS: { key: keyof ReferenceInput; label: string; type: string; autoComplete?: string }[] = [
  { key: "companyName", label: "Company name", type: "text", autoComplete: "off" },
  { key: "contactName", label: "Contact name", type: "text", autoComplete: "off" },
  { key: "email", label: "Email", type: "email", autoComplete: "off" },
  { key: "phone", label: "Phone", type: "tel", autoComplete: "off" },
  { key: "jobRole", label: "Your job role", type: "text", autoComplete: "off" },
  { key: "startDate", label: "Start date", type: "date" },
  { key: "endDate", label: "End date", type: "date" },
];

/**
 * References (optional) — up to 3 previous employers. Every field is optional;
 * an entry left completely blank is simply not saved.
 */
export function ReferencesForm({ ref }: { ref?: Ref<SectionHandle<ReferenceInput[]>> }) {
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [refs, setRefs] = useState<ReferenceInput[]>([]);
  const [baseline, setBaseline] = useState<ReferenceInput[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portal/references")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) return setState("unavailable");
        const data = (await res.json()) as { references: ReferenceInput[] };
        setRefs(data.references);
        setBaseline(data.references);
        setState("ready");
      })
      .catch(() => !cancelled && setState("unavailable"));
    return () => {
      cancelled = true;
    };
  }, []);

  function update(i: number, key: keyof ReferenceInput, value: string) {
    setRefs((prev) => prev.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
    setDone(false);
  }

  async function save(next: ReferenceInput[] = refs) {
    setBusy(true);
    setError("");
    setDone(false);
    try {
      const res = await fetch("/api/portal/references", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ references: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save. Please try again.");
      } else {
        setRefs(data.references);
        setBaseline(data.references);
        setDone(true);
      }
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  useImperativeHandle(ref, () => ({
    values: () => (state === "unavailable" ? null : refs),
    dirty: () => JSON.stringify(refs) !== JSON.stringify(baseline),
    async save() {
      if (state !== "ready" || JSON.stringify(refs) === JSON.stringify(baseline)) return { ok: true };
      try {
        const res = await fetch("/api/portal/references", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ references: refs }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: data.error || "Could not save your references." };
        setRefs(data.references);
        setBaseline(data.references);
        return { ok: true };
      } catch {
        return { ok: false, error: "Could not save your references. Check your connection and try again." };
      }
    },
  }), [state, refs, baseline]);

  function remove(i: number) {
    const target = refs[i];
    const next = refs.filter((_, j) => j !== i);
    // A saved reference is deleted on the server straight away; an unsaved one just disappears.
    if (target.id) {
      if (!confirm("Remove this reference?")) return;
      void save(next);
    } else {
      setRefs(next);
    }
  }

  if (state === "unavailable") return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Users className="h-4 w-4 text-gray-400" /> References (optional)
        </h2>
      </div>

      {state === "loading" ? (
        <p className="px-4 py-6 text-center text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-4 p-4">
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            You can give us up to {MAX_REFERENCES} previous employers we may contact for a reference. Fill in as much
            as you know — every field is optional.
          </p>

          {refs.length === 0 && <p className="text-center text-sm text-gray-500">No references added.</p>}

          {refs.map((r, i) => (
            <fieldset key={r.id ?? `new-${i}`} className="space-y-3 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <legend className="text-sm font-medium text-gray-900">Reference {i + 1}</legend>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  disabled={busy}
                  className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {FIELDS.map((f) => (
                  <label key={f.key} className="block text-sm text-gray-700">
                    {f.label}
                    <input
                      type={f.type}
                      value={r[f.key] ?? ""}
                      onChange={(e) => update(i, f.key, e.target.value)}
                      maxLength={200}
                      autoComplete={f.autoComplete}
                      className={inputCls}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          {refs.length < MAX_REFERENCES && (
            <button
              type="button"
              onClick={() => {
                setRefs((prev) => [...prev, { ...EMPTY_REFERENCE }]);
                setDone(false);
              }}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" /> Add a reference
            </button>
          )}

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {done && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Saved.</p>
          )}

        </div>
      )}
    </div>
  );
}
