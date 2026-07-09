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

function buildPageHref(
  page: number,
  params: { user?: string; entity?: string; filter?: string },
) {
  const sp = new URLSearchParams();
  if (params.user) sp.set("user", params.user);
  if (params.entity) sp.set("entity", params.entity);
  if (params.filter) sp.set("filter", params.filter);
  sp.set("page", String(page));
  return `/activity?${sp.toString()}`;
}

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams?: Promise<{ user?: string; entity?: string; page?: string; filter?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const userFilter = params?.user || "";
  const entityFilter = params?.entity || "";
  const quickFilter = params?.filter || "";
  const page = parseInt(params?.page || "1", 10);
  const pageSize = 50;

  const where: Record<string, unknown> = {};
  if (userFilter) where.userEmail = userFilter;
  if (entityFilter) where.entityType = entityFilter;
  if (quickFilter === "logins") {
    where.action = { contains: "Login" };
  } else if (quickFilter === "failed") {
    where.action = { contains: "Failed" };
  }

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

      {/* Quick filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "All", value: "" },
          { label: "🔐 All Logins", value: "logins" },
          { label: "❌ Failed Logins", value: "failed" },
        ].map((tab) => (
          <a
            key={tab.value}
            href={`/activity?filter=${tab.value}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              quickFilter === tab.value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

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
          {logs.map((log) => {
            const isFailed = log.action.includes("Failed") || log.action.includes("Blocked");
            const isLogin = log.action.includes("Login");
            const rowBg = isFailed ? "bg-red-50" : "";
            let ipAddress: string | null = null;
            if (log.ipAddress) ipAddress = log.ipAddress;
            return (
              <div key={log.id} className={`flex items-start gap-3 px-4 lg:px-6 py-3 ${rowBg}`}>
                <span className="text-lg mt-0.5 shrink-0">
                  {isFailed ? "🚨" : isLogin ? "🔐" : getIcon(log.action)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">{log.userName || log.userEmail || "Unknown"}</span>
                    {" "}<span className={isFailed ? "text-red-700 font-medium" : "text-gray-600"}>{log.action}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                      {log.entityType}
                    </span>
                    {ipAddress && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono text-blue-600">
                        IP: {ipAddress}
                      </span>
                    )}
                    {log.userEmail && (
                      <span className="text-[10px] text-gray-400">{log.userEmail}</span>
                    )}
                  {log.entityType === "Campaign" && log.details && (() => {
                    try {
                      const d = JSON.parse(log.details);
                      return (
                        <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] text-emerald-700 font-medium">
                          ✉ {d.sent} sent · {d.failed} failed · {d.total} targeted
                        </span>
                      );
                    } catch { return null; }
                  })()}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-gray-400">{formatTime(log.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {/* Sane ceiling to avoid rendering an unbounded number of links; raised from the
              previous hard cap of 10 which made activity beyond page 10 unreachable. */}
          {Array.from({ length: Math.min(totalPages, 100) }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={buildPageHref(p, { user: userFilter, entity: entityFilter, filter: quickFilter })}
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
