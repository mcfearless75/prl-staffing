import { cookies } from "next/headers";
import { jwtVerify } from "jose";

function getJwtSecret() {
  const secret = process.env.AUDITOR_JWT_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("No JWT secret configured (AUDITOR_JWT_SECRET or AUTH_SECRET required)");
  return new TextEncoder().encode(secret);
}

export interface AuditorClaims {
  sub: string;
  email: string;
  name?: string;
  organisation?: string;
  role?: string;
}

/**
 * Verify the httpOnly `auditor_token` cookie set at auditor login.
 * Returns the decoded claims, or null if missing / invalid / expired.
 * Auditor API routes must call this — middleware does not run on /api/auditor/*.
 */
export async function verifyAuditor(): Promise<AuditorClaims | null> {
  try {
    const token = (await cookies()).get("auditor_token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload?.sub || !payload?.email) return null;
    return payload as unknown as AuditorClaims;
  } catch {
    return null;
  }
}
