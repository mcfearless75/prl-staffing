export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { PageHeader } from "@/components/page-header";
import { openedByLabel, ownNotificationsWhere } from "@/lib/staff-notifications";
import { NotificationsList } from "./notifications-list";

const PAGE_LIMIT = 200;

/**
 * Every alert for the signed-in staff member in one place (Erica, 2026-10-07):
 * @mentions, worker replies, uploads to verify, profile changes, staff access.
 * The bell stays for a quick look; this is the full list.
 */
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ show?: string }>;
}) {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");
  const email = guard.session.user.email;
  const me = email ? await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } }) : null;
  const unreadOnly = (await searchParams)?.show === "unread";

  const items = me
    ? await prisma.notification.findMany({
        where: ownNotificationsWhere(me.id, { unreadOnly }),
        orderBy: { sentAt: "desc" },
        take: PAGE_LIMIT,
        select: { id: true, title: true, body: true, url: true, isRead: true, sentAt: true, readBy: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Replies from workers, documents to verify, profile changes and @mentions — newest first"
      />
      <NotificationsList
        unreadOnly={unreadOnly}
        items={items.map(({ readBy, ...i }) => ({
          ...i,
          sentAt: i.sentAt.toISOString(),
          openedBy: openedByLabel(readBy, me?.name),
        }))}
        limit={PAGE_LIMIT}
      />
    </div>
  );
}
