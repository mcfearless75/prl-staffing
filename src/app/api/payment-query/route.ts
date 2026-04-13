"use server";

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
      const hoursRows = (hours || []).filter((h: any) => h.date).map((h: any) =>
        `<tr><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;">${h.date}</td><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;text-align:center;">${h.start || ""}</td><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;text-align:center;">${h.finish || ""}</td><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;text-align:center;">${h.hoursClaimed || "0"}</td><td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:13px;text-align:center;">${h.hoursPaid || "0"}</td></tr>`
      ).join("");

      await resend.emails.send({
        from: fromEmail,
        to: ["jenni@prlsitesolutions.co.uk"],
        subject: `Payment Query ${ticketNumber}: ${operativeName} — Week ending ${weekEnding}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#005f8c;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:18px;">Payment Query ${ticketNumber}</h1>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:24px;border-radius:0 0 8px 8px;">
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px;margin-bottom:16px;">
              <p style="margin:0;font-size:13px;color:#92400e;"><strong>${operativeName}</strong> — ${fullQueryType}</p>
            </div>
            <table style="width:100%;font-size:13px;margin-bottom:16px;">
              <tr><td style="color:#666;width:120px;">Role:</td><td>${role || "—"}</td></tr>
              <tr><td style="color:#666;">Email:</td><td><a href="mailto:${email}">${email}</a></td></tr>
              ${phone ? `<tr><td style="color:#666;">Phone:</td><td>${phone}</td></tr>` : ""}
              <tr><td style="color:#666;">Week Ending:</td><td><strong>${weekEnding}</strong></td></tr>
              <tr><td style="color:#666;">Hours Claimed:</td><td>${totalHoursClaimed || "—"} ${totalOvertimeClaimed ? `(${totalOvertimeClaimed} OT)` : ""}</td></tr>
              <tr><td style="color:#666;">Hours Paid:</td><td>${totalHoursPaid || "—"}</td></tr>
            </table>
            ${hoursRows ? `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;"><tr style="background:#005f8c;color:#fff;"><th style="padding:6px;font-size:11px;">Date</th><th style="padding:6px;font-size:11px;">Start</th><th style="padding:6px;font-size:11px;">Finish</th><th style="padding:6px;font-size:11px;">Claimed</th><th style="padding:6px;font-size:11px;">Paid</th></tr>${hoursRows}</table>` : ""}
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;"><p style="margin:0;font-size:13px;">${explanation}</p></div>
            <p style="font-size:12px;color:#666;margin-top:12px;">Signed: <strong>${signature}</strong></p>
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
