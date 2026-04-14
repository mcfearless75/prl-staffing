"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

function calculateRiskLevel(score: number): string {
  if (score >= 16) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

export async function createRisk(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    // Auto-generate risk number: RISK-NNN
    const count = await prisma.risk.count();
    const riskNumber = `RISK-${String(count + 1).padStart(3, "0")}`;

    const likelihood = parseInt(formData.get("likelihood") as string) || 3;
    const impact = parseInt(formData.get("impact") as string) || 3;
    const riskScore = likelihood * impact;
    const riskLevel = calculateRiskLevel(riskScore);

    const targetDateRaw = formData.get("targetDate") as string;
    const reviewDateRaw = formData.get("reviewDate") as string;

    await prisma.risk.create({
      data: {
        riskNumber,
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        category: formData.get("category") as string,
        likelihood,
        impact,
        riskScore,
        riskLevel,
        owner: formData.get("owner") as string,
        existingControls: (formData.get("existingControls") as string) || null,
        additionalActions: (formData.get("additionalActions") as string) || null,
        targetDate: targetDateRaw ? new Date(targetDateRaw) : null,
        reviewDate: reviewDateRaw ? new Date(reviewDateRaw) : null,
        status: (formData.get("status") as string) || "Active",
      },
    });

    revalidatePath("/qms/risk-register");
    redirect("/qms/risk-register");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create risk:", error);
    throw new Error("Failed to create risk. Please try again.");
  }
}

export async function updateRisk(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const likelihood = parseInt(formData.get("likelihood") as string) || 3;
    const impact = parseInt(formData.get("impact") as string) || 3;
    const riskScore = likelihood * impact;
    const riskLevel = calculateRiskLevel(riskScore);

    const targetDateRaw = formData.get("targetDate") as string;
    const reviewDateRaw = formData.get("reviewDate") as string;

    await prisma.risk.update({
      where: { id },
      data: {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        category: formData.get("category") as string,
        likelihood,
        impact,
        riskScore,
        riskLevel,
        owner: formData.get("owner") as string,
        existingControls: (formData.get("existingControls") as string) || null,
        additionalActions: (formData.get("additionalActions") as string) || null,
        targetDate: targetDateRaw ? new Date(targetDateRaw) : null,
        reviewDate: reviewDateRaw ? new Date(reviewDateRaw) : null,
        status: (formData.get("status") as string) || "Active",
      },
    });

    revalidatePath(`/qms/risk-register/${id}`);
    redirect(`/qms/risk-register/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to update risk:", error);
    throw new Error("Failed to update risk. Please try again.");
  }
}

export async function deleteRisk(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    await prisma.risk.delete({ where: { id } });
    revalidatePath("/qms/risk-register");
    redirect("/qms/risk-register");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete risk:", error);
    throw new Error("Failed to delete risk. Please try again.");
  }
}

export async function reviewRisk(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    await prisma.risk.update({
      where: { id },
      data: {
        lastReviewedAt: new Date(),
        lastReviewedBy: "System", // Replace with actual user when auth context available
      },
    });

    revalidatePath(`/qms/risk-register/${id}`);
    revalidatePath("/qms/risk-register");
  } catch (error) {
    console.error("Failed to review risk:", error);
    throw new Error("Failed to review risk. Please try again.");
  }
}
