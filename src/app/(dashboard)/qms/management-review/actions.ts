"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function getQuarter(date: Date): string {
  const month = date.getMonth();
  if (month < 3) return "Q1";
  if (month < 6) return "Q2";
  if (month < 9) return "Q3";
  return "Q4";
}

export async function createReview(formData: FormData) {
  try {
    const reviewDate = new Date(formData.get("reviewDate") as string);
    const year = reviewDate.getFullYear();
    const quarter = getQuarter(reviewDate);

    // Check for existing reviews in same quarter to avoid duplicates
    const existing = await prisma.managementReview.findMany({
      where: { reviewNumber: { startsWith: `MR-${year}-${quarter}` } },
    });
    const suffix = existing.length > 0 ? `-${existing.length + 1}` : "";
    const reviewNumber = `MR-${year}-${quarter}${suffix}`;

    const review = await prisma.managementReview.create({
      data: {
        reviewNumber,
        title: formData.get("title") as string,
        reviewDate,
        chairperson: formData.get("chairperson") as string,
        attendees: formData.get("attendees") as string || null,
        status: "Scheduled",
      },
    });

    revalidatePath("/qms/management-review");
    redirect(`/qms/management-review/${review.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create review:", error);
    throw new Error("Failed to create review. Please try again.");
  }
}

export async function updateReview(id: string, formData: FormData) {
  try {
    await prisma.managementReview.update({
      where: { id },
      data: {
        minutes: formData.get("minutes") as string || null,
        decisions: formData.get("decisions") as string || null,
        actions: formData.get("actions") as string || null,
        status: "In Progress",
      },
    });

    revalidatePath(`/qms/management-review/${id}`);
    redirect(`/qms/management-review/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to update review:", error);
    throw new Error("Failed to update review. Please try again.");
  }
}

export async function completeReview(id: string) {
  try {
    await prisma.managementReview.update({
      where: { id },
      data: {
        status: "Completed",
        completedAt: new Date(),
      },
    });

    revalidatePath(`/qms/management-review/${id}`);
    redirect(`/qms/management-review/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to complete review:", error);
    throw new Error("Failed to complete review. Please try again.");
  }
}

export async function deleteReview(id: string) {
  try {
    await prisma.managementReview.delete({
      where: { id },
    });

    revalidatePath("/qms/management-review");
    redirect("/qms/management-review");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete review:", error);
    throw new Error("Failed to delete review. Please try again.");
  }
}
