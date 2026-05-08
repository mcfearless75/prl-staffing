import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let ids: string[] | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    ids = body?.ids;
  } catch {
    ids = undefined;
  }

  let result;

  if (ids && ids.length > 0) {
    result = await prisma.complianceRecord.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        status: "Verified",
      },
    });
  } else {
    result = await prisma.complianceRecord.updateMany({
      where: {
        status: "Pending",
      },
      data: {
        status: "Verified",
      },
    });
  }

  return NextResponse.json({ success: true, updated: result.count });
}
