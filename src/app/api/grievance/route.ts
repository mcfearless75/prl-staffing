import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, GRIEVANCE_RECIPIENTS } from "@/lib/email";
import { Prisma } from "@prisma/client";
import { nextTicketNumber } from "@/lib/ticket-number";

// IP-based rate limiter per hour. Generous because whole sites often share one
// NAT'd IP — a tight limit silently 429s legitimate operatives.
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

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    const data = await request.json();
    const {
      name,
      email,
      phone,
      role,
      site,
      incidentDate,
      grievanceType,
      grievanceOther,
      description,
      desiredOutcome,
      raisedInformally,
      witnesses,
      signature,
    } = data;

    if (!name || !email || !description || !signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const types = Array.isArray(grievanceType) ? grievanceType.join(", ") : grievanceType || "";
    const fullType = grievanceOther ? `${types} (${grievanceOther})` : types;

    // Create Grievance record. Ticket number is derived from the highest
    // existing suffix; retry on a P2002 collision from a concurrent submission.
    let grievance;
    for (let attempt = 0; ; attempt++) {
      const existing = await prisma.grievance.findMany({ select: { ticketNumber: true } });
      try {
        grievance = await prisma.grievance.create({
          data: {
            ticketNumber: nextTicketNumber("GRV", existing),
            name,
            email,
            phone: phone || null,
            role: role || null,
            site: site || null,
            incidentDate: incidentDate || null,
            grievanceType: fullType,
            description,
            desiredOutcome: desiredOutcome || null,
            raisedInformally: raisedInformally || null,
            witnesses: witnesses || null,
            signature,
            status: "Open",
          },
        });
        break;
      } catch (e) {
        const isCollision =
          e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
        if (!isCollision || attempt >= 2) throw e;
      }
    }
    const ticketNumber = grievance.ticketNumber;

    await prisma.activityLog.create({
      data: {
        action: "GRIEVANCE",
        entityType: "Grievance",
        entityId: grievance.id,
        userEmail: email,
        userName: name,
        details: `Grievance ${ticketNumber} submitted: ${fullType || "General"}`,
      },
    });

    // Send email to Adella and Keenan
    const baseUrl = process.env.NEXTAUTH_URL || "https://www.prismworkforce.online";

      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safePhone = phone ? escapeHtml(phone) : null;
      const safeRole = role ? escapeHtml(role) : null;
      const safeSite = site ? escapeHtml(site) : null;
      const safeDate = incidentDate ? escapeHtml(incidentDate) : null;
      const safeType = escapeHtml(fullType || "Not specified");
      const safeDescription = escapeHtml(description);
      const safeOutcome = desiredOutcome ? escapeHtml(desiredOutcome) : null;
      const safeWitnesses = witnesses ? escapeHtml(witnesses) : null;
      const safeSignature = escapeHtml(signature);

      const emailResult = await sendEmail({
        to: GRIEVANCE_RECIPIENTS,
        subject: `Grievance ${ticketNumber}: ${safeName} — ${safeType}`,
        template: "grievance-submitted",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#7c3aed;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:18px;">Grievance ${ticketNumber}</h1>
            <p style="margin:4px 0 0;font-size:13px;opacity:0.85;">New grievance submitted via PRISM</p>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:24px;border-radius:0 0 8px 8px;">
            <div style="background:#faf5ff;border:1px solid #d8b4fe;border-radius:6px;padding:12px;margin-bottom:16px;">
              <p style="margin:0;font-size:13px;color:#6b21a8;"><strong>${safeName}</strong> — ${safeType}</p>
            </div>
            <table style="width:100%;font-size:13px;margin-bottom:16px;border-collapse:collapse;">
              <tr><td style="color:#666;width:140px;padding:4px 0;">Role:</td><td style="padding:4px 0;">${safeRole || "—"}</td></tr>
              <tr><td style="color:#666;padding:4px 0;">Email:</td><td style="padding:4px 0;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
              ${safePhone ? `<tr><td style="color:#666;padding:4px 0;">Phone:</td><td style="padding:4px 0;">${safePhone}</td></tr>` : ""}
              ${safeSite ? `<tr><td style="color:#666;padding:4px 0;">Site / Employer:</td><td style="padding:4px 0;">${safeSite}</td></tr>` : ""}
              ${safeDate ? `<tr><td style="color:#666;padding:4px 0;">Incident Date:</td><td style="padding:4px 0;">${safeDate}</td></tr>` : ""}
              <tr><td style="color:#666;padding:4px 0;">Raised Informally:</td><td style="padding:4px 0;">${raisedInformally || "Not stated"}</td></tr>
              ${safeWitnesses ? `<tr><td style="color:#666;padding:4px 0;">Witnesses:</td><td style="padding:4px 0;">${safeWitnesses}</td></tr>` : ""}
            </table>
            <div style="margin-bottom:12px;">
              <p style="font-size:12px;font-weight:bold;color:#374151;margin-bottom:4px;">Description:</p>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;">
                <p style="margin:0;font-size:13px;white-space:pre-wrap;">${safeDescription}</p>
              </div>
            </div>
            ${safeOutcome ? `<div style="margin-bottom:12px;">
              <p style="font-size:12px;font-weight:bold;color:#374151;margin-bottom:4px;">Desired Outcome:</p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px;">
                <p style="margin:0;font-size:13px;">${safeOutcome}</p>
              </div>
            </div>` : ""}
            <p style="font-size:12px;color:#666;margin-top:12px;">Signed: <strong>${safeSignature}</strong></p>
            <a href="${baseUrl}/grievances/${grievance.id}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;margin-top:12px;">View in PRISM →</a>
          </div>
        </div>`,
      });

      if (!emailResult.success) {
        console.error(
          `Failed to send grievance notification email for ${ticketNumber} (${email}):`,
          emailResult.error
        );
      }

    return NextResponse.json({ success: true, ticketNumber });
  } catch (error) {
    console.error("Grievance submission error:", error);
    return NextResponse.json({ error: "Failed to submit grievance" }, { status: 500 });
  }
}
