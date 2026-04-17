import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const APP_URL = "https://www.prismworkforce.online";
const FROM = "PRL Site Solutions <infotech@prlsitesolutions.co.uk>";
const HELP_EMAIL = "infotech@prlsitesolutions.co.uk";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildEmailHtml(
  firstName: string,
  setupUrl: string,
  trackingToken: string
): string {
  const trackingPixel = `${APP_URL}/api/campaign/track/${trackingToken}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to PRISM</title>
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
        We're excited to let you know that PRL Site Solutions has launched <strong>PRISM</strong> — our new contractor management portal designed to make your working life easier.
      </p>

      <!-- Why section -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:0 0 24px;">
        <p style="color:#1e40af;font-size:14px;font-weight:600;margin:0 0 12px;">Through PRISM you can:</p>
        <ul style="color:#374151;font-size:14px;line-height:2;padding-left:20px;margin:0;">
          <li>&#10003; View and submit your timesheets online</li>
          <li>&#10003; Access your payslips and compliance documents</li>
          <li>&#10003; Track your assignment details</li>
          <li>&#10003; Raise pay queries instantly</li>
          <li>&#10003; Keep your profile and emergency contacts up to date</li>
        </ul>
      </div>

      <!-- How it works -->
      <p style="color:#1f2937;font-size:15px;font-weight:600;margin:0 0 12px;">How it works:</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr>
          <td style="width:36px;vertical-align:top;padding-bottom:16px;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">1</div>
          </td>
          <td style="vertical-align:top;padding-bottom:16px;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Click the button below to set up your secure password</p>
          </td>
        </tr>
        <tr>
          <td style="width:36px;vertical-align:top;padding-bottom:16px;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">2</div>
          </td>
          <td style="vertical-align:top;padding-bottom:16px;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Log in at <a href="https://www.prismworkforce.online" style="color:#1F4E79;font-weight:600;">www.prismworkforce.online</a> using your email address</p>
          </td>
        </tr>
        <tr>
          <td style="width:36px;vertical-align:top;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">3</div>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Your profile is already set up — just sign in and explore</p>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${setupUrl}"
           style="display:inline-block;background:#2563eb;color:#ffffff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.5px;">
          Set Up My Account
        </a>
      </div>

      <p style="color:#6b7280;font-size:12px;text-align:center;margin:0 0 24px;">
        If you have trouble clicking the button, visit this page in your browser:<br/>
        <a href="${setupUrl}" style="color:#2563eb;word-break:break-all;">${setupUrl}</a>
      </p>

      <!-- Help -->
      <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
        <p style="color:#6b7280;font-size:13px;margin:0;">
          Need help? Email us at <a href="mailto:${HELP_EMAIL}" style="color:#1F4E79;">${HELP_EMAIL}</a> — we're happy to assist.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        PRL Site Solutions | Recruitment Specialists | <a href="${APP_URL}" style="color:#9ca3af;">www.prismworkforce.online</a>
      </p>
    </div>

    <!-- Tracking pixel -->
    <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
  </div>
</body>
</html>`;
}

