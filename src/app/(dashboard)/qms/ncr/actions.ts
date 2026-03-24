"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createNCR(formData: FormData) {
  try {
    const count = await prisma.nonConformance.count();
    const ncrNumber = `NCR-${String(count + 1).padStart(3, "0")}`;

    const targetDateRaw = formData.get("targetDate") as string;

    await prisma.nonConformance.create({
      data: {
        ncrNumber,
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        category: formData.get("category") as string,
        severity: formData.get("severity") as string,
        source: formData.get("source") as string,
        raisedBy: formData.get("raisedBy") as string,
        assignedTo: (formData.get("assignedTo") as string) || null,
        targetDate: targetDateRaw ? new Date(targetDateRaw) : null,
        rootCause: (formData.get("rootCause") as string) || null,
        correctiveAction: (formData.get("correctiveAction") as string) || null,
        preventiveAction: (formData.get("preventiveAction") as string) || null,
        status: "Open",
      },
    });

    revalidatePath("/qms/ncr");
    redirect("/qms/ncr");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create NCR:", error);
    throw new Error("Failed to create NCR. Please try again.");
  }
}

export async function updateNCR(id: string, formData: FormData) {
  try {
    const targetDateRaw = formData.get("targetDate") as string;

    await prisma.nonConformance.update({
      where: { id },
      data: {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        category: formData.get("category") as string,
        severity: formData.get("severity") as string,
        source: formData.get("source") as string,
        raisedBy: formData.get("raisedBy") as string,
        assignedTo: (formData.get("assignedTo") as string) || null,
        targetDate: targetDateRaw ? new Date(targetDateRaw) : null,
        rootCause: (formData.get("rootCause") as string) || null,
        correctiveAction: (formData.get("correctiveAction") as string) || null,
        preventiveAction: (formData.get("preventiveAction") as string) || null,
        status: formData.get("status") as string,
      },
    });

    revalidatePath(`/qms/ncr/${id}`);
    redirect(`/qms/ncr/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to update NCR:", error);
    throw new Error("Failed to update NCR. Please try again.");
  }
}

export async function deleteNCR(id: string) {
  try {
    await prisma.nonConformance.delete({
      where: { id },
    });

    revalidatePath("/qms/ncr");
    redirect("/qms/ncr");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete NCR:", error);
    throw new Error("Failed to delete NCR. Please try again.");
  }
}

export async function closeNCR(id: string) {
  try {
    await prisma.nonConformance.update({
      where: { id },
      data: {
        status: "Closed",
        closedDate: new Date(),
      },
    });

    revalidatePath(`/qms/ncr/${id}`);
    redirect(`/qms/ncr/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to close NCR:", error);
    throw new Error("Failed to close NCR. Please try again.");
  }
}

export async function verifyNCR(id: string) {
  try {
    await prisma.nonConformance.update({
      where: { id },
      data: {
        status: "Closed",
        verifiedDate: new Date(),
      },
    });

    revalidatePath(`/qms/ncr/${id}`);
    redirect(`/qms/ncr/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to verify NCR:", error);
    throw new Error("Failed to verify NCR. Please try again.");
  }
}
