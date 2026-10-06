/**
 * The contractor working-status vocabulary, in one place.
 *
 * Like `assignment-statuses.ts`, this file deliberately imports nothing:
 * `contractor-status.ts` — the natural home — pulls in Prisma, which cannot be
 * bundled into a client component, and two of the consumers (the edit form and
 * the quick badge picker) are client components.
 *
 * It exists because "which statuses can staff set?" was answered differently in
 * three places, and the three did not agree:
 *
 *   - the edit form offered Active / Inactive / On Hold
 *   - the quick badge picker offered New / Active / Suspended / Inactive / Left
 *   - the PATCH route accepted everything EXCEPT "On Hold"
 *
 * So "On Hold" was offered by one UI, unreachable from the other, and rejected
 * as invalid by the API — even though `contractor-status.ts` deliberately
 * protects On Hold from auto-deactivation, and the edit form's server action
 * writes status through with no allowlist, so that one path alone succeeded.
 * Do not add a second copy anywhere.
 */

/**
 * Statuses staff set by hand.
 *
 * Just two since the 2026-09-27 clean-up (Paul): Active = working or ready to
 * work, Inactive = not. Automation moves people between them as work starts
 * and ends (`contractor-status.ts`), and an end date on the profile turns
 * someone Inactive once it passes. "Bench" was never a status — it is the
 * Available filter (no live work) on the Subcontractors list.
 */
export const SETTABLE_CONTRACTOR_STATUSES = ["Active", "Inactive"] as const;

/**
 * Retired on 2026-09-27 and no longer writable. On Hold, Suspended and Left
 * became Inactive; "New" (set only by the CSV import) became Applied for
 * genuine applicants, or Active/Inactive for existing workers
 * (scripts/migrate-contractor-statuses.mjs). Kept only so labels and colours
 * still render if an old value is ever read back, e.g. from an audit log.
 */
export const RETIRED_CONTRACTOR_STATUSES = ["New", "On Hold", "Suspended", "Left"] as const;

/**
 * Pipeline statuses. Valid to hold and valid to write, but NOT offered in the
 * status pickers: Applied/Looking are managed on the Applicants page (and
 * `workflows/stale-applicant.ts` matches on those two only); New Starter and
 * Onboarding are managed on /new-starters. Letting staff set "Applied"
 * on an existing contractor from a badge dropdown would put a working operative
 * back into the applicant funnel.
 */
export const PIPELINE_CONTRACTOR_STATUSES = ["Applied", "Looking", "New Starter", "Onboarding"] as const;

/**
 * People PRL is bringing on but who have not started work yet (Jen's "Scenario
 * 1" new-starter pipeline, 2026-10-06, plus the applicant funnel):
 *
 *   - Applied / Looking  — the public applicant funnel (/applicants)
 *   - New Starter        — added by staff on /new-starters and sent the app
 *                          invite; their documents are not verified yet
 *   - Onboarding         — documents verified; agreement / induction in progress
 *
 * They are not workforce yet, so they stay OUT of the Subcontractors default
 * view, the dashboard headcount, the /compliance records table and the
 * automatic compliance chase. They must stay IN the documents-awaiting-review
 * queue (/compliance/review), which is how staff verify what they upload.
 *
 * The pipeline completes by setting Active (with a Placed assignment), which
 * is the moment they become workforce.
 */
export const PRE_WORK_CONTRACTOR_STATUSES = ["Applied", "Looking", "New Starter", "Onboarding"] as const;

export function isPreWork(status: string | null | undefined): boolean {
  return (PRE_WORK_CONTRACTOR_STATUSES as readonly string[]).includes(status ?? "");
}

/** Prisma filter: anyone who is past the pre-work pipeline (any other status). */
export const NOT_PRE_WORK_FILTER = { status: { notIn: [...PRE_WORK_CONTRACTOR_STATUSES] } };

/**
 * Everything the API will accept — what staff can set, plus what the pipeline
 * sets on their behalf. Server-side validation only; do not use for dropdowns.
 */
export const VALID_CONTRACTOR_STATUSES = [
  ...SETTABLE_CONTRACTOR_STATUSES,
  ...PIPELINE_CONTRACTOR_STATUSES,
] as const;

export type ContractorStatus = (typeof VALID_CONTRACTOR_STATUSES)[number];

/**
 * People who no longer work for PRL. They must never be chased for documents
 * or counted in compliance (Erica, 2026-10-01: a leaver was still being
 * emailed to upload in-date documents). "Left" is retired but kept because old
 * rows may still hold it.
 *
 * Deliberately based on the contractor's status, NOT on whether they have a
 * live assignment: an assignment nobody closed must not keep a leaver on the
 * chase list. Marking someone Inactive is the office saying they've gone.
 */
export const NO_LONGER_WORKING_STATUSES = ["Inactive", "Left"] as const;

export function isNoLongerWorking(status: string | null | undefined): boolean {
  return (NO_LONGER_WORKING_STATUSES as readonly string[]).includes(status ?? "");
}

/** Prisma filter: contractors who still work for PRL. */
export const STILL_WORKING_FILTER = { status: { notIn: [...NO_LONGER_WORKING_STATUSES] } };

/**
 * Prisma filter: the current workforce — still with PRL AND past the pre-work
 * pipeline. Use this, not STILL_WORKING_FILTER, for work lists and automatic
 * chasers that should only reach people who have started (a single object
 * because two spread `status` keys would silently overwrite each other).
 */
export const WORKFORCE_FILTER = {
  status: { notIn: [...NO_LONGER_WORKING_STATUSES, ...PRE_WORK_CONTRACTOR_STATUSES] },
};

export function isValidContractorStatus(status: string): boolean {
  return (VALID_CONTRACTOR_STATUSES as readonly string[]).includes(status);
}
