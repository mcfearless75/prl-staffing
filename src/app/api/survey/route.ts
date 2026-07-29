import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, SURVEY_RECIPIENTS } from "@/lib/email";

// IP-based rate limiter per hour. This is an unauthenticated public form and
// the scores feed the QMS satisfaction averages, so spam skews reported quality.
const ipSubmissions = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipSubmissions.get(ip);
  if (!record || now - record.windowStart > WINDOW_MS) {
    ipSubmissions.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count += 1;
  return true;
}

function toText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function toRating(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

function toDateOnly(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

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

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkIpRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    const companyName = toText(body.companyName, 200);
    const contactName = toText(body.contactName, 200);
    const contactEmail = toText(body.contactEmail, 200);

    if (!companyName || !contactName || !contactEmail) {
      return NextResponse.json(
        { error: "Company name, contact name, and contact email are required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json(
        { error: "A valid contact email address is required" },
        { status: 400 }
      );
    }

    const overallSatisfaction = toRating(body.overallSatisfaction);
    if (!overallSatisfaction) {
      return NextResponse.json(
        { error: "Overall satisfaction must be a whole number between 1 and 5" },
        { status: 400 }
      );
    }

    const dateOfService = toDateOnly(body.dateOfService);
    const qualityOfWorkers = toRating(body.qualityOfWorkers);
    const communication = toRating(body.communication);
    const compliance = toRating(body.compliance);
    const valueForMoney = toRating(body.valueForMoney);
    const recommend = toText(body.recommend, 10);
    const validRecommend = recommend && ["Yes", "No", "Maybe"].includes(recommend) ? recommend : null;
    const whatDidWell = toText(body.whatDidWell, 5000);
    const whatToImprove = toText(body.whatToImprove, 5000);
    const otherComments = toText(body.otherComments, 5000);

    const survey = await prisma.customerSurvey.create({
      data: {
        companyName,
        contactName,
        contactEmail,
        dateOfService,
        overallSatisfaction,
        qualityOfWorkers,
        communication,
        compliance,
        valueForMoney,
        recommend: validRecommend,
        whatDidWell,
        whatToImprove,
        otherComments,
      },
    });

    // Audit trail. CustomerSurvey is the source of truth; this row only records
    // that the submission happened.
    await prisma.activityLog.create({
      data: {
        userName: contactName,
        userEmail: contactEmail,
        action: "SURVEY",
        entityType: "CustomerSurvey",
        entityId: survey.id,
        details: JSON.stringify({
          companyName,
          contactName,
          contactEmail,
          dateOfService,
          overallSatisfaction,
          qualityOfWorkers,
          communication,
          compliance,
          valueForMoney,
          recommend: validRecommend,
          whatDidWell,
          whatToImprove,
          otherComments,
        }),
      },
    });

    // Send email notification
      const avgScore = [overallSatisfaction, qualityOfWorkers, communication, compliance, valueForMoney]
        .filter((s): s is number => typeof s === "number" && s > 0)
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

            ${validRecommend ? `
              <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Recommendation</h2>
              <p style="font-size:14px;font-weight:600;color:${validRecommend === "Yes" ? "#16a34a" : validRecommend === "No" ? "#dc2626" : "#f59e0b"};">${escapeHtml(validRecommend)}</p>
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

      const emailResult = await sendEmail({
        to: SURVEY_RECIPIENTS,
        subject: `Customer Survey: ${escapeHtml(companyName)} — ${overallSatisfaction}/5`,
        html: emailHtml,
        template: "customer-survey",
      });

      if (!emailResult.success) {
        console.error(
          `Failed to send survey notification email for ${companyName} (survey ${survey.id}):`,
          emailResult.error
        );
      }

    return NextResponse.json({ success: true, id: survey.id, message: "Survey submitted successfully" });
  } catch (error) {
    console.error("Survey submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit survey. Please try again." },
      { status: 500 }
    );
  }
}
