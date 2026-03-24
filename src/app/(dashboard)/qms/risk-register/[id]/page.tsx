export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { deleteRisk, reviewRisk } from "../actions";

function getRiskLevelColor(level: string) {
  switch (level) {
    case "Critical": return "bg-red-100 text-red-700";
    case "High": return "bg-orange-100 text-orange-700";
    case "Medium": return "bg-yellow-100 text-yellow-700";
    case "Low": return "bg-green-100 text-green-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

export default async function RiskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const risk = await prisma.risk.findUnique({ where: { id } });
  if (!risk) notFound();

  const deleteWithId = deleteRisk.bind(null, id);
  const reviewWithId = reviewRisk.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={risk.riskNumber}
        action={
          <div className="flex items-center gap-2">
            <form action={reviewWithId}>
              <button
                type="submit"
                className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-100 transition-colors"
              >
                Mark Reviewed
              </button>
            </form>
            <Link
              href="/qms/risk-register"
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Back to Register
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

      {/* Risk Score Banner */}
      <div className={`rounded-xl border p-5 ${getRiskLevelColor(risk.riskLevel)}`}>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs font-medium opacity-70">Risk Score</p>
            <p className="text-3xl font-bold">{risk.riskScore}</p>
          </div>
          <div>
            <p className="text-xs font-medium opacity-70">Level</p>
            <p className="text-lg font-semibold">{risk.riskLevel}</p>
          </div>
          <div>
            <p className="text-xs font-medium opacity-70">Likelihood x Impact</p>
            <p className="text-lg font-semibold">{risk.likelihood} x {risk.impact}</p>
          </div>
        </div>
      </div>

      {/* Risk Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Risk Details</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-xs font-medium text-gray-500">Title</dt>
            <dd className="mt-1 text-sm text-gray-900">{risk.title}</dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-xs font-medium text-gray-500">Description</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{risk.description}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Category</dt>
            <dd className="mt-1 text-sm text-gray-900">{risk.category}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Owner</dt>
            <dd className="mt-1 text-sm text-gray-900">{risk.owner}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <Badge variant={risk.status}>{risk.status}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Target Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{risk.targetDate ? formatDate(risk.targetDate) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Review Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{risk.reviewDate ? formatDate(risk.reviewDate) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Last Reviewed</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {risk.lastReviewedAt
                ? `${formatDate(risk.lastReviewedAt)} by ${risk.lastReviewedBy || "—"}`
                : "Never reviewed"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Controls & Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Controls &amp; Actions</h2>
        <dl className="grid grid-cols-1 gap-4">
          <div>
            <dt className="text-xs font-medium text-gray-500">Existing Controls</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {risk.existingControls || "None documented"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Additional Actions Required</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {risk.additionalActions || "None documented"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Residual Risk (if assessed) */}
      {risk.residualScore && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Residual Risk</h2>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs font-medium text-gray-500">Residual Score</p>
              <p className="text-2xl font-bold text-gray-900">{risk.residualScore}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Residual L x I</p>
              <p className="text-sm text-gray-900">
                {risk.residualLikelihood ?? "—"} x {risk.residualImpact ?? "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
