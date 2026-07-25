import { prisma } from "@/lib/db";

export type ActiveJobRole = {
  id: string;
  name: string;
};

/**
 * Lists active job roles for use in the shared RolePicker component,
 * ordered by admin-defined sortOrder then name.
 */
export async function listActiveJobRoles(): Promise<ActiveJobRole[]> {
  const roles = await prisma.jobRole.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  return roles;
}
