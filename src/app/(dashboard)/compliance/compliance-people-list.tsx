import Link from "next/link";
import { Badge } from "@/components/badge";
import type { CompliancePerson } from "@/lib/compliance-score";

export type PeopleGroupKey = "compliant" | "expiring" | "action" | "pending";

export const PEOPLE_GROUP_LABEL: Record<PeopleGroupKey, string> = {
  compliant: "Fully Compliant",
  expiring: "Expiring Soon",
  action: "Action Required",
  pending: "Pending Review",
};

/** Which score groups each tile covers. "Action Required" includes people whose role has no checklist. */
export function inTileGroup(person: CompliancePerson, key: PeopleGroupKey): boolean {
  switch (key) {
    case "compliant": return person.group === "compliant";
    case "expiring": return person.group === "expiring";
    case "pending": return person.group === "pending";
    case "action": return person.group === "actionRequired" || person.group === "noRequirements";
  }
}

type Row = CompliancePerson & { firstName: string; lastName: string };

/**
 * The people behind a summary tile. Built from the same per-person result as
 * the tile's number, so the list length always equals the tile.
 */
export function CompliancePeopleList({ groupKey, rows }: { groupKey: PeopleGroupKey; rows: Row[] }) {
  return (
    <div id="people" className="scroll-mt-4 rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-sm font-semibold text-gray-900">
          {PEOPLE_GROUP_LABEL[groupKey]} <span className="font-normal text-gray-400">({rows.length} people)</span>
        </h2>
        <Link href="/compliance" className="text-xs font-medium text-blue-600 hover:underline">
          Close
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-gray-500">Nobody in this group.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((p) => (
            <li key={p.contractorId} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
              <div>
                <Link href={`/contractors/${p.contractorId}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                  {p.firstName} {p.lastName}
                </Link>
                <p className="text-xs text-gray-500">{p.role || "No role recorded"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {p.group === "noRequirements" ? (
                  <Link href="/compliance/requirements" className="text-xs text-amber-700 underline">
                    No requirements set for this role
                  </Link>
                ) : p.issues.length === 0 ? (
                  <span className="text-xs text-emerald-700">All required documents verified</span>
                ) : (
                  p.issues.map((i) => (
                    <span key={i.type} className="inline-flex items-center gap-1 text-xs text-gray-700">
                      {i.type}
                      <Badge variant={i.status === "Missing" ? "Non-Compliant" : i.status}>{i.status}</Badge>
                    </span>
                  ))
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
