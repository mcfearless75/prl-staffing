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

function renderStars(count: number): string {
  const filled = "&#9733;"; // filled star
  const empty = "&#9734;"; // empty star
  return `<span style="color:#f59e0b;font-size:18px;">${filled.repeat(count)}${empty.repeat(5 - count)}</span>`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      companyName, contactName, contactEmail, dateOfService,
      overallSatisfaction, qualityOfWorkers, communication,
      compliance, valueForMoney, recommend,
      whatDidWell, whatToImprove, otherComments,
    } = body;

    if (!companyName || !contactName || !contactEmail || !overallSatisfaction) {
      return NextResponse.json(
        { error: "Company name, contact name, email, and overall satisfaction are required" },
        { status: 400 }
      );
    }

    // Save to ActivityLog
    await prisma.activityLog.create({
      data: {
        userName: contactName,
        userEmail: contactEmail,
        action: "SURVEY",
        entityType: "CustomerSurvey",
        details: JSON.stringify({
          companyName,
          contactName,
          contactEmail,
          dateOfService: dateOfService || null,
          overallSatisfaction,
          qualityOfWorkers,
          communication,
          compliance,
          valueForMoney,
          recommend,
          whatDidWell,
          whatToImprove,
          otherComments,
        }),
      },
    });

    // Send email notification
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || "PRL Site Solutions <noreply@prlsitesolutions.online>";

    if (apiKey) {
      const resend = new Resend(apiKey);

      const avgScore = [overallSatisfaction, qualityOfWorkers, communication, compliance, valueForMoney]
        .filter((s) => s > 0)
        .reduce((sum, s, _, arr) => sum + s / arr.length, 0)
        .toFixed(1);

      const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
          <div style="background:#005f8c;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">New Customer Satisfaction Survey</h1>
            <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">PRL Site Solutions — Quality Management</p>
          </div>

          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
              <p style="margin:0;font-size:13px;color:#92400e;">
                <strong>New survey response</strong> received on ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Respondent Details</h2>
            <table style="width:100%;font-size:13px;">
              <tr><td style="padding:4px 0;color:#666;width:180px;">Company:</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(companyName)}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Contact:</td><td style="padding:4px 0;">${escapeHtml(contactName)}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Email:</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(contactEmail)}" style="color:#005f8c;">${escapeHtml(contactEmail)}</a></td></tr>
              ${dateOfService ? `<tr><td style="padding:4px 0;color:#666;">Date of Service:</td><td style="padding:4px 0;">${new Date(dateOfService).toLocaleDateString("en-GB")}</td></tr>` : ""}
            </table>

            <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Ratings (Average: ${avgScore}/5)</h2>
            <table style="width:100%;font-size:13px;">
              <tr><td style="padding:4px 0;color:#666;width:180px;">Overall Satisfaction:</td><td style="padding:4px 0;">${renderStars(overallSatisfaction)} (${overallSatisfaction}/5)</td></tr>
              ${qualityOfWorkers ? `<tr><td style="padding:4px 0;color:#666;">Quality of Workers:</td><td style="padding:4px 0;">${renderStars(qualityOfWorkers)} (${qualityOfWorkers}/5)</td></tr>` : ""}
              ${communication ? `<tr><td style="padding:4px 0;color:#666;">Communication:</td><td style="padding:4px 0;">${renderStars(communication)} (${communication}/5)</td></tr>` : ""}
              ${compliance ? `<tr><td style="padding:4px 0;color:#666;">Compliance & Docs:</td><td style="padding:4px 0;">${renderStars(compliance)} (${compliance}/5)</td></tr>` : ""}
              ${valueForMoney ? `<tr><td style="padding:4px 0;color:#666;">Value for Money:</td><td style="padding:4px 0;">${renderStars(valueForMoney)} (${valueForMoney}/5)</td></tr>` : ""}
            </table>

            ${recommend ? `
              <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Recommendation</h2>
              <p style="font-size:14px;font-weight:600;color:${recommend === "Yes" ? "#16a34a" : recommend === "No" ? "#dc2626" : "#f59e0b"};">${escapeHtml(recommend)}</p>
            ` : ""}

            ${whatDidWell || whatToImprove || otherComments ? `
              <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Comments</h2>
              ${whatDidWell ? `<p style="font-size:13px;margin:8px 0;"><strong>What we did well:</strong> ${escapeHtml(whatDidWell)}</p>` : ""}
              ${whatToImprove ? `<p style="font-size:13px;margin:8px 0;"><strong>What to improve:</strong> ${escapeHtml(whatToImprove)}</p>` : ""}
              ${otherComments ? `<p style="font-size:13px;margin:8px 0;"><strong>Other comments:</strong> ${escapeHtml(otherComments)}</p>` : ""}
            ` : ""}

            <div style="margin-top:24px;padding:16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#0369a1;">View all survey responses in the QMS dashboard</p>
              <a href="${process.env.NEXTAUTH_URL || "https://prl-staffing-production.up.railway.app"}/qms/reports/customer-feedback"
                style="display:inline-block;background:#005f8c;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">
                View Feedback Report
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
          to: ["adella@prlsitesolutions.co.uk"],
          subject: `Customer Survey: ${escapeHtml(companyName)} — ${overallSatisfaction}/5`,
          html: emailHtml,
        });
      } catch (emailErr) {
        console.error("Failed to send survey notification email:", emailErr);
      }
    }

    return NextResponse.json({ success: true, message: "Survey submitted successfully" });
  } catch (error) {
    console.error("Survey submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit survey. Please try again." },
      { status: 500 }
    );
  }
}
