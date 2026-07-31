import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-staff";

export async function POST(request: NextRequest) {
  try {
    // Was gated by `ADMIN_SECRET || AUTH_SECRET`. ADMIN_SECRET is not set, so
    // in practice this route was authenticated by AUTH_SECRET — the key
    // NextAuth uses to sign every staff and contractor session. That made a
    // session-signing secret double as an API key travelling in request
    // bodies. An admin session is the correct guard and needs no shared secret.
    const guard = await requireAdmin();
    if (!guard.ok) {
      return Response.json(
        { error: "Unauthorized" },
        { status: guard.reason === "forbidden" ? 403 : 401 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: "email and password required" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const auditor = await prisma.auditorUser.upsert({
      where: { email: email.toLowerCase() },
      update: { passwordHash },
      create: {
        email: email.toLowerCase(),
        name: "Nutral Auditor",
        passwordHash,
        organisation: "Nutral",
        logoUrl: "/nutral-logo.svg",
        role: "auditor",
      },
    });

    return Response.json({
      message: "Auditor password reset",
      email: auditor.email,
      id: auditor.id,
    });
  } catch (error) {
    console.error("Reset auditor error:", error);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
