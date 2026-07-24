import type { Prisma } from "@prisma/client";

export type ContractorWithRelations = Prisma.ContractorGetPayload<{
  include: {
    supplier: true;
    assignments: { include: { company: true; site: true; department: true; project: true } };
    compliances: true;
  };
}>;

export type ComplianceRecordRow = Prisma.ComplianceRecordGetPayload<Record<string, never>>;

export type DocumentRow = Prisma.DocumentGetPayload<Record<string, never>>;

export type ActivityLogRow = Prisma.ActivityLogGetPayload<Record<string, never>>;

export type CompanyWithSites = Prisma.CompanyGetPayload<{
  include: { sites: { include: { departments: true } } };
}>;

export type ProjectOption = { id: string; code: string; name: string };

export const TAB_LABELS = [
  "Overview",
  "Right to Work",
  "Comps & Certs",
  "Assignments",
  "Application",
  "Activity",
  "Notes",
] as const;

export type TabLabel = (typeof TAB_LABELS)[number];

export function isTabLabel(value: string | undefined): value is TabLabel {
  return !!value && (TAB_LABELS as readonly string[]).includes(value);
}
