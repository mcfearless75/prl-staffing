"use client";

import { useState, useTransition } from "react";
import { setStaffRole } from "./actions";
import { SETTABLE_STAFF_ROLES, staffRoleLabel, STAFF_ROLE_PENDING, STAFF_ROLE_STAFF, STAFF_ROLE_ADMIN } from "@/lib/staff-access";

/** Role picker for one row. Disabled on your own row. */
export function RoleSelect({
  userId,
  name,
  role,
  isSelf,
}: {
  userId: string;
  name: string;
  role: string;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(newRole: string) {
    if (newRole === role) return;
    if (newRole === STAFF_ROLE_PENDING && !confirm(`Remove ${name}'s access to PRISM? They'll be signed out straight away.`)) {
      return;
    }
    if (newRole === STAFF_ROLE_ADMIN && !confirm(`Make ${name} an admin? Admins can change everyone's access.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await setStaffRole(userId, newRole);
      if (!result.ok) setError(result.error);
    });
  }

  if (isSelf) {
    return <span className="text-sm text-gray-500">{staffRoleLabel(role)} (you)</span>;
  }

  return (
    <div>
      <select
        value={(SETTABLE_STAFF_ROLES as readonly string[]).includes(role) ? role : ""}
        onChange={(e) => change(e.target.value)}
        disabled={pending}
        aria-label={`Access for ${name}`}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
      >
        {!(SETTABLE_STAFF_ROLES as readonly string[]).includes(role) && (
          <option value="" disabled>
            {staffRoleLabel(role)}
          </option>
        )}
        {SETTABLE_STAFF_ROLES.map((r) => (
          <option key={r} value={r}>
            {staffRoleLabel(r)}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** One-click approve buttons for someone waiting for access. */
export function ApproveButtons({ userId, name }: { userId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function approve(role: string) {
    if (role === STAFF_ROLE_ADMIN && !confirm(`Make ${name} an admin? Admins can change everyone's access.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await setStaffRole(userId, role);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => approve(STAFF_ROLE_STAFF)}
        disabled={pending}
        className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        Approve as Staff
      </button>
      <button
        type="button"
        onClick={() => approve(STAFF_ROLE_ADMIN)}
        disabled={pending}
        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        Approve as Admin
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
