import { COMPLIANCE_CATEGORIES, categoryForType } from "@/lib/compliance-types";

/**
 * Does a held document satisfy a requirement? (Jenni, 2026-10-01: James Nye
 * showed CSCS and Right to Work "missing" on Action required and "unmet" when
 * assigned, with both on his Comps & Certs.)
 *
 * Requirements are often written as a CATEGORY — "CSCS", "Right to Work" —
 * while documents are saved as the specific type: "CSCS (Blue) — Skilled
 * Worker", "Passport — UK or Ireland". Every check compared names exactly, so
 * a category requirement could never be met by a real card.
 *
 * A requirement for a specific type ("CSCS (Gold) — …") still needs exactly
 * that type: a Green card does not meet a Gold requirement.
 */

const CATEGORY_NAMES = new Set<string>(COMPLIANCE_CATEGORIES.filter((c) => c !== "General"));

export function recordMatchesRequirement(requirementType: string, recordType: string): boolean {
  if (recordType === requirementType) return true;
  return CATEGORY_NAMES.has(requirementType) && categoryForType(recordType) === requirementType;
}

/** Best first: one good passport is enough even if an old one has expired. */
const STATUS_RANK: Record<string, number> = {
  Verified: 0,
  Expiring: 1,
  Pending: 2,
  "Non-Compliant": 3,
  Expired: 4,
};
const rank = (s: string) => STATUS_RANK[s] ?? 5;

export type HeldRecord = { type: string; status: string };

/** The best-status record meeting the requirement, or undefined if none does. */
export function bestRecordFor<R extends HeldRecord>(requirementType: string, records: readonly R[]): R | undefined {
  let best: R | undefined;
  for (const r of records) {
    if (!recordMatchesRequirement(requirementType, r.type)) continue;
    if (!best || rank(r.status) < rank(best.status)) best = r;
  }
  return best;
}

/** Status for the requirement, or "Missing" when nothing held meets it. */
export function requirementStatus(requirementType: string, records: readonly HeldRecord[]): string {
  return bestRecordFor(requirementType, records)?.status ?? "Missing";
}

/**
 * The stricter test used when placing someone on a job: a VERIFIED, in-date
 * matching record. No expiry date counts as in date, the same rule as Right to
 * Work coverage (rtw-flag.ts) — birth certificates and NI proof have none, and
 * a card whose date wasn't typed in shouldn't block a placement on its own.
 */
export function requirementMetForPlacement(
  requirementType: string,
  records: readonly { type: string; status: string; expiryDate: Date | null; indefiniteExpiry?: boolean | null }[],
  now: Date = new Date()
): boolean {
  return records.some(
    (r) =>
      recordMatchesRequirement(requirementType, r.type) &&
      r.status === "Verified" &&
      (r.indefiniteExpiry || r.expiryDate === null || r.expiryDate.getTime() > now.getTime())
  );
}
