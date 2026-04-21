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
      firstName, lastName, email, phone,
    } = body;

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: "First name, last name, email, and phone are required" },
        { status: 400 }
      );
    }

    // Create contractor record in Prisma
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    let contractorId: string | undefined;
    try {
      const contractor = await prisma.contractor.create({
        data: {
          firstName,
          lastName,
          email,
          phone: phone || null,
          status: "Applied",
          address: body.address || null,
          postcode: body.postcode || null,
          niNumber: body.niNumber || null,
          notes: JSON.stringify({
            country: body.country,
            city: body.city,
            nonBritishNational: body.nonBritishNational,
            requiresWorkPermit: body.requiresWorkPermit,
            passportNumber: body.passportNumber,
            passportExpiry: body.passportExpiry,
            visaNumber: body.visaNumber,
            visaExpiry: body.visaExpiry,
            fullDrivingLicence: body.fullDrivingLicence,
            motoringConvictions: body.motoringConvictions,
            regularUseOf: body.regularUseOf,
            endorsementDetails: body.endorsementDetails,
            nextOfKin: body.nextOfKin,
            bankName: body.bankName,
            nameOnAccount: body.nameOnAccount,
            accountInYourName: body.accountInYourName,
            positionsSought: body.positionsSought,
            salaryRequired: body.salaryRequired,
            hoursPreferred: body.hoursPreferred,
            daysPreferred: body.daysPreferred,
            locationsPreferred: body.locationsPreferred,
            requiredHours: body.requiredHours,
            relevantSkills: body.relevantSkills,
            hasDbs: body.hasDbs,
            dbsNumber: body.dbsNumber,
            dbsIssued: body.dbsIssued,
            hasCriminalConviction: body.hasCriminalConviction,
            hasPreviousConvictions: body.hasPreviousConvictions,
            hasSecurityClearance: body.hasSecurityClearance,
            clearanceLevel: body.clearanceLevel,
            waiverDecision: body.waiverDecision,
            signature: body.signature,
            references: body.references,
          }),
        },
      });
      contractorId = contractor.id;
    } catch (dbErr) {
      console.error("Failed to create contractor record:", dbErr);
      // Continue with email even if DB fails (e.g. duplicate email)
    }

    // Create activity log entry
    try {
      await prisma.activityLog.create({
        data: {
          action: "APPLICATION_SUBMITTED",
          entityType: "Contractor",
          entityId: contractorId || null,
          userName: `${firstName} ${lastName}`,
          userEmail: email,
          details: JSON.stringify(body),
          ipAddress,
        },
      });
    } catch (logErr) {
      console.error("Failed to create activity log:", logErr);
    }

    // Send branded HTML email notification to PRL team
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || "PRL Site Solutions <noreply@prlsitesolutions.online>";

    if (apiKey) {
      const resend = new Resend(apiKey);

      const section = (title: string, rows: [string, string][]) => {
        const filtered = rows.filter(([, v]) => v);
        if (filtered.length === 0) return "";
        return `
          <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">${title}</h2>
          <table style="width:100%;font-size:13px;">
            ${filtered.map(([label, val]) =>
              `<tr><td style="padding:4px 0;color:#666;width:180px;">${label}:</td><td style="padding:4px 0;">${escapeHtml(val)}</td></tr>`
            ).join("")}
          </table>`;
      };

      const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
          <div style="background:#005f8c;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">New Application Form Submitted</h1>
            <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">PRL Site Solutions -- Recruitment</p>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
              <p style="margin:0;font-size:13px;color:#92400e;">
                <strong>New application</strong> received on ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            ${section("Personal Details", [
              ["Name", `${body.firstName} ${body.lastName}`],
              ["Email", body.email],
              ["Phone", body.phone],
              ["Country/Region", body.country],
              ["Address", body.address],
              ["City", body.city],
              ["Postcode", body.postcode],
              ["Non-British National", body.nonBritishNational],
              ["Requires Work Permit", body.requiresWorkPermit],
              ["NI Number", body.niNumber],
              ["Passport Number", body.passportNumber],
              ["Passport Expiry", body.passportExpiry],
              ["Visa Number", body.visaNumber],
              ["Visa Expiry", body.visaExpiry],
              ["Full UK Driving Licence", body.fullDrivingLicence],
              ["Motoring Convictions", body.motoringConvictions],
              ["Regular Use Of", body.regularUseOf],
              ["Endorsement Details", body.endorsementDetails],
              ["Next of Kin", body.nextOfKin],
            ])}

            ${section("Bank Details", [
              ["Bank Name", body.bankName],
              ["Name on Account", body.nameOnAccount],
              ["Account in Your Name", body.accountInYourName],
              ["Account Number", body.accountNumber],
              ["Sort Code", body.sortCode],
            ])}

            ${section("Work Requirements", [
              ["Positions Sought", body.positionsSought],
              ["Salary/Rate Required", body.salaryRequired],
              ["Hours Preferred", body.hoursPreferred],
              ["Days Preferred", body.daysPreferred],
              ["Locations Preferred", body.locationsPreferred],
              ["Required Hours", body.requiredHours],
              ["Relevant Skills", body.relevantSkills],
              ["Do Not Contact", body.doNotContact],
            ])}

            ${section("Criminal Record & Security", [
              ["DBS Check (last 3 years)", body.hasDbs],
              ["Enhanced DBS No", body.dbsNumber],
              ["DBS Issued", body.dbsIssued],
              ["Criminal Conviction", body.hasCriminalConviction],
              ["Previous Convictions", body.hasPreviousConvictions],
              ["Security Clearance", body.hasSecurityClearance],
              ["Level of Clearance", body.clearanceLevel],
              ["Date Granted", body.clearanceDateGranted],
              ["Date Expiring", body.clearanceDateExpiring],
              ["Place of Work Granted", body.clearancePlaceOfWork],
            ])}

            ${section("48 Hour Waiver", [
              ["Waiver Decision", body.waiverDecision],
              ["Signed Date", body.waiverSignedDate],
            ])}

            ${section("Declaration", [
              ["Signature", body.signature],
              ["Privacy Policy Agreed", body.privacyAgreed ? "Yes" : "No"],
            ])}

            ${body.references ? section("References", [["Reference Details", body.references]]) : ""}

            <div style="margin-top:24px;padding:16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#0369a1;">Note: Any uploaded documents (CV, Photo ID, Passport/Visa, Supporting Docs) were attached by the applicant. Please request them directly if not received.</p>
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
          subject: `New Application: ${escapeHtml(body.firstName)} ${escapeHtml(body.lastName)} -- ${escapeHtml(body.positionsSought || "General")}`,
          html: emailHtml,
        });
      } catch (emailErr) {
        console.error("Failed to send application notification email:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: contractorId,
      message: "Application submitted successfully",
    });
  } catch (error) {
    console.error("Application submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit. Please try again." },
      { status: 500 }
    );
  }
}
