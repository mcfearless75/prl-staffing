import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

// In-memory rate limiter: tracks failed attempts per email
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkRateLimit(email: string): { locked: boolean; remaining: number } {
  const now = Date.now();
  const record = failedAttempts.get(email);

  if (!record) return { locked: false, remaining: 5 };

  // Reset if lockout period has expired
  if (record.lockedUntil && now > record.lockedUntil) {
    failedAttempts.delete(email);
    return { locked: false, remaining: 5 };
  }

  if (record.lockedUntil && now <= record.lockedUntil) {
    return { locked: true, remaining: 0 };
  }

  return { locked: false, remaining: Math.max(0, 5 - record.count) };
}

function recordFailedAttempt(email: string): void {
  const now = Date.now();
  const record = failedAttempts.get(email) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = now + 30 * 60 * 1000; // 30 minutes
  }
  failedAttempts.set(email, record);
}

function resetFailedAttempts(email: string): void {
  failedAttempts.delete(email);
}

if (!process.env.AUDITOR_JWT_SECRET) {
  throw new Error("AUDITOR_JWT_SECRET environment variable is required");
}
const JWT_SECRET = new TextEncoder().encode(process.env.AUDITOR_JWT_SECRET);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Check rate limit before touching the database
    const rateLimit = checkRateLimit(normalizedEmail);
    if (rateLimit.locked) {
      return Response.json(
        { error: "Account temporarily locked due to too many failed attempts. Try again in 30 minutes." },
        { status: 429 }
      );
    }

    const auditor = await prisma.auditorUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!auditor) {
      recordFailedAttempt(normalizedEmail);
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(password, auditor.passwordHash);
    if (!validPassword) {
      recordFailedAttempt(normalizedEmail);
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    resetFailedAttempts(normalizedEmail);

    // Update last login
    await prisma.auditorUser.update({
      where: { id: auditor.id }, // eslint-disable-line
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
