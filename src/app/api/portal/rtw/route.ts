import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireContractor } from "@/lib/require-staff";
import { RTW_ROUTES, normaliseShareCode, parseRtwRoute } from "@/lib/rtw-route";

/**
 * The worker's Right to Work route and share code (App Invite Form, part B).
 * The route can be saved before the code is known, so a worker can come back
 * with it. A share code is only kept for the route that needs one.
 */
export async function PUT(request: Request) {
  const guard = await requireContractor();
  if (!guard.ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: guard.reason === "forbidden" ? 403 : 401 });
  }
  const { contractorId } = guard;

  const body = await request.json().catch(() => ({}));
  const route = parseRtwRoute(body.rtwRoute);
  if (!route) return NextResponse.json({ error: "Choose how you'll prove your right to work." }, { status: 400 });

  let shareCode: string | null = null;
  if (RTW_ROUTES[route].needsShareCode) {
    const raw = typeof body.shareCode === "string" ? body.shareCode.trim() : "";
    if (raw) {
      shareCode = normaliseShareCode(raw);
      if (!shareCode) {
        return NextResponse.json(
          { error: "A share code is 9 letters and numbers, e.g. W12 345 67X." },
          { status: 400 }
        );
      }
    } else if (body.keepShareCode) {
      const existing = await prisma.contractor.findUnique({ where: { id: contractorId }, select: { shareCode: true } });
      shareCode = existing?.shareCode ?? null;
    }
  }

  await prisma.contractor.update({ where: { id: contractorId }, data: { rtwRoute: route, shareCode } });

  try {
    await prisma.activityLog.create({
      data: {
        action: "UPDATE",
        entityType: "Contractor",
        entityId: contractorId,
        // Never the code itself: it unlocks the worker's Home Office record.
        details: `Right to Work route set: ${RTW_ROUTES[route].label}${shareCode ? " (share code provided)" : ""}`,
        userId: contractorId,
      },
    });
  } catch {
    // Don't fail the update if logging fails
  }

  return NextResponse.json({ success: true });
}
