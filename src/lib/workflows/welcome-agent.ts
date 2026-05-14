import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { logAction, everActed } from "./engine";
import type { WorkflowResult } from "./engine";

const FROM = "PRL Site Solutions <infotech@prlsitesolutions.co.uk>";
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

export const welcomeAgent = {
  name: "welcome-agent",
  async run(): Promise<WorkflowResult> {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result: WorkflowResult = { workflow: "welcome-agent", acted: 0, skipped: 0, failed: 0, log: [] };

    // Find contractors approved in the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newlyApproved = await prisma.contractor.findMany({
      where: { status: "Active", updatedAt: { gte: since } },
    });

    for (const contractor of newlyApproved) {
      const alreadyWelcomed = await everActed("welcome-agent", contractor.id, "welcome-email");
      if (alreadyWelcomed) {
        result.skipped++;
        continue;
      }

      try {
        await resend.emails.send({
          from: FROM,
          to: contractor.email,
          subject: "You're approved — Welcome to PRL Site Solutions",
          html: buildWelcomeEmail(contractor.firstName),
        });
        await logAction("welcome-agent", "welcome-email", "sent", contractor.id,
          `${contractor.firstName} ${contractor.lastName}`);
        result.acted++;
        result.log.push(`✓ Welcomed ${contractor.firstName} ${contractor.lastName} (${contractor.email})`);
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
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
