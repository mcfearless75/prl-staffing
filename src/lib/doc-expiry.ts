// Expiry dates on documents a WORKER uploads through the portal. PRL: "please
// upload all valid and in-date cards and certificates. Ensure the expiry date
// is clear." Staff uploads are not subject to this.

import { categoryForType } from "@/lib/compliance-types";

/** Types that never expire, so the upload form doesn't ask. */
const NO_EXPIRY_TYPES = new Set([
  "Birth Certificate",
  "CV",
  "IR35 Assessment",
  "Right to Work Check Record",
]);

/**
 * "required": the worker must give an expiry date or tick "This document has
 * no expiry date". "none": not asked (payroll/identity paperwork, CVs, …).
 */
export function expiryRule(type: string): "required" | "none" {
  if (NO_EXPIRY_TYPES.has(type)) return "none";
  if (categoryForType(type) === "Identity & Payroll") return "none";
  return "required";
}

export type ExpiryInput = { type: string; expiryDate: string | null; noExpiry: boolean };
export type ExpiryResult =
  | { ok: true; expiryDate: Date | null; indefinite: boolean }
  | { ok: false; error: string };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Server-side check on a worker upload. `today` is injectable for tests. */
export function validateWorkerExpiry(input: ExpiryInput, today: Date = new Date()): ExpiryResult {
  if (expiryRule(input.type) === "none") return { ok: true, expiryDate: null, indefinite: false };
  if (input.noExpiry) return { ok: true, expiryDate: null, indefinite: true };

  const raw = (input.expiryDate ?? "").trim();
  if (!raw) {
    return { ok: false, error: "Enter the expiry date, or tick 'This document has no expiry date'." };
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  if (!date || isNaN(date.getTime()) || date.getDate() !== Number(m![3])) {
    return { ok: false, error: "The expiry date isn't a valid date." };
  }
  if (date.getTime() < startOfDay(today).getTime()) {
    return { ok: false, error: "This document has expired — please upload an in-date one." };
  }
  return { ok: true, expiryDate: date, indefinite: false };
}
