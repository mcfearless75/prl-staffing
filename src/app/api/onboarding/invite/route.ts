import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextResponse } from "next/server";
import { sendEmail, ONBOARDING_REPLY_TO } from "@/lib/email";
import { createSetPasswordUrl, DAY_MS } from "@/lib/set-password-link";
import { formatGbpRate } from "@/lib/rate-format";

// The supplier may not open the email the same day; a staff-sent invite is
// trusted, so give them a week rather than the 24h of a password reset.
const SETUP_LINK_TTL_MS = 7 * DAY_MS;

// Fixed wording from Jenni (25/09/2026), added to every subcontractor
// agreement so staff never retype it and it stays off the PRISM form.
// Edit the wording here.
const PAY_QUERY_URL = "https://www.prismworkforce.online/portal/pay-query";
const INFO_H3 = "margin:16px 0 6px;font-size:13px;font-weight:700;color:#005f8c;text-transform:uppercase;letter-spacing:0.05em;";
const INFO_P = "margin:0;font-size:13px;color:#333;line-height:1.6;";
const STANDING_INFO_HTML = `
<div style="background:#fff8e6;border:1px solid #f3d98b;border-radius:6px;padding:4px 24px 20px;">
  <h3 style="${INFO_H3}">Any Questions</h3>
  <p style="${INFO_P}">
    Call the team on <strong>0800 772 3959</strong> or email
    <a href="mailto:admin@prlsitesolutions.co.uk" style="color:#005f8c;">admin@prlsitesolutions.co.uk</a>.
  </p>

  <h3 style="${INFO_H3}">Pay Queries</h3>
  <p style="${INFO_P}">
    Please call Jenni on <strong>07359 021 801</strong>, or complete a pay query form in the PRISM app:
    <a href="${PAY_QUERY_URL}" style="color:#005f8c;">log a pay query</a>.
  </p>

  <h3 style="${INFO_H3}">How You Will Be Paid</h3>
  <p style="${INFO_P}">
    You will be paid via <strong>New Red Planet</strong>, who will contact you to get your details for payments
    to be made, so please look out for them calling.
  </p>

  <h3 style="${INFO_H3}">Timesheets</h3>
  <p style="${INFO_P}">
    Please submit a timesheet each week by no later than <strong>Tuesday 12pm</strong> of the following week
    to your contact on site. This will then be processed for authorisation.
  </p>
  <p style="${INFO_P}margin-top:8px;">
    You will be paid the following <strong>Friday</strong> of every week worked, by no later than <strong>5pm</strong>.
  </p>
</div>`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
    sendToEmail,
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
    sendToEmail?: string;
  };

  // contactName/contactEmail/contactPhone are the client's SITE contact, not
  // the subcontractor. The subcontractor is personName, reached at sendToEmail.
  if (!personName?.trim() || !supplyOf?.trim() || !companyName || !contactName || !contactPhone?.trim() || !sendToEmail) {
    return NextResponse.json(
      { error: "Person name, job role, company name, site contact name, contact phone and the subcontractor's email are required" },
      { status: 400 }
    );
  }
  const cleanRates = (rates || []).map((r) => ({ ...r, rate: formatGbpRate(r.rate) }));

  /**
   * PRL wrote this agreement, so there is no review step: the recipient gets
   * the agreement and a working login link in the same email. The link goes to
   * `sendToEmail`, which is therefore the person's login email.
   */
  const loginEmail = sendToEmail.toLowerCase().trim();

  // A set-password link for a staff address would reset that staff password.
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
  let contractor = await prisma.contractor.findFirst({
    where: { email: { equals: loginEmail, mode: "insensitive" } },
    select: { id: true },
  });
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
      firstName,
      lastName,
      status: "Approved",
      reviewedBy: session.user.email || "staff",
      reviewedAt: new Date(),
      notes: `Sent from PRISM to ${loginEmail}. Contractor ${contractor.id}.${
        contactEmail?.trim() ? ` Site contact email: ${contactEmail.trim()}.` : ""
      }`,
    },
  });

  const ratesData = cleanRates;
    const breakdownData = (breakdown || []) as string[];

    const ratesRowsHtml = ratesData
      .filter((r) => r.rate)
      .map(
        (r) =>
          `<tr>
            <td style="padding:7px 12px;font-size:13px;color:#333;border-bottom:1px solid #e8eef3;">${escapeHtml(r.description)}</td>
            <td style="padding:7px 12px;font-size:13px;color:#333;font-weight:600;text-align:right;border-bottom:1px solid #e8eef3;">${escapeHtml(r.rate)}</td>
            <td style="padding:7px 12px;font-size:13px;color:#666;border-bottom:1px solid #e8eef3;">${escapeHtml(r.basis)}</td>
          </tr>`
      )
      .join("");

    const ratesTableHtml = ratesRowsHtml
      ? `<h3 style="margin:24px 0 8px;font-size:13px;font-weight:700;color:#005f8c;text-transform:uppercase;letter-spacing:0.05em;">Charge Rates</h3>
         <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e6ed;border-radius:6px;overflow:hidden;border-collapse:collapse;">
           <thead>
             <tr style="background:#005f8c;">
               <th style="padding:8px 12px;text-align:left;font-size:12px;color:#fff;font-weight:600;">Description</th>
               <th style="padding:8px 12px;text-align:right;font-size:12px;color:#fff;font-weight:600;">Rate</th>
               <th style="padding:8px 12px;text-align:left;font-size:12px;color:#fff;font-weight:600;">Basis</th>
             </tr>
           </thead>
           <tbody>${ratesRowsHtml}</tbody>
         </table>`
      : "";

    const breakdownHtml = breakdownData.length
      ? `<h3 style="margin:24px 0 8px;font-size:13px;font-weight:700;color:#005f8c;text-transform:uppercase;letter-spacing:0.05em;">Rate Breakdown</h3>
         <ul style="margin:0;padding:0 0 0 20px;">
           ${breakdownData.map((b) => `<li style="font-size:13px;color:#333;padding:3px 0;">${escapeHtml(b)}</li>`).join("")}
         </ul>`
      : "";

    const additionalHtml = additionalInfo
      ? `<h3 style="margin:24px 0 8px;font-size:13px;font-weight:700;color:#005f8c;text-transform:uppercase;letter-spacing:0.05em;">Additional Information</h3>
         <p style="margin:0;font-size:13px;color:#333;line-height:1.6;">${escapeHtml(additionalInfo)}</p>`
      : "";

    const buildHtml = (setupUrl: string | null) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#005f8c;padding:28px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Welcome to PRISM Workforce</h1>
              <p style="margin:6px 0 0;color:#b3d6e8;font-size:13px;">PRL Site Solutions — Recruitment Specialists</p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0 0 10px;color:#333;font-size:15px;line-height:1.6;">Hi ${escapeHtml(personName)},</p>
              <p style="margin:0 0 20px;color:#333;font-size:15px;line-height:1.6;">
                Here is your subcontractor agreement with PRL Site Solutions. Please check the details below, then set up your PRISM login to upload your compliance documents.
              </p>
            </td>
          </tr>

          <!-- Subcontractor Agreement Summary -->
          <tr>
            <td style="padding:0 40px;">
              <div style="background:#f8fafc;border:1px solid #e0e6ed;border-radius:6px;padding:20px 24px;">

                <!-- Company -->
                <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#005f8c;text-transform:uppercase;letter-spacing:0.05em;">Company Details</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                  <tr>
                    <td style="padding:4px 0;color:#666;width:140px;">Company</td>
                    <td style="padding:4px 0;color:#333;font-weight:600;">${escapeHtml(companyName)}</td>
                  </tr>
                  ${companyAddress ? `<tr><td style="padding:4px 0;color:#666;">Site Address</td><td style="padding:4px 0;color:#333;">${escapeHtml(companyAddress)}</td></tr>` : ""}
                  <tr>
                    <td style="padding:4px 0;color:#666;">Site Contact</td>
                    <td style="padding:4px 0;color:#333;">${escapeHtml(contactName)}</td>
                  </tr>
                  ${contactEmail?.trim() ? `<tr><td style="padding:4px 0;color:#666;">Email</td><td style="padding:4px 0;color:#333;">${escapeHtml(contactEmail.trim())}</td></tr>` : ""}
                  ${contactPhone ? `<tr><td style="padding:4px 0;color:#666;">Phone</td><td style="padding:4px 0;color:#333;">${escapeHtml(contactPhone)}</td></tr>` : ""}
                </table>

                <hr style="border:none;border-top:1px solid #e0e6ed;margin:16px 0;">
                <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#005f8c;text-transform:uppercase;letter-spacing:0.05em;">Job Details</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                  <tr><td style="padding:4px 0;color:#666;width:140px;">Name</td><td style="padding:4px 0;color:#333;font-weight:600;">${escapeHtml(personName)}</td></tr>
                  ${supplyOf ? `<tr><td style="padding:4px 0;color:#666;">Job Role</td><td style="padding:4px 0;color:#333;">${escapeHtml(supplyOf)}</td></tr>` : ""}
                  ${siteLocation ? `<tr><td style="padding:4px 0;color:#666;">Site Name</td><td style="padding:4px 0;color:#333;">${escapeHtml(siteLocation)}</td></tr>` : ""}
                  ${startDate ? `<tr><td style="padding:4px 0;color:#666;">Start Date</td><td style="padding:4px 0;color:#333;">${new Date(startDate).toLocaleDateString("en-GB")}</td></tr>` : ""}
                </table>

                ${ratesTableHtml ? `<hr style="border:none;border-top:1px solid #e0e6ed;margin:16px 0;">${ratesTableHtml}` : ""}
                ${breakdownHtml ? `<hr style="border:none;border-top:1px solid #e0e6ed;margin:16px 0;">${breakdownHtml}` : ""}
                ${additionalHtml ? `<hr style="border:none;border-top:1px solid #e0e6ed;margin:16px 0;">${additionalHtml}` : ""}
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:32px 40px;">
              ${setupUrl ? `
              <p style="margin:0 0 20px;color:#333;font-size:14px;line-height:1.6;">
                Click the button below to choose your password and set up your PRISM login:
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#005f8c;border-radius:6px;">
                    <a href="${setupUrl}"
                       style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">
                      Set Up My PRISM Login &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;color:#666;font-size:13px;line-height:1.6;">
                This link works for 7 days. After that, just reply to this email and we'll send a new one.
                You can also add PRISM to your phone: <a href="https://www.prismworkforce.online/install" style="color:#005f8c;">www.prismworkforce.online/install</a>
              </p>` : `
              <p style="margin:0;color:#333;font-size:14px;line-height:1.6;">
                <strong>Staff copy.</strong> The PRISM login link was sent only to ${escapeHtml(loginEmail)}.
              </p>`}
            </td>
          </tr>

          <!-- Standing information: same on every agreement, never on the staff form -->
          <tr>
            <td style="padding:0 40px 32px;">
              ${STANDING_INFO_HTML}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f7fa;padding:16px 40px;border-top:1px solid #e0e6ed;">
              <p style="margin:0;color:#999;font-size:12px;">
                PRL Site Solutions &nbsp;|&nbsp; 0800 772 3959 &nbsp;|&nbsp; admin@prlsitesolutions.co.uk
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const setupUrl = await createSetPasswordUrl(loginEmail, SETUP_LINK_TTL_MS);
    const subject = `Your Subcontractor Agreement — ${companyName}`;

    const emailResult = await sendEmail({
      to: loginEmail,
      subject,
      html: buildHtml(setupUrl),
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

    // Records copy for the team — without the login link, which is personal.
    const staffCopyTo = ["helen@prlsitesolutions.co.uk"];
    const sessionEmail = session.user.email;
    if (sessionEmail && !staffCopyTo.includes(sessionEmail)) staffCopyTo.push(sessionEmail);
    const copyResult = await sendEmail({
      to: staffCopyTo,
      subject: `[Copy] ${subject}`,
      html: buildHtml(null),
      template: "supply-agreement-invite-copy",
    });
    if (!copyResult.success) {
      console.error(`[onboarding/invite] Failed to send staff copy for agreement ${agreement.id}:`, copyResult.error);
    }

  return NextResponse.json({ success: true, id: agreement.id });
}
