import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// One-time migration: Active → Looking
// DELETE THIS FILE after running once
export async function POST() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorised", { status: 401 });

  const result = await prisma.contractor.updateMany({
    where: { status: "Active" },
    data: { status: "Looking" },
  });

  return NextResponse.json({ updated: result.count });
}
