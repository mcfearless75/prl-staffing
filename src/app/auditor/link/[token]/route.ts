/**
 * Magic-link route for passwordless auditor access.
 * URL: /auditor/link/[token]
 * Sets the auditor session cookie and redirects to the audit portal.
 */

import { prisma } from "@/lib/db";
import { getAuditorLinkSecret, verifyAuditorLinkToken } from "@/lib/auditor-link";
import { SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";

const SITE_URL = "https://www.prismworkforce.online";

function getBaseUrl(req: NextRequest): string {
  // Try forwarded headers first (reverse proxy)
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost && !forwardedHost.includes("0.0.0.0")) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  // NEXTAUTH_URL env var, or hardcoded live domain
  const envUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
  if (envUrl && !envUrl.includes("0.0.0.0")) return envUrl;
  return SITE_URL;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const base = getBaseUrl(_req);

  if (!token) {
    return NextResponse.redirect(new URL("/auditor/login", base));
  }

  // Fail closed when no signing secret is configured
  let jwtSecret: Uint8Array;
  try {
    jwtSecret = new TextEncoder().encode(getAuditorLinkSecret());
  } catch {
    return NextResponse.json(
      { error: "Auditor access is not configured" },
      { status: 500 }
    );
  }

  // Verify HMAC signature and expiry before touching the database
  const result = verifyAuditorLinkToken(decodeURIComponent(token));
  if (!result.ok) {
    const error = result.reason === "expired" ? "expired-link" : "invalid-link";
    return NextResponse.redirect(
      new URL(`/auditor/login?error=${error}`, base)
    );
  }

  const auditor = await prisma.auditorUser.findUnique({
    where: { loginToken: result.loginToken },
  });

  if (!auditor) {
    return NextResponse.redirect(
      new URL("/auditor/login?error=invalid-link", base)
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
    .sign(jwtSecret);

  // Update last login
  await prisma.auditorUser.update({
    where: { id: auditor.id },
    data: { lastLoginAt: new Date() },
  });

  const response = NextResponse.redirect(new URL("/auditor", base));
  response.cookies.set("auditor_token", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  return response;
}
