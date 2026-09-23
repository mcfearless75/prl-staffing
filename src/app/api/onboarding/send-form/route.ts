import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { sendEmail, ONBOARDING_REPLY_TO } from "@/lib/email";
import { escapeHtml } from "@/lib/utils";

const FORM_URL = "https://www.prismworkforce.online/onboarding";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email a subcontractor the link to the public supply agreement form.
 *
 * PRISM only offered a "Public Form" button, which opens the form in the staff
 * member's own browser. With no way to send it, staff filled it in themselves
 * and the receipt came back to them instead of the subcontractor.
 */
export async function POST(request: Request) {
  const guard = await requireStaff();
  if (!guard.ok) {
    return NextResponse.json({ error: "Unauthorised" }, { status: guard.reason === "forbidden" ? 403 : 401 });
  }

  let body: { name?: unknown; email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const firstName = name.split(/\s+/)[0] || "there";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#005f8c;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:20px;">Your Supply Agreement</h1>
        <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">PRL Site Solutions — Recruitment Specialists</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#333;">Hi ${escapeHtml(firstName)},</p>
        <p style="font-size:14px;color:#333;">
          To get you set up to work with PRL Site Solutions, please fill in our supply agreement form.
          It takes about 10 minutes.
        </p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${FORM_URL}"
            style="display:inline-block;background:#005f8c;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:700;">
            Fill in the form &rarr;
          </a>
        </p>
        <p style="font-size:14px;color:#333;">
          Once we've approved it, you'll get a second email with a link to set up your PRISM login,
          where you can upload your compliance documents.
        </p>
        <p style="font-size:13px;color:#666;margin-top:20px;">
          Any questions? Just reply to this email, or call us on <strong>0800 772 3959</strong>.
        </p>
      </div>
      <p style="text-align:center;font-size:11px;color:#999;margin-top:16px;">
        PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk
      </p>
    </div>
  `;

  const result = await sendEmail({
    to: email,
    subject: "Please complete your supply agreement — PRL Site Solutions",
    html,
    template: "supply-agreement-form-link",
    replyTo: ONBOARDING_REPLY_TO,
  });

  if (!result.success) {
    console.error(`Failed to send supply agreement form link to ${email}:`, result.error);
    return NextResponse.json({ error: "The email could not be sent. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
