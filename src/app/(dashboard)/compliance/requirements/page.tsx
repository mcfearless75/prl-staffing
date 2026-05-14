export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { Plus, Trash2, Building2, Briefcase } from "lucide-react";
import { deleteRequirement } from "./actions";
import {
  COMPLIANCE_REQUIREMENTS,
  ROLE_CATEGORIES,
  getCellStatus,
} from "@/lib/compliance-requirements";

export default async function RequirementsPage() {
  const requirements = await prisma.complianceRequirement.findMany({
    include: { company: true },
    orderBy: [{ role: "asc" }, { type: "asc" }],
  });

  // Group by role
  const grouped = requirements.reduce(
    (acc, req) => {
      if (!acc[req.role]) acc[req.role] = [];
      acc[req.role].push(req);
      return acc;
    },
    {} as Record<string, typeof requirements>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Requirements"
        description="Define what compliance checks are required per role and site"
        action={
          <div className="flex gap-2">
            <Link
              href="/compliance"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/compliance/requirements/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Requirement
            </Link>
          </div>
        }
      />

      {Object.keys(grouped).length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">
            No requirements configured
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Define compliance checklists per role to enforce standards across
            your workforce.
          </p>
          <Link
            href="/compliance/requirements/new"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Create your first requirement
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([role, reqs]) => (
            <div
              key={role}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-6 py-3">
                <Briefcase className="h-5 w-5 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">{role}</h3>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {reqs.length} requirement{reqs.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {reqs.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={req.isMandatory ? "Expired" : "Pending"}
                      >
                        {req.isMandatory ? "Mandatory" : "Optional"}
                      </Badge>
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {req.type}
                        </span>
                        {req.description && (
                          <span className="ml-2 text-sm text-gray-400">
                            — {req.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {req.company ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Building2 className="h-3 w-3" />
                          {req.company.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          All sites
                        </span>
                      )}
                      <form
                        action={deleteRequirement.bind(null, req.id)}
                      >
                        <button
                          type="submit"
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Static requirements matrix */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Standard Requirements Matrix
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Mandatory document types by contractor role category
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-40">
                  Document Type
                </th>
                {ROLE_CATEGORIES.map((role) => (
                  <th
                    key={role}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    {role}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {COMPLIANCE_REQUIREMENTS.map((req) => (
                <tr key={req.type} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {req.type}
                  </td>
                  {ROLE_CATEGORIES.map((role) => {
                    const status = getCellStatus(req, role);
                    return (
                      <td key={role} className="px-4 py-3 text-center">
                        {status === "mandatory" && (
                          <span
                            className="inline-flex items-center justify-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700"
                            title="Mandatory"
                          >
                            Required
                          </span>
                        )}
                        {status === "optional" && (
                          <span
                            className="text-gray-400 text-xs"
                            title="Optional"
                          >
                            Optional
                          </span>
                        )}
                        {status === "na" && (
                          <span className="text-gray-200 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-6 py-3 text-xs text-gray-500">
                    {req.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-3">
          <p className="text-xs text-gray-400">
            These requirements are used to automatically identify compliance gaps per contractor.
          </p>
        </div>
      </div>
    </div>
  );
}
