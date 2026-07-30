import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendEmail, APPLICATION_RECIPIENTS } from "@/lib/email";
import { Prisma } from "@prisma/client";
import { maskNI, maskPassportNumber, maskBankAccount, maskSortCode } from "@/lib/utils";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Parses a date submitted by the public form into a Date, or null.
 *
 * Handles ISO (from <input type="date">) and UK DD/MM/YYYY, which must be done
 * explicitly: `new Date("31/12/2026")` is Invalid Date, and worse,
 * `new Date("03/04/2026")` silently parses as 4 March under US convention when
 * the applicant meant 3 April.
 *
 * Returns null rather than throwing — a bad date must never lose an entire
 * application, and the raw value is preserved in the notes blob regardless.
 */
function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();

  const uk = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (uk) {
    const [, d, m, y] = uk;
    const dt = new Date(Date.UTC(+y, +m - 1, +d));
    // Rejects impossible dates that would otherwise roll over (e.g. 31/02).
    if (dt.getUTCDate() !== +d || dt.getUTCMonth() !== +m - 1) return null;
    return dt;
  }

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    const dt = new Date(Date.UTC(+y, +m - 1, +d));
    if (dt.getUTCDate() !== +d || dt.getUTCMonth() !== +m - 1) return null;
    return dt;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      firstName, lastName, phone,
    } = body;
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : body.email;

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

    const applicationNotes = JSON.stringify({
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
            emergencyContactName: body.emergencyContactName || null,
            emergencyContactRelation: body.emergencyContactRelation || null,
            emergencyContactPhone: body.emergencyContactPhone || null,
            nextOfKin: [body.emergencyContactName, body.emergencyContactRelation, body.emergencyContactPhone]
              .filter(Boolean).join(" | ") || null,
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
          });

    let contractorId: string | undefined;
    let isReapplication = false;
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
          // These four columns already existed on Contractor but /apply only
          // ever wrote them into the notes blob, leaving the real columns empty.
          emergencyContactName: body.emergencyContactName || body.nokName || null,
          emergencyContactPhone: body.emergencyContactPhone || body.nokPhone || null,
          emergencyContactRelation:
            body.emergencyContactRelation || body.nokRelationship || null,
          nextOfKin: body.nextOfKin || null,
          dateOfBirth: parseDate(body.dob),
          // Right to work — see migration 20260730_contractor_right_to_work.
          nonBritishNational: body.nonBritishNational || null,
          requiresWorkPermit: body.requiresWorkPermit || null,
          passportNumber: body.passportNumber || null,
          passportExpiry: parseDate(body.passportExpiry),
          visaNumber: body.visaNumber || null,
          visaExpiry: parseDate(body.visaExpiry),
          // Retained deliberately: the blob is the full audit trail of exactly
          // what was submitted, including anything not yet promoted to a column.
          notes: applicationNotes,
        },
      });
      contractorId = contractor.id;
    } catch (dbErr) {
      const isDuplicateEmail =
        dbErr instanceof Prisma.PrismaClientKnownRequestError && dbErr.code === "P2002";
      if (!isDuplicateEmail) {
        console.error("Failed to create contractor record:", dbErr);
        return NextResponse.json(
          { error: "Failed to submit. Please try again." },
          { status: 500 }
        );
      }
      // Applicant already exists in PRISM — attach the re-application to their
      // record instead of silently dropping it and claiming success.
      const existing = await prisma.contractor.findUnique({ where: { email } });
      if (existing) {
        contractorId = existing.id;
        isReapplication = true;
        const stamp = new Date().toISOString().slice(0, 10);
        await prisma.contractor.update({
          where: { id: existing.id },
          data: {
            notes: [
              existing.notes,
              `--- Re-application received ${stamp} ---`,
              applicationNotes,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        });
      }
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
          details: JSON.stringify({
            ...body,
            niNumber: maskNI(body.niNumber),
            passportNumber: maskPassportNumber(body.passportNumber),
            accountNumber: maskBankAccount(body.accountNumber),
            sortCode: maskSortCode(body.sortCode),
          }),
          ipAddress,
        },
      });
    } catch (logErr) {
      console.error("Failed to create activity log:", logErr);
    }

    // Send branded HTML email notification to PRL team
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
              ["Next of Kin — Name", body.emergencyContactName],
              ["Next of Kin — Relationship", body.emergencyContactRelation],
              ["Next of Kin — Phone", body.emergencyContactPhone],
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

      const emailResult = await sendEmail({
        to: APPLICATION_RECIPIENTS,
        subject: `${isReapplication ? "Re-Application (existing record)" : "New Application"}: ${escapeHtml(body.firstName)} ${escapeHtml(body.lastName)} -- ${escapeHtml(body.positionsSought || "General")}`,
        html: emailHtml,
        template: "application-received",
      });

      if (!emailResult.success) {
        console.error(
          `Failed to send application notification email for ${email} (contractor ${contractorId}):`,
          emailResult.error
        );
      }

    return NextResponse.json({
      success: true,
      id: contractorId,
      reapplication: isReapplication || undefined,
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
