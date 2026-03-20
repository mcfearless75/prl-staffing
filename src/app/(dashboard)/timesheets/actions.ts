"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTimesheet(formData: FormData) {
  const contractorId = formData.get("contractorId") as string;
  const assignmentId = (formData.get("assignmentId") as string) || null;
  const weekStarting = new Date(formData.get("weekStarting") as string);
  const notes = (formData.get("notes") as string) || null;

  const timesheet = await prisma.timesheet.create({
    data: {
      contractorId,
      assignmentId: assignmentId || undefined,
      weekStarting,
      notes,
    },
  });

  // Create 7 empty entries for each day of the week (0=Mon ... 6=Sun)
  await prisma.timesheetEntry.createMany({
    data: Array.from({ length: 7 }, (_, i) => ({
      timesheetId: timesheet.id,
      dayOfWeek: i,
      hours: 0,
      overtime: 0,
    })),
  });

  redirect(`/timesheets/${timesheet.id}/edit`);
}

export async function updateTimesheetEntries(
  timesheetId: string,
  formData: FormData
) {
  const timesheet = await prisma.timesheet.findUnique({
    where: { id: timesheetId },
    include: { entries: { orderBy: { dayOfWeek: "asc" } } },
  });

  if (!timesheet) throw new Error("Timesheet not found");

  let totalHours = 0;
  let overtimeHours = 0;

  for (let day = 0; day < 7; day++) {
    const hours = parseFloat((formData.get(`hours_${day}`) as string) || "0");
    const overtime = parseFloat(
      (formData.get(`overtime_${day}`) as string) || "0"
    );
    totalHours += hours;
    overtimeHours += overtime;

    const entry = timesheet.entries.find((e) => e.dayOfWeek === day);
    if (entry) {
      await prisma.timesheetEntry.update({
        where: { id: entry.id },
        data: { hours, overtime },
      });
    }
  }

  await prisma.timesheet.update({
    where: { id: timesheetId },
    data: { totalHours, overtimeHours },
  });

  revalidatePath(`/timesheets/${timesheetId}`);
  redirect(`/timesheets/${timesheetId}`);
}

export async function submitTimesheet(id: string) {
  await prisma.timesheet.update({
    where: { id },
    data: {
      status: "Submitted",
      submittedAt: new Date(),
    },
  });

  revalidatePath(`/timesheets/${id}`);
  revalidatePath("/timesheets");
}

export async function approveTimesheet(id: string) {
  await prisma.timesheet.update({
    where: { id },
    data: {
      status: "Approved",
      approvedAt: new Date(),
    },
  });

  revalidatePath(`/timesheets/${id}`);
  revalidatePath("/timesheets");
}

export async function rejectTimesheet(id: string) {
  await prisma.timesheet.update({
    where: { id },
    data: {
      status: "Rejected",
    },
  });

  revalidatePath(`/timesheets/${id}`);
  revalidatePath("/timesheets");
}
