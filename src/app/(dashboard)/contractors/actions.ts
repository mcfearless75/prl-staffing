"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export async function createContractor(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const jobTitle = formData.get("jobTitle") as string;
  const dayRate = parseFloat(formData.get("dayRate") as string) || null;
  const payRate = parseFloat(formData.get("payRate") as string) || null;
  const chargeRate = parseFloat(formData.get("chargeRate") as string) || null;
  const status = formData.get("status") as string;
  const supplierId = formData.get("supplierId") as string;
  const niNumber = formData.get("niNumber") as string;
  const utrNumber = formData.get("utrNumber") as string;
  const ir35Status = formData.get("ir35Status") as string;
  const notes = formData.get("notes") as string;

  const contractor = await prisma.contractor.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      dayRate,
      payRate,
      chargeRate,
      status,
      supplierId: supplierId === "" ? null : supplierId,
      niNumber,
      utrNumber,
      ir35Status,
      notes,
    },
  });

  // Auto-create contractor portal login (password set via forgot-password flow)
  const tempHash = await bcrypt.hash(`temp-${Date.now()}`, 10);
  try {
    await prisma.contractorLogin.create({
      data: {
        contractorId: contractor.id,
        email: contractor.email,
        passwordHash: tempHash,
      },
    });
  } catch {
    // ContractorLogin may already exist if email was reused — safe to ignore
  }

  redirect("/contractors");
}

export async function updateContractor(id: string, formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const jobTitle = formData.get("jobTitle") as string;
  const dayRate = parseFloat(formData.get("dayRate") as string) || null;
  const payRate = parseFloat(formData.get("payRate") as string) || null;
  const chargeRate = parseFloat(formData.get("chargeRate") as string) || null;
  const status = formData.get("status") as string;
  const supplierId = formData.get("supplierId") as string;
  const niNumber = formData.get("niNumber") as string;
  const utrNumber = formData.get("utrNumber") as string;
  const ir35Status = formData.get("ir35Status") as string;
  const notes = formData.get("notes") as string;

  await prisma.contractor.update({
    where: { id },
    data: {
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      dayRate,
      payRate,
      chargeRate,
      status,
      supplierId: supplierId === "" ? null : supplierId,
      niNumber,
      utrNumber,
      ir35Status,
      notes,
    },
  });

  revalidatePath(`/contractors/${id}`);
  redirect(`/contractors/${id}`);
}

export async function deleteContractor(id: string) {
  await prisma.contractor.delete({
    where: { id },
  });

  redirect("/contractors");
}
