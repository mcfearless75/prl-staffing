/**
 * New Starter Report — the list PRL send to the payroll provider (New Red
 * Planet) of everyone starting work in a date range.
 *
 * This module is the pure half: filter parsing, date-range defaulting, row
 * shaping and the export formats' text. The database query lives in
 * `new-starter-query.ts`. The page, CSV, PDF and email all go through both,
 * so the four outputs can never disagree about who is on the list.
 *
 * No imports that touch Prisma, so the rules are testable without Postgres.
 */

import { addDaysToKey, londonDayKey, parseDayKey } from "@/lib/london-day";
import { fullName } from "@/lib/contractor-name";
import { isPlaceholderEmail } from "@/lib/placeholder-email";
import { resolveRole } from "@/lib/role-normalisation";

/** Staff roles allowed to run this report. It carries NI numbers. */
export const NEW_STARTER_REPORT_ROLES = ["admin", "manager"] as const;

export function canRunNewStarterReport(user: { userType?: string | null; role?: string | null } | null | undefined): boolean {
  if (!user || user.userType !== "staff") return false;
  return (NEW_STARTER_REPORT_ROLES as readonly string[]).includes(user.role ?? "");
}

/** Longest range one run may cover — a year is far beyond any payroll batch. */
export const MAX_RANGE_DAYS = 366;

export interface NewStarterFilters {
  /** First London calendar day, inclusive, `YYYY-MM-DD`. */
  from: string;
  /** Last London calendar day, inclusive, `YYYY-MM-DD`. */
  to: string;
  /** True when `to` was left blank and defaulted to today. */
  toDefaulted: boolean;
  /** Company ids. Empty means every company. */
  companyIds: string[];
  /** Canonical role names. Empty means every role. */
  roles: string[];
}

export type ParseResult = { ok: true; filters: NewStarterFilters } | { ok: false; error: string };

/** Minimal read side of URLSearchParams, so a page's searchParams record can be adapted. */
export interface ParamSource {
  get(name: string): string | null;
  getAll(name: string): string[];
}

/** Adapts a Next.js page `searchParams` record to URLSearchParams. */
export function toSearchParams(record: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, v);
  }
  return params;
}

function cleanList(values: string[], max: number): string[] {
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim().slice(0, 200);
    if (v && !out.includes(v)) out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Reads the filter form. FROM is required; a blank TO means today in UK time
 * (not server time — the server runs in UTC, which is yesterday for the first
 * hour of every BST day).
 */
export function parseNewStarterFilters(params: ParamSource, now: Date = new Date()): ParseResult {
  const fromRaw = params.get("from")?.trim() ?? "";
  if (!fromRaw) return { ok: false, error: "Choose a start date to report from." };
  const from = parseDayKey(fromRaw);
  if (!from) return { ok: false, error: "The 'from' date is not a valid date." };

  const toRaw = params.get("to")?.trim() ?? "";
  let to: string;
  let toDefaulted = false;
  if (toRaw) {
    const parsed = parseDayKey(toRaw);
    if (!parsed) return { ok: false, error: "The 'to' date is not a valid date." };
    to = parsed;
  } else {
    to = londonDayKey(now);
    toDefaulted = true;
  }

  if (to < from) {
    return {
      ok: false,
      error: toDefaulted
        ? "The 'from' date is in the future. Enter a 'to' date to report on upcoming starters."
        : "The 'to' date is before the 'from' date.",
    };
  }
  if (addDaysToKey(from, MAX_RANGE_DAYS) <= to) {
    return { ok: false, error: `The date range can be at most ${MAX_RANGE_DAYS} days.` };
  }

  return {
    ok: true,
    filters: {
      from,
      to,
      toDefaulted,
      companyIds: cleanList(params.getAll("company"), 200),
      roles: cleanList(params.getAll("role"), 200),
    },
  };
}

/** The filters as a query string, for export links and the email request. */
export function filtersToQuery(f: NewStarterFilters): string {
  const params = new URLSearchParams();
  params.set("from", f.from);
  params.set("to", f.toDefaulted ? "" : f.to);
  for (const c of f.companyIds) params.append("company", c);
  for (const r of f.roles) params.append("role", r);
  return params.toString();
}

/** The canonical role an assignment counts as — same resolution compliance uses. */
export function canonicalRoleFor(assignmentRole: string | null | undefined, jobTitle: string | null | undefined): string | null {
  return resolveRole(assignmentRole, jobTitle).canonical;
}

/**
 * True when the assignment's role is one of the chosen roles. Matched on the
 * canonical role, so a filter for "Joiner" picks up "Joiner Nights" and a
 * blank assignment role falls back to the contractor's job title.
 */
export function roleMatches(
  selected: string[],
  assignmentRole: string | null | undefined,
  jobTitle: string | null | undefined
): boolean {
  if (selected.length === 0) return true;
  const canonical = canonicalRoleFor(assignmentRole, jobTitle);
  if (!canonical) return false;
  const key = canonical.toLowerCase();
  return selected.some((s) => s.toLowerCase() === key);
}

/** One assignment as read from the database. */
export interface NewStarterSource {
  assignmentId: string;
  startDate: Date;
  role: string | null;
  companyName: string;
  contractor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string | null;
    niNumber: string | null;
    jobTitle: string | null;
  };
}

