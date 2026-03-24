"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function calculateRiskLevel(score: number): string {
  if (score >= 16) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

export async function createRisk(formData: FormData) {
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

  redirect("/qms/risk-register");
}

export async function updateRisk(id: string, formData: FormData) {
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
}

export async function deleteRisk(id: string) {
  await prisma.risk.delete({ where: { id } });
  redirect("/qms/risk-register");
}

export async function reviewRisk(id: string) {
  await prisma.risk.update({
    where: { id },
    data: {
      lastReviewedAt: new Date(),
      lastReviewedBy: "System", // Replace with actual user when auth context available
    },
  });

  revalidatePath(`/qms/risk-register/${id}`);
  revalidatePath("/qms/risk-register");
}
