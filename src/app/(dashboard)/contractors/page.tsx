export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, getInitials, getStatusColor } from "@/lib/utils";
import { Plus, Search, Upload, ArrowUpDown } from "lucide-react";
import { ContractorStatusSelect } from "@/components/contractor-status-select";

type ComplianceStatus = "Verified" | "Expiring" | "Pending" | "Non-Compliant" | "No Records";

function deriveComplianceStatus(records: { status: string }[]): ComplianceStatus {
  if (records.length === 0) return "No Records";
  const statuses = records.map((r) => r.status);
  if (statuses.some((s) => s === "Expired" || s === "Non-Compliant")) return "Non-Compliant";
  if (statuses.some((s) => s === "Expiring")) return "Expiring";
  if (statuses.some((s) => s === "Pending")) return "Pending";
  if (statuses.every((s) => s === "Verified")) return "Verified";
  return "Pending";
}

function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const styles: Record<ComplianceStatus, string> = {
    Verified: "bg-emerald-100 text-emerald-700",
    Expiring: "bg-amber-100 text-amber-700",
    Pending: "bg-gray-100 text-gray-600",
    "Non-Compliant": "bg-red-100 text-red-700",
    "No Records": "bg-gray-100 text-gray-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string; sortBy?: string }>;
}) {
  const params = await searchParams;
  const search = params?.search || "";
  const status = params?.status || "";
  const sortBy = params?.sortBy === "firstName" ? "firstName" : "lastName";

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
    include: {
      supplier: true,
      compliances: { select: { id: true, status: true, type: true } },
    },
    orderBy: sortBy === "firstName" ? { firstName: "asc" } : { lastName: "asc" },
  });

  // Build sort-toggle URL (flip between firstName / lastName, keep other params)
  const nextSort = sortBy === "lastName" ? "firstName" : "lastName";
  const sortToggleHref = `/contractors?sortBy=${nextSort}${search ? `&search=${encodeURIComponent(search)}` : ""}${status ? `&status=${encodeURIComponent(status)}` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractors"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/contractors/import"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Import
            </Link>
            <Link
              href="/contractors/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Contractor
            </Link>
          </div>
        }
      />

      {/* Quick-filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "All", value: "", color: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
          { label: "New", value: "New", color: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" },
          { label: "Active", value: "Active", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
          { label: "Suspended", value: "Suspended", color: "bg-red-100 text-red-700 hover:bg-red-200" },
          { label: "Inactive", value: "Inactive", color: "bg-gray-100 text-gray-600 hover:bg-gray-200" },
          { label: "Left", value: "Left", color: "bg-rose-100 text-rose-700 hover:bg-rose-200" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/contractors?status=${encodeURIComponent(tab.value)}${search ? `&search=${encodeURIComponent(search)}` : ""}${sortBy !== "lastName" ? `&sortBy=${sortBy}` : ""}` : "/contractors"}
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
          <option value="New">New</option>
          <option value="Active">Active</option>
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
                  <Link href={sortToggleHref} className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors">
                    Name
                    <ArrowUpDown className="h-3 w-3" />
                    <span className="normal-case font-normal text-gray-400">({sortBy === "firstName" ? "first" : "last"})</span>
                  </Link>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Job Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Compliance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
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
                      <Link
                        href={`/contractors/${contractor.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {contractor.firstName} {contractor.lastName}
                      </Link>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {contractor.email}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {contractor.jobTitle || "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link href={`/compliance?search=${encodeURIComponent(contractor.firstName + " " + contractor.lastName)}`}>
                      <ComplianceBadge status={deriveComplianceStatus(contractor.compliances)} />
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <ContractorStatusSelect id={contractor.id} status={contractor.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/contractors/${contractor.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                      <Link
                        href={`/contractors/${contractor.id}/edit`}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </Link>
                    </div>
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
