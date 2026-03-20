"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createComplianceRecord(formData: FormData) {
  const contractorId = formData.get("contractorId") as string;
  const type = formData.get("type") as string;
  const documentName = formData.get("documentName") as string;
  const reference = formData.get("reference") as string;
  const issueDateRaw = formData.get("issueDate") as string;
  const expiryDateRaw = formData.get("expiryDate") as string;
  const status = formData.get("status") as string;
  const notes = formData.get("notes") as string;

  await prisma.complianceRecord.create({
    data: {
      contractorId,
      type,
      documentName,
      reference,
      issueDate: issueDateRaw ? new Date(issueDateRaw) : null,
      expiryDate: expiryDateRaw ? new Date(expiryDateRaw) : null,
      status,
      notes,
    },
  });

  redirect("/compliance");
}

export async function updateComplianceRecord(id: string, formData: FormData) {
  const contractorId = formData.get("contractorId") as string;
  const type = formData.get("type") as string;
  const documentName = formData.get("documentName") as string;
  const reference = formData.get("reference") as string;
  const issueDateRaw = formData.get("issueDate") as string;
  const expiryDateRaw = formData.get("expiryDate") as string;
  const status = formData.get("status") as string;
  const notes = formData.get("notes") as string;

  await prisma.complianceRecord.update({
    where: { id },
    data: {
      contractorId,
      type,
      documentName,
      reference,
      issueDate: issueDateRaw ? new Date(issueDateRaw) : null,
      expiryDate: expiryDateRaw ? new Date(expiryDateRaw) : null,
      status,
      notes,
    },
  });

  revalidatePath(`/compliance/${id}`);
  redirect(`/compliance/${id}`);
}

export async function deleteComplianceRecord(id: string) {
  await prisma.complianceRecord.delete({
    where: { id },
  });

  redirect("/compliance");
}
