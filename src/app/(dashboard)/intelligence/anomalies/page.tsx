export const dynamic = "force-dynamic";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { detectAnomalies } from "@/lib/intelligence-engine";

const typeConfig: Record<string, { icon: string; label: string; color: string }> = {
  timesheet: { icon: "⏱️", label: "Timesheet", color: "blue" },
  billing: { icon: "💷", label: "Billing", color: "purple" },
  compliance: { icon: "🛡️", label: "Compliance", color: "red" },
  pattern: { icon: "📊", label: "Pattern", color: "amber" },
};

const severityStyles = {
  critical: { bg: "bg-red-50", border: "border-red-300", badge: "bg-red-100 text-red-700", ring: "ring-red-400" },
  warning: { bg: "bg-amber-50", border: "border-amber-300", badge: "bg-amber-100 text-amber-700", ring: "ring-amber-400" },
  info: { bg: "bg-blue-50", border: "border-blue-300", badge: "bg-blue-100 text-blue-700", ring: "ring-blue-400" },
};

export default async function AnomaliesPage() {
  const anomalies = await detectAnomalies();

  const criticalCount = anomalies.filter((a) => a.severity === "critical").length;
  const warningCount = anomalies.filter((a) => a.severity === "warning").length;

  // Group by type
  const byType = new Map<string, typeof anomalies>();
  for (const anomaly of anomalies) {
    if (!byType.has(anomaly.type)) byType.set(anomaly.type, []);
    byType.get(anomaly.type)!.push(anomaly);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="🔍 Anomaly Detection"
        description="Automated detection of unusual patterns across timesheets, billing, and compliance"
        action={
          <Link
            href="/intelligence"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Intelligence
          </Link>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`rounded-xl border p-5 text-center ${
          criticalCount > 0 ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"
        }`}>
          <p className="text-xs font-medium uppercase text-gray-500">Critical Anomalies</p>
          <p className={`mt-1 text-3xl font-bold ${criticalCount > 0 ? "text-red-600" : "text-gray-400"}`}>
            {criticalCount}
          </p>
        </div>
        <div className={`rounded-xl border p-5 text-center ${
          warningCount > 0 ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"
        }`}>
          <p className="text-xs font-medium uppercase text-gray-500">Warnings</p>
          <p className={`mt-1 text-3xl font-bold ${warningCount > 0 ? "text-amber-600" : "text-gray-400"}`}>
            {warningCount}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
          <p className="text-xs font-medium uppercase text-gray-500">Total Detected</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{anomalies.length}</p>
        </div>
      </div>

      {/* Detection Types */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">What We Detect</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Excessive Hours", desc: ">60h/week" },
            { label: "Zero Hours", desc: "Submitted with 0h" },
            { label: "Duplicates", desc: "Same week, same person" },
            { label: "Hour Spikes", desc: ">50% above average" },
            { label: "PO Mismatch", desc: "Invoices without PO" },
            { label: "Expired Active", desc: "Working with expired docs" },
          ].map((d) => (
            <div key={d.label} className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-xs font-semibold text-gray-700">{d.label}</p>
              <p className="text-[10px] text-gray-500">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Anomalies Feed */}
      {anomalies.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <span className="text-4xl">✅</span>
          <p className="mt-2 text-sm font-medium text-emerald-800">No anomalies detected</p>
          <p className="text-xs text-emerald-600">
            All timesheets, billing, and compliance records are within normal parameters.
          </p>
        </div>
      ) : (
        [...byType.entries()].map(([type, typeAnomalies]) => {
          const config = typeConfig[type] || { icon: "📋", label: type, color: "gray" };
          return (
            <div key={type} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-2">
                <span className="text-xl">{config.icon}</span>
                <h2 className="text-lg font-semibold text-gray-900">{config.label} Anomalies</h2>
                <span className="ml-auto rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {typeAnomalies.length}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {typeAnomalies.map((anomaly) => {
                  const style = severityStyles[anomaly.severity];
                  return (
                    <div key={anomaly.id} className={`px-6 py-4 ${style.bg}`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-2 ${style.ring} bg-white`}>
                          <span className="text-xs">{config.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">{anomaly.title}</h3>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${style.badge}`}>
                              {anomaly.severity}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{anomaly.description}</p>

                          {/* Data Points */}
                          {anomaly.dataPoints && anomaly.dataPoints.length > 0 && (
                            <div className="flex items-center gap-3 mt-2">
                              {anomaly.dataPoints.map((dp, i) => (
                                <span key={i} className="rounded bg-white/80 border border-gray-200 px-2 py-0.5 text-[10px] text-gray-600">
                                  <strong>{dp.label}:</strong> {dp.value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {anomaly.entityHref && (
                          <Link
                            href={anomaly.entityHref}
                            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            Investigate →
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
