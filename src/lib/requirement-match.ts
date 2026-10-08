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

/**
 * Cards accepted IN PLACE OF a family. Jenni, 2026-10-01: Andrew Carroll holds
 * an ECS card "which is the same level, so he'll never have a CSCS". ECS (JIB
 * electrical), JIB, CPCS and NPORS are CSCS partner schemes — they carry the
 * CSCS logo and sites accept them where CSCS is asked for. NPORS added the same
 * day: groundworkers "can have CSCS or NPORS" (Balvinder Singh). Only the family-level "CSCS"
 * requirement takes them; a specific colour requirement still needs that card.
 */
export const ACCEPTED_INSTEAD: Record<string, { categories: string[]; types: string[] }> = {
  CSCS: { categories: ["CPCS", "NPORS"], types: ["ECS Card", "JIB Card"] },
};

/**
 * CSCS colours that rank, lowest first. A colour requirement is met by that
 * card "or higher" (Paul, 2026-10-01): a Joiner required to hold Blue who has
 * Gold or Black is not flagged. White (AQP/PQP), Red (trainee) and Yellow
 * (visitor) aren't on the ladder and only ever meet themselves.
 */
export const CSCS_LADDER = [
  "CSCS (Green) — Labourer",
  "CSCS (Blue) — Skilled Worker",
  "CSCS (Gold) — Advanced Craft / Supervisor",
  "CSCS (Black) — Manager",
] as const;

function meetsOnLadder(requirementType: string, recordType: string): boolean {
  const need = (CSCS_LADDER as readonly string[]).indexOf(requirementType);
  const held = (CSCS_LADDER as readonly string[]).indexOf(recordType);
  return need >= 0 && held >= need;
}

export function recordMatchesRequirement(requirementType: string, recordType: string): boolean {
  if (recordType === requirementType) return true;
  if (meetsOnLadder(requirementType, recordType)) return true;
  if (!CATEGORY_NAMES.has(requirementType)) return false;
  const category = categoryForType(recordType);
  if (category === requirementType) return true;
  const alt = ACCEPTED_INSTEAD[requirementType];
  return !!alt && (alt.types.includes(recordType) || alt.categories.includes(category));
}

/**
 * A requirement as stored: its type plus any "any one of these will do"
 * alternatives (Jenni, 2026-10-01: "it could be either NPORS or CSCS"). A bare
 * string is a requirement with no alternatives.
 */
export type RequirementSpec = string | { type: string; alternatives?: readonly string[] | null };

/** Every document type that meets the requirement: its own type, then the alternatives. */
export function specTypes(spec: RequirementSpec): string[] {
  return typeof spec === "string" ? [spec] : [spec.type, ...(spec.alternatives ?? [])];
}

/** "NPORS or CPCS" — how an either/or requirement is shown everywhere. */
export function requirementLabel(spec: RequirementSpec): string {
  return specTypes(spec).join(" or ");
}

/** Does this held document meet the requirement (its type or any alternative)? */
export function recordMeetsSpec(spec: RequirementSpec, recordType: string): boolean {
  return specTypes(spec).some((t) => recordMatchesRequirement(t, recordType));
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
export function bestRecordFor<R extends HeldRecord>(requirement: RequirementSpec, records: readonly R[]): R | undefined {
  let best: R | undefined;
  for (const r of records) {
    if (!recordMeetsSpec(requirement, r.type)) continue;
    if (!best || rank(r.status) < rank(best.status)) best = r;
  }
  return best;
}

/** Status for the requirement, or "Missing" when nothing held meets it. */
export function requirementStatus(requirement: RequirementSpec, records: readonly HeldRecord[]): string {
  return bestRecordFor(requirement, records)?.status ?? "Missing";
}

/**
 * The stricter test used when placing someone on a job: a VERIFIED, in-date
 * matching record. No expiry date counts as in date, the same rule as Right to
 * Work coverage (rtw-flag.ts) — birth certificates and NI proof have none, and
 * a card whose date wasn't typed in shouldn't block a placement on its own.
 */
export function requirementMetForPlacement(
  requirement: RequirementSpec,
  records: readonly { type: string; status: string; expiryDate: Date | null; indefiniteExpiry?: boolean | null }[],
  now: Date = new Date()
): boolean {
  return records.some(
    (r) =>
      recordMeetsSpec(requirement, r.type) &&
      r.status === "Verified" &&
      (r.indefiniteExpiry || r.expiryDate === null || r.expiryDate.getTime() > now.getTime())
  );
}
