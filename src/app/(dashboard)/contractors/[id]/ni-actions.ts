"use server";

import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";

/**
 * The full NI number for the profile's "Show" button. Fetched on demand, so
 * the unmasked value is never in the page until someone asks for it, and each
 * view is written to the Activity Log.
 */
export async function revealNiNumberAction(contractorId: string): Promise<string | null> {
  const guard = await requireStaff();
  if (!guard.ok) return null;
  const c = await prisma.contractor.findUnique({ where: { id: contractorId }, select: { niNumber: true } });
  if (!c?.niNumber) return null;
  await logActivity("Viewed NI Number", "Contractor", contractorId);
  return c.niNumber;
}
