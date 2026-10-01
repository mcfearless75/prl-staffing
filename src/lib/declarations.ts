// Health & declarations (App Invite Form: medical, drugs & alcohol, criminal
// record). Decisions (Paul, 2026-09-27): minimal Yes/No answers, admins only,
// erased 12 months after the worker leaves. Pure: shared by the portal API,
// the admin view and the retention run, and pinned by tests.

export type YesNo = "Yes" | "No";

/** Everything here is stored ENCRYPTED (src/lib/sensitive-crypto.ts). */
export interface Declarations {
  hasMedicalCondition?: YesNo;
  medicalConditions?: string; // only kept when hasMedicalCondition is "Yes"
  canTakeDaTest?: YesNo;
  hasUnspentConviction?: YesNo;
  convictionDetails?: string; // only kept when hasUnspentConviction is "Yes"
  declarationTrue?: boolean;
  /**
   * The two criminal-record questions on the public /apply form, which used to
   * sit in plain Contractor.notes and go out in the notification email. Kept
   * as asked; the portal question (unspent convictions) supersedes them.
   */
  applyAnswers?: { hasCriminalConviction?: string; hasPreviousConvictions?: string };
}

export const MAX_MEDICAL_TEXT = 1000;
export const MAX_CONVICTION_TEXT = 1000;

function yesNo(v: unknown): YesNo | undefined {
  return v === "Yes" || v === "No" ? v : undefined;
}

/** Keeps only known fields and drops free text the answer doesn't call for (data minimisation). */
export function normaliseDeclarations(raw: Record<string, unknown>): Declarations {
  const hasMedicalCondition = yesNo(raw.hasMedicalCondition);
  const text = typeof raw.medicalConditions === "string" ? raw.medicalConditions.trim().slice(0, MAX_MEDICAL_TEXT) : "";
  const hasUnspentConviction = yesNo(raw.hasUnspentConviction);
  const convictions =
    typeof raw.convictionDetails === "string" ? raw.convictionDetails.trim().slice(0, MAX_CONVICTION_TEXT) : "";
  return {
    hasMedicalCondition,
    medicalConditions: hasMedicalCondition === "Yes" && text ? text : undefined,
    canTakeDaTest: yesNo(raw.canTakeDaTest),
    hasUnspentConviction,
    // Erica, 2026-10-01: a notes box when they answer Yes. Same rule as medical.
    convictionDetails: hasUnspentConviction === "Yes" && convictions ? convictions : undefined,
    declarationTrue: raw.declarationTrue === true,
  };
}

/** Labels of what's still unanswered, in form order. */
export function missingDeclarations(d: Declarations): string[] {
  const missing: string[] = [];
  if (!d.hasMedicalCondition) missing.push("Medical conditions");
  if (d.hasMedicalCondition === "Yes" && !d.medicalConditions) missing.push("List of medical conditions");
  if (!d.canTakeDaTest) missing.push("Drugs and alcohol test");
  if (!d.hasUnspentConviction) missing.push("Criminal convictions");
  if (d.hasUnspentConviction === "Yes" && !d.convictionDetails) missing.push("Details of the conviction(s)");
  if (!d.declarationTrue) missing.push("Declaration");
  return missing;
}

/** PRL: "If No is selected then they cannot go further" — a soft block, the office calls them. */
export function daTestBlocked(d: Declarations): boolean {
  return d.canTakeDaTest === "No";
}

/** Counts as done for the "complete your profile" banner. */
export function declarationsComplete(d: Declarations): boolean {
  return missingDeclarations(d).length === 0 && !daTestBlocked(d);
}

// ── Retention ────────────────────────────────────────────────────────────────

export const RETENTION_MONTHS = 12;

/**
 * Erase once the worker has been gone for RETENTION_MONTHS. "Gone" = Inactive
 * with no live work, measured from the latest of: leaving date, last job's end,
 * and the answers themselves (so a fresh declaration is never erased at once).
 */
export function retentionDue(
  c: { status: string; hasLiveWork: boolean; leavingDate: Date | null; lastJobEnd: Date | null; declaredAt: Date },
  now: Date = new Date()
): boolean {
  if (c.status !== "Inactive" || c.hasLiveWork) return false;
  const times = [c.leavingDate, c.lastJobEnd, c.declaredAt].filter((d): d is Date => d !== null).map((d) => d.getTime());
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
  return Math.max(...times) < cutoff.getTime();
}
