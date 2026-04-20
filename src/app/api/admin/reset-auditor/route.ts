import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { key, email, password } = await request.json();

    const expectedKey = process.env.ADMIN_SECRET || process.env.AUTH_SECRET;
    if (!expectedKey || key !== expectedKey) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

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
