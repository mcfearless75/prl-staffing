export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { maskNI, maskUTR } from "@/lib/utils";
import { ContractorPortalStatus } from "@/components/contractor-portal-status";
import { ContractorQuickAssign } from "./contractor-quick-assign";
import { DeleteContractorButton } from "./delete-contractor-button";
import { SendAppInviteButton } from "./send-app-invite-button";
import { BulkDocUploader } from "./bulk-doc-uploader";
import { categoryForType } from "@/lib/compliance-types";

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [contractor, activityLogs, documents, complianceRecords, companies] = await Promise.all([
    prisma.contractor.findUnique({
      where: { id },
      include: {
        supplier: true,
        assignments: { include: { company: true, site: true, department: true } },
        compliances: true,
      },
    }),
    prisma.activityLog.findMany({
      where: { entityType: "Contractor", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.document.findMany({
      where: { contractorId: id },
      orderBy: [{ type: "asc" }, { version: "desc" }],
    }),
    prisma.complianceRecord.findMany({
      where: { contractorId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      include: {
        sites: {
          orderBy: { name: "asc" },
          include: {
            departments: { orderBy: { name: "asc" } },
          },
        },
      },
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

  function worstStatus(statuses: string[]): string {
    if (statuses.length === 0) return "No Records";
    if (statuses.some((s) => s === "Expired" || s === "Non-Compliant")) return "Non-Compliant";
    if (statuses.some((s) => s === "Expiring")) return "Expiring";
    if (statuses.some((s) => s === "Pending")) return "Pending";
    return "Verified";
  }
  const overallStatus = worstStatus(complianceRecords.map((r) => r.status));

  const overallStatusColor =
    overallStatus === "Verified"
      ? "bg-emerald-100 text-emerald-700"
      : overallStatus === "Non-Compliant"
        ? "bg-red-100 text-red-700"
        : overallStatus === "Expiring"
          ? "bg-orange-100 text-orange-700"
          : overallStatus === "Pending"
            ? "bg-amber-100 text-amber-700"
            : "bg-gray-100 text-gray-500";

  const overallStatusDot =
    overallStatus === "Verified"
      ? "bg-emerald-500"
      : overallStatus === "Non-Compliant"
        ? "bg-red-500"
        : overallStatus === "Expiring"
          ? "bg-orange-400"
          : overallStatus === "Pending"
            ? "bg-amber-400"
            : "bg-gray-300";

  const crVerified = complianceRecords.filter((r) => r.status === "Verified").length;
  const crPending = complianceRecords.filter((r) => r.status === "Pending").length;
  const crActionRequired = complianceRecords.filter(
    (r) => r.status === "Expired" || r.status === "Non-Compliant" || r.status === "Expiring"
  ).length;

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
              <span
                className={`mt-1 ml-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${overallStatusColor}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${overallStatusDot}`} />
                Compliance: {overallStatus}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/contractors"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              ← Contractors
            </Link>
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
            <SendAppInviteButton contractorId={contractor.id} />
            <DeleteContractorButton contractorId={contractor.id} />
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
          {contractor.personalEmail && (
            <div>
              <p className="text-sm font-medium text-gray-500">Personal / secondary email</p>
              <p className="text-sm text-gray-900">{contractor.personalEmail}</p>
            </div>
          )}
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
        <ContractorQuickAssign contractorId={contractor.id} companies={companies} />
        {contractor.assignments.length === 0 ? (
          <p className="text-sm text-gray-500">No assignments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contractor.assignments.map((assignment: any) => (
                  <tr key={assignment.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{assignment.company?.name || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{assignment.site?.name || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{assignment.department?.name || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{assignment.role || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {assignment.startDate ? new Date(assignment.startDate).toLocaleDateString("en-GB") : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        assignment.status === "Active" ? "bg-green-100 text-green-700" :
                        assignment.status === "Completed" ? "bg-gray-100 text-gray-600" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>{assignment.status || "-"}</span>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Compliance</h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/contractors/${contractor.id}/edit`}
              className="text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              Upload Docs →
            </Link>
            <Link
              href={`/compliance/new?contractorId=${contractor.id}`}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Add Record
            </Link>
          </div>
        </div>
        <details className="mb-4 group">
          <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800 select-none">
            📥 Bulk upload documents
          </summary>
          <div className="mt-3">
            <BulkDocUploader contractorId={contractor.id} />
          </div>
        </details>
        {contractor.compliances.length === 0 && documents.length === 0 ? (
          <p className="text-sm text-gray-500">No compliance records or documents found.</p>
        ) : (
          <div className="space-y-3">
            {contractor.compliances.map((compliance: any) => {
              const compDocs = documents.filter((d) => d.type === compliance.type ||
                (compliance.type === "Right to Work" && ["Right to Work", "Passport", "Share Code"].includes(d.type)));
              return (
                <div key={compliance.id} className={`rounded-lg border px-4 py-3 ${
                  compliance.status === "Expired" || compliance.status === "Non-Compliant" ? "border-red-200 bg-red-50" :
                  compliance.status === "Expiring" ? "border-amber-200 bg-amber-50" :
                  compliance.status === "Verified" ? "border-emerald-200 bg-emerald-50/50" :
                  "border-gray-200 bg-gray-50"
                }`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        compliance.status === "Verified" ? "bg-emerald-100 text-emerald-700" :
                        compliance.status === "Pending" ? "bg-amber-100 text-amber-700" :
                        compliance.status === "Expiring" ? "bg-orange-100 text-orange-700" :
                        compliance.status === "Expired" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {compliance.status || "-"}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{compliance.type}</span>
                      {compliance.reference && (
                        <span className="text-xs text-gray-500">#{compliance.reference}</span>
                      )}
                      {compliance.indefiniteExpiry ? (
                        <span className="text-xs text-gray-500">No expiry</span>
                      ) : compliance.expiryDate && (
                        <span className="text-xs text-gray-500">
                          Expires {new Date(compliance.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {compliance.status !== "Verified" && (
                        <a
                          href={`/api/compliance/${compliance.id}/verify?redirect=/contractors/${contractor.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                        >
                          ✓ Approve
                        </a>
                      )}
                      <Link href={`/compliance/${compliance.id}`} className="text-xs font-medium text-blue-600 hover:text-blue-800">View</Link>
                      <Link href={`/compliance/${compliance.id}/edit`} className="text-xs font-medium text-gray-500 hover:text-gray-800">Edit</Link>
                    </div>
                  </div>
                  {/* Uploaded documents for this compliance type */}
                  {compDocs.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-gray-200 pt-2">
                      {compDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between text-xs text-gray-600">
                          <span className="truncate max-w-[60%]">📎 {doc.fileName}</span>
                          <div className="flex gap-2 shrink-0">
                            <a href={`/api/documents/download?id=${doc.id}&view=true`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>
                            <a href={`/api/documents/download?id=${doc.id}`} className="text-gray-500 hover:underline">Download</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Documents with no matching compliance record */}
            {(() => {
              const recordTypes = contractor.compliances.map((c: any) => c.type);
              const orphanDocs = documents.filter((d) => !recordTypes.includes(d.type) &&
                !(recordTypes.includes("Right to Work") && ["Passport", "Share Code"].includes(d.type)));
              if (orphanDocs.length === 0) return null;
              return (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3">
                  <p className="text-xs font-semibold text-blue-800 mb-2">📁 Uploaded documents (no linked record)</p>
                  <div className="space-y-1">
                    {orphanDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between text-xs text-gray-600">
                        <span className="truncate max-w-[60%]">{doc.type} — {doc.fileName}</span>
                        <div className="flex gap-2 shrink-0">
                          <a href={`/api/documents/download?id=${doc.id}&view=true`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>
                          <a href={`/api/documents/download?id=${doc.id}`} className="text-gray-500 hover:underline">Download</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Compliance Records */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Compliance Records</h2>
          <Link
            href={`/compliance/new?contractorId=${contractor.id}`}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Add Compliance Record
          </Link>
        </div>

        {complianceRecords.length > 0 && (
          <p className="mb-4 text-sm text-gray-600">
            <span className="font-medium">{complianceRecords.length} compliance record{complianceRecords.length !== 1 ? "s" : ""}</span>
            {" — "}
            <span className="text-emerald-700">{crVerified} verified</span>
            {", "}
            <span className="text-amber-600">{crPending} pending</span>
            {", "}
            <span className="text-red-600">{crActionRequired} action required</span>
          </p>
        )}

        {complianceRecords.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-6 py-8 text-center">
            <p className="text-sm text-gray-500 mb-3">No compliance records on file.</p>
            <Link
              href={`/compliance/new?contractorId=${contractor.id}`}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Add Compliance Record
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {(() => {
              // Right to Work evidence is tracked separately from competencies
              // and certificates — they're different compliance obligations.
              const isRtw = (r: (typeof complianceRecords)[number]) =>
                categoryForType(r.type) === "Right to Work";
              const sections = [
                { label: "Right to Work", records: complianceRecords.filter(isRtw) },
                { label: "Comps & Certs", records: complianceRecords.filter((r) => !isRtw(r)) },
              ].filter((s) => s.records.length > 0);

              const renderCard = (rec: (typeof complianceRecords)[number]) => (
                      <div
                        key={rec.id}
                        className={`rounded-lg border px-4 py-3 ${
                          rec.status === "Expired" || rec.status === "Non-Compliant"
                            ? "border-red-200 bg-red-50"
                            : rec.status === "Expiring"
                              ? "border-amber-200 bg-amber-50"
                              : rec.status === "Verified"
                                ? "border-emerald-200 bg-emerald-50/50"
                                : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0 flex-wrap">
                            <span
                              className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                rec.status === "Verified"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : rec.status === "Pending"
                                    ? "bg-amber-100 text-amber-700"
                                    : rec.status === "Expiring"
                                      ? "bg-orange-100 text-orange-700"
                                      : rec.status === "Expired" || rec.status === "Non-Compliant"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {rec.status}
                            </span>
                            {rec.documentName && (
                              <span className="text-sm text-gray-800 font-medium truncate">{rec.documentName}</span>
                            )}
                            {rec.reference && (
                              <span className="text-xs text-gray-500">#{rec.reference}</span>
                            )}
                            {rec.issueDate && (
                              <span className="text-xs text-gray-500">
                                Issued {new Date(rec.issueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                            {rec.indefiniteExpiry ? (
                              <span className="text-xs text-gray-500">No expiry</span>
                            ) : rec.expiryDate && (
                              <span className="text-xs text-gray-500">
                                Expires {new Date(rec.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/compliance/${rec.id}/edit`}
                            className="text-xs font-medium text-gray-500 hover:text-gray-800 shrink-0"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
              );

              return sections.map((section) => {
                const grouped: Record<string, typeof complianceRecords> = {};
                for (const rec of section.records) {
                  if (!grouped[rec.type]) grouped[rec.type] = [];
                  grouped[rec.type].push(rec);
                }
                return (
                  <section key={section.label}>
                    <h3 className="mb-3 border-b border-gray-200 pb-1.5 text-sm font-semibold text-gray-900">
                      {section.label}
                      <span className="ml-2 font-normal text-gray-400">
                        ({section.records.length})
                      </span>
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(grouped).map(([type, records]) => (
                        <div key={type}>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {type}
                          </h4>
                          <div className="space-y-2">{records.map(renderCard)}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              });
            })()}
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
