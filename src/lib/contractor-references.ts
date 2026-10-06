/**
 * Employment references the worker adds in the app (optional, up to 3).
 * Moved off the public /apply form on 2026-10-06. Stored in ContractorReference.
 *
 * Every field is optional, but an entry with every field blank is dropped
 * rather than saved. Email and dates are validated only when given.
 */

export const MAX_REFERENCES = 3;
export const FIELD_MAX = 200;

export interface ReferenceInput {
  /** Present when editing an existing row; absent for a new one. */
  id?: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  jobRole: string;
  /** YYYY-MM-DD or "" */
  startDate: string;
  endDate: string;
}

export interface ReferenceData {
  id?: string;
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  jobRole: string | null;
  startDate: Date | null;
  endDate: Date | null;
}

const TEXT_FIELDS = ["companyName", "contactName", "email", "phone", "jobRole"] as const;
const FIELD_LABELS: Record<(typeof TEXT_FIELDS)[number], string> = {
  companyName: "company name",
  contactName: "contact name",
  email: "email",
  phone: "phone",
  jobRole: "job role",
};

export const EMPTY_REFERENCE: ReferenceInput = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  jobRole: "",
  startDate: "",
  endDate: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/** A calendar date from an <input type="date"> value, at UTC midnight. */
export function parseIsoDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  // Rejects 2026-02-30 etc., which Date would silently roll over.
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  return d;
}

export function isBlankReference(r: Partial<ReferenceInput>): boolean {
  return [...TEXT_FIELDS, "startDate", "endDate"].every((k) => !str(r[k as keyof ReferenceInput]));
}

/**
 * Validates the whole list the worker submitted. Blank entries are dropped
 * (an existing row submitted blank is therefore deleted by the caller).
 * Errors are labelled "Reference 2: …" using the worker's own numbering.
 */
export function parseReferences(
  raw: unknown
): { ok: true; value: ReferenceData[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(raw)) return { ok: false, errors: ["Invalid references."] };
  const errors: string[] = [];
  const out: ReferenceData[] = [];

  raw.forEach((item, i) => {
    const r = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const label = `Reference ${i + 1}`;
    const fields = Object.fromEntries(TEXT_FIELDS.map((k) => [k, str(r[k])])) as Record<
      (typeof TEXT_FIELDS)[number],
      string
    >;
    const startRaw = str(r.startDate);
    const endRaw = str(r.endDate);
    if (isBlankReference({ ...fields, startDate: startRaw, endDate: endRaw })) return;

    for (const k of TEXT_FIELDS) {
      if (fields[k].length > FIELD_MAX) errors.push(`${label}: the ${FIELD_LABELS[k]} is too long.`);
    }
    if (fields.email && !EMAIL_RE.test(fields.email)) errors.push(`${label}: the email address doesn't look right.`);
    if (fields.phone && !/^[0-9+()\-\s]{6,}$/.test(fields.phone)) errors.push(`${label}: the phone number doesn't look right.`);

    const startDate = startRaw ? parseIsoDate(startRaw) : null;
    const endDate = endRaw ? parseIsoDate(endRaw) : null;
    if (startRaw && !startDate) errors.push(`${label}: the start date isn't a valid date.`);
    if (endRaw && !endDate) errors.push(`${label}: the end date isn't a valid date.`);
    if (startDate && endDate && endDate < startDate) errors.push(`${label}: the end date is before the start date.`);

    const id = typeof r.id === "string" && r.id ? r.id : undefined;
    out.push({
      id,
      companyName: fields.companyName || null,
      contactName: fields.contactName || null,
      email: fields.email ? fields.email.toLowerCase() : null,
      phone: fields.phone || null,
      jobRole: fields.jobRole || null,
      startDate,
      endDate,
    });
  });

  if (out.length > MAX_REFERENCES) errors.push(`You can add up to ${MAX_REFERENCES} references.`);
  const ids = out.map((r) => r.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) errors.push("Invalid references.");
  return errors.length ? { ok: false, errors } : { ok: true, value: out };
}
