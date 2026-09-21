/**
 * Identifying whether an applicant is already in PRISM.
 *
 * Written after a new application was accepted for someone who already had a
 * contractor record. `Contractor.email` is unique, so the database catches the
 * one case where the applicant reuses the same address — but people apply twice
 * from a new address, or the office types one in on their behalf, and nothing
 * looked any further than the email column.
 *
 * Everything here is deliberately pure so the rules can be exercised without
 * Postgres: the same functions back the live check on /apply, the duplicate
 * warning on the team notification, and scripts/find-duplicate-contractors.mjs.
 *
 * The hard part is not matching, it is NOT matching. Free-text identity columns
 * in this database are full of "N/A", "TBC", "none" and "0000000000", and a
 * naive equality check groups every one of those people together as the same
 * person. Each normaliser below therefore returns null for anything that is not
 * a plausible identifier, and a null never matches anything — including another
 * null.
 */

export type DuplicateReason = "email" | "ni" | "phone" | "name-dob" | "name";

/** How much weight to put on a match. Drives whether we block or merely warn. */
export type DuplicateConfidence = "exact" | "strong" | "possible";

export interface DuplicateCandidate {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  niNumber?: string | null;
  dateOfBirth?: Date | string | null;
}

export interface DuplicateMatch<T extends DuplicateCandidate> {
  record: T;
  reasons: DuplicateReason[];
  confidence: DuplicateConfidence;
}

/* ------------------------------ normalisers ------------------------------ */

export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  // Not a validator — just enough to reject the placeholders.
  return v.includes("@") && v.length > 3 ? v : null;
}

/**
 * A National Insurance number, or null.
 *
 * Shape is two letters, six digits, optional suffix letter. Anything else —
 * "N/A", "TBC", "pending", a partial — is not an identifier and must never be
 * treated as one: there are enough records carrying the same placeholder to
 * merge a large slice of the workforce into one person.
 */
export function normaliseNI(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z]{2}[0-9]{6}[A-D]?$/.test(v) ? v : null;
}

/**
 * A UK phone number reduced to a comparable form, or null.
 *
 * +44 7700 900123, 07700 900123 and 447700900123 are one number written three
 * ways. Repdigit strings ("0000000000") are placeholders, not numbers.
 */
export function normalisePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let digits = value.replace(/[^0-9]/g, "");
  if (digits.startsWith("44") && digits.length >= 12) digits = "0" + digits.slice(2);
  if (digits.length < 10) return null;
  if (/^(\d)\1+$/.test(digits)) return null;
  return digits;
}

/** A person's name reduced to letters, or null when there is nothing to compare. */
export function normaliseName(first: unknown, last: unknown): string | null {
  const clean = (v: unknown) =>
    typeof v === "string" ? v.toLowerCase().replace(/[^a-z]/g, "") : "";
  const f = clean(first);
  const l = clean(last);
  // A surname alone is far too weak; require both halves.
  return f && l ? `${f} ${l}` : null;
}

/** A date of birth as YYYY-MM-DD, or null. */
export function normaliseDob(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  // A birth date cannot be in the future, and nothing before 1900 is a living
  // applicant. Note that 1970-01-01 is deliberately ACCEPTED: it is both the
  // Unix epoch and a real birthday, and rejecting a genuine one to catch a
  // sentinel this codebase never writes would lock that person out of /apply.
  const year = d.getUTCFullYear();
  if (year < 1900 || d.getTime() > Date.now()) return null;
  return d.toISOString().slice(0, 10);
}

/* -------------------------------- matching ------------------------------- */

/** Ordered strongest first — the first reason found decides the confidence. */
const CONFIDENCE_BY_REASON: Record<DuplicateReason, DuplicateConfidence> = {
  email: "exact",
  ni: "exact",
  "name-dob": "strong",
  phone: "strong",
  name: "possible",
};

const REASON_ORDER: DuplicateReason[] = ["email", "ni", "name-dob", "phone", "name"];

/**
 * Why, if at all, two people look like the same person.
 *
 * Returns every reason that applies, not just the first, because the office
 * needs to see "same NI AND same name" differently from "same name only".
 */
export function matchReasons(
  a: DuplicateCandidate,
  b: DuplicateCandidate
): DuplicateReason[] {
  const reasons: DuplicateReason[] = [];

  const emailA = normaliseEmail(a.email);
  if (emailA && emailA === normaliseEmail(b.email)) reasons.push("email");

  const niA = normaliseNI(a.niNumber);
  if (niA && niA === normaliseNI(b.niNumber)) reasons.push("ni");

  const nameA = normaliseName(a.firstName, a.lastName);
  const nameMatches = Boolean(nameA) && nameA === normaliseName(b.firstName, b.lastName);

  const dobA = normaliseDob(a.dateOfBirth);
  if (nameMatches && dobA && dobA === normaliseDob(b.dateOfBirth)) reasons.push("name-dob");

  const phoneA = normalisePhone(a.phone);
  if (phoneA && phoneA === normalisePhone(b.phone)) reasons.push("phone");

  // Only worth reporting on its own; "name-dob" already covers the stronger case.
  if (nameMatches && !reasons.includes("name-dob")) reasons.push("name");

  return REASON_ORDER.filter((r) => reasons.includes(r));
}

/** The strongest confidence implied by a set of reasons. */
export function confidenceOf(reasons: DuplicateReason[]): DuplicateConfidence {
  for (const reason of REASON_ORDER) {
    if (reasons.includes(reason)) return CONFIDENCE_BY_REASON[reason];
  }
  return "possible";
}

/**
 * Every existing record that looks like the same person as `candidate`,
 * strongest match first.
 *
 * `existing` is whatever set the caller narrowed to — the API passes a targeted
 * query, the audit script passes the whole book.
 */
export function findPotentialDuplicates<T extends DuplicateCandidate>(
  candidate: DuplicateCandidate,
  existing: T[]
): DuplicateMatch<T>[] {
  const rank: Record<DuplicateConfidence, number> = { exact: 0, strong: 1, possible: 2 };
  return existing
    .map((record) => ({ record, reasons: matchReasons(candidate, record) }))
    .filter((m) => m.reasons.length > 0)
    .map((m) => ({ ...m, confidence: confidenceOf(m.reasons) }))
    .sort((x, y) => rank[x.confidence] - rank[y.confidence]);
}

/** One line an office reader can act on, e.g. "same NI number, same name". */
export function describeReasons(reasons: DuplicateReason[]): string {
  const text: Record<DuplicateReason, string> = {
    email: "same email address",
    ni: "same NI number",
    "name-dob": "same name and date of birth",
    phone: "same phone number",
    name: "same name",
  };
  return reasons.map((r) => text[r]).join(", ");
}
