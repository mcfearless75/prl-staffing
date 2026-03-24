"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createImprovement(formData: FormData) {
  try {
    await prisma.improvementItem.create({
      data: {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        submittedBy: formData.get("submittedBy") as string,
        source: formData.get("source") as string,
        category: formData.get("category") as string || null,
        priority: formData.get("priority") as string || "Medium",
        assignedTo: formData.get("assignedTo") as string || null,
        status: "Proposed",
      },
    });

    revalidatePath("/qms/improvements");
    redirect("/qms/improvements");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create improvement:", error);
    throw new Error("Failed to create improvement. Please try again.");
  }
}

export async function updateImprovement(id: string, formData: FormData) {
  try {
    await prisma.improvementItem.update({
      where: { id },
      data: {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        source: formData.get("source") as string,
        category: formData.get("category") as string || null,
        priority: formData.get("priority") as string || "Medium",
        assignedTo: formData.get("assignedTo") as string || null,
        status: formData.get("status") as string || "Proposed",
        outcome: formData.get("outcome") as string || null,
        completedDate: (formData.get("status") as string) === "Completed" ? new Date() : null,
      },
    });

    revalidatePath("/qms/improvements");
    redirect("/qms/improvements");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to update improvement:", error);
    throw new Error("Failed to update improvement. Please try again.");
  }
}

export async function deleteImprovement(id: string) {
  try {
    await prisma.improvementItem.delete({
      where: { id },
    });

    revalidatePath("/qms/improvements");
    redirect("/qms/improvements");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete improvement:", error);
    throw new Error("Failed to delete improvement. Please try again.");
  }
}
