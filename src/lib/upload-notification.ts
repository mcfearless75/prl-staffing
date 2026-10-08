import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { notifyAllStaff } from "@/lib/staff-notify";
import {
  UPLOAD_ACTION,
  SUBMIT_ACTION,
  NUDGE_ACTION,
  SUBMIT_FEATURE_START,
  documentsSubmittedEmail,
  type SubmissionEvent,
} from "@/lib/document-submission";

/**
 * Jenni, 2026-10-01: tell the office when a worker uploads documents to be
 * verified. Only for the worker's own uploads — staff uploading on someone's
 * behalf already know.
 *
 * Jenni, 2026-10-08: no longer on the first upload. The office is told once,
 * when the worker presses Submit on My Documents (see document-submission.ts).
 *
 * PRL, 2026-10-06: staff notifications now go to the shared admin@ mailbox.
 */
export const UPLOAD_ALERT_TO = "admin@prlsitesolutions.co.uk";

export const SUBMISSION_ACTIONS = [UPLOAD_ACTION, SUBMIT_ACTION, NUDGE_ACTION];

/**
 * The worker's upload / submit / nudge history since the Submit button went
 * live, for the rules in document-submission.ts.
 */
export async function submissionEvents(contractorId: string): Promise<SubmissionEvent[]> {
  return prisma.activityLog.findMany({
    where: {
      entityType: "Contractor",
      entityId: contractorId,
      action: { in: SUBMISSION_ACTIONS },
      createdAt: { gte: SUBMIT_FEATURE_START },
    },
    select: { action: true, createdAt: true, details: true },
  });
}

export function documentsLink(contractorId: string): string {
  const appUrl = process.env.NEXTAUTH_URL || "https://www.prismworkforce.online";
  return `${appUrl}/contractors/${contractorId}?tab=${encodeURIComponent("Comps & Certs")}`;
}

/** Email admin@ and ring the staff bell. Returns whether the email went. */
export async function notifyStaffOfSubmission(
  contractorId: string,
  uploads: SubmissionEvent[]
): Promise<boolean> {
  const c = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: { firstName: true, lastName: true, jobTitle: true },
  });
  if (!c) return false;

  const name = `${c.firstName} ${c.lastName}`;
  const link = documentsLink(contractorId);
  const { subject, html } = documentsSubmittedEmail({ name, jobTitle: c.jobTitle, uploads, link });
  const result = await sendEmail({ to: UPLOAD_ALERT_TO, subject, html, template: "documents-submitted" });
  if (!result.success) {
    console.error(`[upload-notification] submit email failed for ${contractorId}:`, result.error);
    return false;
  }

  await notifyAllStaff({
    title: `${name} has submitted documents to verify`,
    body: `${uploads.length} document${uploads.length === 1 ? "" : "s"}`,
    url: `/contractors/${contractorId}?tab=${encodeURIComponent("Comps & Certs")}`,
  });
  return true;
}
