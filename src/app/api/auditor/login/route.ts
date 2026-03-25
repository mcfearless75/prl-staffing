import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUDITOR_JWT_SECRET || "prl-auditor-secret-2026"
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const auditor = await prisma.auditorUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!auditor) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(password, auditor.passwordHash);
    if (!validPassword) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.auditorUser.update({
      where: { id: auditor.id },
      data: { lastLoginAt: new Date() },
    });

    // Create JWT token
    const token = await new SignJWT({
      sub: auditor.id,
      email: auditor.email,
      name: auditor.name,
      organisation: auditor.organisation,
      role: auditor.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    return Response.json({
      token,
      name: auditor.name,
      organisation: auditor.organisation,
    });
  } catch (error) {
    console.error("Auditor login error:", error);
    return Response.json({ error: "Login failed" }, { status: 500 });
  }
}
