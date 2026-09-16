import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendEmail, CALL_ENQUIRY_RECIPIENTS } from "@/lib/email";
import { verifyRetellWebhookSignature, parseRetellWebhookPayload } from "@/lib/calls/retell-webhook";
import { escapeHtml } from "@/lib/utils";

// Machine-to-machine endpoint: Retell may burst-retry (up to 3x within 10s
// per call) and multiple real calls can land close together, so this limit
// is far higher than the per-IP limits used on human-facing public forms.
const ipRequests = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 200;
const WINDOW_MS = 60 * 60 * 1000;

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    ipRequests.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

function categoryLabel(category: string): string {
  switch (category) {
    case "APPLICANT":
      return "New Applicant";
    case "CONTRACTOR_QUERY":
      return "Contractor Query";
    case "CLIENT_ENQUIRY":
      return "Client Enquiry";
    case "URGENT":
      return "Urgent";
    default:
      return "Other";
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkIpRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-retell-signature");

  let verified = false;
  try {
    verified = await verifyRetellWebhookSignature(rawBody, signature);
  } catch (error) {
    console.error("Retell webhook signature verification could not run:", error);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed = parseRetellWebhookPayload(rawBody);
  if (!parsed.ok) {
    console.error("Retell webhook payload rejected:", parsed.error);
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (parsed.skip) {
    return new NextResponse(null, { status: 204 });
  }

  const { data } = parsed;

  let existing;
  try {
    existing = await prisma.callEnquiry.findUnique({
      where: { retellCallId: data.retellCallId },
    });
  } catch (error) {
    console.error("Failed to look up existing call enquiry:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
  if (existing) {
    // Already processed — Retell retry, not a new call.
    return new NextResponse(null, { status: 204 });
  }

  let enquiryId: string;
  try {
    const enquiry = await prisma.callEnquiry.create({
      data: {
        retellCallId: data.retellCallId,
        category: data.category,
        callerName: data.callerName,
        callerPhone: data.callerPhone,
        contractorIdHint: data.contractorIdHint,
        reason: data.reason,
        summary: data.summary,
        transcript: data.transcript,
        urgent: data.urgent,
      },
    });
    enquiryId = enquiry.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Two retries raced past the findUnique check above.
      return new NextResponse(null, { status: 204 });
    }
    console.error("Failed to record call enquiry:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const emailResult = await sendEmail({
    to: CALL_ENQUIRY_RECIPIENTS,
    subject: `${data.urgent ? "[URGENT] " : ""}Call enquiry: ${categoryLabel(data.category)}`,
    template: "call-enquiry",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1F4E79;">${categoryLabel(data.category)}${data.urgent ? " — URGENT" : ""}</h2>
        <p><strong>Caller:</strong> ${data.callerName != null ? escapeHtml(data.callerName) : "Not given"}${data.callerPhone ? ` (${escapeHtml(data.callerPhone)})` : ""}</p>
        <p><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>
        <p><strong>Summary:</strong> ${escapeHtml(data.summary)}</p>
        <p><a href="https://www.prismworkforce.online/calls/${enquiryId}">View in PRISM</a></p>
      </div>
    `,
  });
  if (!emailResult.success) {
    console.error(`Failed to send call enquiry notification email for ${enquiryId}:`, emailResult.error);
  }

  return new NextResponse(null, { status: 204 });
}
