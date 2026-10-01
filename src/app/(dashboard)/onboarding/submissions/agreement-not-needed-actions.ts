"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";

/**
 * Take someone off Onboarding's "Ready for an agreement" list (Erica,
 * 2026-10-01: tests, and people who already started work). Hides them from
 * the list and the profile prompt only — nothing is deleted, and an agreement
 * can still be sent from "Send Subcontractor Agreement" at any time.
 */
export async function markAgreementNotNeeded(contractorId: string): Promise<{ ok: boolean; message?: string }> {
  const guard = await requireStaff();
  if (!guard.ok) return { ok: false, message: "Only staff can do this." };

  const by = guard.session.user.name || guard.session.user.email || "staff";
  const res = await prisma.contractor.updateMany({
    where: { id: contractorId, agreementNotNeededAt: null },
    data: { agreementNotNeededAt: new Date(), agreementNotNeededBy: by },
  });
  if (res.count > 0) {
    await logActivity("Agreement marked not needed", "Contractor", contractorId, "Removed from Onboarding's ready-for-agreement list");
  }
  revalidatePath("/onboarding/submissions");
  return { ok: true };
}
