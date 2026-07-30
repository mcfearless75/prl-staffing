import { prisma } from "@/lib/db";

/**
 * Contractor working-status transitions, in one place.
 *
 * These rules previously lived only inside assignments/actions.ts, so anything
 * else that ended a contractor's work — deactivating a client, for instance —
 * left them showing as Active with nothing to do. Worse, the "still working?"
 * test there counted only {Placed, Active} while every headcount and compliance
 * query counted {Placed, Active, Ending}, so a contractor winding down could be
 * marked Inactive and simultaneously counted in the assigned workforce.
 *
 * One definition, used by every caller.
 */

/**
 * Assignment statuses that mean the contractor is still working. Must stay in
 * step with the headcount queries in /compliance and the dashboard — if these
 * two ever disagree, the same person is both placed and not placed.
 */
export const LIVE_ASSIGNMENT_STATUSES = ["Placed", "Active", "Ending"] as const;

/**
 * Flips a contractor Inactive -> Active when they are put back to work.
 *
 * Deliberately narrow: it will not touch "On Hold" (a deliberate staff flag),
 * "Left", or a contractor already Active. Staff intent outranks automation.
 */
export async function activateContractorIfInactive(contractorId: string): Promise<void> {
  await prisma.contractor.updateMany({
    where: { id: contractorId, status: "Inactive" },
    data: { status: "Active" },
  });
}

/**
 * Flips a contractor Active -> Inactive when they have no live assignment left.
 *
 * Checks for OTHER live work first, so someone placed with two clients does not
 * go Inactive because one of them ended. Only ever moves "Active" — "On Hold"
 * and "Left" are left alone for the same reason as above.
 */
export async function deactivateContractorIfNoLiveWork(contractorId: string): Promise<void> {
  const remaining = await prisma.assignment.count({
    where: { contractorId, status: { in: [...LIVE_ASSIGNMENT_STATUSES] } },
  });
  if (remaining > 0) return;

  await prisma.contractor.updateMany({
    where: { id: contractorId, status: "Active" },
    data: { status: "Inactive" },
  });
}

/**
 * Applies the deactivation rule to many contractors, e.g. after a client's
 * assignments have all been closed. Sequential rather than parallel: each check
 * reads assignment state the previous write may have changed.
 */
export async function deactivateContractorsWithNoLiveWork(
  contractorIds: string[]
): Promise<number> {
  const unique = [...new Set(contractorIds)];
  let deactivated = 0;
  for (const id of unique) {
    const before = await prisma.contractor.findUnique({
      where: { id },
      select: { status: true },
    });
    await deactivateContractorIfNoLiveWork(id);
    const after = await prisma.contractor.findUnique({
      where: { id },
      select: { status: true },
    });
    if (before?.status !== after?.status) deactivated++;
  }
  return deactivated;
}
