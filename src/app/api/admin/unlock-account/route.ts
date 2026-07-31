import { prisma } from "@/lib/db";
import { requireStaff, requireAdmin } from "@/lib/require-staff";
import { NextResponse } from "next/server";

// GET /api/admin/unlock-account?email=xxx  — check login status
// POST /api/admin/unlock-account            — unlock { email }

export async function GET(request: Request) {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email param required" }, { status: 400 });

  const [user, contractorLogin] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true, email: true, passwordHash: true, failedAttempts: true, lockedUntil: true } }),
    prisma.contractorLogin.findUnique({ where: { email }, select: { id: true, email: true, passwordHash: true, failedAttempts: true, lockedUntil: true, contractorId: true } }),
  ]);

  return NextResponse.json({
    staffUser: user
      ? {
          id: user.id,
          hasPassword: !!user.passwordHash,
          failedAttempts: user.failedAttempts,
          lockedUntil: user.lockedUntil,
          isLocked: !!user.lockedUntil && user.lockedUntil > new Date(),
        }
      : null,
    contractorLogin: contractorLogin
      ? {
          id: contractorLogin.id,
          contractorId: contractorLogin.contractorId,
          hasPassword: !!contractorLogin.passwordHash,
          failedAttempts: contractorLogin.failedAttempts,
          lockedUntil: contractorLogin.lockedUntil,
          isLocked: !!contractorLogin.lockedUntil && contractorLogin.lockedUntil > new Date(),
        }
      : null,
  });
}

export async function POST(request: Request) {
  // Clearing a lockout defeats the brute-force protection, so this one is
  // admin-only. The GET above is a read-only diagnostic and stays staff-wide.
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  const { email } = await request.json();
  const normalised = email?.trim().toLowerCase();
  if (!normalised) return NextResponse.json({ error: "email required" }, { status: 400 });

  const results: string[] = [];

  const user = await prisma.user.findUnique({ where: { email: normalised } });
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
    results.push(`Staff user ${normalised} unlocked`);
  }

  const contractorLogin = await prisma.contractorLogin.findUnique({ where: { email: normalised } });
  if (contractorLogin) {
    await prisma.contractorLogin.update({
      where: { id: contractorLogin.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
    results.push(`ContractorLogin ${normalised} unlocked`);
  }

  if (results.length === 0) {
    return NextResponse.json({ message: "No records found for that email" }, { status: 404 });
  }

  return NextResponse.json({ unlocked: results });
}
