"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

function parseRateForm(formData: FormData) {
  const trade = formData.get("trade") as string;
  const region = (formData.get("region") as string) || null;
  const sector = (formData.get("sector") as string) || null;
  const project = (formData.get("project") as string) || null;
  const employmentType = (formData.get("employmentType") as string) || "PAYE";
  const rateType = (formData.get("rateType") as string) || "Time";
  const rateBasis = (formData.get("rateBasis") as string) || "Hourly";
  const pay = parseFloat(formData.get("pay") as string);
  const charge = parseFloat(formData.get("charge") as string);

  // Agency markup defaults to charge − pay when left blank.
  const markupRaw = formData.get("agencyMarkup") as string;
  const agencyMarkup = markupRaw ? parseFloat(markupRaw) : Number.isFinite(charge - pay) ? charge - pay : null;

  const margin = charge > 0 ? parseFloat((((charge - pay) / charge) * 100).toFixed(1)) : null;

  const effectiveFromRaw = formData.get("effectiveFrom") as string;
  const effectiveFrom = effectiveFromRaw ? new Date(effectiveFromRaw) : new Date();
  const effectiveToRaw = formData.get("effectiveTo") as string;
  const effectiveTo = effectiveToRaw ? new Date(effectiveToRaw) : null;

  return {
    trade,
    region,
    sector,
    project,
    employmentType,
    rateType,
    rateBasis,
    pay,
    agencyMarkup,
    charge,
    margin,
    effectiveFrom,
    effectiveTo,
  };
}

export async function createRateCard(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    await prisma.rateCard.create({ data: parseRateForm(formData) });
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
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    await prisma.rateCard.update({ where: { id }, data: parseRateForm(formData) });
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
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    await prisma.rateCard.delete({ where: { id } });
    revalidatePath("/rates");
    redirect("/rates");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete rate card:", error);
    throw new Error("Failed to delete rate card. Please try again.");
  }
}
