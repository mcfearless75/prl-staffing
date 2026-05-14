import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { logAction, alreadyActedToday } from "./engine";
import type { WorkflowResult } from "./engine";

const FROM = "PRL Site Solutions <infotech@prlsitesolutions.co.uk>";
const PORTAL_URL = "https://www.prismworkforce.online";
const STAFF_EMAIL = "infotech@prlsitesolutions.co.uk";
const STALE_DAYS = 7;

function buildStaffAlertEmail(stale: Array<{ name: string; email: string; status: string; daysSince: number; jobTitle: string }>): string {
  const rows = stale.map(c => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#374151;">${c.name}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#374151;">${c.email}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#374151;">${c.jobTitle || "—"}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;">
        <span style="background:${c.status === "Looking" ? "#DBEAFE" : "#FEF3C7"};color:${c.status === "Looking" ? "#1D4ED8" : "#92400E"};padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${c.status}</span>
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#DC2626;font-weight:600;">${c.daysSince} days</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
    <tr><td align="center">
      <table width="700" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#7C3AED;padding:28px 32px;">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">⚡ PRISM Agent — Stale Applicant Alert</p>
          <p style="margin:4px 0 0;color:#DDD6FE;font-size:13px;">Automated escalation — action required</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            The following <strong>${stale.length} contractor(s)</strong> have been in <strong>Applied</strong> or <strong>Looking</strong> status for <strong>${STALE_DAYS}+ days</strong> without any action. Please review and update their status in PRISM.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;margin-bottom:28px;">
            <thead><tr style="background:#F9FAFB;">
              <th style="padding:10px 14px;text-align:left;font-size:13px;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB;">Name</th>
              <th style="padding:10px 14px;text-align:left;font-size:13px;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB;">Email</th>
              <th style="padding:10px 14px;text-align:left;font-size:13px;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB;">Job Title</th>
              <th style="padding:10px 14px;text-align:left;font-size:13px;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB;">Status</th>
              <th style="padding:10px 14px;text-align:left;font-size:13px;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB;">Waiting</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:#1F4E79;border-radius:6px;">
              <a href="${PORTAL_URL}/applicants" style="display:inline-block;padding:13px 28px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Review in PRISM →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">&copy; ${new Date().getFullYear()} PRL Site Solutions. PRISM Agentic Workflow — automated daily escalation.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export const staleApplicantAgent = {
  name: "stale-applicant",
  async run(): Promise<WorkflowResult> {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result: WorkflowResult = { workflow: "stale-applicant", acted: 0, skipped: 0, failed: 0, log: [] };

    const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
    const staleContractors = await prisma.contractor.findMany({
      where: { status: { in: ["Applied", "Looking"] }, createdAt: { lte: cutoff } },
      orderBy: { createdAt: "asc" },
    });

    if (staleContractors.length === 0) {
      result.log.push("No stale applicants found.");
      return result;
    }

    // Only send one escalation email per day
    const alreadySent = await alreadyActedToday("stale-applicant", "staff", "escalation-email");
    if (alreadySent) {
      result.skipped = staleContractors.length;
      result.log.push(`Escalation already sent today — ${staleContractors.length} stale applicant(s) on record.`);
      return result;
    }

    const staleData = staleContractors.map(c => ({
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      status: c.status,
      jobTitle: c.jobTitle || "",
      daysSince: Math.floor((Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    }));

    try {
      await resend.emails.send({
        from: FROM,
        to: STAFF_EMAIL,
        subject: `⚡ PRISM Agent: ${staleContractors.length} stale applicant(s) need review`,
        html: buildStaffAlertEmail(staleData),
      });
      await logAction("stale-applicant", "escalation-email", "escalated", "staff",
        `${staleContractors.length} stale: ${staleData.map(c => c.name).join(", ")}`);
      result.acted = staleContractors.length;
      result.log.push(`✓ Escalated ${staleContractors.length} stale applicant(s) to staff`);
    } catch (err) {
      await logAction("stale-applicant", "escalation-email", "failed", "staff", String(err));
      result.failed = 1;
      result.log.push(`✗ Failed to send escalation: ${String(err)}`);
    }

    return result;
  },
};
