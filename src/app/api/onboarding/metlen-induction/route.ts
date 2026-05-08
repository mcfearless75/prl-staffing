import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Resend } from "resend";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface MetlenInductionBody {
  contractorName: string;
  contractorEmail: string;
  dayDate: string;
  arrivalTime: string;
  inductionStartTime: string;
  inductionFormLink: string;
  documentsEmail: string;
  contactName: string;
  contactPhone: string;
  postcode: string;
  baseRate: string;
  otThreshold: string;
  otMultiplier: string;
  satSunRate: string;
}

function buildEmailHtml(data: MetlenInductionBody): string {
  const {
    contractorName,
    dayDate,
    arrivalTime,
    inductionStartTime,
    inductionFormLink,
    documentsEmail,
    contactName,
    contactPhone,
    postcode,
    baseRate,
    otThreshold,
    otMultiplier,
    satSunRate,
  } = data;

  const e = escapeHtml;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Metlen Induction — PRL Site Solutions</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background-color:#ffffff;border-radius:6px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:#005f8c;padding:28px 32px;">
              <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:0.3px;">
                Metlen Induction &mdash; PRL Site Solutions
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#333333;font-size:15px;line-height:1.6;">

              <p style="margin:0 0 20px 0;">Dear <strong>${e(contractorName)}</strong>,</p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#00879e;border-radius:4px;">
                    <a href="${e(inductionFormLink)}"
                       target="_blank"
                       style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">
                      Book Your Induction &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0;">
                Please use the link above to book your induction today, ready for induction on
                <strong>${e(dayDate)}</strong> at <strong>${e(arrivalTime)}</strong>.
              </p>

              <p style="margin:0 0 8px 0;"><strong>Action required:</strong></p>
              <ul style="margin:0 0 20px 0;padding-left:20px;">
                <li style="margin-bottom:6px;">Complete the booking link today.</li>
                <li style="margin-bottom:6px;">
                  Send your ID cards (front and back) and passport to:
                  <strong>${e(documentsEmail)}</strong>
                </li>
                <li>
                  Please CC Helen in as well:
                  <strong>helen@prlsitesolutions.co.uk</strong>
                </li>
              </ul>

              <!-- Key Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background-color:#f0f4f7;border-radius:4px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 10px 0;font-size:13px;font-weight:bold;color:#005f8c;text-transform:uppercase;letter-spacing:0.5px;">
                      Induction Details
                    </p>
                    <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;">
                      <tr>
                        <td style="padding:4px 0;color:#666666;width:160px;">Induction date</td>
                        <td style="padding:4px 0;"><strong>${e(dayDate)}</strong></td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#666666;">Site contact</td>
                        <td style="padding:4px 0;"><strong>${e(contactName)}</strong></td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#666666;">Contact phone</td>
                        <td style="padding:4px 0;"><strong>${e(contactPhone)}</strong></td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#666666;">Reporting company</td>
                        <td style="padding:4px 0;"><strong>Metlen</strong></td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#666666;">Your company</td>
                        <td style="padding:4px 0;"><strong>PRL Site Solutions</strong></td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#666666;">Postcode</td>
                        <td style="padding:4px 0;"><strong>${e(postcode)}</strong></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0;">
                Please arrive on site at <strong>${e(arrivalTime)}</strong> for your RTW check,
                then induction starts at <strong>${e(inductionStartTime)}</strong>.
              </p>

              <p style="margin:0 0 8px 0;"><strong>Please bring:</strong></p>
              <ul style="margin:0 0 20px 0;padding-left:20px;">
                <li style="margin-bottom:6px;">Full PPE</li>
                <li style="margin-bottom:6px;">Passport (original — not a screenshot)</li>
                <li>All relevant cards</li>
              </ul>

              <p style="margin:0 0 20px 0;">
                There will be a <strong>drug and alcohol test</strong> on arrival.
              </p>

              <p style="margin:0 0 20px 0;">
                When you arrive on <strong>${e(dayDate)}</strong> at <strong>${e(arrivalTime)}</strong>,
                please call <strong>${e(contactName)}</strong> on <strong>${e(contactPhone)}</strong> &mdash;
                they are your site contact.
              </p>

              <!-- Rates Box -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background-color:#f0f4f7;border-radius:4px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 10px 0;font-size:13px;font-weight:bold;color:#005f8c;text-transform:uppercase;letter-spacing:0.5px;">
                      Pay Rates
                    </p>
                    <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;">
                      <tr>
                        <td style="padding:4px 0;color:#666666;width:220px;">Base rate</td>
                        <td style="padding:4px 0;"><strong>${e(baseRate)}</strong></td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#666666;">Overtime (Mon&ndash;Fri after ${e(otThreshold)})</td>
                        <td style="padding:4px 0;"><strong>${e(otMultiplier)}&times;</strong></td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#666666;">Saturday &amp; Sunday</td>
                        <td style="padding:4px 0;"><strong>${e(satSunRate)}&times;</strong></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px 0;">
                Our payroll team will call you to get you onboard for CIS payments.
              </p>

              <p style="margin:0;">Kind regards,<br /><strong>Helen</strong><br />PRL Site Solutions</p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f0f4f7;padding:16px 32px;border-top:1px solid #dde3e8;">
              <p style="margin:0;font-size:12px;color:#888888;text-align:center;">
                PRL Site Solutions &nbsp;|&nbsp; 0800 772 3959 &nbsp;|&nbsp;
                <a href="mailto:info@prlsitesolutions.co.uk"
                   style="color:#005f8c;text-decoration:none;">
                  info@prlsitesolutions.co.uk
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: Partial<MetlenInductionBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { contractorName, contractorEmail } = body;

  if (!contractorName || !contractorEmail) {
    return NextResponse.json(
      { error: "contractorName and contractorEmail are required" },
      { status: 400 }
    );
  }

  const data = body as MetlenInductionBody;

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.EMAIL_FROM ||
    "PRL Site Solutions <noreply@prlsitesolutions.online>";

  const recipients: string[] = [contractorEmail];
  if (!recipients.includes("helen@prlsitesolutions.co.uk")) {
    recipients.push("helen@prlsitesolutions.co.uk");
  }
  const sessionEmail = session.user.email;
  if (sessionEmail && !recipients.includes(sessionEmail)) {
    recipients.push(sessionEmail);
  }

  const subject = `Metlen Induction — ${contractorName} — ${data.dayDate ?? ""}`;
  const html = buildEmailHtml(data);

  if (apiKey) {
    const resend = new Resend(apiKey);
    try {
      await resend.emails.send({
        from: fromEmail,
        to: recipients,
        subject,
        html,
      });
    } catch (err) {
      console.error("[metlen-induction] Email send failed:", err);
    }
  } else {
    console.error("[metlen-induction] RESEND_API_KEY not configured — email not sent");
  }

  return NextResponse.json({ success: true });
}
