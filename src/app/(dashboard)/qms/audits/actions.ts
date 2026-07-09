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

// Resilient to deletions: looks at the highest existing audit number for the
// year rather than counting rows, so a deleted mid-sequence record can never
// cause a collision.
async function nextAuditNumber(year: number): Promise<string> {
  const prefix = `IA-${year}-`;
  const existing = await prisma.internalAudit.findMany({
    where: { auditNumber: { startsWith: prefix } },
    select: { auditNumber: true },
  });
  const maxNum = existing.reduce((max, r) => {
    const match = r.auditNumber.match(/^IA-\d{4}-(\d+)$/);
    const n = match ? parseInt(match[1], 10) : 0;
    return n > max ? n : max;
  }, 0);
  return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
}

export async function createAudit(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const year = new Date().getFullYear();
    const data = {
      title: formData.get("title") as string,
      scope: (formData.get("scope") as string) || null,
      auditDate: new Date(formData.get("auditDate") as string),
      leadAuditor: formData.get("leadAuditor") as string,
      auditTeam: (formData.get("auditTeam") as string) || null,
      isoClause: (formData.get("isoClause") as string) || null,
      status: (formData.get("status") as string) || "Planned",
    };

    // Two attempts: if a concurrent create takes the computed number first,
    // re-fetch the max and retry once rather than failing outright.
    for (let attempt = 0; attempt < 2; attempt++) {
      const auditNumber = await nextAuditNumber(year);
      try {
        await prisma.internalAudit.create({ data: { auditNumber, ...data } });
        break;
      } catch (createError) {
        if (attempt === 0 && isUniqueConstraintError(createError, "auditNumber")) {
          continue;
        }
        throw createError;
      }
    }

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
  const session = await auth();
  if (!session?.user) redirect("/login");
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
  const session = await auth();
  if (!session?.user) redirect("/login");
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
  const session = await auth();
  if (!session?.user) redirect("/login");
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
  const session = await auth();
  if (!session?.user) redirect("/login");
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
