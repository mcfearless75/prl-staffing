"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function createSupplier(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
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

    revalidatePath("/suppliers");
    redirect("/suppliers");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create supplier:", error);
    throw new Error("Failed to create supplier. Please try again.");
  }
}

export async function updateSupplier(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
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
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to update supplier:", error);
    throw new Error("Failed to update supplier. Please try again.");
  }
}

export async function deleteSupplier(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    await prisma.supplier.delete({
      where: { id },
    });

    revalidatePath("/suppliers");
    redirect("/suppliers");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete supplier:", error);
    throw new Error("Failed to delete supplier. Please try again.");
  }
}
