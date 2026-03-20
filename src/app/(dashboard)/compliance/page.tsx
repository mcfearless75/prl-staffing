export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, getInitials } from "@/lib/utils";
import { Plus, ShieldCheck, AlertTriangle, XCircle, Search } from "lucide-react";

export default async function CompliancePage({
  searchParams,
}: {
  searchParams?: { search?: string; status?: string; type?: string };
}) {
  const search = searchParams?.search || "";
  const status = searchParams?.status || "";
  const type = searchParams?.type || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.contractor = {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  const records = await prisma.complianceRecord.findMany({
    where,
    include: { contractor: true },
    orderBy: { expiryDate: "asc" },
  });

  // Summary counts
  const allRecords = await prisma.complianceRecord.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  const counts = {
    Verified: 0,
    Pending: 0,
    Expiring: 0,
    Expired: 0,
    "Non-Compliant": 0,
  };

  for (const r of allRecords) {
    if (r.status in counts) {
      counts[r.status as keyof typeof counts] = r._count.status;
    }
  }

  function getRowBorderColor(recordStatus: string) {
    switch (recordStatus) {
      case "Expiring":
        return "border-l-4 border-l-amber-400";
      case "Expired":
      case "Non-Compliant":
        return "border-l-4 border-l-red-400";
      default:
        return "";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        action={
          <Link
            href="/compliance/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Record
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{counts.Verified}</p>
              <p className="text-xs font-medium text-emerald-600">Verified</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">{counts.Pending}</p>
              <p className="text-xs font-medium text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{counts.Expiring}</p>
              <p className="text-xs font-medium text-amber-600">Expiring</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">
                {counts.Expired + counts["Non-Compliant"]}
              </p>
              <p className="text-xs font-medium text-red-600">Expired / Non-Compliant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <form method="GET" className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            placeholder="Search by contractor name..."
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
          <option value="Verified">Verified</option>
          <option value="Pending">Pending</option>
          <option value="Expiring">Expiring</option>
          <option value="Expired">Expired</option>
          <option value="Non-Compliant">Non-Compliant</option>
        </select>
        <select
          name="type"
          defaultValue={type}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="CSCS">CSCS</option>
          <option value="DBS">DBS</option>
          <option value="Right to Work">Right to Work</option>
          <option value="Insurance">Insurance</option>
          <option value="IR35 Assessment">IR35 Assessment</option>
          <option value="Qualification">Qualification</option>
          <option value="Other">Other</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Compliance Table */}
      {records.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contractor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Document / Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Issue Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Expiry Date
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
              {records.map((record) => (
                <tr
                  key={record.id}
                  className={`hover:bg-gray-50 transition-colors ${getRowBorderColor(record.status)}`}
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                        {getInitials(
                          record.contractor.firstName,
                          record.contractor.lastName
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {record.contractor.firstName} {record.contractor.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {record.type}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <div>
                      {record.documentName && (
                        <span className="text-gray-900">{record.documentName}</span>
                      )}
                      {record.reference && (
                        <span className="ml-2 text-gray-400">#{record.reference}</span>
                      )}
                      {!record.documentName && !record.reference && "—"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {record.issueDate ? formatDate(record.issueDate) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {record.expiryDate ? formatDate(record.expiryDate) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge variant={record.status}>{record.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link
                      href={`/compliance/${record.id}`}
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
            No compliance records found.{" "}
            {search || status || type ? (
              <Link href="/compliance" className="text-blue-600 hover:underline">
                Clear filters
              </Link>
            ) : (
              <Link href="/compliance/new" className="text-blue-600 hover:underline">
                Add your first compliance record
              </Link>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
