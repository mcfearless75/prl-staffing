export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { effectiveKnownAs } from "@/lib/contractor-name";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { ProfileForm } from "./profile-form";

export default async function PortalProfilePage() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
    include: {
      compliances: {
        orderBy: { expiryDate: "asc" },
      },
    },
  });

  if (!contractor) redirect("/login");

  const initials = `${contractor.firstName[0]}${contractor.lastName[0]}`.toUpperCase();

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
          {initials}
        </div>
        <h1 className="mt-3 text-lg font-bold text-gray-900">
          {contractor.firstName} {contractor.lastName}
        </h1>
        {effectiveKnownAs(contractor) && (
          <p className="text-sm text-gray-600">Known as {effectiveKnownAs(contractor)}</p>
        )}
        <p className="text-sm text-gray-500">{contractor.jobTitle || "Contractor"}</p>
        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${
          contractor.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
        }`}>
          {contractor.status}
        </span>
      </div>

      {/* App Invite Form — see docs/superpowers/specs/2026-09-26-app-invite-form-design.md.
          Work Details, Assignment History and Next of Kin were removed from the
          worker's view per PRL; the data is kept and staff still see it. */}
      <ProfileForm
        contractorId={contractorId}
        submitted={!!contractor.profileSubmittedAt}
        initial={{
          title: contractor.title ?? "",
          firstName: contractor.firstName,
          lastName: contractor.lastName,
          knownAs: contractor.knownAs ?? "",
          pronouns: contractor.pronouns ?? "",
          nationality: contractor.nationality ?? "",
          phone: contractor.phone ?? "",
          email: contractor.email ?? "",
          address: contractor.address ?? "",
          postcode: contractor.postcode ?? "",
          dateOfBirth: contractor.dateOfBirth ? new Date(contractor.dateOfBirth).toISOString().split("T")[0] : "",
          niNumber: contractor.niNumber ?? "",
          emergencyContactName: contractor.emergencyContactName ?? "",
          emergencyContactPhone: contractor.emergencyContactPhone ?? "",
          emergencyContactRelation: contractor.emergencyContactRelation ?? "",
        }}
      />

      {/* Compliance Summary */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Compliance Summary</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {contractor.compliances.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">No compliance records</div>
          ) : (
            contractor.compliances.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.type}</p>
                  {c.expiryDate && (
                    <p className="text-[10px] text-gray-500">Expires {formatDate(c.expiryDate)}</p>
                  )}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  c.status === "Verified" ? "bg-emerald-100 text-emerald-700" :
                  c.status === "Expiring" ? "bg-orange-100 text-orange-700" :
                  c.status === "Expired" ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {c.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
