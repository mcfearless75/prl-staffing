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

  const email = user.email.toLowerCase();
  const fields = {
    userType: user.userType === "contractor" ? "contractor" : "staff",
    userId: user.id || null,
    name: user.name || null,
  };

  try {
    await prisma.$transaction(async (tx) => {
      // Two beats for the same sign-in can land together (a second tab, or the
      // mount beat plus a visibilitychange). Without this lock both see no open
      // row and both create one, leaving a stranded "Away" duplicate on /sessions.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tokenId}))`;

      const current = await tx.userSession.findFirst({
        where: { tokenId, endedAt: null, lastSeenAt: { gte: new Date(now.getTime() - IDLE_GAP_MS) } },
        orderBy: { lastSeenAt: "desc" },
        select: { id: true },
      });

      if (current) {
        await tx.userSession.update({
          where: { id: current.id },
          data: { lastSeenAt: now, ipAddress, userAgent },
        });
        return;
      }
      const earlier = user.sid ? await tx.userSession.count({ where: { tokenId } }) : 0;
      await tx.userSession.create({
        data: {
          tokenId,
          ...fields,
          email,
          method: !user.sid ? "existing" : earlier > 0 ? "resumed" : user.loginMethod || "password",
          ipAddress,
          userAgent,
          startedAt: now,
          lastSeenAt: now,
        },
      });
    });
  } catch {
    // Monitoring must never break the app
  }
  return NextResponse.json({ ok: true });
}