export interface NewStarterRow {
  assignmentId: string;
  contractorId: string;
  name: string;
  phone: string;
  email: string;
  niNumber: string;
  /** DD/MM/YYYY, London calendar day. */
  startDate: string;
  /** `YYYY-MM-DD`, for sorting. */
  startDayKey: string;
  company: string;
  role: string;
}

function ukDate(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * NI numbers are stored as typed, so "ab 12 34 56 c" and "AB123456C" both
 * occur. Payroll wants the compact upper-case form; the value is not masked —
 * this report exists to hand the real number to payroll.
 */
export function formatNiNumber(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, "").toUpperCase();
}

/**
 * Shapes database rows for every output, ordered by start date then name.
 * Invented import addresses (placeholder domain) are blanked: they are not
 * the person's email and must not go to payroll as if they were.
 */
export function shapeNewStarterRows(sources: NewStarterSource[]): NewStarterRow[] {
  const rows = sources.map((s): NewStarterRow => {
    const dayKey = londonDayKey(s.startDate);
    const email = (s.contractor.email ?? "").trim();
    return {
      assignmentId: s.assignmentId,
      contractorId: s.contractor.id,
      name: fullName(s.contractor),
      phone: (s.contractor.phone ?? "").trim(),
      email: isPlaceholderEmail(email) ? "" : email,
      niNumber: formatNiNumber(s.contractor.niNumber),
      startDate: ukDate(dayKey),
      startDayKey: dayKey,
      company: s.companyName.trim(),
      role: (s.role ?? "").trim() || (s.contractor.jobTitle ?? "").trim(),
    };
  });
  return rows.sort(
    (a, b) =>
      a.startDayKey.localeCompare(b.startDayKey) ||
      a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" }) ||
      a.assignmentId.localeCompare(b.assignmentId)
  );
}

export const NEW_STARTER_COLUMNS = [
  "Name",
  "Phone Number",
  "Email Address",
  "NI Number",
  "Start Date",
  "Company",
  "Role",
] as const;

export function rowCells(r: NewStarterRow): string[] {
  return [r.name, r.phone, r.email, r.niNumber, r.startDate, r.company, r.role];
}

/**
 * Human summary of the filters for the PDF and the email: "01/10/2026 to
 * 06/10/2026 · Companies: A, B · Roles: all".
 */
export function describeFilters(
  f: NewStarterFilters,
  companyNames: Map<string, string>
): string {
  const range = `${ukDate(f.from)} to ${ukDate(f.to)}${f.toDefaulted ? " (today)" : ""}`;
  const companies =
    f.companyIds.length === 0
      ? "all"
      : f.companyIds.map((id) => companyNames.get(id) ?? "Unknown company").join(", ");
  const roles = f.roles.length === 0 ? "all" : f.roles.join(", ");
  return `Start dates ${range} · Companies: ${companies} · Roles: ${roles}`;
}

/** File name stem shared by the CSV and PDF downloads. */
export function reportFileStem(f: NewStarterFilters): string {
  return `new-starters-${f.from}-to-${f.to}`;
}

/** What goes in the Activity Log whenever NI numbers leave the database. */
export function auditDetails(f: NewStarterFilters, rowCount: number, extra?: Record<string, unknown>): string {
  return JSON.stringify({
    from: f.from,
    to: f.to,
    companyIds: f.companyIds,
    roles: f.roles,
    rows: rowCount,
    ...extra,
  });
}

const EMAIL_PATTERN = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
export const MAX_REPORT_RECIPIENTS = 10;

export type RecipientResult = { ok: true; recipients: string[] } | { ok: false; error: string };

/** Splits a comma/semicolon list typed into the "To" box and validates each address. */
export function parseRecipients(raw: string | null | undefined): RecipientResult {
  const parts = (raw ?? "")
    .split(/[,;\n]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { ok: false, error: "Enter at least one email address." };

  const recipients: string[] = [];
  for (const p of parts) {
    if (p.length > 254 || !EMAIL_PATTERN.test(p)) return { ok: false, error: `"${p.slice(0, 60)}" is not a valid email address.` };
    if (isPlaceholderEmail(p)) return { ok: false, error: `"${p}" is a placeholder address and cannot receive email.` };
    const lower = p.toLowerCase();
    if (!recipients.some((r) => r.toLowerCase() === lower)) recipients.push(p);
  }
  if (recipients.length > MAX_REPORT_RECIPIENTS) {
    return { ok: false, error: `Send to at most ${MAX_REPORT_RECIPIENTS} addresses at once.` };
  }
  return { ok: true, recipients };
}

/** Default "To" for the email dialog: PAYROLL_REPORT_RECIPIENTS, else blank. */
export function defaultPayrollRecipients(env: string | undefined = process.env.PAYROLL_REPORT_RECIPIENTS): string {
  return (env ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .join(", ");
}
