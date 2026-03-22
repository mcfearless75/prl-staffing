import { Resend } from "resend";

/**
 * Send password reset / set password email
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string,
  isNewAccount: boolean = false
) {
  // Read env vars INSIDE the function (not at module level) so they're always fresh
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "PRL Site Solutions <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("RESEND_API_KEY not set. Email not sent to:", to);
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const resend = new Resend(apiKey);

  const subject = isNewAccount
    ? "Set Up Your PRL Site Solutions Account"
    : "Reset Your PRL Site Solutions Password";

  const heading = isNewAccount
    ? "Welcome to PRL Site Solutions"
    : "Password Reset Request";

  const bodyText = isNewAccount
    ? `Hi ${name},\n\nYour contractor portal account has been created. Click the link below to set your password and get started:\n\n${resetUrl}\n\nThis link expires in 24 hours.\n\nOnce you've set your password, you can log in at any time to:\n- View your assignments\n- Submit timesheets\n- Check your compliance status\n\nIf you didn't expect this email, please ignore it.\n\nBest regards,\nPRL Site Solutions`
    : `Hi ${name},\n\nYou requested a password reset. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nPRL Site Solutions`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1F4E79; margin: 0; font-size: 24px;">PRL Site Solutions</h1>
        <p style="color: #666; font-size: 12px; margin: 4px 0 0;">Recruitment Specialists</p>
      </div>

      <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
        <h2 style="color: #333; margin: 0 0 16px; font-size: 20px;">${heading}</h2>
        <p style="color: #555; line-height: 1.6; margin: 0 0 8px;">Hi ${name},</p>
        <p style="color: #555; line-height: 1.6; margin: 0 0 24px;">
          ${isNewAccount
            ? "Your contractor portal account has been created. Click the button below to set your password and get started."
            : "You requested a password reset. Click the button below to set a new password."
          }
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            ${isNewAccount ? "Set My Password" : "Reset Password"}
          </a>
        </div>

        <p style="color: #999; font-size: 12px; margin: 24px 0 0;">
          This link expires in ${isNewAccount ? "24 hours" : "1 hour"}.
          If you didn't ${isNewAccount ? "expect" : "request"} this email, please ignore it.
        </p>

        ${isNewAccount ? `
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">
          <p style="color: #555; font-size: 13px; margin: 0 0 8px;"><strong>Once logged in, you can:</strong></p>
          <ul style="color: #666; font-size: 13px; padding-left: 20px; margin: 0;">
            <li>View your active assignments</li>
            <li>Submit weekly timesheets</li>
            <li>Check your compliance status</li>
          </ul>
        </div>
        ` : ""}
      </div>

      <p style="text-align: center; color: #999; font-size: 11px; margin-top: 24px;">
        PRL Site Solutions | Recruitment Specialists
      </p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
      text: bodyText,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Email send exception:", error);
    return { success: false, error: String(error) };
  }
}
