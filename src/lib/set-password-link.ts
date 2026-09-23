import crypto from "crypto";
import { prisma } from "@/lib/db";

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One-use link to /set-password for `email`, replacing any earlier token.
 *
 * /api/auth/reset-password creates the ContractorLogin on first use when a
 * Contractor exists with this email, so no login row has to exist yet.
 */
export async function createSetPasswordUrl(email: string, ttlMs = DAY_MS): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.deleteMany({ where: { email } });
  await prisma.passwordResetToken.create({
    data: { email, token, expiresAt: new Date(Date.now() + ttlMs) },
  });
  const baseUrl = process.env.NEXTAUTH_URL || "https://prl-staffing-production.up.railway.app";
  return `${baseUrl}/set-password?token=${token}`;
}
