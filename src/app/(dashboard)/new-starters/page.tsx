export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, maskNI } from "@/lib/utils";

const STATUSES = ["New", "Processed", "Rejected"] as const;

export default async function NewStartersPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const statusFilter = params?.status || "";

  const where = statusFilter && statusFilter !== "All" ? { status: statusFilter } : {};

  const [submissions, counts] = await Promise.all([
    prisma.newStarterSubmission.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.newStarterSubmission.groupBy({ by: ["status"], _count: { status: true } }),
  ]);

  const countMap: Record<string, number> = { New: 0, Processed: 0, Rejected: 0 };
  for (const c of counts) countMap[c.status] = c._count.status;

  const badgeVariant = (status: string) =>
    status === "Processed" ? "Active" : status === "Rejected" ? "Inactive" : "Pending";

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Starter Checklists"
        description={`${countMap.New} awaiting review — HMRC starter declarations from the public new-starter form`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{countMap.New}</p>
          <p className="text-xs font-medium text-amber-600">Awaiting review</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{countMap.Processed}</p>
          <p className="text-xs font-medium text-emerald-600">Processed</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold text-gray-600">{countMap.Rejected}</p>
          <p className="text-xs font-medium text-gray-500">Rejected</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {["All", ...STATUSES].map((s) => (
          <Link
            key={s}
            href={s === "All" ? "/new-starters" : `/new-starters?status=${s}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              (s === "All" ? !statusFilter || statusFilter === "All" : statusFilter === s)
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {submissions.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Statement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">NI Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Submitted</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      s.status === "New" ? "bg-amber-50/40" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{s.email}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{s.phone}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{s.employmentStartDate}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{s.employeeStatement}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {s.niNumber ? maskNI(s.niNumber) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge variant={badgeVariant(s.status)}>{s.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatDate(s.createdAt)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link
                        href={`/new-starters/${s.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {s.status === "New" ? "Review" : "View"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            {statusFilter && statusFilter !== "All"
              ? `No ${statusFilter.toLowerCase()} checklists.`
              : "No new starter checklists submitted yet."}
          </p>
        </div>
      )}
    </div>
  );
}
