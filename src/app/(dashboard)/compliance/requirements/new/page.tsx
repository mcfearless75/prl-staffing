export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { AlertTriangle } from "lucide-react";
import { createRequirement } from "../actions";
import { TypePicker } from "../type-picker";
import { CANONICAL_ROLES, resolveRole } from "@/lib/role-normalisation";

const ACTIVE_STATUSES = ["Placed", "Active", "Ending"];

/**
 * Roles are offered from the canonical vocabulary, annotated with how many
 * assigned contractors currently resolve to each one. The previous version of
 * this form offered a hardcoded list ("Plumber", "Bricklayer", "Quantity
 * Surveyor") that matched almost nothing in the live data and omitted the roles
 * PRL actually staffs — so any rule created here was likely to apply to nobody.
 */
async function getRoleUsage() {
  const assignments = await prisma.assignment.findMany({
    where: { status: { in: ACTIVE_STATUSES } },
    select: { role: true, contractorId: true, contractor: { select: { jobTitle: true } } },
  });

  const byContractor = new Map<string, string | null>();
  for (const a of assignments) {
    if (byContractor.get(a.contractorId)) continue;
    byContractor.set(a.contractorId, resolveRole(a.role, a.contractor.jobTitle).canonical);
  }

  const counts = new Map<string, number>();
  let unknown = 0;
  for (const role of byContractor.values()) {
    if (!role) unknown++;
    else counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  return { counts, unknown, total: byContractor.size };
}

export default async function NewRequirementPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string }>;
}) {
  const params = await searchParams;
  const [companies, usage] = await Promise.all([
    prisma.company.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getRoleUsage(),
  ]);

  // Roles in use first (with counts), then the rest of the vocabulary.
  const inUse = CANONICAL_ROLES.filter((r) => usage.counts.has(r)).sort(
    (a, b) => (usage.counts.get(b) ?? 0) - (usage.counts.get(a) ?? 0)
  );
  const notInUse = CANONICAL_ROLES.filter((r) => !usage.counts.has(r));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Compliance Requirements"
        description="Define the documents a role must hold. One role, as many document types as you need."
      />

      <div className="mx-auto max-w-3xl space-y-4">
        {params.error === "missing" && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Pick a role and at least one document type.
          </div>
        )}

        <form action={createRequirement} className="space-y-6">
          <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
            <div>
              <label htmlFor="role" className="mb-1 block text-sm font-medium text-gray-700">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                required
                defaultValue={params.role ?? "All"}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="All">
                  All roles — applies to everyone ({usage.total} assigned)
                </option>
                {inUse.length > 0 && (
                  <optgroup label="Roles currently in the workforce">
                    {inUse.map((role) => (
                      <option key={role} value={role}>
                        {role} ({usage.counts.get(role)})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Other roles (nobody currently assigned)">
                  {notInUse.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Numbers show how many assigned subcontractors this rule would apply to today.
                Day and night shifts share a role — “Labourer Nights” is matched by “Labourer”.
              </p>
            </div>

            {usage.unknown > 0 && (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-900">
                  <strong>{usage.unknown} of {usage.total} assigned subcontractors have no role
                  recorded</strong> on their assignment or profile. Per-role rules cannot reach
                  them — only an “All roles” rule will. Setting their role is what makes per-role
                  requirements work across the whole workforce.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="companyId" className="mb-1 block text-sm font-medium text-gray-700">
                Client / Site
              </label>
              <select
                id="companyId"
                name="companyId"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All clients — applies everywhere</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Use this for client-specific extras, e.g. a site that insists on CCNSG on top of
                the standard checklist.
              </p>
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Required documents <span className="text-red-500">*</span>
              </span>
              <TypePicker />
            </div>

            <div>
              <label htmlFor="isMandatory" className="mb-1 block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                id="isMandatory"
                name="isMandatory"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="true">Mandatory — must be verified before starting</option>
                <option value="false">Optional — recommended but not blocking</option>
              </select>
            </div>

            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
                Note
              </label>
              <input
                id="description"
                name="description"
                type="text"
                placeholder="e.g. Blue card minimum — green not accepted on this site"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Applied to every document selected above.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/compliance/requirements"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Save requirements
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
