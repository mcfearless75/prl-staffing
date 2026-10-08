/**
 * Rejecting a document (Jenni, 2026-10-08). "Reject" used to set the record to
 * Non-Compliant and nothing else: the worker was never told, and if another
 * card already met the same requirement (NPORS counts for CSCS) the app still
 * said 100% verified, so the rejected card vanished from view entirely.
 *
 * Now the worker gets a message (in the app, by email and push) saying what was
 * rejected and why, and My Documents shows it until they upload it again. The
 * reason is kept on the record's notes; a re-upload overwrites them and puts
 * the record back to Pending, which clears the rejection.
 */

export const REJECTED_STATUS = "Non-Compliant";
const NOTE_PREFIX = "Rejected by PRL";
/** Longest reason kept: enough for a sentence or two, not an essay. */
export const MAX_REASON_LENGTH = 300;

export function cleanReason(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().replace(/\s+/g, " ").slice(0, MAX_REASON_LENGTH) : "";
}

const ukDate = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: "Europe/London" });

/** What goes on the compliance record's notes. */
export function rejectionNote(reason: string, at: Date): string {
  return reason ? `${NOTE_PREFIX} on ${ukDate(at)}: ${reason}` : `${NOTE_PREFIX} on ${ukDate(at)}.`;
}

/** The reason back out of the notes, or null if they aren't a rejection note or give none. */
export function reasonFromNote(notes: string | null | undefined): string | null {
  if (!notes || !notes.startsWith(NOTE_PREFIX)) return null;
  const colon = notes.indexOf(": ");
  return colon === -1 ? null : notes.slice(colon + 2) || null;
}

/** The message the worker receives. */
export function rejectionMessage(docLabel: string, reason: string): string {
  return [
    `Your ${docLabel} has been checked and we can't accept it.`,
    reason ? `Reason: ${reason}` : null,
    `Please upload it again in My Documents in the PRISM app. If you have any questions, reply to this message.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
