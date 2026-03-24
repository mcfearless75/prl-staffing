"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createAudit(formData: FormData) {
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

  redirect("/qms/audits");
}

export async function updateAudit(id: string, formData: FormData) {
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
}

export async function deleteAudit(id: string) {
  await prisma.internalAudit.delete({ where: { id } });
  redirect("/qms/audits");
}

export async function addFinding(auditId: string, formData: FormData) {
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
}

export async function closeFinding(findingId: string) {
  const finding = await prisma.auditFinding.update({
    where: { id: findingId },
    data: { status: "Closed", closedDate: new Date() },
  });

  revalidatePath(`/qms/audits/${finding.auditId}`);
}
