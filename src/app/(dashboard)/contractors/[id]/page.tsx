export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { deleteContractor } from "../actions";

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const contractor = await prisma.contractor.findUnique({
    where: { id },
    include: {
      supplier: true,
      assignments: {
        include: { company: true },
      },
      compliances: true,
    },
  });

  if (!contractor) {
    notFound();
  }

  const initials =
    (contractor.firstName?.[0] ?? "") + (contractor.lastName?.[0] ?? "");

  const statusColor =
    contractor.status === "Active"
      ? "bg-green-100 text-green-800"
      : contractor.status === "Inactive"
        ? "bg-gray-100 text-gray-800"
        : "bg-yellow-100 text-yellow-800";

  const deleteAction = deleteContractor.bind(null, contractor.id);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {contractor.firstName} {contractor.lastName}
              </h1>
              {contractor.jobTitle && (
                <p className="text-sm text-gray-500">{contractor.jobTitle}</p>
              )}
              <span
                className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
              >
                {contractor.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/contractors/${contractor.id}/ir35`}
              className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100 transition-colors"
            >
              IR35 Assessment
            </Link>
            <Link
              href={`/contractors/${contractor.id}/edit`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Edit
            </Link>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={contractor.id} />
              <button
                type="submit"
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="text-sm text-gray-900">{contractor.email || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Phone</p>
            <p className="text-sm text-gray-900">{contractor.phone || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Day Rate</p>
            <p className="text-sm text-gray-900">
              {contractor.dayRate != null
                ? `£${Number(contractor.dayRate).toFixed(2)}`
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Pay Rate/hr</p>
            <p className="text-sm text-gray-900">
              {contractor.payRate || "-"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Charge Rate/hr</p>
            <p className="text-sm text-gray-900">
              {contractor.chargeRate || "-"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">NI Number</p>
            <p className="text-sm text-gray-900">
              {contractor.niNumber || "-"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">UTR Number</p>
            <p className="text-sm text-gray-900">
              {contractor.utrNumber || "-"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">IR35 Status</p>
            <p className="text-sm">
              {contractor.ir35Status ? (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    contractor.ir35Status === "Outside"
                      ? "bg-emerald-100 text-emerald-700"
                      : contractor.ir35Status === "Inside"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {contractor.ir35Status}
                </span>
              ) : (
                <Link
                  href={`/contractors/${contractor.id}/ir35`}
                  className="text-blue-600 hover:underline text-xs"
                >
                  Run assessment →
                </Link>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Supplier</p>
            <p className="text-sm text-gray-900">
              {contractor.supplier?.name || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-red-900 flex items-center gap-2">
          🚨 Emergency Contact
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Contact Name</p>
            <p className="text-sm text-gray-900">{contractor.emergencyContactName || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Contact Phone</p>
            <p className="text-sm text-gray-900">
              {contractor.emergencyContactPhone ? (
                <a href={`tel:${contractor.emergencyContactPhone}`} className="text-blue-600 hover:underline">
                  {contractor.emergencyContactPhone}
                </a>
              ) : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Relationship</p>
            <p className="text-sm text-gray-900">{contractor.emergencyContactRelation || "-"}</p>
          </div>
        </div>
        {!contractor.emergencyContactName && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-xs text-red-600">⚠️ No emergency contact on file. <Link href={`/contractors/${contractor.id}/edit`} className="font-medium underline">Add one now</Link></p>
          </div>
        )}
      </div>

      {/* Personal Details */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Personal Details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Date of Birth</p>
            <p className="text-sm text-gray-900">
              {contractor.dateOfBirth ? new Date(contractor.dateOfBirth).toLocaleDateString("en-GB") : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Address</p>
            <p className="text-sm text-gray-900">{contractor.address || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Postcode</p>
            <p className="text-sm text-gray-900">{contractor.postcode || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Next of Kin</p>
            <p className="text-sm text-gray-900">{contractor.nextOfKin || "-"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-gray-500">Medical Notes</p>
            <p className="text-sm text-gray-900">{contractor.medicalNotes || "-"}</p>
          </div>
        </div>
      </div>

      {/* Assignments */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Assignments
        </h2>
        {contractor.assignments.length === 0 ? (
          <p className="text-sm text-gray-500">No assignments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Start Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    End Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contractor.assignments.map((assignment: any) => (
                  <tr key={assignment.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {assignment.company?.name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {assignment.role || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {assignment.startDate
                        ? new Date(assignment.startDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {assignment.endDate
                        ? new Date(assignment.endDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {assignment.status || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compliance */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Compliance
        </h2>
        {contractor.compliances.length === 0 ? (
          <p className="text-sm text-gray-500">No compliance records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Expiry Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contractor.compliances.map((compliance: any) => (
                  <tr key={compliance.id} className={compliance.status === "Pending" ? "bg-amber-50" : ""}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {compliance.type || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {compliance.reference || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {compliance.expiryDate
                        ? new Date(compliance.expiryDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        compliance.status === "Verified" ? "bg-emerald-100 text-emerald-700" :
                        compliance.status === "Pending" ? "bg-amber-100 text-amber-700" :
                        compliance.status === "Expiring" ? "bg-orange-100 text-orange-700" :
                        compliance.status === "Expired" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {compliance.status || "-"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        {compliance.status !== "Verified" && (
                          <a
                            href={`/api/compliance/${compliance.id}/verify?redirect=/contractors/${contractor.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                          >
                            ✓ Approve
                          </a>
                        )}
                        <Link
                          href={`/compliance/${compliance.id}`}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Notes</h2>
        <p className="whitespace-pre-wrap text-sm text-gray-700">
          {contractor.notes || "No notes."}
        </p>
      </div>
    </div>
  );
}
