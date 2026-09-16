import { prisma } from "@/lib/db";
import { requireContractor } from "@/lib/require-staff";
import { NextResponse } from "next/server";
import { calculateOvertime, DEFAULT_OVERTIME_CONFIG } from "@/lib/overtime-calculator";
import { calculateProfessionalHours } from "@/lib/professional-hours";

type DayInput = {
  dayOfWeek: number;
  assignmentId?: string | null;
  startTime?: string | null;
  finishTime?: string | null;
  hours?: number;
};

export async function POST(request: Request) {
  try {
    const guard = await requireContractor();
    if (!guard.ok) {
      return NextResponse.json({ error: "Not authenticated" }, { status: guard.reason === "forbidden" ? 403 : 401 });
    }
    const { contractorId } = guard;

    const body = await request.json();
    const { weekStarting, notes } = body as { weekStarting?: string; notes?: string };

    if (!weekStarting) {
      return NextResponse.json({ error: "Missing week starting date" }, { status: 400 });
    }

    // Accept the new per-day shape; fall back to the legacy { assignmentId, hours[] }
    // shape in case a cached client posts the old form before it refreshes.
    let days: DayInput[];
    if (Array.isArray(body.days)) {
      days = body.days as DayInput[];
    } else if (Array.isArray(body.hours)) {
      const legacyAssignmentId = body.assignmentId as string | undefined;
      days = (body.hours as number[]).map((h, i) => ({
        dayOfWeek: i,
        assignmentId: legacyAssignmentId ?? null,
        hours: h,
      }));
    } else {
      return NextResponse.json({ error: "Missing daily entries" }, { status: 400 });
    }

    // Resolve each day's hours: derive from start/finish when both are present
    // (authoritative — never trust client-side maths for payroll), else use the
    // supplied number.
    const resolvedDays = days.map((d) => {
      const derived = calculateProfessionalHours(d.startTime, d.finishTime);
      const hours = derived !== null ? derived : Number(d.hours) || 0;
      return {
        dayOfWeek: d.dayOfWeek,
        assignmentId: d.assignmentId || null,
        startTime: d.startTime || null,
        finishTime: d.finishTime || null,
        hours,
      };
    });

    // Verify every referenced assignment belongs to this contractor.
    const referencedIds = [...new Set(resolvedDays.map((d) => d.assignmentId).filter(Boolean) as string[])];
    if (referencedIds.length === 0) {
      return NextResponse.json({ error: "Select a site for at least one day" }, { status: 400 });
    }
    const ownedAssignments = await prisma.assignment.findMany({
      where: { id: { in: referencedIds }, contractorId },
      select: { id: true },
    });
    const ownedIds = new Set(ownedAssignments.map((a) => a.id));
    if (referencedIds.some((id) => !ownedIds.has(id))) {
      return NextResponse.json({ error: "One or more selected sites are not assigned to you" }, { status: 403 });
    }

    // One timesheet per contractor per week (matches the staff-side guard).
    const existing = await prisma.timesheet.findFirst({
      where: { contractorId, weekStarting: new Date(weekStarting) },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already have a timesheet for this week" },
        { status: 409 }
      );
    }

    // Overtime engine (same as staff timesheets).
    const weekStart = new Date(weekStarting);
    const overtimeResult = calculateOvertime(
      resolvedDays.map((d) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + d.dayOfWeek);
        return { dayOfWeek: d.dayOfWeek, hours: d.hours, date };
      }),
      weekStart,
      DEFAULT_OVERTIME_CONFIG
    );
    const totalHours = resolvedDays.reduce((sum, d) => sum + d.hours, 0);

    // Representative assignment for the timesheet header / approval-chain lookup:
    // first day that has one.
    const representativeAssignmentId =
      resolvedDays.find((d) => d.assignmentId)?.assignmentId ?? null;

    const timesheet = await prisma.timesheet.create({
      data: {
        contractorId,
        assignmentId: representativeAssignmentId,
        weekStarting: new Date(weekStarting),
        totalHours,
        overtimeHours: overtimeResult.totalOvertimeHours,
        notes: notes || null,
        status: "Submitted",
        submittedAt: new Date(),
        entries: {
          create: resolvedDays.map((d) => {
            const breakdown = overtimeResult.dailyBreakdown.find((b) => b.dayOfWeek === d.dayOfWeek);
            return {
              dayOfWeek: d.dayOfWeek,
              hours: d.hours,
              overtime: breakdown?.overtimeHours ?? 0,
              startTime: d.startTime,
              finishTime: d.finishTime,
              assignmentId: d.assignmentId,
            };
          }),
        },
      },
    });

    return NextResponse.json({ success: true, id: timesheet.id });
  } catch (error) {
    console.error("Portal timesheet creation error:", error);
    return NextResponse.json({ error: "Failed to create timesheet" }, { status: 500 });
  }
}
