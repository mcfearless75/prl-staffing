/**
 * The Subcontractors list's query: who matches the filters, and the derived
 * columns (job title, where they're working, compliance).
 *
 * Shared by the list page and its CSV export so the export is exactly what is
 * on screen. Two copies of this would drift, and an export that quietly
 * disagrees with the list it came from is worse than no export.
 */
import { prisma } from "@/lib/db";
import { nameSearchClauses } from "@/lib/contractor-name";
import { formatDate } from "@/lib/utils";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { PRE_WORK_CONTRACTOR_STATUSES } from "@/lib/contractor-statuses";
import {
  appliedForFromNotes,
  effectiveJobTitle,
  parseContractorSort,
  sortContractorRows,
  type ContractorSort,
} from "@/lib/contractor-list";

// "Available" isn't a real status — it's Active or Inactive with no live
// assignment (called "Bench" until 2026-09-27; old ?status=Bench links still
// work). Not a plain status filter, so it's special-cased wherever the
// `status` query param is read/written rather than added to
// SETTABLE_CONTRACTOR_STATUSES (which drives the actual status dropdown).
export const AVAILABLE_FILTER = "Available";
// Workers who edited their own name on the portal; staff check it against ID.
export const NAME_CHECK_FILTER = "NameCheck";

// Filter value meaning "blank" for the Job Title and Working At dropdowns.
export const NONE = "__none";

export type ComplianceStatus = "Verified" | "Expiring" | "Pending" | "Non-Compliant" | "No Records";
export const COMPLIANCE_OPTIONS: ComplianceStatus[] = ["Non-Compliant", "Expiring", "Pending", "No Records", "Verified"];

function deriveComplianceStatus(records: { status: string }[]): ComplianceStatus {
  if (records.length === 0) return "No Records";
  const statuses = records.map((r) => r.status);
  if (statuses.some((s) => s === "Expired" || s === "Non-Compliant")) return "Non-Compliant";
  if (statuses.some((s) => s === "Expiring")) return "Expiring";
  if (statuses.some((s) => s === "Pending")) return "Pending";
  if (statuses.every((s) => s === "Verified")) return "Verified";
  return "Pending";
}

/** The list's query-string parameters, as the page receives them. */
export interface ContractorListParams {
  search?: string; status?: string;
  title?: string; working?: string; compliance?: string;
  sort?: string; dir?: string;
  sortBy?: string; // legacy: firstName | lastName
}

export interface ContractorListFilters {
  search: string; status: string;
  title: string; working: string; compliance: string;
  sort: ContractorSort; dir: "asc" | "desc";
}

export function parseContractorListParams(params: ContractorListParams | undefined): ContractorListFilters {
  return {
    search: params?.search || "",
    status: params?.status === "Bench" ? AVAILABLE_FILTER : params?.status || "",
    title: params?.title || "",
    working: params?.working || "",
    compliance: params?.compliance || "",
    sort: parseContractorSort(params?.sort, params?.sortBy),
    dir: params?.dir === "desc" ? "desc" : "asc",
  };
}

export async function loadContractorList(f: ContractorListFilters) {
  const where: Record<string, unknown> = {};

  if (f.search) {
    where.AND = nameSearchClauses(f.search);
  }

  if (f.status === AVAILABLE_FILTER) {
    where.status = { in: ["Active", "Inactive"] };
    where.assignments = { none: { status: { in: [...LIVE_ASSIGNMENT_STATUSES] } } };
  } else if (f.status === NAME_CHECK_FILTER) {
    where.nameChangedAt = { not: null };
  } else if (f.status) {
    where.status = f.status;
  } else if (!f.search) {
    // Default view: the workforce. Applicants and new starters who have not
    // started yet live on /applicants and /new-starters; they are still found
    // by filtering on their status, or by searching for them by name (so
    // nobody re-adds a person because the list hid them).
    where.status = { notIn: [...PRE_WORK_CONTRACTOR_STATUSES] };
  }

  const found = await prisma.contractor.findMany({
    where,
    include: {
      compliances: { select: { status: true } },
      jobRoles: { select: { jobRole: { select: { name: true } } } },
    },
  });

  // Where each contractor is currently working — their most recent live assignment, if any.
  const liveAssignments = await prisma.assignment.findMany({
    where: {
      contractorId: { in: found.map((c) => c.id) },
      status: { in: [...LIVE_ASSIGNMENT_STATUSES] },
    },
    select: {
      contractorId: true, role: true, startDate: true, endDate: true,
      company: { select: { name: true } }, site: { select: { name: true } },
    },
    orderBy: { startDate: "desc" },
  });
  const liveByContractor = new Map<string, (typeof liveAssignments)[number]>();
  for (const a of liveAssignments) {
    if (!liveByContractor.has(a.contractorId)) liveByContractor.set(a.contractorId, a);
  }

  // Their most recent ENDED job, for people not currently working (mostly
  // Inactive), so the list can say what they last did and where.
  const notWorkingIds = found.map((c) => c.id).filter((id) => !liveByContractor.has(id));
  const pastAssignments = notWorkingIds.length
    ? await prisma.assignment.findMany({
        where: { contractorId: { in: notWorkingIds }, status: { notIn: [...LIVE_ASSIGNMENT_STATUSES] } },
        select: { contractorId: true, role: true, endDate: true, startDate: true, company: { select: { name: true } } },
        orderBy: [{ endDate: { sort: "desc", nulls: "last" } }, { startDate: "desc" }],
      })
    : [];
  const lastByContractor = new Map<string, (typeof pastAssignments)[number]>();
  for (const a of pastAssignments) {
    if (!lastByContractor.has(a.contractorId)) lastByContractor.set(a.contractorId, a);
  }

  // Job title, workplace and compliance are derived per row, so they are
  // filtered and sorted here rather than in the query.
  const allRows = found.map((c) => {
    const live = liveByContractor.get(c.id);
    const last = live ? undefined : lastByContractor.get(c.id);
    return {
      ...c,
      title: effectiveJobTitle({
        jobTitle: c.jobTitle,
        profileJobRoles: c.jobRoles.map((j) => j.jobRole.name),
        liveAssignmentRole: live?.role ?? null,
        lastAssignmentRole: last?.role ?? null,
      }),
      client: live?.company.name ?? "",
      workingAt: live ? (live.site?.name ? `${live.company.name} — ${live.site.name}` : live.company.name) : "",
      workStart: live?.startDate ?? null,
      workEnd: live?.endDate ?? null,
      lastJob: last ? `${last.company.name}${last.endDate ? ` (ended ${formatDate(last.endDate)})` : ""}` : "",
      compliance: deriveComplianceStatus(c.compliances),
      // Shown in grey when there is no title; never filtered or sorted on.
      appliedFor: appliedForFromNotes(c.notes),
    };
  });

  // Dropdown options come from the unfiltered rows so choosing one never
  // empties the other lists.
  const titleOptions = [...new Set(allRows.map((r) => r.title).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const clientOptions = [...new Set(allRows.map((r) => r.client).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const contractors = sortContractorRows(
    allRows.filter(
      (r) =>
        (!f.title || (f.title === NONE ? !r.title : r.title === f.title)) &&
        (!f.working || (f.working === NONE ? !r.client : r.client === f.working)) &&
        (!f.compliance || r.compliance === f.compliance)
    ),
    f.sort,
    f.dir
  );

  return { contractors, titleOptions, clientOptions };
}

export type ContractorListRow = Awaited<ReturnType<typeof loadContractorList>>["contractors"][number];
