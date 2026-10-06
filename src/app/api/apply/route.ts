import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendEmail, APPLICATION_RECIPIENTS } from "@/lib/email";
import { Prisma } from "@prisma/client";
import { checkPublicFormRateLimit } from "@/lib/rate-limit";
import { emailMatches } from "@/lib/contractor-email";
import {
  findPotentialDuplicates,
  describeReasons,
  type DuplicateMatch,
} from "@/lib/duplicate-check";

/** A trimmed string, or undefined for anything else (absent, blank, non-string). */
function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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
  // A public, unauthenticated write that creates a Contractor record and emails
  // the office, so it must not be uncapped. Same 20/hr/IP as the other public
  // forms.
  if (!checkPublicFormRateLimit(request, "apply")) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

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

    /**
     * The form is deliberately short (PRL, 2026-10): name, contact details,
     * work preferences and the declaration. Date of birth, address, right to
     * work, passport/visa, NI, driving, next of kin, criminal record, the 48
     * hour waiver and references are all collected later in the contractor
     * app, so none of them is read here. A stale cached copy of the old form
     * that still sends them has them dropped, not stored.
     */
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const submitted = {
      positionsSought: str(body.positionsSought),
      // Recorded separately as well as merged into positionsSought: a
      // non-empty value here means the applicant wanted a trade that is not
      // in the JobRole list, which is the prompt to add one.
      positionsSoughtOther: str(body.positionsSoughtOther),
      salaryRequired: str(body.salaryRequired),
      hoursPreferred: str(body.hoursPreferred),
      daysPreferred: str(body.daysPreferred),
      locationsPreferred: str(body.locationsPreferred),
      requiredHours: str(body.requiredHours),
      relevantSkills: str(body.relevantSkills),
      privacyAgreed: body.privacyAgreed === true,
      signature: str(body.signature),
    };

    // JSON.stringify omits undefined keys, so unanswered optional fields
    // leave no junk in the blob.
    const applicationNotes = JSON.stringify(submitted);

    /**
     * Same person, different email address.
     *
     * `Contractor.email` is unique, so the database catches an applicant who
     * reuses their address — and nothing caught the case this was written for,
     * where a second record was created for someone already in PRISM under a
     * new address. Matching here is advisory only: it annotates the team
     * notification so the office can merge, and never blocks a submission,
     * because two real people genuinely do share a name.
     *
     * The form no longer asks for NI or date of birth, so this matches on
     * email, name and phone only; phone is compared in normalised form.
     */
    const candidate = { email, firstName, lastName, phone };
    let softMatches: DuplicateMatch<{
      id: string;
      ref: string | null;
      firstName: string;
      lastName: string;
      email: string;
      status: string;
    }>[] = [];
    try {
      // Whole-book scan, on purpose. Narrowing this to an indexed name query
      // looks cheaper but silently misses the matches that matter: a phone
      // written as +44... never matches one written as 07... in SQL.
      // Normalising in JS compares them properly. The contractor book is in the hundreds of rows and this
      // runs once per rate-limited public submission; revisit if it reaches
      // five figures.
      const nearby = await prisma.contractor.findMany({
        select: {
          id: true,
          ref: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          phone: true,
        },
      });
      softMatches = findPotentialDuplicates(candidate, nearby);
    } catch (matchErr) {
      // Advisory only — an application must never fail because the duplicate
      // scan did.
      console.error("Duplicate scan failed:", matchErr);
    }

    let contractorId: string | undefined;
    let isReapplication = false;

    /**
     * Case-insensitive pre-check, because the unique constraint is not.
     *
     * `Contractor.email @unique` is a case-sensitive Postgres index, so
     * "Dannystuart12@..." and "dannystuart12@..." are two different keys and
     * the database happily stores both. Relying on P2002 alone therefore lets a
     * duplicate straight through whenever the applicant capitalises their
     * address differently from last time. Caught here instead.
     */
    const caseInsensitiveMatch = await prisma.contractor.findFirst({
      where: { email: emailMatches(email) },
      select: { id: true, notes: true },
    });

    try {
      if (caseInsensitiveMatch) {
        // Same person under a differently-capitalised address. Take the
        // existing-record path rather than attempting a create that the
        // case-sensitive constraint would wave through.
        throw new Prisma.PrismaClientKnownRequestError("Duplicate email", {
          code: "P2002",
          clientVersion: Prisma.prismaVersion.client,
        });
      }
      const contractor = await prisma.contractor.create({
        data: {
          firstName,
          lastName,
          email,
          phone: phone || null,
          status: "Applied",
          // Retained deliberately: the blob is the full audit trail of exactly
          // what was submitted, including anything not yet promoted to a column.
          notes: applicationNotes,
        },
      });
      contractorId = contractor.id;

      // Link the selected roles properly via ContractorJobRole. The readable
      // names stay in the application blob too, but these ids are what lets
      // role-based reporting and compliance requirements actually match —
      // matching on a typed string is what produced "360 Operator" and "360
      // Excavator Operator" as separate roles in the first place.
      const jobRoleIds: unknown = body.jobRoleIds;
      if (Array.isArray(jobRoleIds) && jobRoleIds.length) {
        const ids = jobRoleIds.filter((id): id is string => typeof id === "string");
        // Only ids that really exist — the payload is public and unauthenticated.
        const valid = await prisma.jobRole.findMany({
          where: { id: { in: ids } },
          select: { id: true },
        });
        if (valid.length) {
          await prisma.contractorJobRole.createMany({
            data: valid.map((r) => ({ contractorId: contractor.id, jobRoleId: r.id })),
            skipDuplicates: true,
          });
        }
      }
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
      const existing =
        caseInsensitiveMatch ?? (await prisma.contractor.findFirst({ where: { email } }));
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
          // Built from the known fields rather than spreading the raw body,
          // so nothing an old or hand-crafted client sends (passport, NI,
          // criminal-record answers) can end up in the log.
          details: JSON.stringify({
            firstName,
            lastName,
            email,
            phone,
            jobRoleIds: Array.isArray(body.jobRoleIds) ? body.jobRoleIds : undefined,
            ...submitted,
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

      /**
       * Duplicate warning, shown to the office above everything else.
       *
       * This is the whole point of the soft scan: the applicant is not blocked,
       * so the only thing standing between a near-match and a second record for
       * the same person is whoever reads this email.
       */
      const duplicateWarning =
        softMatches.length === 0
          ? ""
          : `
            <div style="background:#fee2e2;border:2px solid #dc2626;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
              <p style="margin:0 0 8px;font-size:14px;color:#991b1b;">
                <strong>&#9888; Possible duplicate &mdash; check before creating a new record.</strong>
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#7f1d1d;">
                This applicant looks like ${softMatches.length === 1 ? "an existing subcontractor" : `${softMatches.length} existing subcontractors`} already in PRISM:
              </p>
              <ul style="margin:0;padding-left:18px;font-size:13px;color:#7f1d1d;">
                ${softMatches
                  .map(
                    (m) =>
                      `<li style="margin-bottom:4px;">
                        <strong>${escapeHtml(`${m.record.firstName} ${m.record.lastName}`)}</strong>
                        ${m.record.ref ? ` (${escapeHtml(m.record.ref)})` : ""}
                        &mdash; ${escapeHtml(m.record.email)}, status ${escapeHtml(m.record.status)}<br/>
                        <span style="color:#991b1b;">matched on ${escapeHtml(describeReasons(m.reasons))} (${m.confidence})</span>
                      </li>`
                  )
                  .join("")}
              </ul>
            </div>`;

      const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
          <div style="background:#005f8c;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">New Application Form Submitted</h1>
            <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">PRL Site Solutions -- Recruitment</p>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            ${duplicateWarning}
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
              <p style="margin:0;font-size:13px;color:#92400e;">
                <strong>New application</strong> received on ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            ${section("Personal Details", [
              ["Name", `${firstName} ${lastName}`],
              ["Email", email],
              ["Phone", String(phone)],
            ])}

            ${section("Work Requirements", [
              ["Positions Sought", submitted.positionsSought ?? ""],
              ["Salary/Rate Required", submitted.salaryRequired ?? ""],
              ["Hours Preferred", submitted.hoursPreferred ?? ""],
              ["Days Preferred", submitted.daysPreferred ?? ""],
              ["Locations Preferred", submitted.locationsPreferred ?? ""],
              ["Required Hours", submitted.requiredHours ?? ""],
              ["Relevant Skills", submitted.relevantSkills ?? ""],
            ])}

            ${section("Declaration", [
              ["Signature", submitted.signature ?? ""],
              ["Privacy Policy Agreed", submitted.privacyAgreed ? "Yes" : "No"],
            ])}

            <div style="margin-top:24px;padding:16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#0369a1;">Date of birth, address, right to work, ID, next of kin and documents are not collected on this form. The applicant provides them later in the PRISM app.</p>
            </div>
          </div>
          <p style="text-align:center;font-size:11px;color:#999;margin-top:16px;">
            PRL Site Solutions | 0800 772 3959 | admin@prlsitesolutions.co.uk
          </p>
        </div>
      `;

      const emailResult = await sendEmail({
        to: APPLICATION_RECIPIENTS,
        subject: `${isReapplication ? "Re-Application (existing record)" : softMatches.length ? "New Application [POSSIBLE DUPLICATE]" : "New Application"}: ${escapeHtml(firstName)} ${escapeHtml(lastName)} -- ${escapeHtml(submitted.positionsSought || "General")}`,
        html: emailHtml,
        template: "application-received",
      });

      if (!emailResult.success) {
        console.error(
          `Failed to send application notification email for ${email} (contractor ${contractorId}):`,
          emailResult.error
        );
      }

    /**
     * An exact email match is the applicant themselves, already registered.
     *
     * This used to return `success: true`, so someone who already had a PRISM
     * record filled in the entire form and was shown "Application Submitted!".
     * The office got a re-application email; the applicant got no indication
     * that they already had an account and should simply have logged in.
     *
     * 409 rather than 200 so the form can say so and send them to the portal.
     * Everything above still ran — the re-application is attached to their
     * record and the team is still notified — only the applicant's answer
     * changed.
     */
    if (isReapplication) {
      const hasLogin = contractorId
        ? Boolean(
            await prisma.contractorLogin.findUnique({
              where: { contractorId },
              select: { id: true },
            })
          )
        : false;
      return NextResponse.json(
        {
          alreadyRegistered: true,
          hasLogin,
          error: "You already have a PRL Site Solutions account with this email address.",
        },
        { status: 409 }
      );
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
