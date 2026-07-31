/**
 * The assignment status vocabulary, in one place.
 *
 * This file deliberately imports nothing. `contractor-status.ts` — the natural
 * home for these — pulls in Prisma, which cannot be bundled into a client
 * component, and four of the consumers (the assignment form, the quick-assign
 * form, the department assign form and the kanban board) are client components.
 * So the constants live here and `contractor-status.ts` re-exports
 * LIVE_ASSIGNMENT_STATUSES unchanged: one definition, importable from both
 * sides. Do not add a second copy anywhere — the whole reason this exists is
 * that "which statuses count as live?" was previously answered differently in
 * ten files, which had one contractor simultaneously Inactive and "currently
 * placed".
 */

/**
 * Statuses that mean the contractor is still working, and therefore still in
 * the assigned workforce and in the compliance-score denominator.
 *
 * "Holiday" is live: someone covering another worker's holiday is on site for a
 * short period, so they are as much your responsibility — and as much a
 * compliance risk — as anyone else. "Ending" is live for the same reason: an
 * assignment winding down is still an assignment being worked.
 *
 * "Completed" is the only non-live status.
 */
export const LIVE_ASSIGNMENT_STATUSES = ["Placed", "Active", "Ending", "Holiday"] as const;

/**
 * Every valid assignment status, in the order they should be offered and
 * displayed — roughly the lifecycle, with the non-live state last. Used for
 * dropdowns, the kanban columns, the list filter and server-side validation.
 */
export const ASSIGNMENT_STATUSES = [
  "Placed",
  "Active",
  "Ending",
  "Holiday",
  "Completed",
] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

/**
 * Live work that has actually STARTED — the live set minus "Placed".
 *
 * A different question from LIVE_ASSIGNMENT_STATUSES, so deliberately its own
 * constant rather than a variation on that one. Used by the "ending soon" and
 * "overdue completion" queries, which are asking about assignments running
 * against an end date; a Placed assignment has not begun, so it does not belong
 * there. "Holiday" does — holiday cover is short-term by definition, and is
 * exactly the kind of assignment that quietly runs past its end date.
 */
export const IN_PROGRESS_ASSIGNMENT_STATUSES = ["Active", "Ending", "Holiday"] as const;

/** Short explanations, shown as help text next to the status pickers. */
export const ASSIGNMENT_STATUS_DESCRIPTIONS: Record<AssignmentStatus, string> = {
  Placed: "Booked with a future start date — becomes Active automatically on that date.",
  Active: "Currently on site.",
  Ending: "Winding down, but still working.",
  Holiday: "Short-term cover for another worker's holiday.",
  Completed: "Finished — no longer counted in the assigned workforce.",
};

/**
 * Statuses that require verified mandatory compliance before the assignment can
 * be saved — i.e. the ones that put someone new onto a site.
 *
 * Shared because the server action and the form each had their own copy, with a
 * comment on one saying "must match" the other. They stopped matching the moment
 * "Holiday" was added on the server: the form would have hidden the override UI
 * while the server rejected the save, leaving no way through.
 *
 * "Ending" is deliberately absent — that work was checked when it started, and
 * gating a wind-down would strand the assignment.
 */
export const COMPLIANCE_GATED_STATUSES: ReadonlySet<string> = new Set([
  "Placed",
  "Active",
  "Holiday",
]);

export function isLiveAssignmentStatus(status: string): boolean {
  return (LIVE_ASSIGNMENT_STATUSES as readonly string[]).includes(status);
}
