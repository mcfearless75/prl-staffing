"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createNCR(formData: FormData) {
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

  redirect("/qms/ncr");
}

export async function updateNCR(id: string, formData: FormData) {
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
}

export async function deleteNCR(id: string) {
  await prisma.nonConformance.delete({
    where: { id },
  });

  redirect("/qms/ncr");
}

export async function closeNCR(id: string) {
  await prisma.nonConformance.update({
    where: { id },
    data: {
      status: "Closed",
      closedDate: new Date(),
    },
  });

  revalidatePath(`/qms/ncr/${id}`);
  redirect(`/qms/ncr/${id}`);
}

export async function verifyNCR(id: string) {
  await prisma.nonConformance.update({
    where: { id },
    data: {
      status: "Closed",
      verifiedDate: new Date(),
    },
  });

  revalidatePath(`/qms/ncr/${id}`);
  redirect(`/qms/ncr/${id}`);
}
