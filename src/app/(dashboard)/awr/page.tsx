export const dynamic = "force-dynamic";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { computeAwrClocks, filterAwrByBasis, AWR_TRIGGER_WEEKS, type AwrBasis } from "@/lib/awr";
import { Download } from "lucide-react";

const TABS: { key: "all" | AwrBasis; label: string }[] = [
  { key: "all", label: "All pairs" },
  { key: "reached", label: "Trigger reached" },
  { key: "below-comparable", label: "Trigger reached & rate below comparable" },
  { key: "future", label: "Trigger in future" },
];

export default async function AwrPage({
  searchParams,
}: {
  searchParams?: Promise<{ basis?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const activeTab = (params?.basis as "all" | AwrBasis) || "all";

  const allClocks = await computeAwrClocks();
  const clocks = activeTab === "all" ? allClocks : filterAwrByBasis(allClocks, activeTab as AwrBasis);

  const reachedCount = allClocks.filter((c) => c.triggerReached).length;
  const belowComparableCount = allClocks.filter((c) => c.triggerReached && c.comparatorBelow).length;
  const futureCount = allClocks.filter((c) => !c.triggerReached).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AWR Clocks"
        description={`${allClocks.length} contractor / company pairs tracked · 12-week qualifying clock`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{allClocks.length}</p>
          <p className="text-xs text-gray-500">Total pairs</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{reachedCount}</p>
          <p className="text-xs text-red-600">Trigger reached</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{belowComparableCount}</p>
          <p className="text-xs text-orange-600">Below comparable rate</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{futureCount}</p>
          <p className="text-xs text-blue-600">Trigger in future</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.key === "all" ? "/awr" : `/awr?basis=${tab.key}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {activeTab !== "all" && (
          <a
            href={`/api/awr/report?basis=${activeTab}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        )}
      </div>

      {/* Table */}
      {clocks.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Contractor</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Weeks (0–{AWR_TRIGGER_WEEKS})</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Trigger / Projected date</th>
                <th className="px-4 py-3">Comparator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clocks.map((c) => (
                <tr key={`${c.contractorId}-${c.companyId}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/contractors/${c.contractorId}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {c.contractorName}
                    </Link>
                    {c.contractorRef && <p className="text-xs text-gray-400">{c.contractorRef}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.companyName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${c.triggerReached ? "bg-red-500" : "bg-blue-500"}`}
                          style={{ width: `${(c.qualifyingWeeks / AWR_TRIGGER_WEEKS) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{c.qualifyingWeeks}/{AWR_TRIGGER_WEEKS}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.status === "Triggered" ? "Rejected" : c.status === "In progress" ? "Submitted" : "Draft"}>
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.triggerReached
                      ? c.triggerDate && formatDate(c.triggerDate)
                      : c.projectedTriggerDate
                        ? `~${formatDate(c.projectedTriggerDate)}`
                        : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.comparatorRate === null || c.currentPayRate === null ? (
                      <span className="text-gray-400">—</span>
                    ) : c.comparatorBelow ? (
                      <Badge variant="Rejected">
                        Below ({formatCurrency(c.currentPayRate)} / {formatCurrency(c.comparatorRate)})
                      </Badge>
                    ) : (
                      <Badge variant="Approved">At/above parity</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">No pairs in this view.</p>
        </div>
      )}
    </div>
  );
}
