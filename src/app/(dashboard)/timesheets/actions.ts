"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireStaff } from "@/lib/require-staff";
import { logTimesheetAudit, logTimesheetAuditBatch } from "@/lib/timesheet-audit";
import {
  calculateOvertime,
  shouldAutoApprove,
  DEFAULT_OVERTIME_CONFIG,
} from "@/lib/overtime-calculator";
import { calculateProfessionalHours } from "@/lib/professional-hours";
import {
  notifyTimesheetRejected,
  notifyTimesheetEntryRejected,
  notifyTimesheetEntryAbsent,
} from "@/lib/timesheet-notifications";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// The rest of the app (overtime calculation, weekly grouping/reporting) assumes
// weekStarting always falls on a Monday. The "Week Starting" date picker doesn't
// tell the user to pick a Monday, so snap whatever date they choose to that
// week's Monday instead of rejecting the submission.
function toMonday(date: Date): Date {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  return monday;
}

// Replacing a duplicate timesheet is only safe while the original hasn't been
// paid out yet — once it's Approved, deleting it would destroy an audited
// payroll record with no way back.
const REPLACEABLE_STATUSES = ["Draft", "Submitted", "Rejected"];

export async function createTimesheet(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const contractorId = formData.get("contractorId") as string;
    const assignmentId = (formData.get("assignmentId") as string) || null;
    const weekStarting = toMonday(new Date(formData.get("weekStarting") as string));
    const notes = (formData.get("notes") as string) || null;
    const confirmReplace = formData.get("confirmReplace") === "true";

    if (assignmentId) {
      const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
      if (!assignment || assignment.contractorId !== contractorId) {
        throw new Error("Selected assignment does not belong to this contractor.");
      }
    }

    const existing = await prisma.timesheet.findFirst({
      where: { contractorId, weekStarting },
    });

    if (existing && !confirmReplace) {
      redirect(
        `/timesheets/new?duplicateId=${existing.id}&weekStarting=${weekStarting.toISOString().slice(0, 10)}&contractorId=${contractorId}&assignmentId=${assignmentId || ""}&notes=${encodeURIComponent(notes || "")}`
      );
    }

    if (existing && confirmReplace && !REPLACEABLE_STATUSES.includes(existing.status)) {
      throw new Error(
        `Cannot replace an existing timesheet with status "${existing.status}". Approved timesheets must be reopened by an authorised approver first.`
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      if (existing && confirmReplace) {
        await tx.timesheet.delete({ where: { id: existing.id } });
      }

      const timesheet = await tx.timesheet.create({
        data: {
          contractorId,
          assignmentId: assignmentId || undefined,
          weekStarting,
          notes,
        },
      });

      await tx.timesheetEntry.createMany({
        data: Array.from({ length: 7 }, (_, i) => ({
          timesheetId: timesheet.id,
          dayOfWeek: i,
          hours: 0,
          overtime: 0,
          assignmentId: assignmentId || undefined,
        })),
      });

      return timesheet;
    });
    const timesheetId = created.id;

    if (existing && confirmReplace) {
      await logTimesheetAudit({
        timesheetId,
        action: "Replaced",
        field: "replacedTimesheetId",
        oldValue: existing.id,
        newValue: timesheetId,
      });
    }

    await logTimesheetAudit({
      timesheetId,
      action: "Created",
      field: "status",
      newValue: "Draft",
    });

    revalidatePath("/timesheets");
    redirect(`/timesheets/${timesheetId}/edit`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    if (error instanceof Error && (
      error.message.startsWith("Cannot replace") ||
      error.message.startsWith("Selected assignment")
    )) throw error;
    console.error("Failed to create timesheet:", error);
    throw new Error("Failed to create timesheet. Please try again.");
  }
}

