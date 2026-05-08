import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const APP_URL = "https://www.prismworkforce.online";
const FROM = "PRL Site Solutions <infotech@prlsitesolutions.co.uk>";
const HELP_EMAIL = "infotech@prlsitesolutions.co.uk";
const ONBOARDING_URL = `${APP_URL}/onboarding`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildChaseEmailHtml(firstName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Action Required: Your Compliance Documents</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#1F4E79;border-radius:12px 12px 0 0;padding:32px 24px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:28px;letter-spacing:2px;font-weight:700;">PRISM</h1>
      <p style="color:#93c5fd;margin:6px 0 0;font-size:13px;">PRL Site Solutions — Contractor Portal</p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;padding:32px 24px;">

      <p style="color:#1f2937;font-size:16px;font-weight:600;margin:0 0 8px;">Hi ${firstName},</p>

      <p style="color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 20px;">
        We're getting ready for an upcoming compliance audit and need your documents on file before we can place you on site.
      </p>

      <!-- Urgency banner -->
      <div style="background:#fee2e2;border:2px solid #fca5a5;border-radius:8px;padding:16px;margin:0 0 24px;">
        <p style="color:#991b1b;font-size:14px;font-weight:700;margin:0 0 6px;">&#9888; Action Required</p>
        <p style="color:#b91c1c;font-size:13px;margin:0;line-height:1.7;">
          Our records show we have <strong>no compliance documents on file for you</strong>. Please log in to PRISM and upload your documents as soon as possible.
        </p>
      </div>

      <!-- Documents required -->
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:0 0 24px;">
        <p style="color:#92400e;font-size:14px;font-weight:700;margin:0 0 12px;">&#128196; Please upload the following:</p>
        <ul style="color:#374151;font-size:14px;line-height:2.2;padding-left:20px;margin:0;">
          <li>&#9744; Right to Work (Passport or Share Code)</li>
          <li>&#9744; CSCS card (if applicable to your role)</li>
          <li>&#9744; Any relevant qualifications or certifications</li>
        </ul>
      </div>

      <!-- How to upload -->
      <p style="color:#1f2937;font-size:15px;font-weight:600;margin:0 0 12px;">How to upload your documents:</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr>
          <td style="width:36px;vertical-align:top;padding-bottom:16px;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">1</div>
          </td>
          <td style="vertical-align:top;padding-bottom:16px;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Click the button below to go to the PRISM onboarding page</p>
          </td>
        </tr>
        <tr>
          <td style="width:36px;vertical-align:top;padding-bottom:16px;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">2</div>
          </td>
          <td style="vertical-align:top;padding-bottom:16px;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Log in with your email address and password</p>
          </td>
        </tr>
        <tr>
          <td style="width:36px;vertical-align:top;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">3</div>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Upload your compliance documents in the <strong>My Documents</strong> section</p>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${ONBOARDING_URL}"
           style="display:inline-block;background:#2563eb;color:#ffffff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.5px;">
          Upload My Documents
        </a>
      </div>

      <p style="color:#6b7280;font-size:12px;text-align:center;margin:0 0 24px;">
        If you have trouble clicking the button, copy and paste this address into your browser:<br/>
        <a href="${ONBOARDING_URL}" style="color:#2563eb;word-break:break-all;">${ONBOARDING_URL}</a>
      </p>

      <!-- Help -->
      <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
        <p style="color:#6b7280;font-size:13px;margin:0;">
          Need help or have questions? Email us at <a href="mailto:${HELP_EMAIL}" style="color:#1F4E79;">${HELP_EMAIL}</a> — we're happy to assist.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        PRL Site Solutions | Recruitment Specialists | <a href="${APP_URL}" style="color:#9ca3af;">www.prismworkforce.online</a>
      </p>
    </div>

  </div>
</body>
</html>`;
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    // Find all contractorIds that already have at least one compliance record
    const recordedContractorIds = await prisma.complianceRecord.findMany({
      select: { contractorId: true },
      distinct: ["contractorId"],
    });
    const excludeIds = recordedContractorIds.map((r) => r.contractorId);

    // Find active contractors with no compliance records who have an email
    const contractors = await prisma.contractor.findMany({
      where: {
        id: { notIn: excludeIds.length > 0 ? excludeIds : ["__none__"] },
        status: { notIn: ["Left", "Inactive"] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const contractor of contractors) {
      try {
        const email = contractor.email;
        if (!email) {
          failed++;
          errors.push(`${contractor.firstName} ${contractor.lastName}: no email`);
          continue;
        }

        const html = buildChaseEmailHtml(contractor.firstName);

        const { error } = await resend.emails.send({
          from: FROM,
          to: [email],
          subject: "Action Required: Your Compliance Documents — PRL Site Solutions",
          html,
        });

        if (error) {
          failed++;
          errors.push(`${contractor.firstName} ${contractor.lastName} <${email}>: ${error.message}`);
          continue;
        }

        await prisma.activityLog.create({
          data: {
            userId: (session.user as { id?: string }).id,
            userName: session.user.name,
            userEmail: session.user.email,
            action: "Sent Compliance Chase Email",
            entityType: "Contractor",
            entityId: contractor.id,
            details: `Compliance chase email sent to ${email}`,
          },
        });

        sent++;
        await sleep(200);
      } catch (err) {
        failed++;
        errors.push(`${contractor.firstName} ${contractor.lastName}: ${String(err)}`);
      }
    }

    // Summary log
    await prisma.activityLog.create({
      data: {
        userId: (session.user as { id?: string }).id,
        userName: session.user.name,
        userEmail: session.user.email,
        action: "Campaign Sent — Compliance Chase",
        entityType: "Campaign",
        details: JSON.stringify({
          mode: "Compliance Chase",
          sent,
          failed,
          total: contractors.length,
          errors: errors.length > 0 ? errors : undefined,
          sentAt: new Date().toISOString(),
          triggeredBy: session.user.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      summary: { sent, failed, total: contractors.length },
    });
  } catch (err) {
    console.error("Compliance chase email error:", err);
    return NextResponse.json({ error: "Failed to send chase emails" }, { status: 500 });
  }
}
