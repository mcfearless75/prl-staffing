import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/utils";

/**
 * Jenni, 2026-10-01: "When someone uploads a document on their app can it
 * send an email to prism@ to tell us that Joe Bloggs has uploaded a document
 * to be verified." Only for uploads by the worker themselves — staff uploading
 * on someone's behalf already know.
 *
 * One email per person per QUIET_MINUTES: a worker sending front and back of
 * a card, then their passport, gets one email, which says to open the profile
 * for everything waiting rather than listing one file.
 *
 * PRL, 2026-10-06: staff notifications now go to the shared admin@ mailbox.
 */
export const UPLOAD_ALERT_TO = "admin@prlsitesolutions.co.uk";
export const QUIET_MINUTES = 30;
const ACTION = "Staff told of upload";

export async function notifyStaffOfUpload(contractorId: string, docType: string): Promise<void> {
  try {
    const since = new Date(Date.now() - QUIET_MINUTES * 60_000);
    const recent = await prisma.activityLog.count({
      where: { entityType: "Contractor", entityId: contractorId, action: ACTION, createdAt: { gte: since } },
    });
    if (recent > 0) return;

    const c = await prisma.contractor.findUnique({
      where: { id: contractorId },
      select: { firstName: true, lastName: true, jobTitle: true },
    });
    if (!c) return;

    const name = `${c.firstName} ${c.lastName}`;
    const appUrl = process.env.NEXTAUTH_URL || "https://www.prismworkforce.online";
    const link = `${appUrl}/contractors/${contractorId}?tab=${encodeURIComponent("Comps & Certs")}`;

    const result = await sendEmail({
      to: UPLOAD_ALERT_TO,
      subject: `To verify: ${name} has uploaded a document`,
      template: "upload-alert",
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;line-height:1.6;">
  <p><strong>${escapeHtml(name)}</strong>${c.jobTitle ? ` (${escapeHtml(c.jobTitle)})` : ""} has uploaded a document in the PRISM app to be verified:</p>
  <p style="margin:0 0 16px;"><strong>${escapeHtml(docType)}</strong></p>
  <p><a href="${link}" style="display:inline-block;background:#1F4E79;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Open their documents</a></p>
  <p style="color:#6b7280;font-size:12px;">If they upload more in the next ${QUIET_MINUTES} minutes you won't get another email — everything waiting is on their profile.</p>
</div>`,
    });
    if (result.success) {
      await prisma.activityLog.create({
        data: { userName: "System", action: ACTION, entityType: "Contractor", entityId: contractorId, details: `${docType} — emailed ${UPLOAD_ALERT_TO}` },
      });
    }
  } catch (err) {
    // Never fail the worker's upload because the office alert didn't go.
    console.error("[upload-notification] failed:", err instanceof Error ? err.message : err);
  }
}
