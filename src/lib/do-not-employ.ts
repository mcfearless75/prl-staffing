import { prisma } from "@/lib/db";

/**
 * "Do not employ" (PRL, 2026-10-01): staff flag someone after e.g. an incident
 * on site. The flag carries a required reason, is shown red on the profile,
 * makes them Inactive, and is checked by every path that puts someone to work.
 */

export const DO_NOT_EMPLOY_REASON_MAX = 2000;

/** Why a placement must be refused, or null if they can be placed. */
export async function doNotEmployBlock(contractorId: string): Promise<string | null> {
  const c = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: { doNotEmploy: true, firstName: true, lastName: true },
  });
  if (!c?.doNotEmploy) return null;
  return `${c.firstName} ${c.lastName} is marked "Do not employ" — see the red note on their profile. Untick it there first if that has changed.`;
}
