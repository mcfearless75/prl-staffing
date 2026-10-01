// "You're finishing" notice: tells a contractor the end date staff have put on
// their job, or their leaving date, so nobody finds out on the day. Staff send
// it from the profile after a preview — PRISM never emails this on its own.
// Pure: no DB, no network — tested in tests/finish-notice.test.ts.

import { isPlaceholderEmail } from "@/lib/placeholder-email";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { escapeHtml } from "@/lib/utils";

/** ActivityLog action for a sent notice. Its note is the finishKey it covered. */
export const FINISH_NOTICE_ACTION = "Sent Finish Notice";

export const FINISH_NOTICE_SUBJECT = "Your finish date — PRL Site Solutions";

/** Within this many days the portal shows the date in amber. */
export const FINISH_SOON_DAYS = 14;

export type FinishItem = { kind: "assignment" | "leaving"; label: string; date: Date };

type AssignmentLike = {
  status: string;
  endDate: Date | null;
  role: string;
  location?: string | null;
  company: { name: string };
};

/** Start of today in UTC — date-only values are stored as UTC midnight. */
function startOfTodayUtc(now: Date): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** "Labourer at Acme (Leeds)" — what the job is called in the email. */
export function assignmentLabel(a: AssignmentLike): string {
  const where = a.location?.trim() ? ` (${a.location.trim()})` : "";
  return `${a.role.trim() || "Assignment"} at ${a.company.name}${where}`;
}

/**
 * The finish dates a contractor should know about: end dates on live
 * assignments, and their leaving date, from today onwards. Past dates are
 * gone — telling someone they finished last week helps nobody.
 */
export function finishItems(
  c: { leavingDate: Date | null; assignments: AssignmentLike[] },
  now: Date = new Date()
): FinishItem[] {
  const today = startOfTodayUtc(now);
  const items: FinishItem[] = [];
  for (const a of c.assignments) {
    if (!a.endDate || a.endDate < today) continue;
    if (!(LIVE_ASSIGNMENT_STATUSES as readonly string[]).includes(a.status)) continue;
    items.push({ kind: "assignment", label: assignmentLabel(a), date: a.endDate });
  }
  if (c.leavingDate && c.leavingDate >= today) {
    items.push({ kind: "leaving", label: "Last day working with PRL Site Solutions", date: c.leavingDate });
  }
  return items.sort((x, y) => x.date.getTime() - y.date.getTime());
}

/**
 * Identifies exactly which dates a notice covered. Stored with each sent
 * notice, so the same dates aren't sent twice but any change — a date brought
 * forward, a new job end — can be sent again.
 */
export function finishKey(items: FinishItem[]): string {
  // Also shown on the Activity tab as the sent email's note, so it reads as text.
  return items
    .map((i) => `${i.label}: ${i.date.toISOString().slice(0, 10)}`)
    .sort()
    .join("; ");
}

/** "Friday 2 October 2026". UTC because the stored value is UTC midnight. */
export function formatFinishDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Whole days from today until `date` (0 = today). */
export function daysUntil(date: Date, now: Date = new Date()): number {
  return Math.round((date.getTime() - startOfTodayUtc(now).getTime()) / 86_400_000);
}

/** Why the notice can't be sent right now, or null. Wording is for office staff. */
export function finishNoticeBlockReason(input: {
  email: string | null | undefined;
  emailBounced: boolean;
  items: FinishItem[];
  lastSentKey: string | null;
}): string | null {
  if (!input.email || isPlaceholderEmail(input.email)) return "No real email address on file";
  if (input.emailBounced) return "Their email address bounced — fix it first";
  if (input.items.length === 0) return "No upcoming end date or leaving date set";
  if (input.lastSentKey === finishKey(input.items)) return "Already told about these dates";
  return null;
}

export function buildFinishNoticeEmail(name: string, items: FinishItem[]): string {
  const rows = items
    .map(
      (i) => `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#374151;">${escapeHtml(i.label)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;color:#111827;font-weight:600;white-space:nowrap;">${formatFinishDate(i.date)}</td>
    </tr>`
    )
    .join("");

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
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${escapeHtml(name)},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            This is to let you know the finish date we have on record for you:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;margin-bottom:24px;">
            <tbody>${rows}</tbody>
          </table>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            If this is not what you were expecting, or you think the date is wrong, please contact the office as soon as possible on
            <a href="tel:08007723959" style="color:#1F4E79;">0800 772 3959</a> or
            <a href="mailto:info@prlsitesolutions.co.uk" style="color:#1F4E79;">info@prlsitesolutions.co.uk</a>.
          </p>
          <p style="margin:0;font-size:14px;color:#333;line-height:1.6;">
            Kind regards,<br>
            <strong>PRL Site Solutions</strong>
          </p>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">&copy; ${new Date().getFullYear()} PRL Site Solutions.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
