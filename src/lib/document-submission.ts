/**
 * "I've finished — submit my documents" (Jenni, 2026-10-08).
 *
 * The office used to be emailed on a worker's FIRST upload, so staff saw the
 * passport while the worker was still adding everything else, and rang them to
 * say they weren't done. Now uploads are silent and the office is told once,
 * when the worker presses Submit. Anyone who uploads but never presses it is
 * caught by the morning workflow (unsubmitted-uploads).
 *
 * The record is the ActivityLog the upload routes already write, so this needs
 * no schema change. Pure: the routes and the workflow do the querying.
 */
import { escapeHtml } from "@/lib/utils";

/** Written by /api/documents and /api/compliance/upload-doc for a worker's own upload. */
export const UPLOAD_ACTION = "Document uploaded by worker";
/** Written when the worker presses Submit and the office email has gone. */
export const SUBMIT_ACTION = "Documents submitted by worker";
/** Written when the morning workflow tells the office about unsubmitted uploads. */
export const NUDGE_ACTION = "Office told of unsubmitted uploads";
/**
 * Uploads before this were already emailed one by one under the old system, so
 * they are never "pending": otherwise the first morning run would report every
 * worker who ever uploaded as not having submitted.
 */
export const SUBMIT_FEATURE_START = new Date("2026-10-08T10:15:00Z");
/** The morning workflow leaves anyone who uploaded within this long alone: they may still be going. */
export const NUDGE_AFTER_HOURS = 2;

export interface SubmissionEvent {
  action: string;
  createdAt: Date;
  details?: string | null;
}

function latest(events: SubmissionEvent[], action: string): Date | null {
  let at: Date | null = null;
  for (const e of events) if (e.action === action && (!at || e.createdAt > at)) at = e.createdAt;
  return at;
}

/** The worker's uploads since they last pressed Submit, oldest first. */
export function pendingUploads(events: SubmissionEvent[]): SubmissionEvent[] {
  const lastSubmit = latest(events, SUBMIT_ACTION);
  return events
    .filter((e) => e.action === UPLOAD_ACTION && (!lastSubmit || e.createdAt > lastSubmit))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/** When the worker last pressed Submit, or null if never. */
export function lastSubmittedAt(events: SubmissionEvent[]): Date | null {
  return latest(events, SUBMIT_ACTION);
}

/**
 * Should the morning workflow tell the office about this worker? Yes when they
 * have uploads they never submitted, the newest is at least NUDGE_AFTER_HOURS
 * old, and the office hasn't already been told about that upload.
 */
export function needsNudge(events: SubmissionEvent[], now: Date, afterHours = NUDGE_AFTER_HOURS): boolean {
  const pending = pendingUploads(events);
  if (pending.length === 0) return false;
  const newest = pending[pending.length - 1].createdAt;
  if (now.getTime() - newest.getTime() < afterHours * 3_600_000) return false;
  const lastNudge = latest(events, NUDGE_ACTION);
  return !lastNudge || lastNudge < newest;
}

/** The office email sent when a worker presses Submit. */
export function documentsSubmittedEmail(input: {
  name: string;
  jobTitle?: string | null;
  uploads: SubmissionEvent[];
  link: string;
}): { subject: string; html: string } {
  const items = input.uploads
    .map((u) => `<li style="margin-bottom:4px;">${escapeHtml(u.details || "Document")}</li>`)
    .join("");
  const count = input.uploads.length;
  return {
    subject: `To verify: ${input.name} has submitted their documents`,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;line-height:1.6;">
  <p><strong>${escapeHtml(input.name)}</strong>${input.jobTitle ? ` (${escapeHtml(input.jobTitle)})` : ""} has finished uploading and pressed <strong>Submit</strong> in the PRISM app. ${count} document${count === 1 ? "" : "s"} to verify:</p>
  <ul style="margin:0 0 16px;padding-left:20px;">${items}</ul>
  <p><a href="${input.link}" style="display:inline-block;background:#1F4E79;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Open their documents</a></p>
</div>`,
  };
}
