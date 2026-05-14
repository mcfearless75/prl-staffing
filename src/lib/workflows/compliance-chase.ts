import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { logAction, alreadyActedToday } from "./engine";
import type { WorkflowResult } from "./engine";

const FROM = "PRL Site Solutions <infotech@prlsitesolutions.co.uk>";
const PORTAL_URL = "https://www.prismworkforce.online";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function urgencyLabel(expiryDate: Date): { label: string; daysOut: number } {
  const now = new Date();
  const daysOut = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysOut < 0) return { label: "EXPIRED", daysOut };
  if (daysOut <= 7) return { label: "URGENT — expires in " + daysOut + " days", daysOut };
  return { label: "expires in " + daysOut + " days", daysOut };
}

function buildEmail(firstName: string, docs: Array<{ type: string; expiryDate: Date }>): string {
  const rows = docs.map((d) => {
    const { label, daysOut } = urgencyLabel(d.expiryDate);
    const color = daysOut < 0 ? "#DC2626" : daysOut <= 7 ? "#D97706" : "#374151";
    return `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#374151;">${d.type}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#374151;">${formatDate(d.expiryDate)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:${color};font-weight:600;">${label}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1F4E79;padding:28px 32px;">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;">PRISM Workforce</p>
          <p style="margin:4px 0 0;color:#93C5FD;font-size:13px;">PRL Site Solutions — Automated Compliance Alert</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${firstName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            One or more of your compliance documents require attention. Please log in to PRISM and upload updated documents to avoid disruption to your work.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;margin-bottom:28px;">
            <thead><tr style="background:#F9FAFB;">
              <th style="padding:10px 14px;text-align:left;font-size:13px;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB;">Document</th>
              <th style="padding:10px 14px;text-align:left;font-size:13px;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB;">Expiry</th>
              <th style="padding:10px 14px;text-align:left;font-size:13px;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB;">Status</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:#1F4E79;border-radius:6px;">
              <a href="${PORTAL_URL}/portal" style="display:inline-block;padding:13px 28px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Log in to PRISM Portal</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#374151;">Questions? Contact <a href="mailto:infotech@prlsitesolutions.co.uk" style="color:#1F4E79;">infotech@prlsitesolutions.co.uk</a></p>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">&copy; ${new Date().getFullYear()} PRL Site Solutions. This is an automated message from PRISM.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export const complianceChaseAgent = {
  name: "compliance-chase",
  async run(): Promise<WorkflowResult> {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result: WorkflowResult = { workflow: "compliance-chase", acted: 0, skipped: 0, failed: 0, log: [] };

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 30);

    const expiring = await prisma.complianceRecord.findMany({
      where: {
        status: { in: ["Verified", "Expiring", "Expired"] },
        expiryDate: { lte: cutoff },
      },
      include: { contractor: true },
      orderBy: { expiryDate: "asc" },
    });

    // Group by contractor
    const byContractor = new Map<string, { contractor: typeof expiring[0]["contractor"]; docs: Array<{ type: string; expiryDate: Date }> }>();
    for (const rec of expiring) {
      if (!byContractor.has(rec.contractorId)) {
        byContractor.set(rec.contractorId, { contractor: rec.contractor, docs: [] });
      }
      byContractor.get(rec.contractorId)!.docs.push({ type: rec.type, expiryDate: rec.expiryDate! });
    }

    for (const { contractor, docs } of byContractor.values()) {
      const alreadySent = await alreadyActedToday("compliance-chase", contractor.id, "chase-email");
      if (alreadySent) {
        result.skipped++;
        continue;
      }

      try {
        await resend.emails.send({
          from: FROM,
          to: contractor.email,
          subject: "Action Required: Compliance Documents Need Attention — PRL Site Solutions",
          html: buildEmail(contractor.firstName, docs),
        });
        await logAction("compliance-chase", "chase-email", "sent", contractor.id,
          `${docs.length} doc(s): ${docs.map(d => d.type).join(", ")}`);
        result.acted++;
        result.log.push(`✓ Chased ${contractor.firstName} ${contractor.lastName} (${docs.length} docs)`);
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        await logAction("compliance-chase", "chase-email", "failed", contractor.id, String(err));
        result.failed++;
        result.log.push(`✗ Failed: ${contractor.email} — ${String(err)}`);
      }
    }

    if (result.acted === 0 && result.failed === 0) {
      result.log.push("No compliance chasers needed today.");
    }

    return result;
  },
};
