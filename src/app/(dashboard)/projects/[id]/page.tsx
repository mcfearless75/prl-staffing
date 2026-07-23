export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { DeleteProjectButton } from "./delete-project-button";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      company: true,
      assignments: {
        include: { contractor: true },
        orderBy: { startDate: "desc" },
      },
      rateCards: {
        orderBy: { trade: "asc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const totalSpend = project.assignments.reduce((sum, a) => sum + (a.value || 0), 0);
  // Badge/status-color map uses "On Hold" (with a space) as the key — Project.status
  // stores the compact "OnHold" enum value, so translate it just for display.
  const statusLabel = project.status === "OnHold" ? "On Hold" : project.status;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${project.code} — ${project.name}`}
        action={
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${project.id}/edit`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Edit
            </Link>
            <DeleteProjectButton projectId={project.id} />
          </div>
        }
      />

      {/* Project Info Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Company</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {project.company ? (
                <Link href={`/companies/${project.company.id}`} className="text-blue-600 hover:underline">
                  {project.company.name}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Site Address</dt>
            <dd className="mt-1 text-sm text-gray-900">{project.siteAddress || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Cost Code</dt>
            <dd className="mt-1 text-sm text-gray-900">{project.costCode || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <Badge variant={statusLabel}>{statusLabel}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Total Assignment Value</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{formatCurrency(totalSpend)}</dd>
            <p className="mt-1 text-xs text-gray-400">Sum of agreed assignment values — see Billing → Spend for actual invoiced totals</p>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(project.createdAt)}</dd>
          </div>
        </dl>
        {project.notes && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <dt className="text-sm font-medium text-gray-500">Notes</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{project.notes}</dd>
          </div>
        )}
      </div>

      {/* Linked Assignments */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Linked Assignments ({project.assignments.length})
        </h2>
        {project.assignments.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contractor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Start</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">End</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Charge Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {project.assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {assignment.contractor.firstName} {assignment.contractor.lastName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{assignment.role || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(assignment.startDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {assignment.endDate ? formatDate(assignment.endDate) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {assignment.chargeRate != null ? formatCurrency(assignment.chargeRate) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {assignment.value != null ? formatCurrency(assignment.value) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant={assignment.status}>{assignment.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/assignments/${assignment.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No assignments linked to this project yet.</p>
        )}
      </div>

      {/* Rate Cards */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Rate Cards ({project.rateCards.length})
        </h2>
        {project.rateCards.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Trade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Region</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Employment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Pay</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Charge</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {project.rateCards.map((rc) => (
                  <tr key={rc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{rc.trade}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{rc.region || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{rc.employmentType}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatCurrency(rc.pay)} / {rc.rateBasis}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatCurrency(rc.charge)} / {rc.rateBasis}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link href={`/rates/${rc.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No rate cards linked to this project yet.</p>
        )}
      </div>
    </div>
  );
}
