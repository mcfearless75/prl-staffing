import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { sendEmail, getEmailFrom } from "@/lib/email";
import { getGraphConfig, resetGraphToken } from "@/lib/email-graph";

export const dynamic = "force-dynamic";

/**
 * GET  — reports which transport is configured, without sending anything.
 * POST — sends a real test email to the signed-in staff member and reports the result.
 *
 * Exists because email failures used to be invisible: this is the one place to prove
 * the mail path works end to end without waiting for a member of the public to submit
 * a form and hoping something arrives.
 */

function describeConfig() {
  const graph = getGraphConfig();
  return {
    transport: graph ? "microsoft-graph" : process.env.RESEND_API_KEY ? "resend" : "NONE",
    from: getEmailFrom(),
    graph: {
      configured: !!graph,
      sender: graph?.sender ?? null,
      missing: graph
        ? []
        : ["GRAPH_TENANT_ID", "GRAPH_CLIENT_ID", "GRAPH_CLIENT_SECRET", "MAIL_SENDER"].filter(
            (key) => !process.env[key]
          ),
    },
    resendConfigured: !!process.env.RESEND_API_KEY,
  };
}

export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: guard.reason === "forbidden" ? 403 : 401 }
    );
  }
  return NextResponse.json(describeConfig());
}

export async function POST(request: NextRequest) {
  const guard = await requireStaff();
  if (!guard.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: guard.reason === "forbidden" ? 403 : 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const to = typeof body.to === "string" && body.to.trim() ? body.to.trim() : guard.session.user.email;

  if (!to) {
    return NextResponse.json(
      { error: "No recipient — your account has no email address, so pass { to } explicitly." },
      { status: 400 }
    );
  }

  // Force a fresh token so the test genuinely exercises the credentials.
  resetGraphToken();

  const config = describeConfig();
  const sentAt = new Date().toISOString();

  const result = await sendEmail({
    to,
    subject: "PRISM email test",
    template: "email-test",
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="color:#1F4E79;margin:0 0 12px;">PRISM email test</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">
        If you are reading this, PRISM can send email successfully.
      </p>
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr><td style="padding:5px 0;color:#6B7280;width:130px;">Transport</td><td style="padding:5px 0;font-weight:600;">${config.transport}</td></tr>
        <tr><td style="padding:5px 0;color:#6B7280;">From</td><td style="padding:5px 0;">${config.from}</td></tr>
        <tr><td style="padding:5px 0;color:#6B7280;">Requested by</td><td style="padding:5px 0;">${guard.session.user.email ?? "unknown"}</td></tr>
        <tr><td style="padding:5px 0;color:#6B7280;">Sent at</td><td style="padding:5px 0;">${sentAt}</td></tr>
      </table>
    </div>`,
  });

  return NextResponse.json(
    { ...config, to, sentAt, result },
    { status: result.success ? 200 : 502 }
  );
}
