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

function yesNoBadge(val: string): string {
  if (val === "Yes") return `<span style="color:#16a34a;font-weight:600;">Yes</span>`;
  if (val === "No") return `<span style="color:#dc2626;font-weight:600;">No</span>`;
  return `<span style="color:#f59e0b;font-weight:600;">${escapeHtml(val)}</span>`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      companyName, tradingName, companyRegNo, vatNumber, registeredAddress,
      mainContactName, contactEmail, contactPhone, website,
      goodsServices, numberOfEmployees, yearsInBusiness,
      iso9001, otherCertifications,
      publicLiability, publicLiabilityAmount,
      employersLiability, employersLiabilityAmount,
      professionalIndemnity, professionalIndemnityAmount,
      healthSafetyPolicy, environmentalPolicy, equalityPolicy,
      references, additionalInfo, declaration, signature, submittedDate,
    } = body;

    if (!companyName || !mainContactName || !contactEmail || !goodsServices) {
      return NextResponse.json(
        { error: "Company name, contact name, email, and goods/services are required" },
        { status: 400 }
      );
    }

    if (!declaration) {
      return NextResponse.json(
        { error: "You must confirm the declaration" },
        { status: 400 }
      );
    }

    // Save to ActivityLog
    await prisma.activityLog.create({
      data: {
        userName: mainContactName,
        userEmail: contactEmail,
        action: "SUPPLIER_QUESTIONNAIRE",
        entityType: "SupplierQuestionnaire",
        details: JSON.stringify(body),
      },
    });

    // Send email notification
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || "PRL Site Solutions <noreply@prlsitesolutions.online>";

    if (apiKey) {
      const resend = new Resend(apiKey);

      const refs = references || [];
      const refsHtml = refs
        .filter((r: { company: string }) => r.company)
        .map(
          (r: { company: string; contact: string; email: string; phone: string }, i: number) => `
          <h3 style="font-size:13px;color:#005f8c;margin:12px 0 6px;">Reference ${i + 1}</h3>
          <table style="width:100%;font-size:13px;">
            <tr><td style="padding:2px 0;color:#666;width:120px;">Company:</td><td style="padding:2px 0;">${escapeHtml(r.company)}</td></tr>
            ${r.contact ? `<tr><td style="padding:2px 0;color:#666;">Contact:</td><td style="padding:2px 0;">${escapeHtml(r.contact)}</td></tr>` : ""}
            ${r.email ? `<tr><td style="padding:2px 0;color:#666;">Email:</td><td style="padding:2px 0;"><a href="mailto:${escapeHtml(r.email)}" style="color:#005f8c;">${escapeHtml(r.email)}</a></td></tr>` : ""}
            ${r.phone ? `<tr><td style="padding:2px 0;color:#666;">Phone:</td><td style="padding:2px 0;">${escapeHtml(r.phone)}</td></tr>` : ""}
          </table>`
        )
        .join("");

      const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
          <div style="background:#005f8c;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">New Supplier Questionnaire</h1>
            <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">PRL Site Solutions — Quality Management</p>
          </div>

          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
              <p style="margin:0;font-size:13px;color:#92400e;">
                <strong>New supplier questionnaire</strong> received on ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Company Details</h2>
            <table style="width:100%;font-size:13px;">
              <tr><td style="padding:4px 0;color:#666;width:180px;">Company Name:</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(companyName)}</td></tr>
              ${tradingName ? `<tr><td style="padding:4px 0;color:#666;">Trading Name:</td><td style="padding:4px 0;">${escapeHtml(tradingName)}</td></tr>` : ""}
              ${companyRegNo ? `<tr><td style="padding:4px 0;color:#666;">Company Reg No:</td><td style="padding:4px 0;">${escapeHtml(companyRegNo)}</td></tr>` : ""}
              ${vatNumber ? `<tr><td style="padding:4px 0;color:#666;">VAT Number:</td><td style="padding:4px 0;">${escapeHtml(vatNumber)}</td></tr>` : ""}
              ${registeredAddress ? `<tr><td style="padding:4px 0;color:#666;">Address:</td><td style="padding:4px 0;">${escapeHtml(registeredAddress)}</td></tr>` : ""}
              <tr><td style="padding:4px 0;color:#666;">Contact:</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(mainContactName)}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Email:</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(contactEmail)}" style="color:#005f8c;">${escapeHtml(contactEmail)}</a></td></tr>
              ${contactPhone ? `<tr><td style="padding:4px 0;color:#666;">Phone:</td><td style="padding:4px 0;">${escapeHtml(contactPhone)}</td></tr>` : ""}
              ${website ? `<tr><td style="padding:4px 0;color:#666;">Website:</td><td style="padding:4px 0;"><a href="${escapeHtml(website)}" style="color:#005f8c;">${escapeHtml(website)}</a></td></tr>` : ""}
            </table>

            <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Business Information</h2>
            <table style="width:100%;font-size:13px;">
              <tr><td style="padding:4px 0;color:#666;width:180px;">Goods/Services:</td><td style="padding:4px 0;">${escapeHtml(goodsServices)}</td></tr>
              ${numberOfEmployees ? `<tr><td style="padding:4px 0;color:#666;">Employees:</td><td style="padding:4px 0;">${escapeHtml(numberOfEmployees)}</td></tr>` : ""}
              ${yearsInBusiness ? `<tr><td style="padding:4px 0;color:#666;">Years in Business:</td><td style="padding:4px 0;">${escapeHtml(yearsInBusiness)}</td></tr>` : ""}
            </table>

            <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Certifications & Insurance</h2>
            <table style="width:100%;font-size:13px;">
              ${iso9001 ? `<tr><td style="padding:4px 0;color:#666;width:180px;">ISO 9001:</td><td style="padding:4px 0;">${yesNoBadge(iso9001)}</td></tr>` : ""}
              ${otherCertifications ? `<tr><td style="padding:4px 0;color:#666;">Other Certifications:</td><td style="padding:4px 0;">${escapeHtml(otherCertifications)}</td></tr>` : ""}
              ${publicLiability ? `<tr><td style="padding:4px 0;color:#666;">Public Liability:</td><td style="padding:4px 0;">${yesNoBadge(publicLiability)}${publicLiabilityAmount ? ` — ${escapeHtml(publicLiabilityAmount)}` : ""}</td></tr>` : ""}
              ${employersLiability ? `<tr><td style="padding:4px 0;color:#666;">Employers Liability:</td><td style="padding:4px 0;">${yesNoBadge(employersLiability)}${employersLiabilityAmount ? ` — ${escapeHtml(employersLiabilityAmount)}` : ""}</td></tr>` : ""}
              ${professionalIndemnity ? `<tr><td style="padding:4px 0;color:#666;">Professional Indemnity:</td><td style="padding:4px 0;">${yesNoBadge(professionalIndemnity)}${professionalIndemnityAmount ? ` — ${escapeHtml(professionalIndemnityAmount)}` : ""}</td></tr>` : ""}
            </table>

            <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Policies</h2>
            <table style="width:100%;font-size:13px;">
              ${healthSafetyPolicy ? `<tr><td style="padding:4px 0;color:#666;width:180px;">Health & Safety:</td><td style="padding:4px 0;">${yesNoBadge(healthSafetyPolicy)}</td></tr>` : ""}
              ${environmentalPolicy ? `<tr><td style="padding:4px 0;color:#666;">Environmental:</td><td style="padding:4px 0;">${yesNoBadge(environmentalPolicy)}</td></tr>` : ""}
              ${equalityPolicy ? `<tr><td style="padding:4px 0;color:#666;">Equality & Diversity:</td><td style="padding:4px 0;">${yesNoBadge(equalityPolicy)}</td></tr>` : ""}
            </table>

            ${refsHtml ? `
              <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Trade References</h2>
              ${refsHtml}
            ` : ""}

            ${additionalInfo ? `
              <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Additional Information</h2>
              <p style="font-size:13px;color:#333;">${escapeHtml(additionalInfo)}</p>
            ` : ""}

            ${signature ? `
              <div style="margin-top:16px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">
                <p style="font-size:12px;color:#666;margin:0;">Signed by: <strong>${escapeHtml(signature)}</strong> on ${submittedDate ? new Date(submittedDate).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB")}</p>
              </div>
            ` : ""}

            <div style="margin-top:24px;padding:16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#0369a1;">View all supplier questionnaires in the QMS dashboard</p>
              <a href="${process.env.NEXTAUTH_URL || "https://prl-staffing-production.up.railway.app"}/qms/reports/supplier-questionnaires"
                style="display:inline-block;background:#005f8c;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">
                View Questionnaires
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
          subject: `Supplier Questionnaire: ${escapeHtml(companyName)} — ${escapeHtml(mainContactName)}`,
          html: emailHtml,
        });
      } catch (emailErr) {
        console.error("Failed to send supplier questionnaire notification email:", emailErr);
      }
    }

    return NextResponse.json({ success: true, message: "Questionnaire submitted successfully" });
  } catch (error) {
    console.error("Supplier questionnaire submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit questionnaire. Please try again." },
      { status: 500 }
    );
  }
}
