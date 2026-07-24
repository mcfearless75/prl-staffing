import { prisma } from "@/lib/db";

const DAYS_HORIZON = 14;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface RedeploymentRow {
  contractorId: string;
  ref: string;
  name: string;
  role: string;
  company: string;
  endDate: Date;
  daysUntilEnd: number | null;
  daysSinceEnd: number | null;
  phone: string;
  email: string;
}

/**
 * Contractors whose latest (most recently started) assignment ends within
 * DAYS_HORIZON days or has already ended, with nothing later booked.
 *
 * "Latest assignment" = the one with the greatest startDate for that
 * contractor — since no assignment for the same contractor can start after
 * it, picking the max-startDate row inherently satisfies "no later
 * assignment starting" without a second query.
 */
export async function getRedeploymentReport(): Promise<RedeploymentRow[]> {
  const assignments = await prisma.assignment.findMany({
    include: {
      contractor: true,
      company: true,
    },
    orderBy: { startDate: "desc" },
  });

  const latestByContractor = new Map<string, (typeof assignments)[number]>();
  for (const assignment of assignments) {
    if (!latestByContractor.has(assignment.contractorId)) {
      latestByContractor.set(assignment.contractorId, assignment);
    }
  }

  const now = new Date();
  const rows: RedeploymentRow[] = [];

  for (const assignment of latestByContractor.values()) {
    if (!assignment.endDate) continue;

    const endDate = new Date(assignment.endDate);
    const diffDays = Math.floor((endDate.getTime() - now.getTime()) / MS_PER_DAY);
    const isEndingSoon = diffDays >= 0 && diffDays <= DAYS_HORIZON;
    const isAlreadyEnded = diffDays < 0;

    if (!isEndingSoon && !isAlreadyEnded) continue;

    rows.push({
      contractorId: assignment.contractorId,
      ref: assignment.contractor.ref || "-",
      name: `${assignment.contractor.firstName} ${assignment.contractor.lastName}`,
      role: assignment.role,
      company: assignment.company.name,
      endDate,
      daysUntilEnd: isEndingSoon ? diffDays : null,
      daysSinceEnd: isAlreadyEnded ? Math.abs(diffDays) : null,
      phone: assignment.contractor.phone || "",
      email: assignment.contractor.email,
    });
  }

  rows.sort((a, b) => a.endDate.getTime() - b.endDate.getTime());

  return rows;
}
