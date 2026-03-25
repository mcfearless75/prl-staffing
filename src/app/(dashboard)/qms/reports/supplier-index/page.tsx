export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  "Tier 1": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Tier 2": "bg-gray-100 text-gray-700 border-gray-300",
  "Tier 3": "bg-orange-100 text-orange-800 border-orange-300",
};

function TierBadge({ tier }: { tier: string }) {
  const tierLabel =
    tier === "Tier 1" ? "Gold" : tier === "Tier 2" ? "Silver" : tier === "Tier 3" ? "Bronze" : "Standard";
  const color = TIER_COLORS[tier] || "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {tierLabel}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-500"
      : score >= 60
        ? "bg-yellow-500"
        : score >= 40
          ? "bg-orange-500"
          : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700">{score}%</span>
    </div>
  );
}

export default async function SupplierIndexPage() {
  const suppliers = await prisma.supplier.findMany({
    include: {
      _count: { select: { contractors: true } },
    },
    orderBy: { name: "asc" },
  });

  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter((s) => s.isActive).length;
  const tier1Count = suppliers.filter((s) => s.tier === "Tier 1").length;
  const tier2Count = suppliers.filter((s) => s.tier === "Tier 2").length;
  const tier3Count = suppliers.filter((s) => s.tier === "Tier 3").length;

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approved Supplier Index"
        description="ISO 9001 supplier register with tier classification and performance scores"
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/qms/reports"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Reports
            </Link>
            <a
              href="/api/qms-reports/supplier-index"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              Export to Excel
            </a>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalSuppliers}</p>
          <p className="text-xs text-gray-500">Total Suppliers</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-2xl font-bold text-emerald-700">{activeSuppliers}</p>
          <p className="text-xs text-emerald-600">Active</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-center">
          <div className="flex items-center justify-center gap-1">
            <p className="text-2xl font-bold text-yellow-700">{tier1Count}</p>
          </div>
          <p className="text-xs text-yellow-600">Gold (Tier 1)</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
          <p className="text-2xl font-bold text-gray-700">{tier2Count}</p>
          <p className="text-xs text-gray-500">Silver (Tier 2)</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 text-center">
          <p className="text-2xl font-bold text-orange-700">{tier3Count}</p>
          <p className="text-xs text-orange-600">Bronze (Tier 3)</p>
        </div>
      </div>

      {/* Supplier Table */}
      {suppliers.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Supplier Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contractors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Last Reviewed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-purple-100 p-1.5">
                        <Building2 className="h-4 w-4 text-purple-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {supplier.name}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <TierBadge tier={supplier.tier} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {supplier.contactName || "\u2014"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {supplier.contactEmail || "\u2014"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {supplier.contactPhone || "\u2014"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <ScoreBar score={supplier.score} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        supplier.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {supplier.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {supplier._count.contractors}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(supplier.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">No suppliers found.</p>
        </div>
      )}

      <div className="text-xs text-gray-400">
        {totalSuppliers} supplier{totalSuppliers !== 1 ? "s" : ""} total
      </div>
    </div>
  );
}
