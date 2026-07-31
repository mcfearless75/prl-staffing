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
 * Statuses staff set by hand, in lifecycle order, with the terminal state last.
 *
 * "On Hold" is a deliberate staff flag meaning "keep them, but they are not
 * available right now"; `deactivateContractorIfNoLiveWork` skips it precisely so
 * automation cannot overwrite that intent. It therefore has to be settable —
 * and filterable — from every status UI, not just the full edit form.
 */
export const SETTABLE_CONTRACTOR_STATUSES = [
  "New",
  "Active",
  "On Hold",
  "Suspended",
  "Inactive",
  "Left",
] as const;

/**
 * Applicant-pipeline statuses. Valid to hold and valid to write, but NOT
 * offered in the status pickers: they are managed on the Applicants page, and
 * `workflows/stale-applicant.ts` matches on them. Letting staff set "Applied"
 * on an existing contractor from a badge dropdown would put a working operative
 * back into the applicant funnel.
 */
export const PIPELINE_CONTRACTOR_STATUSES = ["Applied", "Looking"] as const;

/**
 * Everything the API will accept — what staff can set, plus what the pipeline
 * sets on their behalf. Server-side validation only; do not use for dropdowns.
 */
export const VALID_CONTRACTOR_STATUSES = [
  ...SETTABLE_CONTRACTOR_STATUSES,
  ...PIPELINE_CONTRACTOR_STATUSES,
] as const;

export type ContractorStatus = (typeof VALID_CONTRACTOR_STATUSES)[number];

export function isValidContractorStatus(status: string): boolean {
  return (VALID_CONTRACTOR_STATUSES as readonly string[]).includes(status);
}
