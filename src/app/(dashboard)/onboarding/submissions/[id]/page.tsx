export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate, maskNI, maskUTR } from "@/lib/utils";
import { Badge } from "@/components/badge";
import Link from "next/link";
import { approveAndCreateContractor, updateSubmissionStatus, sendAppInvite } from "../actions";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const submission = await prisma.supplyAgreement.findUnique({
    where: { id },
  });

  if (!submission) notFound();

  let rates: { description: string; rate: string; basis: string }[] = [];
  try {
    rates = submission.rates ? JSON.parse(submission.rates) : [];
  } catch {
    rates = [];
  }

  let breakdown: unknown[] = [];
  try {
    breakdown = submission.breakdown ? JSON.parse(submission.breakdown) : [];
  } catch {
    breakdown = [];
  }

  // Check if contractor already created from this submission
  const existingContractor = submission.contactEmail
    ? await prisma.contractor.findFirst({
        where: { email: submission.contactEmail },
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/onboarding/submissions" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
            ← Back to Submissions
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {submission.contactName}
            {submission.status === "Pending" && (
              <span className="ml-3 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 animate-pulse">
                NEW
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500">{submission.companyName} · Submitted {formatDate(submission.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={submission.status}>{submission.status}</Badge>
        </div>
      </div>

      {/* Action Buttons */}
      {submission.status === "Pending" || submission.status === "Reviewed" ? (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-3">Actions Required</h3>
          <div className="flex flex-wrap gap-3">
            {!existingContractor ? (
              <form action={approveAndCreateContractor}>
                <input type="hidden" name="submissionId" value={submission.id} />
                <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
                  ✓ Approve & Create Contractor
                </button>
              </form>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800">
                ✓ Contractor already created —{" "}
                <Link href={`/contractors/${existingContractor.id}`} className="underline">
                  View Profile
                </Link>
              </div>
            )}

            {existingContractor && (
              <form action={sendAppInvite}>
                <input type="hidden" name="contractorId" value={existingContractor.id} />
                <input type="hidden" name="email" value={submission.contactEmail} />
                <input type="hidden" name="name" value={submission.contactName} />
                <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                  📧 Send App Invite
                </button>
              </form>
            )}

            <form action={updateSubmissionStatus}>
              <input type="hidden" name="submissionId" value={submission.id} />
              <input type="hidden" name="status" value="Rejected" />
              <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors">
                ✕ Reject
              </button>
            </form>

            {submission.status === "Pending" && (
              <form action={updateSubmissionStatus}>
                <input type="hidden" name="submissionId" value={submission.id} />
                <input type="hidden" name="status" value="Reviewed" />
                <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                  Mark as Reviewed
                </button>
              </form>
            )}
          </div>
        </div>
      ) : submission.status === "Approved" && existingContractor ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-emerald-800">
              ✓ Approved and contractor created —{" "}
              <Link href={`/contractors/${existingContractor.id}`} className="font-medium underline">
                View {submission.contactName}&apos;s Profile
              </Link>
            </p>
            <form action={sendAppInvite}>
              <input type="hidden" name="contractorId" value={existingContractor.id} />
              <input type="hidden" name="email" value={submission.contactEmail} />
              <input type="hidden" name="name" value={submission.contactName} />
              <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
                📧 Send App Invite
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Company Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div><p className="text-xs text-gray-500 uppercase">Company Name</p><p className="mt-1 text-sm font-medium">{submission.companyName}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">Contact Email</p><p className="mt-1 text-sm font-medium"><a href={`mailto:${submission.contactEmail}`} className="text-blue-600">{submission.contactEmail}</a></p></div>
          <div><p className="text-xs text-gray-500 uppercase">Contact Phone</p><p className="mt-1 text-sm font-medium">{submission.contactPhone || "—"}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">Company Address</p><p className="mt-1 text-sm font-medium">{submission.companyAddress || "—"}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">Company Reg No</p><p className="mt-1 text-sm font-medium">{submission.companyRegNo || "—"}</p></div>
        </div>
      </div>

      {/* Supply Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Supply Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div><p className="text-xs text-gray-500 uppercase">Supply Of</p><p className="mt-1 text-sm font-medium">{submission.supplyOf || "—"}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">Site Location</p><p className="mt-1 text-sm font-medium">{submission.siteLocation || "—"}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">Start Date</p><p className="mt-1 text-sm font-medium">{submission.startDate ? formatDate(submission.startDate) : "—"}</p></div>
        </div>
      </div>

      {/* Rates */}
      {rates.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Charge Rates</h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Rate</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rates.map((r: { description: string; rate: string; basis: string }, i: number) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-sm">{r.description}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium">{r.rate}</td>
                  <td className="px-4 py-2 text-sm">{r.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Personal Details */}
      {(submission.firstName || submission.lastName) && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div><p className="text-xs text-gray-500 uppercase">Name</p><p className="mt-1 text-sm font-medium">{submission.firstName} {submission.lastName}</p></div>
            <div><p className="text-xs text-gray-500 uppercase">Date of Birth</p><p className="mt-1 text-sm font-medium">{submission.dateOfBirth ? formatDate(submission.dateOfBirth) : "—"}</p></div>
            <div><p className="text-xs text-gray-500 uppercase">NI Number</p><p className="mt-1 text-sm font-medium font-mono">{maskNI(submission.niNumber)}</p></div>
            <div><p className="text-xs text-gray-500 uppercase">UTR Number</p><p className="mt-1 text-sm font-medium font-mono">{maskUTR(submission.utrNumber)}</p></div>
            <div><p className="text-xs text-gray-500 uppercase">Address</p><p className="mt-1 text-sm font-medium">{submission.address || "—"}</p></div>
            <div><p className="text-xs text-gray-500 uppercase">Postcode</p><p className="mt-1 text-sm font-medium">{submission.postcode || "—"}</p></div>
          </div>
        </div>
      )}

      {/* Emergency Contact */}
      {submission.emergencyContactName && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-4">🚨 Emergency Contact</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div><p className="text-xs text-red-500 uppercase">Name</p><p className="mt-1 text-sm font-medium">{submission.emergencyContactName}</p></div>
            <div><p className="text-xs text-red-500 uppercase">Phone</p><p className="mt-1 text-sm font-medium">{submission.emergencyContactPhone || "—"}</p></div>
            <div><p className="text-xs text-red-500 uppercase">Relationship</p><p className="mt-1 text-sm font-medium">{submission.emergencyContactRelation || "—"}</p></div>
          </div>
        </div>
      )}

      {/* Additional Info */}
      {submission.additionalInfo && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.additionalInfo}</p>
        </div>
      )}

      {/* Review Info */}
      {submission.reviewedBy && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs text-gray-500">
            Reviewed by <strong>{submission.reviewedBy}</strong> on {submission.reviewedAt ? formatDate(submission.reviewedAt) : "—"}
          </p>
          {submission.notes && <p className="text-xs text-gray-500 mt-1">Notes: {submission.notes}</p>}
        </div>
      )}
    </div>
  );
}
