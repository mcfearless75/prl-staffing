import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, CLIENT_ENQUIRY_RECIPIENTS } from "@/lib/email";
import { checkPublicFormRateLimit } from "@/lib/rate-limit";
import {
  enquiryEmailHtml,
  enquiryEmailSubject,
  isAllowedEnquiryOrigin,
  validateClientEnquiry,
} from "@/lib/client-enquiry";

// Public "Request workers" form on the static website posts here cross-origin.

function corsHeaders(origin: string | null): Record<string, string> {
  if (!isAllowedEnquiryOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin!,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!isAllowedEnquiryOrigin(origin)) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  if (!isAllowedEnquiryOrigin(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!checkPublicFormRateLimit(request, "client-enquiry")) {
    return NextResponse.json(
      { error: "Too many enquiries from this connection. Please call 0800 772 3959." },
      { status: 429, headers }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers });
  }

  const result = validateClientEnquiry(body, Date.now());
  if (!result.ok) {
    if (result.spam) return NextResponse.json({ ok: true }, { headers });
    return NextResponse.json({ error: result.error }, { status: 400, headers });
  }
  const e = result.enquiry;

  // Recorded before emailing, so an enquiry survives a mail outage.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  try {
    await prisma.activityLog.create({
      data: {
        action: "CLIENT_ENQUIRY",
        entityType: "WebsiteEnquiry",
        userName: e.name,
        userEmail: e.email,
        ipAddress: ip,
        details: JSON.stringify(e),
      },
    });
  } catch (err) {
    console.error("Client enquiry log failed:", err);
  }

  const sent = await sendEmail({
    to: CLIENT_ENQUIRY_RECIPIENTS,
    subject: enquiryEmailSubject(e),
    html: enquiryEmailHtml(e),
    replyTo: e.email,
    template: "client-enquiry",
  });

  if (!sent.success) {
    return NextResponse.json(
      { error: "Sorry, your enquiry didn't go through. Please call 0800 772 3959 or email info@prlsitesolutions.co.uk." },
      { status: 502, headers }
    );
  }
  return NextResponse.json({ ok: true }, { headers });
}
