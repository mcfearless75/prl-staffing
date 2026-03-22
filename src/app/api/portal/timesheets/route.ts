import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

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

    // Calculate totals
    const totalHours = hours.reduce((sum: number, h: number) => sum + h, 0);
    const overtimeHours = Math.max(0, totalHours - 40);

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
          create: hours.map((h: number, i: number) => ({
            dayOfWeek: i, // 0=Mon, 1=Tue, ... 6=Sun
            hours: h,
            overtime: i >= 5 ? h : 0, // Weekend hours as overtime
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
