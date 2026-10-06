import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { portalFeatureEnabled } from "@/lib/portal-features";
import { greetingName } from "@/lib/contractor-name";
import { escapeHtml } from "@/lib/utils";

/**
 * The PRISM app invite: "install the app, set your password, upload your
 * documents". Shared by the Send App Invite buttons (/api/send-app-invite) and
 * the new-starter pipeline (/new-starters), so both send the same email and
 * both stamp Contractor.inviteSentAt.
 *
 * Deliberately says nothing about the job — no company, site or pay. Those go
 * in the agreement, once documents are verified.
 */

export interface InviteActor {
  id?: string | null;
  name?: string | null;
  email?: string | null;
}

export type AppInviteResult =
  | { ok: true; emailId?: string; email: string }
  | { ok: false; status: number; error: string };

export async function sendAppInvite(contractorId: string, actor: InviteActor): Promise<AppInviteResult> {
  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
    include: { contractorLogin: true },
  });
  if (!contractor) return { ok: false, status: 404, error: "Contractor not found" };

  const email = contractor.contractorLogin?.email || contractor.email;
  if (!email) return { ok: false, status: 400, error: "This contractor has no email address on file" };

  const name = escapeHtml(greetingName(contractor));
  const appUrl = process.env.NEXTAUTH_URL || "https://www.prismworkforce.online";
  const installUrl = `${appUrl}/install`;
  const loginUrl = `${appUrl}/login`;

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "PRL Site Solutions <noreply@prlsitesolutions.online>";
  if (!apiKey) return { ok: false, status: 500, error: "Email service not configured" };

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
          <ol style="color: #374151; font-size: 13px; padding-left: 20px; margin: 0; line-height: 1.8;">
            <li>Open <strong>Chrome</strong></li>
            <li>Go to <strong><a href="${loginUrl}" style="color: #005f8c;">www.prismworkforce.online</a></strong></li>
            <li>Tap the <strong>three dots ⋮</strong> menu (top right)</li>
            <li>Tap <strong>"Install app"</strong> (on some phones it says <strong>"Add to Home screen"</strong>)</li>
          </ol>
        </div>

        <!-- iPhone -->
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 12px 0;">
          <p style="color: #1f2937; font-size: 13px; font-weight: 600; margin: 0 0 6px;">🍎 iPhone:</p>
          <ol style="color: #374151; font-size: 13px; padding-left: 20px; margin: 0; line-height: 1.8;">
            <li>Open <strong>Safari</strong> or <strong>Chrome</strong></li>
            <li>Go to <strong><a href="${loginUrl}" style="color: #005f8c;">www.prismworkforce.online</a></strong></li>
            <li>Tap the <strong>Share button ↑</strong> — in Safari it's at the bottom (or tap <strong>•••</strong> first); in Chrome it's at the top, next to the web address</li>
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
          <li>Tap <strong>"First time here? Set your password"</strong></li>
          <li>Enter your email: <strong>${escapeHtml(email)}</strong></li>
          <li>Check your inbox for the link (and your junk folder)</li>
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
  if (error) return { ok: false, status: 500, error: error.message };

  // Stamp the send so the Applicants and New Starters pages can show it and
  // staff don't send the same person a second invite by accident.
  await prisma.contractor.update({
    where: { id: contractorId },
    data: { inviteSentAt: new Date() },
  });

  await prisma.activityLog.create({
    data: {
      userId: actor.id ?? null,
      userName: actor.name ?? null,
      userEmail: actor.email ?? null,
      action: "Sent App Invite",
      entityType: "Contractor",
      entityId: contractorId,
      details: `App invite email sent to ${email}`,
    },
  });

  return { ok: true, emailId: data?.id, email };
}
