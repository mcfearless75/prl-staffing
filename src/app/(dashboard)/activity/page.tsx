export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const actionIcons: Record<string, string> = {
  Created: "➕",
  Updated: "✏️",
  Deleted: "🗑️",
  Approved: "✅",
  Rejected: "❌",
  Submitted: "📤",
  "Logged In": "🔑",
  Exported: "📥",
};

function getIcon(action: string) {
  for (const [key, icon] of Object.entries(actionIcons)) {
    if (action.includes(key)) return icon;
  }
  return "📋";
}

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams?: Promise<{ user?: string; entity?: string; page?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const userFilter = params?.user || "";
  const entityFilter = params?.entity || "";
  const page = parseInt(params?.page || "1", 10);
  const pageSize = 50;

  const where: Record<string, unknown> = {};
  if (userFilter) where.userEmail = userFilter;
  if (entityFilter) where.entityType = entityFilter;

  const [logs, total, uniqueUsers, uniqueEntities] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({ select: { userEmail: true }, distinct: ["userEmail"] }),
    prisma.activityLog.findMany({ select: { entityType: true }, distinct: ["entityType"] }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description={`${total} tracked actions — full audit trail of all user activity`}
      />

      {/* Filters */}
      <form className="flex flex-wrap items-center gap-2">
        <select
          name="user"
          defaultValue={userFilter}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Users</option>
          {uniqueUsers
            .filter((u) => u.userEmail)
            .map((u) => (
              <option key={u.userEmail} value={u.userEmail!}>
                {u.userEmail}
              </option>
            ))}
        </select>
        <select
          name="entity"
          defaultValue={entityFilter}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Entities</option>
          {uniqueEntities.map((e) => (
            <option key={e.entityType} value={e.entityType}>
              {e.entityType}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Activity Feed */}
      {logs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
          No activity logged yet.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 px-4 lg:px-6 py-3">
              <span className="text-lg mt-0.5 shrink-0">{getIcon(log.action)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-semibold">{log.userName || "System"}</span>
                  {" "}<span className="text-gray-600">{log.action}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                    {log.entityType}
                  </span>
                  {log.details && (
                    <span className="text-xs text-gray-500 truncate">{log.details}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-gray-400">{formatTime(log.createdAt)}</p>
                <p className="text-[10px] text-gray-400">{log.userEmail || ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/activity?page=${p}${userFilter ? `&user=${userFilter}` : ""}${entityFilter ? `&entity=${entityFilter}` : ""}`}
              className={`rounded px-3 py-1 text-sm ${
                p === page ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
