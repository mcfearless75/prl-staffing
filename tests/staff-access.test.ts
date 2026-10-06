import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasStaffAccess,
  staffUserType,
  checkRoleChange,
  SETTABLE_STAFF_ROLES,
  STAFF_ROLE_ADMIN,
  STAFF_ROLE_STAFF,
  STAFF_ROLE_LEGACY,
  STAFF_ROLE_PENDING,
} from "@/lib/staff-access";

test("pending, blank and unknown roles get no staff access", () => {
  for (const role of [STAFF_ROLE_PENDING, "", null, undefined, "contractor", "Admin", "superuser"]) {
    assert.equal(hasStaffAccess(role), false, String(role));
    assert.equal(staffUserType(role), "pending", String(role));
  }
});

test("admin, staff and legacy viewer keep access (nobody is locked out by the change)", () => {
  for (const role of [STAFF_ROLE_ADMIN, STAFF_ROLE_STAFF, STAFF_ROLE_LEGACY]) {
    assert.equal(hasStaffAccess(role), true, role);
    assert.equal(staffUserType(role), "staff", role);
  }
});

test("every role an admin can pick is either an access role or pending", () => {
  for (const role of SETTABLE_STAFF_ROLES) {
    assert.ok(hasStaffAccess(role) || role === STAFF_ROLE_PENDING, role);
  }
  // Legacy viewer is not offered — it only exists for rows created before the change.
  assert.ok(!(SETTABLE_STAFF_ROLES as readonly string[]).includes(STAFF_ROLE_LEGACY));
});

const base = {
  actorId: "paul",
  actorRole: STAFF_ROLE_ADMIN,
  targetId: "helen",
  targetRole: STAFF_ROLE_STAFF,
  newRole: STAFF_ROLE_ADMIN as unknown,
  adminCount: 3,
};

test("an admin can approve, promote and remove access for someone else", () => {
  for (const newRole of SETTABLE_STAFF_ROLES) {
    assert.deepEqual(checkRoleChange({ ...base, newRole }), { ok: true }, newRole);
  }
});

test("only admins can change access", () => {
  for (const actorRole of [STAFF_ROLE_STAFF, STAFF_ROLE_LEGACY, STAFF_ROLE_PENDING, undefined]) {
    assert.equal(checkRoleChange({ ...base, actorRole }).ok, false, String(actorRole));
  }
});

test("nobody can change their own access", () => {
  assert.equal(checkRoleChange({ ...base, targetId: "paul", targetRole: STAFF_ROLE_ADMIN, newRole: STAFF_ROLE_STAFF }).ok, false);
});

test("the last admin can't be demoted or removed", () => {
  const lastAdmin = { ...base, targetRole: STAFF_ROLE_ADMIN, adminCount: 1 };
  assert.equal(checkRoleChange({ ...lastAdmin, newRole: STAFF_ROLE_STAFF }).ok, false);
  assert.equal(checkRoleChange({ ...lastAdmin, newRole: STAFF_ROLE_PENDING }).ok, false);
  // With another admin around it's fine.
  assert.equal(checkRoleChange({ ...lastAdmin, adminCount: 2, newRole: STAFF_ROLE_STAFF }).ok, true);
});

test("made-up roles are refused", () => {
  for (const newRole of ["viewer", "superuser", "", null, 1]) {
    assert.equal(checkRoleChange({ ...base, newRole }).ok, false, String(newRole));
  }
});
