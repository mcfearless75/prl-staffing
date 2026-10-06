export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/require-staff";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { resolveOwnUserId } from "@/lib/staff-contact";
import { staffRoleLabel } from "@/lib/staff-access";
import { MyDetailsForm } from "./my-details-form";

// The signed-in staff member's own contact details, shown on messages they
// send to workers (Jen, 2026-10-06). Email and role are not editable here.
export default async function MyDetailsPage() {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");

  const userId = await resolveOwnUserId(guard.session.user);
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, role: true, phone: true, jobTitle: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My details"
        description="Your phone number and job title appear on messages you send to workers."
      />

      {!user ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          We couldn&apos;t find a PRISM account for {guard.session.user.email ?? "you"}. Please contact IT.
        </div>
      ) : (
        <div className="max-w-xl rounded-xl border border-gray-200 bg-white p-6">
          <dl className="mb-5 grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
            <dt className="text-gray-500">Name</dt>
            <dd className="text-gray-900">{user.name}</dd>
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900">{user.email}</dd>
            <dt className="text-gray-500">Role</dt>
            <dd className="text-gray-900">{staffRoleLabel(user.role)}</dd>
          </dl>
          <MyDetailsForm initial={{ phone: user.phone ?? "", jobTitle: user.jobTitle ?? "" }} />
        </div>
      )}
    </div>
  );
}
