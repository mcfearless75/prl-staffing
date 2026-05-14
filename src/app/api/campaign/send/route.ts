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

function getMissingFields(contractor: {
  phone: string | null;
  address: string | null;
  postcode: string | null;
  dateOfBirth: Date | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  niNumber: string | null;
}): string[] {
  const missing: string[] = [];
  if (!contractor.phone) missing.push("Phone number");
  if (!contractor.address) missing.push("Home address");
  if (!contractor.postcode) missing.push("Postcode");
  if (!contractor.dateOfBirth) missing.push("Date of birth");
  if (!contractor.emergencyContactName) missing.push("Emergency contact name");
  if (!contractor.emergencyContactPhone) missing.push("Emergency contact phone");
  if (!contractor.niNumber) missing.push("NI number");
  return missing;
}

function buildProfileCompletionHtml(
  firstName: string,
  portalUrl: string,
  missing: string[],
  hasDocs: boolean,
  trackingToken: string,
  deadline?: string
): string {
  const trackingPixel = `${APP_URL}/api/campaign/track/${trackingToken}`;
  const todoItems = [
    ...missing.map((f) => `<li>&#9744; ${f}</li>`),
    ...(!hasDocs ? ["<li>&#9744; Upload your compliance documents (CSCS card, Right to Work, DBS, etc.)</li>"] : []),
  ].join("\n          ");

  const urgencyBanner = deadline
    ? `<div style="background:#fee2e2;border:2px solid #fca5a5;border-radius:8px;padding:16px;margin:0 0 20px;text-align:center;">
        <p style="color:#991b1b;font-size:15px;font-weight:700;margin:0 0 4px;">&#128338; Deadline: ${deadline}</p>
        <p style="color:#b91c1c;font-size:13px;margin:0;line-height:1.6;">
          We need <strong>everyone</strong> to have their vital details updated by <strong>${deadline}</strong>. Please log in and complete your profile as soon as possible — this is essential before you can be placed on site.
        </p>
      </div>`
    : `<div style="background:#fee2e2;border:2px solid #fca5a5;border-radius:8px;padding:16px;margin:0 0 20px;text-align:center;">
        <p style="color:#991b1b;font-size:15px;font-weight:700;margin:0 0 4px;">&#9888; Action Required — Please complete as soon as possible</p>
        <p style="color:#b91c1c;font-size:13px;margin:0;line-height:1.6;">
          Your PRISM profile is <strong>incomplete</strong>. You must complete it before you can be placed on site. Please log in and finish the items listed below.
        </p>
      </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Action Required — Complete Your PRISM Profile</title>
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

      <p style="color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 16px;">
        ${deadline
          ? `First of all — <strong>thank you</strong> for signing up to PRISM. We really appreciate everyone who has already set up their account and we're delighted with the response so far.`
          : `We can see your PRISM profile still has some outstanding items that need completing before you can be placed on site. This is a reminder to log in and finish them off — it only takes a few minutes.`
        }
      </p>

      ${urgencyBanner}

      <!-- Action required box -->
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:0 0 24px;">
        <p style="color:#92400e;font-size:14px;font-weight:700;margin:0 0 12px;">&#9888; Please complete the following as soon as possible:</p>
        <ul style="color:#374151;font-size:14px;line-height:2.2;padding-left:20px;margin:0;">
          ${todoItems}
        </ul>
      </div>

      <!-- Why it matters -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:0 0 24px;">
        <p style="color:#1e40af;font-size:13px;margin:0;line-height:1.7;">
          <strong>Why does this matter?</strong> Your profile must be 100% complete before you can be placed on site. Compliance documents (CSCS card, Right to Work, DBS etc.) are required by our clients before any assignment can begin. We want to make sure you're work-ready without any delays.
        </p>
      </div>

      <!-- How to complete -->
      <p style="color:#1f2937;font-size:15px;font-weight:600;margin:0 0 12px;">How to complete your profile:</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr>
          <td style="width:36px;vertical-align:top;padding-bottom:16px;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">1</div>
          </td>
          <td style="vertical-align:top;padding-bottom:16px;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Log in at <a href="${APP_URL}" style="color:#1F4E79;font-weight:600;">www.prismworkforce.online</a></p>
          </td>
        </tr>
        <tr>
          <td style="width:36px;vertical-align:top;padding-bottom:16px;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">2</div>
          </td>
          <td style="vertical-align:top;padding-bottom:16px;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Go to <strong>My Profile</strong> and fill in all personal details</p>
          </td>
        </tr>
        <tr>
          <td style="width:36px;vertical-align:top;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">3</div>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Go to <strong>My Documents</strong> and upload your compliance certificates</p>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${portalUrl}"
           style="display:inline-block;background:#2563eb;color:#ffffff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.5px;">
          Complete My Profile Now
        </a>
      </div>

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

    <img src="${trackingPixel}" width="1" height="1" style="display:none;" alt="" />
  </div>
