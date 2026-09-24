import Link from "next/link";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface AssignmentCompany {
  name: string;
}

interface AssignmentSite {
  name: string;
}

interface AssignmentDepartment {
  name: string;
}

interface AssignmentProject {
  code: string;
  name: string;
}

export interface AssignmentPanelRow {
  id: string;
  role: string;
  status: string;
  startDate: Date | string;
  endDate: Date | string | null;
  poNumber?: string | null;
  chargeRate: number | null;
  payRate: number | null;
  rateBasis: string | null;
  company: AssignmentCompany | null;
  site: AssignmentSite | null;
  department: AssignmentDepartment | null;
  project: AssignmentProject | null;
}

interface AssignmentsPanelProps {
  assignments: AssignmentPanelRow[];
}

function rateWithBasis(rate: number | null, rateBasis: string | null): string {
  if (rate == null) return "—";
  const suffix = rateBasis === "Daily" ? " / day" : rateBasis === "Hourly" ? " / hr" : "";
  return `${formatCurrency(rate)}${suffix}`;
}

export function AssignmentsPanel({ assignments }: AssignmentsPanelProps) {
  if (assignments.length === 0) {
    return <p className="text-sm text-gray-500">No assignments found.</p>;
  }

  const activeCount = assignments.filter((a) => a.status === "Active").length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium">{activeCount}</span> active assignment{activeCount !== 1 ? "s" : ""}
        {" of "}
        {assignments.length}
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ref/Project</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Site/Dept</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Dates</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Charge Rate</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Pay Rate</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Rate Basis</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {assignments.map((assignment) => {
              const siteDept = [assignment.site?.name, assignment.department?.name]
                .filter(Boolean)
                .join(" / ");
              return (
                <tr key={assignment.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {assignment.project
                      ? `${assignment.project.code} - ${assignment.project.name}`
                      : assignment.poNumber
                        ? `PO #${assignment.poNumber}`
                        : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {assignment.company?.name || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {siteDept || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {assignment.role || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {formatDate(assignment.startDate)} – {assignment.endDate ? formatDate(assignment.endDate) : "Ongoing"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <Badge variant={assignment.status}>{assignment.status || "-"}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500">
                    {rateWithBasis(assignment.chargeRate, assignment.rateBasis)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500">
                    {rateWithBasis(assignment.payRate, assignment.rateBasis)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {assignment.rateBasis || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <Link href={`/assignments/${assignment.id}`} className="font-medium text-gray-600 hover:text-gray-900">
                      View
                    </Link>
                    <Link
                      href={`/assignments/${assignment.id}/edit?from=contractor`}
                      className="ml-4 font-medium text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
