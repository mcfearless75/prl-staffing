"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logTimesheetAudit, logTimesheetAuditBatch } from "@/lib/timesheet-audit";
import {
  calculateOvertime,
  shouldAutoApprove,
  DEFAULT_OVERTIME_CONFIG,
} from "@/lib/overtime-calculator";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

  // Audit log
  await logTimesheetAudit({
    timesheetId: timesheet.id,
    action: "Created",
    field: "status",
    newValue: "Draft",
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

  const auditEntries: {
    timesheetId: string;
    action: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
  }[] = [];

  // Collect new hours from form
  const newEntries: { dayOfWeek: number; hours: number }[] = [];

  for (let day = 0; day < 7; day++) {
    const hours = parseFloat((formData.get(`hours_${day}`) as string) || "0");
    newEntries.push({ dayOfWeek: day, hours });

    const entry = timesheet.entries.find((e) => e.dayOfWeek === day);
    if (entry && entry.hours !== hours) {
      auditEntries.push({
        timesheetId,
        action: "Edited",
        field: `hours_${dayNames[day]}`,
        oldValue: String(entry.hours),
        newValue: String(hours),
      });
    }
  }

  // Auto-calculate overtime using the engine
  const overtimeResult = calculateOvertime(
    newEntries.map((e) => ({
      dayOfWeek: e.dayOfWeek,
      hours: e.hours,
      date: new Date(
        timesheet.weekStarting.getTime() + e.dayOfWeek * 86400000
      ),
    })),
    timesheet.weekStarting,
    DEFAULT_OVERTIME_CONFIG
  );

  // Update each entry with calculated overtime
  for (let day = 0; day < 7; day++) {
    const entry = timesheet.entries.find((e) => e.dayOfWeek === day);
    const dayBreakdown = overtimeResult.dailyBreakdown.find(
      (b) => b.dayOfWeek === day
    );
    const hours = newEntries[day].hours;
    const overtime = dayBreakdown?.overtimeHours || 0;

    if (entry) {
      const oldOvertime = entry.overtime;
      await prisma.timesheetEntry.update({
        where: { id: entry.id },
        data: { hours, overtime },
      });
      if (oldOvertime !== overtime) {
        auditEntries.push({
          timesheetId,
          action: "AutoCalculated",
          field: `overtime_${dayNames[day]}`,
          oldValue: String(oldOvertime),
          newValue: String(overtime),
        });
      }
    }
  }

  // Determine exception status
  const isException = overtimeResult.exceptions.length > 0;
  const exceptionReason = isException
    ? overtimeResult.exceptions.join("; ")
    : null;

  // Update totals on timesheet
  const totalHours = overtimeResult.totalRegularHours + overtimeResult.totalOvertimeHours;
  await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      totalHours,
      overtimeHours: overtimeResult.totalOvertimeHours,
      isException,
      exceptionReason,
    },
  });

  // Log all audit entries
  if (auditEntries.length > 0) {
    await logTimesheetAuditBatch(auditEntries);
  }

  revalidatePath(`/timesheets/${timesheetId}`);
  redirect(`/timesheets/${timesheetId}`);
}

export async function submitTimesheet(id: string) {
  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: {
      assignment: { include: { company: { include: { approvalChain: { include: { steps: { orderBy: { stepOrder: "asc" } } } } } } } },
    },
  });

  if (!timesheet) throw new Error("Timesheet not found");

  // Check if exception-based auto-approval applies
  const { autoApprove, reason } = shouldAutoApprove(
    timesheet.totalHours,
    timesheet.overtimeHours,
    timesheet.isException ? [timesheet.exceptionReason || "Exception flagged"] : []
  );

  if (autoApprove) {
    // Auto-approve: skip manual review
    await prisma.timesheet.update({
      where: { id },
      data: {
        status: "Approved",
        submittedAt: new Date(),
        approvedAt: new Date(),
        approvedBy: "system",
      },
    });

    await logTimesheetAudit({
      timesheetId: id,
      action: "AutoApproved",
      field: "status",
      oldValue: "Draft",
      newValue: "Approved",
    });

    await logTimesheetAudit({
      timesheetId: id,
      action: "AutoApproved",
      field: "reason",
      newValue: reason,
    });
  } else {
    // Manual approval required
    await prisma.timesheet.update({
      where: { id },
      data: {
        status: "Submitted",
        submittedAt: new Date(),
      },
    });

    // Create approval chain steps if a chain exists
    const chain = timesheet.assignment?.company?.approvalChain;
    if (chain && chain.steps.length > 0) {
      await prisma.timesheetApproval.createMany({
        data: chain.steps.map((step) => ({
          timesheetId: id,
          stepOrder: step.stepOrder,
          stepLabel: step.label,
          status: step.stepOrder === 1 ? "Pending" : "Pending",
        })),
      });
    }

    await logTimesheetAudit({
      timesheetId: id,
      action: "Submitted",
      field: "status",
      oldValue: "Draft",
      newValue: "Submitted",
    });

    if (timesheet.isException) {
      await logTimesheetAudit({
        timesheetId: id,
        action: "ExceptionFlagged",
        field: "exception",
        newValue: timesheet.exceptionReason || "Requires manual review",
      });
    }
  }

  revalidatePath(`/timesheets/${id}`);
  revalidatePath("/timesheets");
}

