import { auth } from "@/lib/auth";

export interface StaffSession {
  user: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string;
    userType?: string;
  };
}

/**
 * Guard for staff-only API routes.
 *
 * Returns the session if the caller is an authenticated STAFF user, or a
 * reason string otherwise. API routes rely on this because the app's
 * middleware matcher does not run on /api/* paths — a logged-in contractor
 * would otherwise pass a bare `session?.user` check.
 */
export async function requireStaff(): Promise<
  { ok: true; session: StaffSession } | { ok: false; reason: "unauthenticated" | "forbidden" }
> {
  const session = await auth();
  if (!session?.user) return { ok: false, reason: "unauthenticated" };
  const userType = (session.user as { userType?: string }).userType;
  if (userType !== "staff") return { ok: false, reason: "forbidden" };
  return { ok: true, session: session as StaffSession };
}

/**
 * Guard for staff routes whose blast radius is too wide for "any staff":
 * bulk deletes, mass email, account unlocks, auditor credential resets.
 *
 * `gdpr/erasure/execute` already set this precedent inline; this is the same
 * rule, named and shared. Every staff user currently holds role "admin", so
 * this locks nobody out today — it is here so that the first non-admin staff
 * role created does not silently inherit the destructive endpoints.
 */
export async function requireAdmin(): Promise<
  { ok: true; session: StaffSession } | { ok: false; reason: "unauthenticated" | "forbidden" }
> {
  const guard = await requireStaff();
  if (!guard.ok) return guard;
  if (guard.session.user.role !== "admin") return { ok: false, reason: "forbidden" };
  return guard;
}
