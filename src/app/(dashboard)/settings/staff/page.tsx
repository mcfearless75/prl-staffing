export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-staff";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { resolveOwnUserId } from "@/lib/staff-contact";
import { formatDate } from "@/lib/utils";
import { hasStaffAccess, staffRoleLabel, STAFF_ROLE_ADMIN, STAFF_ROLE_LEGACY, STAFF_ROLE_PENDING } from "@/lib/staff-access";
import { ApproveButtons, RoleSelect } from "./role-select";

/**
 * Staff access (admins only): approve new Microsoft sign-ins and set who is
 * Admin, Staff or has No access. Rules in src/lib/staff-access.ts.
 */
export default async function StaffAccessPage() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect(guard.reason === "unauthenticated" ? "/login" : "/");

  const selfId = await resolveOwnUserId(guard.session.user);
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, passwordHash: true, createdAt: true },
  });

  const waiting = users.filter((u) => u.role === STAFF_ROLE_PENDING);
  const legacy = users.filter((u) => u.role === STAFF_ROLE_LEGACY);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff access"
        description="Who can sign in to PRISM. Admins can change anyone's access except their own."
      />

      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
        <p>
          <span className="font-medium text-gray-900">Admin</span> — everything, including this page, mass email,
          GDPR erasure and bulk deletes. <span className="font-medium text-gray-900">Staff</span> — everyday use of
          PRISM. <span className="font-medium text-gray-900">No access</span> — can&apos;t get in.
        </p>
        <p className="mt-1">
          Anyone at @prlsitesolutions.co.uk who signs in with Microsoft for the first time is held at{" "}
          <span className="font-medium">No access</span> until approved here.
        </p>
      </div>

      {waiting.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Waiting for access ({waiting.length})</h2>
          <ul className="mt-3 divide-y divide-amber-200">
            {waiting.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div>
                  <div className="text-sm font-medium text-gray-900">{u.name}</div>
                  <div className="text-xs text-gray-600">
                    {u.email} · first signed in {formatDate(u.createdAt)}
                  </div>
                </div>
                <ApproveButtons userId={u.id} name={u.name} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {legacy.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          {legacy.length} {legacy.length === 1 ? "person was" : "people were"} let in automatically before this page
          existed (marked <span className="font-medium">Staff (not reviewed)</span>). Please set each to Staff, Admin
          or No access.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Signs in with</th>
              <th className="px-4 py-3">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className={hasStaffAccess(u.role) ? "" : "bg-gray-50 text-gray-500"}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {u.name}
                  {u.role === STAFF_ROLE_ADMIN && (
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {staffRoleLabel(u.role)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.passwordHash ? "Password or Microsoft" : "Microsoft"}</td>
                <td className="px-4 py-3">
                  <RoleSelect userId={u.id} name={u.name} role={u.role} isSelf={u.id === selfId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
