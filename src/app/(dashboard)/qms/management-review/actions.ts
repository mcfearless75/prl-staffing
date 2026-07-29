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

function getQuarter(date: Date): string {
  const month = date.getMonth();
  if (month < 3) return "Q1";
  if (month < 6) return "Q2";
  if (month < 9) return "Q3";
  return "Q4";
}

// Resilient to deletions: looks at the highest existing review number for the
// quarter rather than counting rows, so a deleted mid-sequence record can never
// cause a collision. The first review of a quarter carries no numeric suffix,
// so an unsuffixed number counts as 1.
async function nextReviewNumber(year: number, quarter: string): Promise<string> {
  const prefix = `MR-${year}-${quarter}`;
  const existing = await prisma.managementReview.findMany({
    where: { reviewNumber: { startsWith: prefix } },
    select: { reviewNumber: true },
  });
  const maxNum = existing.reduce((max, r) => {
    const match = r.reviewNumber.match(/^MR-\d{4}-Q\d(?:-(\d+))?$/);
    if (!match) return max;
    const n = match[1] ? parseInt(match[1], 10) : 1;
    return n > max ? n : max;
  }, 0);
  const next = maxNum + 1;
  return next > 1 ? `${prefix}-${next}` : prefix;
}

export async function createReview(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const reviewDate = new Date(formData.get("reviewDate") as string);
    const year = reviewDate.getFullYear();
    const quarter = getQuarter(reviewDate);

    const data = {
      title: formData.get("title") as string,
      reviewDate,
      chairperson: formData.get("chairperson") as string,
      attendees: formData.get("attendees") as string || null,
      status: "Scheduled",
    };

    // Three attempts: if a concurrent create takes the computed number first,
    // re-fetch the max and retry rather than failing outright.
    let reviewId = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const reviewNumber = await nextReviewNumber(year, quarter);
      try {
        const review = await prisma.managementReview.create({
          data: { reviewNumber, ...data },
        });
        reviewId = review.id;
        break;
      } catch (createError) {
        if (attempt < 2 && isUniqueConstraintError(createError, "reviewNumber")) {
          continue;
        }
        throw createError;
      }
    }

    revalidatePath("/qms/management-review");
    redirect(`/qms/management-review/${reviewId}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create review:", error);
    throw new Error("Failed to create review. Please try again.");
  }
}

export async function updateReview(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
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
  const session = await auth();
  if (!session?.user) redirect("/login");
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
  const session = await auth();
  if (!session?.user) redirect("/login");
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
