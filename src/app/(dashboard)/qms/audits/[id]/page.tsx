export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { addFinding, closeFinding, deleteAudit } from "../actions";

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const audit = await prisma.internalAudit.findUnique({
    where: { id },
    include: { findings: { orderBy: { findingNumber: "asc" } } },
  });

  if (!audit) notFound();

  const deleteWithId = deleteAudit.bind(null, id);
  const addFindingWithId = addFinding.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={audit.auditNumber}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/qms/audits"
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Back to Audits
            </Link>
            <form action={deleteWithId}>
              <button
                type="submit"
                className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                Delete
              </button>
            </form>
          </div>
        }
      />

      {/* Audit Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Audit Details</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-gray-500">Title</dt>
            <dd className="mt-1 text-sm text-gray-900">{audit.title}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <Badge variant={audit.status}>{audit.status}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Audit Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(audit.auditDate)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Lead Auditor</dt>
            <dd className="mt-1 text-sm text-gray-900">{audit.leadAuditor}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Audit Team</dt>
            <dd className="mt-1 text-sm text-gray-900">{audit.auditTeam || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">ISO Clause</dt>
            <dd className="mt-1 text-sm text-gray-900">{audit.isoClause || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Overall Result</dt>
            <dd className="mt-1 text-sm text-gray-900">{audit.overallResult || "—"}</dd>
          </div>
          {audit.scope && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-medium text-gray-500">Scope</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{audit.scope}</dd>
            </div>
          )}
          {audit.summary && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-medium text-gray-500">Summary</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{audit.summary}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Findings List */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Findings ({audit.findings.length})
        </h2>

        {audit.findings.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ISO Clause</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Target Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {audit.findings.map((finding) => {
                  const closeWithId = closeFinding.bind(null, finding.id);
                  return (
                    <tr key={finding.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        {finding.findingNumber}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge
                          variant={
                            finding.type.includes("Major")
                              ? "Rejected"
                              : finding.type.includes("Minor")
                              ? "Expiring"
                              : finding.type === "Positive"
                              ? "Approved"
                              : "Pending"
                          }
                        >
                          {finding.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {finding.description}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {finding.isoClause || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {finding.assignedTo || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {finding.targetDate ? formatDate(finding.targetDate) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge variant={finding.status}>{finding.status}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {finding.status !== "Closed" && (
                          <form action={closeWithId} className="inline">
                            <button
                              type="submit"
                              className="text-sm font-medium text-emerald-600 hover:text-emerald-800"
                            >
                              Close
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No findings recorded yet.</p>
        )}
      </div>

      {/* Add Finding Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Add Finding</h2>
        <form action={addFindingWithId} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="NC Minor">NC Minor</option>
                <option value="NC Major">NC Major</option>
                <option value="Observation">Observation</option>
                <option value="Opportunity for Improvement">Opportunity for Improvement</option>
                <option value="Positive">Positive</option>
              </select>
            </div>
            <div>
              <label htmlFor="findingIsoClause" className="block text-sm font-medium text-gray-700 mb-1">
                ISO Clause
              </label>
              <input
                type="text"
                id="findingIsoClause"
                name="isoClause"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. 7.5.1"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Describe the finding..."
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="evidence" className="block text-sm font-medium text-gray-700 mb-1">
                Evidence
              </label>
              <textarea
                id="evidence"
                name="evidence"
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Objective evidence..."
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="correctiveAction" className="block text-sm font-medium text-gray-700 mb-1">
                Corrective Action
              </label>
              <textarea
                id="correctiveAction"
                name="correctiveAction"
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Required corrective action..."
              />
            </div>
            <div>
              <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To
              </label>
              <input
                type="text"
                id="assignedTo"
                name="assignedTo"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Person responsible"
              />
            </div>
            <div>
              <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 mb-1">
                Target Date
              </label>
              <input
                type="date"
                id="targetDate"
                name="targetDate"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Add Finding
          </button>
        </form>
      </div>
    </div>
  );
}
