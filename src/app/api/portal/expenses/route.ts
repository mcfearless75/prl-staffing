import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";

const VALID_CATEGORIES = ["Travel", "Accommodation", "Materials", "Other"];

export async function POST(request: Request) {
  try {
    const session = await auth();
    const contractorId = (session?.user as { contractorId?: string })?.contractorId;

    if (!contractorId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      date,
      category,
      description,
      amount,
      assignmentId,
      receiptDocumentId,
    } = body as {
      date?: string;
      category?: string;
      description?: string;
      amount?: number;
      assignmentId?: string | null;
      receiptDocumentId?: string | null;
    };

    if (!date) {
      return NextResponse.json({ error: "Missing date" }, { status: 400 });
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }

    // Verify the assignment (if provided) belongs to this contractor.
    if (assignmentId) {
      const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
      if (!assignment || assignment.contractorId !== contractorId) {
        return NextResponse.json(
          { error: "Selected assignment does not belong to you" },
          { status: 403 }
        );
      }
    }

    // Verify the receipt document (if provided) belongs to this contractor.
    if (receiptDocumentId) {
      const document = await prisma.document.findUnique({ where: { id: receiptDocumentId } });
      if (!document || document.contractorId !== contractorId) {
        return NextResponse.json(
          { error: "Selected receipt does not belong to you" },
          { status: 403 }
        );
      }
    }

    const expense = await prisma.expense.create({
      data: {
        contractorId,
        assignmentId: assignmentId || undefined,
        date: new Date(date),
        category,
        description: description.trim(),
        amount: parsedAmount,
        receiptDocumentId: receiptDocumentId || undefined,
        status: "Pending",
      },
    });

    await logActivity("Created Expense", "Expense", expense.id, "Contractor self-service");

    return NextResponse.json({ success: true, id: expense.id });
  } catch (error) {
    console.error("Portal expense creation error:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

// List the authenticated contractor's own expenses.
export async function GET(request: Request) {
  try {
    const session = await auth();
    const contractorId = (session?.user as { contractorId?: string })?.contractorId;

    if (!contractorId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const expenses = await prisma.expense.findMany({
      where: {
        contractorId,
        ...(status ? { status } : {}),
      },
      include: {
        assignment: { include: { company: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("Portal expense fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}
