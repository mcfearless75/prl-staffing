"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity-log";
import { logTimesheetAuditBatch } from "@/lib/timesheet-audit";
import { calculateOvertime, DEFAULT_OVERTIME_CONFIG } from "@/lib/overtime-calculator";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type TimesheetActionState = { error?: string; ok?: string } | null;

/**
 * Resolves the logged-in contractor's own contractorId from the session.
 * Never trust a contractorId passed in from client input — the session is
 * the sole source of truth for "who am I".
 */
async function requireSessionContractorId(): Promise<string> {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");
  return contractorId;
}

export async function createContractorTimesheet(_contractorId: string, formData: FormData) {
  const contractorId = await requireSessionContractorId();

  const rawAssignmentId = (formData.get("assignmentId") as string) || null;

  // Never trust a client-submitted assignmentId — confirm server-side that it
  // is one of this contractor's own Active/Placed assignments before it can
  // be attached to the timesheet or seeded onto its entries.
  let assignmentId: string | null = null;
  if (rawAssignmentId) {
    const owned = await prisma.assignment.findFirst({
      where: { id: rawAssignmentId, contractorId, status: { in: ["Active", "Placed"] } },
      select: { id: true },
    });
    assignmentId = owned ? owned.id : null;
  }

  const weekStarting = new Date(formData.get("weekStarting") as string);

  const timesheet = await prisma.timesheet.create({
    data: {
      contractorId,
      assignmentId: assignmentId || undefined,
      weekStarting,
    },
  });

  // Create 7 empty entries, seeded with the chosen assignment — the common
  // case is a single placement all week ("apply to all" from the moment the
  // timesheet is created); per-day overrides happen later via
  // updateContractorTimesheetEntries.
  await prisma.timesheetEntry.createMany({
    data: Array.from({ length: 7 }, (_, i) => ({
      timesheetId: timesheet.id,
      dayOfWeek: i,
      hours: 0,
      overtime: 0,
      assignmentId: assignmentId || undefined,
    })),
  });

  await logActivity("Created Timesheet", "Timesheet", timesheet.id, "Contractor self-service");

  redirect(`/portal/timesheets/${timesheet.id}`);
}

