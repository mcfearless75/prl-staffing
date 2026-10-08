import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { sendEmail, ONBOARDING_REPLY_TO } from "@/lib/email";
import { formatGbpRate } from "@/lib/rate-format";
import { isValidUnpaidBreak } from "@/lib/unpaid-break";
import { logActivity } from "@/lib/activity-log";
import { UPLOAD_ALERT_TO } from "@/lib/upload-notification";
import { buildAgreementEmailHtml } from "@/lib/supply-agreement-html";
import { SIGN_LINK_TTL_DAYS } from "@/lib/new-starter-pipeline";

// The agreement's wording and layout live in src/lib/supply-agreement-html.ts,
// shared with the public signing page (/agreement/[token]).

export async function POST(request: Request) {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorised" }, { status: guard.reason === "forbidden" ? 403 : 401 });
  const { session } = guard;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    personName,
    companyName,
    companyAddress,
    contactName,
    contactEmail,
    contactPhone,
    supplyOf,
    siteLocation,
    startDate,
    rates,
    breakdown,
    additionalInfo,
    unpaidBreak,
    sendToEmail,
    contractorId,
    placementId,
  } = body as {
    personName?: string;
    companyName?: string;
    companyAddress?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    supplyOf?: string;
    siteLocation?: string;
    startDate?: string;
    rates?: Array<{ description: string; rate: string; basis: string }>;
    breakdown?: string[];
    additionalInfo?: string;
    unpaidBreak?: string;
    sendToEmail?: string;
    /** Set when sent from the new-starter pipeline (/new-starters). */
    contractorId?: string;
    placementId?: string;
  };

  // contactName/contactEmail/contactPhone are the client's SITE contact, not
  // the subcontractor. The subcontractor is personName, reached at sendToEmail.
  if (!personName?.trim() || !supplyOf?.trim() || !companyName || !contactName || !contactPhone?.trim() || !sendToEmail) {
    return NextResponse.json(
      { error: "Person name, job role, company name, site contact name, contact phone and the subcontractor's email are required" },
      { status: 400 }
    );
  }
  if (!isValidUnpaidBreak(unpaidBreak)) {
    return NextResponse.json({ error: "Please choose the unpaid break per shift" }, { status: 400 });
  }
  const cleanRates = (rates || []).map((r) => ({ ...r, rate: formatGbpRate(r.rate) }));

  /**
   * PRL wrote this agreement, so there is no review step. `sendToEmail`
   * becomes the person's contractor (and later login) email; the login itself
   * is set up from the App Invite, not from this email.
   */
  const loginEmail = sendToEmail.toLowerCase().trim();

  // A staff address would end up as a contractor's login email.
  const staffUser = await prisma.user.findUnique({ where: { email: loginEmail }, select: { id: true } });
  if (staffUser) {
    return NextResponse.json(
      { error: "That email belongs to a PRL staff account. Use the supplier's own email address." },
      { status: 409 }
    );
  }

  const nameParts = personName.trim().split(/\s+/);
  const firstName = nameParts[0] || "Unknown";
  const lastName = nameParts.slice(1).join(" ") || "Unknown";

  // From the new-starter pipeline the person already exists and their status
  // is the pipeline's to manage: never create or re-status them here. The
  // agreement gets a signing link and is linked back to the placement.
  const fromPipeline = Boolean(contractorId || placementId);
  let contractor: { id: string } | null = null;
  if (fromPipeline) {
    if (typeof contractorId !== "string" || typeof placementId !== "string") {
      return NextResponse.json({ error: "Both contractorId and placementId are required" }, { status: 400 });
    }
    const placement = await prisma.newStarterPlacement.findUnique({
      where: { id: placementId },
      select: { contractorId: true, completedAt: true, cancelledAt: true, supplyAgreementId: true },
    });
    if (!placement || placement.contractorId !== contractorId) {
      return NextResponse.json({ error: "New starter placement not found" }, { status: 404 });
    }
    if (placement.completedAt || placement.cancelledAt) {
      return NextResponse.json({ error: "This placement is already completed or cancelled" }, { status: 409 });
    }
    if (placement.supplyAgreementId) {
      const previous = await prisma.supplyAgreement.findUnique({
        where: { id: placement.supplyAgreementId },
        select: { signedAt: true },
      });
      if (previous?.signedAt) {
        return NextResponse.json({ error: "The agreement for this placement is already signed" }, { status: 409 });
      }
    }
    contractor = await prisma.contractor.findUnique({ where: { id: contractorId }, select: { id: true } });
    if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  } else {
    contractor = await prisma.contractor.findFirst({
      where: { email: { equals: loginEmail, mode: "insensitive" } },
      select: { id: true },
    });
  }
  if (!contractor) {
    contractor = await prisma.contractor.create({
      data: {
        firstName,
        lastName,
        email: loginEmail,
        // contactPhone is the site contact's number, not the subcontractor's.
        phone: null,
        status: "Active",
        jobTitle: supplyOf || null,
        ir35Status: "TBD",
        notes: `Created from a subcontractor agreement sent by ${session.user.email || "staff"} on ${new Date().toLocaleDateString("en-GB")}. Company: ${companyName}.`,
      },
      select: { id: true },
    });
  }

  const signToken = fromPipeline ? randomBytes(32).toString("base64url") : null;

  const agreement = await prisma.supplyAgreement.create({
    data: {
      companyName,
      companyAddress: companyAddress || null,
      companyRegNo: null,
      contactName,
      // The login email, so the submission page finds the contractor and its
      // Send App Invite button re-sends to the right address.
      contactEmail: loginEmail,
      contactPhone: contactPhone || null,
      supplyOf: supplyOf || null,
      siteLocation: siteLocation || null,
      startDate: startDate ? new Date(startDate) : null,
      rates: rates ? JSON.stringify(cleanRates) : null,
      breakdown: breakdown ? JSON.stringify(breakdown) : null,
      additionalInfo: additionalInfo || null,
      unpaidBreak,
      firstName,
      lastName,
      status: "Approved",
      ...(fromPipeline ? { contractorId: contractor.id, signToken } : {}),
      reviewedBy: session.user.email || "staff",
      reviewedAt: new Date(),
      notes: `Sent from PRISM to ${loginEmail}. Contractor ${contractor.id}.${
        contactEmail?.trim() ? ` Site contact email: ${contactEmail.trim()}.` : ""
      }`,
    },
  });

  if (fromPipeline && placementId) {
    // A resend replaces the earlier unsigned agreement: kill its link so only
    // the newest one can be signed, then point the placement at the new one.
    const placement = await prisma.newStarterPlacement.findUnique({
      where: { id: placementId },
      select: { supplyAgreementId: true },
    });
    if (placement?.supplyAgreementId) {
      await prisma.supplyAgreement.updateMany({
        where: { id: placement.supplyAgreementId, signedAt: null },
        data: { signToken: null },
      });
    }
    await prisma.newStarterPlacement.update({
      where: { id: placementId },
      data: { supplyAgreementId: agreement.id },
    });
  }

  const appUrl = process.env.NEXTAUTH_URL || "https://www.prismworkforce.online";
  const content = {
    personName,
    companyName,
    companyAddress,
    contactName,
    contactEmail,
    contactPhone,
    supplyOf,
    siteLocation,
    startDate: startDate ? new Date(startDate) : null,
    rates: cleanRates,
    breakdown: (breakdown || []) as string[],
    additionalInfo,
    unpaidBreak,
  };
  const buildHtml = () =>
    buildAgreementEmailHtml(
      content,
      signToken ? { signUrl: `${appUrl}/agreement/${signToken}`, signDays: SIGN_LINK_TTL_DAYS } : {}
    );

    const subject = `Your Subcontractor Agreement — ${companyName}`;

    const emailResult = await sendEmail({
      to: loginEmail,
      subject,
      html: buildHtml(),
      template: "supply-agreement-invite",
      replyTo: ONBOARDING_REPLY_TO,
    });

    if (!emailResult.success) {
      console.error(
        `[onboarding/invite] Failed to send agreement for ${companyName} (agreement ${agreement.id}) to ${loginEmail}:`,
        emailResult.error
      );
      return NextResponse.json(
        { error: "The agreement was saved but the email could not be sent. Open it under Submissions and use Send App Invite to retry." },
        { status: 502 }
      );
    }

    await logActivity("Subcontractor agreement sent", "Contractor", contractor.id, `${companyName} — to ${loginEmail}`);

    // Records copy to the shared admin@ mailbox only (Erica/Jenni, 08-10-26).
    // It used to go to helen@ AND whoever pressed Send, so the same copy
    // landed in several personal inboxes.
    const staffCopyTo = [UPLOAD_ALERT_TO];
    const copyResult = await sendEmail({
      to: staffCopyTo,
      subject: `[Copy] ${subject}`,
      // Never the signing link: only the worker may sign their agreement.
      html: buildAgreementEmailHtml(content),
      template: "supply-agreement-invite-copy",
    });
    if (!copyResult.success) {
      console.error(`[onboarding/invite] Failed to send staff copy for agreement ${agreement.id}:`, copyResult.error);
    }

  return NextResponse.json({ success: true, id: agreement.id });
}
