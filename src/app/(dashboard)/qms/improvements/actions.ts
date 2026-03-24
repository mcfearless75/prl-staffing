"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createImprovement(formData: FormData) {
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

  redirect("/qms/improvements");
}

export async function updateImprovement(id: string, formData: FormData) {
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
}

export async function deleteImprovement(id: string) {
  await prisma.improvementItem.delete({
    where: { id },
  });

  redirect("/qms/improvements");
}
