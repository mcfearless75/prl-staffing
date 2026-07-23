"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function createAssignment(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const contractorId = formData.get("contractorId") as string;
    const companyId = formData.get("companyId") as string;
    const role = formData.get("role") as string;
    const location = formData.get("location") as string;
    const startDate = new Date(formData.get("startDate") as string);
    const endDateRaw = formData.get("endDate") as string;
    const endDate = endDateRaw ? new Date(endDateRaw) : null;
    const status = formData.get("status") as string;
    const poNumber = formData.get("poNumber") as string;
    const notes = formData.get("notes") as string;

    const siteId = (formData.get("siteId") as string) || null;
    const departmentId = (formData.get("departmentId") as string) || null;

    await prisma.assignment.create({
      data: {
        contractorId,
        companyId,
        siteId,
        departmentId,
        role,
        location,
        startDate,
        endDate,
        status,
        poNumber,
        notes,
      },
    });

    revalidatePath("/assignments");
    revalidatePath(`/contractors/${contractorId}`);
    redirect("/assignments");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create assignment:", error);
    throw new Error("Failed to create assignment. Please try again.");
  }
}

export async function updateAssignment(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const contractorId = formData.get("contractorId") as string;
    const companyId = formData.get("companyId") as string;
    const role = formData.get("role") as string;
    const location = formData.get("location") as string;
    const startDate = new Date(formData.get("startDate") as string);
    const endDateRaw = formData.get("endDate") as string;
    const endDate = endDateRaw ? new Date(endDateRaw) : null;
    const status = formData.get("status") as string;
    const poNumber = formData.get("poNumber") as string;
    const notes = formData.get("notes") as string;

    const siteId = (formData.get("siteId") as string) || null;
    const departmentId = (formData.get("departmentId") as string) || null;

    await prisma.assignment.update({
      where: { id },
      data: {
        contractorId,
        companyId,
        siteId,
        departmentId,
        role,
        location,
        startDate,
        endDate,
        status,
        poNumber,
        notes,
      },
    });

    revalidatePath("/assignments");
    revalidatePath(`/assignments/${id}`);
    revalidatePath(`/contractors/${contractorId}`);
    redirect(`/assignments/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to update assignment:", error);
    throw new Error("Failed to update assignment. Please try again.");
  }
}

export async function updateAssignmentStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const validStatuses = ["Placed", "Active", "Ending", "Completed"];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/assignments");
    revalidatePath(`/assignments/${id}`);
    revalidatePath(`/contractors/${updated.contractorId}`);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid status") throw error;
    console.error("Failed to update assignment status:", error);
    throw new Error("Failed to update assignment status. Please try again.");
  }
}

export async function deleteAssignment(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const deleted = await prisma.assignment.delete({
      where: { id },
    });

    revalidatePath("/assignments");
    revalidatePath(`/contractors/${deleted.contractorId}`);
    redirect("/assignments");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete assignment:", error);
    throw new Error("Failed to delete assignment. Please try again.");
  }
}
