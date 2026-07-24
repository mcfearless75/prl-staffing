"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity-log";
import { logTimesheetAuditBatch } from "@/lib/timesheet-audit";
import { calculateOvertime, DEFAULT_OVERTIME_CONFIG } from "@/lib/overtime-calculator";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

  const assignmentId = (formData.get("assignmentId") as string) || null;
  const weekStarting = new Date(formData.get("weekStarting") as string);

  const timesheet = await prisma.timesheet.create({
    data: {
      contractorId,
      assignmentId: assignmentId || undefined,
      weekStarting,
    },
  });

  // Create 7 empty entries
  await prisma.timesheetEntry.createMany({
    data: Array.from({ length: 7 }, (_, i) => ({
      timesheetId: timesheet.id,
      dayOfWeek: i,
      hours: 0,
      overtime: 0,
    })),
  });

  await logActivity("Created Timesheet", "Timesheet", timesheet.id, "Contractor self-service");

  redirect(`/portal/timesheets/${timesheet.id}`);
}

export async function updateContractorTimesheetEntries(timesheetId: string, formData: FormData) {
  const contractorId = await requireSessionContractorId();

  const timesheet = await prisma.timesheet.findFirst({
    where: { id: timesheetId, contractorId },
    include: { entries: { orderBy: { dayOfWeek: "asc" } } },
  });

  if (!timesheet || timesheet.status !== "Draft") return;

  const newEntries: { dayOfWeek: number; hours: number; absent: boolean; absenceReason: string | null }[] = [];
  const auditEntries: { timesheetId: string; action: string; field: string; oldValue?: string; newValue?: string }[] = [];

  for (let day = 0; day < 7; day++) {
    const isAbsent = formData.get(`absent_${day}`) === "on";
    const existingEntry = timesheet.entries.find((e) => e.dayOfWeek === day);

    if (isAbsent) {
      const reason = (formData.get(`reason_${day}`) as string) || "Sick";
      const note = ((formData.get(`note_${day}`) as string) || "").trim();
      const absenceReason = note ? `${reason}: ${note}` : reason;
      newEntries.push({ dayOfWeek: day, hours: 0, absent: true, absenceReason });

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
      const hours = parseFloat((formData.get(`hours_${day}`) as string) || "0");
      newEntries.push({ dayOfWeek: day, hours, absent: false, absenceReason: null });

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
        },
      });
    }
  }

  const isException = overtimeResult.exceptions.length > 0;
  const totalHours = overtimeResult.totalRegularHours + overtimeResult.totalOvertimeHours;

  await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      totalHours,
      overtimeHours: overtimeResult.totalOvertimeHours,
      isException,
      exceptionReason: isException ? overtimeResult.exceptions.join("; ") : null,
    },
  });

  if (auditEntries.length > 0) {
    await logTimesheetAuditBatch(auditEntries);
  }

  await logActivity("Updated Timesheet Hours", "Timesheet", timesheetId, `${totalHours}h total, ${overtimeResult.totalOvertimeHours}h OT`);

  revalidatePath(`/portal/timesheets/${timesheetId}`);
  redirect(`/portal/timesheets/${timesheetId}`);
}

export async function submitContractorTimesheet(timesheetId: string) {
  const contractorId = await requireSessionContractorId();

  const { count } = await prisma.timesheet.updateMany({
    where: { id: timesheetId, contractorId },
    data: {
      status: "Submitted",
      submittedAt: new Date(),
    },
  });

  if (count === 0) return;

  await logActivity("Submitted Timesheet", "Timesheet", timesheetId, "Contractor self-service submission");

  revalidatePath(`/portal/timesheets/${timesheetId}`);
  revalidatePath("/portal/timesheets");
}
