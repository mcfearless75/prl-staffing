"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";

export async function approveExpense(id: string) {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");
  try {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new Error("Expense not found");
    if (expense.status !== "Pending") {
      throw new Error(`Cannot approve an expense with status "${expense.status}".`);
    }

    await prisma.expense.update({
      where: { id },
      data: {
        status: "Approved",
        reviewedBy: guard.session.user.email || "staff",
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });

    await logActivity("Approved Expense", "Expense", id, `Approved by ${guard.session.user.email || "staff"}`);

    revalidatePath(`/expenses/${id}`);
    revalidatePath("/expenses");
  } catch (error) {
    if (error instanceof Error && (
      error.message === "Expense not found" ||
      error.message.startsWith("Cannot approve")
    )) throw error;
    console.error("Failed to approve expense:", error);
    throw new Error("Failed to approve expense. Please try again.");
  }
}

export async function rejectExpense(id: string, reason: string) {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");
  try {
    if (!reason || !reason.trim()) {
      throw new Error("A rejection reason is required.");
    }

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new Error("Expense not found");
    if (expense.status !== "Pending") {
      throw new Error(`Cannot reject an expense with status "${expense.status}".`);
    }

    await prisma.expense.update({
      where: { id },
      data: {
        status: "Rejected",
        reviewedBy: guard.session.user.email || "staff",
        reviewedAt: new Date(),
        rejectionReason: reason.trim(),
      },
    });

    await logActivity("Rejected Expense", "Expense", id, reason.trim());

    revalidatePath(`/expenses/${id}`);
    revalidatePath("/expenses");
  } catch (error) {
    if (error instanceof Error && (
      error.message === "Expense not found" ||
      error.message.startsWith("Cannot reject") ||
      error.message === "A rejection reason is required."
    )) throw error;
    console.error("Failed to reject expense:", error);
    throw new Error("Failed to reject expense. Please try again.");
  }
}
