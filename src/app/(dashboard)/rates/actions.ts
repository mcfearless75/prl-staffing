"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createRateCard(formData: FormData) {
  try {
    const role = formData.get("role") as string;
    const location = formData.get("location") as string;
    const payRate = parseFloat(formData.get("payRate") as string);
    const chargeRate = parseFloat(formData.get("chargeRate") as string);
    const margin = parseFloat(((chargeRate - payRate) / chargeRate * 100).toFixed(1));
    const effectiveFrom = new Date(formData.get("effectiveFrom") as string);
    const effectiveToRaw = formData.get("effectiveTo") as string;
    const effectiveTo = effectiveToRaw ? new Date(effectiveToRaw) : null;

    await prisma.rateCard.create({
      data: {
        role,
        location,
        payRate,
        chargeRate,
        margin,
        effectiveFrom,
        effectiveTo,
      },
    });

    revalidatePath("/rates");
    redirect("/rates");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create rate card:", error);
    throw new Error("Failed to create rate card. Please try again.");
  }
}

export async function updateRateCard(id: string, formData: FormData) {
  try {
    const role = formData.get("role") as string;
    const location = formData.get("location") as string;
    const payRate = parseFloat(formData.get("payRate") as string);
    const chargeRate = parseFloat(formData.get("chargeRate") as string);
    const margin = parseFloat(((chargeRate - payRate) / chargeRate * 100).toFixed(1));
    const effectiveFrom = new Date(formData.get("effectiveFrom") as string);
    const effectiveToRaw = formData.get("effectiveTo") as string;
    const effectiveTo = effectiveToRaw ? new Date(effectiveToRaw) : null;

    await prisma.rateCard.update({
      where: { id },
      data: {
        role,
        location,
        payRate,
        chargeRate,
        margin,
        effectiveFrom,
        effectiveTo,
      },
    });

    revalidatePath("/rates");
    redirect("/rates");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to update rate card:", error);
    throw new Error("Failed to update rate card. Please try again.");
  }
}

export async function deleteRateCard(id: string) {
  try {
    await prisma.rateCard.delete({
      where: { id },
    });

    revalidatePath("/rates");
    redirect("/rates");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete rate card:", error);
    throw new Error("Failed to delete rate card. Please try again.");
  }
}
