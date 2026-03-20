export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { createRequirement } from "../actions";

const COMPLIANCE_TYPES = [
  "Right to Work",
  "DBS",
  "CSCS",
  "Insurance",
  "IR35 Assessment",
  "Qualification",
  "Other",
];

const COMMON_ROLES = [
  "All",
  "Electrician",
  "Plumber",
  "Labourer",
  "Carpenter",
  "Bricklayer",
  "Plasterer",
  "Painter",
  "Scaffolder",
  "Plant Operator",
  "Site Manager",
  "Project Manager",
  "Quantity Surveyor",
  "Health & Safety Officer",
];

export default async function NewRequirementPage() {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Add Compliance Requirement" />

      <div className="mx-auto max-w-2xl">
        <form action={createRequirement} className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
            {/* Role */}
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {COMMON_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role === "All" ? "All Roles (applies to everyone)" : role}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Select &quot;All&quot; to apply this requirement to every
                contractor regardless of role
              </p>
            </div>

            {/* Company / Site */}
            <div>
              <label
                htmlFor="companyId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Site / Company
              </label>
              <select
                id="companyId"
                name="companyId"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Sites (applies everywhere)</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Compliance Type */}
            <div>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Compliance Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {COMPLIANCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <input
                id="description"
                name="description"
                type="text"
                placeholder="e.g. NVQ Level 3, Blue CSCS Card required"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Mandatory */}
            <div>
              <label
                htmlFor="isMandatory"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
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
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/compliance/requirements"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Add Requirement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
