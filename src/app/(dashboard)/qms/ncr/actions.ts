"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

function isUniqueConstraintError(error: unknown, field: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002" &&
    !!(error as { meta?: { target?: string[] } }).meta?.target?.includes(field)
  );
}

// Resilient to deletions: looks at the highest existing NCR number rather than
// counting rows, so a deleted mid-sequence record can never cause a collision.
async function nextNcrNumber(): Promise<string> {
  const existing = await prisma.nonConformance.findMany({
    select: { ncrNumber: true },
  });
  const maxNum = existing.reduce((max, r) => {
    const match = r.ncrNumber.match(/^NCR-(\d+)$/);
    const n = match ? parseInt(match[1], 10) : 0;
    return n > max ? n : max;
  }, 0);
  return `NCR-${String(maxNum + 1).padStart(3, "0")}`;
}

export async function createNCR(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const targetDateRaw = formData.get("targetDate") as string;
    const data = {
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
    };

    // Two attempts: if a concurrent create takes the computed number first,
    // re-fetch the max and retry once rather than failing outright.
    for (let attempt = 0; attempt < 2; attempt++) {
      const ncrNumber = await nextNcrNumber();
      try {
        await prisma.nonConformance.create({ data: { ncrNumber, ...data } });
        break;
      } catch (createError) {
        if (attempt === 0 && isUniqueConstraintError(createError, "ncrNumber")) {
          continue;
        }
        throw createError;
      }
    }

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
  const session = await auth();
  if (!session?.user) redirect("/login");
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
  const session = await auth();
  if (!session?.user) redirect("/login");
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
  const session = await auth();
  if (!session?.user) redirect("/login");
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
  const session = await auth();
  if (!session?.user) redirect("/login");
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
