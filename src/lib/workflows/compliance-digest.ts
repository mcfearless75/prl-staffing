import { prisma } from "@/lib/db";
import { sendEmail, COMPLIANCE_RECIPIENTS } from "@/lib/email";
import { logAction, alreadyActedToday } from "./engine";
import type { WorkflowResult } from "./engine";

const PORTAL_URL = "https://www.prismworkforce.online";
const LOOKAHEAD_DAYS = 30;

/**
 * Staff-facing counterpart to compliance-chase.
 *
 * compliance-chase emails the CONTRACTOR asking them to re-upload. Nothing told the
 * PRL team as a group — their only visibility was the in-app Compliance page, which
 * relies on someone remembering to look. This is the push.
 *
 * Weekly rather than daily: an unchanged list arriving every morning trains people to
 * ignore it, which defeats the point.
 */

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface Row {
  contractorId: string;
  name: string;
  type: string;
  expiryDate: Date;
  days: number;
}

function buildTable(title: string, rows: Row[], accent: string): string {
  if (rows.length === 0) return "";
  const body = rows
    .map(
      (r) => `<tr>
        <td style="padding:9px 14px;border-bottom:1px solid #E5E7EB;">
          <a href="${PORTAL_URL}/contractors/${r.contractorId}" style="color:#1F4E79;text-decoration:none;font-weight:600;">${escapeHtml(r.name)}</a>
        </td>
        <td style="padding:9px 14px;border-bottom:1px solid #E5E7EB;color:#374151;">${escapeHtml(r.type)}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #E5E7EB;color:#374151;">${formatDate(r.expiryDate)}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #E5E7EB;color:${accent};font-weight:600;">${
          r.days < 0 ? `${Math.abs(r.days)} days ago` : `${r.days} days`
        }</td>
      </tr>`
    )
    .join("");

  return `
    <h2 style="font-size:15px;color:${accent};margin:26px 0 10px;">${title} (${rows.length})</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;">
      <thead><tr style="background:#F9FAFB;">
        <th style="padding:9px 14px;text-align:left;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Subcontractor</th>
        <th style="padding:9px 14px;text-align:left;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Document</th>
        <th style="padding:9px 14px;text-align:left;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Expiry</th>
        <th style="padding:9px 14px;text-align:left;font-size:12px;color:#6B7280;border-bottom:1px solid #E5E7EB;">${
          title.startsWith("Expired") ? "Expired" : "Remaining"
        }</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

export const complianceDigestAgent = {
  name: "compliance-digest",
  async run(): Promise<WorkflowResult> {
    const result: WorkflowResult = {
      workflow: "compliance-digest",
      acted: 0,
      skipped: 0,
      failed: 0,
      log: [],
    };

    // Mondays only, unless explicitly forced (COMPLIANCE_DIGEST_ALWAYS=true) for testing.
    const isMonday = new Date().getDay() === 1;
    if (!isMonday && process.env.COMPLIANCE_DIGEST_ALWAYS !== "true") {
      result.skipped++;
      result.log.push("Not Monday — weekly digest skipped.");
      return result;
    }

    if (await alreadyActedToday("compliance-digest", "staff", "digest")) {
      result.skipped++;
      result.log.push("Digest already sent today.");
      return result;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + LOOKAHEAD_DAYS);

    const records = await prisma.complianceRecord.findMany({
      where: {
        expiryDate: { not: null, lte: cutoff },
        contractor: { status: { in: ["Active", "Looking"] } },
      },
      include: { contractor: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { expiryDate: "asc" },
    });

    if (records.length === 0) {
      result.skipped++;
      result.log.push("Nothing expiring in the next 30 days — no digest sent.");
      return result;
    }

    const rows: Row[] = records
      .filter((r) => r.expiryDate)
      .map((r) => ({
        contractorId: r.contractor.id,
        name: `${r.contractor.firstName} ${r.contractor.lastName}`,
        type: r.type,
        expiryDate: r.expiryDate!,
        days: daysUntil(r.expiryDate!),
      }));

    const expired = rows.filter((r) => r.days < 0);
    const urgent = rows.filter((r) => r.days >= 0 && r.days <= 7);
    const soon = rows.filter((r) => r.days > 7);

    const affected = new Set(rows.map((r) => r.contractorId)).size;

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
    <tr><td align="center">
      <table width="680" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1F4E79;padding:26px 32px;">
          <p style="margin:0;color:#fff;font-size:21px;font-weight:700;">Compliance Expiry Digest</p>
          <p style="margin:4px 0 0;color:#93C5FD;font-size:13px;">PRL Site Solutions — weekly summary for the team</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 18px;font-size:15px;color:#374151;line-height:1.6;">
            <strong>${rows.length}</strong> document${rows.length === 1 ? "" : "s"} across
            <strong>${affected}</strong> subcontractor${affected === 1 ? "" : "s"}
            ${expired.length > 0 ? `— <span style="color:#DC2626;font-weight:600;">${expired.length} already expired</span>` : ""}.
          </p>
          ${buildTable("Expired", expired, "#DC2626")}
          ${buildTable("Expiring within 7 days", urgent, "#D97706")}
          ${buildTable(`Expiring within ${LOOKAHEAD_DAYS} days`, soon, "#1F4E79")}
          <table cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
            <tr><td style="background:#1F4E79;border-radius:6px;">
              <a href="${PORTAL_URL}/compliance" style="display:inline-block;padding:12px 26px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Open Compliance in PRISM</a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;font-size:12px;color:#9CA3AF;">
            Subcontractors are chased directly and separately by PRISM. This summary is for the team.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const send = await sendEmail({
      to: COMPLIANCE_RECIPIENTS,
      subject: `Compliance: ${expired.length} expired, ${urgent.length} expiring this week`,
      html,
      template: "compliance-digest",
    });

    if (send.success) {
      await logAction(
        "compliance-digest",
        "digest",
        "sent",
        "staff",
        `${rows.length} docs / ${affected} contractors (${expired.length} expired, ${urgent.length} urgent)`
      );
      result.acted++;
      result.log.push(`✓ Digest sent to ${COMPLIANCE_RECIPIENTS.join(", ")} — ${rows.length} docs`);
    } else {
      await logAction("compliance-digest", "digest", "failed", "staff", send.error);
      result.failed++;
      result.log.push(`✗ Digest failed: ${send.error}`);
    }

    return result;
  },
};
