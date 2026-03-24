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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      companyName, companyAddress, companyRegNo,
      contactName, contactEmail, contactPhone,
      supplyOf, siteLocation, startDate,
      rates, breakdown, additionalInfo,
      firstName, lastName, dateOfBirth, niNumber, utrNumber,
      address, postcode,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    } = body;

    if (!companyName || !contactName || !contactEmail) {
      return NextResponse.json(
        { error: "Company name, contact name, and email are required" },
        { status: 400 }
      );
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

    // Send branded HTML email to Adella & Helen
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || "PRL Site Solutions <noreply@prlsitesolutions.online>";

    if (apiKey) {
      const resend = new Resend(apiKey);
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
            <h1 style="margin:0;font-size:20px;">New Supply Agreement Submitted</h1>
            <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">PRL Site Solutions — Onboarding</p>
          </div>

          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
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

      try {
        await resend.emails.send({
          from: fromEmail,
          to: [
            "adella@prlsitesolutions.co.uk",
            "helen@prlsitesolutions.co.uk",
          ],
          subject: `New Supply Agreement: ${escapeHtml(companyName)} — ${escapeHtml(contactName)}`,
          html: emailHtml,
        });
      } catch (emailErr) {
        console.error("Failed to send onboarding notification email:", emailErr);
        // Don't fail the submission if email fails
      }
    }

    return NextResponse.json({
      success: true,
      id: agreement.id,
      message: "Supply agreement submitted successfully",
    });
  } catch (error) {
    console.error("Onboarding submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit. Please try again." },
      { status: 500 }
    );
  }
}
