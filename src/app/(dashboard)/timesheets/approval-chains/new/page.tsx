export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { createApprovalChain } from "../actions";

export default async function NewApprovalChainPage() {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  // Find companies that already have a chain
  const existingChains = await prisma.approvalChain.findMany({
    select: { companyId: true },
  });
  const companiesWithChain = new Set(existingChains.map((c) => c.companyId));

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Approval Chain"
        description="Configure a multi-step approval workflow for timesheets"
      />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <form action={createApprovalChain} className="space-y-6">
          {/* Chain Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Chain Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="e.g., Standard 2-Step Approval"
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Company */}
          <div>
            <label htmlFor="companyId" className="block text-sm font-medium text-gray-700">
              Company
            </label>
            <select
              id="companyId"
              name="companyId"
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Default (all companies without a specific chain)</option>
              {companies
                .filter((c) => !companiesWithChain.has(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Each company can only have one approval chain. Leave blank for a default chain.
            </p>
          </div>

          {/* Approval Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Approval Steps <span className="text-red-500">*</span>
            </label>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  1
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="step_1_label"
                    required
                    placeholder="Step label (e.g., Line Manager)"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select
                    name="step_1_role"
                    className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  2
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="step_2_label"
                    placeholder="Step label (e.g., Site Manager)"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select
                    name="step_2_role"
                    className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  3
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="step_3_label"
                    placeholder="Step label (e.g., Finance)"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select
                    name="step_3_role"
                    className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Fill in at least Step 1. Leave steps blank to skip them. Steps execute in order.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Create Approval Chain
            </button>
            <Link
              href="/timesheets/approval-chains"
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
