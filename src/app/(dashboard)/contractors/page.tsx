export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, getInitials, getStatusColor } from "@/lib/utils";
import { Plus, Search } from "lucide-react";
import { ContractorStatusSelect } from "@/components/contractor-status-select";

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const search = params?.search || "";
  const status = params?.status || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const contractors = await prisma.contractor.findMany({
    where,
    include: { supplier: true },
    orderBy: { lastName: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractors"
        action={
          <Link
            href="/contractors/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Contractor
          </Link>
        }
      />

      {/* Quick-filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "All", value: "", color: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
          { label: "Applied", value: "Applied", color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
          { label: "New", value: "New", color: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" },
          { label: "Active", value: "Active", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
          { label: "On Site", value: "On Site", color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
          { label: "Benched", value: "Benched", color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
          { label: "Pending Docs", value: "Pending Docs", color: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
          { label: "Suspended", value: "Suspended", color: "bg-red-100 text-red-700 hover:bg-red-200" },
          { label: "Inactive", value: "Inactive", color: "bg-gray-100 text-gray-600 hover:bg-gray-200" },
          { label: "Left", value: "Left", color: "bg-rose-100 text-rose-700 hover:bg-rose-200" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/contractors?status=${encodeURIComponent(tab.value)}${search ? `&search=${encodeURIComponent(search)}` : ""}` : "/contractors"}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${tab.color} ${status === tab.value ? "ring-2 ring-offset-1 ring-current" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Filter Bar */}
      <form method="GET" className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            placeholder="Search by name or email..."
            defaultValue={search}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="Applied">Applied</option>
          <option value="New">New</option>
          <option value="Active">Active</option>
          <option value="On Site">On Site</option>
          <option value="Benched">Benched</option>
          <option value="Pending Docs">Pending Docs</option>
          <option value="Suspended">Suspended</option>
          <option value="Inactive">Inactive</option>
          <option value="Left">Left</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Contractors Table */}
      {contractors.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Job Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Day Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Supplier
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contractors.map((contractor) => (
                <tr
                  key={contractor.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                        {getInitials(contractor.firstName, contractor.lastName)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {contractor.firstName} {contractor.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {contractor.email}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {contractor.jobTitle || "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {contractor.dayRate
                      ? `£${contractor.dayRate.toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <ContractorStatusSelect id={contractor.id} status={contractor.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {contractor.supplier?.name || "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link
                      href={`/contractors/${contractor.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No contractors found.{" "}
            {search || status ? (
              <Link href="/contractors" className="text-blue-600 hover:underline">
                Clear filters
              </Link>
            ) : (
              <Link href="/contractors/new" className="text-blue-600 hover:underline">
                Add your first contractor
              </Link>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
