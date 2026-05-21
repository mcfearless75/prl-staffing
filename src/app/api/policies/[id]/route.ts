import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { deleteFromR2 } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PATCH /api/policies/[id] — toggle isPublic or update metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const policy = await prisma.policy.update({
    where: { id },
    data: {
      ...(typeof body.isPublic === "boolean" && { isPublic: body.isPublic }),
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.category && { category: body.category }),
      ...(body.version !== undefined && { version: body.version }),
    },
  });

  return NextResponse.json(policy);
}

// DELETE /api/policies/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;
  const policy = await prisma.policy.findUnique({ where: { id } });
  if (!policy) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteFromR2(policy.r2Key);
  await prisma.policy.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
