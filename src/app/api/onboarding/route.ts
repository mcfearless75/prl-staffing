import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendEmail, ONBOARDING_RECIPIENTS, ONBOARDING_REPLY_TO } from "@/lib/email";
import {
  findPotentialDuplicates,
  describeReasons,
  normaliseEmail,
  type DuplicateMatch,
} from "@/lib/duplicate-check";

// IP-based rate limiter per hour. Generous because whole sites often share one
// NAT'd IP — a tight limit silently 429s legitimate submissions.
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
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkIpRateLimit(ipAddress)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    const {
      companyName, companyAddress, companyRegNo,
      contactName, contactPhone,
      supplyOf, siteLocation, startDate,
      rates, breakdown, additionalInfo,
      firstName, lastName, dateOfBirth, niNumber, utrNumber,
      address, postcode,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
      detailsConfirmed, consentGiven,
    } = body;

    // Lower-cased at the door. `approveAndCreateContractor` compares against a
    // lower-cased Contractor.email, so a submission stored as "J.Nye@..." never
    // matched an existing "j.nye@..." and produced a second person.
    const contactEmail =
      typeof body.contactEmail === "string"
        ? body.contactEmail.toLowerCase().trim()
        : body.contactEmail;

    if (!companyName || !contactName || !contactEmail) {
      return NextResponse.json(
        { error: "Company name, contact name, and email are required" },
        { status: 400 }
      );
    }

    if (detailsConfirmed !== true) {
      return NextResponse.json(
        { error: "You must declare that all details provided, including medical history, are accurate before submitting this agreement." },
        { status: 400 }
      );
    }

    if (consentGiven !== true) {
      return NextResponse.json(
        { error: "You must consent to your data being processed before submitting this agreement." },
        { status: 400 }
      );
    }

    /**
     * Is this person already in PRISM?
     *
     * This form creates a SupplyAgreement, never a Contractor, so nothing here
     * used to look at the contractor book at all — the only duplicate check in
     * the whole path ran later, in approveAndCreateContractor, on an exact
     * email match. A submission from somebody already registered was accepted
     * silently and answered with "Submitted!".
     */
    const candidate = {
      email: contactEmail,
      firstName: firstName || contactName?.trim().split(/\s+/)[0],
      lastName: lastName || contactName?.trim().split(/\s+/).slice(1).join(" "),
      phone: contactPhone,
      niNumber,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    };
    let softMatches: DuplicateMatch<{
      id: string;
      ref: string | null;
      firstName: string;
      lastName: string;
      email: string;
      status: string;
    }>[] = [];
    try {
      // Whole-book scan — see the note in /api/apply for why this is not
      // narrowed in SQL (NI and phone are free text stored in several shapes).
      const book = await prisma.contractor.findMany({
        select: {
          id: true, ref: true, firstName: true, lastName: true, email: true,
          status: true, phone: true, niNumber: true, dateOfBirth: true,
        },
      });
      softMatches = findPotentialDuplicates(candidate, book);

      const email = normaliseEmail(contactEmail);
      const exact = softMatches.find((m) => m.reasons.includes("email"));
      if (email && exact) {
        // Registered already. Tell them, and send them to the portal rather
        // than opening a second record for the same person.
        const hasLogin = Boolean(
          await prisma.contractorLogin.findUnique({
            where: { contractorId: exact.record.id },
            select: { id: true },
          })
        );
        return NextResponse.json(
          {
            alreadyRegistered: true,
            hasLogin,
            error: "You already have a PRL Site Solutions account with this email address.",
          },
          { status: 409 }
        );
      }
    } catch (matchErr) {
      // Advisory. A failed scan must never stop a genuine supplier onboarding.
      console.error("Onboarding duplicate scan failed:", matchErr);
    }

    const agreement = await prisma.supplyAgreement.create({
      data: {
        companyName,
        companyAddress: companyAddress || null,
        companyRegNo: companyRegNo || null,
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        supplyOf: supplyOf || null,
        siteLocation: siteLocation || null,
        startDate: startDate ? new Date(startDate) : null,
        rates: rates ? JSON.stringify(rates) : null,
        breakdown: breakdown ? JSON.stringify(breakdown) : null,
        additionalInfo: additionalInfo || null,
        firstName: firstName || null,
        lastName: lastName || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        niNumber: niNumber || null,
        utrNumber: utrNumber || null,
        address: address || null,
        postcode: postcode || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        emergencyContactRelation: emergencyContactRelation || null,
        status: "Pending",
      },
    });

    // GDPR: Record consent
    const userAgent = request.headers.get("user-agent") || "unknown";

    await prisma.consentRecord.create({
      data: {
        email: contactEmail,
        consentType: "onboarding",
        consentGiven,
        ipAddress,
        userAgent,
        consentText:
          "I confirm the information provided is accurate and consent to PRL Site Solutions processing my data as described in the Privacy Policy.",
        givenAt: new Date(),
      },
    });

    // Separate audit record for the medical/accuracy declaration — distinct
    // from GDPR processing consent above, since it's a factual declaration
    // about the submitter rather than a data-processing consent.
    await prisma.consentRecord.create({
      data: {
        email: contactEmail,
        consentType: "accuracy_declaration",
        consentGiven: detailsConfirmed,
        ipAddress,
        userAgent,
        consentText:
          "I declare that all details provided in this form — including my medical history and any health conditions relevant to my fitness to work — are true, complete and accurate.",
        givenAt: new Date(),
      },
    });

    // Send branded HTML email to Adella & Helen
      const ratesData = rates || [];
      const breakdownData = breakdown || [];

      const ratesHtml = ratesData.length > 0
        ? `<table style="width:100%;border-collapse:collapse;margin:12px 0;">
            <tr style="background:#005f8c;color:#fff;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;">Description</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;">Rate</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;">Basis</th>
            </tr>
            ${ratesData.map((r: { description: string; rate: string; basis: string }) =>
              `<tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:6px 12px;font-size:12px;">${escapeHtml(r.description || "")}</td>
                <td style="padding:6px 12px;font-size:12px;text-align:right;font-weight:600;">${escapeHtml(r.rate || "")}</td>
                <td style="padding:6px 12px;font-size:12px;">${escapeHtml(r.basis || "")}</td>
              </tr>`
            ).join("")}
          </table>`
        : "";

      const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
          <!-- Header -->
          <div style="background:#005f8c;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">New Subcontractor Agreement Submitted</h1>
            <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">PRL Site Solutions — Onboarding</p>
          </div>

          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            ${
              softMatches.length === 0
                ? ""
                : `<div style="background:#fee2e2;border:2px solid #dc2626;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
                    <p style="margin:0 0 8px;font-size:14px;color:#991b1b;">
                      <strong>&#9888; Possible duplicate &mdash; check before approving.</strong>
                    </p>
                    <p style="margin:0 0 8px;font-size:12px;color:#7f1d1d;">
                      This submitter looks like ${softMatches.length === 1 ? "an existing subcontractor" : `${softMatches.length} existing subcontractors`} already in PRISM:
                    </p>
                    <ul style="margin:0;padding-left:18px;font-size:13px;color:#7f1d1d;">
                      ${softMatches
                        .map(
                          (m) =>
                            `<li style="margin-bottom:4px;"><strong>${escapeHtml(`${m.record.firstName} ${m.record.lastName}`)}</strong>${m.record.ref ? ` (${escapeHtml(m.record.ref)})` : ""} &mdash; ${escapeHtml(m.record.email)}, status ${escapeHtml(m.record.status)}<br/><span style="color:#991b1b;">matched on ${escapeHtml(describeReasons(m.reasons))} (${m.confidence})</span></li>`
                        )
                        .join("")}
                    </ul>
                  </div>`
            }
            <!-- Alert -->
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
              <p style="margin:0;font-size:13px;color:#92400e;">
                <strong>⚡ New submission</strong> received on ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <!-- Company Details -->
            <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Company Details</h2>
            <table style="width:100%;font-size:13px;">
              <tr><td style="padding:4px 0;color:#666;width:160px;">Company Name:</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(companyName)}</td></tr>
              ${companyAddress ? `<tr><td style="padding:4px 0;color:#666;">Address:</td><td style="padding:4px 0;">${escapeHtml(companyAddress)}</td></tr>` : ""}
              ${companyRegNo ? `<tr><td style="padding:4px 0;color:#666;">Reg No:</td><td style="padding:4px 0;">${escapeHtml(companyRegNo)}</td></tr>` : ""}
              <tr><td style="padding:4px 0;color:#666;">Contact:</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(contactName)}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Email:</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(contactEmail)}" style="color:#005f8c;">${escapeHtml(contactEmail)}</a></td></tr>
              ${contactPhone ? `<tr><td style="padding:4px 0;color:#666;">Phone:</td><td style="padding:4px 0;"><a href="tel:${escapeHtml(contactPhone)}" style="color:#005f8c;">${escapeHtml(contactPhone)}</a></td></tr>` : ""}
            </table>

            <!-- Supply Details -->
            <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Supply Details</h2>
            <table style="width:100%;font-size:13px;">
              ${supplyOf ? `<tr><td style="padding:4px 0;color:#666;width:160px;">Supply of:</td><td style="padding:4px 0;">${escapeHtml(supplyOf)}</td></tr>` : ""}
              ${siteLocation ? `<tr><td style="padding:4px 0;color:#666;">Site Location:</td><td style="padding:4px 0;">${escapeHtml(siteLocation)}</td></tr>` : ""}
              ${startDate ? `<tr><td style="padding:4px 0;color:#666;">Start Date:</td><td style="padding:4px 0;">${new Date(startDate).toLocaleDateString("en-GB")}</td></tr>` : ""}
            </table>

            <!-- Rates -->
            ${ratesHtml ? `<h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Charge Rates</h2>${ratesHtml}` : ""}

            <!-- Breakdown -->
            ${breakdownData.length > 0 ? `
              <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Breakdown</h2>
              <ul style="font-size:13px;padding-left:20px;margin:8px 0;">
                ${breakdownData.map((b: string) => `<li style="padding:2px 0;">${escapeHtml(b)}</li>`).join("")}
              </ul>
            ` : ""}

            ${additionalInfo ? `
              <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Additional Information</h2>
              <p style="font-size:13px;color:#333;">${escapeHtml(additionalInfo)}</p>
            ` : ""}

            <!-- Personal Details -->
            ${firstName || lastName ? `
              <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Personal Details</h2>
              <table style="width:100%;font-size:13px;">
                ${firstName || lastName ? `<tr><td style="padding:4px 0;color:#666;width:160px;">Name:</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(firstName || "")} ${escapeHtml(lastName || "")}</td></tr>` : ""}
                ${dateOfBirth ? `<tr><td style="padding:4px 0;color:#666;">Date of Birth:</td><td style="padding:4px 0;">${new Date(dateOfBirth).toLocaleDateString("en-GB")}</td></tr>` : ""}
                ${niNumber ? `<tr><td style="padding:4px 0;color:#666;">NI Number:</td><td style="padding:4px 0;">${escapeHtml(niNumber)}</td></tr>` : ""}
                ${utrNumber ? `<tr><td style="padding:4px 0;color:#666;">UTR Number:</td><td style="padding:4px 0;">${escapeHtml(utrNumber)}</td></tr>` : ""}
                ${address ? `<tr><td style="padding:4px 0;color:#666;">Address:</td><td style="padding:4px 0;">${escapeHtml(address)}</td></tr>` : ""}
                ${postcode ? `<tr><td style="padding:4px 0;color:#666;">Postcode:</td><td style="padding:4px 0;">${escapeHtml(postcode)}</td></tr>` : ""}
              </table>
            ` : ""}

            <!-- Emergency Contact -->
            ${emergencyContactName ? `
              <h2 style="font-size:15px;color:#dc2626;border-bottom:2px solid #dc2626;padding-bottom:4px;margin:20px 0 12px;">🚨 Emergency Contact</h2>
              <table style="width:100%;font-size:13px;">
                <tr><td style="padding:4px 0;color:#666;width:160px;">Name:</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(emergencyContactName)}</td></tr>
                ${emergencyContactPhone ? `<tr><td style="padding:4px 0;color:#666;">Phone:</td><td style="padding:4px 0;"><a href="tel:${escapeHtml(emergencyContactPhone)}" style="color:#005f8c;">${escapeHtml(emergencyContactPhone)}</a></td></tr>` : ""}
                ${emergencyContactRelation ? `<tr><td style="padding:4px 0;color:#666;">Relationship:</td><td style="padding:4px 0;">${escapeHtml(emergencyContactRelation)}</td></tr>` : ""}
              </table>
            ` : ""}

            <!-- Action -->
            <div style="margin-top:24px;padding:16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#0369a1;">Review this agreement in the PRL Site Solutions dashboard</p>
              <a href="${process.env.NEXTAUTH_URL || "https://prl-staffing-production.up.railway.app"}/onboarding/submissions"
                style="display:inline-block;background:#005f8c;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">
                View Submissions →
              </a>
            </div>
          </div>

          <p style="text-align:center;font-size:11px;color:#999;margin-top:16px;">
            PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk
          </p>
        </div>
      `;

      // A failed send must not fail the submission — the agreement is already saved
      const emailResult = await sendEmail({
        to: ONBOARDING_RECIPIENTS,
        subject: `${softMatches.length ? "New Subcontractor Agreement [POSSIBLE DUPLICATE]" : "New Subcontractor Agreement"}: ${escapeHtml(companyName)} — ${escapeHtml(contactName)}`,
        html: emailHtml,
        template: "supply-agreement-submitted",
      });

      if (!emailResult.success) {
        console.error(
          `Failed to send onboarding notification email for ${companyName} (agreement ${agreement.id}):`,
          emailResult.error
        );
      }

      // Confirmation to the submitter — receipt only, no login link. Portal
      // access is a deliberate staff action (Send App Invite) taken after
      // review, not something granted to anyone who fills in the public form.
      const confirmationHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#005f8c;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">Subcontractor Agreement Received</h1>
            <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">PRL Site Solutions — Recruitment Specialists</p>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            <p style="font-size:14px;color:#333;">Hi ${escapeHtml(contactName)},</p>
            <p style="font-size:14px;color:#333;">
              Thank you for submitting a subcontractor agreement for <strong>${escapeHtml(companyName)}</strong>.
              We've received it and it's now with our team for review.
            </p>
            <p style="font-size:14px;color:#333;">
              There's nothing more to do right now. Once our team approves your agreement you'll get a
              separate email with a link to set up your PRISM login, where you can upload your compliance
              documents. If we need anything before then, we'll be in touch.
            </p>
            <p style="font-size:13px;color:#666;margin-top:20px;">
              Any questions in the meantime? Call us on <strong>0800 772 3959</strong> or email
              <a href="mailto:info@prlsitesolutions.co.uk" style="color:#005f8c;">info@prlsitesolutions.co.uk</a>.
            </p>
          </div>
          <p style="text-align:center;font-size:11px;color:#999;margin-top:16px;">
            PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk
          </p>
        </div>
      `;

      const confirmationResult = await sendEmail({
        to: contactEmail,
        subject: "We've received your subcontractor agreement — PRL Site Solutions",
        html: confirmationHtml,
        template: "supply-agreement-confirmation",
        replyTo: ONBOARDING_REPLY_TO,
      });

      if (!confirmationResult.success) {
        console.error(
          `Failed to send onboarding confirmation email to ${contactEmail} (agreement ${agreement.id}):`,
          confirmationResult.error
        );
      }

    return NextResponse.json({
      success: true,
      id: agreement.id,
      message: "Subcontractor agreement submitted successfully",
    });
  } catch (error) {
    console.error("Onboarding submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit. Please try again." },
      { status: 500 }
    );
  }
}
