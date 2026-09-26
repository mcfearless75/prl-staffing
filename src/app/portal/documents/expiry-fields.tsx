"use client";

import { expiryRule } from "@/lib/doc-expiry";

export type ExpiryValue = { expiryDate: string; noExpiry: boolean };
export const EMPTY_EXPIRY: ExpiryValue = { expiryDate: "", noExpiry: false };

/** Whether the upload can go ahead as far as the expiry date is concerned. */
export function expiryReady(type: string, v: ExpiryValue): boolean {
  return !type || expiryRule(type) === "none" || v.noExpiry || !!v.expiryDate;
}

/** Append the expiry fields the upload API expects from a worker. */
export function appendExpiry(form: FormData, v: ExpiryValue) {
  if (v.noExpiry) form.append("noExpiry", "true");
  else if (v.expiryDate) form.append("expiryDate", v.expiryDate);
}

/**
 * Expiry date input for card/certificate uploads — required unless the worker
 * ticks "no expiry". Renders nothing for types that never expire.
 */
export function ExpiryFields({
  type,
  value,
  onChange,
  compact = false,
}: {
  type: string;
  value: ExpiryValue;
  onChange: (v: ExpiryValue) => void;
  compact?: boolean;
}) {
  if (!type || expiryRule(type) === "none") return null;
  const today = new Date().toISOString().split("T")[0];
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <label className="block text-xs font-medium text-gray-700">
        Expiry date <span className="text-red-500">*</span>
      </label>
      <input
        type="date"
        min={today}
        value={value.expiryDate}
        disabled={value.noExpiry}
        onChange={(e) => onChange({ ...value, expiryDate: e.target.value })}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
      />
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={value.noExpiry}
          onChange={(e) => onChange({ expiryDate: "", noExpiry: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        This document has no expiry date
      </label>
    </div>
  );
}
