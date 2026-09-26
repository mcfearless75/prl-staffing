// Shared rules for the compliance-chase email, so the daily workflow, the
// admin expiry-alerts button and the per-person profile button agree on what
// gets chased and when a send counts as "already done today".

import { isPlaceholderEmail } from "@/lib/placeholder-email";

/** WorkflowLog keys. Every sender logs under these so none double-sends. */
export const CHASE_WORKFLOW = "compliance-chase";
export const CHASE_ACTION = "chase-email";

/** Chase documents expiring within this many days (or already expired). */
export const CHASE_WINDOW_DAYS = 30;

/** Record statuses worth chasing. Pending records aren't on file yet. */
export const CHASE_STATUSES = ["Verified", "Expiring", "Expired"] as const;

export function chaseCutoff(now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + CHASE_WINDOW_DAYS);
  return cutoff;
}

type ChaseRecord = { type: string; status: string; expiryDate: Date | null };

/** The documents a chase email lists: chaseable status, expiry within the window. */
export function docsToChase(records: ChaseRecord[], now: Date = new Date()): Array<{ type: string; expiryDate: Date }> {
  const cutoff = chaseCutoff(now);
  return records
    .filter(
      (r): r is ChaseRecord & { expiryDate: Date } =>
        r.expiryDate !== null &&
        (CHASE_STATUSES as readonly string[]).includes(r.status) &&
        r.expiryDate.getTime() <= cutoff.getTime()
    )
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
    .map((r) => ({ type: r.type, expiryDate: r.expiryDate }));
}

/**
 * Why a manual reminder can't be sent right now, or null if it can.
 * Shown on the profile button, so the wording is for office staff.
 */
export function reminderBlockReason(input: {
  email: string | null | undefined;
  emailBounced: boolean;
  docCount: number;
  alreadyChasedToday: boolean;
}): string | null {
  if (!input.email || isPlaceholderEmail(input.email)) return "No real email address on file";
  if (input.emailBounced) return "Their email address bounced — fix it first";
  if (input.docCount === 0) return `Nothing expired or expiring in the next ${CHASE_WINDOW_DAYS} days`;
  if (input.alreadyChasedToday) return "Already reminded today";
  return null;
}