function buildResendEmailHtml(
  firstName: string,
  setupUrl: string,
  trackingToken: string
): string {
  const trackingPixel = `${APP_URL}/api/campaign/track/${trackingToken}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Important Update — PRISM Portal</title>
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

      <!-- Apology note -->
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:0 0 20px;">
        <p style="color:#92400e;font-size:14px;margin:0;line-height:1.7;">
          <strong>A quick apology:</strong> Our previous email contained an incorrect link that didn't work for some recipients. We're sorry for any inconvenience — these things happen, and we've fixed it now. The correct address is always <strong>www.prismworkforce.online</strong>.
        </p>
      </div>

      <p style="color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 20px;">
        This is a reminder to set up your account on <strong>PRISM</strong> — PRL Site Solutions' contractor management portal. It's the easiest way to manage your timesheets, payslips, and assignment details.
      </p>

      <!-- Already set up? -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:0 0 24px;">
        <p style="color:#1e40af;font-size:14px;font-weight:600;margin:0 0 10px;">Already set up your account?</p>
        <p style="color:#374151;font-size:14px;margin:0;line-height:1.7;">
          Great — just head to <a href="${APP_URL}/login" style="color:#1F4E79;font-weight:600;">www.prismworkforce.online</a> and sign in with your email address and the password you created.<br/><br/>
          If you've forgotten your password, click <strong>"Forgot your password?"</strong> on the login page and we'll send you a reset link straight away.
        </p>
      </div>

      <!-- New user steps -->
      <p style="color:#1f2937;font-size:15px;font-weight:600;margin:0 0 12px;">Haven't set up yet? Here's how:</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr>
          <td style="width:36px;vertical-align:top;padding-bottom:16px;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">1</div>
          </td>
          <td style="vertical-align:top;padding-bottom:16px;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Click the button below to go to the account setup page</p>
          </td>
        </tr>
        <tr>
          <td style="width:36px;vertical-align:top;padding-bottom:16px;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">2</div>
          </td>
          <td style="vertical-align:top;padding-bottom:16px;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Enter your email address and create a password</p>
          </td>
        </tr>
        <tr>
          <td style="width:36px;vertical-align:top;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">3</div>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Log in at <a href="${APP_URL}" style="color:#1F4E79;font-weight:600;">www.prismworkforce.online</a> — your profile is already set up</p>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${setupUrl}"
           style="display:inline-block;background:#2563eb;color:#ffffff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.5px;">
          Set Up My Account
        </a>
      </div>

      <p style="color:#6b7280;font-size:12px;text-align:center;margin:0 0 24px;">
        If you have trouble clicking the button, copy and paste this address into your browser:<br/>
        <a href="${setupUrl}" style="color:#2563eb;word-break:break-all;">${setupUrl}</a>
      </p>

      <!-- Help -->
      <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
        <p style="color:#6b7280;font-size:13px;margin:0;">
          Need help? Email us at <a href="mailto:${HELP_EMAIL}" style="color:#1F4E79;">${HELP_EMAIL}</a> — we're happy to assist.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        PRL Site Solutions | Recruitment Specialists | <a href="${APP_URL}" style="color:#9ca3af;">www.prismworkforce.online</a>
      </p>
    </div>

    <!-- Tracking pixel -->
    <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
  </div>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    // Parse body — resend=true sends corrective email to ALL contractors
    let isResend = false;
    try {
      const body = await request.json();
      isResend = body?.resend === true;
    } catch {
      // no body or non-JSON — default to normal send
    }

    const resend = new Resend(apiKey);

    // Normal send: only those not yet invited. Resend: everyone with a real email.
    const contractors = await prisma.contractor.findMany({
      where: {
        ...(isResend ? {} : { inviteSentAt: null }),
        NOT: {
          email: {
            contains: "prl-placeholder",
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        contractorLogin: {
          select: { email: true },
        },
      },
    });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const contractor of contractors) {
      try {
        const email = contractor.contractorLogin?.email || contractor.email;
        if (!email) {
          failed++;
          errors.push(`${contractor.firstName} ${contractor.lastName}: no email`);
          continue;
        }

        // Generate unique campaign tracking token
        const inviteToken = crypto.randomUUID();

        // Generate a password reset token so they can set their password
        const resetToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await prisma.passwordResetToken.create({
          data: {
            email,
            token: resetToken,
            expiresAt,
          },
        });

        const setupUrl = `${APP_URL}/setup-account`;
        const html = isResend
          ? buildResendEmailHtml(contractor.firstName, setupUrl, inviteToken)
          : buildEmailHtml(contractor.firstName, setupUrl, inviteToken);
        const subject = isResend
          ? "Important Update: Your PRL Site Solutions Contractor Portal Access"
          : "Welcome to the PRL Site Solutions Contractor Portal";

        const { error } = await resend.emails.send({
          from: FROM,
          to: [email],
          subject,
          html,
        });

        if (error) {
          failed++;
          errors.push(`${contractor.firstName} ${contractor.lastName} <${email}>: ${error.message}`);
          continue;
        }

        // Save token and sent timestamp
        await prisma.contractor.update({
          where: { id: contractor.id },
          data: {
            inviteToken,
            inviteSentAt: new Date(),
          },
        });

        // Log the action
        await prisma.activityLog.create({
          data: {
            userId: (session.user as { id?: string }).id,
            userName: session.user.name,
            userEmail: session.user.email,
            action: isResend ? "Sent Corrective Campaign Email" : "Sent Campaign Email",
            entityType: "Contractor",
            entityId: contractor.id,
            details: isResend
              ? `Corrective campaign email sent to ${email}`
              : `Campaign launch email sent to ${email}`,
          },
        });

        sent++;

        // 600ms delay between sends — stays under Resend's 2/sec limit
        await sleep(600);
      } catch (err) {
        failed++;
        errors.push(
          `${contractor.firstName} ${contractor.lastName}: ${String(err)}`
        );
      }
    }

    return NextResponse.json({ sent, failed, errors });
  } catch (err) {
    console.error("Campaign send error:", err);
    return NextResponse.json({ error: "Failed to send campaign" }, { status: 500 });
  }
}
