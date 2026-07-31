import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { escapeHtml } from "@/lib/utils";

/**
 * Tells a contractor when staff have acted against their timesheet in a way
 * that costs them money or needs them to do something.
 *
 * Scope is deliberately narrow — a week rejected, a day rejected, a day marked
 * absent. Approvals and ordinary staff edits send nothing: an alert that fires
 * on routine activity stops being read, and these three are the ones a
 * contractor would otherwise only discover at payday.
 *
 * Every send is best-effort. `sendEmail` never throws and these helpers swallow
 * their own failures, because a mail outage must never roll back or block the
 * staff action that triggered it — the timesheet change is the source of truth,
 * the email is a courtesy on top of it. Failures are still recorded: sendEmail
 * writes an EmailLog row on failure as well as success.
 */

const PORTAL_URL = "https://www.prismworkforce.online";

function formatWeek(weekStarting: Date): string {
  return weekStarting.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function dayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? `Day ${dayOfWeek}`;
}

/**
 * Shared shell so all three notices look like one system, and like the rest of
 * PRISM's contractor mail (compliance-chase is the reference).
 *
 * `bodyHtml` is the only parameter trusted to contain markup — it is assembled
 * from literals here. Anything a human typed must be passed through escapeHtml
 * by the caller before it reaches this function.
 */
function buildEmail(opts: {
  firstName: string;
  heading: string;
  bodyHtml: string;
  timesheetId: string;
  ctaLabel: string;
}): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1F4E79;padding:28px 32px;">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;">PRISM Workforce</p>
          <p style="margin:4px 0 0;color:#93C5FD;font-size:13px;">PRL Site Solutions — Timesheet Update</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${escapeHtml(opts.firstName)},</p>
          <p style="margin:0 0 20px;font-size:17px;font-weight:600;color:#111827;">${opts.heading}</p>
          ${opts.bodyHtml}
          <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr><td style="background:#1F4E79;border-radius:6px;">
              <a href="${PORTAL_URL}/portal/timesheets/${encodeURIComponent(opts.timesheetId)}" style="display:inline-block;padding:13px 28px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">${opts.ctaLabel}</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#374151;">If you think this is wrong, reply to this email or contact <a href="mailto:infotech@prlsitesolutions.co.uk" style="color:#1F4E79;">infotech@prlsitesolutions.co.uk</a>.</p>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">&copy; ${new Date().getFullYear()} PRL Site Solutions. This is an automated message from PRISM.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Renders a staff-typed reason, or an honest placeholder when none was given. */
