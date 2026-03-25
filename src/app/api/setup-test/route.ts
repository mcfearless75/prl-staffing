import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const TEST_CONTRACTORS = [
  { firstName: "Paul", lastName: "McWilliam", email: "paulmc18@gmail.com", jobTitle: "Test Admin", phone: "" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const sendEmail = searchParams.get("send") === "true";
  const emailOnly = searchParams.get("emailOnly");

  const expectedKey = process.env.ADMIN_SECRET || "prl-setup-2026";
  if (key !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://prl-staffing-production.up.railway.app";
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "PRL Site Solutions <noreply@prlsitesolutions.online>";
  const results: string[] = [];

  // If emailOnly is set, just send the instruction email to that address
  if (emailOnly && apiKey) {
    const resend = new Resend(apiKey);
    const instructionHtml = getInstructionEmail(baseUrl);

    try {
      await resend.emails.send({
        from: fromEmail,
        to: [emailOnly],
        subject: "Welcome to PRL Site Solutions — Your Contractor Portal is Ready",
        html: instructionHtml,
      });
      return NextResponse.json({ message: `Instruction email sent to ${emailOnly}` });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  for (const tc of TEST_CONTRACTORS) {
    // Create contractor if not exists
    let contractor = await prisma.contractor.findFirst({
      where: { email: tc.email },
    });

    if (!contractor) {
      contractor = await prisma.contractor.create({
        data: {
          firstName: tc.firstName,
          lastName: tc.lastName,
          email: tc.email,
          phone: tc.phone || null,
          jobTitle: tc.jobTitle || null,
          status: "Active",
        },
      });
      results.push(`${tc.firstName} ${tc.lastName} — contractor created`);
    } else {
      results.push(`${tc.firstName} ${tc.lastName} — contractor already exists`);
    }

    // Create login if not exists
    let login = await prisma.contractorLogin.findUnique({
      where: { email: tc.email },
    });

    if (!login) {
      const tempPassword = crypto.randomBytes(16).toString("hex");
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      login = await prisma.contractorLogin.create({
        data: {
          email: tc.email,
          passwordHash,
          contractorId: contractor.id,
        },
      });
      results.push(`  → login created`);
    } else {
      results.push(`  → login already exists`);
    }

    // Send instruction email if requested
    if (sendEmail && apiKey) {
      const resend = new Resend(apiKey);
      const instructionHtml = getInstructionEmail(baseUrl);

      try {
        await resend.emails.send({
          from: fromEmail,
          to: [tc.email],
          subject: "Welcome to PRL Site Solutions — Your Contractor Portal is Ready",
          html: instructionHtml,
        });
        results.push(`  → instruction email sent`);
      } catch (err) {
        results.push(`  → email FAILED: ${String(err)}`);
      }
    }
  }

  return NextResponse.json({ results });
}

function getInstructionEmail(baseUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">

  <!-- Header -->
  <div style="background:#005f8c;color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="margin:0;font-size:22px;letter-spacing:1px;">PRL Site Solutions</h1>
    <p style="margin:4px 0 0;font-size:12px;opacity:0.8;">Recruitment Specialists</p>
  </div>

  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 12px 12px;">

    <!-- Welcome -->
    <h2 style="color:#005f8c;margin:0 0 12px;font-size:18px;">Welcome to Your Contractor Portal!</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
      We've set up a secure online portal where you can submit timesheets, upload compliance documents, and manage your profile — all from your phone or computer.
    </p>

    <!-- Step 1 -->
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin-bottom:16px;">
      <h3 style="color:#0369a1;margin:0 0 8px;font-size:15px;">Step 1: Set Your Password</h3>
      <ol style="color:#555;font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
        <li>Go to <a href="${baseUrl}/login" style="color:#005f8c;font-weight:600;">${baseUrl}/login</a></li>
        <li>Click <strong>"Forgot your password?"</strong></li>
        <li>Enter your email address and click <strong>Send</strong></li>
        <li>Check your email for a <strong>"Reset Password"</strong> link</li>
        <li>Click the link and choose a password (minimum 6 characters)</li>
      </ol>
    </div>

    <!-- Step 2 -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:16px;">
      <h3 style="color:#15803d;margin:0 0 8px;font-size:15px;">Step 2: Log In</h3>
      <ol style="color:#555;font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
        <li>Go to <a href="${baseUrl}/login" style="color:#005f8c;font-weight:600;">${baseUrl}/login</a></li>
        <li>Enter your email and the password you just created</li>
        <li>Click <strong>Sign in</strong></li>
        <li>You'll see your <strong>Contractor Portal</strong> dashboard</li>
      </ol>
    </div>

    <!-- Step 3 -->
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:16px;">
      <h3 style="color:#a16207;margin:0 0 8px;font-size:15px;">Step 3: Upload Your Compliance Documents</h3>
      <ol style="color:#555;font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
        <li>Tap <strong>"Upload Docs"</strong> on your dashboard (or the Documents tab at the bottom)</li>
        <li>You'll see a list of required documents: CSCS Card, CV, P45, DBS Check, etc.</li>
        <li>Tap <strong>"Choose File"</strong> or <strong>"Take Photo"</strong> to upload</li>
        <li>You can use your phone camera to snap a picture of your card/certificate</li>
        <li>Once uploaded, the status will change from <span style="color:#dc2626;">Missing</span> to <span style="color:#f59e0b;">Pending</span></li>
        <li>PRL staff will verify and approve — it will then show as <span style="color:#16a34a;">Verified</span></li>
      </ol>
      <p style="color:#92400e;font-size:12px;margin:8px 0 0;"><strong>Please upload at minimum:</strong> CSCS Card, Right to Work document, and DBS Check</p>
    </div>

    <!-- Step 4 -->
    <div style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:8px;padding:16px;margin-bottom:16px;">
      <h3 style="color:#9d174d;margin:0 0 8px;font-size:15px;">Step 4: Update Your Profile</h3>
      <ol style="color:#555;font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
        <li>Tap <strong>"My Profile"</strong> on your dashboard (or the Profile tab at the bottom)</li>
        <li>Update your <strong>phone number</strong>, <strong>address</strong>, and <strong>postcode</strong></li>
        <li><span style="color:#dc2626;font-weight:600;">IMPORTANT:</span> Fill in your <strong>Emergency Contact</strong> — this is required for site safety</li>
        <li>Click <strong>"Save Changes"</strong></li>
      </ol>
    </div>

    <!-- Step 5 -->
    <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:16px;margin-bottom:20px;">
      <h3 style="color:#6d28d9;margin:0 0 8px;font-size:15px;">Step 5: Submit Timesheets (Weekly)</h3>
      <ol style="color:#555;font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
        <li>Tap <strong>"New Timesheet"</strong> on your dashboard</li>
        <li>Select your <strong>assignment</strong> from the dropdown</li>
        <li>Enter your hours for each day (Mon–Sun)</li>
        <li>The system automatically calculates <strong>overtime</strong> and <strong>bank holidays</strong></li>
        <li>Click <strong>"Submit Timesheet"</strong></li>
        <li>PRL will review and approve — you'll see the status update in your portal</li>
      </ol>
      <p style="color:#5b21b6;font-size:12px;margin:8px 0 0;"><strong>Timesheets should be submitted every Friday.</strong></p>
    </div>

    <!-- Add to Home Screen -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <h3 style="color:#334155;margin:0 0 8px;font-size:14px;">📱 Add to Your Phone Home Screen</h3>
      <p style="color:#555;font-size:12px;line-height:1.6;margin:0;">
        <strong>iPhone:</strong> Open the login link in Safari → tap the Share button (⬆️) → tap "Add to Home Screen"<br>
        <strong>Android:</strong> Open the login link in Chrome → tap the three dots (⋮) → tap "Add to Home Screen"<br>
        This creates an app icon so you can access the portal like a normal app!
      </p>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;margin:24px 0;">
      <a href="${baseUrl}/login" style="display:inline-block;background:#005f8c;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
        Get Started →
      </a>
    </div>

    <!-- Help -->
    <p style="color:#999;font-size:12px;text-align:center;margin:16px 0 0;">
      Having trouble? Contact PRL Site Solutions:<br>
      <a href="mailto:adella@prlsitesolutions.co.uk" style="color:#005f8c;">adella@prlsitesolutions.co.uk</a> |
      <a href="tel:08007723959" style="color:#005f8c;">0800 772 3959</a>
    </p>
  </div>

  <p style="text-align:center;font-size:10px;color:#999;margin-top:16px;">
    PRL Site Solutions | Recruitment Specialists<br>
    This is an automated message — please do not reply to this email
  </p>
</div>
</body>
</html>
  `;
}
