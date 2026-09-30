"use server";

import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";

const REVEALABLE = {
  niNumber: "NI Number",
  utrNumber: "UTR Number",
} as const;

export type RevealableField = keyof typeof REVEALABLE;

/**
 * The full NI/UTR number for the profile's "Show" button. Fetched on demand,
 * so the unmasked value is never in the page until someone asks for it, and
 * each view is written to the Activity Log.
 */
export async function revealSensitiveAction(contractorId: string, field: RevealableField): Promise<string | null> {
  if (!(field in REVEALABLE)) return null;
  const guard = await requireStaff();
  if (!guard.ok) return null;
  const c = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: { niNumber: true, utrNumber: true },
  });
  const value = c?.[field];
  if (!value) return null;
  await logActivity(`Viewed ${REVEALABLE[field]}`, "Contractor", contractorId);
  return value;
}
