import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { logAction, everActed } from "./engine";
import type { WorkflowResult } from "./engine";

const PORTAL_URL = "https://www.prismworkforce.online";

function buildWelcomeEmail(firstName: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1F4E79;padding:28px 32px;">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;">Welcome to PRL Site Solutions</p>
          <p style="margin:4px 0 0;color:#93C5FD;font-size:13px;">Your application has been approved</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${firstName},</p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            Great news — your application has been approved and you're now registered with PRL Site Solutions.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Our team will be in touch shortly regarding upcoming placements. In the meantime, make sure your compliance documents are up to date — you'll need these before going on site.
          </p>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#166534;">What happens next:</p>
            <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
              <li>Our team will contact you about suitable placements</li>
              <li>You'll receive portal access to manage your assignments</li>
              <li>Keep your compliance documents ready (CSCS, insurance, etc.)</li>
            </ul>
          </div>
          <p style="margin:0;font-size:14px;color:#374151;">
            Questions? Contact us at <a href="mailto:infotech@prlsitesolutions.co.uk" style="color:#1F4E79;">infotech@prlsitesolutions.co.uk</a>
          </p>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">&copy; ${new Date().getFullYear()} PRL Site Solutions. This is an automated message from PRISM.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Above this many matches in one run, send nothing and escalate instead.
 *
 * Genuine approvals arrive as a trickle. A large batch means something touched
 * many contractor rows at once — a backfill, an import, a bulk edit — and
 * `updatedAt` cannot tell that apart from an approval (see below). On
 * 2026-07-30 a right-to-work backfill bumped 59 rows and this agent emailed 12
 * long-standing contractors, some placed for months, to tell them their
 * application had been approved. ~375 Active contractors have still never been
 * welcomed, so the next bulk write would have mailed all of them at once.
 */
const MAX_PER_RUN = 5;

export const welcomeAgent = {
  name: "welcome-agent",
  async run(): Promise<WorkflowResult> {
    const result: WorkflowResult = { workflow: "welcome-agent", acted: 0, skipped: 0, failed: 0, log: [] };

    // Contractors who look newly approved.
    //
    // NB `updatedAt` is a proxy, and a poor one: Prisma bumps it on ANY write to
    // the row, so this cannot distinguish "was just approved" from "was touched
    // by a script". There is no `approvedAt` column and no status-change audit
    // trail to key off instead. The cap below is what makes that safe; the real
    // fix is to record approval explicitly.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const candidates = await prisma.contractor.findMany({
      where: { status: "Active", updatedAt: { gte: since } },
    });

    // Anyone already welcomed is not a new send, so they don't count towards
    // the cap — otherwise a busy day of edits would trip it for no reason.
    const newlyApproved: typeof candidates = [];
    for (const c of candidates) {
      if (await everActed("welcome-agent", c.id, "welcome-email")) {
        result.skipped++;
      } else {
        newlyApproved.push(c);
      }
    }

    if (newlyApproved.length > MAX_PER_RUN) {
      await logAction(
        "welcome-agent",
        "bulk-guard",
        "escalated",
        "staff",
        `${newlyApproved.length} contractors matched (cap ${MAX_PER_RUN}) — no welcome emails sent. Likely a bulk data change, not ${newlyApproved.length} approvals.`
      );
      result.skipped += newlyApproved.length;
      result.log.push(
        `⚠ ${newlyApproved.length} contractors matched, over the ${MAX_PER_RUN} cap — sent nothing. ` +
          `This is almost certainly a bulk data change rather than real approvals. Review, then welcome them by hand if genuine.`
      );
      return result;
    }

    // Already filtered for "never welcomed" above, so no dedupe check here.
    for (const contractor of newlyApproved) {
      try {
        const emailResult = await sendEmail({
          to: contractor.email,
          subject: "You're approved — Welcome to PRL Site Solutions",
          html: buildWelcomeEmail(contractor.firstName),
          template: "welcome",
        });
        if (!emailResult.success) throw new Error(emailResult.error ?? "Email send failed");
        await logAction("welcome-agent", "welcome-email", "sent", contractor.id,
          `${contractor.firstName} ${contractor.lastName}`);
        result.acted++;
        result.log.push(`✓ Welcomed ${contractor.firstName} ${contractor.lastName} (${contractor.email})`);
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`[welcome-agent] Welcome email failed for ${contractor.email}:`, err);
        await logAction("welcome-agent", "welcome-email", "failed", contractor.id, String(err));
        result.failed++;
        result.log.push(`✗ Failed: ${contractor.email} — ${String(err)}`);
      }
    }

    if (result.acted === 0 && result.failed === 0 && result.skipped === 0) {
      result.log.push("No newly approved contractors in the last 24 hours.");
    }

    return result;
  },
};
