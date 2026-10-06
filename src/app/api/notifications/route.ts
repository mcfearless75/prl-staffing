import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { BELL_LIST_LIMIT, markReadWhere, ownNotificationsWhere } from "@/lib/staff-notifications";

/**
 * The staff bell: the caller's own in-app alerts (src/lib/staff-notifications.ts).
 * The User row is found by session email, not session id — Microsoft SSO
 * sessions don't carry our User.id.
 */
async function currentUserId(): Promise<string | null> {
  const guard = await requireStaff();
  if (!guard.ok) return null;
  const email = guard.session.user.email;
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
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
      select: { id: true, title: true, body: true, url: true, isRead: true, sentAt: true },
    }),
  ]);
  return NextResponse.json({ unread, items });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = markReadWhere(userId, await request.json().catch(() => null));
  if (!where) return NextResponse.json({ error: "Send { all: true } or { ids: [...] }" }, { status: 400 });

  const { count } = await prisma.notification.updateMany({ where, data: { isRead: true } });
  return NextResponse.json({ marked: count });
}
