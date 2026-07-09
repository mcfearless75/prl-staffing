/**
 * Signed auditor magic-link tokens.
 * Format: <loginToken>.<expiresAtMs>.<hmacSignature>
 * The loginToken part is the DB lookup key (AuditorUser.loginToken);
 * the HMAC signature binds it to an expiry so links cannot live forever.
 * Framework-free (node:crypto only) so both Next routes and standalone
 * scripts can import it.
 */

import crypto from "crypto";

/** Magic links are valid for 7 days from generation. */
export const AUDITOR_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Fails closed: throws when no secret is configured (matches auditor-auth.ts). */
export function getAuditorLinkSecret(): string {
  const secret =
    process.env.AUDITOR_JWT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "No JWT secret configured (AUDITOR_JWT_SECRET or AUTH_SECRET required)"
    );
  }
  return secret;
}

function hmac(payload: string): string {
  return crypto
    .createHmac("sha256", getAuditorLinkSecret())
    .update(payload)
    .digest("hex");
}

/** Build a signed link token from a stored loginToken. */
export function signAuditorLinkToken(
  loginToken: string,
  expiresAtMs: number = Date.now() + AUDITOR_LINK_TTL_MS
): string {
  const payload = `${loginToken}.${expiresAtMs}`;
  return `${payload}.${hmac(payload)}`;
}

export type AuditorLinkResult =
  | { ok: true; loginToken: string }
  | { ok: false; reason: "invalid" | "expired" };

/** Verify signature and expiry; returns the embedded loginToken on success. */
export function verifyAuditorLinkToken(token: string): AuditorLinkResult {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "invalid" };

  const [loginToken, expiresAtRaw, signature] = parts;
  const expiresAtMs = Number(expiresAtRaw);
  if (!loginToken || !Number.isFinite(expiresAtMs) || !signature) {
    return { ok: false, reason: "invalid" };
  }

  const expected = hmac(`${loginToken}.${expiresAtMs}`);
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (
    expectedBuf.length !== actualBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, actualBuf)
  ) {
    return { ok: false, reason: "invalid" };
  }

  if (Date.now() > expiresAtMs) return { ok: false, reason: "expired" };

  return { ok: true, loginToken };
}
