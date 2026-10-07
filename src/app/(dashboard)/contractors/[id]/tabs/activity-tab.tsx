import { parseSentEmailRecord } from "@/lib/sent-email-record";
import { readableDetails, type FeedRow } from "@/lib/activity-feed";
import { ViewSentEmailButton } from "./view-sent-email-button";

function iconFor(log: FeedRow): string {
  const a = log.action;
  if (log.automatic) return "⚙️";
  if (a.includes("Do not employ") || a.includes("do not employ")) return "⛔";
  if (a.includes("verified")) return "✔️";
  if (a.includes("rejected")) return "❌";
  if (a.includes("Email Opened")) return "📬";
  if (a.includes("Email") || a.includes("Sent") || a.includes("sent") || a.includes("emailed")) return "📧";
  if (a.includes("Status") || a.includes("status")) return "🔄";
  if (a.includes("Created") || a.includes("created") || a.includes("APPLICATION")) return "✅";
  if (a.includes("Login") || a.includes("Password")) return "🔐";
  if (a.includes("uploaded") || a.includes("Upload") || a.includes("Doc") || a.includes("Document")) return "📎";
  if (a.includes("Assign")) return "🏗️";
  if (a.includes("Note")) return "📝";
  if (a.includes("Deleted") || a.includes("deleted")) return "🗑️";
  return "📋";
}

export function ActivityTab({ activityLogs }: { activityLogs: FeedRow[] }) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Activity</h2>
      <p className="mb-4 text-xs text-gray-500">
        Everything done on this profile and by whom — uploads, verifications, edits, status changes, emails.
        {" "}Entries from before 1 Oct 2026 may be incomplete: many actions weren&apos;t recorded until then.
      </p>
      {activityLogs.length === 0 ? (
        <p className="text-sm text-gray-500">No activity recorded yet.</p>
      ) : (
        <ol className="relative border-l border-gray-200 space-y-4 ml-2">
          {activityLogs.map((log) => {
            // Only reminder emails store a copy of what was sent; anything
            // else (including older plain-text entries) parses to null.
            const sentEmail = parseSentEmailRecord(log.details);
            const details = sentEmail ? null : readableDetails(log.details);
            const when = `${new Date(log.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" })} ${new Date(log.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}`;
            return (
              <li key={log.id} className="ml-4">
                <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-300" />
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">{iconFor(log)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                    {details && <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{details}</p>}
                    <p className="text-xs text-gray-500">
                      {log.automatic ? "Automatic" : `by ${log.userName || log.userEmail || "unknown"}`}
                      {!log.automatic && log.userName && log.userEmail ? ` (${log.userEmail})` : ""}
                      {" · "}
                      <time>{when}</time>
                    </p>
                    {sentEmail && (
                      <p className="text-xs text-gray-500 truncate">
                        To {sentEmail.to}
                        {sentEmail.note ? ` · ${sentEmail.note}` : ""}
                      </p>
                    )}
                    {sentEmail && <ViewSentEmailButton title={log.action} record={sentEmail} sentAtLabel={when} />}
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
