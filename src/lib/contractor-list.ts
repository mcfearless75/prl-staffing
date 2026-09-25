/**
 * Row logic for the Subcontractors list: which job title to show, and sorting.
 *
 * A person's role is recorded in three places that nothing keeps in step:
 * Contractor.jobTitle, the profile's Job Roles multi-select, and each
 * assignment's role. The list used to show only jobTitle, so people whose
 * role lived in one of the other two showed a blank column while their
 * profile plainly had a role.
 */

export interface TitleSources {
  jobTitle: string | null;
  profileJobRoles: string[];
  liveAssignmentRole: string | null;
  /** Role on their most recent ended job, so Inactive people aren't blank. */
  lastAssignmentRole?: string | null;
}

/** First non-blank of: jobTitle, profile Job Roles, current job's role, last job's role. */
export function effectiveJobTitle(s: TitleSources): string {
  const title = s.jobTitle?.trim();
  if (title) return title;
  const roles = s.profileJobRoles.map((r) => r.trim()).filter(Boolean);
  if (roles.length) return roles.join(", ");
  return s.liveAssignmentRole?.trim() || s.lastAssignmentRole?.trim() || "";
}

/**
 * "Positions Sought" from the application, which /apply stores as JSON in
 * Contractor.notes. Display only: it is what the person asked for, typed
 * freely ("Any", several trades at once), so it is never used as a job title.
 * Job title feeds compliance role matching, and this text would pollute it.
 */
export function appliedForFromNotes(notes: string | null): string {
  if (!notes) return "";
  try {
    const data = JSON.parse(notes);
    return data && typeof data === "object" ? String(data.positionsSought ?? "").trim() : "";
  } catch {
    return "";
  }
}

export const CONTRACTOR_SORTS = ["last", "first", "email", "title", "working", "compliance", "status"] as const;
export type ContractorSort = (typeof CONTRACTOR_SORTS)[number];

export function parseContractorSort(sort: string | undefined, legacySortBy?: string): ContractorSort {
  if (sort && (CONTRACTOR_SORTS as readonly string[]).includes(sort)) return sort as ContractorSort;
  return legacySortBy === "firstName" ? "first" : "last";
}

// Worst first, so ascending compliance puts the people who need chasing on top.
const COMPLIANCE_RANK: Record<string, number> = {
  "Non-Compliant": 0,
  Expiring: 1,
  Pending: 2,
  "No Records": 3,
  Verified: 4,
};

export interface SortableRow {
  firstName: string;
  lastName: string;
  email: string | null;
  title: string;
  workingAt: string;
  compliance: string;
  status: string;
}

function key(row: SortableRow, sort: ContractorSort): string | number {
  switch (sort) {
    case "first": return row.firstName;
    case "last": return row.lastName;
    case "email": return row.email || "";
    case "title": return row.title;
    case "working": return row.workingAt;
    case "compliance": return COMPLIANCE_RANK[row.compliance] ?? 99;
    case "status": return row.status;
  }
}

/**
 * Sorts a copy. Blank values always go last in either direction, so sorting by
 * Job Title never opens on a page of dashes. Ties fall back to surname.
 */
export function sortContractorRows<T extends SortableRow>(rows: T[], sort: ContractorSort, dir: "asc" | "desc"): T[] {
  const sign = dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const ka = key(a, sort);
    const kb = key(b, sort);
    const blankA = ka === "";
    const blankB = kb === "";
    if (blankA !== blankB) return blankA ? 1 : -1;
    const cmp =
      typeof ka === "number" && typeof kb === "number"
        ? ka - kb
        : String(ka).localeCompare(String(kb), "en-GB", { sensitivity: "base" });
    if (cmp !== 0) return cmp * sign;
    return a.lastName.localeCompare(b.lastName, "en-GB", { sensitivity: "base" });
  });
}
