// Campaign → Custom email (PRL: "filter with job title and missing doc and
// then send a generic template. Can we see which staff it's going to and
// amend the email before"). Sits ALONGSIDE the fixed onboarding chasers.
// Pure: the page and server actions share these rules, and the tests pin them.

import { COMPLIANCE_TYPE_GROUPS, type ComplianceCategory } from "@/lib/compliance-types";
import { rtwCoverage } from "@/lib/rtw-flag";
import { isPlaceholderEmail } from "@/lib/placeholder-email";
import { escapeHtml } from "@/lib/utils";

export const CAMPAIGN_STATUSES = ["Active", "Inactive", "Applied", "Looking"] as const;
export const CAMPAIGN_CATEGORIES: readonly ComplianceCategory[] = COMPLIANCE_TYPE_GROUPS
  .map((g) => g.category)
  .filter((c) => c !== "Right to Work");

/** "" = any; "rtw" = Right to Work not covered; "category:<name>" = nothing uploaded in that category. */
export type MissingFilter = "" | "rtw" | `category:${string}`;

export interface CampaignFilter {
  status: "" | (typeof CAMPAIGN_STATUSES)[number];
  jobTitle: string; // "" = any; exact match, case-insensitive
  missing: MissingFilter;
}

export function parseCampaignFilter(raw: { status?: unknown; jobTitle?: unknown; missing?: unknown }): CampaignFilter {
  const status = (CAMPAIGN_STATUSES as readonly string[]).includes(raw.status as string)
    ? (raw.status as CampaignFilter["status"])
    : "";
  const jobTitle = typeof raw.jobTitle === "string" ? raw.jobTitle.trim() : "";
  const m = typeof raw.missing === "string" ? raw.missing : "";
  const missing: MissingFilter =
    m === "rtw" ? "rtw"
    : m.startsWith("category:") && (CAMPAIGN_CATEGORIES as readonly string[]).includes(m.slice(9)) ? (m as MissingFilter)
    : "";
  return { status, jobTitle, missing };
}

type Rec = { type: string; status: string; expiryDate: Date | null };

// Uploaded and not rejected or out of date. Pending counts: they have sent it,
// so chasing them again for it would be wrong.
const PROVIDED = new Set(["Verified", "Expiring", "Pending"]);

export function isMissing(records: Rec[], missing: MissingFilter, now: Date = new Date()): boolean {
  if (!missing) return true;
  if (missing === "rtw") return !rtwCoverage(records, now).covered;
  const types = new Set(COMPLIANCE_TYPE_GROUPS.find((g) => g.category === missing.slice(9))?.types ?? []);
  return !records.some(
    (r) => types.has(r.type) && PROVIDED.has(r.status) && (r.expiryDate === null || r.expiryDate.getTime() > now.getTime())
  );
}

export function matchesFilter(
  c: { status: string; jobTitle: string | null; compliances: Rec[] },
  f: CampaignFilter,
  now: Date = new Date()
): boolean {
  if (f.status && c.status !== f.status) return false;
  if (f.jobTitle && (c.jobTitle ?? "").trim().toLowerCase() !== f.jobTitle.toLowerCase()) return false;
  return isMissing(c.compliances, f.missing, now);
}

/** Why someone in the list won't be emailed, or null. Shown in the preview. */
export function skipReason(c: { email: string | null; emailBounced: boolean }): string | null {
  if (!c.email || isPlaceholderEmail(c.email)) return "No real email address";
  if (c.emailBounced) return "Email bounced";
  return null;
}

/**
 * The typed message as safe HTML: escaped first (staff text must never inject
 * markup into an email), then {name} filled in, blank lines = paragraphs.
 */
export function renderMessage(text: string, vars: { name: string }): string {
  return escapeHtml(text.replace(/\r\n/g, "\n").trim())
    .replace(/\{name\}/gi, escapeHtml(vars.name))
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function renderSubject(subject: string, vars: { name: string }): string {
  return subject.replace(/\{name\}/gi, vars.name).replace(/[\r\n]+/g, " ").trim();
}

const PORTAL_DOCS_URL = "https://www.prismworkforce.online/portal/documents";

/** Branded wrapper around the rendered message, same look as the chase emails. */
export function buildCampaignEmail(messageHtml: string, withAppButton: boolean): string {
  const button = withAppButton
    ? `<table cellpadding="0" cellspacing="0" style="margin:8px 0 28px;"><tr><td style="background:#1F4E79;border-radius:6px;">
         <a href="${PORTAL_DOCS_URL}" style="display:inline-block;padding:13px 28px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Open the PRISM app</a>
       </td></tr></table>`
    : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1F4E79;padding:28px 32px;">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;">PRISM Workforce</p>
          <p style="margin:4px 0 0;color:#93C5FD;font-size:13px;">PRL Site Solutions</p>
        </td></tr>
        <tr><td style="padding:32px;">
          ${messageHtml}
          ${button}
          <p style="margin:0;font-size:14px;color:#374151;">Questions? Contact <a href="mailto:admin@prlsitesolutions.co.uk" style="color:#1F4E79;">admin@prlsitesolutions.co.uk</a></p>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">&copy; ${new Date().getFullYear()} PRL Site Solutions.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Client-made id for one send; every recipient is logged against it, so a retry never double-sends. */
export function isValidCampaignKey(key: unknown): key is string {
  return typeof key === "string" && /^[A-Za-z0-9-]{8,64}$/.test(key);
}

export const MAX_SUBJECT = 150;
export const MAX_MESSAGE = 5000;
/** Recipients per server call; the page loops, showing progress. */
export const SEND_BATCH_SIZE = 10;

export const CAMPAIGN_TEMPLATES: { id: string; label: string; subject: string; message: string; missing: MissingFilter }[] = [
  {
    id: "rtw",
    label: "Right to Work missing",
    missing: "rtw",
    subject: "Action needed: your Right to Work",
    message:
      "Hi {name},\n\nWe still need proof of your Right to Work in the UK before we can place you on site. By law we have to hold this for everyone who works through us.\n\nPlease open the PRISM app, go to Documents and complete the Right to Work section.\n\nThanks,\nPRL Site Solutions",
  },
  {
    id: "cards",
    label: "Cards / certificates missing",
    missing: "category:CSCS",
    subject: "Please upload your cards and certificates",
    message:
      "Hi {name},\n\nWe don't have a valid copy of your cards on file. Please open the PRISM app, go to Documents and upload a photo of each card, front and back, with the expiry date clearly visible.\n\nThanks,\nPRL Site Solutions",
  },
  {
    id: "blank",
    label: "Blank message",
    missing: "",
    subject: "",
    message: "Hi {name},\n\n\n\nThanks,\nPRL Site Solutions",
  },
];
