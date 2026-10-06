"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { badgeLabel, safeNotificationHref } from "@/lib/staff-notifications";

type Item = { id: string; title: string; body: string; url: string | null; isRead: boolean; sentAt: string };

const POLL_MS = 60_000;

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

/**
 * Staff bell (bottom right, above the help button): @mentions and other
 * in-app alerts. Refreshes every minute while the tab is visible and on every
 * page change.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  // Bumped after marking read so the effect below re-fetches straight away.
  const [refreshKey, setRefreshKey] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  // Re-runs on every page change and after mark-read, then polls.
  useEffect(() => {
    let cancelled = false;
    function refresh() {
      if (document.visibilityState !== "visible") return;
      fetch("/api/notifications", { cache: "no-store" })
        .then((res) => (res.ok ? (res.json() as Promise<{ unread: number; items: Item[] }>) : null))
        .then((data) => {
          if (cancelled || !data) return;
          setUnread(data.unread);
          setItems(data.items);
        })
        .catch(() => {
          // Offline or signed out — the bell just stays as it was.
        });
    }
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname, refreshKey]);

  async function markRead(body: { all: true } | { ids: string[] }) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
    setRefreshKey((k) => k + 1);
  }

  async function openItem(item: Item) {
    if (!item.isRead) await markRead({ ids: [item.id] });
    setOpen(false);
    const href = safeNotificationHref(item.url);
    if (href) router.push(href);
  }

  const label = badgeLabel(unread);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label ? `Notifications, ${label} unread` : "Notifications"}
        title="Notifications"
        className="fixed bottom-20 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg ring-1 ring-gray-200 hover:bg-gray-50 hover:scale-105 transition-all"
      >
        <Bell className="h-5 w-5" />
        {label && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
            {label}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-36 right-5 z-50 flex max-h-[60vh] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markRead({ all: true })}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-gray-500">
                Nothing yet. When someone @mentions you in a note it will show here.
              </li>
            )}
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className={`block w-full px-4 py-3 text-left hover:bg-gray-50 ${item.isRead ? "" : "bg-blue-50/60"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm ${item.isRead ? "text-gray-700" : "font-semibold text-gray-900"}`}>
                      {item.title}
                    </span>
                    <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(item.sentAt)}</span>
                  </div>
                  {item.body && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{item.body}</p>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
