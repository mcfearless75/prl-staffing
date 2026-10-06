import { escapeHtml } from "@/lib/utils";
import { unpaidBreakLabel, unpaidBreakTimesheetNote } from "@/lib/unpaid-break";

/**
 * The subcontractor agreement's wording and layout, in one place.
 *
 * Used by the emailed agreement (/api/onboarding/invite) AND the public
 * signing page (/agreement/[token]), so what the worker signs online is
 * exactly what they were emailed. Every value is escaped here — callers pass
 * raw text.
 */

export interface AgreementRate {
  description: string;
  rate: string;
  basis: string;
}

export interface AgreementContent {
  personName: string;
  companyName: string;
  companyAddress?: string | null;
  /** The client's SITE contact, not the subcontractor. */
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  supplyOf?: string | null;
  siteLocation?: string | null;
  startDate?: Date | null;
  rates: AgreementRate[];
  breakdown: string[];
  additionalInfo?: string | null;
  unpaidBreak: string;
}

const H3 = "margin:24px 0 8px;font-size:13px;font-weight:700;color:#005f8c;text-transform:uppercase;letter-spacing:0.05em;";
const HR = `<hr style="border:none;border-top:1px solid #e0e6ed;margin:16px 0;">`;

// Fixed wording from Jenni (25/09/2026), added to every subcontractor
// agreement so staff never retype it and it stays off the PRISM form.
// Edit the wording here.
const PAY_QUERY_URL = "https://www.prismworkforce.online/portal/pay-query";
const INFO_H3 = "margin:16px 0 6px;font-size:13px;font-weight:700;color:#005f8c;text-transform:uppercase;letter-spacing:0.05em;";
const INFO_P = "margin:0;font-size:13px;color:#333;line-height:1.6;";
// breakNote: the agreement's unpaid-break sentence, or null when breaks are paid.
export const standingInfoHtml = (breakNote: string | null) => `
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
    to your contact on site. This will then be processed for authorisation.${breakNote ? `
    ${escapeHtml(breakNote)}` : ""}
  </p>
  <p style="${INFO_P}margin-top:8px;">
    You will be paid the following <strong>Friday</strong> of every week worked, by no later than <strong>5pm</strong>.
    Pay is <strong>one week in hand</strong>.
  </p>
</div>
<!-- Generic sign-off per Jenni: signed by the company, never a named person -->
<p style="margin:24px 0 0;font-size:14px;color:#333;line-height:1.6;">
  Kind regards,<br>
  <strong>PRL Site Solutions</strong><br>
  <span style="font-size:12px;color:#666;">Signed on behalf of PRL Site Solutions</span>
</p>`;

/** dd/mm/yyyy of a stored start date (a calendar day, saved at midnight UTC). */
export function agreementDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { timeZone: "UTC" });
}

function row(label: string, value: string, opts: { bold?: boolean; first?: boolean } = {}): string {
  return `<tr><td style="padding:4px 0;color:#666;${opts.first ? "width:140px;" : ""}">${label}</td><td style="padding:4px 0;color:#333;${opts.bold ? "font-weight:600;" : ""}">${value}</td></tr>`;
}

