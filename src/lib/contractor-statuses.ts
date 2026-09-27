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
