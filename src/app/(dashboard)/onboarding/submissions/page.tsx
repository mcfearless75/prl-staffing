export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDate, getInitials } from "@/lib/utils";
import { Badge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { ExternalLink } from "lucide-react";
import { NewSupplierButton } from "./new-supplier-button";
import { MetlenInductionButton } from "./metlen-induction-button";

export default async function OnboardingSubmissionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filterStatus = params?.status || "";

  const where: Record<string, unknown> = {};
  if (filterStatus) where.status = filterStatus;

  const submissions = await prisma.supplyAgreement.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const counts = {
    total: submissions.length,
    pending: await prisma.supplyAgreement.count({ where: { status: "Pending" } }),
    reviewed: await prisma.supplyAgreement.count({ where: { status: "Reviewed" } }),
    approved: await prisma.supplyAgreement.count({ where: { status: "Approved" } }),
    rejected: await prisma.supplyAgreement.count({ where: { status: "Rejected" } }),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding Submissions"
        action={
          <div className="flex items-center gap-3">
            <MetlenInductionButton />
            <NewSupplierButton />
            <a
              href="/onboarding"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Public Form
            </a>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link href="/onboarding/submissions?status=Pending" className={`rounded-xl border p-4 text-center transition-all hover:shadow-md ${filterStatus === "Pending" ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white"}`}>
          <p className="text-2xl font-bold text-amber-600">{counts.pending}</p>
          <p className="text-xs text-gray-500 mt-1">Pending</p>
        </Link>
        <Link href="/onboarding/submissions?status=Reviewed" className={`rounded-xl border p-4 text-center transition-all hover:shadow-md ${filterStatus === "Reviewed" ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"}`}>
          <p className="text-2xl font-bold text-blue-600">{counts.reviewed}</p>
          <p className="text-xs text-gray-500 mt-1">Reviewed</p>
        </Link>
        <Link href="/onboarding/submissions?status=Approved" className={`rounded-xl border p-4 text-center transition-all hover:shadow-md ${filterStatus === "Approved" ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-white"}`}>
          <p className="text-2xl font-bold text-emerald-600">{counts.approved}</p>
          <p className="text-xs text-gray-500 mt-1">Approved</p>
        </Link>
        <Link href="/onboarding/submissions?status=Rejected" className={`rounded-xl border p-4 text-center transition-all hover:shadow-md ${filterStatus === "Rejected" ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"}`}>
          <p className="text-2xl font-bold text-red-600">{counts.rejected}</p>
          <p className="text-xs text-gray-500 mt-1">Rejected</p>
        </Link>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2">
        <Link href="/onboarding/submissions" className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${!filterStatus ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          All ({counts.total})
        </Link>
        {["Pending", "Reviewed", "Approved", "Rejected"].map((s) => (
          <Link key={s} href={`/onboarding/submissions?status=${s}`} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filterStatus === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s}
          </Link>
        ))}
      </div>

      {/* Submissions Table */}
      {submissions.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Supply Of</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {submissions.map((sub) => (
                <tr key={sub.id} className={`hover:bg-gray-50 transition-colors ${sub.status === "Pending" ? "bg-amber-50/40" : ""}`}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                        {getInitials(sub.contactName.split(" ")[0] || "", sub.contactName.split(" ").slice(1).join(" ") || "")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{sub.contactName}</p>
                        <p className="text-xs text-gray-500">{sub.contactEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{sub.companyName}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{sub.supplyOf || "—"}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatDate(sub.createdAt)}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge variant={sub.status}>{sub.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link href={`/onboarding/submissions/${sub.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      Review
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
            No {filterStatus?.toLowerCase()} submissions found.{" "}
            <Link href="/onboarding/submissions" className="text-blue-600 hover:underline">View all</Link>
          </p>
        </div>
      )}

      {/* Public Form Link */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Share this link with new contractors/suppliers:</strong>
        </p>
        <code className="mt-1 block text-sm text-blue-600 bg-white rounded px-3 py-2 border border-blue-200">
          {process.env.NEXTAUTH_URL || "https://prl-staffing-production.up.railway.app"}/onboarding
        </code>
      </div>
    </div>
  );
}
