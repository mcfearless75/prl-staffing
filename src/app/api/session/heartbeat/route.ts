import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { IDLE_GAP_MS } from "@/lib/session-monitor";

/**
 * Called once a minute by every open, visible PRISM tab (SessionHeartbeat).
 * Extends the caller's current UserSession row, or starts a new one if this
 * is the first beat since sign-in or the previous row has gone idle.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as
    | { id?: string; email?: string | null; name?: string | null; userType?: string; sid?: string; loginMethod?: string }
    | undefined;
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  // Tokens issued before session tracking have no sid; group them per person
  // until they next sign in.
  const tokenId = user.sid || `legacy:${user.email.toLowerCase()}`;
  const now = new Date();
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 400) || null;

  try {
    const current = await prisma.userSession.findFirst({
      where: { tokenId, endedAt: null, lastSeenAt: { gte: new Date(now.getTime() - IDLE_GAP_MS) } },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true },
    });

    if (current) {
      await prisma.userSession.update({
        where: { id: current.id },
        data: { lastSeenAt: now, ipAddress, userAgent },
      });
    } else {
      const earlier = user.sid ? await prisma.userSession.count({ where: { tokenId } }) : 0;
      await prisma.userSession.create({
        data: {
          tokenId,
          userType: user.userType === "contractor" ? "contractor" : "staff",
          userId: user.id || null,
          email: user.email.toLowerCase(),
          name: user.name || null,
          method: !user.sid ? "existing" : earlier > 0 ? "resumed" : user.loginMethod || "password",
          ipAddress,
          userAgent,
          startedAt: now,
          lastSeenAt: now,
        },
      });
    }
  } catch {
    // Monitoring must never break the app
  }
  return NextResponse.json({ ok: true });
}
