import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATUSES = [
  "Applied", "New", "Active", "On Site",
  "Benched", "Pending Docs", "Suspended", "Inactive", "Left",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const contractor = await prisma.contractor.update({
    where: { id },
    data: { status },
    select: { id: true, firstName: true, lastName: true, status: true },
  });

  return NextResponse.json(contractor);
}
