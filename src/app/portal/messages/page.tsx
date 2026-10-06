export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadThread, markThreadRead } from "@/lib/contractor-messages-server";
import { countUnread, MESSAGE_TO_WORKER, PRL_OFFICE_PHONE } from "@/lib/contractor-messages";
import { ReplyForm } from "./reply-form";

function stamp(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(date);
}

/** The worker's thread with PRL. Only ever their own: the id comes from the session. */
export default async function PortalMessagesPage() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const thread = await loadThread(contractorId);
  // Highlight what's new on this view, then mark it read for next time.
  if (countUnread(thread, "worker") > 0) await markThreadRead(contractorId, "worker");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-prism-ink">Messages</h1>
        <p className="text-sm text-prism-ink-muted">Your messages with PRL Site Solutions</p>
      </div>

      {thread.length === 0 ? (
        <div className="rounded-xl border border-prism-line bg-prism-paper px-4 py-8 text-center text-sm text-prism-ink-muted">
          No messages yet. If PRL sends you one it will appear here.
        </div>
      ) : (
        <ul className="space-y-3">
          {thread.map((m) => {
            const fromPrl = m.direction === MESSAGE_TO_WORKER;
            const isNew = fromPrl && m.readAt === null;
            const phone = m.senderPhone || PRL_OFFICE_PHONE;
            return (
              <li key={m.id} className={`flex ${fromPrl ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] rounded-xl border px-4 py-3 ${
                    fromPrl
                      ? isNew
                        ? "border-blue-300 bg-blue-50"
                        : "border-prism-line bg-prism-paper"
                      : "border-emerald-200 bg-emerald-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-x-2 text-xs">
                    <span className="font-semibold text-prism-ink">{fromPrl ? m.senderName : "You"}</span>
                    {fromPrl && m.senderJobTitle && <span className="text-prism-ink-muted">{m.senderJobTitle}, PRL</span>}
                    {isNew && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">New</span>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-prism-ink">{m.body}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-prism-ink-muted">
                    <span>{stamp(m.createdAt)}</span>
                    {fromPrl && (
                      <a href={`tel:${phone.replace(/\s+/g, "")}`} className="font-medium text-blue-700 underline">
                        Call {phone}
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-xl border border-prism-line bg-prism-paper p-4">
        <ReplyForm />
      </div>
    </div>
  );
}
