"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createAudit(formData: FormData) {
  try {
    // Auto-generate audit number: IA-YYYY-NNN
    const year = new Date().getFullYear();
    const count = await prisma.internalAudit.count({
      where: { auditNumber: { startsWith: `IA-${year}-` } },
    });
    const auditNumber = `IA-${year}-${String(count + 1).padStart(3, "0")}`;

    await prisma.internalAudit.create({
      data: {
        auditNumber,
        title: formData.get("title") as string,
        scope: (formData.get("scope") as string) || null,
        auditDate: new Date(formData.get("auditDate") as string),
        leadAuditor: formData.get("leadAuditor") as string,
        auditTeam: (formData.get("auditTeam") as string) || null,
        isoClause: (formData.get("isoClause") as string) || null,
        status: (formData.get("status") as string) || "Planned",
      },
    });

    revalidatePath("/qms/audits");
    redirect("/qms/audits");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create audit:", error);
    throw new Error("Failed to create audit. Please try again.");
  }
}

export async function updateAudit(id: string, formData: FormData) {
  try {
    const completedDateRaw = formData.get("completedDate") as string;
    const nextAuditDateRaw = formData.get("nextAuditDate") as string;

    await prisma.internalAudit.update({
      where: { id },
      data: {
        title: formData.get("title") as string,
        scope: (formData.get("scope") as string) || null,
        auditDate: new Date(formData.get("auditDate") as string),
        leadAuditor: formData.get("leadAuditor") as string,
        auditTeam: (formData.get("auditTeam") as string) || null,
        isoClause: (formData.get("isoClause") as string) || null,
        status: (formData.get("status") as string) || "Planned",
        overallResult: (formData.get("overallResult") as string) || null,
        summary: (formData.get("summary") as string) || null,
        completedDate: completedDateRaw ? new Date(completedDateRaw) : null,
        nextAuditDate: nextAuditDateRaw ? new Date(nextAuditDateRaw) : null,
      },
    });

    revalidatePath(`/qms/audits/${id}`);
    redirect(`/qms/audits/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to update audit:", error);
    throw new Error("Failed to update audit. Please try again.");
  }
}

export async function deleteAudit(id: string) {
  try {
    await prisma.internalAudit.delete({ where: { id } });
    revalidatePath("/qms/audits");
    redirect("/qms/audits");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete audit:", error);
    throw new Error("Failed to delete audit. Please try again.");
  }
}

export async function addFinding(auditId: string, formData: FormData) {
  try {
    const lastFinding = await prisma.auditFinding.findFirst({
      where: { auditId },
      orderBy: { findingNumber: "desc" },
    });
    const findingNumber = (lastFinding?.findingNumber ?? 0) + 1;

    const targetDateRaw = formData.get("targetDate") as string;

    await prisma.auditFinding.create({
      data: {
        auditId,
        findingNumber,
        type: formData.get("type") as string,
        isoClause: (formData.get("isoClause") as string) || null,
        description: formData.get("description") as string,
        evidence: (formData.get("evidence") as string) || null,
        correctiveAction: (formData.get("correctiveAction") as string) || null,
        assignedTo: (formData.get("assignedTo") as string) || null,
        targetDate: targetDateRaw ? new Date(targetDateRaw) : null,
      },
    });

    revalidatePath(`/qms/audits/${auditId}`);
  } catch (error) {
    console.error("Failed to add finding:", error);
    throw new Error("Failed to add finding. Please try again.");
  }
}

export async function closeFinding(findingId: string) {
  try {
    const finding = await prisma.auditFinding.update({
      where: { id: findingId },
      data: { status: "Closed", closedDate: new Date() },
    });

    revalidatePath(`/qms/audits/${finding.auditId}`);
  } catch (error) {
    console.error("Failed to close finding:", error);
    throw new Error("Failed to close finding. Please try again.");
  }
}