</body>
</html>`;
}

function buildNoComplianceHtml(
  firstName: string,
  portalUrl: string,
  isActivated: boolean,
  trackingToken: string
): string {
  const trackingPixel = `${APP_URL}/api/campaign/track/${trackingToken}`;
  const ctaUrl = isActivated ? portalUrl : `${APP_URL}/setup-account`;
  const ctaLabel = isActivated ? "Upload My Documents Now" : "Set Up Account &amp; Upload Documents";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Action Required — No Compliance Documents on File</title>
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

      <p style="color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 16px;">
        We've checked your file on PRISM and we currently have <strong>no compliance documents on record</strong> for you. This means we are unable to place you on site until this is resolved.
      </p>

      <!-- Urgency banner -->
      <div style="background:#fee2e2;border:2px solid #fca5a5;border-radius:8px;padding:16px;margin:0 0 20px;text-align:center;">
        <p style="color:#991b1b;font-size:15px;font-weight:700;margin:0 0 4px;">&#9888; No Compliance Documents on File</p>
        <p style="color:#b91c1c;font-size:13px;margin:0;line-height:1.6;">
          You cannot be placed on site until your compliance documents are uploaded and verified.
        </p>
      </div>

      <!-- Required docs -->
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:0 0 24px;">
        <p style="color:#92400e;font-size:14px;font-weight:700;margin:0 0 12px;">&#9888; Documents you will need to upload:</p>
        <ul style="color:#374151;font-size:14px;line-height:2.2;padding-left:20px;margin:0;">
          <li>&#9744; CSCS Card (Construction Skills Certification Scheme)</li>
          <li>&#9744; Right to Work document (passport, visa, or share code)</li>
          <li>&#9744; Public Liability Insurance certificate</li>
          <li>&#9744; DBS certificate (if required for your role)</li>
          <li>&#9744; Any relevant trade qualifications or certificates</li>
        </ul>
      </div>

      <!-- Why it matters -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:0 0 24px;">
        <p style="color:#1e40af;font-size:13px;margin:0;line-height:1.7;">
          <strong>Why is this required?</strong> Our clients have strict compliance requirements before any worker can be placed on site. Without verified documents, we are legally unable to assign you to any project — regardless of your availability or experience.
        </p>
      </div>

      <!-- How to upload -->
      <p style="color:#1f2937;font-size:15px;font-weight:600;margin:0 0 12px;">How to upload your documents:</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr>
          <td style="width:36px;vertical-align:top;padding-bottom:16px;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">1</div>
          </td>
          <td style="vertical-align:top;padding-bottom:16px;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">${isActivated ? `Log in at <a href="${APP_URL}" style="color:#1F4E79;font-weight:600;">www.prismworkforce.online</a>` : `Click the button below to set up your account at <a href="${APP_URL}" style="color:#1F4E79;font-weight:600;">www.prismworkforce.online</a>`}</p>
          </td>
        </tr>
        <tr>
          <td style="width:36px;vertical-align:top;padding-bottom:16px;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">2</div>
          </td>
          <td style="vertical-align:top;padding-bottom:16px;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Go to <strong>My Documents</strong> in your profile</p>
          </td>
        </tr>
        <tr>
          <td style="width:36px;vertical-align:top;">
            <div style="width:28px;height:28px;background:#1F4E79;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">3</div>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Upload each document — we'll verify them and update your compliance status</p>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${ctaUrl}"
           style="display:inline-block;background:#dc2626;color:#ffffff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.5px;">
          ${ctaLabel}
        </a>
      </div>

      <p style="color:#6b7280;font-size:12px;text-align:center;margin:0 0 24px;">
        If you have trouble clicking the button, visit:<br/>
        <a href="${ctaUrl}" style="color:#2563eb;word-break:break-all;">${ctaUrl}</a>
      </p>

      <!-- Help -->
      <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
        <p style="color:#6b7280;font-size:13px;margin:0;">
          Questions about what documents you need? Email us at <a href="mailto:${HELP_EMAIL}" style="color:#1F4E79;">${HELP_EMAIL}</a> — we're happy to help.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        PRL Site Solutions | Recruitment Specialists | <a href="${APP_URL}" style="color:#9ca3af;">www.prismworkforce.online</a>
      </p>
    </div>

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

    // mode: "profileCompletion" | "resend" | "resendAll" | "incompleteOnly" | "newUsers" | undefined (normal launch)
    let isResend = false;
    let isProfileCompletion = false;
    let isResendAll = false;
    let isIncompleteOnly = false;
    let isNewUsers = false;
    let isNoCompliance = false;
    try {
      const body = await request.json();
      isResend = body?.resend === true;
      isProfileCompletion = body?.mode === "profileCompletion";
      isResendAll = body?.mode === "resendAll";
      isIncompleteOnly = body?.mode === "incompleteOnly";
      isNewUsers = body?.mode === "newUsers";
      isNoCompliance = body?.mode === "noCompliance";
      // resendAll and incompleteOnly use the profile completion email template
      if (isResendAll || isIncompleteOnly) isProfileCompletion = true;
    } catch {
      // no body or non-JSON — default to normal send
    }

    const resendClient = new Resend(apiKey);

    // Build query based on mode
    const baseWhere = {
      NOT: { email: { contains: "prl-placeholder" } },
    };

    const contractors = await prisma.contractor.findMany({
      where: isNoCompliance
        ? { ...baseWhere, compliances: { none: {} } }
        : isResendAll || isIncompleteOnly
        // Fetch ALL activated contractors; incompleteOnly will filter in-code
        ? { ...baseWhere, contractorLogin: { isNot: null } }
        : isProfileCompletion
        // Profile completion: only activated contractors who haven't been sent this yet
        ? { ...baseWhere, contractorLogin: { isNot: null }, profileCompletionSentAt: null }
        : isResend
        // Resend: everyone
        ? baseWhere
        // newUsers + normal launch: only those not yet invited
        : { ...baseWhere, inviteSentAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        postcode: true,
        dateOfBirth: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        niNumber: true,
        contractorLogin: { select: { email: true } },
        compliances: { select: { filePath: true } },
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

        const trackingToken = crypto.randomUUID();
        let html: string;
        let subject: string;
        let action: string;
        let details: string;

        if (isNoCompliance) {
          const isActivated = !!contractor.contractorLogin;
          html = buildNoComplianceHtml(
            contractor.firstName,
            `${APP_URL}/portal`,
            isActivated,
            trackingToken
          );
          subject = "Action Required: No compliance documents on file — PRISM";
          action = "Sent No-Compliance Campaign Email";
          details = `No-compliance reminder sent to ${email}`;
        } else if (isProfileCompletion) {
          // Work out what's missing for this contractor
          const missingFields = getMissingFields(contractor);
          const hasDocs = contractor.compliances.some((d) => d.filePath);

          // incompleteOnly: skip contractors who are already fully complete
          if (isIncompleteOnly && missingFields.length === 0 && hasDocs) {
            continue;
          }

          html = buildProfileCompletionHtml(
            contractor.firstName,
            `${APP_URL}/portal`,
            missingFields,
            hasDocs,
            trackingToken,
            // Only pass a deadline for the original timed campaign, not the new ongoing one
            isIncompleteOnly ? undefined : "Friday 24th April"
          );
          subject = isIncompleteOnly
            ? "Action Required: Your PRISM profile is incomplete"
            : "Action Required by Fri 24th April: Complete your PRISM profile";
          action = isIncompleteOnly ? "Sent Incomplete Profile Campaign Email" : "Sent Profile Completion Email";
          details = `Profile completion reminder sent to ${email}`;
        } else {
          // Launch / corrective emails — also create a reset token
          const resetToken = crypto.randomUUID();
          await prisma.passwordResetToken.create({
            data: { email, token: resetToken, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
          });

          const setupUrl = `${APP_URL}/setup-account`;
          html = isResend
            ? buildResendEmailHtml(contractor.firstName, setupUrl, trackingToken)
            : buildEmailHtml(contractor.firstName, setupUrl, trackingToken);
          subject = isResend
            ? "Important Update: Your PRL Site Solutions Contractor Portal Access"
            : "Welcome to the PRL Site Solutions Contractor Portal";
          action = isResend ? "Sent Corrective Campaign Email" : "Sent Campaign Email";
          details = isResend
            ? `Corrective campaign email sent to ${email}`
            : `Campaign launch email sent to ${email}`;
        }

        const { error } = await resendClient.emails.send({
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

        // Update contractor record
        await prisma.contractor.update({
          where: { id: contractor.id },
          data: isNoCompliance || isProfileCompletion
            ? { profileCompletionSentAt: new Date(), inviteToken: trackingToken }
            : { inviteToken: trackingToken, inviteSentAt: new Date() },
        });

        await prisma.activityLog.create({
          data: {
            userId: (session.user as { id?: string }).id,
            userName: session.user.name,
            userEmail: session.user.email,
            action,
            entityType: "Contractor",
            entityId: contractor.id,
            details,
          },
        });

        sent++;
        await sleep(600);
      } catch (err) {
        failed++;
        errors.push(`${contractor.firstName} ${contractor.lastName}: ${String(err)}`);
      }
    }

    // Campaign-level summary log
    const campaignMode = isNoCompliance ? "No Compliance Chase" : isIncompleteOnly ? "Incomplete Contractors" : isResendAll ? "Resend All" : isProfileCompletion ? "Profile Completion" : isResend ? "Resend Launch" : isNewUsers ? "New Users" : "Launch";
    await prisma.activityLog.create({
      data: {
        userId: (session.user as { id?: string }).id,
        userName: session.user.name,
        userEmail: session.user.email,
        action: `Campaign Sent — ${campaignMode}`,
        entityType: "Campaign",
        details: JSON.stringify({
          mode: campaignMode,
          sent,
          failed,
          total: contractors.length,
          errors: errors.length > 0 ? errors : undefined,
          sentAt: new Date().toISOString(),
          triggeredBy: session.user.email,
        }),
      },
    });

    return NextResponse.json({ sent, failed, errors });
  } catch (err) {
    console.error("Campaign send error:", err);
    return NextResponse.json({ error: "Failed to send campaign" }, { status: 500 });
  }
}
