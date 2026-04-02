export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDate, maskNI, maskUTR } from "@/lib/utils";
import { Shield, Calendar, Building2, Briefcase } from "lucide-react";
import { ProfileForm } from "./profile-form";

export default async function PortalProfilePage() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
    include: {
      assignments: {
        include: { company: true },
        orderBy: { startDate: "desc" },
      },
      compliances: {
        orderBy: { expiryDate: "asc" },
      },
    },
  });

  if (!contractor) redirect("/login");

  const initials = `${contractor.firstName[0]}${contractor.lastName[0]}`.toUpperCase();

  // Mask NI number for display
  const maskedNI = contractor.niNumber
    ? `****${contractor.niNumber.slice(-3)}`
    : "Not provided";

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
        <p className="text-sm text-gray-500">{contractor.jobTitle || "Contractor"}</p>
        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${
          contractor.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
        }`}>
          {contractor.status}
        </span>
      </div>

      {/* Editable Contact & Emergency Details */}
      <ProfileForm
        contractorId={contractorId}
        phone={contractor.phone || ""}
        email={contractor.email || ""}
        address={(contractor as Record<string, unknown>).address as string || ""}
        postcode={(contractor as Record<string, unknown>).postcode as string || ""}
        emergencyContactName={(contractor as Record<string, unknown>).emergencyContactName as string || ""}
        emergencyContactPhone={(contractor as Record<string, unknown>).emergencyContactPhone as string || ""}
        emergencyContactRelation={(contractor as Record<string, unknown>).emergencyContactRelation as string || ""}
      />

      {/* Work Details (read-only) */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Work Details</h2>
          <p className="text-[10px] text-gray-400">Contact PRL to update these fields</p>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex items-center gap-3 px-4 py-3">
            <Briefcase className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-[10px] text-gray-500">Role / Trade</p>
              <p className="text-sm text-gray-900">{contractor.jobTitle || "Not specified"}</p>
            </div>
          </div>
          {contractor.utrNumber && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Building2 className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-[10px] text-gray-500">UTR Number</p>
                <p className="text-sm text-gray-900 font-mono">{maskUTR(contractor.utrNumber)}</p>
              </div>
            </div>
          )}
          {contractor.ir35Status && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-[10px] text-gray-500">IR35 Status</p>
                <p className="text-sm text-gray-900">{contractor.ir35Status}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 px-4 py-3">
            <Shield className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-[10px] text-gray-500">NI Number</p>
              <p className="text-sm text-gray-900">{maskedNI}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment History */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Assignment History ({contractor.assignments.length})</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {contractor.assignments.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">No assignments yet</div>
          ) : (
            contractor.assignments.map((a) => (
              <div key={a.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{a.role}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    a.status === "Active" ? "bg-emerald-100 text-emerald-700" :
                    a.status === "Placed" ? "bg-blue-100 text-blue-700" :
                    a.status === "Completed" ? "bg-gray-100 text-gray-600" :
                    "bg-orange-100 text-orange-700"
                  }`}>
                    {a.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{a.company.name} {a.location ? `· ${a.location}` : ""}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {formatDate(a.startDate)} {a.endDate ? `— ${formatDate(a.endDate)}` : "— Present"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

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
