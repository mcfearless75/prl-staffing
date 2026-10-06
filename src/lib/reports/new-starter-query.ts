import { prisma } from "@/lib/db";
import { londonDayBounds } from "@/lib/london-day";
import {
  canonicalRoleFor,
  roleMatches,
  shapeNewStarterRows,
  type NewStarterFilters,
  type NewStarterRow,
} from "@/lib/reports/new-starter-report";

/**
 * The one query behind the New Starter Report — page, CSV, PDF and email all
 * call this. Assignments of ANY status whose start date falls on a London
 * calendar day inside the range.
 *
 * The role filter runs after the query rather than in SQL: roles are matched
 * through the role normaliser ("Joiner Nights" is a Joiner), which a WHERE
 * clause on the raw text cannot do.
 */
export async function getNewStarterReport(filters: NewStarterFilters): Promise<NewStarterRow[]> {
  const start = londonDayBounds(filters.from).start;
  const end = londonDayBounds(filters.to).end;

  const assignments = await prisma.assignment.findMany({
    where: {
      startDate: { gte: start, lt: end },
      ...(filters.companyIds.length > 0 ? { companyId: { in: filters.companyIds } } : {}),
    },
    select: {
      id: true,
      startDate: true,
      role: true,
      company: { select: { name: true } },
      contractor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          niNumber: true,
          jobTitle: true,
        },
      },
    },
    orderBy: { startDate: "asc" },
  });

  return shapeNewStarterRows(
    assignments
      .filter((a) => roleMatches(filters.roles, a.role, a.contractor.jobTitle))
      .map((a) => ({
        assignmentId: a.id,
        startDate: a.startDate,
        role: a.role,
        companyName: a.company.name,
        contractor: a.contractor,
      }))
  );
}

export interface NewStarterFilterOptions {
  companies: { id: string; name: string }[];
  roles: string[];
}

/** Companies (A–Z) and the canonical roles actually in use on assignments (A–Z). */
export async function getNewStarterFilterOptions(): Promise<NewStarterFilterOptions> {
  const [companies, assignmentRoles] = await Promise.all([
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.assignment.findMany({
      select: { role: true, contractor: { select: { jobTitle: true } } },
      distinct: ["role", "contractorId"],
    }),
  ]);

  const roles = new Set<string>();
  for (const a of assignmentRoles) {
    const canonical = canonicalRoleFor(a.role, a.contractor.jobTitle);
    if (canonical) roles.add(canonical);
  }

  return {
    companies,
    roles: [...roles].sort((a, b) => a.localeCompare(b, "en-GB", { sensitivity: "base" })),
  };
}

/** id → name for the companies named in the filters, for the summary line. */
export async function companyNamesFor(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.company.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return new Map(rows.map((r) => [r.id, r.name]));
}
