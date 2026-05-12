import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// REVERT: Looking → Active (delete after use)
export async function POST() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorised", { status: 401 });

  const result = await prisma.contractor.updateMany({
    where: { status: "Looking" },
    data: { status: "Active" },
  });

  return NextResponse.json({ reverted: result.count });
}
