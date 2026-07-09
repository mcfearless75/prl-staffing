import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { prisma } from "@/lib/db";

// Targeted migration: Active → Looking for contractors approved in the last 7 days
// DELETE THIS FILE after running once
export async function POST() {
  const guard = await requireStaff();
  if (!guard.ok) return new NextResponse("Unauthorised", { status: guard.reason === "forbidden" ? 403 : 401 });

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
