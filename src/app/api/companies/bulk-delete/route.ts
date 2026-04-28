import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids } = (await request.json()) as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    // Safety: block delete if any company has assignments linked
    const withAssignments = await prisma.assignment.findFirst({
      where: { companyId: { in: ids } },
      select: { company: { select: { name: true } } },
    });

    if (withAssignments) {
      return NextResponse.json(
        {
          error: `Cannot delete — one or more selected companies have assignments linked to them. Remove the assignments first.`,
        },
        { status: 409 }
      );
    }

    const { count } = await prisma.company.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ deleted: count });
  } catch (err) {
    console.error("Bulk delete companies error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
