export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

function getRiskLevelColor(level: string) {
  switch (level) {
    case "Critical": return "bg-red-100 text-red-700";
    case "High": return "bg-orange-100 text-orange-700";
    case "Medium": return "bg-yellow-100 text-yellow-700";
    case "Low": return "bg-green-100 text-green-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

function getMatrixCellColor(score: number) {
  if (score >= 16) return "bg-red-500 text-white";
  if (score >= 10) return "bg-orange-400 text-white";
  if (score >= 5) return "bg-yellow-300 text-yellow-900";
  return "bg-green-300 text-green-900";
}

export default async function RiskRegisterPage({
  searchParams,
}: {
  searchParams?: Promise<{ level?: string; category?: string; status?: string }>;
}) {
  const params = await searchParams;
  const level = params?.level || "";
  const category = params?.category || "";
  const status = params?.status || "";

  const where: Record<string, unknown> = {};
  if (level) where.riskLevel = level;
  if (category) where.category = category;
  if (status) where.status = status;

  const [risks, critical, high, medium, low] = await Promise.all([
    prisma.risk.findMany({ where, orderBy: { riskScore: "desc" } }),
    prisma.risk.count({ where: { riskLevel: "Critical", status: "Active" } }),
    prisma.risk.count({ where: { riskLevel: "High", status: "Active" } }),
    prisma.risk.count({ where: { riskLevel: "Medium", status: "Active" } }),
    prisma.risk.count({ where: { riskLevel: "Low", status: "Active" } }),
  ]);

  // Build risk matrix: count of active risks per cell
  const activeRisks = await prisma.risk.findMany({
    where: { status: "Active" },
    select: { likelihood: true, impact: true },
  });
  const matrixCounts: Record<string, number> = {};
  for (const r of activeRisks) {
    const key = `${r.likelihood}-${r.impact}`;
    matrixCounts[key] = (matrixCounts[key] || 0) + 1;
  }

  const likelihoodLabels = ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
  const impactLabels = ["Negligible", "Minor", "Moderate", "Major", "Catastrophic"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Register"
        action={
          <Link
            href="/qms/risk-register/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Risk
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-2xl font-bold text-red-700">{critical}</p>
          <p className="text-xs text-red-600">Critical</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-2xl font-bold text-orange-700">{high}</p>
          <p className="text-xs text-orange-600">High</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <p className="text-2xl font-bold text-yellow-700">{medium}</p>
          <p className="text-xs text-yellow-600">Medium</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-2xl font-bold text-green-700">{low}</p>
          <p className="text-xs text-green-600">Low</p>
        </div>
      </div>

      {/* 5x5 Risk Matrix */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Risk Matrix (Likelihood x Impact)</h2>
        <div className="overflow-x-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="w-28 p-2 text-xs font-medium text-gray-500"></th>
                {impactLabels.map((label, i) => (
                  <th key={i} className="p-2 text-center text-xs font-medium text-gray-500 min-w-[72px]">
                    {label}<br />({i + 1})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[5, 4, 3, 2, 1].map((l) => (
                <tr key={l}>
                  <td className="p-2 text-xs font-medium text-gray-500 text-right pr-3">
                    {likelihoodLabels[l - 1]} ({l})
                  </td>
                  {[1, 2, 3, 4, 5].map((imp) => {
                    const score = l * imp;
                    const count = matrixCounts[`${l}-${imp}`] || 0;
                    return (
                      <td key={imp} className="p-1">
                        <div
                          className={`flex flex-col items-center justify-center rounded-lg h-14 w-[72px] text-xs font-semibold ${getMatrixCellColor(score)}`}
                        >
                          <span>{score}</span>
                          {count > 0 && (
                            <span className="text-[10px] font-bold mt-0.5 opacity-80">
                              ({count})
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-green-300"></span> Low (1-4)</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-yellow-300"></span> Medium (5-9)</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-orange-400"></span> High (10-15)</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-red-500"></span> Critical (16-25)</span>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-center gap-4">
        <select
          name="level"
          defaultValue={level}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Levels</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select
          name="category"
          defaultValue={category}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          <option value="Operational">Operational</option>
          <option value="Financial">Financial</option>
          <option value="Compliance">Compliance</option>
          <option value="Reputational">Reputational</option>
          <option value="H&S">H&amp;S</option>
          <option value="IT/Data">IT/Data</option>
        </select>
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Mitigated">Mitigated</option>
          <option value="Closed">Closed</option>
          <option value="Accepted">Accepted</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Risks Table */}
      {risks.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Risk Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">L x I = Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Review Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {risks.map((risk) => (
                <tr key={risk.id} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {risk.riskNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {risk.title}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {risk.category}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 font-mono">
                    {risk.likelihood} x {risk.impact} = {risk.riskScore}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRiskLevelColor(risk.riskLevel)}`}>
                      {risk.riskLevel}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {risk.owner}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {risk.reviewDate ? formatDate(risk.reviewDate) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge variant={risk.status}>{risk.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link
                      href={`/qms/risk-register/${risk.id}`}
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
            No risks found.{" "}
            {level || category || status ? (
              <Link href="/qms/risk-register" className="text-blue-600 hover:underline">
                Clear filters
              </Link>
            ) : (
              <Link href="/qms/risk-register/new" className="text-blue-600 hover:underline">
                Add your first risk
              </Link>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
