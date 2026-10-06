import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/utils";

/**
 * Office alerts from the new-starter pipeline. They go to the shared admin@
 * mailbox, like new applications and app uploads (PRL, 2026-10-06), and link
 * to /new-starters where the next step is taken.
 */
export const NEW_STARTER_ALERT_TO = "admin@prlsitesolutions.co.uk";

function pipelineUrl(): string {
  return `${process.env.NEXTAUTH_URL || "https://www.prismworkforce.online"}/new-starters`;
}

function alertHtml(heading: string, line: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
  <div style="background:#005f8c;padding:18px 24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;color:#fff;font-size:18px;">${escapeHtml(heading)}</h1>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:20px 24px;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 18px;color:#333;font-size:14px;line-height:1.6;">${escapeHtml(line)}</p>
    <a href="${escapeHtml(pipelineUrl())}" style="display:inline-block;background:#005f8c;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Open New Starters</a>
  </div>
</div>`;
}

/** Never throws: an alert failing must not undo a signature or a completion. */
export async function notifyAgreementSigned(name: string): Promise<void> {
  const subject = `${name} has signed their agreement`;
  const result = await sendEmail({
    to: NEW_STARTER_ALERT_TO,
    subject,
    html: alertHtml(subject, `${name} has signed their subcontractor agreement online. The next step is their induction.`),
    template: "new-starter-agreement-signed",
  });
  if (!result.success) console.error("[new-starter] signed alert failed:", result.error);
}

export async function notifyReadyToStart(name: string, startDate: string, companyName: string): Promise<void> {
  const subject = `${name} is ready to start on ${startDate} at ${companyName}`;
  const result = await sendEmail({
    to: NEW_STARTER_ALERT_TO,
    subject,
    html: alertHtml(subject, `${subject}. Their placement is now on the Subcontractors work list.`),
    template: "new-starter-ready",
  });
  if (!result.success) console.error("[new-starter] ready alert failed:", result.error);
}
