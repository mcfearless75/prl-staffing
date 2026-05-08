import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM || "PRL Site Solutions <noreply@prlsitesolutions.online>";
const baseUrl = process.env.NEXTAUTH_URL || "https://prl-staffing-production.up.railway.app";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    companyName,
    companyAddress,
    contactName,
    contactEmail,
    contactPhone,
    supplyOf,
    siteLocation,
    startDate,
    rates,
    breakdown,
    additionalInfo,
    sendToEmail,
  } = body as {
    companyName?: string;
    companyAddress?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    supplyOf?: string;
    siteLocation?: string;
    startDate?: string;
    rates?: Array<{ description: string; rate: string; basis: string }>;
    breakdown?: string[];
    additionalInfo?: string;
    sendToEmail?: string;
  };

  if (!companyName || !contactName || !contactEmail || !sendToEmail) {
    return NextResponse.json(
      { error: "companyName, contactName, contactEmail, and sendToEmail are required" },
      { status: 400 }
    );
  }

  const agreement = await prisma.supplyAgreement.create({
    data: {
      companyName,
      companyAddress: companyAddress || null,
      companyRegNo: null,
      contactName,
      contactEmail,
      contactPhone: contactPhone || null,
      supplyOf: supplyOf || null,
      siteLocation: siteLocation || null,
      startDate: startDate ? new Date(startDate) : null,
      rates: rates ? JSON.stringify(rates) : null,
      breakdown: breakdown ? JSON.stringify(breakdown) : null,
      additionalInfo: additionalInfo || null,
      status: "Pending",
    },
  });

  if (apiKey) {
    const resend = new Resend(apiKey);
    const submissionUrl = `${baseUrl}/onboarding/submissions/${agreement.id}`;

    const contractorHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#005f8c;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Welcome to PRISM Workforce</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.6;">
                Hi ${escapeHtml(contactName)},
              </p>
              <p style="margin:0 0 24px;color:#333333;font-size:16px;line-height:1.6;">
                PRL Site Solutions has started your onboarding. To complete your registration and access your account, please download the PRISM app:
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#005f8c;border-radius:6px;">
                    <a href="https://www.prismworkforce.online/install"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">
                      Download the PRISM App
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#666666;font-size:14px;line-height:1.6;">
                If you have any questions, contact us on <strong>0800 772 3959</strong> or
                <a href="mailto:info@prlsitesolutions.co.uk" style="color:#005f8c;">info@prlsitesolutions.co.uk</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f4f7fa;padding:20px 40px;border-top:1px solid #e0e6ed;">
              <p style="margin:0;color:#999999;font-size:13px;">
                PRL Site Solutions &nbsp;|&nbsp; 0800 772 3959 &nbsp;|&nbsp; info@prlsitesolutions.co.uk
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await resend.emails.send({
        from: fromEmail,
        to: sendToEmail,
        subject: "You've been invited to join PRISM Workforce",
        html: contractorHtml,
      });
    } catch (err) {
      console.error("[onboarding/invite] Failed to send contractor invite email:", err);
    }

    const internalRecipients = ["helen@prlsitesolutions.co.uk"];
    const sessionEmail = session.user.email;
    if (sessionEmail && sessionEmail !== "helen@prlsitesolutions.co.uk") {
      internalRecipients.push(sessionEmail);
    }

    const internalHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#333333;padding:32px;">
  <h2 style="margin:0 0 16px;color:#005f8c;">Supplier Invite Sent</h2>
  <p style="margin:0 0 8px;">An onboarding invite has been sent to: <strong>${escapeHtml(sendToEmail)}</strong></p>
  <table cellpadding="0" cellspacing="0" style="margin:16px 0;border-left:3px solid #005f8c;padding-left:16px;">
    <tr><td style="padding:4px 0;"><strong>Company:</strong> ${escapeHtml(companyName)}</td></tr>
    <tr><td style="padding:4px 0;"><strong>Contact:</strong> ${escapeHtml(contactName)}</td></tr>
    <tr><td style="padding:4px 0;"><strong>Supply of:</strong> ${escapeHtml(supplyOf || "—")}</td></tr>
    <tr><td style="padding:4px 0;"><strong>Site:</strong> ${escapeHtml(siteLocation || "—")}</td></tr>
  </table>
  <p style="margin:16px 0 0;">
    <a href="${escapeHtml(submissionUrl)}" style="color:#005f8c;">View in PRISM: ${escapeHtml(submissionUrl)}</a>
  </p>
</body>
</html>`;

    try {
      await resend.emails.send({
        from: fromEmail,
        to: internalRecipients,
        subject: `Supplier invite sent — ${companyName} (${contactName})`,
        html: internalHtml,
      });
    } catch (err) {
      console.error("[onboarding/invite] Failed to send internal notification email:", err);
    }
  } else {
    console.warn("[onboarding/invite] RESEND_API_KEY not set — emails skipped");
  }

  return NextResponse.json({ success: true, id: agreement.id });
}
