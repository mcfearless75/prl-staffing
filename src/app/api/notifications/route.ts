import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import {
  BELL_LIST_LIMIT,
  deleteReadWhere,
  markReadWhere,
  ownNotificationsWhere,
  teamGroupIds,
} from "@/lib/staff-notifications";

/**
 * The staff bell: the caller's own in-app alerts (src/lib/staff-notifications.ts).
 * The User row is found by session email, not session id — Microsoft SSO
 * sessions don't carry our User.id.
 */
async function currentUser(): Promise<{ id: string; name: string } | null> {
  const guard = await requireStaff();
  if (!guard.ok) return null;
  const email = guard.session.user.email;
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
  return user ? { id: user.id, name: user.name || email } : null;
}

async function currentUserId(): Promise<string | null> {
  return (await currentUser())?.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [unread, items] = await Promise.all([
    prisma.notification.count({ where: ownNotificationsWhere(userId, { unreadOnly: true }) }),
    prisma.notification.findMany({
      where: ownNotificationsWhere(userId),
      orderBy: { sentAt: "desc" },
      take: BELL_LIST_LIMIT,
      select: { id: true, title: true, body: true, url: true, isRead: true, sentAt: true, readBy: true },
    }),
  ]);
  return NextResponse.json({ unread, items });
}

export async function POST(request: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const where = markReadWhere(me.id, body);
  if (!where) return NextResponse.json({ error: "Send { all: true } or { ids: [...] }" }, { status: 400 });

  // Which team alerts these are, read before they're marked.
  const opened = Array.isArray((body as { ids?: unknown })?.ids)
    ? await prisma.notification.findMany({ where, select: { groupId: true } })
    : [];

  const { count } = await prisma.notification.updateMany({ where, data: { isRead: true, readBy: me.name } });

  // Opening a team alert clears it for everyone, saying who opened it (Jenni,
  // 08-10-26). Only when an alert is opened, not on "Mark all read".
  const groups = teamGroupIds(opened);
  if (groups.length > 0) {
    await prisma.notification.updateMany({
      where: { groupId: { in: groups }, isRead: false },
      data: { isRead: true, readBy: me.name },
    });
  }
  return NextResponse.json({ marked: count });
}

/** Delete the caller's own READ alerts: `{ all: true }` or `{ ids: [...] }`. */
export async function DELETE(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = deleteReadWhere(userId, await request.json().catch(() => null));
  if (!where) return NextResponse.json({ error: "Send { all: true } or { ids: [...] }" }, { status: 400 });

  const { count } = await prisma.notification.deleteMany({ where });
  return NextResponse.json({ deleted: count });
}
