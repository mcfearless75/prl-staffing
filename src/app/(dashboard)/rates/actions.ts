"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createRateCard(formData: FormData) {
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

  redirect("/rates");
}

export async function updateRateCard(id: string, formData: FormData) {
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
}

export async function deleteRateCard(id: string) {
  await prisma.rateCard.delete({
    where: { id },
  });

  redirect("/rates");
}