export async function updateContractorTimesheetEntries(
  timesheetId: string,
  _prev: TimesheetActionState,
  formData: FormData
): Promise<TimesheetActionState> {
  const contractorId = await requireSessionContractorId();

  const timesheet = await prisma.timesheet.findFirst({
    where: { id: timesheetId, contractorId },
    include: { entries: { orderBy: { dayOfWeek: "asc" } } },
  });

  if (!timesheet) return { error: "Timesheet not found." };
  if (timesheet.status !== "Draft") {
    return {
      error: `Nothing was saved — this timesheet is ${timesheet.status.toLowerCase()} and can no longer be edited. Contact the office if the hours are wrong.`,
    };
  }

  // Per-day assignment choices must be validated server-side against this
  // contractor's own Active/Placed assignments — never trust the client-side
  // <select> filtering alone (same guard style as requireSessionContractorId
  // above: the session, not client input, is the source of truth for what
  // this contractor is allowed to attach to a day).
  const ownedAssignments = await prisma.assignment.findMany({
    where: { contractorId, status: { in: ["Active", "Placed"] } },
    select: { id: true },
  });
  const ownedAssignmentIds = new Set(ownedAssignments.map((a) => a.id));

  const newEntries: {
    dayOfWeek: number;
    hours: number;
    absent: boolean;
    absenceReason: string | null;
    assignmentId: string | null;
  }[] = [];
  const auditEntries: { timesheetId: string; action: string; field: string; oldValue?: string; newValue?: string }[] = [];

  for (let day = 0; day < 7; day++) {
    const isAbsent = formData.get(`absent_${day}`) === "on";
    const existingEntry = timesheet.entries.find((e) => e.dayOfWeek === day);

    // A submitted assignment that doesn't belong to this contractor is
    // ignored outright — the day keeps whatever assignment it already had
    // rather than silently accepting a tampered value.
    const rawAssignmentId = (formData.get(`assignment_${day}`) as string) || null;
    const assignmentId =
      rawAssignmentId && ownedAssignmentIds.has(rawAssignmentId)
        ? rawAssignmentId
        : existingEntry?.assignmentId ?? null;

    if (isAbsent) {
      const reason = (formData.get(`reason_${day}`) as string) || "Sick";
      const note = ((formData.get(`note_${day}`) as string) || "").trim();
      const absenceReason = note ? `${reason}: ${note}` : reason;
      newEntries.push({ dayOfWeek: day, hours: 0, absent: true, absenceReason, assignmentId });

      if (existingEntry?.status !== "Absent") {
        auditEntries.push({
          timesheetId,
          action: "DayMarkedAbsent",
          field: dayNames[day],
          oldValue: existingEntry ? String(existingEntry.hours) : undefined,
          newValue: absenceReason,
        });
      }
    } else {
      const hours = parseFloat(((formData.get(`hours_${day}`) as string) || "0").trim());
      // Rejected before any write so a bad value can never reach the Float
      // column as NaN and take the whole save down mid-loop.
      if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
        return { error: `${dayNames[day]}: enter a number of hours between 0 and 24.` };
      }
      newEntries.push({ dayOfWeek: day, hours, absent: false, absenceReason: null, assignmentId });

      if (existingEntry?.status === "Absent") {
        auditEntries.push({
          timesheetId,
          action: "DayAbsenceCleared",
          field: dayNames[day],
          oldValue: existingEntry.absenceReason || "Absent",
          newValue: String(hours),
        });
      }
    }
  }

  // Auto-calculate overtime — absent days contribute 0 hours, matching a
  // normal empty day, so the engine needs no special-casing here.
  const overtimeResult = calculateOvertime(
    newEntries.map((e) => ({
      dayOfWeek: e.dayOfWeek,
      hours: e.hours,
      date: new Date(timesheet.weekStarting.getTime() + e.dayOfWeek * 86400000),
    })),
    timesheet.weekStarting,
    DEFAULT_OVERTIME_CONFIG
  );

  // Update entries
  for (let day = 0; day < 7; day++) {
    const entry = timesheet.entries.find((e) => e.dayOfWeek === day);
    const dayBreakdown = overtimeResult.dailyBreakdown.find((b) => b.dayOfWeek === day);
    const dayData = newEntries[day];
    if (entry) {
      await prisma.timesheetEntry.update({
        where: { id: entry.id },
        data: {
          hours: dayData.hours,
          overtime: dayData.absent ? 0 : dayBreakdown?.overtimeHours || 0,
          status: dayData.absent ? "Absent" : entry.status === "Absent" ? "Pending" : entry.status,
          absenceReason: dayData.absenceReason,
          assignmentId: dayData.assignmentId,
        },
      });
    }
  }

  const isException = overtimeResult.exceptions.length > 0;
  const totalHours = overtimeResult.totalRegularHours + overtimeResult.totalOvertimeHours;

  // The timesheet-level assignmentId stays as the default/fallback (used by
  // invoicing when a week never gets split across assignments) — set it to
  // whichever assignment covers the most days this save. Ties break in favour
  // of the first one encountered (Monday-first day order).
  const assignmentDayCounts = new Map<string, number>();
  for (const e of newEntries) {
    if (e.assignmentId) {
      assignmentDayCounts.set(e.assignmentId, (assignmentDayCounts.get(e.assignmentId) || 0) + 1);
    }
  }
  let mostUsedAssignmentId: string | null = timesheet.assignmentId;
  let bestCount = 0;
  for (const [id, count] of assignmentDayCounts) {
    if (count > bestCount) {
      bestCount = count;
      mostUsedAssignmentId = id;
    }
  }

  await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      totalHours,
      overtimeHours: overtimeResult.totalOvertimeHours,
      isException,
      exceptionReason: isException ? overtimeResult.exceptions.join("; ") : null,
      assignmentId: mostUsedAssignmentId || undefined,
    },
  });

  if (auditEntries.length > 0) {
    await logTimesheetAuditBatch(auditEntries);
  }

  await logActivity("Updated Timesheet Hours", "Timesheet", timesheetId, `${totalHours}h total, ${overtimeResult.totalOvertimeHours}h OT`);

  revalidatePath(`/portal/timesheets/${timesheetId}`);
  revalidatePath("/portal/timesheets");

  return { ok: `Saved — ${totalHours}h total.` };
}

export async function submitContractorTimesheet(
  timesheetId: string,
  _prev: TimesheetActionState,
  _formData: FormData
): Promise<TimesheetActionState> {
  const contractorId = await requireSessionContractorId();

  // status is part of the filter, not just the button's render condition —
  // server actions are directly invocable, so only a Draft may ever transition
  // to Submitted (otherwise an Approved sheet would be un-approved and its
  // submittedAt restamped).
  const { count } = await prisma.timesheet.updateMany({
    where: { id: timesheetId, contractorId, status: "Draft" },
    data: {
      status: "Submitted",
      submittedAt: new Date(),
    },
  });

  if (count === 0) {
    const existing = await prisma.timesheet.findFirst({
      where: { id: timesheetId, contractorId },
      select: { status: true },
    });
    return {
      error: existing
        ? `This timesheet is already ${existing.status.toLowerCase()} and cannot be submitted again.`
        : "Timesheet not found.",
    };
  }

  await logActivity("Submitted Timesheet", "Timesheet", timesheetId, "Contractor self-service submission");

  revalidatePath(`/portal/timesheets/${timesheetId}`);
  revalidatePath("/portal/timesheets");

  return { ok: "Timesheet submitted for approval." };
}
