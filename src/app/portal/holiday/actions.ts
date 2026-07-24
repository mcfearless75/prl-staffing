"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isPayeContractor } from "@/lib/holiday";

/**
 * Contractor self-service holiday request. A contractor may only ever
 * create a request against their own contractorId (taken from the
 * session, never from client input).
 */
export async function createHolidayRequest(formData: FormData) {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
  if (!contractor || !isPayeContractor(contractor.employmentType)) {
    throw new Error("Holiday accrual applies to PAYE workers only.");
  }

  const hoursRequested = parseFloat((formData.get("hours") as string) || "");
  const notes = ((formData.get("note") as string) || "").trim() || null;

  if (!Number.isFinite(hoursRequested) || hoursRequested <= 0) {
    throw new Error("Enter a valid number of hours to request.");
  }

  await prisma.holidayRequest.create({
    data: {
      contractorId,
      hoursRequested,
      notes,
    },
  });

  revalidatePath("/portal/holiday");
}
