import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

const FROM = "PRL Site Solutions <infotech@prlsitesolutions.co.uk>";
const PORTAL_URL = "https://www.prismworkforce.online";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildEmailHtml(
  firstName: string,
  docs: Array<{ type: string; expiryDate: Date }>
): string {
  const rows = docs
    .map(
      (d) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#374151;">${d.type}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#374151;">${formatDate(d.expiryDate)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Compliance Documents Expiring Soon</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1F4E79;padding:28px 32px;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">PRISM Workforce</p>
            <p style="margin:4px 0 0;color:#93C5FD;font-size:13px;">PRL Site Solutions</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${firstName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              One or more of your compliance documents are expiring soon and need to be renewed. Please log in to PRISM to upload your updated documents as soon as possible to avoid any disruption to your work.
            </p>
            <!-- Table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;margin-bottom:28px;">
              <thead>
                <tr style="background:#F9FAFB;">
                  <th style="padding:10px 14px;text-align:left;font-size:13px;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB;">Document Type</th>
                  <th style="padding:10px 14px;text-align:left;font-size:13px;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB;">Expiry Date</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#1F4E79;border-radius:6px;">
                  <a href="${PORTAL_URL}/onboarding" style="display:inline-block;padding:13px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Log in to PRISM to upload updated documents</a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
              If you have any questions or need assistance, please contact us at <a href="mailto:infotech@prlsitesolutions.co.uk" style="color:#1F4E79;">infotech@prlsitesolutions.co.uk</a>.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;">
              &copy; ${new Date().getFullYear()} PRL Site Solutions. PRISM Workforce Management Portal.<br>
              <a href="mailto:infotech@prlsitesolutions.co.uk" style="color:#6B7280;">infotech@prlsitesolutions.co.uk</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorised" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  const body = await req.json().catch(() => ({}));
  const days: number = body.days ?? 30;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const expiring = await prisma.complianceRecord.findMany({
    where: {
      status: { in: ["Verified", "Expiring"] },
      expiryDate: { gte: new Date(), lte: cutoff },
    },
    include: { contractor: true },
    orderBy: { expiryDate: "asc" },
  });

  // Group by contractor id
  const byContractor = new Map<
    string,
    { contractor: (typeof expiring)[0]["contractor"]; docs: Array<{ type: string; expiryDate: Date }> }
  >();

  for (const record of expiring) {
    const id = record.contractorId;
    if (!byContractor.has(id)) {
      byContractor.set(id, { contractor: record.contractor, docs: [] });
    }
    byContractor.get(id)!.docs.push({
      type: record.type,
      expiryDate: record.expiryDate!,
    });
  }

  let sent = 0;
  let failed = 0;

  for (const { contractor, docs } of byContractor.values()) {
    const email = contractor.email;
    if (!email) {
      failed++;
      continue;
    }

    const firstName = contractor.firstName ?? "Contractor";
    const html = buildEmailHtml(firstName, docs);

    try {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject:
          "Action Required: Your Compliance Documents Are Expiring Soon — PRL Site Solutions",
        html,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send expiry alert to ${email}:`, err);
      failed++;
    }

    // Avoid Resend rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({
    success: true,
    summary: {
      sent,
      failed,
      total: byContractor.size,
      expiringRecords: expiring.length,
    },
  });
}
