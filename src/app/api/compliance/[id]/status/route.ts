import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_STATUSES = [
  "Verified",
  "Non-Compliant",
  "Pending",
  "Expiring",
  "Expired",
] as const;

type ValidStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status =
    body !== null && typeof body === "object" && "status" in body
      ? (body as Record<string, unknown>).status
      : undefined;

  if (typeof status !== "string" || !VALID_STATUSES.includes(status as ValidStatus)) {
    return NextResponse.json(
      {
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    await prisma.complianceRecord.update({
      where: { id },
      data: { status: status as ValidStatus },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Record not found or update failed" },
      { status: 404 }
    );
  }
}