export async function approveTimesheetStep(id: string, stepId?: string, notes?: string) {
  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: {
      approvals: { orderBy: { stepOrder: "asc" } },
    },
  });

  if (!timesheet) throw new Error("Timesheet not found");

  if (timesheet.approvals.length > 0) {
    // Multi-step approval chain
    const currentStep = stepId
      ? timesheet.approvals.find((a) => a.id === stepId)
      : timesheet.approvals.find((a) => a.status === "Pending");

    if (!currentStep) throw new Error("No pending approval step found");

    await prisma.timesheetApproval.update({
      where: { id: currentStep.id },
      data: {
        status: "Approved",
        approvedAt: new Date(),
        notes,
      },
    });

    await logTimesheetAudit({
      timesheetId: id,
      action: "StepApproved",
      field: `step_${currentStep.stepOrder}`,
      oldValue: "Pending",
      newValue: `Approved: ${currentStep.stepLabel}`,
    });

    // Check if all steps are now approved
    const remainingSteps = timesheet.approvals.filter(
      (a) => a.id !== currentStep.id && a.status === "Pending"
    );

    if (remainingSteps.length === 0) {
      // All steps complete — fully approve
      await prisma.timesheet.update({
        where: { id },
        data: {
          status: "Approved",
          approvedAt: new Date(),
        },
      });

      await logTimesheetAudit({
        timesheetId: id,
        action: "Approved",
        field: "status",
        oldValue: "Submitted",
        newValue: "Approved",
      });
    }
  } else {
    // Simple single-step approval
    await prisma.timesheet.update({
      where: { id },
      data: {
        status: "Approved",
        approvedAt: new Date(),
      },
    });

    await logTimesheetAudit({
      timesheetId: id,
      action: "Approved",
      field: "status",
      oldValue: "Submitted",
      newValue: "Approved",
    });
  }

  revalidatePath(`/timesheets/${id}`);
  revalidatePath("/timesheets");
}

// Keep the simple approve/reject for backwards compatibility
export async function approveTimesheet(id: string) {
  return approveTimesheetStep(id);
}

export async function rejectTimesheet(id: string) {
  await prisma.timesheet.update({
    where: { id },
    data: {
      status: "Rejected",
    },
  });

  // Also reject all pending approval steps
  await prisma.timesheetApproval.updateMany({
    where: { timesheetId: id, status: "Pending" },
    data: { status: "Rejected" },
  });

  await logTimesheetAudit({
    timesheetId: id,
    action: "Rejected",
    field: "status",
    oldValue: "Submitted",
    newValue: "Rejected",
  });

  revalidatePath(`/timesheets/${id}`);
  revalidatePath("/timesheets");
}

export async function reopenTimesheet(id: string) {
  const timesheet = await prisma.timesheet.findUnique({ where: { id } });
  if (!timesheet) throw new Error("Timesheet not found");

  await prisma.timesheet.update({
    where: { id },
    data: { status: "Draft" },
  });

  // Clear any approval steps
  await prisma.timesheetApproval.deleteMany({ where: { timesheetId: id } });

  await logTimesheetAudit({
    timesheetId: id,
    action: "Reopened",
    field: "status",
    oldValue: timesheet.status,
    newValue: "Draft",
  });

  revalidatePath(`/timesheets/${id}`);
  revalidatePath("/timesheets");
}
