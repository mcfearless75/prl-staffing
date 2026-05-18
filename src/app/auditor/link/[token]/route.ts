/**
 * Magic-link route for passwordless auditor access.
 * URL: /auditor/link/[token]
 * Sets the auditor session cookie and redirects to the audit portal.
 */

import { prisma } from "@/lib/db";
import { SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUDITOR_JWT_SECRET ?? process.env.AUTH_SECRET ?? "fallback-secret"
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.redirect(new URL("/auditor/login", _req.url));
  }

  const auditor = await prisma.auditorUser.findUnique({
    where: { loginToken: token },
  });

  if (!auditor) {
    return NextResponse.redirect(
      new URL("/auditor/login?error=invalid-link", _req.url)
    );
  }

  // Issue session JWT
  const jwt = await new SignJWT({
    sub: auditor.id,
    email: auditor.email,
    name: auditor.name,
    organisation: auditor.organisation,
    logoUrl: auditor.logoUrl,
    role: auditor.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(JWT_SECRET);

  // Update last login
  await prisma.auditorUser.update({
    where: { id: auditor.id },
    data: { lastLoginAt: new Date() },
  });

  const response = NextResponse.redirect(new URL("/auditor", _req.url));
  response.cookies.set("auditor_token", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  return response;
}
