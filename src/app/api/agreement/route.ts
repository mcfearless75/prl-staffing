import { prisma } from "@/lib/db";
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
    const body = await request.json();

    const {
      firstName, lastName, seekingWork,
      country, address, city, postcode, signature,
    } = body;

    if (!country || !address || !city || !postcode || !signature) {
      return NextResponse.json(
        { error: "Please fill in all required fields." },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Save to ActivityLog
    await prisma.activityLog.create({
      data: {
        action: "AGREEMENT_SUBMITTED",
        entityType: "WorkFindingAgreement",
        userName: firstName && lastName ? `${firstName} ${lastName}` : (firstName || lastName || null),
        details: JSON.stringify(body),
        ipAddress,
      },
    });

    // Send branded HTML email
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || "PRL Site Solutions <noreply@prlsitesolutions.online>";

    if (apiKey) {
      const resend = new Resend(apiKey);

      const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
          <div style="background:#005f8c;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">Work Finding Services Agreement Submitted</h1>
            <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">PRL Site Solutions -- Recruitment</p>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
              <p style="margin:0;font-size:13px;color:#92400e;">
                <strong>New agreement</strong> received on ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Worker Details</h2>
            <table style="width:100%;font-size:13px;">
              ${firstName || lastName ? `<tr><td style="padding:4px 0;color:#666;width:180px;">Name:</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(firstName || "")} ${escapeHtml(lastName || "")}</td></tr>` : ""}
              ${seekingWork ? `<tr><td style="padding:4px 0;color:#666;">Seeking Work In:</td><td style="padding:4px 0;">${escapeHtml(seekingWork)}</td></tr>` : ""}
              <tr><td style="padding:4px 0;color:#666;">Country/Region:</td><td style="padding:4px 0;">${escapeHtml(country)}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Address:</td><td style="padding:4px 0;">${escapeHtml(address)}${city ? `, ${escapeHtml(city)}` : ""}${postcode ? ` ${escapeHtml(postcode)}` : ""}</td></tr>
            </table>

            <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Agreement</h2>
            <table style="width:100%;font-size:13px;">
              <tr><td style="padding:4px 0;color:#666;width:180px;">Signature:</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(signature)}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Employment Business:</td><td style="padding:4px 0;">PRL Site Solutions LIMITED (14358717)</td></tr>
            </table>

            <div style="margin-top:24px;padding:16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#0369a1;">Review this submission in the PRL Site Solutions dashboard</p>
              <a href="${process.env.NEXTAUTH_URL || "https://prl-staffing-production.up.railway.app"}"
                style="display:inline-block;background:#005f8c;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">
                Open Dashboard
              </a>
            </div>
          </div>
          <p style="text-align:center;font-size:11px;color:#999;margin-top:16px;">
            PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk
          </p>
        </div>
      `;

      try {
        await resend.emails.send({
          from: fromEmail,
          to: ["helen@prlsitesolutions.co.uk"],
          subject: `Work Finding Agreement: ${escapeHtml(firstName || "")} ${escapeHtml(lastName || "")}`.trim(),
          html: emailHtml,
        });
      } catch (emailErr) {
        console.error("Failed to send agreement notification email:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Agreement submitted successfully",
    });
  } catch (error) {
    console.error("Agreement submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit. Please try again." },
      { status: 500 }
    );
  }
}
