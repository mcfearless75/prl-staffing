"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCompany(formData: FormData) {
  try {
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

    revalidatePath("/companies");
    redirect("/companies");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create company:", error);
    throw new Error("Failed to create company. Please try again.");
  }
}

export async function updateCompany(id: string, formData: FormData) {
  try {
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
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to update company:", error);
    throw new Error("Failed to update company. Please try again.");
  }
}

export async function deleteCompany(id: string) {
  try {
    await prisma.company.delete({
      where: { id },
    });

    revalidatePath("/companies");
    redirect("/companies");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete company:", error);
    throw new Error("Failed to delete company. Please try again.");
  }
}
