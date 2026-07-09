import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

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
