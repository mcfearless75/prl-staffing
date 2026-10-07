import { MESSAGE_FROM_WORKER } from "@/lib/contractor-messages";
import type { ThreadMessageView } from "@/lib/contractor-messages-server";
import { MessageComposer } from "../message-composer";

export type ThreadMessage = ThreadMessageView;

function stamp(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(date);
}

/** Staff view of the in-app thread with this worker, oldest first. */
export function MessagesTab({
  contractorId,
  messages,
  hasAppLogin,
  firstName,
}: {
  contractorId: string;
  messages: ThreadMessage[];
  hasAppLogin: boolean;
  firstName?: string | null;
}) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Messages</h2>
      <p className="mb-4 text-xs text-gray-500">
        They get an email (and a phone notification if switched on) with a short preview — they read it in full and reply in the app. Each message shows when they read it.
      </p>
      {!hasAppLogin && (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          They haven&apos;t set up their app login yet, so they can&apos;t read messages until they do. Send them an app invite.
        </p>
      )}

      {messages.length === 0 ? (
        <p className="mb-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          No messages yet.
        </p>
      ) : (
        <ul className="mb-4 space-y-3">
          {messages.map((m) => {
            const fromWorker = m.direction === MESSAGE_FROM_WORKER;
            const isNew = fromWorker && m.readAt === null;
            return (
              <li key={m.id} className={`flex ${fromWorker ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-lg border px-4 py-3 ${
                    fromWorker
                      ? isNew
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 bg-gray-50"
                      : "border-indigo-200 bg-indigo-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-x-2 text-xs">
                    <span className="font-medium text-gray-900">{m.senderName}</span>
                    {!fromWorker && m.senderJobTitle && <span className="text-gray-500">{m.senderJobTitle}</span>}
                    {!fromWorker && m.senderPhone && <span className="text-gray-500">{m.senderPhone}</span>}
                    {isNew && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium uppercase text-white">New</span>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">{m.body}</p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    {stamp(m.createdAt)}
                    {!fromWorker && (m.readAt ? ` · Read ${stamp(m.readAt)}` : " · Not read yet")}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <MessageComposer contractorId={contractorId} firstName={firstName} />
    </div>
  );
}
