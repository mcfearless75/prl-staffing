export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { deleteNCR, closeNCR, verifyNCR } from "../actions";

export default async function NCRDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ncr = await prisma.nonConformance.findUnique({
    where: { id },
  });

  if (!ncr) {
    notFound();
  }

  const isOverdue =
    ncr.status !== "Closed" &&
    ncr.targetDate &&
    new Date(ncr.targetDate) < new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${ncr.ncrNumber} — ${ncr.title}`}
        description={`Raised ${formatDate(ncr.raisedDate)} by ${ncr.raisedBy}`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/qms/ncr"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to Register
            </Link>
            <Link
              href={`/qms/ncr/${id}/edit`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Edit
            </Link>
          </div>
        }
      />

      {/* Status & Severity Row */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={ncr.status}>{ncr.status}</Badge>
        <Badge variant={ncr.severity}>{ncr.severity}</Badge>
        <span className="text-sm text-gray-500">{ncr.category}</span>
        <span className="text-sm text-gray-500">{ncr.source}</span>
        {isOverdue && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            OVERDUE
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Description</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ncr.description}</p>
          </div>

          {/* Lifecycle: Root Cause -> Corrective -> Preventive */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
            <h3 className="text-sm font-semibold text-gray-900">CAPA Lifecycle</h3>

            {/* Step 1: Raised */}
            <div className="relative pl-6 border-l-2 border-blue-300">
              <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-blue-500" />
              <div className="mb-1 text-xs font-semibold text-blue-600 uppercase">Raised</div>
              <p className="text-sm text-gray-600">
                Raised on {formatDate(ncr.raisedDate)} by {ncr.raisedBy}
              </p>
            </div>

            {/* Step 2: Root Cause */}
            <div className={`relative pl-6 border-l-2 ${ncr.rootCause ? "border-amber-300" : "border-gray-200"}`}>
              <div className={`absolute -left-2 top-0 h-4 w-4 rounded-full ${ncr.rootCause ? "bg-amber-500" : "bg-gray-300"}`} />
              <div className="mb-1 text-xs font-semibold text-amber-600 uppercase">Root Cause</div>
              {ncr.rootCause ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{ncr.rootCause}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Not yet identified</p>
              )}
            </div>

            {/* Step 3: Corrective Action */}
            <div className={`relative pl-6 border-l-2 ${ncr.correctiveAction ? "border-orange-300" : "border-gray-200"}`}>
              <div className={`absolute -left-2 top-0 h-4 w-4 rounded-full ${ncr.correctiveAction ? "bg-orange-500" : "bg-gray-300"}`} />
              <div className="mb-1 text-xs font-semibold text-orange-600 uppercase">Corrective Action</div>
              {ncr.correctiveAction ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{ncr.correctiveAction}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Not yet defined</p>
              )}
            </div>

            {/* Step 4: Preventive Action */}
            <div className={`relative pl-6 border-l-2 ${ncr.preventiveAction ? "border-purple-300" : "border-gray-200"}`}>
              <div className={`absolute -left-2 top-0 h-4 w-4 rounded-full ${ncr.preventiveAction ? "bg-purple-500" : "bg-gray-300"}`} />
              <div className="mb-1 text-xs font-semibold text-purple-600 uppercase">Preventive Action</div>
              {ncr.preventiveAction ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{ncr.preventiveAction}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Not yet defined</p>
              )}
            </div>

            {/* Step 5: Verification */}
            <div className={`relative pl-6 border-l-2 ${ncr.verifiedDate ? "border-emerald-300" : "border-gray-200"}`}>
              <div className={`absolute -left-2 top-0 h-4 w-4 rounded-full ${ncr.verifiedDate ? "bg-emerald-500" : "bg-gray-300"}`} />
              <div className="mb-1 text-xs font-semibold text-emerald-600 uppercase">Verification</div>
              {ncr.verifiedDate ? (
                <p className="text-sm text-gray-600">
                  Verified on {formatDate(ncr.verifiedDate)}
                  {ncr.verifiedBy && ` by ${ncr.verifiedBy}`}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">Awaiting verification</p>
              )}
            </div>

            {/* Step 6: Closure */}
            <div className={`relative pl-6 border-l-2 ${ncr.closedDate ? "border-emerald-300" : "border-gray-200"}`}>
              <div className={`absolute -left-2 top-0 h-4 w-4 rounded-full ${ncr.closedDate ? "bg-emerald-500" : "bg-gray-300"}`} />
              <div className="mb-1 text-xs font-semibold text-emerald-600 uppercase">Closure</div>
              {ncr.closedDate ? (
                <p className="text-sm text-gray-600">
                  Closed on {formatDate(ncr.closedDate)}
                  {ncr.closedBy && ` by ${ncr.closedBy}`}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">Not yet closed</p>
              )}
            </div>
          </div>

          {/* Evidence of Closure */}
          {ncr.evidenceOfClosure && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Evidence of Closure</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ncr.evidenceOfClosure}</p>
            </div>
          )}

          {/* Effectiveness Review */}
          {ncr.effectivenessReview && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Effectiveness Review</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ncr.effectivenessReview}</p>
              {ncr.effectivenessDate && (
                <p className="mt-2 text-xs text-gray-500">
                  Reviewed on {formatDate(ncr.effectivenessDate)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Key Info Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500">NCR Number</dt>
                <dd className="text-sm font-medium text-gray-900">{ncr.ncrNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Category</dt>
                <dd className="text-sm text-gray-900">{ncr.category}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Severity</dt>
                <dd><Badge variant={ncr.severity}>{ncr.severity}</Badge></dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Source</dt>
                <dd className="text-sm text-gray-900">{ncr.source}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Raised By</dt>
                <dd className="text-sm text-gray-900">{ncr.raisedBy}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Raised Date</dt>
                <dd className="text-sm text-gray-900">{formatDate(ncr.raisedDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Assigned To</dt>
                <dd className="text-sm text-gray-900">{ncr.assignedTo || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Target Date</dt>
                <dd className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-gray-900"}`}>
                  {ncr.targetDate ? formatDate(ncr.targetDate) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Status</dt>
                <dd><Badge variant={ncr.status}>{ncr.status}</Badge></dd>
              </div>
            </dl>
          </div>

          {/* Actions Card */}
          {ncr.status !== "Closed" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Actions</h3>

              {ncr.status === "Awaiting Verification" && (
                <form action={async () => { "use server"; await verifyNCR(id); }}>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    Verify &amp; Close
                  </button>
                </form>
              )}

              {ncr.status !== "Awaiting Verification" && ncr.status !== "Closed" && (
                <form action={async () => { "use server"; await closeNCR(id); }}>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    Close NCR
                  </button>
                </form>
              )}

              <form action={async () => { "use server"; await deleteNCR(id); }}>
                <button
                  type="submit"
                  className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete NCR
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
