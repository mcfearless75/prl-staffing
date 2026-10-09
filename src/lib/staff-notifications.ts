/**
 * In-app alerts for staff (the bell). Rows live in the shared Notification
 * table with recipientType "user"; the first writer is @mentions in
 * subcontractor notes (Jen, 2026-10-06).
 *
 * Pure: no Prisma import, so the scoping rules below are unit-tested. Every
 * query a staff member can trigger goes through `ownNotificationsWhere`, which
 * is the only thing stopping one person reading or clearing another's alerts.
 */

export const STAFF_RECIPIENT_TYPE = "user";
export const BELL_LIST_LIMIT = 20;
const MAX_IDS_PER_REQUEST = 100;

export type OwnNotificationsWhere = {
  recipientType: string;
  recipientId: string;
  isRead?: boolean;
  id?: { in: string[] };
};

/** The caller's own alerts, optionally only unread ones. */
export function ownNotificationsWhere(userId: string, opts: { unreadOnly?: boolean } = {}): OwnNotificationsWhere {
  if (!userId) throw new Error("ownNotificationsWhere needs a user id");
  return {
    recipientType: STAFF_RECIPIENT_TYPE,
    recipientId: userId,
    ...(opts.unreadOnly ? { isRead: false } : {}),
  };
}

/**
 * Body of POST /api/notifications → which of the caller's alerts to mark read.
 * `{ all: true }` clears every unread one; `{ ids: [...] }` clears those ids,
 * still scoped to the caller. Anything else is rejected (null).
 */
export function markReadWhere(userId: string, body: unknown): OwnNotificationsWhere | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { all?: unknown; ids?: unknown };
  if (b.all === true) return ownNotificationsWhere(userId, { unreadOnly: true });
  if (!Array.isArray(b.ids)) return null;
  const ids = b.ids.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 64);
  if (ids.length === 0 || ids.length > MAX_IDS_PER_REQUEST) return null;
  return { ...ownNotificationsWhere(userId, { unreadOnly: true }), id: { in: ids } };
}

/**
 * Body of DELETE /api/notifications → which of the caller's READ alerts to
 * delete (Jenni, 08-10-26: tidy the list). `{ all: true }` = every read one;
 * `{ ids: [...] }` = those ids. Unread alerts and other people's are never
 * matched. Anything else is rejected (null).
 */
export function deleteReadWhere(userId: string, body: unknown): OwnNotificationsWhere | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { all?: unknown; ids?: unknown };
  const own = { ...ownNotificationsWhere(userId), isRead: true };
  if (b.all === true) return own;
  if (!Array.isArray(b.ids)) return null;
  const ids = b.ids.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 64);
  if (ids.length === 0 || ids.length > MAX_IDS_PER_REQUEST) return null;
  return { ...own, id: { in: ids } };
}

/**
 * The team groups to mark read when someone opens these alerts (Jenni,
 * 08-10-26): every copy of a team alert shares a groupId, so opening one
 * clears it for everyone. Personal alerts (no groupId) never spread.
 */
export function teamGroupIds(rows: { groupId: string | null }[]): string[] {
  return [...new Set(rows.map((r) => r.groupId).filter((g): g is string => !!g))];
}

/** "Opened by Jenni" on everyone else's copy; nothing on the opener's own. */
export function openedByLabel(readBy: string | null | undefined, myName: string | null | undefined): string | null {
  if (!readBy) return null;
  if (myName && readBy.trim().toLowerCase() === myName.trim().toLowerCase()) return null;
  return `Opened by ${readBy.split(" ")[0]}`;
}

/** Only follow in-app links from a notification: "/contractors/abc", never "//evil" or "https://…". */
export function safeNotificationHref(url: string | null | undefined): string | null {
  if (!url || !url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) return null;
  return url;
}

/** Badge text: hidden at 0, capped so the circle stays small. */
export function badgeLabel(unread: number): string | null {
  if (!Number.isFinite(unread) || unread <= 0) return null;
  return unread > 99 ? "99+" : String(Math.floor(unread));
}
