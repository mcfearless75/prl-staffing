/**
 * Who on the staff side may get into PRISM, and who may change that.
 *
 * Before 2026-10-06 the role column was decorative: anyone signing in with an
 * @prlsitesolutions.co.uk Microsoft account was auto-created as "viewer", and
 * "viewer" passed every staff check except a handful of admin-only actions —
 * so any company email had near-full access (NI numbers, pay rates).
 * Now first-time Microsoft sign-ins are "pending" (no access) until an admin
 * approves them on /settings/staff.
 *
 * Pure: imports nothing, so it can be used from auth callbacks, the middleware,
 * client components and tests alike.
 */

export const STAFF_ROLE_ADMIN = "admin";
export const STAFF_ROLE_STAFF = "manager"; // shown as "Staff"; NEW_STARTER_REPORT_ROLES etc. key off it
export const STAFF_ROLE_LEGACY = "viewer"; // pre-2026-10-06 auto-created SSO users: kept working, flagged for review
export const STAFF_ROLE_PENDING = "pending";

/** The roles an admin can pick on /settings/staff. */
export const SETTABLE_STAFF_ROLES = [STAFF_ROLE_ADMIN, STAFF_ROLE_STAFF, STAFF_ROLE_PENDING] as const;
export type SettableStaffRole = (typeof SETTABLE_STAFF_ROLES)[number];

/** Roles that get into the staff side of PRISM. Anything else — pending, blank, unknown — does not. */
const ACCESS_ROLES: readonly string[] = [STAFF_ROLE_ADMIN, STAFF_ROLE_STAFF, STAFF_ROLE_LEGACY];

export function hasStaffAccess(role: string | null | undefined): boolean {
  return ACCESS_ROLES.includes(role ?? "");
}

/** The session userType for a staff User row: "staff" with access, "pending" without. */
export function staffUserType(role: string | null | undefined): "staff" | "pending" {
  return hasStaffAccess(role) ? "staff" : "pending";
}

export function staffRoleLabel(role: string | null | undefined): string {
  switch (role) {
    case STAFF_ROLE_ADMIN:
      return "Admin";
    case STAFF_ROLE_STAFF:
      return "Staff";
    case STAFF_ROLE_LEGACY:
      return "Staff (not reviewed)";
    case STAFF_ROLE_PENDING:
      return "No access";
    default:
      return "No access";
  }
}

export function isSettableStaffRole(role: unknown): role is SettableStaffRole {
  return typeof role === "string" && (SETTABLE_STAFF_ROLES as readonly string[]).includes(role);
}

export type RoleChangeCheck = { ok: true } | { ok: false; error: string };

/**
 * May `actor` set `target`'s role to `newRole`? `adminCount` is how many users
 * are admin right now (including the target if they are one).
 */
export function checkRoleChange(input: {
  actorId: string;
  actorRole: string | null | undefined;
  targetId: string;
  targetRole: string | null | undefined;
  newRole: unknown;
  adminCount: number;
}): RoleChangeCheck {
  if (input.actorRole !== STAFF_ROLE_ADMIN) return { ok: false, error: "Only an admin can change staff access." };
  if (!isSettableStaffRole(input.newRole)) return { ok: false, error: "Choose Admin, Staff or No access." };
  if (input.actorId === input.targetId) {
    return { ok: false, error: "You can't change your own access — ask another admin." };
  }
  if (input.targetRole === STAFF_ROLE_ADMIN && input.newRole !== STAFF_ROLE_ADMIN && input.adminCount <= 1) {
    return { ok: false, error: "There must always be at least one admin." };
  }
  return { ok: true };
}
