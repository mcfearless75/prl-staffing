"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createAssignment(formData: FormData) {
  const contractorId = formData.get("contractorId") as string;
  const companyId = formData.get("companyId") as string;
  const role = formData.get("role") as string;
  const location = formData.get("location") as string;
  const startDate = new Date(formData.get("startDate") as string);
  const endDateRaw = formData.get("endDate") as string;
  const endDate = endDateRaw ? new Date(endDateRaw) : null;
  const status = formData.get("status") as string;
  const poNumber = formData.get("poNumber") as string;
  const notes = formData.get("notes") as string;

  await prisma.assignment.create({
    data: {
      contractorId,
      companyId,
      role,
      location,
      startDate,
      endDate,
      status,
      poNumber,
      notes,
    },
  });

  redirect("/assignments");
}

export async function updateAssignment(id: string, formData: FormData) {
  const contractorId = formData.get("contractorId") as string;
  const companyId = formData.get("companyId") as string;
  const role = formData.get("role") as string;
  const location = formData.get("location") as string;
  const startDate = new Date(formData.get("startDate") as string);
  const endDateRaw = formData.get("endDate") as string;
  const endDate = endDateRaw ? new Date(endDateRaw) : null;
  const status = formData.get("status") as string;
  const poNumber = formData.get("poNumber") as string;
  const notes = formData.get("notes") as string;

  await prisma.assignment.update({
    where: { id },
    data: {
      contractorId,
      companyId,
      role,
      location,
      startDate,
      endDate,
      status,
      poNumber,
      notes,
    },
  });

  revalidatePath(`/assignments/${id}`);
  redirect(`/assignments/${id}`);
}

export async function deleteAssignment(id: string) {
  await prisma.assignment.delete({
    where: { id },
  });

  redirect("/assignments");
}
