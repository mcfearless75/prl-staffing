// The red Right to Work flag on the contractor profile header, and the rules
// for the "Send RTW reminder" button beside it. Pure, so the rule is tested.
//
// Covered (Paul, 2026-09-27) = a VERIFIED Right to Work document that has NOT
// EXPIRED. "Expiring" counts: it is verified and still in date. The expiry date
// is checked directly, not just the status, because a status can lag behind.

import { COMPLIANCE_TYPE_GROUPS } from "@/lib/compliance-types";
import { isPlaceholderEmail } from "@/lib/placeholder-email";

const RTW_TYPES = new Set(COMPLIANCE_TYPE_GROUPS.find((g) => g.category === "Right to Work")?.types ?? []);

// Not proof on their own: a birth certificate needs NI proof with it (the
// portal's "birth-cert-ni" route), and a share code is checked online, not filed.
const NEEDS_NI_PROOF = "Birth Certificate";
const NI_PROOF = "National Insurance Proof";
const NOT_PROOF_ALONE = new Set(["Share Code", NEEDS_NI_PROOF]);

const VERIFIED_STATUSES = new Set(["Verified", "Expiring"]);

type Rec = { type: string; status: string; expiryDate: Date | null };

export interface RtwCoverage {
  covered: boolean;
  reason: string | null; // shown in the red flag when not covered
}

export function rtwCoverage(records: Rec[], now: Date = new Date()): RtwCoverage {
  const inDate = (r: Rec) => r.expiryDate === null || r.expiryDate.getTime() > now.getTime();
  const good = (r: Rec) => VERIFIED_STATUSES.has(r.status) && inDate(r);

  const rtw = records.filter((r) => RTW_TYPES.has(r.type));
  const valid = rtw.filter(good);

  if (valid.some((r) => !NOT_PROOF_ALONE.has(r.type))) return { covered: true, reason: null };
  if (valid.some((r) => r.type === NEEDS_NI_PROOF) && records.some((r) => r.type === NI_PROOF && good(r))) {
    return { covered: true, reason: null };
  }

  if (rtw.length === 0) return { covered: false, reason: "No Right to Work document on file" };
  if (rtw.some((r) => VERIFIED_STATUSES.has(r.status) && !inDate(r)) && !rtw.some((r) => r.status === "Pending")) {
    return { covered: false, reason: "Right to Work document has expired" };
  }
  if (valid.some((r) => r.type === NEEDS_NI_PROOF)) {
    return { covered: false, reason: "Birth certificate needs verified proof of NI number" };
  }
  return { covered: false, reason: "Right to Work document not verified yet" };
}

/** Minimum gap between RTW reminders to one person. */
export const RTW_REMINDER_GAP_HOURS = 24;

export function rtwReminderBlockReason(
  input: { covered: boolean; email: string | null; emailBounced: boolean; lastSentAt: Date | null },
  now: Date = new Date()
): string | null {
  if (input.covered) return "Right to Work is already covered";
  if (!input.email || isPlaceholderEmail(input.email)) return "No real email address on file";
  if (input.emailBounced) return "Their email address bounced — fix it first";
  if (input.lastSentAt && now.getTime() - input.lastSentAt.getTime() < RTW_REMINDER_GAP_HOURS * 3600 * 1000) {
    return "A Right to Work reminder was already sent in the last 24 hours";
  }
  return null;
}
