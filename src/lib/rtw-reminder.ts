// "Send RTW reminder" from the red flag on the contractor profile: asks the
// worker to complete the Right to Work section of the app. Every send is
// recorded in ChaseLog (kind "rtw"), which also enforces the 24-hour gap.
// NO auth inside — only call after requireStaff().

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/utils";
import { greetingName } from "@/lib/contractor-name";
import { rtwCoverage, rtwReminderBlockReason } from "@/lib/rtw-flag";
import type { ComposedEmail } from "@/lib/sent-email-record";

export const RTW_CHASE_KIND = "rtw";
const DOCS_URL = "https://www.prismworkforce.online/portal/documents";

export function buildRtwReminderEmail(name: string, reason: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1F4E79;padding:28px 32px;">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;">PRISM Workforce</p>
          <p style="margin:4px 0 0;color:#93C5FD;font-size:13px;">PRL Site Solutions</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${escapeHtml(name)},</p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            We need proof of your Right to Work in the UK before we can place you on site. By law we have to hold this for everyone who works through us.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            <strong>What we're missing:</strong> ${escapeHtml(reason)}.<br>
            Please open the app, go to <strong>Documents</strong> and complete the <strong>Right to Work</strong> section. It takes a couple of minutes.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:#1F4E79;border-radius:6px;">
              <a href="${DOCS_URL}" style="display:inline-block;padding:13px 28px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Complete Right to Work</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#374151;">Questions? Contact <a href="mailto:prism@prlsitesolutions.co.uk" style="color:#1F4E79;">prism@prlsitesolutions.co.uk</a></p>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">&copy; ${new Date().getFullYear()} PRL Site Solutions.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Everything the profile header needs: coverage plus whether the button is usable. */
export async function loadRtwStatus(contractorId: string) {
  const c = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: {
      email: true,
      emailBounced: true,
      compliances: { select: { type: true, status: true, expiryDate: true } },
      chaseLogs: { where: { kind: RTW_CHASE_KIND }, orderBy: { sentAt: "desc" }, take: 1, select: { sentAt: true } },
    },
  });
  if (!c) return null;
  const coverage = rtwCoverage(c.compliances);
  const lastSentAt = c.chaseLogs[0]?.sentAt ?? null;
  return {
    coverage,
    lastSentAt,
    blockReason: rtwReminderBlockReason({ covered: coverage.covered, email: c.email, emailBounced: c.emailBounced, lastSentAt }),
  };
}

/**
 * The exact email a reminder would send right now, plus why it can't be sent
 * (if it can't). The preview and the real send both come from here, so what
 * staff see is what the worker gets.
 */
export async function composeRtwReminder(
  contractorId: string
): Promise<{ email: ComposedEmail; blockReason: string | null } | null> {
  const status = await loadRtwStatus(contractorId);
  if (!status) return null;
  const c = await prisma.contractor.findUniqueOrThrow({
    where: { id: contractorId },
    select: { email: true, firstName: true, knownAs: true },
  });
  return {
    blockReason: status.blockReason,
    email: {
      to: c.email,
      subject: "Action needed: your Right to Work — PRL Site Solutions",
      html: buildRtwReminderEmail(greetingName(c), status.coverage.reason ?? "Right to Work document"),
    },
  };
}

export async function sendRtwReminder(
  contractorId: string,
  sentBy: string
): Promise<{ ok: true; email: ComposedEmail } | { ok: false; error: string }> {
  const composed = await composeRtwReminder(contractorId);
  if (!composed) return { ok: false, error: "Contractor not found" };
  if (composed.blockReason) return { ok: false, error: composed.blockReason };

  const { email } = composed;
  const result = await sendEmail({ ...email, template: "rtw-reminder" });
  if (!result.success) return { ok: false, error: result.error ?? "Email send failed" };

  await prisma.chaseLog.create({ data: { contractorId, kind: RTW_CHASE_KIND, sentBy } });
  return { ok: true, email };
}
