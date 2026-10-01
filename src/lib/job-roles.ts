import { prisma } from "@/lib/db";

export type ActiveJobRole = {
  id: string;
  name: string;
};

/**
 * Lists active job roles for every role picker (staff contractor form, the
 * worker's account setup, the public apply form), A–Z.
 *
 * Alphabetical, not by the admin sortOrder: PRL pick from this list and
 * couldn't find things (Jenni, 2026-10-01: "the electricians are in various
 * places in the list"). Sorted here rather than in SQL so case and spacing
 * can't split "Electrician" from "electrical improver".
 */
export async function listActiveJobRoles(): Promise<ActiveJobRole[]> {
  const roles = await prisma.jobRole.findMany({
    where: { active: true },
    select: { id: true, name: true },
  });
  return sortRolesAZ(roles);
}

export function sortRolesAZ<T extends { name: string }>(roles: T[]): T[] {
  return [...roles].sort((a, b) => a.name.trim().localeCompare(b.name.trim(), "en-GB", { sensitivity: "base" }));
}
