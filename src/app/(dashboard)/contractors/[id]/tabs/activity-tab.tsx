import type { ActivityLogRow } from "./types";

export function ActivityTab({ activityLogs }: { activityLogs: ActivityLogRow[] }) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Activity</h2>
      {activityLogs.length === 0 ? (
        <p className="text-sm text-gray-500">No activity recorded yet.</p>
      ) : (
        <ol className="relative border-l border-gray-200 space-y-4 ml-2">
          {activityLogs.map((log) => {
            const icon = log.action.includes("Email Opened")
              ? "📬"
              : log.action.includes("Email") || log.action.includes("Sent")
                ? "📧"
                : log.action.includes("Status")
                  ? "🔄"
                  : log.action.includes("Created") || log.action.includes("APPLICATION")
                    ? "✅"
                    : log.action.includes("Login")
                      ? "🔐"
                      : log.action.includes("Upload") || log.action.includes("Doc")
                        ? "📎"
                        : log.action.includes("Deleted")
                          ? "🗑️"
                          : "📋";
            return (
              <li key={log.id} className="ml-4">
                <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-300" />
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                    {log.userName && (
                      <p className="text-xs text-gray-500">
                        by {log.userName}
                        {log.userEmail ? ` (${log.userEmail})` : ""}
                      </p>
                    )}
                    <time className="text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}{" "}
                      {new Date(log.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
