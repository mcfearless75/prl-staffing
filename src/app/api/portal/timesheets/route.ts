import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { calculateOvertime, DEFAULT_OVERTIME_CONFIG } from "@/lib/overtime-calculator";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const contractorId = (session?.user as { contractorId?: string })?.contractorId;

    if (!contractorId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { assignmentId, weekStarting, hours, notes } = body;

    if (!assignmentId || !weekStarting || !hours || !Array.isArray(hours)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the assignment belongs to this contractor
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, contractorId },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Calculate totals using proper overtime engine (same as staff timesheets)
    const weekStart = new Date(weekStarting);
    const dayEntries = hours.map((h: number, i: number) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return { dayOfWeek: i, hours: h, date };
    });
    const overtimeResult = calculateOvertime(dayEntries, weekStart, DEFAULT_OVERTIME_CONFIG);
    const totalHours = dayEntries.reduce((sum, d) => sum + d.hours, 0);
    const overtimeHours = overtimeResult.totalOvertimeHours;

    // Check for existing timesheet this week
    const existing = await prisma.timesheet.findFirst({
      where: {
        contractorId,
        assignmentId,
        weekStarting: new Date(weekStarting),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A timesheet already exists for this assignment and week" },
        { status: 409 }
      );
    }

    // Create timesheet with daily entries
    const timesheet = await prisma.timesheet.create({
      data: {
        contractorId,
        assignmentId,
        weekStarting: new Date(weekStarting),
        totalHours,
        overtimeHours,
        notes: notes || null,
        status: "Submitted",
        submittedAt: new Date(),
        entries: {
          create: overtimeResult.dailyBreakdown.map((d) => ({
            dayOfWeek: d.dayOfWeek,
            hours: d.regularHours + d.overtimeHours,
            overtime: d.overtimeHours,
            isBankHoliday: d.isBankHoliday,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, id: timesheet.id });
  } catch (error) {
    console.error("Portal timesheet creation error:", error);
    return NextResponse.json({ error: "Failed to create timesheet" }, { status: 500 });
  }
}
