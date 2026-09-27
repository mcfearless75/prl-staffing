// Field-level encryption for special-category data (health, drugs & alcohol,
// criminal record). AES-256-GCM with a key that is used for nothing else:
// SENSITIVE_DATA_KEY, 32 random bytes, base64. Deliberately NOT derived from
// AUTH_SECRET — rotating the login secret must never make this unreadable.
//
// Fails closed: with no valid key, encryptJson throws and nothing is saved.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const VERSION = "v1";

export class SensitiveKeyMissingError extends Error {
  constructor() {
    super("SENSITIVE_DATA_KEY is not set (or is not 32 bytes of base64)");
  }
}

export function loadSensitiveKey(raw: string | undefined = process.env.SENSITIVE_DATA_KEY): Buffer | null {
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}

export function sensitiveStorageAvailable(): boolean {
  return loadSensitiveKey() !== null;
}

/**
 * Who may reveal someone's answers: an admin whose email is listed in
 * SENSITIVE_DATA_VIEWERS (comma-separated). Every staff user is an admin today,
 * so the role alone would mean "all staff". Fails closed: no list, no viewers.
 */
export function canViewSensitive(
  user: { role?: string | null; email?: string | null },
  list: string | undefined = process.env.SENSITIVE_DATA_VIEWERS
): boolean {
  if (user.role !== "admin" || !user.email || !list) return false;
  const allowed = list.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(user.email.trim().toLowerCase());
}

/** "v1.<iv>.<tag>.<ciphertext>", all base64. The version allows a future key rotation. */
export function encryptJson(value: unknown, key: Buffer | null = loadSensitiveKey()): string {
  if (!key) throw new SensitiveKeyMissingError();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(".");
}

/** Throws on a wrong key or any tampering — GCM authenticates the ciphertext. */
export function decryptJson<T>(payload: string, key: Buffer | null = loadSensitiveKey()): T {
  if (!key) throw new SensitiveKeyMissingError();
  const [version, iv, tag, body] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !body) throw new Error("Unrecognised sensitive-data payload");
  const decipher = createDecipheriv(ALGO, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const text = Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
  return JSON.parse(text) as T;
}
