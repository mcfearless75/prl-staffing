import { prisma } from "@/lib/db";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";

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
 * Assignment statuses that mean the contractor is still working. Re-exported so
 * every existing caller keeps importing it from here, but DEFINED in
 * `assignment-statuses.ts` — that file imports nothing, so client components can
 * use the same constant without pulling Prisma into the browser bundle. There is
 * still exactly one definition; see that file for why.
 */
export { LIVE_ASSIGNMENT_STATUSES };

type Awaitable<T> = T | PromiseLike<T>;

/**
 * The slice of Prisma these transitions actually use.
 *
 * Injected rather than imported so the rules can be exercised against an
 * in-memory double — these are the transitions that stranded contractors on
 * site with an Inactive status, and they were previously only checkable by
 * running them against the live database.
 */
export type ContractorStatusDb = {
  contractor: {
    updateMany(args: {
      where: { id: string; status: string };
      data: { status: string };
    }): Awaitable<{ count: number }>;
    findUnique(args: {
      where: { id: string };
      select: { status: true };
    }): Awaitable<{ status: string } | null>;
  };
  assignment: {
    count(args: {
      where: { contractorId: string; status: { in: string[] } };
    }): Awaitable<number>;
  };
};

/**
 * The single contractor status automation may promote FROM, and the one it may
 * demote FROM. Everything else — "On Hold", "Left", "New", "Suspended" — is
 * staff intent, and staff intent outranks automation.
 *
 * Named constants rather than inline literals because they ARE the guarantee:
 * they appear in the `where` clause, so a status absent from here cannot match
 * and therefore cannot be rewritten.
 */
export const AUTO_ACTIVATE_FROM = "Inactive";
export const AUTO_DEACTIVATE_FROM = "Active";

/**
 * Flips a contractor Inactive -> Active when they are put back to work.
 *
 * Deliberately narrow: it will not touch "On Hold" (a deliberate staff flag),
 * "Left", or a contractor already Active. Staff intent outranks automation.
 */
export async function activateContractorIfInactive(
  contractorId: string,
  db: ContractorStatusDb = prisma
): Promise<void> {
  await db.contractor.updateMany({
    where: { id: contractorId, status: AUTO_ACTIVATE_FROM },
    data: { status: "Active" },
  });
}

/**
 * Applies the activation rule when an assignment is SAVED at a given status —
 * the "someone has just been put to work" entry point.
 *
 * Gated on the LIVE set, not on the compliance gate: those answer different
 * questions. Saving an assignment as "Ending" still means the contractor is on
 * site, and gating on the compliance set previously left such a contractor
 * Inactive while they were working.
 *
 * This lived privately inside assignments/actions.ts, so the three OTHER paths
 * that put someone to work — quick-assign from the contractor page, assigning
 * to a site, and moving an existing assignment — never activated anybody. That
 * stranded contractors with live work but an Inactive status, which matters
 * because every compliance denominator uses `notIn ["Left","Inactive"]`: those
 * people were on site and excluded from compliance scoring entirely.
 *
 * Deliberately still cannot rescue a "Left" contractor — see
 * activateContractorIfInactive. Someone marked Left while holding live work is
 * a contradiction that staff must resolve, not one automation should paper over.
 */
export async function activateContractorForAssignment(
  contractorId: string,
  status: string,
  db: ContractorStatusDb = prisma
): Promise<void> {
  if (!(LIVE_ASSIGNMENT_STATUSES as readonly string[]).includes(status)) return;
  await activateContractorIfInactive(contractorId, db);
}

/**
 * Flips a contractor Active -> Inactive when they have no live assignment left.
 *
 * Checks for OTHER live work first, so someone placed with two clients does not
 * go Inactive because one of them ended. Only ever moves "Active" — "On Hold"
 * and "Left" are left alone for the same reason as above.
 */
export async function deactivateContractorIfNoLiveWork(
  contractorId: string,
  db: ContractorStatusDb = prisma
): Promise<void> {
  const remaining = await db.assignment.count({
    where: { contractorId, status: { in: [...LIVE_ASSIGNMENT_STATUSES] } },
  });
  if (remaining > 0) return;

  await db.contractor.updateMany({
    where: { id: contractorId, status: AUTO_DEACTIVATE_FROM },
    data: { status: "Inactive" },
  });
}

/**
 * Applies the deactivation rule to many contractors, e.g. after a client's
 * assignments have all been closed. Sequential rather than parallel: each check
 * reads assignment state the previous write may have changed.
 */
export async function deactivateContractorsWithNoLiveWork(
  contractorIds: string[],
  db: ContractorStatusDb = prisma
): Promise<number> {
  const unique = [...new Set(contractorIds)];
  let deactivated = 0;
  for (const id of unique) {
    const before = await db.contractor.findUnique({
      where: { id },
      select: { status: true },
    });
    await deactivateContractorIfNoLiveWork(id, db);
    const after = await db.contractor.findUnique({
      where: { id },
      select: { status: true },
    });
    if (before?.status !== after?.status) deactivated++;
  }
  return deactivated;
}
