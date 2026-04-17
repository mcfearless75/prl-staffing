import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [recentActivity, stats] = await Promise.all([
      prisma.activityLog.findMany({
        where: {
          action: {
            in: ["Contractor Account Activated", "Contractor Login", "Contractor Password Reset"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      // Campaign headline stats
      prisma.contractor.aggregate({
        _count: { id: true },
        where: {
          NOT: { email: { contains: "prl-placeholder" } },
        },
      }),
    ]);

    // Count activations and logins in the last 24h
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since1h = new Date(Date.now() - 60 * 60 * 1000);

    const activations24h = recentActivity.filter(
      (a) => a.action === "Contractor Account Activated" && a.createdAt >= since24h
    ).length;
    const logins24h = recentActivity.filter(
      (a) => a.action === "Contractor Login" && a.createdAt >= since24h
    ).length;
    const activations1h = recentActivity.filter(
      (a) => a.action === "Contractor Account Activated" && a.createdAt >= since1h
    ).length;
    const logins1h = recentActivity.filter(
      (a) => a.action === "Contractor Login" && a.createdAt >= since1h
    ).length;

    return NextResponse.json({
      stats: {
        activations24h,
        logins24h,
        activations1h,
        logins1h,
      },
      feed: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        name: a.userName,
        details: a.details,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    console.error("Campaign activity error:", err);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
