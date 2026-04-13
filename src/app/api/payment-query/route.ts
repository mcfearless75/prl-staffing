import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { operativeName, email, phone, role, weekEnding, queryType, queryOther, totalHoursClaimed, totalOvertimeClaimed, totalHoursPaid, hours, explanation, signature } = data;

    if (!operativeName || !email || !weekEnding || !explanation || !signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Save to activity log
    await prisma.activityLog.create({
      data: {
        action: "PAYMENT_QUERY",
        entityType: "PaymentQuery",
        userEmail: email,
        userName: operativeName,
        details: JSON.stringify(data),
      },
    });

    // Send email
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || "PRL Site Solutions <noreply@prlsitesolutions.online>";

    if (apiKey) {
      const resend = new Resend(apiKey);
      const queryTypes = (queryType || []).join(", ") + (queryOther ? ` (${queryOther})` : "");
      const hoursRows = (hours || [])
        .map((h: { date: string; start: string; finish: string; hoursClaimed: string; hoursPaid: string }) =>
          `<tr><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;">${h.date || ""}</td><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;text-align:center;">${h.start || ""}</td><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;text-align:center;">${h.finish || ""}</td><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;text-align:center;">${h.hoursClaimed || "0"}</td><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;text-align:center;">${h.hoursPaid || "0"}</td></tr>`
        )
        .join("");

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;">
          <div style="background:#005f8c;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:18px;">Payment Query Submitted</h1>
            <p style="margin:4px 0 0;font-size:12px;opacity:0.8;">Requires review and action</p>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px;margin-bottom:20px;">
              <p style="margin:0;font-size:13px;color:#92400e;"><strong>Payment Query</strong> from ${operativeName}</p>
            </div>

            <h2 style="font-size:14px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:16px 0 10px;">Operative Details</h2>
            <table style="width:100%;font-size:13px;margin-bottom:16px;">
              <tr><td style="padding:3px 0;color:#666;width:140px;">Name:</td><td style="padding:3px 0;font-weight:600;">${operativeName}</td></tr>
              <tr><td style="padding:3px 0;color:#666;">Role:</td><td style="padding:3px 0;">${role || "—"}</td></tr>
              <tr><td style="padding:3px 0;color:#666;">Email:</td><td style="padding:3px 0;"><a href="mailto:${email}" style="color:#005f8c;">${email}</a></td></tr>
              ${phone ? `<tr><td style="padding:3px 0;color:#666;">Phone:</td><td style="padding:3px 0;"><a href="tel:${phone}" style="color:#005f8c;">${phone}</a></td></tr>` : ""}
              <tr><td style="padding:3px 0;color:#666;">Week Ending:</td><td style="padding:3px 0;font-weight:600;">${weekEnding}</td></tr>
            </table>

            <h2 style="font-size:14px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:16px 0 10px;">Query Details</h2>
            <table style="width:100%;font-size:13px;margin-bottom:16px;">
              <tr><td style="padding:3px 0;color:#666;width:140px;">Nature of Query:</td><td style="padding:3px 0;font-weight:600;">${queryTypes || "Not specified"}</td></tr>
              <tr><td style="padding:3px 0;color:#666;">Hours Claimed:</td><td style="padding:3px 0;">${totalHoursClaimed || "—"} hours${totalOvertimeClaimed ? ` (${totalOvertimeClaimed} overtime)` : ""}</td></tr>
              <tr><td style="padding:3px 0;color:#666;">Hours Paid:</td><td style="padding:3px 0;">${totalHoursPaid || "—"}</td></tr>
            </table>

            ${hoursRows ? `
              <h2 style="font-size:14px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:16px 0 10px;">Hours In Question</h2>
              <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                <tr style="background:#005f8c;color:#fff;">
                  <th style="padding:8px 10px;text-align:left;font-size:11px;">Date</th>
                  <th style="padding:8px 10px;text-align:center;font-size:11px;">Start</th>
                  <th style="padding:8px 10px;text-align:center;font-size:11px;">Finish</th>
                  <th style="padding:8px 10px;text-align:center;font-size:11px;">Claimed</th>
                  <th style="padding:8px 10px;text-align:center;font-size:11px;">Paid</th>
                </tr>
                ${hoursRows}
              </table>
            ` : ""}

            <h2 style="font-size:14px;color:#dc2626;border-bottom:2px solid #dc2626;padding-bottom:4px;margin:16px 0 10px;">Explanation</h2>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;margin-bottom:16px;">
              <p style="margin:0;font-size:13px;color:#374151;white-space:pre-wrap;">${explanation}</p>
            </div>

            <p style="font-size:12px;color:#666;margin-top:16px;">Signed: <strong>${signature}</strong></p>
          </div>
          <p style="text-align:center;font-size:11px;color:#999;margin-top:12px;">PRL Site Solutions | 0800 772 3959</p>
        </div>
      `;

      await resend.emails.send({
        from: fromEmail,
        to: ["helen@prlsitesolutions.co.uk", "accounts@prlsitesolutions.co.uk"],
        subject: `Payment Query: ${operativeName} — Week ending ${weekEnding}`,
        html,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment query error:", error);
    return NextResponse.json({ error: "Failed to submit query" }, { status: 500 });
  }
}
