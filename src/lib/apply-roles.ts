/**
 * The website application must say what job the applicant does (Jenni,
 * 2026-10-07): at least one role ticked, or "My job is not listed" ticked AND
 * the job typed in. Shared by the form and /api/apply so neither can be
 * skipped. Returns the message to show, or null when the answer is complete.
 */
export function applicantRoleError(input: {
  /** Roles ticked in the picker. */
  selectedCount: number;
  /** "My job is not listed" ticked. */
  notListed: boolean;
  /** What they typed in the other-role box. */
  otherRole: string;
  /** The role list failed to load, so the picker became a plain text box. */
  freeTextMode?: boolean;
  /** What they typed in that plain text box. */
  freeText?: string;
}): string | null {
  if (input.freeTextMode) {
    return input.freeText?.trim() ? null : "Please tell us the job role(s) you are applying for.";
  }
  if (input.notListed && !input.otherRole.trim()) {
    return "You ticked “My job is not listed” — please type your job in the box.";
  }
  if (input.selectedCount === 0 && !input.notListed) {
    return "Please tick at least one job role, or tick “My job is not listed” and type your job.";
  }
  return null;
}
