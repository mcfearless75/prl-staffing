import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/utils";
import { logAction } from "./engine";
import type { WorkflowResult } from "./engine";
import {
  UPLOAD_ACTION,
  NUDGE_ACTION,
  SUBMIT_FEATURE_START,
  needsNudge,
  pendingUploads,
  type SubmissionEvent,
} from "@/lib/document-submission";
import { SUBMISSION_ACTIONS, UPLOAD_ALERT_TO, documentsLink } from "@/lib/upload-notification";

/**
 * The backstop for the Submit button on My Documents (Jenni, 08-10-26). Uploads
 * no longer email the office; pressing Submit does. Anyone who uploaded and
 * never pressed it is listed here, in one email to admin@ each morning, so
 * nothing they sent goes unchecked. Each person is reported once per batch of
 * uploads (see needsNudge).
 */
export const unsubmittedUploadsAgent = {
  name: "unsubmitted-uploads",
  async run(): Promise<WorkflowResult> {
    const result: WorkflowResult = { workflow: "unsubmitted-uploads", acted: 0, skipped: 0, failed: 0, log: [] };
    const now = new Date();

    const uploaders = await prisma.activityLog.findMany({
      where: { entityType: "Contractor", action: UPLOAD_ACTION, createdAt: { gte: SUBMIT_FEATURE_START } },
      select: { entityId: true },
      distinct: ["entityId"],
    });
    const ids = uploaders.map((u) => u.entityId).filter((id): id is string => !!id);
    if (ids.length === 0) {
      result.log.push("No worker uploads since the Submit button went live.");
      return result;
    }

    const rows = await prisma.activityLog.findMany({
      where: {
        entityType: "Contractor",
        entityId: { in: ids },
        action: { in: SUBMISSION_ACTIONS },
        createdAt: { gte: SUBMIT_FEATURE_START },
      },
      select: { entityId: true, action: true, createdAt: true, details: true },
    });
    const byContractor = new Map<string, SubmissionEvent[]>();
    for (const r of rows) {
      if (!r.entityId) continue;
      const list = byContractor.get(r.entityId) ?? [];
      list.push(r);
      byContractor.set(r.entityId, list);
    }

    const due = [...byContractor].filter(([, events]) => needsNudge(events, now));
    result.skipped = byContractor.size - due.length;
    if (due.length === 0) {
      result.log.push("Everyone who uploaded has submitted, or uploaded too recently to chase.");
      return result;
    }

    const people = await prisma.contractor.findMany({
      where: { id: { in: due.map(([id]) => id) } },
      select: { id: true, firstName: true, lastName: true, jobTitle: true },
    });
    const list = people.map((p) => {
      const pending = pendingUploads(byContractor.get(p.id) ?? []);
      return { ...p, name: `${p.firstName} ${p.lastName}`, pending };
    });

    const items = list
      .map(
        (p) => `<li style="margin-bottom:10px;">
      <a href="${documentsLink(p.id)}" style="color:#1F4E79;font-weight:600;">${escapeHtml(p.name)}</a>${p.jobTitle ? ` (${escapeHtml(p.jobTitle)})` : ""}
      — ${p.pending.length} document${p.pending.length === 1 ? "" : "s"}, last on ${p.pending[p.pending.length - 1].createdAt.toLocaleDateString("en-GB", { timeZone: "Europe/London" })}:
      ${escapeHtml(p.pending.map((u) => u.details || "Document").join("; "))}
    </li>`
      )
      .join("");

    const sent = await sendEmail({
      to: UPLOAD_ALERT_TO,
      subject: `To verify: ${list.length} worker${list.length === 1 ? "" : "s"} uploaded documents but didn't press Submit`,
      template: "unsubmitted-uploads",
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;line-height:1.6;">
  <p>These workers uploaded documents in the PRISM app but never pressed <strong>Submit</strong>, so they may not have finished. Their uploads are waiting to be checked:</p>
  <ul style="padding-left:20px;">${items}</ul>
</div>`,
    });

    if (!sent.success) {
      await logAction("unsubmitted-uploads", "office-email", "failed", "staff", sent.error);
      result.failed = 1;
      result.log.push(`✗ Email to ${UPLOAD_ALERT_TO} failed: ${sent.error}`);
      return result;
    }

    await prisma.activityLog.createMany({
      data: list.map((p) => ({
        userName: "System",
        action: NUDGE_ACTION,
        entityType: "Contractor",
        entityId: p.id,
        details: `${p.pending.length} unsubmitted document${p.pending.length === 1 ? "" : "s"} — emailed ${UPLOAD_ALERT_TO}`,
      })),
    });
    await logAction("unsubmitted-uploads", "office-email", "escalated", "staff", list.map((p) => p.name).join(", "));
    result.acted = list.length;
    result.log.push(`✓ Told ${UPLOAD_ALERT_TO} about ${list.length} worker(s) with unsubmitted uploads`);
    return result;
  },
};
