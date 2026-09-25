import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { portalFeatureEnabled } from "@/lib/portal-features";
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

export async function POST(request: Request) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });
    const { session } = guard;

    const { contractorId } = await request.json();
    if (!contractorId) {
      return NextResponse.json({ error: "Missing contractorId" }, { status: 400 });
    }

    const contractor = await prisma.contractor.findUnique({
      where: { id: contractorId },
      include: { contractorLogin: true },
    });

    if (!contractor) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    const email = contractor.contractorLogin?.email || contractor.email;
    if (!email) {
      return NextResponse.json({ error: "This contractor has no email address on file" }, { status: 400 });
    }
    const name = escapeHtml(contractor.firstName);
    const appUrl = process.env.NEXTAUTH_URL || "https://www.prismworkforce.online";
    const installUrl = `${appUrl}/install`;
    const loginUrl = `${appUrl}/login`;
    const apkUrl = "https://github.com/mcfearless75/prl-staffing/releases/latest/download/PRISM.apk";

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || "PRL Site Solutions <noreply@prlsitesolutions.online>";

    if (!apiKey) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
        <!-- Header -->
        <div style="background: #005f8c; padding: 30px 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px; letter-spacing: 2px;">PRISM</h1>
          <p style="color: #93c5fd; margin: 6px 0 0; font-size: 13px;">PRL Site Solutions — Contractor Portal</p>
        </div>

        <div style="background: #fff; padding: 30px 24px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin: 0 0 8px; font-size: 20px;">Hi ${name},</h2>
          <p style="color: #6b7280; line-height: 1.6; margin: 0 0 20px; font-size: 14px;">
            Welcome to PRISM — your contractor portal from PRL Site Solutions. You can now ${portalFeatureEnabled("timesheets") ? "manage your timesheets, " : ""}upload compliance documents, and track your assignments all from your phone or computer.
          </p>

          <!-- Install App Button -->
          <div style="text-align: center; margin: 24px 0;">
            <a href="${installUrl}" style="display: inline-block; background: #005f8c; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Install the PRISM App
            </a>
          </div>

          <!-- What You Can Do -->
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #0369a1; font-size: 13px; font-weight: 600; margin: 0 0 8px;">What you can do with PRISM:</p>
            <ul style="color: #374151; font-size: 13px; padding-left: 20px; margin: 0; line-height: 1.8;">
              ${portalFeatureEnabled("timesheets") ? "<li>Submit your weekly timesheets</li>" : ""}
              <li>Upload compliance documents (CSCS, DBS, passport, certs)</li>
              <li>Take photos of cards/certificates with your phone camera</li>
              <li>Track your assignment status</li>
              <li>View your compliance score</li>
              <li>Update your profile and emergency contact details</li>
            </ul>
          </div>

          <!-- How to Install -->
          <h3 style="color: #1f2937; font-size: 15px; margin: 24px 0 12px;">How to Install:</h3>

          <!-- Android -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 12px 0;">
            <p style="color: #166534; font-size: 13px; font-weight: 600; margin: 0 0 6px;">📱 Android Phone:</p>
            <p style="color: #374151; font-size: 13px; margin: 0;">
              <a href="${apkUrl}" style="color: #005f8c; font-weight: 600;">Download the PRISM app here</a>
              — then open the file and tap Install. Allow "unknown sources" if prompted.
            </p>
          </div>

          <!-- iPhone -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 12px 0;">
            <p style="color: #1f2937; font-size: 13px; font-weight: 600; margin: 0 0 6px;">🍎 iPhone:</p>
            <ol style="color: #374151; font-size: 13px; padding-left: 20px; margin: 0; line-height: 1.8;">
              <li>Open <strong>Safari</strong> (must be Safari!)</li>
              <li>Go to <strong><a href="${loginUrl}" style="color: #005f8c;">www.prismworkforce.online</a></strong></li>
              <li>Tap the <strong>Share button ↑</strong> at the bottom</li>
              <li>Tap <strong>"Add to Home Screen"</strong></li>
            </ol>
          </div>

          <!-- Desktop -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 12px 0;">
            <p style="color: #1f2937; font-size: 13px; font-weight: 600; margin: 0 0 6px;">💻 Desktop / Laptop:</p>
            <p style="color: #374151; font-size: 13px; margin: 0;">
              Open <a href="${loginUrl}" style="color: #005f8c; font-weight: 600;">www.prismworkforce.online</a> in Chrome and click the install icon in the address bar.
            </p>
          </div>

          <!-- Getting Started -->
          <h3 style="color: #1f2937; font-size: 15px; margin: 24px 0 12px;">Getting Started:</h3>
          <ol style="color: #374151; font-size: 13px; line-height: 1.8; padding-left: 20px;">
            <li>Go to the login page</li>
            <li>Click <strong>"Forgot your password?"</strong></li>
            <li>Enter your email: <strong>${email}</strong></li>
            <li>Check your inbox for the password reset link</li>
            <li>Set your password — you're in!</li>
          </ol>

          <!-- Support -->
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Need help? Contact PRL Site Solutions at <a href="mailto:info@prlsitesolutions.co.uk" style="color: #005f8c;">info@prlsitesolutions.co.uk</a> or call <strong>0800 772 3959</strong>.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 16px 24px; text-align: center; border-radius: 0 0 12px 12px;">
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">
            PRL Site Solutions | Recruitment Specialists | PRISM Workforce Platform
          </p>
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Welcome to PRISM — Install Your Contractor App",
      html,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the invite
    await prisma.activityLog.create({
      data: {
        userId: (session.user as { id?: string }).id,
        userName: session.user.name,
        userEmail: session.user.email,
        action: "Sent App Invite",
        entityType: "Contractor",
        entityId: contractorId,
        details: `App invite email sent to ${email}`,
      },
    });

    return NextResponse.json({ success: true, emailId: data?.id });
  } catch (error) {
    console.error("Send invite error:", error);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}