export async function updateTimesheetEntries(
  timesheetId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: { entries: { orderBy: { dayOfWeek: "asc" } } },
    });

    if (!timesheet) throw new Error("Timesheet not found");

    const hasRejectedEntry = timesheet.entries.some((e) => e.status === "Rejected");
    const editable = timesheet.status === "Draft" || (timesheet.status === "Submitted" && hasRejectedEntry);
    if (!editable) {
      throw new Error(`Timesheet with status "${timesheet.status}" cannot be edited.`);
    }

    const contractorAssignments = await prisma.assignment.findMany({
      where: { contractorId: timesheet.contractorId },
      select: { id: true },
    });
    const validAssignmentIds = new Set(contractorAssignments.map((a) => a.id));

    const auditEntries: {
      timesheetId: string;
      action: string;
      field?: string;
      oldValue?: string;
      newValue?: string;
    }[] = [];

    // Collect new hours and per-day assignment from form
    const newEntries: {
      dayOfWeek: number;
      hours: number;
      assignmentId: string | null;
      startTime: string | null;
      finishTime: string | null;
    }[] = [];

    for (let day = 0; day < 7; day++) {
      const startTime = (formData.get(`start_${day}`) as string) || null;
      const finishTime = (formData.get(`finish_${day}`) as string) || null;
      // Derive hours from clock times when both are set (authoritative — never
      // trust the client-submitted hours field over the times), else use the
      // manually entered hours value.
      const derived = calculateProfessionalHours(startTime, finishTime);
      const hours = derived !== null ? derived : parseFloat((formData.get(`hours_${day}`) as string) || "0");
      const rawAssignmentId = (formData.get(`assignment_${day}`) as string) || null;
      if (rawAssignmentId && !validAssignmentIds.has(rawAssignmentId)) {
        throw new Error("Selected assignment does not belong to this contractor.");
      }
      const assignmentId = rawAssignmentId;
      newEntries.push({ dayOfWeek: day, hours, assignmentId, startTime, finishTime });

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
      if (entry && entry.assignmentId !== assignmentId) {
        auditEntries.push({
          timesheetId,
          action: "Edited",
          field: `assignment_${dayNames[day]}`,
          oldValue: entry.assignmentId || "",
          newValue: assignmentId || "",
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
      const assignmentId = newEntries[day].assignmentId;
      const startTime = newEntries[day].startTime;
      const finishTime = newEntries[day].finishTime;
      const overtime = dayBreakdown?.overtimeHours || 0;

      if (entry) {
        const oldOvertime = entry.overtime;
        const hoursChanged = entry.hours !== hours;
        const assignmentChanged = (entry.assignmentId || null) !== assignmentId;
        const timesChanged =
          (entry.startTime || null) !== startTime || (entry.finishTime || null) !== finishTime;
        const isRejected = entry.status === "Rejected";
        const dayAmended = isRejected && (hoursChanged || assignmentChanged || timesChanged);

        await prisma.timesheetEntry.update({
          where: { id: entry.id },
          data: {
            hours,
            overtime,
            assignmentId: assignmentId || null,
            startTime,
            finishTime,
            ...(dayAmended
              ? { status: "Pending", rejectionReason: null }
              : {}),
          },
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
        if (dayAmended) {
          auditEntries.push({
            timesheetId,
            action: "DayAmended",
            field: dayNames[day],
            oldValue: "Rejected",
            newValue: "Pending",
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
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    if (error instanceof Error && (
      error.message === "Timesheet not found" ||
      error.message.endsWith("cannot be edited.") ||
      error.message.startsWith("Selected assignment")
    )) throw error;
    console.error("Failed to update timesheet entries:", error);
    throw new Error("Failed to update timesheet entries. Please try again.");
  }
}

export async function submitTimesheet(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
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
  } catch (error) {
    if (error instanceof Error && error.message === "Timesheet not found") throw error;
    console.error("Failed to submit timesheet:", error);
    throw new Error("Failed to submit timesheet. Please try again.");
  }
}

export async function approveTimesheetStep(id: string, stepId?: string, notes?: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id },
      include: {
        approvals: { orderBy: { stepOrder: "asc" } },
        entries: true,
      },
    });

    if (!timesheet) throw new Error("Timesheet not found");

    if (timesheet.entries.some((e) => e.status === "Rejected")) {
      throw new Error("Cannot approve a timesheet with a rejected day still outstanding.");
    }

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
          approvedBy: session.user.email || "staff",
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
            approvedBy: session.user.email || "staff",
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
          approvedBy: session.user.email || "staff",
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
  } catch (error) {
    if (error instanceof Error && (
      error.message === "Timesheet not found" ||
      error.message === "No pending approval step found" ||
      error.message.startsWith("Cannot approve")
    )) throw error;
    console.error("Failed to approve timesheet step:", error);
    throw new Error("Failed to approve timesheet. Please try again.");
  }
}

// Keep the simple approve/reject for backwards compatibility
export async function approveTimesheet(id: string) {
  return approveTimesheetStep(id);
}

/**
 * `formData` rather than a plain string because this is bound as a form action
 * (`rejectTimesheet.bind(null, id)`), so React passes the submitted FormData as
 * the second argument — a `reason: string` parameter would silently receive a
 * FormData object instead.
 */
export async function rejectTimesheet(id: string, formData?: FormData) {
  // Was a bare `auth()` + `session?.user` check while rejectTimesheetEntry
  // immediately below already used requireStaff() — the same inconsistency that
  // let a contractor reach the workflow pipeline in d0049a8.
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");

  const raw = formData?.get("rejectionReason");
  const reason = typeof raw === "string" && raw.trim() ? raw.trim() : null;

  try {
    await prisma.timesheet.update({
      where: { id },
      data: {
        status: "Rejected",
        rejectionReason: reason,
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
      newValue: reason ? `Rejected: ${reason}` : "Rejected",
    });

    await notifyTimesheetRejected(id, reason);

    revalidatePath(`/timesheets/${id}`);
    revalidatePath("/timesheets");
  } catch (error) {
    console.error("Failed to reject timesheet:", error);
    throw new Error("Failed to reject timesheet. Please try again.");
  }
}

export async function rejectTimesheetEntry(entryId: string, reason: string) {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");
  try {
    const entry = await prisma.timesheetEntry.findUnique({
      where: { id: entryId },
      include: { timesheet: true },
    });
    if (!entry) throw new Error("Timesheet entry not found");
    if (entry.timesheet.status !== "Submitted") {
      throw new Error(`Cannot reject a day on a timesheet with status "${entry.timesheet.status}".`);
    }

    await prisma.timesheetEntry.update({
      where: { id: entryId },
      data: { status: "Rejected", rejectionReason: reason },
    });

    await logTimesheetAudit({
      timesheetId: entry.timesheetId,
      action: "DayRejected",
      field: dayNames[entry.dayOfWeek],
      newValue: reason,
    });

    // After the write, so a mail failure cannot lose the rejection, and never
    // awaited for its result — the contractor being told is a courtesy on top
    // of the change, not a precondition for it.
    await notifyTimesheetEntryRejected(entry.timesheetId, entry.dayOfWeek, reason);

    revalidatePath(`/timesheets/${entry.timesheetId}`);
    revalidatePath(`/timesheets/${entry.timesheetId}/edit`);
  } catch (error) {
    if (error instanceof Error && (
      error.message === "Timesheet entry not found" ||
      error.message.startsWith("Cannot reject")
    )) throw error;
    console.error("Failed to reject timesheet entry:", error);
    throw new Error("Failed to reject timesheet entry. Please try again.");
  }
}

export async function markTimesheetEntryAbsent(entryId: string, reason: string, note?: string) {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");
  try {
    const entry = await prisma.timesheetEntry.findUnique({
      where: { id: entryId },
      include: { timesheet: { include: { entries: { orderBy: { dayOfWeek: "asc" } } } } },
    });
    if (!entry) throw new Error("Timesheet entry not found");

    const { timesheet } = entry;
    if (timesheet.status !== "Draft" && timesheet.status !== "Submitted") {
      throw new Error(`Cannot mark a day absent on a timesheet with status "${timesheet.status}".`);
    }
    if (entry.status === "Absent") return;

    const absenceReason = note?.trim() ? `${reason}: ${note.trim()}` : reason;
    const oldHours = entry.hours;

    // Recompute the whole week's overtime breakdown with this day zeroed out —
    // matches updateTimesheetEntries' approach so totals stay consistent with
    // the auto-overtime engine rather than being adjusted ad hoc.
    const newEntries = timesheet.entries.map((e) => ({
      dayOfWeek: e.dayOfWeek,
      hours: e.id === entryId ? 0 : e.hours,
      date: new Date(timesheet.weekStarting.getTime() + e.dayOfWeek * 86400000),
    }));
    const overtimeResult = calculateOvertime(newEntries, timesheet.weekStarting, DEFAULT_OVERTIME_CONFIG);

    await prisma.$transaction([
      prisma.timesheetEntry.update({
        where: { id: entryId },
        data: {
          status: "Absent",
          hours: 0,
          overtime: 0,
          absenceReason,
        },
      }),
      ...timesheet.entries
        .filter((e) => e.id !== entryId)
        .map((e) => {
          const dayBreakdown = overtimeResult.dailyBreakdown.find((b) => b.dayOfWeek === e.dayOfWeek);
          return prisma.timesheetEntry.update({
            where: { id: e.id },
            data: { overtime: dayBreakdown?.overtimeHours ?? e.overtime },
          });
        }),
      prisma.timesheet.update({
        where: { id: timesheet.id },
        data: {
          totalHours: overtimeResult.totalRegularHours + overtimeResult.totalOvertimeHours,
          overtimeHours: overtimeResult.totalOvertimeHours,
          isException: overtimeResult.exceptions.length > 0,
          exceptionReason: overtimeResult.exceptions.length > 0 ? overtimeResult.exceptions.join("; ") : null,
        },
      }),
    ]);

    await logTimesheetAudit({
      timesheetId: timesheet.id,
      action: "DayMarkedAbsent",
      field: dayNames[entry.dayOfWeek],
      oldValue: String(oldHours),
      newValue: absenceReason,
    });

    // Outside the $transaction above: this is the one action of the three that
    // actually removes hours and changes what the contractor is paid, so it is
    // the one they most need to hear about — but a mail failure must not roll
    // back the absence.
    // oldHours decides the wording: marking a day absent that never held any
    // hours does not move the weekly total, so that email must not claim the
    // contractor's pay changed.
    await notifyTimesheetEntryAbsent(timesheet.id, entry.dayOfWeek, absenceReason, oldHours);

    revalidatePath(`/timesheets/${timesheet.id}`);
    revalidatePath(`/timesheets/${timesheet.id}/edit`);
    revalidatePath("/timesheets");
  } catch (error) {
    if (error instanceof Error && (
      error.message === "Timesheet entry not found" ||
      error.message.startsWith("Cannot mark a day absent")
    )) throw error;
    console.error("Failed to mark day absent:", error);
    throw new Error("Failed to mark day absent. Please try again.");
  }
}

export async function reopenTimesheet(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
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
  } catch (error) {
    if (error instanceof Error && error.message === "Timesheet not found") throw error;
    console.error("Failed to reopen timesheet:", error);
    throw new Error("Failed to reopen timesheet. Please try again.");
  }
}
