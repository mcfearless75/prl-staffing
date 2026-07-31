/**
 * Simple in-memory rate limiter for auth endpoints.
 * Tracks attempts per IP/email and blocks after threshold.
 *
 * Production upgrade: Replace with Redis-backed limiter.
 */

const attempts = new Map<string, { count: number; resetAt: number }>();

/**
 * Lightweight rate limiter for middleware-level checks.
 * Returns true (allowed) or false (blocked).
 */
const requests = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = requests.get(key);

  if (!entry || now > entry.resetAt) {
    requests.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

/**
 * Per-IP cap for the public, unauthenticated forms — apply, new-starter,
 * grievance, payment-query, survey, onboarding.
 *
 * Deliberately generous: whole sites often share one NAT'd IP, so a tight
 * limit silently 429s legitimate applicants. Each form gets its own bucket via
 * `formKey`, so filling up /apply must not lock the same worker out of
 * /grievance.
 */
export const PUBLIC_FORM_RATE_LIMIT = 20;
const PUBLIC_FORM_WINDOW_MS = 60 * 60 * 1000;

export function checkPublicFormRateLimit(request: Request, formKey: string): boolean {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return rateLimit(`${formKey}:${ip}`, PUBLIC_FORM_RATE_LIMIT, PUBLIC_FORM_WINDOW_MS);
}

// Clean up expired entries every 5 minutes. Both maps are keyed per IP, so
// neither is bounded by anything but uptime if left unswept.
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of attempts) {
    if (val.resetAt < now) attempts.delete(key);
  }
  for (const [key, val] of requests) {
    if (val.resetAt < now) requests.delete(key);
  }
}, 5 * 60 * 1000);

export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || record.resetAt < now) {
    // First attempt or window expired
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterMs: 0 };
  }

  if (record.count >= maxAttempts) {
    const retryAfterMs = record.resetAt - now;
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  record.count += 1;
  return { allowed: true, remaining: maxAttempts - record.count, retryAfterMs: 0 };
}