/** The grey summary box: company, job, rates, breakdown, additional info. */
export function agreementSummaryHtml(c: AgreementContent): string {
  const ratesRowsHtml = c.rates
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
    ? `<h3 style="${H3}">Charge Rates</h3>
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

  const breakdownHtml = c.breakdown.length
    ? `<h3 style="${H3}">Rate Breakdown</h3>
         <ul style="margin:0;padding:0 0 0 20px;">
           ${c.breakdown.map((b) => `<li style="font-size:13px;color:#333;padding:3px 0;">${escapeHtml(b)}</li>`).join("")}
         </ul>`
    : "";

  const additionalHtml = c.additionalInfo
    ? `<h3 style="${H3}">Additional Information</h3>
         <p style="margin:0;font-size:13px;color:#333;line-height:1.6;">${escapeHtml(c.additionalInfo)}</p>`
    : "";

  const contactEmail = c.contactEmail?.trim();
  return `<div style="background:#f8fafc;border:1px solid #e0e6ed;border-radius:6px;padding:20px 24px;">
                <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#005f8c;text-transform:uppercase;letter-spacing:0.05em;">Company Details</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                  ${row("Company", escapeHtml(c.companyName), { bold: true, first: true })}
                  ${c.companyAddress ? row("Site Address", escapeHtml(c.companyAddress)) : ""}
                  ${row("Site Contact", escapeHtml(c.contactName))}
                  ${contactEmail ? row("Email", escapeHtml(contactEmail)) : ""}
                  ${c.contactPhone ? row("Phone", escapeHtml(c.contactPhone)) : ""}
                </table>
                ${HR}
                <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#005f8c;text-transform:uppercase;letter-spacing:0.05em;">Job Details</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                  ${row("Name", escapeHtml(c.personName), { bold: true, first: true })}
                  ${c.supplyOf ? row("Job Role", escapeHtml(c.supplyOf)) : ""}
                  ${c.siteLocation ? row("Site Name", escapeHtml(c.siteLocation)) : ""}
                  ${c.startDate ? row("Start Date", agreementDate(c.startDate)) : ""}
                  ${c.unpaidBreak ? row("Unpaid Break", escapeHtml(unpaidBreakLabel(c.unpaidBreak))) : ""}
                </table>
                ${ratesTableHtml ? `${HR}${ratesTableHtml}` : ""}
                ${breakdownHtml ? `${HR}${breakdownHtml}` : ""}
                ${additionalHtml ? `${HR}${additionalHtml}` : ""}
              </div>`;
}

/** The fixed terms block for this agreement (break note depends on the unpaid break). */
export function agreementTermsHtml(c: AgreementContent): string {
  return standingInfoHtml(c.unpaidBreak ? unpaidBreakTimesheetNote(c.unpaidBreak) : null);
}

/**
 * The full agreement email. With `signUrl` (agreements sent from the
 * new-starter pipeline) it carries a "Review and sign" button.
 *
 * No login link (Erica, 2026-10-01): the agreement is just the agreement.
 * Portal access goes out separately as the App Invite.
 */
export function buildAgreementEmailHtml(c: AgreementContent, opts: { signUrl?: string; signDays?: number } = {}): string {
  const signHtml = opts.signUrl
    ? `<tr>
            <td style="padding:0 40px 24px;" align="center">
              <a href="${escapeHtml(opts.signUrl)}" style="display:inline-block;background:#005f8c;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
                Review and sign your agreement
              </a>
              <p style="margin:10px 0 0;color:#666;font-size:12px;">The link works for ${opts.signDays ?? 30} days. Please sign before your start date.</p>
            </td>
          </tr>`
    : "";

  return `
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
              <p style="margin:0 0 10px;color:#333;font-size:15px;line-height:1.6;">Hi ${escapeHtml(c.personName)},</p>
              <p style="margin:0 0 20px;color:#333;font-size:15px;line-height:1.6;">
                Here is your subcontractor agreement with PRL Site Solutions.
              </p>
            </td>
          </tr>
          ${signHtml}

          <!-- Subcontractor Agreement Summary -->
          <tr>
            <td style="padding:0 40px;">
              ${agreementSummaryHtml(c)}
            </td>
          </tr>

          <!-- Standing information: same on every agreement, never on the staff form -->
          <tr>
            <td style="padding:32px 40px;">
              ${agreementTermsHtml(c)}
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
}

/** Rebuilds the content from a stored SupplyAgreement row (for the signing page). */
export function agreementContentFromRow(a: {
  firstName: string | null;
  lastName: string | null;
  companyName: string;
  companyAddress: string | null;
  contactName: string;
  contactPhone: string | null;
  supplyOf: string | null;
  siteLocation: string | null;
  startDate: Date | null;
  rates: string | null;
  breakdown: string | null;
  additionalInfo: string | null;
  unpaidBreak: string | null;
}): AgreementContent {
  const parse = <T,>(json: string | null, fallback: T): T => {
    if (!json) return fallback;
    try {
      const v = JSON.parse(json);
      return Array.isArray(v) ? (v as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const rates = parse<unknown[]>(a.rates, [])
    .filter((r): r is AgreementRate => !!r && typeof r === "object")
    .map((r) => ({ description: String(r.description ?? ""), rate: String(r.rate ?? ""), basis: String(r.basis ?? "") }));
  return {
    personName: [a.firstName, a.lastName].filter(Boolean).join(" ") || "Subcontractor",
    companyName: a.companyName,
    companyAddress: a.companyAddress,
    contactName: a.contactName,
    // contactEmail on the row is the WORKER's login email, not the site
    // contact's (see /api/onboarding/invite), so it is not shown here.
    contactEmail: null,
    contactPhone: a.contactPhone,
    supplyOf: a.supplyOf,
    siteLocation: a.siteLocation,
    startDate: a.startDate,
    rates,
    breakdown: parse<unknown[]>(a.breakdown, []).map(String),
    additionalInfo: a.additionalInfo,
    unpaidBreak: a.unpaidBreak ?? "",
  };
}
