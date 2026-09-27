"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/require-staff";
import { sendEmail } from "@/lib/email";
import { logActivity } from "@/lib/activity-log";
import { greetingName } from "@/lib/contractor-name";
import {
  buildCampaignEmail,
  isValidCampaignKey,
  matchesFilter,
  parseCampaignFilter,
  renderMessage,
  renderSubject,
  skipReason,
  MAX_MESSAGE,
  MAX_SUBJECT,
  SEND_BATCH_SIZE,
} from "@/lib/campaign-builder";

const WORKFLOW = "custom-campaign";
// Microsoft Graph allows ~30 messages a minute per mailbox.
const GAP_MS = 2100;

export interface PreviewRecipient {
  id: string;
  name: string;
  jobTitle: string | null;
  status: string;
  skip: string | null;
}

export type PreviewResult = { ok: true; recipients: PreviewRecipient[] } | { ok: false; error: string };

export async function previewCampaign(raw: { status?: string; jobTitle?: string; missing?: string }): Promise<PreviewResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: "Only admins can send campaign emails." };

  const filter = parseCampaignFilter(raw);
  const people = await prisma.contractor.findMany({
    where: filter.status ? { status: filter.status } : {},
    select: {
      id: true,
      firstName: true,
      lastName: true,
      knownAs: true,
      email: true,
      emailBounced: true,
      status: true,
      jobTitle: true,
      compliances: { select: { type: true, status: true, expiryDate: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const now = new Date();
  const recipients = people
    .filter((p) => matchesFilter(p, filter, now))
    .map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`.trim(),
      jobTitle: p.jobTitle,
      status: p.status,
      skip: skipReason(p),
    }));
  return { ok: true, recipients };
}

export type BatchResult =
  | { ok: true; sent: number; skipped: number; failed: number; errors: string[] }
  | { ok: false; error: string };

export async function sendCampaignBatch(input: {
  key: string;
  subject: string;
  message: string;
  withAppButton: boolean;
  ids: string[];
}): Promise<BatchResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: "Only admins can send campaign emails." };

  const subject = (input.subject ?? "").trim();
  const message = (input.message ?? "").trim();
  if (!isValidCampaignKey(input.key)) return { ok: false, error: "Invalid send. Reload the page and try again." };
  if (!subject || subject.length > MAX_SUBJECT) return { ok: false, error: `Subject is required (max ${MAX_SUBJECT} characters).` };
  if (!message || message.length > MAX_MESSAGE) return { ok: false, error: `Message is required (max ${MAX_MESSAGE} characters).` };
  if (!Array.isArray(input.ids) || input.ids.length === 0 || input.ids.length > SEND_BATCH_SIZE) {
    return { ok: false, error: "Invalid batch." };
  }

  const action = `campaign:${input.key}`;
  const sentBy = guard.session.user.email || guard.session.user.name || "admin";
  let sent = 0, skipped = 0, failed = 0;
  const errors: string[] = [];

  for (const id of input.ids) {
    if (typeof id !== "string") { skipped++; continue; }
    // Retry-safe: anyone already sent this campaign is skipped.
    const already = await prisma.workflowLog.count({ where: { workflow: WORKFLOW, action, target: id, outcome: "sent" } });
    if (already > 0) { skipped++; continue; }

    const c = await prisma.contractor.findUnique({
      where: { id },
      select: { firstName: true, lastName: true, knownAs: true, email: true, emailBounced: true },
    });
    if (!c || skipReason(c)) { skipped++; continue; }

    const name = greetingName(c);
    const result = await sendEmail({
      to: c.email,
      subject: renderSubject(subject, { name }),
      html: buildCampaignEmail(renderMessage(message, { name }), input.withAppButton),
      template: WORKFLOW,
    });
    if (result.success) {
      sent++;
      await prisma.workflowLog.create({
        data: { workflow: WORKFLOW, action, target: id, outcome: "sent", detail: `${subject} — by ${sentBy}` },
      });
    } else {
      failed++;
      errors.push(`${c.firstName} ${c.lastName}: ${result.error ?? "send failed"}`);
      await prisma.workflowLog.create({
        data: { workflow: WORKFLOW, action, target: id, outcome: "failed", detail: result.error ?? "send failed" },
      });
    }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }

  if (sent > 0) {
    await logActivity("Sent Custom Campaign", "Campaign", input.key, `"${subject}" to ${sent} (by ${sentBy})`);
  }
  return { ok: true, sent, skipped, failed, errors };
}
