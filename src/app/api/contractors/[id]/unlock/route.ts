import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  const { id } = await params;

  const contractorLogin = await prisma.contractorLogin.findUnique({
    where: { contractorId: id },
    select: {
      id: true,
      email: true,
      failedAttempts: true,
      lockedUntil: true,
      lastLoginAt: true,
      createdAt: true,
      tokenVersion: true,
    },
  });

  return NextResponse.json({ contractorLogin });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });
  const { session } = guard;

  const { id } = await params;
  const body = await req.json();
  const action = body?.action;

  const contractorLogin = await prisma.contractorLogin.findUnique({
    where: { contractorId: id },
    include: { contractor: true },
  });

  if (!contractorLogin) {
    return NextResponse.json({ error: "No portal account found for this contractor" }, { status: 404 });
  }

  if (action === "unlock") {
    await prisma.contractorLogin.update({
      where: { contractorId: id },
      data: { failedAttempts: 0, lockedUntil: null },
    });

    await prisma.activityLog.create({
      data: {
        action: "Contractor Account Unlocked",
        entityType: "Contractor",
        entityId: id,
        userName: session.user.name,
        userEmail: session.user.email,
        details: JSON.stringify({ unlockedBy: session.user.email }),
      },
    });

    return NextResponse.json({ success: true, message: "Account unlocked" });
  }

  if (action === "resetPassword") {
    // Generate a temporary password
    const tempPassword = crypto.randomBytes(4).toString("hex").toUpperCase() + "!9";
    const hash = await bcrypt.hash(tempPassword, 12);

    await prisma.contractorLogin.update({
      where: { contractorId: id },
      data: {
        passwordHash: hash,
        failedAttempts: 0,
        lockedUntil: null,
        tokenVersion: { increment: 1 },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "Contractor Password Reset by Staff",
        entityType: "Contractor",
        entityId: id,
        userName: session.user.name,
        userEmail: session.user.email,
        details: JSON.stringify({ resetBy: session.user.email }),
      },
    });

    return NextResponse.json({ success: true, tempPassword, email: contractorLogin.email });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
