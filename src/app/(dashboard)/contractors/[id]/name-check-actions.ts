"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";

/** Staff confirm a worker's own name edit matches their ID; clears the flag. */
export async function markNameChecked(contractorId: string): Promise<{ ok: boolean; message?: string }> {
  const guard = await requireStaff();
  if (!guard.ok) return { ok: false, message: "Only staff can do this." };

  const c = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: { firstName: true, lastName: true, nameChangedFrom: true, nameChangedAt: true },
  });
  if (!c) return { ok: false, message: "Contractor not found." };
  if (!c.nameChangedAt) return { ok: true };

  await prisma.contractor.update({
    where: { id: contractorId },
    data: { nameChangedAt: null, nameChangedFrom: null },
  });
  await logActivity(
    "Name change checked",
    "Contractor",
    contractorId,
    `${c.nameChangedFrom ?? "?"} → ${c.firstName} ${c.lastName} checked against ID`
  );
  revalidatePath(`/contractors/${contractorId}`);
  return { ok: true };
}
