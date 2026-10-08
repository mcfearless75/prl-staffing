"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { safeNotificationHref } from "@/lib/staff-notifications";

type Item = { id: string; title: string; body: string; url: string | null; isRead: boolean; sentAt: string };

function when(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(
    new Date(iso)
  );
}

export function NotificationsList({ items, unreadOnly, limit }: { items: Item[]; unreadOnly: boolean; limit: number }) {
  const router = useRouter();
  const hasUnread = items.some((i) => !i.isRead);
  const hasRead = items.some((i) => i.isRead);

  // Read alerts can be deleted to keep the list tidy (Jenni, 08-10-26).
  async function remove(body: { all: true } | { ids: string[] }) {
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
    router.refresh();
  }

  async function markRead(body: { all: true } | { ids: string[] }) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  async function open(item: Item) {
    if (!item.isRead) await markRead({ ids: [item.id] });
    const href = safeNotificationHref(item.url);
    if (href) router.push(href);
    else router.refresh();
  }

  const tab = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
        <div className="flex gap-1">
          <Link href="/notifications" className={tab(!unreadOnly)}>All</Link>
          <Link href="/notifications?show=unread" className={tab(unreadOnly)}>Unread</Link>
        </div>
        <div className="flex items-center gap-4">
          {hasUnread && (
            <button
              type="button"
              onClick={async () => {
                await markRead({ all: true });
                router.refresh();
              }}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Mark all read
            </button>
          )}
          {hasRead && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete all read notifications? Unread ones are kept.")) remove({ all: true });
              }}
              className="text-sm font-medium text-gray-500 hover:text-red-600 hover:underline"
            >
              Delete read
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-gray-500">
          {unreadOnly ? "You're all caught up." : "No notifications yet."}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-stretch">
              <button
                type="button"
                onClick={() => open(item)}
                className={`block min-w-0 flex-1 px-4 py-3 text-left hover:bg-gray-50 ${item.isRead ? "" : "bg-blue-50/60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`text-sm ${item.isRead ? "text-gray-700" : "font-semibold text-gray-900"}`}>
                    {!item.isRead && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-600 align-middle" />}
                    {item.title}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">{when(item.sentAt)}</span>
                </div>
                {item.body && <p className="mt-0.5 text-sm text-gray-500">{item.body}</p>}
              </button>
              {item.isRead && (
                <button
                  type="button"
                  onClick={() => remove({ ids: [item.id] })}
                  aria-label={`Delete notification: ${item.title}`}
                  title="Delete"
                  className="shrink-0 px-3 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {items.length >= limit && (
        <p className="border-t border-gray-100 px-4 py-2 text-center text-xs text-gray-400">Showing the latest {limit}.</p>
      )}
    </div>
  );
}
