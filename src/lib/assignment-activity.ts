import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";

/**
 * One line on the contractor's Activity tab for an assignment change, naming
 * the client so "Assigned to a client" reads "… — Metlen (Active)".
 */
export async function logAssignmentActivity(
  action: string,
  contractorId: string,
  companyId: string | null,
  status?: string | null,
  extra?: string
): Promise<void> {
  try {
    const company = companyId
      ? await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } })
      : null;
    const bits = [company?.name, status ? `(${status})` : null, extra].filter(Boolean).join(" ");
    await logActivity(action, "Contractor", contractorId, bits || undefined);
  } catch {
    // Logging must never break the save.
  }
}
