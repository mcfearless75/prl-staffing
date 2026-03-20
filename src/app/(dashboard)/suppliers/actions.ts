"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSupplier(formData: FormData) {
  const name = formData.get("name") as string;
  const tier = formData.get("tier") as string;
  const contactName = formData.get("contactName") as string;
  const contactEmail = formData.get("contactEmail") as string;
  const contactPhone = formData.get("contactPhone") as string;
  const score = parseInt(formData.get("score") as string) || 0;

  await prisma.supplier.create({
    data: {
      name,
      tier,
      contactName,
      contactEmail,
      contactPhone,
      score,
    },
  });

  redirect("/suppliers");
}

export async function updateSupplier(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const tier = formData.get("tier") as string;
  const contactName = formData.get("contactName") as string;
  const contactEmail = formData.get("contactEmail") as string;
  const contactPhone = formData.get("contactPhone") as string;
  const score = parseInt(formData.get("score") as string) || 0;

  await prisma.supplier.update({
    where: { id },
    data: {
      name,
      tier,
      contactName,
      contactEmail,
      contactPhone,
      score,
    },
  });

  revalidatePath(`/suppliers/${id}`);
  redirect(`/suppliers/${id}`);
}

export async function deleteSupplier(id: string) {
  await prisma.supplier.delete({
    where: { id },
  });

  redirect("/suppliers");
}
