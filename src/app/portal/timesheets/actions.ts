"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity-log";
import { calculateOvertime, DEFAULT_OVERTIME_CONFIG } from "@/lib/overtime-calculator";

export async function createContractorTimesheet(contractorId: string, formData: FormData) {
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
  const timesheet = await prisma.timesheet.findUnique({
    where: { id: timesheetId },
    include: { entries: { orderBy: { dayOfWeek: "asc" } } },
  });

  if (!timesheet || timesheet.status !== "Draft") return;

  const newEntries: { dayOfWeek: number; hours: number }[] = [];

  for (let day = 0; day < 7; day++) {
    const hours = parseFloat((formData.get(`hours_${day}`) as string) || "0");
    newEntries.push({ dayOfWeek: day, hours });
  }

  // Auto-calculate overtime
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
    if (entry) {
      await prisma.timesheetEntry.update({
        where: { id: entry.id },
        data: {
          hours: newEntries[day].hours,
          overtime: dayBreakdown?.overtimeHours || 0,
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

  await logActivity("Updated Timesheet Hours", "Timesheet", timesheetId, `${totalHours}h total, ${overtimeResult.totalOvertimeHours}h OT`);

  revalidatePath(`/portal/timesheets/${timesheetId}`);
  redirect(`/portal/timesheets/${timesheetId}`);
}

export async function submitContractorTimesheet(timesheetId: string) {
  await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      status: "Submitted",
      submittedAt: new Date(),
    },
  });

  await logActivity("Submitted Timesheet", "Timesheet", timesheetId, "Contractor self-service submission");

  revalidatePath(`/portal/timesheets/${timesheetId}`);
  revalidatePath("/portal/timesheets");
}
