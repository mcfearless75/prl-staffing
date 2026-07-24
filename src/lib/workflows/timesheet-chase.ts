import { Resend } from "resend";
import { prisma } from "@/lib/db";

const FROM = "PRL Site Solutions <infotech@prlsitesolutions.co.uk>";
const PORTAL_URL = "https://www.prismworkforce.online";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const LOOKBACK_WEEKS = 4;

// Mirrors the Monday-snap convention used across the timesheets feature
// (src/app/(dashboard)/timesheets/actions.ts toMonday) — duplicated locally
// because that file has a "use server" directive, which restricts its
// exports to async functions only.
function toMonday(date: Date): Date {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  return monday;
}

export interface OverdueContractor {
  contractorId: string;
  contractorName: string;
  email: string | null;
  missingWeeks: Date[]; // ascending, Monday-start
  lastChased: Date | null;
}

export interface ChaseSendResult {
  sent: number;
  failed: number;
  skippedNoEmail: number;
  errors: string[];
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatWeek(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * For each contractor with at least one Active assignment, finds every
 * complete Monday-start week (bounded to the last 4 complete weeks, and to
 * each assignment's start date) with no timesheet on file for that
 * contractor+week — regardless of the timesheet's status.
 */
export async function computeOverdueTimesheets(): Promise<OverdueContractor[]> {
  const now = new Date();
  const currentWeekMonday = toMonday(now);
  // The current week isn't complete yet, so the most recent *complete* week
  // is the one before it.
  const lastCompleteWeek = new Date(currentWeekMonday.getTime() - WEEK_MS);
  const windowStart = new Date(currentWeekMonday.getTime() - LOOKBACK_WEEKS * WEEK_MS);

  if (lastCompleteWeek.getTime() < windowStart.getTime()) return [];

  const assignments = await prisma.assignment.findMany({
    where: { status: "Active" },
    include: { contractor: true },
  });

  if (assignments.length === 0) return [];

  const byContractor = new Map<
    string,
    { contractor: (typeof assignments)[number]["contractor"]; weeks: Map<string, Date> }
  >();

  for (const a of assignments) {
    const assignmentStartMonday = toMonday(a.startDate);
    const rangeStart =
      assignmentStartMonday.getTime() > windowStart.getTime() ? assignmentStartMonday : windowStart;
    if (rangeStart.getTime() > lastCompleteWeek.getTime()) continue;

    if (!byContractor.has(a.contractorId)) {
      byContractor.set(a.contractorId, { contractor: a.contractor, weeks: new Map() });
    }
    const entry = byContractor.get(a.contractorId)!;
    for (let t = rangeStart.getTime(); t <= lastCompleteWeek.getTime(); t += WEEK_MS) {
      const weekDate = new Date(t);
      entry.weeks.set(dateKey(weekDate), weekDate);
    }
  }

  const results: OverdueContractor[] = [];

  for (const [contractorId, { contractor, weeks }] of byContractor) {
    if (weeks.size === 0) continue;

    const candidateWeeks = [...weeks.values()].sort((a, b) => a.getTime() - b.getTime());

    // A week counts as covered if ANY timesheet exists for it, regardless of
    // its status — Draft, Submitted, Approved and Rejected all satisfy it.
    const existing = await prisma.timesheet.findMany({
      where: {
        contractorId,
        weekStarting: { gte: candidateWeeks[0], lte: candidateWeeks[candidateWeeks.length - 1] },
      },
      select: { weekStarting: true },
    });
    const covered = new Set(existing.map((t) => dateKey(t.weekStarting)));

    const missingWeeks = candidateWeeks.filter((w) => !covered.has(dateKey(w)));
    if (missingWeeks.length === 0) continue;

    const lastChase = await prisma.chaseLog.findFirst({
      where: { contractorId, kind: "timesheet" },
      orderBy: { sentAt: "desc" },
    });

    results.push({
      contractorId,
      contractorName: `${contractor.firstName} ${contractor.lastName}`,
      email: contractor.email,
      missingWeeks,
      lastChased: lastChase?.sentAt ?? null,
    });
  }

  return results.sort((a, b) => a.contractorName.localeCompare(b.contractorName));
}

function buildChaseEmail(firstName: string, missingWeeks: Date[]): string {
  const rows = missingWeeks
    .map((w) => `<li style="margin-bottom:4px;">Week commencing ${formatWeek(w)}</li>`)
    .join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1F4E79;padding:28px 32px;">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;">PRISM Workforce</p>
          <p style="margin:4px 0 0;color:#93C5FD;font-size:13px;">PRL Site Solutions — Timesheet Reminder</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${firstName},</p>
          <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
            Our records show the week(s) below are missing a timesheet. Please log in to PRISM and submit
            them as soon as possible to avoid a delay to your pay.
          </p>
          <ul style="margin:0 0 28px;padding-left:20px;font-size:14px;color:#374151;">${rows}</ul>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:#1F4E79;border-radius:6px;">
              <a href="${PORTAL_URL}/portal/timesheets" style="display:inline-block;padding:13px 28px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Submit Timesheets</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#374151;">Questions? Contact <a href="mailto:infotech@prlsitesolutions.co.uk" style="color:#1F4E79;">infotech@prlsitesolutions.co.uk</a></p>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">&copy; ${new Date().getFullYear()} PRL Site Solutions. This is an automated message from PRISM.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends a timesheet chase email to each selected contractor and writes one
 * ChaseLog row per successful send. Rate-limited between sends — the delay
 * always runs, even after a failed send, so a single bad address can never
 * skip the pause and cause a burst against the Resend API.
 */
export async function sendTimesheetChaseEmails(
  overdue: OverdueContractor[],
  contractorIds: string[],
  sentBy: string
): Promise<ChaseSendResult> {
  const result: ChaseSendResult = { sent: 0, failed: 0, skippedNoEmail: 0, errors: [] };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    result.errors.push("RESEND_API_KEY not configured");
    result.failed = contractorIds.length;
    return result;
  }
  const resend = new Resend(apiKey);

  const idSet = new Set(contractorIds);
  const selected = overdue.filter((o) => idSet.has(o.contractorId));

  for (const contractor of selected) {
    if (!contractor.email) {
      result.skippedNoEmail++;
      result.errors.push(`${contractor.contractorName}: no email on file`);
      continue;
    }

    try {
      const firstName = contractor.contractorName.split(" ")[0];
      const html = buildChaseEmail(firstName, contractor.missingWeeks);

      const { error } = await resend.emails.send({
        from: FROM,
        to: [contractor.email],
        subject: "Action Required: Missing Timesheet(s) — PRL Site Solutions",
        html,
      });

      if (error) {
        result.failed++;
        result.errors.push(`${contractor.contractorName} <${contractor.email}>: ${error.message}`);
      } else {
        await prisma.chaseLog.create({
          data: {
            contractorId: contractor.contractorId,
            kind: "timesheet",
            weekStarting: contractor.missingWeeks[0],
            sentBy,
          },
        });
        result.sent++;
      }
    } catch (err) {
      result.failed++;
      result.errors.push(`${contractor.contractorName}: ${String(err)}`);
    }

    // Rate-limit delay OUTSIDE the try/catch — always fires, so an error on
    // one send never skips the pause and bursts the next request.
    await sleep(200);
  }

  return result;
}