function reasonBlock(reason: string | null | undefined): string {
  const text = reason?.trim()
    ? escapeHtml(reason.trim())
    : "No reason was recorded. Please contact us and we will explain.";
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #D97706;background:#FFFBEB;border-radius:4px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0 0 4px;font-size:12px;color:#92400E;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Reason given</p>
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">${text}</p>
    </td></tr>
  </table>`;
}

/**
 * Loads the recipient for a timesheet.
 *
 * Prefers the contractor's portal login address when they have one — that is
 * the address they actually sign in with — falling back to the profile email,
 * matching how send-app-invite picks its recipient.
 */
async function recipientFor(timesheetId: string): Promise<
  { email: string; firstName: string; weekStarting: Date } | null
> {
  const timesheet = await prisma.timesheet.findUnique({
    where: { id: timesheetId },
    select: {
      weekStarting: true,
      contractor: {
        select: {
          firstName: true,
          email: true,
          contractorLogin: { select: { email: true } },
        },
      },
    },
  });

  const email = timesheet?.contractor?.contractorLogin?.email ?? timesheet?.contractor?.email;
  if (!timesheet || !email) return null;

  return {
    email,
    firstName: timesheet.contractor.firstName || "there",
    weekStarting: timesheet.weekStarting,
  };
}

/** Whole week sent back. Hours are untouched — this asks them to act, not to accept a cut. */
export async function notifyTimesheetRejected(
  timesheetId: string,
  reason?: string | null
): Promise<void> {
  try {
    const to = await recipientFor(timesheetId);
    if (!to) return;

    const week = formatWeek(to.weekStarting);
    await sendEmail({
      to: to.email,
      subject: `Your timesheet for week ${week} needs attention`,
      template: "timesheet-rejected",
      html: buildEmail({
        firstName: to.firstName,
        heading: `Your timesheet for the week of ${week} has been sent back.`,
        bodyHtml: `<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
            Someone at PRL has reviewed the week and returned it. Nothing has been
            paid or removed yet — we need it corrected before it can be approved.
          </p>${reasonBlock(reason)}`,
        timesheetId,
        ctaLabel: "View this week",
      }),
    });
  } catch (err) {
    console.error("notifyTimesheetRejected failed:", err);
  }
}

/** A single day sent back. Also does not remove hours — only marking absent does that. */
export async function notifyTimesheetEntryRejected(
  timesheetId: string,
  dayOfWeek: number,
  reason?: string | null
): Promise<void> {
  try {
    const to = await recipientFor(timesheetId);
    if (!to) return;

    const week = formatWeek(to.weekStarting);
    const day = dayName(dayOfWeek);
    await sendEmail({
      to: to.email,
      subject: `${day} on your timesheet for week ${week} needs attention`,
      template: "timesheet-entry-rejected",
      html: buildEmail({
        firstName: to.firstName,
        heading: `${day} on your timesheet for the week of ${week} has been queried.`,
        bodyHtml: `<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
            The rest of the week is unaffected. The hours you entered for ${escapeHtml(day)}
            are still recorded — they just need to be resolved before this week is approved.
          </p>${reasonBlock(reason)}`,
        timesheetId,
        ctaLabel: "View this week",
      }),
    });
  } catch (err) {
    console.error("notifyTimesheetEntryRejected failed:", err);
  }
}

/**
 * A day marked absent.
 *
 * `hoursRemoved` is what the day actually held before it was zeroed, and the
 * wording MUST branch on it. Every timesheet is seeded with all seven days at
 * zero hours, and staff can mark any of them absent, so the common case is
 * recording an absence against a day the contractor never claimed. Telling
 * someone "your pay is affected" when their weekly total did not move is a
 * false statement about their money — the one thing these emails must never do.
 */
export async function notifyTimesheetEntryAbsent(
  timesheetId: string,
  dayOfWeek: number,
  reason?: string | null,
  hoursRemoved: number = 0
): Promise<void> {
  try {
    const to = await recipientFor(timesheetId);
    if (!to) return;

    const week = formatWeek(to.weekStarting);
    const day = dayName(dayOfWeek);
    const payAffected = hoursRemoved > 0;

    const impact = payAffected
      ? `The ${hoursRemoved} hour${hoursRemoved === 1 ? "" : "s"} recorded for ${escapeHtml(day)}
         ${hoursRemoved === 1 ? "has" : "have"} been removed and your total for that week has been
         recalculated. This will affect what you are paid for the week.`
      : `No hours had been entered for ${escapeHtml(day)}, so your total for the week is
         unchanged and your pay is not affected. This is recorded for attendance only.`;

    await sendEmail({
      to: to.email,
      subject: payAffected
        ? `${day} on your timesheet for week ${week} was marked as absence`
        : `${day} on your timesheet for week ${week} was recorded as absence (no change to your pay)`,
      template: "timesheet-entry-absent",
      html: buildEmail({
        firstName: to.firstName,
        heading: `${day} of the week starting ${week} has been recorded as an absence.`,
        bodyHtml: `<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
            ${impact}
          </p>${reasonBlock(reason)}`,
        timesheetId,
        ctaLabel: "View this week",
      }),
    });
  } catch (err) {
    console.error("notifyTimesheetEntryAbsent failed:", err);
  }
}
