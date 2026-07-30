export const dynamic = "force-dynamic";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { getGapReport } from "@/lib/reports/gap-report";

function DocPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    verified: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    missing: "bg-red-100 text-red-700",
    not_uploaded: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    verified: "Verified",
    pending: "Pending",
    missing: "Missing",
    not_uploaded: "—",
  };
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${styles[status] ?? styles.missing}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default async function GapReportPage() {
  const { summary, contractors } = await getGapReport();

  return (
    <div className="space-y-6">
      <Link
        href="/reports"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reports
      </Link>
      <PageHeader
        title="Compliance Gap Report"
        description="Per-contractor breakdown of missing, pending and verified compliance documents — active workforce only. Each contractor is checked against the documents required for their role."
      />

      {!summary.requirementsConfigured && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">No compliance requirements are configured.</p>
            <p className="mt-1 text-amber-800">
              Nothing is currently required of anyone, so this report has nothing to check
              against and every figure below reads as zero. Set up role checklists first.
            </p>
            <Link
              href="/compliance/requirements"
              className="mt-2 inline-block font-medium text-amber-900 underline"
            >
              Configure requirements
            </Link>
          </div>
        </div>
      )}

      {summary.requirementsConfigured && summary.contractorsWithoutChecklist > 0 && (
        <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">
              {summary.contractorsWithoutChecklist} of {summary.totalActive} contractors have no
              checklist to be measured against.
            </p>
            <p className="mt-1 text-blue-800">
              {summary.contractorsWithoutRole > 0 && (
                <>
                  {summary.contractorsWithoutRole} have no role recorded at all.{" "}
                </>
              )}
              They are excluded from the average rather than counted as compliant.{" "}
              <Link href="/compliance/requirements" className="font-medium underline">
                Review role coverage
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{summary.totalActive}</p>
          <p className="text-xs text-gray-500 mt-1">Active Contractors</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{summary.fullyCompliant}</p>
          <p className="text-xs text-emerald-600 mt-1">Fully Compliant</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{summary.partiallyCompliant}</p>
          <p className="text-xs text-amber-600 mt-1">Partially Compliant</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{summary.nonCompliant}</p>
          <p className="text-xs text-red-600 mt-1">Non-Compliant</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{summary.avgCompletion}%</p>
          <p className="text-xs text-blue-600 mt-1">Avg. Completion</p>
        </div>
      </div>

      {/* Doc Type Breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Required Document Coverage</h2>
        <div className="space-y-3">
          {summary.docTypeBreakdown.map((d) => {
            const pct = d.total > 0 ? Math.round((d.verified / d.total) * 100) : 0;
            return (
              <div key={d.type}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700">{d.type}</span>
                  <span className="text-gray-500">
                    {d.verified} verified · {d.uploaded - d.verified} pending · {d.missing} missing
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-Contractor Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contractor</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Completion</th>
                {summary.docTypeBreakdown.map((d) => (
                  <th key={d.type} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {d.type}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contractors.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-3">
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.email || "—"}</p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3">
                    {c.role ? (
                      <span className="text-sm text-gray-700">{c.role}</span>
                    ) : (
                      <span className="text-xs italic text-amber-600" title="No role on assignment or profile">
                        not recorded
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3">
                    {c.requiredTotal === 0 ? (
                      <span className="text-xs italic text-gray-400" title="No requirements configured for this role">
                        no checklist
                      </span>
                    ) : (
                      <>
                        <span
                          className={`text-sm font-semibold ${
                            c.completionPct === 100 ? "text-emerald-600" : c.completionPct === 0 ? "text-red-600" : "text-amber-600"
                          }`}
                        >
                          {c.completionPct}%
                        </span>
                        <span className="text-xs text-gray-400 ml-1">({c.requiredComplete}/{c.requiredTotal})</span>
                      </>
                    )}
                  </td>
                  {/* Look each column's type up by name. Checklists are now
                      per-role, so contractors have different required sets —
                      rendering c.required in order would put one person's CSCS
                      pill under another column's heading. */}
                  {summary.docTypeBreakdown.map((d) => {
                    const doc = c.required.find((r) => r.type === d.type);
                    return (
                      <td key={d.type} className="whitespace-nowrap px-4 py-3">
                        {doc ? (
                          <DocPill status={doc.status} />
                        ) : (
                          <span
                            className="text-[10px] text-gray-300"
                            title="Not required for this role"
                          >
                            n/a
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-6 py-3 text-right">
                    <Link href={`/contractors/${c.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {contractors.length === 0 && (
                <tr>
                  <td colSpan={4 + summary.docTypeBreakdown.length} className="px-6 py-12 text-center text-sm text-gray-400">
                    No active contractors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
