export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/utils";
import { WorkflowRunButton } from "./run-button";

const WORKFLOWS = [
  {
    name: "compliance-chase",
    label: "Compliance Chase",
    description: "Emails contractors whose compliance docs expire within 30 days",
    color: "orange",
  },
  {
    name: "welcome-agent",
    label: "Welcome Agent",
    description: "Sends welcome emails to newly approved contractors",
    color: "emerald",
  },
  {
    name: "stale-applicant",
    label: "Stale Applicant Escalation",
    description: "Alerts staff when applicants have been waiting 7+ days",
    color: "purple",
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  orange:  { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  purple:  { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200" },
};

const outcomeStyle: Record<string, string> = {
  sent:      "bg-emerald-100 text-emerald-700",
  skipped:   "bg-gray-100 text-gray-500",
  failed:    "bg-red-100 text-red-700",
  escalated: "bg-purple-100 text-purple-700",
};

export default async function WorkflowsPage() {
  // Stats per workflow
  const statsRaw = await prisma.workflowLog.groupBy({
    by: ["workflow", "outcome"],
    _count: { id: true },
  });

  const stats: Record<string, Record<string, number>> = {};
  for (const row of statsRaw) {
    if (!stats[row.workflow]) stats[row.workflow] = {};
    stats[row.workflow][row.outcome] = row._count.id;
  }

  // Last run per workflow
  const lastRuns = await prisma.workflowLog.groupBy({
    by: ["workflow"],
    _max: { createdAt: true },
  });
  const lastRunMap: Record<string, Date | null> = {};
  for (const row of lastRuns) {
    lastRunMap[row.workflow] = row._max.createdAt;
  }

  // Recent log entries
  const recentLogs = await prisma.workflowLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agentic Workflows"
        description="Automated agents that run daily to keep contractors, compliance, and staff in sync"
        action={<WorkflowRunButton />}
      />

      {/* Workflow cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {WORKFLOWS.map((wf) => {
          const c = colorMap[wf.color];
          const s = stats[wf.name] || {};
          const totalSent = (s.sent || 0) + (s.escalated || 0);
          const lastRun = lastRunMap[wf.name];
          return (
            <div key={wf.name} className={`rounded-xl border ${c.border} ${c.bg} p-5`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-sm font-semibold ${c.text}`}>{wf.label}</p>
                  <p className="mt-1 text-xs text-gray-500">{wf.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalSent}</p>
                  <p className="text-xs text-gray-500">actions total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{s.failed || 0}</p>
                  <p className="text-xs text-gray-500">failed</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Last run: {lastRun ? formatDate(lastRun) : "Never"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent activity log */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Recent Agent Activity</h2>
          <p className="text-xs text-gray-500 mt-0.5">Last 60 actions across all workflows</p>
        </div>
        {recentLogs.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Workflow</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Outcome</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Detail</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-3">
                    <span className="text-xs font-medium text-gray-700">{log.workflow}</span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-xs text-gray-600">{log.action}</td>
                  <td className="whitespace-nowrap px-6 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${outcomeStyle[log.outcome] || "bg-gray-100 text-gray-600"}`}>
                      {log.outcome}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500 max-w-xs truncate">{log.detail || "—"}</td>
                  <td className="whitespace-nowrap px-6 py-3 text-xs text-gray-400">{formatDate(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No workflow activity yet. Run the agents to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
