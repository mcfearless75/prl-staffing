import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Targeted migration: Active → Looking for contractors approved in the last 7 days
// DELETE THIS FILE after running once
export async function POST() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorised", { status: 401 });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await prisma.contractor.updateMany({
    where: {
      status: "Active",
      updatedAt: { gte: sevenDaysAgo },
    },
    data: { status: "Looking" },
  });

  return NextResponse.json({ updated: result.count });
}
