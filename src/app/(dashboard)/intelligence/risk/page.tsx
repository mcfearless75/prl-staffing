export const dynamic = "force-dynamic";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { assessRisks } from "@/lib/intelligence-engine";

const severityConfig = {
  critical: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700", dot: "bg-red-500" },
  high: { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  medium: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  low: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
};

const categoryLabels: Record<string, { icon: string; label: string }> = {
  compliance: { icon: "🛡️", label: "Compliance" },
  financial: { icon: "💷", label: "Financial" },
  staffing: { icon: "👷", label: "Staffing" },
};

export default async function RiskEnginePage() {
  const risks = await assessRisks();

  const criticalCount = risks.filter((r) => r.severity === "critical").length;
  const highCount = risks.filter((r) => r.severity === "high").length;
  const totalRiskScore = risks.reduce((s, r) => {
    const weights = { critical: 10, high: 5, medium: 2, low: 1 };
    return s + weights[r.severity];
  }, 0);

  // Risk by category
  const byCategory = new Map<string, typeof risks>();
  for (const risk of risks) {
    if (!byCategory.has(risk.category)) byCategory.set(risk.category, []);
    byCategory.get(risk.category)!.push(risk);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="⚠️ Predictive Risk Engine"
        description="Forecasting compliance gaps, staffing shortfalls, and financial risks before they happen"
        action={
          <Link
            href="/intelligence"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Intelligence
          </Link>
        }
      />

      {/* Risk Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
          <p className="text-xs font-medium uppercase text-gray-500">Risk Score</p>
          <p className={`mt-1 text-3xl font-bold ${
            totalRiskScore > 30 ? "text-red-600" : totalRiskScore > 15 ? "text-amber-600" : "text-emerald-600"
          }`}>
            {totalRiskScore}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Lower is better</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="text-xs font-medium uppercase text-red-500">Critical</p>
          <p className="mt-1 text-3xl font-bold text-red-700">{criticalCount}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 text-center">
          <p className="text-xs font-medium uppercase text-orange-500">High</p>
          <p className="mt-1 text-3xl font-bold text-orange-700">{highCount}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
          <p className="text-xs font-medium uppercase text-amber-500">Medium / Low</p>
          <p className="mt-1 text-3xl font-bold text-amber-700">
            {risks.length - criticalCount - highCount}
          </p>
        </div>
      </div>

      {/* Risk by Category */}
      {risks.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <span className="text-4xl">✅</span>
          <p className="mt-2 text-sm font-medium text-emerald-800">No risks detected</p>
          <p className="text-xs text-emerald-600">Your workforce is operating within normal parameters.</p>
        </div>
      ) : (
        [...byCategory.entries()].map(([category, catRisks]) => {
          const catInfo = categoryLabels[category] || { icon: "📋", label: category };
          return (
            <div key={category} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-2">
                <span className="text-xl">{catInfo.icon}</span>
                <h2 className="text-lg font-semibold text-gray-900">{catInfo.label} Risks</h2>
                <span className="ml-auto rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {catRisks.length}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {catRisks.map((risk) => {
                  const config = severityConfig[risk.severity];
                  return (
                    <div key={risk.id} className={`px-6 py-4 ${config.bg}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1 pt-1">
                          <div className={`h-3 w-3 rounded-full ${config.dot}`} />
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${config.badge}`}>
                            {risk.severity}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900">{risk.title}</h3>
                          <p className="text-xs text-gray-600 mt-0.5">{risk.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-[10px] text-gray-500">
                              Probability: <strong>{risk.probability}%</strong>
                            </span>
                            <span className="text-[10px] text-gray-500">
                              Impact: <strong>{risk.impact}</strong>
                            </span>
                            {risk.dueDate && (
                              <span className="text-[10px] text-gray-500">
                                Due: <strong>{risk.dueDate.toLocaleDateString("en-GB")}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        {risk.actionHref && (
                          <Link
                            href={risk.actionHref}
                            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            {risk.actionLabel || "View"} →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
