export const dynamic = "force-dynamic";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { generateInsights } from "@/lib/intelligence-engine";

const severityStyles = {
  critical: { bg: "bg-red-50", border: "border-red-200", icon: "bg-red-100 text-red-600", text: "text-red-800", desc: "text-red-700" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "bg-amber-100 text-amber-600", text: "text-amber-800", desc: "text-amber-700" },
  info: { bg: "bg-blue-50", border: "border-blue-200", icon: "bg-blue-100 text-blue-600", text: "text-blue-800", desc: "text-blue-700" },
  success: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "bg-emerald-100 text-emerald-600", text: "text-emerald-800", desc: "text-emerald-700" },
};

const categoryIcons: Record<string, string> = {
  compliance: "🛡️",
  financial: "💷",
  workforce: "👷",
  operational: "⚙️",
};

const trendArrows: Record<string, string> = {
  up: "↑",
  down: "↓",
  stable: "→",
};

export default async function IntelligencePage() {
  const insights = await generateInsights();

  const criticalCount = insights.filter((i) => i.severity === "critical").length;
  const warningCount = insights.filter((i) => i.severity === "warning").length;
  const categories = ["compliance", "financial", "workforce", "operational"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce Intelligence"
        description="AI-powered insights, predictions, and anomaly detection across your entire workforce"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/intelligence/matching"
              className="rounded-lg bg-purple-100 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
            >
              🎯 Smart Matching
            </Link>
            <Link
              href="/intelligence/map"
              className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-200 transition-colors"
            >
              🗺️ Coverage Map
            </Link>
            <Link
              href="/intelligence/risk"
              className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-200 transition-colors"
            >
              ⚠️ Risk Engine
            </Link>
            <Link
              href="/intelligence/anomalies"
              className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors"
            >
              🔍 Anomalies
            </Link>
          </div>
        }
      />

      {/* Health Score Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
          <div className="flex items-center gap-3">
            {criticalCount > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                {criticalCount} Critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                {warningCount} Warning{warningCount > 1 ? "s" : ""}
              </span>
            )}
            {criticalCount === 0 && warningCount === 0 && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                All Clear
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {categories.map((cat) => {
            const catInsights = insights.filter((i) => i.category === cat);
            const hasCritical = catInsights.some((i) => i.severity === "critical");
            const hasWarning = catInsights.some((i) => i.severity === "warning");
            return (
              <div
                key={cat}
                className={`rounded-lg p-3 text-center ${
                  hasCritical
                    ? "bg-red-50 border border-red-200"
                    : hasWarning
                    ? "bg-amber-50 border border-amber-200"
                    : "bg-emerald-50 border border-emerald-200"
                }`}
              >
                <span className="text-2xl">{categoryIcons[cat]}</span>
                <p className="mt-1 text-xs font-semibold capitalize text-gray-700">{cat}</p>
                <p className={`text-[10px] font-medium ${
                  hasCritical ? "text-red-600" : hasWarning ? "text-amber-600" : "text-emerald-600"
                }`}>
                  {hasCritical ? "Action needed" : hasWarning ? "Attention" : "Healthy"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights Feed */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Actionable Insights
          <span className="ml-2 text-sm font-normal text-gray-500">({insights.length} detected)</span>
        </h2>

        {insights.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <span className="text-4xl">✅</span>
            <p className="mt-2 text-sm font-medium text-emerald-800">Everything looks great!</p>
            <p className="text-xs text-emerald-600">No issues detected across your workforce.</p>
          </div>
        ) : (
          insights.map((insight) => {
            const style = severityStyles[insight.severity];
            return (
              <div
                key={insight.id}
                className={`rounded-xl border ${style.border} ${style.bg} p-4`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.icon}`}>
                    <span className="text-lg">{categoryIcons[insight.category]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${style.text}`}>{insight.title}</h3>
                      {insight.trend && (
                        <span className={`text-xs font-bold ${
                          insight.trend === "up" ? "text-red-500" : insight.trend === "down" ? "text-amber-500" : "text-gray-400"
                        }`}>
                          {trendArrows[insight.trend]}
                        </span>
                      )}
                    </div>
                    <p className={`mt-0.5 text-sm ${style.desc}`}>{insight.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {insight.metric && (
                      <span className={`text-2xl font-bold ${style.text}`}>{insight.metric}</span>
                    )}
                    {insight.actionHref && (
                      <Link
                        href={insight.actionHref}
                        className="rounded-lg bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 hover:bg-white transition-colors whitespace-nowrap"
                      >
                        {insight.actionLabel || "View"}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
