"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

function extractContractorData(formData: FormData) {
  const dobRaw = formData.get("dateOfBirth") as string;
  return {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    jobTitle: formData.get("jobTitle") as string,
    dayRate: parseFloat(formData.get("dayRate") as string) || null,
    payRate: parseFloat(formData.get("payRate") as string) || null,
    chargeRate: parseFloat(formData.get("chargeRate") as string) || null,
    status: formData.get("status") as string,
    supplierId: (formData.get("supplierId") as string) || null,
    niNumber: formData.get("niNumber") as string,
    utrNumber: formData.get("utrNumber") as string,
    ir35Status: formData.get("ir35Status") as string,
    notes: formData.get("notes") as string,
    // Emergency contact
    emergencyContactName: formData.get("emergencyContactName") as string || null,
    emergencyContactPhone: formData.get("emergencyContactPhone") as string || null,
    emergencyContactRelation: formData.get("emergencyContactRelation") as string || null,
    // Personal details
    dateOfBirth: dobRaw ? new Date(dobRaw) : null,
    address: formData.get("address") as string || null,
    postcode: formData.get("postcode") as string || null,
    nextOfKin: formData.get("nextOfKin") as string || null,
    medicalNotes: formData.get("medicalNotes") as string || null,
  };
}

export async function createContractor(formData: FormData) {
  const data = extractContractorData(formData);

  const contractor = await prisma.contractor.create({
    data: {
      ...data,
      supplierId: data.supplierId === "" ? null : data.supplierId,
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
  const data = extractContractorData(formData);

  await prisma.contractor.update({
    where: { id },
    data: {
      ...data,
      supplierId: data.supplierId === "" ? null : data.supplierId,
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
