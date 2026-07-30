import { prisma } from "@/lib/db";
import { loadRequirementMatcher } from "@/lib/compliance-gaps";

const ACTIVE_ASSIGNMENT_STATUSES = ["Placed", "Active", "Ending"];

/**
 * Fallback checklist, used only when no ComplianceRequirement rows exist at all.
 * Without it a contractor sent this link before requirements are configured
 * would be told they need nothing — the page would congratulate them on being
 * complete while holding no documents.
 */
const FALLBACK_TYPES = ["Right to Work", "CSCS"];

interface PageProps {
  searchParams: Promise<{ contractorId?: string; success?: string }>;
}

export default async function ComplianceUploadPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { contractorId, success } = params;

  if (!contractorId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-medium text-lg">Invalid link</p>
          <p className="text-gray-500 mt-2">Please contact PRL Site Solutions to get a valid upload link.</p>
        </div>
      </div>
    );
  }

  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      jobTitle: true,
      assignments: {
        where: { status: { in: ACTIVE_ASSIGNMENT_STATUSES } },
        select: { role: true, companyId: true },
      },
    },
  });

  if (!contractor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-medium text-lg">Contractor not found</p>
          <p className="text-gray-500 mt-2">This link may be invalid. Please contact PRL Site Solutions.</p>
        </div>
      </div>
    );
  }

  const existing = await prisma.complianceRecord.findMany({
    where: { contractorId },
    select: { type: true, status: true },
  });

  // What this contractor needs comes from their role's checklist, not a fixed
  // list — a Joiner and a Groundworker are asked for different cards.
  const matcher = await loadRequirementMatcher();
  const assignment =
    contractor.assignments.find((a) => a.role?.trim()) ?? contractor.assignments[0];
  const checklist = matcher.forRole(assignment?.role, contractor.jobTitle, assignment?.companyId);

  const requiredTypes =
    checklist.length > 0 ? checklist.filter((c) => c.isMandatory).map((c) => c.type) : FALLBACK_TYPES;

  const existingTypes = new Set(existing.map((r) => r.type));
  const missingTypes = requiredTypes.filter((t) => !existingTypes.has(t));
  const allCovered = missingTypes.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <img src="/prl-logo.png" alt="PRL Site Solutions" className="h-8" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="text-gray-400 text-sm">PRL Site Solutions</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Upload Your Compliance Documents
          </h1>
          <p className="text-gray-600 mt-1">
            {contractor.firstName} {contractor.lastName}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            PRL Site Solutions needs the following documents to keep your record up to date.
          </p>
        </div>

        {/* Success banner */}
        {success === "true" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">Document uploaded successfully. Our team will review it shortly.</p>
          </div>
        )}

        {/* All covered */}
        {allCovered ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-green-600 text-xl font-semibold">You are all up to date!</p>
            <p className="text-gray-500 mt-2">All required compliance documents have been submitted.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Documents required</h2>
            {missingTypes.map((docType) => (
              <div key={docType} className="bg-white rounded-lg shadow p-6">
                <h3 className="font-medium text-gray-900 mb-1">{docType}</h3>
                <p className="text-sm text-gray-500 mb-4">Upload a clear copy of your {docType} document.</p>
                <form
                  action="/api/compliance/upload-doc"
                  method="POST"
                  encType="multipart/form-data"
                  className="flex flex-col gap-3"
                >
                  <input type="hidden" name="contractorId" value={contractorId} />
                  <input type="hidden" name="type" value={docType} />
                  <label className="block">
                    <span className="text-sm text-gray-600 mb-1 block">Choose file (PDF, JPG, PNG — max 10MB)</span>
                    <input
                      type="file"
                      name="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      required
                      className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </label>
                  <button
                    type="submit"
                    className="self-start px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                  >
                    Upload {docType}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {/* Existing records */}
        {existing.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Existing records</h2>
            <ul className="divide-y divide-gray-100">
              {existing.map((record, i) => (
                <li key={i} className="py-3 flex items-center justify-between">
                  <span className="text-gray-700 text-sm font-medium">{record.type}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      record.status === "Approved"
                        ? "bg-green-100 text-green-700"
                        : record.status === "Pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : record.status === "Expired"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {record.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Having trouble? Contact PRL Site Solutions at info@prlsitesolutions.co.uk
        </p>
      </div>
    </div>
  );
}
