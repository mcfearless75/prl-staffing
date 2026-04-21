export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { deleteContractor } from "../actions";
import { maskNI, maskUTR } from "@/lib/utils";
import { ContractorPortalStatus } from "@/components/contractor-portal-status";

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [contractor, activityLogs] = await Promise.all([
    prisma.contractor.findUnique({
      where: { id },
      include: {
        supplier: true,
        assignments: { include: { company: true } },
        compliances: true,
      },
    }),
    prisma.activityLog.findMany({
      where: { entityType: "Contractor", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

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
            <p className="text-sm text-gray-900 font-mono">
              {maskNI(contractor.niNumber)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">UTR Number</p>
            <p className="text-sm text-gray-900 font-mono">
              {maskUTR(contractor.utrNumber)}
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
            {contractor.medicalNotes ? (
              <details className="mt-1">
                <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800 font-medium">
                  🔒 Confidential — click to reveal (Article 9 special category data)
                </summary>
                <p className="mt-2 text-sm text-gray-900 rounded-lg bg-red-50 border border-red-200 p-3">
                  {contractor.medicalNotes}
                </p>
              </details>
            ) : (
              <p className="text-sm text-gray-900">-</p>
            )}
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

      {/* Portal Account */}
      <div className="rounded-xl border border-blue-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-blue-900 flex items-center gap-2">
          🔐 Portal Account
        </h2>
        <ContractorPortalStatus contractorId={contractor.id} />
      </div>

      {/* Activity Feed */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Activity</h2>
        {activityLogs.length === 0 ? (
          <p className="text-sm text-gray-500">No activity recorded yet.</p>
        ) : (
          <ol className="relative border-l border-gray-200 space-y-4 ml-2">
            {activityLogs.map((log) => {
              const icon = log.action.includes("Email Opened") ? "📬"
                : log.action.includes("Email") || log.action.includes("Sent") ? "📧"
                : log.action.includes("Status") ? "🔄"
                : log.action.includes("Created") || log.action.includes("APPLICATION") ? "✅"
                : log.action.includes("Login") ? "🔐"
                : log.action.includes("Upload") || log.action.includes("Doc") ? "📎"
                : log.action.includes("Deleted") ? "🗑️"
                : "📋";
              return (
                <li key={log.id} className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-300" />
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none mt-0.5">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{log.action}</p>
                      {log.userName && (
                        <p className="text-xs text-gray-500">by {log.userName}{log.userEmail ? ` (${log.userEmail})` : ""}</p>
                      )}
                      <time className="text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {" "}
                        {new Date(log.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </time>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Notes / Application Data */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Notes</h2>
        <ApplicationNotes raw={contractor.notes} />
      </div>
    </div>
  );
}

function row(label: string, value: unknown) {
  const v = value === null || value === undefined || value === "" ? null : String(value);
  if (!v) return null;
  return (
    <div key={label} className="grid grid-cols-[180px_1fr] gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="text-xs text-gray-800 break-words">{v}</span>
    </div>
  );
}

function ApplicationNotes({ raw }: { raw: string | null }) {
  if (!raw) return <p className="text-sm text-gray-500">No notes.</p>;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    // Plain text notes — just display as-is
    return <p className="whitespace-pre-wrap text-sm text-gray-700">{raw}</p>;
  }

  const sections: Array<{ title: string; fields: Array<[string, unknown]> }> = [
    {
      title: "Location & Nationality",
      fields: [
        ["Country", data.country],
        ["City", data.city],
        ["Non-British National", data.nonBritishNational],
        ["Requires Work Permit", data.requiresWorkPermit],
        ["Passport Number", data.passportNumber],
        ["Passport Expiry", data.passportExpiry],
        ["Visa Number", data.visaNumber],
        ["Visa Expiry", data.visaExpiry],
      ],
    },
    {
      title: "Driving",
      fields: [
        ["Full UK Driving Licence", data.fullDrivingLicence],
        ["Motoring Convictions", data.motoringConvictions],
        ["Regular Use Of", data.regularUseOf],
        ["Endorsement Details", data.endorsementDetails],
      ],
    },
    {
      title: "Next of Kin",
      fields: [["Next of Kin", data.nextOfKin]],
    },
    {
      title: "Bank Details",
      fields: [
        ["Bank Name", data.bankName],
        ["Name on Account", data.nameOnAccount],
        ["Account in Your Name", data.accountInYourName],
        ["Account Number", data.accountNumber],
        ["Sort Code", data.sortCode],
      ],
    },
    {
      title: "Work Requirements",
      fields: [
        ["Positions Sought", data.positionsSought],
        ["Salary / Rate Required", data.salaryRequired],
        ["Hours Preferred", data.hoursPreferred],
        ["Days Preferred", data.daysPreferred],
        ["Locations Preferred", data.locationsPreferred],
        ["Required Hours", data.requiredHours],
        ["Relevant Skills", data.relevantSkills],
      ],
    },
    {
      title: "Criminal Record & Security",
      fields: [
        ["DBS (last 3 years)", data.hasDbs],
        ["DBS Number", data.dbsNumber],
        ["DBS Issued", data.dbsIssued],
        ["Criminal Conviction", data.hasCriminalConviction],
        ["Previous Convictions", data.hasPreviousConvictions],
        ["Security Clearance", data.hasSecurityClearance],
        ["Clearance Level", data.clearanceLevel],
      ],
    },
    {
      title: "Declaration",
      fields: [
        ["48hr Waiver Decision", data.waiverDecision],
        ["Signature", data.signature],
        ["Privacy Agreed", data.privacyAgreed ? "Yes" : null],
      ],
    },
    {
      title: "References",
      fields: [["References", data.references]],
    },
  ];

  return (
    <div className="space-y-5">
      {sections.map((section) => {
        const rows = section.fields.map(([label, val]) => row(label, val)).filter(Boolean);
        if (rows.length === 0) return null;
        return (
          <div key={section.title}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-1">
              {section.title}
            </h3>
            <div>{rows}</div>
          </div>
        );
      })}
    </div>
  );
}
