"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCompany(formData: FormData) {
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const postcode = formData.get("postcode") as string;
  const contactName = formData.get("contactName") as string;
  const contactEmail = formData.get("contactEmail") as string;
  const contactPhone = formData.get("contactPhone") as string;

  await prisma.company.create({
    data: {
      name,
      address,
      city,
      postcode,
      contactName,
      contactEmail,
      contactPhone,
    },
  });

  redirect("/companies");
}

export async function updateCompany(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const postcode = formData.get("postcode") as string;
  const contactName = formData.get("contactName") as string;
  const contactEmail = formData.get("contactEmail") as string;
  const contactPhone = formData.get("contactPhone") as string;

  await prisma.company.update({
    where: { id },
    data: {
      name,
      address,
      city,
      postcode,
      contactName,
      contactEmail,
      contactPhone,
    },
  });

  revalidatePath(`/companies/${id}`);
  redirect(`/companies/${id}`);
}

export async function deleteCompany(id: string) {
  await prisma.company.delete({
    where: { id },
  });

  redirect("/companies");
}
