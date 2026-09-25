import { prisma } from "@/lib/db";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { missingEmergencyFields } from "@/lib/emergency-contact";

export interface MissingEmergencyContactRow {
  contractorId: string;
  ref: string;
  name: string;
  status: string;
  missing: string[];
  onLiveWork: boolean;
  phone: string;
  email: string;
}

/**
 * Everyone not Left/Inactive whose emergency contact lacks a name or a phone
 * number. People on live work are listed first — they are the ones on site.
 */
export async function getMissingEmergencyContactsReport(): Promise<MissingEmergencyContactRow[]> {
  const contractors = await prisma.contractor.findMany({
    where: { status: { notIn: ["Left", "Inactive"] } },
    select: {
      id: true,
      ref: true,
      firstName: true,
      lastName: true,
      status: true,
      phone: true,
      email: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      assignments: {
        where: { status: { in: [...LIVE_ASSIGNMENT_STATUSES] } },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const rows: MissingEmergencyContactRow[] = [];
  for (const c of contractors) {
    const missing = missingEmergencyFields(c);
    if (missing.length === 0) continue;
    rows.push({
      contractorId: c.id,
      ref: c.ref || "-",
      name: `${c.firstName} ${c.lastName}`,
      status: c.status,
      missing,
      onLiveWork: c.assignments.length > 0,
      phone: c.phone || "",
      email: c.email,
    });
  }

  rows.sort((a, b) => Number(b.onLiveWork) - Number(a.onLiveWork));
  return rows;
}
