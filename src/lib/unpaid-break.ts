/**
 * The unpaid break on a Subcontractor Agreement. Some sites pay breaks and
 * some don't, so staff pick it per agreement and the email states it rather
 * than carrying a blanket line. Pure — used by the staff form and the API.
 */

export const NO_UNPAID_BREAK = "None (breaks are paid)";

export const UNPAID_BREAK_OPTIONS = [
  NO_UNPAID_BREAK,
  "15 minutes",
  "20 minutes",
  "30 minutes",
  "45 minutes",
  "1 hour",
] as const;

export function isValidUnpaidBreak(value: unknown): value is string {
  return typeof value === "string" && (UNPAID_BREAK_OPTIONS as readonly string[]).includes(value);
}

/** Label for the agreement's Job Details row. */
export function unpaidBreakLabel(value: string): string {
  return value === NO_UNPAID_BREAK ? "None — breaks are paid" : `${value} per shift`;
}

/** Sentence for the email's Timesheets section, or null when breaks are paid. */
export function unpaidBreakTimesheetNote(value: string): string | null {
  return value === NO_UNPAID_BREAK
    ? null
    : `Your unpaid break is ${value} per shift, so please don't include it in your hours.`;
}
