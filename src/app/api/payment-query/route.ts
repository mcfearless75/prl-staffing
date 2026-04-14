"use server";

import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// IP-based rate limiter: 5 submissions per IP per hour
const ipSubmissions = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipSubmissions.get(ip);

  if (!record || now - record.windowStart > WINDOW_MS) {
    ipSubmissions.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count += 1;
  return true;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: NextRequest) {
  // IP-based rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkIpRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const data = await request.json();
    const { operativeName, email, phone, role, weekEnding, queryType, queryOther, totalHoursClaimed, totalOvertimeClaimed, totalHoursPaid, hours, explanation, signature } = data;

    if (!operativeName || !email || !weekEnding || !explanation || !signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate ticket number
    const count = await prisma.paymentQuery.count();
    const ticketNumber = `PQ-${String(count + 1).padStart(3, "0")}`;

    const queryTypes = Array.isArray(queryType) ? queryType.join(", ") : queryType || "";
    const fullQueryType = queryOther ? `${queryTypes} (${queryOther})` : queryTypes;

    // Create PaymentQuery record
    const query = await prisma.paymentQuery.create({
      data: {
        ticketNumber,
        operativeName,
        email,
        phone: phone || null,
        role: role || null,
        weekEnding,
        queryType: fullQueryType,
        totalHoursClaimed: totalHoursClaimed || null,
        totalOvertimeClaimed: totalOvertimeClaimed || null,
        totalHoursPaid: totalHoursPaid || null,
        hours: hours ? JSON.stringify(hours) : null,
        explanation,
        signature,
        status: "Open",
      },
    });

    // Log to activity
    await prisma.activityLog.create({
      data: {
        action: "PAYMENT_QUERY",
        entityType: "PaymentQuery",
        entityId: query.id,
        userEmail: email,
        userName: operativeName,
        details: `Payment query ${ticketNumber} submitted: ${fullQueryType}`,
      },
    });

    // Send email
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || "PRL Site Solutions <noreply@prlsitesolutions.online>";

    if (apiKey) {
      const resend = new Resend(apiKey);
      // Sanitise all user-supplied values before embedding in HTML
      const safeOperativeName = escapeHtml(operativeName);
      const safeEmail = escapeHtml(email);
      const safePhone = phone ? escapeHtml(phone) : null;
      const safeRole = role ? escapeHtml(role) : null;
      const safeWeekEnding = escapeHtml(weekEnding);
      const safeFullQueryType = escapeHtml(fullQueryType);
      const safeExplanation = escapeHtml(explanation);
      const safeSignature = escapeHtml(signature);
      const safeTotalHoursClaimed = totalHoursClaimed ? escapeHtml(String(totalHoursClaimed)) : null;
      const safeTotalOvertimeClaimed = totalOvertimeClaimed ? escapeHtml(String(totalOvertimeClaimed)) : null;
      const safeTotalHoursPaid = totalHoursPaid ? escapeHtml(String(totalHoursPaid)) : null;

      const hoursRows = (hours || []).filter((h: any) => h.date).map((h: any) =>
        `<tr><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;">${escapeHtml(String(h.date))}</td><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;text-align:center;">${h.start ? escapeHtml(String(h.start)) : ""}</td><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;text-align:center;">${h.finish ? escapeHtml(String(h.finish)) : ""}</td><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;text-align:center;">${escapeHtml(String(h.hoursClaimed || "0"))}</td><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;text-align:center;">${escapeHtml(String(h.hoursPaid || "0"))}</td></tr>`
      ).join("");

      await resend.emails.send({
        from: fromEmail,
        to: ["jenni@prlsitesolutions.co.uk"],
        subject: `Payment Query ${ticketNumber}: ${safeOperativeName} — Week ending ${safeWeekEnding}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#005f8c;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:18px;">Payment Query ${ticketNumber}</h1>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:24px;border-radius:0 0 8px 8px;">
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px;margin-bottom:16px;">
              <p style="margin:0;font-size:13px;color:#92400e;"><strong>${safeOperativeName}</strong> — ${safeFullQueryType}</p>
            </div>
            <table style="width:100%;font-size:13px;margin-bottom:16px;">
              <tr><td style="color:#666;width:120px;">Role:</td><td>${safeRole || "—"}</td></tr>
              <tr><td style="color:#666;">Email:</td><td><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
              ${safePhone ? `<tr><td style="color:#666;">Phone:</td><td>${safePhone}</td></tr>` : ""}
              <tr><td style="color:#666;">Week Ending:</td><td><strong>${safeWeekEnding}</strong></td></tr>
              <tr><td style="color:#666;">Hours Claimed:</td><td>${safeTotalHoursClaimed || "—"} ${safeTotalOvertimeClaimed ? `(${safeTotalOvertimeClaimed} OT)` : ""}</td></tr>
              <tr><td style="color:#666;">Hours Paid:</td><td>${safeTotalHoursPaid || "—"}</td></tr>
            </table>
            ${hoursRows ? `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;"><tr style="background:#005f8c;color:#fff;"><th style="padding:6px;font-size:11px;">Date</th><th style="padding:6px;font-size:11px;">Start</th><th style="padding:6px;font-size:11px;">Finish</th><th style="padding:6px;font-size:11px;">Claimed</th><th style="padding:6px;font-size:11px;">Paid</th></tr>${hoursRows}</table>` : ""}
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;"><p style="margin:0;font-size:13px;">${safeExplanation}</p></div>
            <p style="font-size:12px;color:#666;margin-top:12px;">Signed: <strong>${safeSignature}</strong></p>
            <a href="${process.env.NEXTAUTH_URL || "https://www.prismworkforce.online"}/payment-queries/${query.id}" style="display:inline-block;background:#005f8c;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;margin-top:12px;">View in PRISM →</a>
          </div></div>`,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, ticketNumber });
  } catch (error) {
    console.error("Payment query error:", error);
    return NextResponse.json({ error: "Failed to submit query" }, { status: 500 });
  }
}
